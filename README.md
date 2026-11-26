# 🧠 GlyphBrain

Red de conocimiento personal y "segundo cerebro" impulsado por IA: captura notas en bloques tipo Notion, explora relaciones en un grafo interactivo y conversa con tu base de conocimiento mediante búsqueda semántica (`pgvector`) y Google Gemini.

## Características Principales

- **Grafo Interactivo 2D:** Visualización en tiempo real con `react-force-graph-2d`, agrupación de conceptos y simulación física.
- **Editor por Bloques:** Edición enriquecida con BlockNote (`@blocknote/core`, `@blocknote/react`, Mantine) y referencias internas con `@`.
- **Asistente Conversacional Gemini AI:** Chat con *tool calling* para buscar, sintetizar y enlazar notas (`@google/genai`), además de soporte de voz (Gemini Live API).
- **Búsqueda Semántica y Auto-Enlazado:** Embeddings almacenados en Supabase PostgreSQL + extensión `pgvector`.
- **PWA Offline:** Configurado con Serwist (`@serwist/next`) para caché e instalación en escritorio y móvil.

## Stack Tecnológico

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Zustand
- **Editor y Visualización:** BlockNote + Mantine, `react-force-graph-2d`
- **Backend / IA:** Supabase (PostgreSQL + `pgvector`), Google Gemini API (`@google/genai`)

## Estructura del Proyecto

- `src/app/` — Rutas App Router y endpoints `/api/*`
- `src/components/` — Canvas del grafo, editor de notas, panel de chat y barra de herramientas
- `src/lib/` — Clientes de Gemini y Supabase
- `src/stores/` — Estado global en Zustand
- `supabase/` — `schema.sql` y migraciones incrementales con `pgvector`

## Reinstalación y Ejecución Local

### Requisitos
- Node.js 20+ y npm
- Proyecto en Supabase con extensión `pgvector`
- API Key de Google Gemini

### Pasos
```powershell
npm install
copy .env.local.example .env.local
# Configura tus claves en .env.local y ejecuta supabase/schema.sql + migraciones en Supabase
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000) en el navegador.

## Variables de Entorno (`.env.local.example`)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY` *(solo servidor)*

## Comandos Principales

- `npm run dev` — Inicia el servidor de desarrollo
- `npm run build` — Genera el build de producción
- `npm run start` — Ejecuta el build de producción
- `npm run lint` — Ejecuta ESLint

## Licencia

Distribuido bajo la licencia [MIT](LICENSE).
