# CJ7 IA

Plataforma de automatización comercial: CRM de clientes, inventario de productos
y un agente de ventas por WhatsApp con IA.

- **Backend** — NestJS 11 + Prisma + PostgreSQL (Supabase) + OpenAI
- **Frontend** — Next.js 16 (App Router) + React 19 + Tailwind 4

---

## Puesta en marcha en local

Requisitos: **Node.js 20 o superior** y una base de datos PostgreSQL.

### Backend

```bash
cd backend
npm install
cp .env.example .env      # y rellena los valores
npx prisma generate
npm run db:push           # crea/actualiza las tablas
npm run start:dev         # http://localhost:8765
```

`JWT_SECRET` es obligatoria y el servidor no arranca sin ella. Genera una:

```bash
openssl rand -base64 48
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev               # http://localhost:3000
```

---

## Despliegue en Render

**Un solo servicio** sirve la aplicación web y la API.

El frontend se compila a HTML estático (`output: "export"` en
`next.config.ts`) y NestJS lo sirve desde `frontend/out`. Todo vive en el mismo
origen, así que no hay CORS que configurar, no hay una segunda instancia que
despertar, y la aplicación y sus datos comparten dominio.

Funciona porque todas las páginas son `"use client"` y piden los datos desde el
navegador: no hay renderizado en servidor que perder.

### Servicio nuevo

**New → Blueprint** y conecta este repositorio: [`render.yaml`](render.yaml) lo
configura todo.

### Servicio que ya existe

En **Settings**, ajusta tres campos:

| Campo | Valor |
|---|---|
| Root Directory | *(vacío)* |
| Build Command | `cd frontend && npm ci && npm run build && cd ../backend && npm ci && npm run build` |
| Start Command | `cd backend && npm run start:prod` |
| Health Check Path | `/health` |

Y en **Environment**, además de las que ya tengas:

| Variable | |
|---|---|
| `JWT_SECRET` | **Obligatoria.** Sin ella el servidor no arranca. `openssl rand -base64 48` |
| `META_APP_SECRET` | Recomendada: valida la firma del webhook de WhatsApp |
| `WHATSAPP_VERIFY_TOKEN` | El que registres en el panel de Meta |

## Migración de datos (una sola vez)

Si vienes de una versión anterior de la app, ejecuta esto **una vez** contra la
base de datos de producción, con el `.env` apuntando a ella:

```bash
cd backend

# 1. Aplica el nuevo esquema (unicidad de telefono/SKU ahora es por cuenta)
npm run db:push

# 2. Convierte a hash bcrypt las contraseñas guardadas en texto plano.
#    Es idempotente y nadie pierde el acceso.
npm run data:hash-passwords

# 3. Los clientes y productos existentes cuelgan de un usuario "admin@cj7ia.com"
#    autogenerado. Muevelos a tu cuenta real:
npm run data:claim -- tu@correo.com
```

Sin el paso 3 verás el panel vacío: cada cuenta solo ve sus propios datos.

---

## API

Todo requiere `Authorization: Bearer <token>` salvo lo marcado como público.

| Método | Ruta | |
|---|---|---|
| `GET` | `/health` | público |
| `POST` | `/auth/register` | público · 3 req/min |
| `POST` | `/auth/login` | público · 5 req/min |
| `GET` | `/auth/me` | perfil del usuario del token |
| `GET` `POST` | `/clients` | |
| `PUT` `DELETE` | `/clients/:id` | |
| `POST` | `/clients/import` | importación masiva desde texto |
| `GET` | `/clients/export/vcard` · `/clients/export/csv` | admite `?ids=a,b,c` |
| `GET` | `/clients/:id/vcard` | |
| `GET` `POST` | `/products` | `POST`/`PUT` en `multipart/form-data` |
| `PUT` `DELETE` | `/products/:id` | |
| `GET` `POST` | `/whatsapp/webhook` | público · firmado por Meta |

Cada cuenta solo ve y modifica sus propios clientes y productos.

---

## Notas de seguridad

- Las contraseñas se guardan como hash **bcrypt** (12 rondas). El login migra
  al vuelo cualquier contraseña antigua en texto plano.
- `JWT_SECRET` y el resto de secretos salen del entorno. Ninguno está en el
  código; el servidor falla al arrancar si falta alguno obligatorio.
- CORS es una lista blanca explícita: `localhost:3000` más lo que declares en
  `FRONTEND_URLS`.
- El webhook de WhatsApp valida la firma `X-Hub-Signature-256` contra
  `META_APP_SECRET`. **Configúrala**: sin ella el webhook acepta cualquier
  petición y un tercero puede llenar tu CRM y gastar tu crédito de OpenAI.
- Las subidas de imagen se limitan a JPG/PNG/WEBP/GIF y 5 MB, y el nombre del
  archivo lo genera el servidor.
- `/auth/login` y `/auth/register` están limitados por IP para frenar fuerza bruta.
