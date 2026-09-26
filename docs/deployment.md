# Recall Backend Deployment on InterServer

Recall runs as two Compose services on the confirmed InterServer Ubuntu VPS:

```text
Internet -> Caddy :80/:443 -> backend :8787 (Compose network only)
                                |-> recall_data (SQLite + WAL/SHM)
                                |-> /opt/recall/backups
                                |-> OpenAI and RevenueCat APIs
```

The backend image uses Node.js 22.23.3, runs as the unprivileged `node` user, and starts compiled JavaScript with Node. Caddy obtains and renews the public certificate for `recall-api.duckdns.org`; no DuckDNS token or Docker socket is used.

The public HTTPS health endpoint returned `{"ok":true}` on September 26, 2026. This confirms endpoint availability, not the standalone APK or complete judge flow; those remain tracked in [release-qa.md](./release-qa.md).

Backup schedules, off-server replication, and restore drills below are operator procedures, not claims that each is already configured or verified. Record evidence before treating them as operational guarantees. Mobile CI and Maestro results are maintained in Release QA; this document remains the backend operations runbook.

## 1. Prepare the VPS

Log in as the non-root deployment user. Docker and the Compose plugin are already installed.

```sh
sudo install -d -m 755 -o "$USER" -g "$USER" /opt/recall/app
sudo install -d -m 700 -o "$USER" -g "$USER" /opt/recall/secrets
sudo install -d -m 700 -o 1000 -g 1000 /opt/recall/backups
git clone https://github.com/Ajayfrizzy/recall-app.git /opt/recall/app
cd /opt/recall/app
```

The backend image's `node` account is UID/GID `1000`; that ownership lets it write online backups to the host directory. Confirm DNS still resolves to this VPS and that UFW permits inbound TCP `80` and `443` (and UDP `443` for HTTP/3), but not `8787`.

## 2. Create the production environment

Create the file outside the Git checkout, protect it before editing, and use `server/.env.example` as the source of truth:

```sh
install -m 600 server/.env.example /opt/recall/secrets/server.env
editor /opt/recall/secrets/server.env
```

Set these production values while preserving all quota, timeout, concurrency, and price controls from the example:

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
RECALL_TOKEN_PEPPER=GENERATE_AND_STORE_A_LONG_RANDOM_SECRET
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
REVENUECAT_SECRET_API_KEY=YOUR_BACKEND_SECRET_KEY
MOCK_ANALYSIS=false
PORT=8787
ALLOWED_ORIGIN=https://recall-api.duckdns.org
RECALL_PUBLIC_BASE_URL=https://recall-api.duckdns.org
```

Generate `RECALL_TOKEN_PEPPER` with a password manager or `openssl rand -base64 48`, then enter it directly in the protected file. Do not paste `OPENAI_API_KEY`, `REVENUECAT_SECRET_API_KEY`, or the pepper into Compose, Git, tickets, or logs.

`ALLOWED_ORIGIN` controls browser access only. Native Android requests normally send no browser `Origin` header and are not authenticated by CORS; bearer access tokens remain the request protection. Add a separate trusted web origin in code if a browser client is deployed later rather than using `*` in production.

Keep `AI_ANALYSIS_ENABLED=false` through initial verification. The production process rejects `MOCK_ANALYSIS=true`, a missing RevenueCat secret or token pepper, or a non-HTTPS public URL. It opens SQLite before listening, so container health also depends on a usable persistent data volume.

## 3. Build and start

Validate Compose without rendering secrets, build the backend, fetch Caddy, and start both services:

```sh
cd /opt/recall/app
docker compose config --quiet
docker compose build backend
docker compose pull caddy
docker compose up -d
docker compose ps
```

The first Caddy certificate request requires working DNS and reachable ports 80/443. Check readiness and logs:

```sh
docker compose ps
docker compose logs --tail=200 backend caddy
curl --fail --silent https://recall-api.duckdns.org/health
curl --head http://recall-api.duckdns.org/health
docker compose port backend 8787
sudo ss -ltnp
```

The HTTPS body is `{"ok":true}`. The HTTP request redirects to HTTPS. `docker compose port backend 8787` prints nothing, and `ss` must show no host listener on `8787`.

## 4. Persistent SQLite and backups

`recall_data` mounts at `/app/data`, so the database, WAL, and shared-memory files survive image and container replacement. Confirm the mount and database:

```sh
docker compose exec backend test -f /app/data/recall-access.sqlite
docker volume inspect recall_recall_data
docker compose exec backend npm run access:admin -- usage
docker compose up -d --force-recreate backend
docker compose exec backend npm run access:admin -- usage
```

The backup command uses SQLite's online backup API, so it captures a consistent database while WAL writes continue. It writes a mode-`600`, timestamped file under `/opt/recall/backups` and verifies `PRAGMA integrity_check`:

```sh
docker compose exec backend npm run db:backup
sudo ls -l /opt/recall/backups
```

Test a specific backup by restoring it to an isolated path. Never use the live `/app/data/recall-access.sqlite` as the restore destination:

```sh
sudo install -d -m 700 -o 1000 -g 1000 /opt/recall/backups/restore-tests
docker compose exec backend npm run db:restore-test -- /app/backups/recall-access-TIMESTAMP.sqlite /app/backups/restore-tests/restore-check.sqlite
docker compose exec -e RECALL_ACCESS_DB_PATH=/app/backups/restore-tests/restore-check.sqlite backend npm run access:admin -- usage
```

Run the online backup daily with the deployment user's cron or a systemd timer:

```cron
15 2 * * * cd /opt/recall/app && /usr/bin/docker compose exec -T backend npm run db:backup >> /opt/recall/backup.log 2>&1
```

Keep at least seven daily and four weekly verified backups, based on available disk. For affordable off-server storage, install `restic` and use a separately controlled SFTP host (or substitute a low-cost object-storage repository):

```sh
sudo apt-get update
sudo apt-get install -y restic
install -m 600 /dev/null /opt/recall/secrets/restic-password
editor /opt/recall/secrets/restic-password
export RESTIC_REPOSITORY='sftp:BACKUP_USER@BACKUP_HOST:/srv/restic/recall'
export RESTIC_PASSWORD_FILE=/opt/recall/secrets/restic-password
restic init
restic backup /opt/recall/backups
restic forget --keep-daily 7 --keep-weekly 4 --prune
restic check
restic restore latest --target /opt/recall/offsite-restore-test
```

Use a dedicated SSH key and restricted backup account, then schedule `restic backup` only after the online SQLite backup succeeds. Inspect the isolated restore and remove it after the drill. This deployment does not create or subscribe to any paid backup service.

## 5. Invitation and usage administration

All commands execute compiled code in the running backend, use `/opt/recall/secrets/server.env`, and access the persistent production database. Invitation codes are credentials; capture new codes in the approved secure channel and do not place them in Git or logs.

```sh
# Create one standard invitation (optional count: 1-100)
docker compose exec backend npm run access:admin -- create-invitations 1

