# Frontend ↔ backend connectivity

Browser requests now use `/api/backend` on the frontend's own origin. Next.js rewrites them to the configured Express backend, forwarding paths, query strings, methods and authorization headers. No second browser-facing tunnel or browser localhost URL is required.

## Vercel frontend + Render backend

Render root directory: `backend`; build: `npm ci --include=dev && npm run build`; start: `npm start`. The build emits JavaScript to `dist`, so the production server does not run a TypeScript development watcher. The optional root `render.yaml` describes a new free web service; it does not change existing dashboard settings or provision a paid worker. An always-running worker can use `npm run start:worker` on existing worker infrastructure after the same build; free web-service sleep means no guaranteed scheduled execution. Preserve your existing strong JWT secret when updating a service, rather than rotating it accidentally.

Before deploying the upgraded API against an existing database, run `npm --prefix backend run db:check` and `npm --prefix backend run db:upgrade` with backend credentials in the server environment. This applies the checked-in additive decision-record schema without reseeding/deleting data. Stop API/worker during Prisma generation on Windows if its DLL is locked, generate the client, then restart both. See Schema.md for migration-history reconciliation; do not use a database reset. A brand-new empty database needs separate initial schema provisioning.

1. Push the connectivity changes and deploy the frontend from root `frontend`.
2. In Vercel Environment Variables, set **BACKEND_URL** to your Render origin, e.g. `https://sih-1-h70e.onrender.com`, for Production and any Preview environment you use.
3. Remove obsolete NEXT_PUBLIC_API_URL / NEXT_PUBLIC_BACKEND_URL values to avoid confusion. They remain compatibility fallbacks, in that order of priority: BACKEND_URL → NEXT_PUBLIC_BACKEND_URL → NEXT_PUBLIC_API_URL.
4. Redeploy after changing the URL: rewrites are generated at build time. Changing an env value without redeploying does not update an existing deployment.
5. Open `https://YOUR-FRONTEND/api/backend/health`. Expected JSON: `status: ok`, `service: KrishiSetu API`. This tests the actual browser-facing path.

No database/JWT/API-key secrets belong in frontend settings. BACKEND_URL is a service address, not a credential. Backend credentials remain on Render. Vercel builds fail with an actionable message if the backend is unset, HTTP-only or localhost; local production builds remain supported.

Private verification uploads require `SUPABASE_URL` and `SUPABASE_SECRET_KEY` on the backend only. The first upload creates the private `verification-documents` bucket if absent; a pre-existing public bucket is rejected, not silently reconfigured. Only PNG/JPEG/PDF up to 2 MB are accepted. Keep storage RLS free of policies granting anonymous/general authenticated users access to this bucket: the Express API enforces account and reviewer jurisdiction. Never place the secret key in a NEXT_PUBLIC variable. `npm --prefix backend run test:documents` exercises scoped uploads/downloads against a running API and removes only its own temporary accounts/file. Failed database commits after a storage write can leave an inaccessible orphan object; retention/cleanup and malware scanning remain operational work before real sensitive-document onboarding.

GitHub deployment check on the pushed release reported: `Git author The-arcane must have access to the project on Vercel to create deployments.` The Vercel project owner must grant that account access or initiate an authorized deployment. Changing application code cannot resolve team permissions; do not spoof commit authors. The previously supplied immutable preview URL also requires Vercel SSO, so use an owner-approved public production URL when sharing.

## Port 3000 tunnel

Run the frontend on 3000 and API on 4000. Without a frontend backend-URL override, Next proxies to `http://127.0.0.1:4000` from the local machine. Tunnel **only port 3000** and open `https://YOUR-TUNNEL/api/backend/health`. The remote browser never calls its own localhost:4000. If frontend env already points to Render, the tunnel uses Render instead; use BACKEND_URL=http://127.0.0.1:4000 in frontend/.env.local for a local API, then restart Next.

## Diagnosing failures

- Direct Render `/health` fails: check service startup, environment and Render logs. The proxy cannot repair a crashed backend.
- Direct Render health works but frontend proxy fails: check Vercel BACKEND_URL, redeploy, and verify the configured backend is not the frontend itself.
- Health works but workspace returns 401/403: connectivity is working; investigate sign-in/authorization. Production demo access requires DEMO_MODE=true on a demo-only database; never enable it for real user data.
- 502/503/504 or slow first load: inspect platform logs/timeouts. Render free services may sleep and take roughly a minute to restart. The banner now waits up to 70 seconds, avoids overlapping checks and validates the API JSON rather than any HTTP 200. Hosting proxy limits can still end a request earlier; retry after startup.
- A timed-out transaction is not proof it failed. Refresh its status before submitting again; do not automatically retry mutations.

The previous banner aborted at three seconds and instructed every deployed user to start a local server. The new banner distinguishes connecting, invalid health responses and unavailable backend, with an actual diagnostic link.

References: [Next external rewrites](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites), [Render free-service startup](https://render.com/docs/free).
