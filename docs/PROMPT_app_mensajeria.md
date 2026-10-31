# PROMPT — App web "Mensajería Express" (solicitudes de mensajería + buscador de empresas + etiquetas)

> Copia todo este documento en tu asistente de código (Claude Code, Cursor, etc.).
> Los datos de la empresa ya están en la sección 12. Las claves API **no** van en este documento: se aportan en `.env.local`.

---

## 1. Rol y forma de trabajar

Actúa como **ingeniero de software senior full‑stack** especializado en Next.js, Supabase y Vercel.

**Reglas de trabajo obligatorias:**

1. **No escribas código todavía.** Primero entrégame un **plan técnico** (arquitectura, modelo de datos, estructura de carpetas, fases y riesgos) y **espera mi aprobación**.
2. Si algo es ambiguo, **pregúntame** antes de asumir. Si asumes algo, déjalo escrito en una sección "Supuestos".
3. Trabaja **por fases** (sección 10). Al terminar cada fase: resume qué hiciste, cómo probarlo y espera mi OK antes de seguir.
4. Código en **TypeScript estricto**, interfaz en **español (España)**, código y nombres técnicos en inglés.
5. Nada de claves en el cliente: toda API externa se llama desde el servidor.
6. **Control de versiones con Git desde el primer momento.** La carpeta `E:\Proyects\Meseng` ya es un repositorio Git, con un `.gitignore` y la rama `main`.
   - **Scaffolding:** crea el proyecto Next.js en esta misma carpeta, sin crear subcarpetas ni un segundo repositorio. Antes, mueve este prompt a `docs/PROMPT_app_mensajeria.md` para que `create-next-app` no se queje de archivos existentes. Combina su `.gitignore` con el actual sin perder las reglas de `.env*`.
   - **Ramas:** una rama por fase (`feat/fase-1-base`, `feat/fase-4-escena-3d`…), que se fusiona en `main` cuando yo apruebe la fase.
   - **Commits:** pequeños y con mensajes en formato *Conventional Commits* (`feat:`, `fix:`, `chore:`, `docs:`…).
   - **Nunca subas secretos:** `.env`, `.env.local` y claves quedan ignorados; solo se versiona `.env.example`. Antes de cada commit, comprueba que no se cuela ninguna clave.
   - **GitHub y Vercel:** en la fase de despliegue se crea un repositorio **privado** en GitHub y se conecta a Vercel, que desplegará automáticamente desde `main` y creará *previews* para las ramas.
   - **Pide permiso** antes de hacer commit, push o crear el repositorio en GitHub.

---

## 2. Contexto del problema

Trabajo en una oficina y varias veces al día solicito servicios de mensajería para enviar paquetes o documentación a clientes. Cada solicitud es un **correo con un formulario fijo** que relleno a mano.

**Dónde pierdo más tiempo:** buscando la **dirección, código postal, teléfono y persona de contacto** de cada empresa destinataria.

**Objetivo de la app:**

- Rellenar el formulario en segundos (autocompletado, datos guardados, reutilizar envíos anteriores).
- Buscar empresas en la web **de forma gratuita**, estilo Perplexity, y volcar los datos al formulario con un clic.
- Abrir **Gmail** con el correo ya redactado.
- Generar e imprimir **etiquetas** para el sobre o la caja.
- Una interfaz **limpia y memorable**, con una ilustración **3D animada (Three.js)** en la que el paquete se va preparando a medida que relleno el formulario, hasta quedar **precintado** al terminar (sección 6).
- **Compartida** con los compañeros de oficina (libreta de direcciones e historial comunes).
- Desplegada en **Vercel**, base de datos en **Supabase**.

---

## 3. Formulario que hay que generar (fuente de verdad)

El correo debe reproducir **exactamente** esta estructura:

```
SOLICITUD DE SERVICIO DE MENSAJERÍA

FECHA: [dd/mm/2026]
SOLICITANTE:
TELÉFONO:
EMAIL:
SOCIEDAD/EMPRESA:
CECO: 2690600250

DETALLES DE LA PETICIÓN
Concepto:

DESCRIPCIÓN DEL ENVÍO
(Qué se envía, contenido, peso estimado o instrucciones especiales)

INFORMACIÓN DEL DESTINO
Dirección completa:
Ciudad/Código Postal:
Persona de contacto:            Teléfono:

PRIORIDAD, ALCANCE Y TIPO DE SERVICIO
| URGENCIA (Plazo)                 | ÁMBITO GEOGRÁFICO | TIPO TRANSPORTE | TIPO ENVÍO        |
| [ ] Urgente (menos de 4 horas)   | [ ] Local/Urbano  | [ ] Moto        | [ ] Documentación |
| [ ] Estándar (en el día)         | [ ] Nacional      | [ ] Furgoneta   | [ ] Caja          |
| [ ] Económico (día siguiente)    | [ ] Internacional | [ ] Camión      | [ ] Nº Cajas: __  |
```

