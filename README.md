# Mensajería · Comeco Gráfico

App interna para solicitar servicios de mensajería, guardar destinatarios, buscar empresas y
imprimir etiquetas. Especificación completa: [docs/PROMPT_app_mensajeria.md](docs/PROMPT_app_mensajeria.md).

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4 · Supabase
(Postgres + Auth + RLS) · Vercel.

## Estado

| Fase | Estado |
|---|---|
| 1. Base + design system | ✅ Hecha |
| 2. Base de datos | ✅ Hecha (RLS probadas: `npm run test:rls`) |
| 3. Formulario + correo | ✅ Hecha |
| 4. Escena 3D | ✅ Integrada en el editor (pestañas Paquete / Correo); laboratorio en `/lab/package` |
| 5. Libreta + historial | ✅ Libreta (buscar, favoritos, fusionar), historial con filtros y CSV, repetir envío, plantillas, autocompletado |
| 6. Buscador IA | ✅ Código listo (Tavily + Gemini → Groq, caché 30 días, cuota diaria, fuentes citadas). Falta poner las claves para probarlo en real |
| 7. Etiquetas | Pendiente |
| 8. Despliegue | Pendiente |

## Puesta en marcha (local)

1. Instala dependencias: `npm install`
2. Copia `.env.example` como `.env.local` y rellena las claves de Supabase
   (Project Settings → API).
3. Aplica las migraciones al proyecto de Supabase:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-del-proyecto>
   npx supabase db push
   ```
4. En Supabase → Authentication → Sign In / Providers:
   - **Allow new users to sign up: desactivado**
   - **Confirm email: desactivado**
5. Crea la cuenta del administrador (muestra una contraseña temporal en la terminal):
   ```bash
   npm run create-admin -- atubio@comecografico.com "Nombre Apellido"
   ```
6. Arranca: `npm run dev` → http://localhost:3000

## Buscador de empresas

1. **Caché**: la misma consulta (sin tildes, mayúsculas ni signos) en los últimos 30 días no gasta cuota.
2. **Tavily** (búsqueda básica). Solo si los fragmentos no traen ni CP ni teléfono, se pide el texto completo de las páginas.
3. **Gemini** extrae un JSON estricto; si falla, **Groq**. Modelos configurables con `GEMINI_MODEL` / `GROQ_MODEL`
   (por defecto `gemini-2.5-flash` y `llama-3.3-70b-versatile`).
4. **Verificación**: los teléfonos, CP y emails que no aparezcan literalmente en los resultados se descartan, y solo se
   aceptan fuentes que estén entre las URLs consultadas.
5. Límites: `search_daily_limit` por usuario y día (Configuración) y 6 búsquedas por minuto.

Claves en `.env.local` y en Vercel: `TAVILY_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY` (solo servidor).

## Cómo funciona el acceso

- Email y contraseña. **La app no envía emails** (sin SMTP ni DNS).
- El admin da de alta a los compañeros en **Configuración → Usuarios** con una contraseña
  temporal y se la comunica en persona. En el primer acceso se obliga a cambiarla.
- Solo se admiten cuentas `@comecografico.com` (se valida en el servidor y en la base de datos).
- ¿Contraseña olvidada? El admin la restablece desde la misma pantalla.

## Base de datos

| Tabla | Para qué | Quién escribe |
|---|---|---|
| `profiles` | Datos del solicitante, rol y estado | Cada uno lo suyo; el admin, todo |
| `app_settings` | Configuración global (Para/CC, remitente, CECO, cuotas) | Solo admin |
| `recipients` | Libreta de direcciones compartida | Cualquier usuario; borra su creador o el admin |
| `shipment_requests` | Solicitudes con referencia `MSJ-AAAA-0001` y copia del destino | Su creador o el admin |
| `request_templates` | Plantillas de envíos frecuentes | Su creador o el admin |
| `company_search_cache` / `search_usage` | Caché (30 días) y cuota del buscador | Solo el servidor |

Todos leen el historial y la libreta; sin sesión o con la cuenta desactivada no se lee nada.
`supabase/seed.sql` (destinatarios ficticios) solo se usa en local con `supabase db reset`.

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm test` | Pruebas unitarias (correo, validación, sugerencias) |
| `npm run create-admin -- <email> "<nombre>"` | Crea un usuario con contraseña temporal |
| `npm run db:push` | Aplica las migraciones de `supabase/migrations` |
| `npm run db:types` | Regenera `lib/supabase/database.types.ts` desde la BD |
| `npm run test:rls` | Prueba las políticas RLS con dos usuarios temporales (se borran al terminar) |

## Rutas

| Ruta | Acceso |
|---|---|
| `/login` | Público |
| `/styleguide` | Público (guía de estilo interna, sin datos) |
| `/cambiar-contrasena` | Usuario con contraseña temporal |
| `/` · `/perfil` | Usuarios |
| `/solicitudes/nueva` | Usuarios: formulario, vista previa, Gmail y autoguardado |
| `/solicitudes/<id>` | Usuarios: la edita su autor o el admin; el resto solo la ve |
| `/solicitudes/nueva?repetir=<id>` · `?destinatario=<id>` · `?plantilla=<id>` | Usuarios: empezar desde un envío anterior, la libreta o una plantilla |
| `/libreta` · `/libreta/<id>` · `/libreta/nuevo` | Usuarios: libreta compartida (borra su creador o el admin; fusionar, cualquiera) |
| `/historial` · `/historial/exportar` | Usuarios: historial de la oficina con filtros y exportación CSV |
| `/api/company-search` | Usuarios: buscador de empresas (POST busca; GET devuelve el contador). Desde el formulario: botón en Destino o `Ctrl+K`; desde Inicio: `/solicitudes/nueva?buscar=1` |
| `/configuracion/usuarios` | Solo admin |
| `/lab/package` | Usuarios: laboratorio de la escena 3D (etapas y variantes) |
