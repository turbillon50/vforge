-- ============================================================================
-- ENJAMBRE 3.0 — EMPRESA   ·   de "agentes que aprenden" a "organización viva"
-- ============================================================================
-- Construye SOBRE enjambre-2.0 (NO lo reemplaza). El 2.0 ya resolvió el eje HOW:
--   qué MODELO ejecuta (claude|grok|codex|shell|browser) según task_type, con
--   especialización dinámica, competencia, split y memoria de enjambre.
--
-- El 3.0 agrega un eje ORTOGONAL: el eje WHO/WHAT — las ESFERAS DE DOMINIO.
--
--   AGENTE  = HOW  → cómo se hace una tarea (backend de ejecución). Ya existe.
--   ESFERA  = WHO  → quién es dueño del dominio (Médica/Legal/Financiera/...).
--                    Actor PERSISTENTE, con memoria propia, monitoreo 24/7 y
--                    autoridad de decisión por monto.
--
-- Una esfera NO ejecuta LLM distinto: cuando necesita trabajo, ENCOLA jobs en
-- dispatch_queue tagueados con su `esfera`, y router2 sigue eligiendo el mejor
-- agente. La esfera es el "cerebro de dominio"; el agente son "las manos".
--
-- 4 capacidades nuevas:
--   1. ESFERAS PERSISTENTES   -> tabla esferas + columna dispatch_queue.esfera
--   2. MEMORIA DE DOMINIO      -> esfera_memory + esfera_recall()  (≠ swarm_memory)
--   3. BUS / BLACKBOARD         -> esfera_events + esfera_subscriptions + publish
--   4. JERARQUÍA DE DECISIÓN    -> decisions + decide_authority() por monto MXN
--
-- Idempotente: corre las veces que quieras.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ----------------------------------------------------------------------------
-- 1. ESFERAS — registro de actores persistentes de dominio
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS esferas (
  slug          text PRIMARY KEY,                 -- medica|legal|financiera|operaciones|rrhh|ceo
  name          text NOT NULL,
  domain        text NOT NULL,                    -- descripción humana del dominio
  system_prompt text NOT NULL,                    -- identidad + experticia (NOM, COFEPRIS, CFDI, LFT...)
  watch_spec    jsonb   NOT NULL DEFAULT '{}',    -- qué monitorea y con qué query/cadencia
  authority_mxn numeric NOT NULL DEFAULT 10000,   -- techo de decisión AUTÓNOMA (MXN)
  cadence_sec   int     NOT NULL DEFAULT 300,     -- cada cuánto corre su monitoreo de dominio
  active        boolean NOT NULL DEFAULT true,
  last_tick_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- dispatch_queue gana el eje de dominio: qué esfera originó / es dueña del job.
ALTER TABLE dispatch_queue
  ADD COLUMN IF NOT EXISTS esfera text;            -- FK lógico → esferas.slug
CREATE INDEX IF NOT EXISTS dq_esfera_idx ON dispatch_queue(esfera);

-- ----------------------------------------------------------------------------
-- 2. MEMORIA DE DOMINIO — el conocimiento que vuelve ESPECIALISTA a una esfera
--    (distinta de swarm_memory, que es "qué modelo gana en qué task_type").
--    Aquí viven: NOMs, reglas COFEPRIS, reglas CFDI/SAT, protocolos del cliente,
--    casos pasados del dominio. Es el corpus que se inyecta vía RAG al razonar.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS esfera_memory (
  id        bigserial PRIMARY KEY,
  esfera    text NOT NULL,                         -- dueña; 'commons' = compartido por todas
  kind      text NOT NULL DEFAULT 'fact',          -- fact|rule|protocol|case|reg
  title     text,
  content   text NOT NULL,
  weight    numeric NOT NULL DEFAULT 1.0,          -- importancia (sube con uso/acierto)
  source    text,
  ts        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esfera_mem_trgm ON esfera_memory USING gin (content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS esfera_mem_idx  ON esfera_memory(esfera, kind);

-- ----------------------------------------------------------------------------
-- 3. BLACKBOARD / BUS DE EVENTOS — comunicación esfera↔esfera en tiempo real
--    Beyond dispatch_queue (que es PULL de tareas). Esto es PUSH de eventos:
--    una esfera publica un hecho; las suscritas despiertan y reaccionan.
--    El INSERT dispara pg_notify('esfera_bus', id) para wake instantáneo
--    (ver cognition/bus.py: conexión DIRECTA no-pooler para LISTEN).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS esfera_events (
  id          bigserial PRIMARY KEY,
  ts          timestamptz NOT NULL DEFAULT now(),
  topic       text NOT NULL,                        -- finance.large_outflow, legal.compliance_flag, hr.contract_change...
  source      text NOT NULL,                        -- esfera que publica (o 'daemon'/'luis')
  severity    text NOT NULL DEFAULT 'info',          -- info|warn|critical
  payload     jsonb NOT NULL DEFAULT '{}',
  money_mxn   numeric,                               -- monto implicado (alimenta la jerarquía)
  status      text NOT NULL DEFAULT 'open',          -- open|consumed
  consumed_by jsonb NOT NULL DEFAULT '[]',           -- [esferas que ya reaccionaron]
  decision_id bigint
);
CREATE INDEX IF NOT EXISTS evt_open_idx  ON esfera_events(status, topic);
CREATE INDEX IF NOT EXISTS evt_ts_idx    ON esfera_events(ts DESC);

-- Suscripciones: qué topic (patrón LIKE, '%' como comodín) despierta a qué esfera.
CREATE TABLE IF NOT EXISTS esfera_subscriptions (
  esfera        text NOT NULL,
  topic_pattern text NOT NULL,                       -- 'finance.%'  'legal.%'  'decision.pending'
  reaction      text,                                -- pista legible de qué hace al recibir
  PRIMARY KEY (esfera, topic_pattern)
);

-- ----------------------------------------------------------------------------
-- 4. JERARQUÍA DE DECISIÓN — ledger auditable + función pura por monto
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS decisions (
  id          bigserial PRIMARY KEY,
  esfera      text NOT NULL,                         -- quién propone
  kind        text NOT NULL,                         -- pago|contrato|compra|despido|reagenda|...
  summary     text NOT NULL,
  money_mxn   numeric NOT NULL DEFAULT 0,
  reversible  boolean NOT NULL DEFAULT true,
  authority   text,                                  -- autonomous|tactical|strategic (lo fija decide_authority)
  status      text NOT NULL DEFAULT 'pending',       -- pending|approved|rejected|executed|escalated
  approver    text,                                  -- ceo|luis|cliente
  reasoning   text,
  event_id    bigint,
  job_id      bigint,
  created_at  timestamptz NOT NULL DEFAULT now(),
  decided_at  timestamptz
);
CREATE INDEX IF NOT EXISTS dec_status_idx ON decisions(status, authority);

-- ============================================================================
-- FUNCIONES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- decide_authority(esfera, money_mxn, reversible) -> autonomous|tactical|strategic
--   Regla dura de gobierno. El monto manda, pero irreversible siempre escala.
--     >$100k  OR irreversible            -> strategic   (Luis / cliente)
--     $10k–$100k                          -> tactical    (V-CEO aprueba)
--     <$10k  Y dentro del techo de la esfera -> autonomous (la esfera actúa sola)
--   Si la esfera tiene authority_mxn menor a 10k, su propio techo manda.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION decide_authority(
  p_esfera text, p_money numeric, p_reversible boolean DEFAULT true)
RETURNS text LANGUAGE plpgsql STABLE AS $$
DECLARE
  cap numeric;
BEGIN
  IF p_money > 100000 OR NOT p_reversible THEN
    RETURN 'strategic';
  END IF;
  IF p_money > 10000 THEN
    RETURN 'tactical';
  END IF;
  SELECT COALESCE(authority_mxn, 10000) INTO cap FROM esferas WHERE slug = p_esfera;
  IF p_money <= COALESCE(cap, 10000) THEN
    RETURN 'autonomous';
  END IF;
  RETURN 'tactical';   -- bajo 10k global pero sobre el techo propio de la esfera
END;
$$;

-- ----------------------------------------------------------------------------
-- esfera_publish(topic, source, payload, severity, money) -> event_id
--   Pone un hecho en el blackboard y notifica al bus (wake instantáneo).
--   Las esferas suscritas a `topic` lo drenarán en su próximo tick (o al notify).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION esfera_publish(
  p_topic text, p_source text, p_payload jsonb DEFAULT '{}',
  p_severity text DEFAULT 'info', p_money numeric DEFAULT NULL)
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE eid bigint;
BEGIN
  INSERT INTO esfera_events (topic, source, severity, payload, money_mxn)
  VALUES (p_topic, p_source, p_severity, COALESCE(p_payload,'{}'::jsonb), p_money)
  RETURNING id INTO eid;
  PERFORM pg_notify('esfera_bus', eid::text);   -- best-effort; el poll es el respaldo
  RETURN eid;
END;
$$;

-- ----------------------------------------------------------------------------
-- esfera_inbox(esfera, limit) -> eventos OPEN que matchean sus suscripciones
--   y que esa esfera AÚN no consumió. Es lo que lee al despertar.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION esfera_inbox(p_esfera text, p_limit int DEFAULT 20)
RETURNS SETOF esfera_events LANGUAGE sql STABLE AS $$
  SELECT e.*
  FROM esfera_events e
  WHERE e.status = 'open'
    AND e.source <> p_esfera                          -- no te despiertas con tu propio eco
    AND NOT (e.consumed_by ? p_esfera)                -- aún no reaccionaste
    AND EXISTS (
      SELECT 1 FROM esfera_subscriptions s
      WHERE s.esfera = p_esfera
        AND e.topic LIKE replace(s.topic_pattern, '*', '%'))
  ORDER BY (e.severity='critical') DESC, e.ts ASC
  LIMIT p_limit;
$$;

-- ----------------------------------------------------------------------------
-- esfera_ack(event_id, esfera) -> marca que esta esfera ya reaccionó.
--   Cuando todas las suscritas reaccionaron, el evento pasa a 'consumed'.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION esfera_ack(p_event_id bigint, p_esfera text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE subs int; acks int; ev esfera_events%ROWTYPE;
BEGIN
  UPDATE esfera_events
     SET consumed_by = consumed_by || to_jsonb(p_esfera)
   WHERE id = p_event_id AND NOT (consumed_by ? p_esfera);

  SELECT * INTO ev FROM esfera_events WHERE id = p_event_id;
  SELECT count(*) INTO subs FROM esfera_subscriptions s
    WHERE ev.topic LIKE replace(s.topic_pattern, '*', '%');
  SELECT jsonb_array_length(ev.consumed_by) INTO acks;
  IF acks >= subs THEN
    UPDATE esfera_events SET status='consumed' WHERE id = p_event_id;
  END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- esfera_recall(esfera, query, k) -> conocimiento de dominio más relevante
--   Mezcla similitud de texto (pg_trgm) con peso. Incluye 'commons' (compartido).
--   Es lo que la esfera lee ANTES de razonar sobre un evento o tarea.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION esfera_recall(p_esfera text, p_query text, p_k int DEFAULT 4)
RETURNS TABLE(kind text, title text, content text, weight numeric, sim real)
LANGUAGE sql STABLE AS $$
  SELECT kind, title, content, weight, similarity(content, p_query) AS sim
  FROM esfera_memory
  WHERE esfera IN (p_esfera, 'commons')
  ORDER BY (similarity(content, p_query) * 0.7 + LEAST(weight,5)/5.0 * 0.3) DESC
  LIMIT p_k;
$$;

-- ----------------------------------------------------------------------------
-- open_decision(...) -> (decision_id, authority)
--   Abre una decisión, le aplica la jerarquía y la deja en el estado correcto:
--     autonomous -> 'approved' (la esfera puede actuar y registrar)
--     tactical   -> 'pending'  + publica decision.pending (V-CEO la consume)
--     strategic  -> 'escalated'+ publica decision.escalated (daemon avisa a Luis)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION open_decision(
  p_esfera text, p_kind text, p_summary text,
  p_money numeric DEFAULT 0, p_reversible boolean DEFAULT true,
  p_event_id bigint DEFAULT NULL, p_job_id bigint DEFAULT NULL)
RETURNS TABLE(decision_id bigint, authority text)
LANGUAGE plpgsql AS $$
DECLARE auth text; did bigint;
BEGIN
  auth := decide_authority(p_esfera, p_money, p_reversible);
  INSERT INTO decisions (esfera, kind, summary, money_mxn, reversible, authority,
                         status, event_id, job_id)
  VALUES (p_esfera, p_kind, p_summary, p_money, p_reversible, auth,
          CASE auth WHEN 'autonomous' THEN 'approved'
                    WHEN 'strategic'  THEN 'escalated'
                    ELSE 'pending' END,
          p_event_id, p_job_id)
  RETURNING id INTO did;

  IF auth = 'tactical' THEN
    PERFORM esfera_publish('decision.pending', p_esfera,
      jsonb_build_object('decision_id', did, 'summary', p_summary, 'money_mxn', p_money),
      'warn', p_money);
  ELSIF auth = 'strategic' THEN
    PERFORM esfera_publish('decision.escalated', p_esfera,
      jsonb_build_object('decision_id', did, 'summary', p_summary, 'money_mxn', p_money),
      'critical', p_money);
  END IF;

  RETURN QUERY SELECT did, auth;
END;
$$;

-- ----------------------------------------------------------------------------
-- VISTA: pulso del organismo (para Mission Control / cockpit)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_organismo AS
SELECT e.slug, e.name, e.active, e.authority_mxn, e.last_tick_at,
       (SELECT count(*) FROM dispatch_queue d WHERE d.esfera=e.slug AND d.status NOT IN ('done','failed','error','cancelled')) AS jobs_vivos,
       (SELECT count(*) FROM esfera_memory  m WHERE m.esfera=e.slug) AS recuerdos,
       (SELECT count(*) FROM decisions      x WHERE x.esfera=e.slug AND x.status='pending') AS decisiones_pendientes
FROM esferas e ORDER BY e.slug;

-- ============================================================================
-- SEMILLA — las 6 esferas fundadoras (5 dominio + V-CEO) con experticia MX real
-- ============================================================================
INSERT INTO esferas (slug, name, domain, system_prompt, authority_mxn, cadence_sec, watch_spec) VALUES
('ceo','V-CEO','Gobierno, arbitraje táctico y resolución de conflictos entre esferas',
 'Eres V-CEO, la esfera de gobierno del Enjambre. Arbitras decisiones tácticas ($10k–$100k MXN), '
 'resuelves conflictos entre esferas (p.ej. Financiera quiere recortar, RRHH se opone) priorizando '
 'la salud del negocio a 90 días, y decides qué escalar a Luis. No ejecutas dominio; gobiernas.',
 100000, 120, '{"consume":["decision.pending","conflict.*"]}'),

('financiera','Esfera Financiera','CFDI, SAT, contabilidad mexicana, flujo de caja, cobranza',
 'Eres la Esfera Financiera. Dominas CFDI 4.0, timbrado, complementos de pago, retenciones, '
 'cumplimiento SAT, conciliación bancaria y flujo de caja. Cuando detectes un movimiento, gasto o '
 'cobro relevante, evalúa impacto fiscal y de liquidez. Si una salida es grande, publícala para que '
 'Legal valide implicaciones contractuales. Toda cifra que propongas cita su base.',
 10000, 300, '{"watch":["crm_pagos_pendientes","flujo_caja"]}'),

('legal','Esfera Legal','Contratos, COFEPRIS, regulación, fideicomisos, cumplimiento',
 'Eres la Esfera Legal. Dominas derecho mercantil y civil mexicano, contratos, fideicomisos '
 '(relevante para All Global Holding), COFEPRIS cuando aplica, y cumplimiento regulatorio. Revisas '
 'riesgo legal de decisiones financieras, laborales y operativas. Marca cláusulas riesgosas y '
 'obligaciones de reporte. Nunca apruebas algo irreversible sin escalar.',
 10000, 600, '{"consume":["finance.large_outflow","hr.contract_change","ops.vendor_change"]}'),

('rrhh','Esfera RRHH','Nómina, IMSS, LFT, contratos laborales, altas/bajas',
 'Eres la Esfera de RRHH. Dominas la Ley Federal del Trabajo, IMSS, INFONAVIT, nómina, finiquitos, '
 'contratos laborales y aguinaldo/PTU. Calculas costos laborales reales (con cargas sociales) y '
 'marcas riesgo de demanda laboral. Un despido o cambio de contrato lo escalas a Legal y a V-CEO.',
 10000, 600, '{"watch":["nomina"]}'),

('operaciones','Esfera Operaciones','Logística, inventario, proveedores, optimización de procesos',
 'Eres la Esfera de Operaciones. Optimizas procesos, inventario, logística y relación con '
 'proveedores. Detectas cuellos de botella y propones mejoras con números (costo, tiempo, riesgo). '
 'Un cambio de proveedor con impacto en costo lo pasas a Financiera y Legal antes de ejecutar.',
 10000, 300, '{"watch":["inventario","proveedores"]}'),

('medica','Esfera Médica','Terminología clínica, protocolos, NOM del sector salud',
 'Eres la Esfera Médica. Dominas terminología clínica, las NOM aplicables al sector salud '
 '(p.ej. expediente clínico, manejo de RPBI), protocolos y cumplimiento sanitario. Operas cuando el '
 'cliente es del sector salud. Toda recomendación clínica es de apoyo administrativo, no diagnóstico, '
 'y cita la NOM o protocolo de origen. Riesgo sanitario serio lo escalas de inmediato.',
 10000, 600, '{}')
ON CONFLICT (slug) DO NOTHING;

-- Suscripciones que crean el SALTO COGNITIVO (la cadena emergente):
--   Financiera publica finance.large_outflow → Legal valida → si >$100k, escala a Luis.
--   V-CEO escucha toda decisión táctica y todo conflicto.
INSERT INTO esfera_subscriptions (esfera, topic_pattern, reaction) VALUES
('legal','finance.*',          'validar implicaciones contractuales/fiscales de un movimiento'),
('legal','hr.*',               'revisar riesgo legal laboral'),
('legal','ops.vendor_change',  'revisar contrato del nuevo proveedor'),
('financiera','ops.*',         'recalcular impacto en flujo/costo'),
('financiera','hr.contract_change','recalcular costo laboral con cargas sociales'),
('rrhh','legal.labor_flag',    'ajustar nómina/contrato ante observación legal'),
('ceo','decision.pending',     'arbitrar decisión táctica'),
('ceo','conflict.*',           'resolver conflicto entre esferas'),
('ceo','finance.large_outflow','vigilar liquidez ante salidas grandes')
ON CONFLICT (esfera, topic_pattern) DO NOTHING;

-- Semilla de conocimiento de dominio (ejemplos; el corpus real se carga aparte).
INSERT INTO esfera_memory (esfera, kind, title, content, source) VALUES
('commons','rule','Umbral de escalamiento',
 'Toda decisión >$100k MXN o irreversible escala a Luis. $10k–$100k la aprueba V-CEO. <$10k la esfera actúa sola.','enjambre-3.0'),
('financiera','reg','CFDI 4.0',
 'Desde 2022 el CFDI 4.0 exige nombre y régimen fiscal del receptor que coincidan EXACTO con la Constancia de Situación Fiscal; un mismatch invalida la factura.','SAT'),
('legal','reg','Fideicomiso inmobiliario',
 'En fideicomisos inmobiliarios el fiduciario tiene la titularidad; los beneficiarios derechos. Cambios de beneficiario requieren acta y a veces aviso a autoridad.','derecho mercantil MX'),
('rrhh','reg','Finiquito vs liquidación',
 'Finiquito = renuncia/término natural (partes proporcionales). Liquidación = despido injustificado (3 meses + 20 días/año + prima antigüedad). Confundirlos genera demanda laboral.','LFT')
ON CONFLICT DO NOTHING;