**Reglas del formulario:**

- `FECHA`: por defecto hoy, formato `dd/mm/aaaa`, zona horaria `Europe/Madrid`.
- `SOLICITANTE`, `TELÉFONO`, `EMAIL`, `SOCIEDAD/EMPRESA`: se autocompletan desde el **perfil del usuario** conectado (editables). Sociedad por defecto: **Comeco Gráfico**.
- `CECO`: valor por defecto `2690600250`, editable y configurable por usuario.
- Urgencia, ámbito y transporte: **selección única** (radio). En el correo la opción elegida se marca con `[X]`.
- Tipo de envío: Documentación o Caja; si es Caja, **Nº de cajas** es obligatorio (entero ≥ 1).
- **Sugerencias inteligentes** (no bloqueantes): si el destino está en la **provincia de Madrid** (la oficina está en Torrejón de Ardoz) → proponer "Local/Urbano" (regla configurable); si el país no es España → "Internacional"; si son ≥ 5 cajas → sugerir "Furgoneta".
- Validación con **zod**: CP español de 5 dígitos (si el país es España), teléfono válido (`libphonenumber-js`, región ES por defecto), email válido.

---

## 4. Stack técnico (obligatorio)

| Capa | Tecnología |
|---|---|
| Framework | **Next.js (App Router, última versión estable)** + React + TypeScript |
| UI | **Tailwind CSS** + **shadcn/ui** + `lucide-react` |
| Formularios | `react-hook-form` + `zod` (esquemas compartidos cliente/servidor) |
| BD y auth | **Supabase** (Postgres, Auth con **email + contraseña sin envío de emails**, Row Level Security) con `@supabase/ssr` |
| Búsqueda web | **Tavily Search API** (plan gratuito, 1.000 créditos/mes, sin tarjeta) |
| IA para extraer datos | **Google Gemini** (modelo Flash del plan gratuito de Google AI Studio) con salida JSON estructurada. **Fallback:** Groq (plan gratuito). El modelo debe ser configurable por variable de entorno. |
| Etiquetas PDF | `@react-pdf/renderer` + `qrcode` |
| 3D | **Three.js** con `@react-three/fiber` + `@react-three/drei` (+ `@react-three/postprocessing` para el efecto *dither*, opcional) |
| Animación | **GSAP** (timeline maestra de la escena 3D y entradas de texto) + **Motion** (`motion/react`) para micro‑interacciones de la UI |
| Tipografía | **Geist Sans** + **Geist Mono** cargadas con `next/font` (sin peticiones externas en tiempo de ejecución) |
| Tests | `vitest` (unitarios) + `playwright` (flujo principal e2e) |
| Despliegue | **Vercel** (Hobby) + Supabase (Free) |
| Migraciones | Supabase CLI: `supabase/migrations/*.sql` versionadas en el repo |

Todo debe funcionar con **planes gratuitos**. Si algo pudiera generar coste, avísame antes.

---

## 5. Funcionalidades

### 5.1 Acceso y usuarios (compartida en la oficina)

- Login con **email y contraseña** de Supabase Auth.
- **Ni la app ni Supabase envían ningún email** (sin enlaces mágicos, confirmaciones ni recuperación por correo). Así **no hace falta SMTP ni tocar los DNS** de la empresa, a los que no tenemos acceso.
- **Registro público desactivado.**
  - El administrador da de alta a los compañeros desde **Configuración → Usuarios**, con una contraseña temporal.
  - Por debajo es una Server Action con `auth.admin.createUser({ email, password, email_confirm: true })`; la `service_role` se usa solo en el servidor.
  - En el primer acceso se obliga a cambiar la contraseña (flag `must_change_password` en `profiles`).
- **Solo emails del dominio `@comecografico.com`** (5 usuarios): se valida en el servidor al crear el usuario **y** se refuerza en la BD (trigger sobre `auth.users` o hook "Before User Created"). No basta con validar en el cliente.
- **¿Contraseña olvidada?** No hay recuperación por email. El admin genera una nueva contraseña temporal desde la misma pantalla y también puede desactivar usuarios.
- **Sesión persistente** (refresh token) para no tener que entrar cada día. Contraseña de 10 caracteres como mínimo y límite de intentos de login.
- En el primer acceso, pantalla de **"Mi perfil"**: nombre, teléfono, empresa/sociedad, CECO por defecto. Estos datos rellenan el bloque del solicitante.
- Roles: `user` y `admin`. El admin edita la configuración global (sección 5.7). **Administrador inicial: `atubio@comecografico.com`** (asignado en el seed o con un trigger al registrarse).

