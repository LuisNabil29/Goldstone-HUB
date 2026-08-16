# GoldStone Hub

Plataforma de formación y preparación formativa para el estándar **EC0110.02**.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Prisma 7 + PostgreSQL
- Auth.js (NextAuth v5) con magic link (invite-only)
- Tailwind CSS 4

## Requisitos

- Node 20+
- PostgreSQL local
- PowerShell (Windows)

## Setup

```powershell
cd c:\Nabil\git\GS_HUB
Copy-Item .env.example .env
# Ajusta DATABASE_URL en .env
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Abre [http://localhost:3040](http://localhost:3040).

### Usuarios seed

| Correo | Rol |
|---|---|
| `admin@goldstonehub.local` | ADMIN |
| `miguel@goldstonehub.local` | STUDENT |
| `instructor@goldstonehub.local` | INSTRUCTOR |

Sin SMTP configurado, el magic link se imprime en la consola del servidor `npm run dev`.

## Scripts

- `npm run dev` — desarrollo en puerto 3040
- `npm run build` / `npm start` — producción
- `npm run db:seed` — datos demo
- `npm run create-admin -- correo@x.com "Nombre" ADMIN`
- `npm test` — tests del motor de simulador

## Notas

- El simulador es **preparación formativa**; no emite certificación oficial.
- Los archivos se guardan en `uploads/` y se sirven solo a usuarios autenticados.
- Los instructores editan contenido asignado en borrador; solo un admin publica.
