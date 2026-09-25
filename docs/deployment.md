# Recall Backend Deployment Plan

This is a practical plan for a single DigitalOcean VPS:

```text
Internet -> Caddy HTTPS reverse proxy -> Recall Node.js backend
                                              |-> persistent SQLite
                                              |-> OpenAI API
                                              `-> RevenueCat API
```

## Current versus planned

Implemented now:

- Node/TypeScript backend in `server/`
- `GET /health` and access/analysis routes
- production configuration checks
- SQLite schema and WAL mode
- backend type, schema, access-control, and formatting checks

Still planned:

- DigitalOcean VPS and DNS record
- public domain and HTTPS certificate
- Dockerfile, Compose file, Caddyfile, and production start/build script
- persistent-volume deployment and automated backup job
- service monitoring, alerting, and tested rollback

No container or Caddy configuration currently exists in this repository. The examples below are deployment specifications, not commands that can be run against the current checkout unchanged.

## 1. Pre-deployment verification

Run the commands that exist today:

```sh
npm ci
npx tsc --noEmit
npm run format:check

cd server
npm ci
npm run typecheck
npm run fixtures:check
npm run access:check
npm run format:check
```

Do not set `RUN_OPENAI_LIVE_TEST=true` unless a deliberate paid provider check is intended.

## 2. Prepare the VPS

Choose a supported Ubuntu LTS image and create a non-root deployment user. Patch the host, enable automatic security updates, install Docker Engine with its Compose plugin from Docker's official Ubuntu instructions, and keep SSH key authentication enabled.

Do not paste secrets into shell history. Store the production environment in a root/deployment-user-readable file outside the public repository, for example `/opt/recall/secrets/server.env`, with mode `600`.

## 3. Firewall

DigitalOcean Cloud Firewall and the host firewall should allow only:

- TCP 22 from trusted administrator addresses
- TCP 80 from the internet for HTTP-to-HTTPS redirect and certificate validation
- TCP 443 from the internet

Do not expose backend port `8787` publicly. Bind it to a private Compose network; only Caddy should publish host ports.

## 4. DNS and HTTPS

Before starting Caddy:

1. Choose the real backend hostname. No hostname is assumed in this repository.
2. Point its DNS `A`/`AAAA` record to the VPS.
3. Set `RECALL_PUBLIC_BASE_URL=https://YOUR_BACKEND_HOST`.
4. Configure Caddy to reverse proxy that hostname to the backend service on port `8787`.

Planned Caddy behavior:

```caddyfile
YOUR_BACKEND_HOST {
    encode zstd gzip
    reverse_proxy backend:8787
}
```

Caddy can obtain and renew a public certificate after DNS resolves and ports 80/443 are reachable. Replace the placeholder before deployment; do not commit a real credential.

## 5. Production environment

Start from [server/.env.example](../server/.env.example). At minimum, review every value and set:

```dotenv
NODE_ENV=production
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
OPENAI_REQUEST_TIMEOUT_MS=45000
OPENAI_REASONING_EFFORT=low
OPENAI_TEXT_VERBOSITY=low
OPENAI_ERROR_DETAILS=false
AI_ANALYSIS_ENABLED=false
RECALL_ACCESS_DB_PATH=/app/data/recall-access.sqlite
RECALL_TOKEN_PEPPER=
AI_INSTALLATION_DAILY_LIMIT=10
AI_GLOBAL_DAILY_LIMIT=40
AI_GLOBAL_CONCURRENCY_LIMIT=2
AI_ACCESS_TOKEN_TTL_DAYS=30
AI_INVITATION_TTL_DAYS=7
AI_REDEMPTION_WINDOW_MINUTES=15
AI_REDEMPTION_MAX_FAILURES=5
AI_MONTHLY_ESTIMATED_LIMIT_USD=1.50
AI_REQUEST_RESERVATION_USD=0.05
OPENAI_INPUT_PRICE_PER_MILLION_USD=0.25
OPENAI_CACHED_INPUT_PRICE_PER_MILLION_USD=0.025
OPENAI_OUTPUT_PRICE_PER_MILLION_USD=2.00
REVENUECAT_SECRET_API_KEY=
MOCK_ANALYSIS=false
PORT=8787
ALLOWED_ORIGIN=REVIEW_FOR_THE_FINAL_CLIENT
RECALL_PUBLIC_BASE_URL=https://YOUR_BACKEND_HOST
```

Keep `AI_ANALYSIS_ENABLED=false` through initial health/configuration checks. Enable it only after quotas, pricing estimates, OpenAI access, RevenueCat project matching, backups, and logs are verified.

The OpenAI and RevenueCat secret keys, token pepper, invitation codes, and installation tokens must remain on the backend. Only the public RevenueCat Android SDK key belongs in the Expo preview environment.

## 6. Planned Compose layout

The future Compose definition should contain:

