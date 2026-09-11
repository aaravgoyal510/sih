# KrishiSetu — Farmer Net-Realization & Assured Market Decision Platform

For PS 26132, KrishiSetu asks: “Where, when, and how should I sell my crop to maximize what actually reaches my pocket?” The target product compares expected net proceeds after quantity/quality, transport, storage, timing and buyer reliability, then supports execution through offers, logistics and accountable transactions.

The evaluation build includes guided crop capture, EN/HI/MR farmer assistance, browser voice input/read-aloud with typing fallback, saved costed buyer recommendations and visible evidence-based buyer trust. The backend validates ownership, crop/grade, quantity, costs and suspended counterparties; an optional local baseline never produces an invented improvement delta. Immutable recommendations, current trust snapshots, notifications with account-level read status and booking events now have real database models. Farmers can revisit saved decisions at `/farmer/decisions`. See [PRD.md](PRD.md) and the separately labelled synthetic `/preview/decision` fixture. “Assured” does not mean guaranteed returns or payments. Advertising endpoints are disabled; legacy code/data are retained.

This is a local evaluation build, **not a production payment or government-verification service**. Sample entities are demonstration identities, not endorsed partners. No certification or measured farmer-income improvement is implied.

## Run locally

- Frontend: http://localhost:3000/demo
- API health: http://localhost:4000/health
- Repository root: `npm run dev` starts frontend, backend and the scheduled worker.
- Stop existing servers before starting another copy on these ports.

Node.js 20+ and the configured PostgreSQL/Supabase database are required. Docker is optional; this workspace uses the configured database directly.

## Configuration

Backend loads `backend/.env`, then the repository `.env` without overriding existing values. Keep credentials out of git. Your root `.env` is supported; copying secrets is unnecessary.

Required: `DATABASE_URL`, `DIRECT_URL` for the Prisma datasource, and a strong `JWT_SECRET`. Optional: `PORT` (4000), `AGMARKNET_API_KEY`, `AGMARKNET_RESOURCE_ID`. Frontend server: `BACKEND_URL` in `frontend/.env.local` or Vercel environment settings. Local default is http://127.0.0.1:4000; Vercel requires the Render HTTPS origin and a redeploy. Browser requests use the same-origin `/api/backend` proxy, so tunneling port 3000 does not require exposing port 4000. Legacy public URL variables remain fallback inputs. See [DEPLOYMENT.md](DEPLOYMENT.md) for connection troubleshooting.

For Supabase shared-pooler URLs, runtime normalizes port 5432 to transaction-pooler port 6543 and uses the version-matched Prisma PostgreSQL driver adapter with three connections per process. This reduces the extra query round-trips observed on the configured Sydney-region database. `DIRECT_URL` and your `.env` remain unchanged. `PRISMA_RUST_DRIVER=true` retains the previous runtime driver as a compatibility escape hatch; set `SUPABASE_SESSION_MODE=true` only if session pooling is intentionally required. See [Supabase connections](https://supabase.com/docs/guides/database/connecting-to-postgres) and [Prisma driver adapters](https://www.prisma.io/docs/orm/v6/overview/databases/database-drivers).

Demo sign-in is restricted to designated seeded identities and disabled with `NODE_ENV=production`, unless `DEMO_MODE=true`. Never enable it on a deployment containing real users or transactions. `/login` supports new farmer/buyer/provider accounts with a 12–128-character password hashed using salted scrypt. Self-registration cannot grant administrative roles. Mobile numbers are identifiers, not verified phone ownership. SMS/recovery delivery still needs a real provider. Development OTP requires explicit `ENABLE_DEV_OTP=true`, is always disabled in production, and cannot access password-protected accounts. A strong, non-default `JWT_SECRET` is enforced in production.

## Install and verify

```sh
npm run setup
npm --prefix backend run db:check
# Existing databases: apply the reviewed, additive product upgrade before starting new code.
npm --prefix backend run db:upgrade
npm run dev
```

With both servers running, use another terminal:

```sh
npm run test:api
npm run test:ui
# With backend-only Supabase Storage credentials configured:
npm --prefix backend run test:documents
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
3. Acceptance creates one booking, locks the sold quantity and rejects competing offers transactionally. A partial normal crop sale preserves the unsold quantity as a linked open lot; pooled lots require a full-quantity buyer until member-level partial allocation is supported.
4. Buyer simulates escrow funding; seller starts/completes fulfillment; buyer confirms release.
5. Save shared logistics instructions, print the immutable accepted agreement and inspect its event history, rate fulfillment or raise a dispute. Either participant may cancel an unfunded, unstarted booking with a recorded reason; the lot reopens without losing quantity.
6. District/state decisions retain audit history, escalation scope and dispute credibility penalties.

Resource types: crop lots, cold storage, transport, equipment services, labor, used equipment, input group buying and contract farming. Provider publication requires approved, unexpired role verification. FPO pooling validates membership, crop/grade compatibility and double pooling in a serializable transaction.

## Prices, offline behavior and jobs

Prices retain source and observation date. Charts use observed history, not invented forecasts. Net-value estimates use entered quantity, per-market transport, commission and other sale costs. Saved observations render before a fresh feed request completes. Existing database samples are not proof of a successful live sync.

The prices API now fetches upstream on access with a five-minute freshness window, manual refresh/cooldown and explicit live/cached/stale states. The worker attempts Agmarknet sync every 15 minutes, aggregation hourly and SLA escalation every 15 minutes. Only verified-ingestion rows enter new price aggregates; demo seed prices are excluded. See [MARKET_DATA.md](MARKET_DATA.md) for coverage limits, tests and the current upstream outage.

A service worker serves an offline page with observations and the current account's crop draft previously saved on this device. Authenticated workspace responses and transaction mutations are not cached or queued. Guided selling, buyer comparisons, offers, services and price calculations provide English/Hindi/Marathi assistance; extended administrative/provider copy still needs localization before a multilingual field rollout.

## Release boundaries

See [DELIVERY.md](DELIVERY.md) for evidence, walkthrough and remaining deployment work. [PRD](PRD.md), [TechSpec](TechSpec.md), [AppFlow](AppFlow.md), [Design](Design.md), [Schema](Schema.md) and [ImplementationPlan](ImplementationPlan.md) describe the broader intended product, not proof that every roadmap item has shipped.

Live payments, SMS/WhatsApp delivery and account recovery, government certificate checks, general listing media, validated forecasting and production operations require further integration. Verification now supports real private PNG/JPEG/PDF uploads (2 MB maximum), owner/scoped-reviewer downloads, duplicate-request protection and review audit records using server-only Supabase Storage credentials. File signatures are checked; malware scanning is not integrated, so downloads are forced attachments and files must not be treated as trusted merely because they passed format validation. Legacy FasalRakshak diagnosis is disabled because it presented unsupported confidence/treatment output and unscoped data access; its code and records are retained. In-app notifications persist new offer, booking, logistics and review events with server-side read state; historical events are not backfilled and external push delivery is not integrated. Admin/provider workspaces and parts of verification/dispute handling still contain English copy. Recorded simulated releases never count as verified on-time payments or realized farmer income.
