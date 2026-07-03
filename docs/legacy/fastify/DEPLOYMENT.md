# Backend deployment

> Legacy document: this deployment guide applies only to the retired Fastify + SQLite runtime.

## Requirements

- Node.js 24 or newer
- A writable directory for the SQLite database and backups
- A reverse proxy with HTTPS for public access

## Production start

Install dependencies and start the API with the backup scheduler:

```powershell
npm ci --omit=dev
npm start
```

The API listens on `127.0.0.1:8797` by default. Configure production values through
the environment variables documented in `.env.example`.

Set `RIZHI_API_TOKEN` to a long random secret before exposing the API outside the
local machine. Clients must then send `Authorization: Bearer <token>`. The health
endpoint remains public for deployment probes.

The Vue frontend is built separately with `npm run build`. Serve `dist/` through a
static web server and proxy `/api/v1/` to the Fastify API.

## Backups

`npm start` runs an immediate backup and then repeats it every 24 hours. The latest
14 scheduled backups are retained by default.

Manual backup:

```powershell
npm run db:backup
```

Restore after stopping the API:

```powershell
npm run db:restore -- .data/backups/rizhi-YYYY-MM-DD.sqlite
```

Restore validates the selected file and creates a pre-restore safety backup.

## Release check

1. Run `npm test`.
2. Run `npm run typecheck`.
3. Run `npm run build`.
4. Run `npm run db:backup`.
5. Start with `npm start` and verify `GET /api/v1/health`.
6. Verify `RIZHI_API_TOKEN` is configured.
7. Verify the reverse proxy uses HTTPS and does not expose the SQLite directory.
