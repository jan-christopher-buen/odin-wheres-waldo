# Deployment configuration

Review and push the repository before releasing. This guide covers the Neon database, Render API, and Vercel frontend configuration.

## Production URLs

- Frontend: https://midnight-market-eight.vercel.app
- API: https://midnight-market-api.onrender.com
- API health: https://midnight-market-api.onrender.com/api/health
- API CORS allowlist: `https://midnight-market-eight.vercel.app` exactly.
- Frontend production `VITE_API_URL`: `https://midnight-market-api.onrender.com`.
- Plans: Neon Free, Render Free (Singapore), Vercel Hobby.

Both hosting projects are connected to the existing GitHub repository's `main` branch. Normal pushes trigger deployment. Use the canonical frontend URL above; alternate deployment and preview URLs are not in the API CORS allowlist.

Use Node 24 on both build hosts. Keep the repository root as the working directory so npm workspaces and the root lockfile remain available.

## PostgreSQL (Neon)

Create a dedicated production database. Use `sslmode=verify-full` for certificate-verified TLS. Supply its PostgreSQL URL as `DATABASE_URL` to Render. Use the pooled URL for application traffic; set `DIRECT_DATABASE_URL` to its direct URL for migration operations. Do not disable TLS certificate verification.

The Prisma CLI reads `DIRECT_DATABASE_URL` (falling back to `DATABASE_URL`) through `apps/api/prisma.config.ts`; the API uses `@prisma/adapter-pg` with the same environment variable. No local socket URL belongs in hosted configuration.

## Express API (Render)

Create a Node web service with repository root directory left empty.

- Compute plan: **Free**.
- Build: `npm ci --include=dev && npm run db:generate && npm run db:migrate && npm run db:seed`
- Pre-deploy: leave empty; Render only supports this command on paid services.
- The build applies committed migrations through the direct connection, then upserts only the scene and its four targets. It does not import local data or erase rounds and scores. Future migrations must remain compatible with the running release while the new build is prepared.
- Start: `npm start`
- Health endpoint: `/api/health` (process health; does not check database). Render currently uses its default TCP readiness check.
- Environment: `NODE_ENV=production`, `NODE_VERSION=24.22.0`, `DATABASE_URL`, `DIRECT_DATABASE_URL`, `TRUST_PROXY=1`, and `CORS_ORIGINS`.
- Render supplies `PORT`; the Express listener binds to all interfaces.

Set `CORS_ORIGINS` to the **exact** Vercel production origin, for example the actual `https://your-project.vercel.app`, without a trailing slash. Multiple deliberately approved origins may be comma-separated. Do not use `*` or accept arbitrary preview origins. Trust exactly one proxy only when the service is behind Render's ingress. Protect database URLs in the host's secret environment settings.

`db:seed` loads `.env` locally; Node's `--env-file-if-exists` permits the same command on a host where environment variables are injected and no file exists.

## React frontend (Vercel)

Import the repository, keeping root directory at the repository root.

- Framework preset: Vite.
- Install: `npm ci`.
- Build: `npm run build`.
- Output: `apps/web/dist`.
- Build environment: `VITE_API_URL` = the actual Render API HTTPS origin, without a trailing slash (no `/api` suffix).

This is one page and needs no SPA rewrite configuration. The illustration and portraits are static assets in the web public directory. `VITE_API_URL` is public build configuration; do not put secrets in any `VITE_` variable. Rebuild after changing it.

## Release checks

After both actual origins exist, set the frontend API URL and exact API CORS allowlist, then verify round creation, all guesses, completion, score submission, refresh recovery, and replay over HTTPS. Bearer headers trigger a CORS preflight; Express handles OPTIONS. Fetch does not need `credentials: include`; there are no cross-site credential cookies to configure. Never include Authorization headers in application or proxy logs.

The free API sleeps after inactivity and can need about a minute to wake. Requests allow up to 90 seconds. A temporary restore failure retains the anonymous credential and offers Retry round; only invalid or expired credentials are discarded.

The in-memory rate limiter is suitable for one API instance. A shared limiter and retention policy should precede scaling. Database backups and monitoring should be configured on the chosen hosts before relying on public scores.

Platform references: [Render web services](https://render.com/docs/web-services), [Vercel build settings](https://vercel.com/docs/builds), and [Neon Prisma guide](https://neon.com/docs/guides/prisma).
