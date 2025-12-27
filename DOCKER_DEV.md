# Development Setup with Docker Compose

Este `compose.yml` construye la aplicación **desde el código fuente local**, permitiéndote probar cambios antes de hacer push a `main`.

## Diferencias vs `example/docker-compose.yml`

| Aspecto | Development (`compose.yml`) | Production Example (`example/`) |
|---------|----------------------------|--------------------------------|
| **Imagen** | `build: .` (construida localmente) | `image: ghcr.io/mik3dev/mailer:latest` |
| **Propósito** | Testing local antes de push | Demo de deployment en producción |
| **Healthchecks** | ✅ (espera a que DB/Redis estén listos) | ❌ |
| **Rebuild requerido** | Sí, cuando cambias código | No, pull desde registry |

---

## Guía de Uso

### 1️⃣ Primera Vez: Build & Start

```bash
docker compose up --build -d
```

Esto:
- Construye la imagen desde `Dockerfile`
- Levanta PostgreSQL, Redis, MailHog
- Levanta API, Worker y gRPC
- Espera a que DB y Redis estén "healthy" antes de arrancar los servicios

### 2️⃣ Ejecutar Migraciones

```bash
docker compose run --rm api bun run db:migrate:prod
```

### 3️⃣ Verificar Servicios

- **API Health**: http://localhost:3000/health
- **MailHog Web UI**: http://localhost:8025  
- **gRPC**: `localhost:50051`
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`

### 4️⃣ Probar Envío de Email

```bash
curl --location 'http://localhost:3000/v1/send' \
--header 'Content-Type: application/json' \
--header 'X-Api-Key: e05a2411' \
--header 'X-Api-Secret: 73aaaa76d96fb7bbb5b8fac9e67f725f9e8c235f6dabbdcac91e1165d288d509' \
--data-raw '{
    "to": "test@example.com",
    "template": "welcome",
    "props": {
      "name": "Local Dev",
      "url": "http://example.com"
    },
    "subject": "Test from Local Docker Compose"
}'
```

Debería responder:
```json
{
  "status": "accepted",
  "message_id": "..."
}
```

Luego verifica en http://localhost:8025 que el email llegó.

### 5️⃣ Ver Logs

```bash
# Todos los servicios (follow mode)
docker compose logs -f

# Solo Worker
docker compose logs -f worker

# Solo API
docker compose logs -f api

# Últimas 100 líneas del worker
docker compose logs --tail 100 worker
```

Con las mejoras de logging recientes, deberías ver logs **limpios** con `trace_id` en cada entrada, sin ruido de OpenTelemetry.

### 6️⃣ Rebuild Después de Cambios en Código

Si modificas archivos en `src/`:

```bash
# Rebuild y reinicia todo
docker compose up --build -d

# O rebuild solo un servicio específico
docker compose up --build -d worker
```

**Nota**: Los volúmenes persisten (`postgres_data`, `redis_data`), por lo que tus datos de DB no se pierden al rebuild.

### 7️⃣ Detener Servicios

```bash
# Detener pero mantener volúmenes (datos persisten)
docker compose down

# Detener Y eliminar TODOS los datos (fresh start)
docker compose down -v
```

---

## Arquitectura

```
┌──────────────┐
│  API :3000   │──┐
└──────────────┘  │
                  ├──▶ ┌────────────┐
┌──────────────┐  │    │ PostgreSQL │
│ Worker       │──┤    │   :5432    │
└──────────────┘  │    └────────────┘
                  │
┌──────────────┐  │    ┌────────────┐
│ gRPC :50051  │──┘    │   Redis    │
└──────────────┘       │   :6379    │
                       └────────────┘
       │
       ├──▶ MailHog :1025 (SMTP)
       └──▶ MailHog :8025 (Web UI)
```

---

## Tips

### ⚡ Desarrollo Aún Más Rápido

Si solo estás trabajando en el Worker y quieres hot-reload instantáneo:

```bash
# Detén el worker en Docker
docker compose stop worker

# Ejecútalo localmente con watch mode
SERVICE_ROLE=WORKER bun run --watch src/index.ts
```

Ahora cada cambio en el código se refleja automáticamente (Bun recarga).

### 🔍 Debugging

Usa `docker compose exec` para entrar a un contenedor:

```bash
# Shell en el contenedor API
docker compose exec api sh

# Ver variables de entorno
docker compose exec api printenv | grep -E "REDIS|SMTP|DATABASE"

# Probar conexión a Redis desde dentro del worker
docker compose exec worker bun -e "import {redis} from './src/lib/db/redis.ts'; await redis.ping(); console.log('PONG')"
```

### 📦 Cache de Build

Docker cachea las layers del build. Para forzar un rebuild desde cero (útil si algo está raro):

```bash
docker compose build --no-cache
docker compose up -d
```

---

## Troubleshooting

### Problema: "Address already in use" en puerto 3000/5432/6379

**Causa**: Tienes PostgreSQL/Redis/API corriendo localmente.

**Solución**:
```bash
# Opción 1: Detén tus servicios locales
brew services stop postgresql
brew services stop redis

# Opción 2: Cambia los puertos en compose.yml
# Por ejemplo: "3001:3000" para API
```

### Problema: Worker no procesa trabajos

**Debugging**:
1. Verifica logs: `docker compose logs worker`
2. Verifica conexión Redis: `docker exec <worker-container> bun -e "import {redis} from './src/lib/db/redis.ts'; await redis.ping()"`
3. Revisa que Redis tenga el job: `docker exec mailer-bun-redis-1 redis-cli KEYS "*"`

### Problema: Templates no encontrados

**Causa**: El volumen de templates no está montado correctamente.

**Verificación**:
```bash
# Debe mostrar welcome.tsx y test_email.tsx
docker compose exec worker ls -la /templates/emails/
```

---

## Comparación con `bun run dev`

| Método | Cuándo Usarlo |
|--------|---------------|
| `bun run dev` (local) | Desarrollo rápido de una sola pieza (ej. solo API) |
| `docker compose` (este) | Testing de microservicios completos, validación pre-push |
| `example/` (prod images) | Demo de cómo se deployaría en producción real |

---

¿Todo funcionando? ¡Perfecto! Ahora puedes iterar rápidamente y cuando estés seguro, haz push para que CI/CD construya la imagen oficial.
