# PS 26132 — local delivery and evaluation guide

## What changed

The repository contained disconnected demo pages, local-only offer actions, missing role surfaces and backend configuration/order issues. The current delivery replaces the main marketplace portals with one authenticated, database-backed workspace and a responsive cream/forest-green design system.

- Root `.env` works for API runtime, worker, scripts and Prisma without copying credentials.
- Demo hub opens designated database identities for all 11 role types; platform operations, FPO and five provider roles now have usable workspaces.
- Crop/service listings, buyer requirements, matching and negotiation persist in PostgreSQL.
- Booking acceptance uses serializable transactions, rejects competing offers and prevents duplicate bookings.
- Simulated payment transitions enforce buyer/seller ownership and fulfillment order.
- Shared logistics notes, printable agreements, ratings and disputes are saved.
- Verification gates, district jurisdiction, state escalation, audit history and repeat-offender penalties are enforced on the server.
- FPO membership is explicit; compatible member lots can be pooled atomically without double pooling.
- Price pages use saved observations, source/date labels, history-only signals and a net-value calculator.
- Offline navigation serves previously viewed prices without caching private workspaces or queuing money-related actions.
- Scheduled worker performs price synchronization, recent-observation aggregation and SLA checks.
- Old unsafe mutation endpoints and unsigned WhatsApp webhooks are disabled. Development OTPs require a prior request, expire and limit attempts.
- Supabase runtime uses bounded transaction-pool connections after reproducing the session pool's 15-client limit. Slow hosted transactions and frontend request deadlines are aligned.
- Concurrent identical workspace reads share an in-flight request (scoped by session), avoiding duplicate development-mode reads. Responses are not retained as a private/offline cache.
- Fulfilling a buyer requirement closes competing offers across listings, not just offers for the selected lot.
- Demo inventory was added non-destructively. Existing records and user configuration were preserved.

## Five-minute demonstration

1. Open http://localhost:3000/demo and choose **Buyer**.
2. Open **Source produce**, search for a sample crop and **Send offer**. Use the seller name shown on the card.
3. Switch to the matching **Farmer** profile; open **My Offers & Payments**. Counter or accept the offer.
4. If countered, switch back to the buyer and accept. Fund **simulated** escrow.
5. Seller starts fulfillment, records pickup instructions and marks delivery. Buyer confirms/release; open **Agreement** to print or save a PDF.
6. Submit a rating or raise a dispute. In **District administration**, review the Nashik case, leave a reason or escalate; **State command** handles escalated cases.
7. For provider verification, choose a service-provider profile and submit its document reference/URL. Appropriate district or state administration reviews it. Publishing is blocked until valid approval exists.
8. For FPO pooling, farmers join their district FPO through **Sell my crop**, then publish at least two matching crop/grade lots. The FPO administrator selects those member lots in **FPO pooling**.
9. Open **Market Prices** while online, then disconnect and reload to demonstrate saved-price offline access.

The four additional open crop lots belong to the farmer demo profile and carry `attributes.demoScenario` markers. Once a lot is booked it is intentionally unavailable for another booking. Publish a new lot for another demonstration; do not reset the database.

## Verification

Final API regression: **42 assertions passed**, including the cross-listing fulfilled-demand regression. Test-owned records were cleaned afterward. Frontend production build (20 generated pages) and backend Prisma generation/TypeScript checks passed.

Browser verification: all 11 role types, one workspace read per portal, mobile marketplace and price-calculator checks passed. The full run exposed a separate price-fetch timeout in the offline scenario; after fixing that path, both price and offline tests passed in a focused rerun (20 seconds). All four browser scenarios therefore have passing verification, with the final price/offline changes checked separately rather than claiming one uninterrupted all-green suite run. Desktop/mobile screenshots were inspected and no horizontal overflow was found in the checked layouts.

Cold development compilation and hosted database latency remain noticeable. The all-role traversal took 6.6 minutes; this is not a production performance benchmark. The API and frontend responded successfully at handoff, with the worker left running.

Automated checks live in:

- `backend/src/tests/workspace.integration.ts`: isolated test identities, negotiation, ownership, logistics, demo-identity restriction, booking totals/idempotency, payment sequencing, duplicate rating protection, district/state jurisdiction, credibility penalties, verification gates and pooling safety. Its cleanup removes only records created by that run.
- `frontend/tests/portals.spec.ts`: all 11 role types, browser errors, mobile widths, marketplace filters/dialog, market cost inputs and offline navigation.
- `frontend/scripts/inspect-ui.mjs`: screenshots of desktop/mobile hub and marketplace; browser error and overflow checks.

Run tests with both servers available, and avoid editing backend files during integration/browser tests because the development watcher restarts the API. Tests are local smoke/integration coverage, not a security audit or production load test.

The direct Agmarknet sync attempt during this delivery returned HTTP 500 from data.gov.in and wrote a FAILED integration log. It did not ingest fabricated substitute data. Connectivity/latency of the hosted database also affects evaluation duration.

Worker startup completed SLA processing and daily aggregation for eight active district labels. It remains scheduled in the background. The subsequent feed attempt timed out and was logged as FAILED. A read-only cleanup diagnostic confirmed zero remaining QA accounts.

## Honest release boundaries

This delivery covers the core local marketplace demonstration, not every integration and scale target in the original roadmap:

- Payments are a labeled simulation; no funds move and no escrow license/provider integration is implied.
- Government registration, land records and warehouse certifications are reviewer-entered evidence, not live government verification.
- Agmarknet has a real adapter, but data freshness depends on provider availability and the configured key. Existing seed prices must not be presented as freshly verified live data.
- SMS/WhatsApp delivery and signed production webhooks need provider integration; the development phone code sends no SMS.
- Evidence uses document URLs/references. File upload, malware scanning and access-controlled document storage are not implemented.
- Farmer home has EN/HI/MR translations. Extended workspace and offline copy are currently predominantly English.
- The state surface uses a 36-district color grid, not a geographic choropleth. Price signals are descriptive history, not predictive ML.
- Marketplace ads have guarded API endpoints but no complete campaign-management UI. Ad billing is not integrated.
- Inventory is reserved at whole-listing granularity on acceptance; partial remaining inventory is not automatically split into a new listing.
- Production requires durable auth/session controls, distributed OTP/rate limiting, deployment/monitoring, backups, privacy review, accessibility/localization review and independent security testing. Demo access must be disabled for real-user deployments.
- Legacy FasalRakshak remains optional and is not included in the core acceptance suite.

No destructive reseed, schema reset, Git commit or remote push was performed as part of this delivery.
