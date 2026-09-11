# KrishiSetu — SIH problem statement 26132

A Maharashtra farmer market-linkage and farm-services evaluation application. Compare mandi observations, publish crops, negotiate with buyers, book services and raise grievances. FPO and government workspaces share a database-backed transaction engine.

This is a local evaluation build, **not a production payment or government-verification service**. Sample entities are demonstration identities, not endorsed partners. No certification or measured farmer-income improvement is implied.

## Run locally

- Frontend: http://localhost:3000/demo
- API health: http://localhost:4000/health
- Repository root: `npm run dev` starts frontend, backend and the scheduled worker.
- Stop existing servers before starting another copy on these ports.

Node.js 20+ and the configured PostgreSQL/Supabase database are required. Docker is optional; this workspace uses the configured database directly.

## Configuration

Backend loads `backend/.env`, then the repository `.env` without overriding existing values. Keep credentials out of git. Your root `.env` is supported; copying secrets is unnecessary.

Required: `DATABASE_URL`, `DIRECT_URL` for the Prisma datasource, and a strong `JWT_SECRET`. Optional: `PORT` (4000), `AGMARKNET_API_KEY`, `AGMARKNET_RESOURCE_ID`. Frontend: `NEXT_PUBLIC_BACKEND_URL` in `frontend/.env.local` (default http://localhost:4000).

For Supabase shared-pooler URLs, runtime normalizes port 5432 to transaction-pooler port 6543 with `pgbouncer=true` and defaults to three connections per process. `DIRECT_URL` and your `.env` remain unchanged. This avoids the observed 15-client session-pool exhaustion; set `SUPABASE_SESSION_MODE=true` only if session pooling is intentionally required. See [Supabase connection documentation](https://supabase.com/docs/guides/database/connecting-to-postgres).

Demo sign-in is restricted to designated seeded identities and disabled with `NODE_ENV=production`, unless `DEMO_MODE=true`. Never enable it on a deployment containing real users or transactions. Development phone login requires requesting a code first, then entering `123456`; no SMS is sent. Production phone login is explicitly unavailable until an SMS provider is integrated.

## Install and verify

```sh
npm run setup
npm run dev
```

With both servers running, use another terminal:

```sh
npm run test:api
npm run test:ui
```

Install browser binaries once if needed: `cd frontend`, then `npx playwright install chromium`.

Build with `npm run build`. On Windows, stop the backend and worker before Prisma generation if its engine DLL is locked. Next development and production builds use separate `.next-dev` and `.next` directories.

**Database safety:** the old `backend/src/scripts/seed-platform-data.ts` deletes existing data. Do not run it against your current/shared database. The additive `npm --prefix backend run seed:opportunities` ensures the missing platform demo identity/FPO link and four tagged sample crop opportunities without resetting existing transactions. Initial schema provisioning is a separate operation for an explicitly empty database.

## Portals

| Workspace | Route | Main flows |
| --- | --- | --- |
| Farmer | `/farmer/home` | Four primary actions: sell, prices, services, offers/payments |
| Buyer | `/buyer` | Demand, produce sourcing, negotiation and simulated escrow |
| FPO | `/fpo` | Member lots, compatible harvest pooling and bulk trade |
| Five provider roles | `/provider` | Storage, transport, equipment, labor and inputs |
| District administration | `/district-admin` | District-scoped verification and grievance decisions |
| State administration | `/state-admin` | District-price grid, escalations and integration history |
| Platform administration | `/platform-admin` | Statewide operational review and transactions |

The hub exposes 11 role types and two buyer examples. Actions use JWT-authenticated `/api/workspace` routes; switching a profile changes the actual acting identity. Legacy mutation routes that trusted caller-supplied party IDs are retired.

## Transaction flow

1. Publish validated listings or requirements.
2. Match demand and send offers; negotiate through seller counter-offers.
3. Acceptance creates one booking, locks the listing and rejects competing offers transactionally.
4. Buyer simulates escrow funding; seller starts/completes fulfillment; buyer confirms release.
5. Save shared logistics instructions, print an agreement, rate fulfillment or raise a dispute.
6. District/state decisions retain audit history, escalation scope and dispute credibility penalties.

Resource types: crop lots, cold storage, transport, equipment services, labor, used equipment, input group buying and contract farming. Provider publication requires approved, unexpired role verification. FPO pooling validates membership, crop/grade compatibility and double pooling in a serializable transaction.

## Prices, offline behavior and jobs

Prices retain source and observation date. Charts use observed history, not invented forecasts. Net-value estimates use entered quantity, transport and commission. Existing database samples are not proof of a successful live sync.

The prices API now fetches upstream on access with a five-minute freshness window, manual refresh/cooldown and explicit live/cached/stale states. The worker attempts Agmarknet sync every 15 minutes, aggregation hourly and SLA escalation every 15 minutes. Only verified-ingestion rows enter new price aggregates; demo seed prices are excluded. See [MARKET_DATA.md](MARKET_DATA.md) for coverage limits, tests and the current upstream outage.

A service worker serves an offline page with observations previously saved on this device. Authenticated workspace responses and transaction mutations are not cached or queued. Farmer home supports English/Hindi/Marathi; extended workspace copy needs full localization before a multilingual field rollout.

## Release boundaries

See [DELIVERY.md](DELIVERY.md) for evidence, walkthrough and remaining deployment work. [PRD](PRD.md), [TechSpec](TechSpec.md), [AppFlow](AppFlow.md), [Design](Design.md), [Schema](Schema.md) and [ImplementationPlan](ImplementationPlan.md) describe the broader intended product, not proof that every roadmap item has shipped.

Live payments, SMS/WhatsApp delivery, government certificate checks, media/document upload, advanced forecasting, geographic choropleth and production operations require further integration. The legacy FasalRakshak page remains outside the core PS 26132 marketplace flow.
ver
