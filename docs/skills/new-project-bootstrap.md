# Skill: new-project-bootstrap

## Cuándo usar
Cuando Luis pide crear un proyecto nuevo desde cero.

## Stack obligatorio (no negociar sin ADR)
- Next.js 16 App Router + Turbopack
- React 19 + TypeScript estricto
- Tailwind CSS 4 (@theme inline, sin tailwind.config.ts)
- shadcn/ui + framer-motion 12 + lucide-react
- Clerk (auth) + Neon Postgres + Vercel (hosting)
- npm (nunca pnpm)

## Pasos
1. Confirmar nombre, dominio y stack con Luis
2. `github_create_branch` → branch `claude/bootstrap-<proyecto>`
3. Crear archivos base en paralelo (subagentes):
   - `package.json`
   - `tsconfig.json`
   - `next.config.ts`
   - `app/layout.tsx`
   - `app/page.tsx`
   - `middleware.ts` (Clerk)
   - `.env.example`
   - `README.md`
4. `github_create_pull_request` → PR draft
5. `vercel_create_project` → linkear repo
6. `vercel_set_env_var` → meter env vars
7. Configurar dominio si Luis lo indica

## Modelos recomendados
- Generación de archivos: `MODEL_CODE` (DeepSeek)
- Revisión: `MODEL_FAST` (Gemini Flash)