### 5.2 Nueva solicitud (pantalla principal)

Diseño según la sección 6.3: dos columnas en escritorio; en móvil, escena 3D compacta arriba y formulario debajo.

- **Izquierda — Formulario** por secciones (Solicitante · Petición · Destino · Servicio).
  - Campo **"Destinatario"** con autocompletado sobre la libreta compartida (busca por nombre de empresa, ciudad o contacto, tolerante a tildes y errores: `pg_trgm` + `unaccent`). Al elegir uno, rellena todo el bloque de destino.
  - Botón **"🔎 Buscar empresa en internet"** que abre el panel de búsqueda (5.3).
  - Casilla **"Guardar/actualizar en la libreta de direcciones"** (marcada por defecto si el destino es nuevo).
- **Derecha — Escena 3D fija (sticky)** del paquete preparándose (sección 6.4), con una pestaña alternativa **"Correo"** que muestra la vista previa en vivo del correo tal como se enviará.
- Acciones:
  - **Guardar borrador**
  - **Abrir en Gmail** (5.4) → marca la solicitud como `enviada`
  - **Copiar correo** (texto y HTML)
  - **Imprimir etiquetas** (5.6)
- **Autoguardado** del borrador (debounce) para no perder datos.
- Atajos de teclado: `Ctrl+Enter` abrir en Gmail, `Ctrl+K` buscar empresa.

### 5.3 Buscador de empresas gratuito (estilo Perplexity)

Panel lateral (`Sheet`) con una caja de búsqueda tipo chat. Ejemplos: "Iberdrola sede Bilbao", "Clínica San Rafael Madrid recepción".

**Flujo en el servidor** (`/api/company-search`, runtime Node):

1. **Caché primero**: si existe la misma consulta normalizada en `company_search_cache` con menos de 30 días, devolverla sin gastar cuota.
2. **Tavily**: búsqueda (`search_depth: basic`, `max_results: 5–8`, `include_raw_content` solo si hace falta), priorizando la web oficial, páginas de "contacto", Google Business y directorios de empresas.
3. **LLM (Gemini → fallback Groq)**: con los resultados de Tavily, extraer **JSON estricto** validado con zod:
   ```ts
   {
     companyName: string,
     candidates: Array<{          // varias sedes si las hay
       label: string,             // p.ej. "Sede central", "Delegación Valencia"
       address: string | null,
       postalCode: string | null,
       city: string | null,
       province: string | null,
       country: string | null,
       phone: string | null,
       email: string | null,
       contactPerson: string | null,
       website: string | null,
       sources: Array<{ field: string, url: string }>,  // fuente por campo
       confidence: "alta" | "media" | "baja"
     }>,
     summary: string              // 2–3 frases con citas [1], [2]
   }
   ```
4. **Reglas anti‑invención en el prompt del LLM**: usar **solo** la información de los resultados; si un dato no aparece, `null`; nunca deducir teléfonos ni CP; citar la URL de cada dato.
5. Guardar el resultado en caché.

**Interfaz de resultados:**

- Respuesta resumida con **fuentes numeradas y enlazadas** (como Perplexity).
- Una **tarjeta por sede** con cada campo y su botón **📋 Copiar** individual.
- Botón **"Usar en el formulario"** (rellena todo el bloque de destino) y **"Usar solo este campo"**.
- Badge de confianza y aviso: *"Verifica los datos antes de enviar"*.
- Botón secundario "Abrir en Google" / "Ver en Google Maps" con la consulta (sin coste).
- **Control de cuota**: límite por usuario (p.ej. 30 búsquedas/día, configurable), contador visible de uso mensual del equipo, y mensaje claro si se agota la cuota (seguir con los enlaces a Google/Maps).
- Llamadas con **timeout** y manejo de errores (429, 5xx) con fallback de proveedor.

### 5.4 Envío por Gmail

- Botón **"Abrir en Gmail"** que abre una pestaña nueva con:
  `https://mail.google.com/mail/?view=cm&fs=1&to=…&cc=…&su=…&body=…` (todo con `encodeURIComponent`).
- Parámetro opcional `authuser=<email del usuario>` para que se abra con la cuenta correcta si tiene varias sesiones de Google.
- **Destinatario (`to`) y CC** configurables globalmente (5.7); el usuario puede añadir o quitar CC en cada solicitud. Valores por defecto:
  - **Para:** `info@lrmensajeros.com`
  - **CC:** `recepcionjv40bis@vocento.com`