# Create one judge invitation (optional count: 1-100)
docker compose exec backend npm run access:admin -- create-judge-invitations 1

# List invitation IDs, types, dates, and status (codes are not stored in plaintext)
docker compose exec backend npm run access:admin -- list-invitations

# Revoke an unused invitation by ID
docker compose exec backend npm run access:admin -- revoke-invitation INVITATION_ID

# Review AI daily/concurrent/monthly estimated usage
docker compose exec backend npm run access:admin -- usage
```

Optional token operations remain available as `list-tokens` and `revoke-token TOKEN_ID`. Startup never creates invitations.

## 6. Enable AI after verification

Before enabling AI, verify the OpenAI key, model prices, spending limits, and that the RevenueCat secret belongs to the same project as the mobile public SDK key with entitlement `pro`. Edit the protected file and recreate the backend:

```sh
editor /opt/recall/secrets/server.env
docker compose up -d --force-recreate backend
docker compose ps
docker compose logs --tail=100 backend
curl --fail --silent https://recall-api.duckdns.org/health
```

Changing an `env_file` value requires container recreation. `docker compose restart backend` does **not** reload changed environment variables. Do not enable `RUN_OPENAI_LIVE_TEST` or make a paid analysis request unless deliberately authorized.

## 7. Update and rollback

Take and verify a backup first. Retain the current image under a timestamped rollback tag, update only by fast-forward, rebuild, and recreate:

```sh
cd /opt/recall/app
docker compose exec backend npm run db:backup
docker image tag recall-backend:local recall-backend:rollback-YYYYMMDDHHMM
git pull --ff-only
docker compose config --quiet
docker compose build backend
docker compose up -d --force-recreate
docker compose ps
curl --fail --silent https://recall-api.duckdns.org/health
```

To roll the backend image back without changing the persistent database:

```sh
docker image tag recall-backend:rollback-YYYYMMDDHHMM recall-backend:local
docker compose up -d --no-build --force-recreate backend
docker compose ps
docker compose logs --tail=100 backend
curl --fail --silent https://recall-api.duckdns.org/health
```

Image rollback and database rollback are separate decisions because migrations run forward and no down migration exists. Restore a database only after preserving the current live database and validating the selected backup in an isolated path.

## 8. Local release verification

These checks do not use production credentials or make paid OpenAI calls:

```sh
cd server
npm ci
npm run typecheck
npm run fixtures:check
npm run access:check
npm run format:check
npm run build

cd ..
RECALL_ENV_FILE=server/.env RECALL_BACKUP_DIR="$PWD/server/backups" docker compose config --quiet
RECALL_ENV_FILE=server/.env RECALL_BACKUP_DIR="$PWD/server/backups" docker compose build backend
git diff --check
```

For a full local container test, use non-production test values in an ignored environment file, keep `AI_ANALYSIS_ENABLED=false`, and map Caddy to alternate host ports or stop other services already using 80/443. Do not use production keys for automated checks.
