# Censo forense de las capacidades de V — 5 jun 2026

## Veredicto
Las capacidades NO se borraron. V tiene 73 herramientas registradas y cableadas, todas con ejecutor real, todas entregadas al modelo cada turno. El problema eran 2 desconexiones de infraestructura, ya restauradas:

1. MANOS DESCONECTADAS (restaurado): el v-server Flask en Hetzner (:5000) está vivo y completo (/execute /browser /ssh-execute /generate-image /claude) pero solo respondía en localhost; no estaba enrutado por nginx, así que V (en Vercel) recibía connection refused. Lo enruté por nginx puerto 80 (/v-server/). Verificado: /execute devuelve 4 a print(2+2).

2. MEMORIA VECTORIAL NUNCA FUNCIONÓ AQUÍ: el commit original (3f4fb14) usaba embeddings mock (hash falso, "Placeholder: mock embedding"). Por eso semantic_memory tiene 0 filas. La real necesita proveedor de embeddings con saldo (hoy los 3 sin cuota). Interino: recall léxico pg_trgm sobre 2,169 conversaciones. Con ~$1 corro el backfill y se vuelve semántica.

## 73 tools (familias): GitHub 15, Vercel 15, DNS Name.com 5, Manos v-server 5 (restauradas), Modelos/OpenRouter 5, Skills 5, Directivas 4, Memoria 2, Vault 4, Hub agentes 4, Builder v0 1, Config 3, HTTP 1. Total 73, 0 huérfanas.

## Capas intactas: ai_personality (alma, 2094 chars), 4 mantras, knowledge_base 52, brain 54 archivos.

## Pendiente (saldo ~$1): backfill semántico de 2,169 recuerdos vía POST /api/admin/semantic-backfill.