- **Asunto** por defecto (plantilla configurable): `Solicitud mensajería · {urgencia} · {empresa destino} · {dd/mm/aaaa}`.
- **Cuerpo en texto plano** con la estructura de la sección 3 (columnas alineadas, `[X]` en las opciones elegidas).
- Si la URL supera ~1.800 caracteres, avisar y ofrecer **"Copiar correo"** en su lugar.
- Botón **"Copiar como tabla (HTML)"** usando `ClipboardItem` con `text/html` + `text/plain`, para pegar en Gmail una versión con tabla y formato.

### 5.5 Libreta de direcciones e historial (reutilizar envíos)

- **Libreta compartida** de destinatarios: crear, editar, buscar, marcar favoritos, fusionar duplicados, ver "último envío" y "nº de envíos".
- Guardar la URL de origen y la fecha en que se verificó el dato.
- **Historial de solicitudes** de toda la oficina con filtros (fecha, solicitante, destinatario, estado, urgencia) y búsqueda.
- Acción **"Repetir envío"**: duplica una solicitud con la fecha de hoy y el solicitante actual.
- **Plantillas** de envíos frecuentes (p.ej. "Documentación a notaría X").
- Estados: `borrador` → `enviada` → `entregada` / `cancelada` (cambio manual).
- Exportar el historial a **CSV**.

### 5.6 Gestor de etiquetas (impresora normal A4)

- Generar **PDF** desde una solicitud (o etiqueta suelta desde la libreta).
- Formatos A4:
  - 1 etiqueta por hoja (A4 completo, para cajas grandes)
  - 2 por hoja (A5)
  - 4 por hoja (A6, 105×148 mm)
  - 8 por hoja (105×74 mm, compatible con hojas adhesivas tipo Apli/Avery)
- Opción **"Empezar en la posición N"** para aprovechar hojas adhesivas ya usadas.
- Si el envío es de **N cajas**, generar N etiquetas numeradas **"Bulto 1/N, 2/N…"**.
- Contenido de la etiqueta:
  - **REMITENTE** (oficina, configurable) en pequeño
  - **DESTINATARIO** en grande: empresa, a la atención de, dirección, CP + ciudad, país, teléfono
  - Distintivos: **URGENTE**, **FRÁGIL**, **DOCUMENTACIÓN** (casillas)
  - Referencia de la solicitud + fecha + **QR** con el ID de la solicitud
  - Observaciones breves
- Vista previa en pantalla, botones **Descargar PDF** e **Imprimir**.
- Márgenes calibrables (ajuste en mm) en configuración, porque cada impresora desplaza un poco.

### 5.7 Configuración (admin)

- Email(s) de la empresa de mensajería (`to`) y CC por defecto.
- Plantilla de asunto.
- Datos del remitente para etiquetas (dirección de la oficina) y logo opcional.
- Ciudad de la oficina (para sugerir "Local/Urbano").
- Límite de búsquedas por usuario/día.
- Dominio(s) de email permitidos.
- **Usuarios:** alta, desactivación y restablecimiento de contraseña (sección 5.1).

---

## 6. Diseño de la interfaz y experiencia 3D

### 6.1 Dirección visual

