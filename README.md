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
| 4. Caja animada | ✅ Vídeo de la caja (`public/caja/caja.mp4`) que avanza con el formulario en el editor |
| 5. Libreta + historial | ✅ Libreta (buscar, favoritos, fusionar), historial con filtros y CSV, repetir envío, plantillas, autocompletado |
| 6. Buscador IA | ✅ En producción (Tavily + Gemini → Groq, caché 30 días, cuota diaria, fuentes citadas). Probado en real con Groq |
| 7. Etiquetas | ✅ PDF A4 (1, 2, 4 y 8 por hoja), bultos N/N, posición inicial, QR, distintivos, calibración en mm. Falta la prueba en una hoja Apli real |
| 8. Despliegue | ✅ En producción: https://mensajeria-comeco.vercel.app (Lighthouse `/login` móvil: rendimiento 97, accesibilidad 100). Falta la prueba de un compañero |

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

## Despliegue (Vercel + Supabase)

Producción usa el **mismo proyecto de Supabase** que ya tiene las migraciones aplicadas. Todo cabe en los planes
gratuitos (Vercel Hobby + Supabase Free).

1. **GitHub**: crea un repositorio **privado** vacío (sin README ni .gitignore) y súbelo:
   ```bash
   git branch -M main          # la rama con todas las fases
   git remote add origin https://github.com/<usuario>/<repo>.git
   git push -u origin main
   ```
2. **Vercel** → *Add New → Project* → importa el repositorio. Framework: Next.js (se detecta solo); no cambies los
   comandos de build.
3. **Variables de entorno** (Vercel → *Settings → Environment Variables*, entorno *Production* y *Preview*). Los
   valores son los de `.env.local`; nunca en el código ni en el chat:

   | Variable | Notas |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
   | `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor. Marca *Sensitive* |
   | `NEXT_PUBLIC_APP_URL` | `https://<app>.vercel.app` |
   | `TAVILY_API_KEY` · `GEMINI_API_KEY` · `GROQ_API_KEY` | Buscador. Marca *Sensitive* |
   | `GEMINI_MODEL` · `GROQ_MODEL` | Opcionales (por defecto `gemini-3.8-flash` y `openai/gpt-oss-120b`) |

4. **Deploy**. A partir de aquí, cada push a `main` publica producción y cada rama genera una *preview*.
5. **Supabase → Authentication → URL Configuration**:
   - *Site URL*: `https://<app>.vercel.app`
   - *Redirect URLs*: `https://<app>.vercel.app/**` (y `http://localhost:3000/**` para desarrollo)
   - Comprueba que siguen **desactivados** *Allow new users to sign up* y *Confirm email*. La app no envía emails:
     ni registro, ni invitaciones, ni recuperación (las contraseñas las gestiona el admin en Configuración → Usuarios).
6. **Comprobación**: un compañero entra desde su PC con la contraseña temporal que le da el admin, la cambia y crea
   una solicitud. Lighthouse (pestaña de incógnito, móvil) en `/login` y `/`.

**Ya preparado en el código:** cabeceras de seguridad (HSTS, `nosniff`, `X-Frame-Options: SAMEORIGIN`,
`Referrer-Policy`, `Permissions-Policy`), sin cabecera `X-Powered-By`, y 30 s de margen para la función del buscador.

**Lighthouse en local** (build de producción, móvil): `/login` y `/styleguide` dan rendimiento 99–100,
accesibilidad 100. Con el antivirus inyectando su script en `localhost` el rendimiento baja a ~85–90 y
*buenas prácticas* marca «sin HTTPS» por ese script; en Vercel no ocurre.

## Buscador de empresas

1. **Caché**: la misma consulta (sin tildes, mayúsculas ni signos) en los últimos 30 días no gasta cuota.
2. **Tavily** (búsqueda básica). Solo si los fragmentos no traen ni CP ni teléfono, se pide el texto completo de las páginas.
3. **Gemini** extrae un JSON estricto; si falla, **Groq**. Modelos configurables con `GEMINI_MODEL` / `GROQ_MODEL`
   (por defecto `gemini-3.8-flash` y `openai/gpt-oss-120b`).
4. **Verificación**: los teléfonos, CP y emails que no aparezcan literalmente en los resultados se descartan, y solo se
   aceptan fuentes que estén entre las URLs consultadas.
5. Límites: `search_daily_limit` por usuario y día (Configuración) y 6 búsquedas por minuto.

Claves en `.env.local` y en Vercel: `TAVILY_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY` (solo servidor).