- `backend`: built from a pinned Node 22 image, no public port, environment loaded from the server secret file, `/app/data` mounted from a named volume, restart policy, and a health check against `http://localhost:8787/health`
- `caddy`: ports `80:80` and `443:443`, read-only Caddyfile, persistent Caddy data/config volumes, and dependency on the backend health check
- named volumes for `recall_data`, `caddy_data`, and `caddy_config`

The backend currently runs TypeScript through `npm run dev` and has no production `build`/`start` script. Add and validate that runtime packaging before creating the production image. Do not represent `npm run dev` as the final production process.

The following is a blueprint for the future root `compose.yaml`, not an implemented repository file. Pin reviewed image digests before production and add the missing `server/Dockerfile` and `deploy/Caddyfile` first.

```yaml
services:
  backend:
    build:
      context: .
      dockerfile: server/Dockerfile
    env_file:
      - /opt/recall/secrets/server.env
    expose:
      - '8787'
    volumes:
      - recall_data:/app/data
    restart: unless-stopped
    healthcheck:
      test:
        [
          'CMD',
          'node',
          '-e',
          "fetch('http://127.0.0.1:8787/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))",
        ]
      interval: 30s
      timeout: 5s
      retries: 3

  caddy:
    image: caddy:2-alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./deploy/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped

volumes:
  recall_data:
  caddy_data:
  caddy_config:
```

After those files are implemented and reviewed, the expected operating commands are:

```sh
docker compose config
docker compose build backend
docker compose pull caddy
docker compose up -d
docker compose ps
docker compose logs --tail=200 backend caddy
```

`docker compose config` must succeed without printing unexpected values before the first start. Restrict access to any rendered output because Compose can interpolate secrets.

## 7. Persistent storage and backups

Mount the directory containing `recall-access.sqlite`, its `-wal`, and `-shm` files on persistent storage. The database contains invitation/token hashes, judge identifiers, quotas, spending estimates, and cached structured analyses.

Use SQLite's online backup mechanism rather than copying only the main file while the service is writing. A suitable container/host process should run `.backup` against the live database, write to a timestamped file outside the active volume, encrypt backup storage as appropriate, and copy it to a separate DigitalOcean Space or other off-host destination.

Define and test:

- backup frequency and retention: **[OWNER REVIEW REQUIRED]**
- off-host destination and access policy: **[OWNER REVIEW REQUIRED]**
- restoration procedure and recovery objective: **[OWNER REVIEW REQUIRED]**
- structured-analysis cache retention/purge policy: **[OWNER REVIEW REQUIRED]**

Test restoring a backup to a separate path before launch. Never overwrite the live database as a restore test.

## 8. Logs and health

The service logs startup, redacted OpenAI usage/error metadata, and machine-readable RevenueCat provisioning diagnostics. It should not log image data, raw OCR text, access tokens, invitation codes, or secret keys. Restrict log access and set host/container log rotation.

Use:

```sh
curl --fail --silent https://YOUR_BACKEND_HOST/health
```

Expected body:

```json
{ "ok": true }
```

A healthy endpoint proves the process and proxy respond; it does not prove OpenAI, RevenueCat, database backup, invitation redemption, or mobile connectivity.

## 9. Deployment verification

After the missing infrastructure files are implemented:

1. Start with AI disabled and verify container health, Caddy HTTPS, certificate chain, redirect, and that port 8787 is not public.
2. Confirm the SQLite file is on the persistent volume and a backup/restore drill succeeds.
3. Confirm production startup rejects mock mode and non-HTTPS `RECALL_PUBLIC_BASE_URL`.
4. Verify the RevenueCat backend secret and mobile public Android SDK key belong to the same project with entitlement ID `pro`.
5. Enable AI, restart the backend, and make one controlled real analysis from a development build.
6. Verify normal cache reuse and inspect `npm run access:admin -- usage` inside the backend runtime.
7. Configure the Expo preview environment with the verified public HTTPS URL, run `npm run release:config-check`, and only then build the standalone APK.
8. Complete the clean first-time judge flow in [release-qa.md](./release-qa.md).

## 10. Rollback

Before each release, retain the previous immutable backend image and take a verified SQLite backup. A rollback should:

1. Set `AI_ANALYSIS_ENABLED=false` if provider traffic must stop immediately.
2. Capture a fresh online database backup.
3. Redeploy the previous image without replacing the persistent volume.
4. Run the health check and a non-destructive access/status check.
5. Restore a database backup only when a schema/data rollback is demonstrably required and after preserving the current database.

The current migrations are forward-running and there is no automated down migration. Image rollback and database rollback are separate decisions.

When the Compose design uses immutable image tags, rollback the backend by restoring the previous image reference in the deployment environment and running `docker compose up -d backend`; do not delete or recreate `recall_data`. Then inspect `docker compose ps`, backend logs, and the public health endpoint.