**Inspiración (no copiar):** [Legency Media en Awwwards](https://www.awwwards.com/sites/legencymedia-com): tipografía grande y contundente, mucho aire, pasos numerados `01 / 02 / 03`, motivo gráfico de *dithering* azul y movimiento fluido (GSAP).

Trasladado a una herramienta interna de uso diario: **limpia, serena y rápida**. El protagonismo visual lo tiene la escena 3D; la interfaz no compite con ella.

**Principios:**

- Mucho espacio en blanco: retícula de 12 columnas, base de 8 px y ancho máximo de 1440 px.
- La jerarquía se marca con tipografía y espaciado, no con cajas ni sombras: bordes de 1 px, radios de 10–14 px y sombras casi nulas.
- **Un único color de acento.**
- El movimiento tiene que servir para algo: cada animación comunica progreso o confirma una acción.
- **La usabilidad está por encima del efecto:** el formulario tiene que poder rellenarse con teclado más rápido que hoy, aunque la escena 3D no haya cargado.

### 6.2 Design tokens (variables CSS + tema de Tailwind)

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--bg` | `#F6F5F1` | `#0B0C10` | Fondo general (blanco roto cálido) |
| `--surface` | `#FFFFFF` | `#14161C` | Tarjetas, inputs |
| `--ink` | `#0B0B0F` | `#F2F2EE` | Texto principal |
| `--muted` | `#6B6B72` | `#9A9AA3` | Texto secundario, etiquetas |
| `--line` | `#E4E2DC` | `#24262E` | Bordes de 1 px |
| `--accent` | `#2F4BFF` | `#5B73FF` | Azul eléctrico: botón principal, foco, progreso |
| `--kraft` | `#C8996A` | `#C8996A` | Cartón de la caja 3D |
| `--tape` | `#B8895A` (translúcido) | ídem | Cinta de precinto |
| `--urgent` | `#FF4D2E` | `#FF6A4F` | Urgente, sello rojo |
| `--success` | `#16A34A` | `#22C55E` | Completado |

**Tipografía:**

- **Titulares:** Geist Sans 600, `clamp(2.5rem, 6vw, 6rem)`, `letter-spacing: -0.03em`, frases cortas con mayúscula solo al inicio ("Envía en segundos.").
- **Texto:** Geist Sans, 15–16 px, interlineado de 1.5.
- **Datos:** Geist Mono para la referencia `MSJ-2026-0001`, CECO, CP, teléfonos y los numerales de cada sección.
- **Secciones del formulario numeradas:** `01 Solicitante · 02 Petición · 03 Destino · 04 Servicio`, con el numeral pequeño en mono y el título grande.

### 6.3 Pantallas clave

- **Login:** hero a pantalla completa con un titular grande, la caja 3D flotando y girando despacio sobre un degradado azul con *dithering* (shader Bayer 4×4) y el formulario de acceso (email y contraseña). En la parte inferior, una cinta *marquee*: "Solicitar · Embalar · Etiquetar · Enviar ·".
- **Inicio:** saludo grande, botón principal **"Nueva solicitud"**, últimos envíos en una lista limpia, accesos a la Libreta y al Historial, y un contador discreto de búsquedas del mes.
- **Nueva solicitud:**
  - Escritorio: a la izquierda, el formulario en un único scroll con navegación lateral `01–04`, donde cada número pasa a ✓ al completarse. A la derecha, la **escena 3D sticky** (≈45 % del ancho) con la barra de progreso y las pestañas **Paquete | Correo**.
  - Móvil: escena compacta (≈220 px) fija arriba y plegable.
- **Libreta / Historial:** tablas limpias con filas altas, buscador grande arriba y filtros como *chips*.
- **Etiquetas:** vista previa de la hoja A4 a escala con las etiquetas colocadas y los controles a la derecha.

### 6.4 Escena 3D: "el paquete se prepara"

**Tecnología y modelado:**

- Three.js con `@react-three/fiber` + `drei`. Toda la secuencia la controla una **timeline maestra de GSAP**.
- **Geometría procedural** (sin depender de modelos externos), para poder animar cada pieza:
  - **Caja:** 6 paneles con pivotes en las solapas para plegarlas y cerrarlas.
  - **Precinto:** un plano que crece a lo largo de la caja, más un rollo de cinta que la recorre.
  - **Etiqueta:** un plano con `CanvasTexture` dibujada con los **datos reales del formulario** (empresa, CP, ciudad).
  - **Contenido:** sobre de documentación, objetos y relleno.
- **Opcional:** vehículos low‑poly (moto, furgoneta, camión) en GLB con licencia **CC0** (Kenney, Poly Pizza), comprimidos con Draco/Meshopt. Menos de 300 KB entre todos.
- **Estilo:** low‑poly suave tipo *clay*, materiales mates (`MeshStandardMaterial`) y luz de estudio cálida.
  - Iluminación con `Lightformer` locales; no usar presets de HDRI que se descargan de CDNs.
  - `ContactShadows` bajo la caja y fondo transparente para que se funda con `--bg`.

**Etapas (avanzan según los bloques del formulario que son válidos):**

| # | Disparador | Animación |
|---|---|---|
| 0 · Inicio | Formulario vacío | Cartón plano desplegado flotando, con una "respiración" suave (idle) |
| 1 · Montaje | Bloque **01 Solicitante** válido | Los paneles se pliegan y forman la caja abierta, con las solapas levantadas |
| 2 · Embalaje | Concepto + descripción + tipo de envío | **Documentación:** un sobre entra planeando. **Caja:** objetos y relleno caen con un rebote. Si hay **N cajas > 1**, aparecen cajas apiladas detrás (máx. 5 visibles y un badge "×N") |
| 3 · Etiquetado | Bloque **03 Destino** válido | La etiqueta se despega y se pega en el lateral, mostrando en vivo empresa, CP y ciudad (textura actualizada con debounce) |
| 4 · Servicio | Urgencia + ámbito + transporte | Si es urgente, se estampa el **sello "URGENTE"** rojo. Si es internacional, aparece una pegatina de globo. Junto a la caja aparece el **vehículo** elegido |
| 5 · Precintado | Clic en **"Abrir en Gmail"** (o en "Cerrar paquete" con el formulario al 100 %) | Las solapas se cierran, el **rollo de cinta recorre la caja y deja el precinto**, la caja hace un pequeño *squash & stretch*, salen unas partículas sutiles y aparece el check **"Paquete listo"**. Opcional: el vehículo se lleva la caja fuera de escena |

**Comportamiento:**

- **Cálculo del progreso:** el hook `useShipmentProgress()` valida cada bloque con `schema.pick(...).safeParse()` sobre `watch()` de react-hook-form, con un debounce de 150 ms, y devuelve `{ stage, percent, blocks }`.
- **Timeline única con labels por etapa:**
  - Avanzar es `tl.tweenTo(label)`.
  - Si el usuario borra un dato, la escena **retrocede** de forma fluida. Es totalmente reversible y nunca queda en un estado incoherente.
- **Solicitudes existentes:** al abrir una solicitud guardada o usar "Repetir envío", la escena salta a su etapa con una transición corta, sin reproducir toda la secuencia.
- **Interacción:**
  - Se puede arrastrar para orbitar un poco (limitado a ±25°).
  - Al pasar el ratón por la etiqueta se resalta el bloque Destino del formulario.
  - Al hacer clic en una parte de la caja, el formulario salta al bloque correspondiente.
- **Barra de progreso** bajo la escena con 5 hitos: *Montaje · Embalaje · Etiqueta · Servicio · Precintado*.
- **Sonidos** de cartón y cinta: opcionales y **desactivados por defecto**.

**Rendimiento y accesibilidad (obligatorio):**

- **Carga diferida:** `next/dynamic` con `ssr: false` y `Suspense` con una imagen estática de la caja como placeholder. El formulario es usable antes de que cargue la escena.
- **Renderizado bajo demanda:** `frameloop="demand"` cuando no hay animación, pausa con la pestaña oculta y `dpr={[1, 2]}`.
- **Calidad adaptativa:** `PerformanceMonitor` de drei, que quita sombras y postprocesado en equipos lentos.
- **Objetivos:**
  - 60 fps en un portátil de oficina con gráfica integrada.
  - Chunk 3D por debajo de 250 KB gzip.
  - LCP por debajo de 2,5 s.
- **`prefers-reduced-motion`:** sin animación. Se muestra una ilustración estática por etapa (render de la propia escena) y la barra de progreso.
- **Sin WebGL:** alternativa en 2D (SVG) con la misma barra de progreso.
- **Lectores de pantalla:** el canvas es decorativo (`aria-hidden`) y el progreso se anuncia en texto con `aria-live="polite"`.

### 6.5 Micro‑interacciones de la UI

- **Entrada de página:** los titulares aparecen línea a línea (400–600 ms, `power3.out`).
- **Campos:** al enfocar, un subrayado de acento crece. Cuando un bloque se completa, su número `01–04` se transforma en ✓.
- **"Usar en el formulario"** (desde el buscador): los campos se rellenan en cascada (stagger de 40 ms) con un destello del acento.
- **Botón copiar:** el icono se transforma en check.
- **Navegación:** transiciones suaves entre páginas (View Transitions API o Motion).
- **Duraciones:** 150–300 ms en la UI. **Ninguna animación bloquea la escritura.**

### 6.6 Entregables de diseño (antes de construir las pantallas)

1. Tokens en `tailwind` y variables CSS, más el tema de shadcn/ui adaptado.
2. Página interna **`/styleguide`** con tipografías, colores, botones, inputs, tarjetas, tablas y estados.
3. Sandbox **`/lab/package`** con la escena 3D aislada y un **slider para recorrer las 5 etapas** (y retroceder), además de interruptores para N cajas, urgente, internacional y vehículo.

**Lo valido yo antes de integrarlo en el formulario.**

---

## 7. Modelo de datos (propuesta; revísalo en el plan)

```
profiles            id (=auth.users.id), full_name, phone, email, company, default_ceco,
                    role ('user'|'admin'), created_at

recipients          id, company_name, address, postal_code, city, province, country,
                    contact_person, phone, email, notes, source_url, verified_at,
                    is_favorite, usage_count, last_used_at,
                    created_by, updated_by, created_at, updated_at
                    + índices GIN pg_trgm sobre unaccent(company_name), city, contact_person

shipment_requests   id, ref (correlativo legible, p.ej. MSJ-2026-0001), request_date,
                    requester_id, requester_name, requester_phone, requester_email,
                    company, ceco, concept, description,
                    recipient_id (nullable) + snapshot de destino
                      (dest_company, dest_address, dest_postal_code, dest_city, dest_country,
                       dest_contact, dest_phone),
                    urgency ('urgente'|'estandar'|'economico'),
                    scope ('local'|'nacional'|'internacional'),
                    transport ('moto'|'furgoneta'|'camion'),
                    shipment_type ('documentacion'|'caja'), box_count,
                    status ('borrador'|'enviada'|'entregada'|'cancelada'),
                    email_subject, email_body, sent_at, created_at, updated_at

request_templates   id, name, payload jsonb, created_by, shared boolean

company_search_cache  id, query_normalized (unique), result jsonb, provider, created_at
search_usage        id, user_id, query, provider, created_at   (para límites y contador)

app_settings        fila única: courier_to, courier_cc, subject_template, sender_block,
                    office_city, label_offsets jsonb, search_daily_limit, allowed_domains
```

**Notas:**

- Guardar **snapshot** del destino en cada solicitud: si cambia la libreta, el historial no se altera.
- **RLS activado en todas las tablas**: lectura para cualquier usuario autenticado del dominio; `recipients` editable por cualquier usuario autenticado (libreta compartida); `shipment_requests` editable solo por su creador o un admin; `app_settings` solo admin.
- Triggers `updated_at`; tipos generados con `supabase gen types typescript`.
- Seed con 3–4 destinatarios y solicitudes de ejemplo, y `app_settings` con los datos reales de la sección 12.

---

## 8. Requisitos no funcionales

- **Seguridad**: claves de Tavily, Gemini, Groq y `SUPABASE_SERVICE_ROLE_KEY` solo en el servidor; validar con zod toda entrada y toda salida del LLM; escapar contenido externo (nunca `dangerouslySetInnerHTML` con datos de la web); rate limiting por usuario en las rutas de búsqueda.
- **Protección de datos (RGPD)**: los contactos son datos personales; uso interno, mínimos necesarios y opción de borrar un destinatario.
- **Rendimiento**: búsqueda con estado de carga claro (skeleton), respuesta < 10 s; la caché evita búsquedas repetidas.
- **UX**: responsive, modo claro/oscuro, accesible (labels, foco, contraste AA), toasts de confirmación, estados vacíos útiles.
- **Calidad**: ESLint + Prettier, tests unitarios de generación de correo/etiquetas/validaciones, 1 test e2e del flujo "buscar empresa → rellenar → abrir Gmail → imprimir etiqueta".

---

## 9. Estructura de carpetas sugerida

```
/app
  /(auth)/login
  /(app)/solicitudes/nueva
  /(app)/solicitudes/[id]
  /(app)/historial
  /(app)/libreta
  /(app)/etiquetas
  /(app)/perfil
  /(app)/configuracion
  /(app)/styleguide
  /(app)/lab/package
  /api/company-search/route.ts
  /api/labels/[id]/route.ts
  /auth/callback/route.ts
/components (ui/, forms/, search/, labels/, motion/)
/components/three
  PackageScene.tsx        (Canvas, luces, cámara, fallbacks)
  Box.tsx, Flaps.tsx, Tape.tsx, ShippingLabel.tsx, Contents.tsx, Stamp.tsx, Vehicle.tsx
  usePackageTimeline.ts   (timeline maestra GSAP con labels por etapa)
  DitherBackground.tsx    (shader Bayer para login)
/hooks/useShipmentProgress.ts
/public/models            (GLB CC0 opcionales)
/public/fallback          (imágenes estáticas por etapa)
/lib
  /supabase (server.ts, client.ts, middleware.ts)
  /search (tavily.ts, llm.ts, extract-prompt.ts, schema.ts)
  /email (build-body.ts, gmail-url.ts, build-html.ts)
  /labels (layouts.ts, LabelDocument.tsx)
  /validation (schemas.ts)
/supabase/migrations, /supabase/seed.sql
/tests (unit/, e2e/)
middleware.ts
.env.example
README.md
```

---

## 10. Fases de desarrollo (con criterios de aceptación)

| Fase | Contenido | Hecho cuando… |
|---|---|---|
| **0. Plan** | Arquitectura, modelo de datos, riesgos, supuestos, propuesta visual (tokens y wireframes ASCII de las pantallas clave) | Lo apruebo |
| **1. Base + design system** | Proyecto Next.js en el repositorio Git existente (rama `feat/fase-1-base`), Tailwind + shadcn con tokens, fuentes Geist, `/styleguide`, Supabase, login con email y contraseña (pantalla de 6.3), alta de usuarios por el admin, cambio de contraseña obligatorio en el primer acceso, perfil | Nadie puede registrarse por su cuenta ni se puede crear un usuario de otro dominio; `/styleguide` aprobada |
| **2. Base de datos** | Migraciones, RLS, seed, tipos generados | Las políticas RLS están probadas (usuario A no edita solicitudes de B) |
| **3. Formulario + correo** | Formulario completo con secciones 01–04, vista previa, Gmail, copiar texto/HTML, borradores | Gmail se abre con el correo idéntico a la plantilla de la sección 3 |
| **4. Escena 3D del paquete** | `/lab/package` con slider; después, integración con `useShipmentProgress`, precintado al abrir Gmail, fallbacks (*reduced motion*, sin WebGL) | El paquete avanza y retrocede según el formulario, se precinta al enviar y va a ≥ 50 fps en un portátil de oficina |
| **5. Libreta + historial** | Autocompletado, CRUD de destinatarios, historial, repetir envío, plantillas, CSV | Repetir un envío anterior lleva < 30 s |
| **6. Buscador IA** | Tavily + Gemini/Groq, caché, cuotas, UI con fuentes y botones copiar/usar | Buscar "empresa + ciudad" rellena el destino con fuentes citadas |
| **7. Etiquetas** | PDF A4 en 4 formatos, bultos N/N, posición inicial, QR, calibración | Imprime correctamente en una hoja Apli de 8 etiquetas |
| **8. Despliegue** | Vercel + Supabase en producción, URLs de redirección de Auth, README, Lighthouse | Un compañero entra desde su PC y crea una solicitud; Lighthouse ≥ 90 en rendimiento y accesibilidad |

---

## 11. Despliegue (instrucciones que debes incluir en el README)

1. Crear proyecto en Supabase → aplicar migraciones (`supabase db push`) → proveedor Email con contraseña → **desactivar "Allow new users to sign up"** y **desactivar "Confirm email"** → configurar **Site URL** (`https://<app>.vercel.app`).
2. Crear la cuenta del administrador inicial (`atubio@comecografico.com`) con un script de seed (`auth.admin.createUser`) o desde el panel de Supabase. El resto de usuarios los da de alta él desde la app.
3. Claves gratuitas de **Tavily**, **Google AI Studio** (Gemini) y **Groq** (fallback). Las cuentas ya existen: **pídeme las claves cuando las necesites** y yo las pondré en `.env.local` y en Vercel. Nunca las escribas en el código, en el repositorio ni en el chat.
4. Crear un repositorio **privado** en GitHub → `git remote add origin …` → `git push -u origin main` → importarlo en Vercel → añadir las variables de entorno → desplegar. A partir de ahí, cada push a `main` despliega producción y cada rama genera una *preview*.
5. Variables (`.env.example`):
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   TAVILY_API_KEY=
   GEMINI_API_KEY=
   GEMINI_MODEL=
   GROQ_API_KEY=
   GROQ_MODEL=
   ALLOWED_EMAIL_DOMAINS=comecografico.com
   NEXT_PUBLIC_APP_URL=
   ```
6. **No se configura SMTP ni se tocan DNS.** La app no envía emails: las solicitudes salen desde el Gmail de cada usuario (sección 5.4) y las cuentas las gestiona el admin (sección 5.1). Comprueba que ningún flujo (registro, invitación, recuperación) dependa del envío de emails de Supabase.

---

## 12. Datos de la empresa

| Dato | Valor |
|---|---|
| Empresa / sociedad por defecto | **Comeco Gráfico** |
| Dominio de email permitido | `comecografico.com` |
| Usuarios | 5 compañeros |
| Administrador inicial | `atubio@comecografico.com` |
| Email de la mensajería (**Para**) | `info@lrmensajeros.com` |
| **CC** por defecto | `recepcionjv40bis@vocento.com` |
| CECO por defecto | `2690600250` |
| Remitente de etiquetas | **Comeco Gráfico** · C. Meridiano, 19 · 28850 Torrejón de Ardoz (Madrid) · Tel. 916 76 75 04 |
| Ciudad / provincia de la oficina | Torrejón de Ardoz / Madrid |
| Zona horaria | `Europe/Madrid` |
| Logo | Pendiente (opcional) |
| Color de marca | Azul `#2F4BFF` por defecto (se puede cambiar si me das el color corporativo) |

**Cuentas y claves:** las cuentas de Supabase, Vercel, Tavily, Google AI Studio y Groq ya están creadas. **Nunca me pidas contraseñas.** Cuando necesites una clave API, dime cuál y en qué variable va, y yo la añadiré a `.env.local` y a Vercel.

---

**Empieza por la Fase 0: entrégame el plan técnico y las preguntas que tengas. No escribas código hasta que lo apruebe.**
