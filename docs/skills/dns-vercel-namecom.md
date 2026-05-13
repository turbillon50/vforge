# Skill: dns-vercel-namecom

## Cuándo usar
Cuando Luis pide apuntar un dominio de Name.com a un proyecto de Vercel.

## Pasos
1. `vercel_get_project` → confirmar que el proyecto existe
2. `vercel_add_domain` → agregar dominio al proyecto
3. `vercel_get_domain_config` → obtener A record e IP recomendada
4. `namecom_list_records` → ver estado actual del DNS
5. `namecom_upsert_record` tipo A → apex al IP de Vercel
6. `namecom_upsert_record` tipo CNAME → www → cname.vercel-dns.com
7. Esperar propagación (5-30 min)
8. Verificar en Vercel dashboard

## Registros estándar Vercel
```
A     @    76.76.21.21
CNAME www  cname.vercel-dns.com
```

## Reglas
- Siempre leer DNS actual antes de upsertear
- No borrar registros MX existentes
- Apex con A record, subdominios con CNAME

## Modelos recomendados
- Todo con tools directas, sin LLM necesario