## Proveedores de transporte

Cada solicitud va a un proveedor (tabla `carriers`, editable en **Configuración → Proveedores**):

| Proveedor | Formulario | Correo | Prefijo |
|---|---|---|---|
| Mensajería interna (por defecto) | Mensajería: urgencia, ámbito, bultos | Plantilla de siempre | `MSJ` |
| BOYACA | Transporte: OP, producto, recogida, entrega, palés, peso; **códigos** de recogida y entrega | Tabla «Solicitud de transporte» | `BOY` |
| RAFA VENTO | Transporte | Lista corta («Buenos días Rafa,») | `RVE` |
| TIPSA | Transporte + tipo de servicio (10 H urgente / 14 H) y código de cliente 09211 | Tabla, con cabecera de cliente | `TIP` |

- Para, CC y asunto son de cada proveedor.
- El asunto admite marcadores (`{op}`, `{producto}`, `{origen}`, `{dia_recogida}`, …); un tramo entre `[corchetes]` se quita si alguno de sus marcadores está vacío.
- La referencia lleva el prefijo del proveedor, con su propia numeración por año. Un borrador que cambia de proveedor recibe una referencia nueva.
- Los códigos de BOYACA se guardan en la libreta por dirección (Rotomadrid = 178) y se rellenan al elegirla; el de entrega se escribe a mano la primera vez y se recuerda al enviar.
- Las etiquetas de transporte salen **una por palé** (A5 por defecto), con el origen de la carga como remitente.

## Albaranes

Calcados del modelo de COMECO INTEGRA S.L.U. (sin logotipo), uno por solicitud y para todos los proveedores:

- Nº Albarán = referencia de la solicitud. Sin valorar.
- Cada impresión saca **3 hojas A4**: COPIA COMECO, COPIA TRANSPORTISTA y COPIA RECEPTOR, cada una con su casilla marcada.
- Se rellena con la solicitud (OP, origen, proveedor, fecha de entrega, destino, producto y palés); la cantidad va en ej., cajas o kg, y paquetes y palés se calculan solos.
- Los datos legales (razón social, N.I.F., dirección, texto de residuos, certificados PEFC/FSC y registro) se editan en **Configuración → Albarán**.

## Cómo funciona el acceso

- Email y contraseña. **La app no envía emails** (sin SMTP ni DNS).
- El admin da de alta a los compañeros en **Configuración → Usuarios** con una contraseña
  temporal y se la comunica en persona. En el primer acceso se obliga a cambiarla.
- Se admiten cuentas de cualquier dominio de email.
- ¿Contraseña olvidada? El admin la restablece desde la misma pantalla.

## Base de datos

| Tabla | Para qué | Quién escribe |
|---|---|---|
| `profiles` | Datos del solicitante, rol y estado | Cada uno lo suyo; el admin, todo |
| `app_settings` | Configuración global (remitente, CECO, cuotas) | Solo admin |
| `carriers` | Proveedores: formulario, Para/CC, asunto, prefijo | Solo admin |
| `recipients` | Libreta de direcciones compartida | Cualquier usuario; borra su creador o el admin |
| `shipment_requests` | Solicitudes con referencia `MSJ-AAAA-0001` (o el prefijo del proveedor), copia del destino y datos de transporte | Su creador o el admin |
| `request_templates` | Plantillas de envíos frecuentes | Su creador o el admin |
| `delivery_notes` | Albarán de cada solicitud (cantidades, paquetes, palés) | Su autor o el admin |
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
| `npm run reset-password -- <email>` | Si nadie puede entrar: nueva contraseña temporal para esa cuenta (sale en tu terminal) |
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
| `/etiquetas` · `?solicitud=<id>` · `?destinatario=<id>` | Usuarios: vista previa a escala, imprimir y descargar. Calibración: la ve todo el mundo, la cambia el admin |
| `/api/labels` | Usuarios: el PDF (mismos parámetros que la pantalla) |
| `/configuracion/usuarios` · `/configuracion/proveedores` · `/configuracion/albaran` | Solo admin |
| `/albaranes` · `?solicitud=<id>` | Usuarios: preparar e imprimir el albarán (lo guarda su autor o el admin) |
| `/api/albaranes` | Usuarios: el PDF (3 copias; los campos de la pantalla pueden ir en la URL) |
| `/solicitudes/nueva?proveedor=<slug>` | Usuarios: empezar con un proveedor elegido (`boyaca`, `rafa-vento`, `tipsa`) |
