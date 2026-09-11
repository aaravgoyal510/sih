# KrishiSetu — Farmer Net-Realization & Assured Market Decision Platform
## Technical architecture: current baseline and proposed decision layer

The product answers: “Where, when, and how should I sell my crop to maximize what actually reaches my pocket?” PRD.md governs scope; backend/prisma/schema.prisma is the current database truth. Proposed models are not deployed.

## 1. Existing implementation

Next.js/React frontend, Express/TypeScript API, Prisma/PostgreSQL and scheduled worker. Role workspaces share Listing, Requirement, Offer, Booking, Rating, Verification and Dispute. Resource-specific JSON attributes use the existing Zod registry in backend/src/schemas/resource-attributes.schema.ts. Matching identifies candidate fit; it is not an expected-net engine.

JWT-authenticated workspace routes enforce ownership and jurisdiction. Development OTP/demo sign-in are evaluation facilities, not production SMS/session security. Payments are simulated. Offline access is limited to saved verified-feed observations; private workspaces and mutations are not queued. README.md and DELIVERY.md contain operational evidence.

## 2. Proposed architecture

Lot + valid quotes + cost estimates + dated market observations + trust evidence
→ feasibility filter → net-realization scenarios → persisted Recommendation
→ four-field card → farmer choice → existing Offer/Booking workflow
→ verified receipts/cost events → forecast-error and realized-net analysis.

Do not replace transaction ownership checks with recommendation possession. Recommendations are advice, not reservations. Before acceptance, revalidate price, availability, quantity, verification, suspension and expiry within the existing booking transaction. Changed terms require a new immutable recommendation; retain the accepted snapshot.

## 3. Engine and explanation contract

Normalize quantity to kg and monetary calculation to integer paise; reject nonfinite/negative costs and unsafe integers. Grade-adjusted gross less transport, storage, handling/commission, incremental spoilage, timing finance and calibrated counterparty loss gives expected net. Missing critical costs cause abstention. Expose uncalibrated reliability as risk/eligibility rather than an invented rupee loss.

Use the same lot and feasible baseline in each comparison. Rank eligible options by expected net; tie-break with lower uncertainty then shorter fulfillment time. Do not let advertising, generic match scores or higher headline price override this order.

Recommendation JSON fields follow frontend/lib/decision-platform.ts: what, why, risk, what_if_wait. Persist structured values and evidence, not only prose. Validate server-side with Zod before JSON persistence and again at the API boundary. why.deltaPaise must equal expectedNetPaise minus baselineNetPaise. Wait deltas refer to the recommended sell-now net, not a different baseline. Source data includes observation time, quote expiry, grade basis and estimated/verified flags. Store cost components and explanation/formula versions for reproducibility.

Risk policy proposal: Low only with complete fresh critical evidence and reliable feasible execution; Medium for bounded timing/logistics uncertainty; High for material uncertainty with a still-feasible option. Missing critical feasibility evidence means no actionable recommendation. A high trust score alone does not imply Low transaction risk. Forecasts require calibration and named risk factors; absent models return UNAVAILABLE, not seeded predictions.

## 4. Proposed API (not implemented)

- POST /api/workspace/recommendations: authenticated farmer-owned lot and scenario inputs; return READY, NEEDS_INPUT or UNAVAILABLE, explanations and missing inputs. FPO permissions must follow membership.
- GET /api/workspace/recommendations/:id: owner or authorized FPO only; immutable evidence snapshot plus current expiry/eligibility.
- GET /api/workspace/parties/:id/trust?role=BUYER: public-safe score metrics only; no KYC identifiers or dispute allegations.
- POST /api/workspace/recommendations/:id/choose: idempotent selection event; does not book or move money.
- Existing offer acceptance: optionally link recommendation after revalidation; user may choose another eligible option.

Use existing JWT/error conventions. GET is side-effect-free for recommendation generation. Add bounded timeouts, request coalescing and cache keys scoped to party/lot/version. Never expose API keys in evidence.

## 5. Trust computation and governance

PRD.md §5.2 specifies proposed weights, exact 87-point fixture and provisional/suspended handling. Recompute from completed bookings, payment due/receipt events, attributed cancellations, verified transaction ratings, current KYC and final at-fault dispute decisions. Store denominators, asOf and formulaVersion.

Current Booking has status but lacks payment due/paid timestamps and structured cancellation attribution. Dispute lacks explicit outcome attribution fields. These must be added before reliable score backfill; do not infer on-time payments from RELEASED or guilt from RESOLVED alone.

Keep legacy CredibilityScore active until dual-read/shadow computation is approved. New TrustScore uses party+role uniqueness. Apply penalties idempotently per dispute decision and support reversal on appeal. Suspension must block new offers/acceptance as well as publication; preserve payment, fulfillment and dispute access for existing obligations. Three-case window/reinstatement requires product approval.

## 6. Data and workers

The implemented market pipeline has five-minute on-access freshness, one-minute refresh cooldown, 15-minute worker attempts, hourly aggregates and 15-minute SLA checks. Provenance, partial coverage and outages are visible. Only AGMARKNET_LIVE observations enter the verified feed. See MARKET_DATA.md for observed upstream failures and precise coverage.

Proposed jobs: trust snapshot recomputation on relevant events plus reconciliation; recommendation expiry/invalidation; outcome aggregation. Do not relabel sample e-NAM/IMD/WDRA adapters as live. Generic market averages across grades must not be represented as firm lot-specific offers. Admin operational queues use transactional data; statistical dashboards use aggregates, not a blanket ban on live admin reads.

## 7. UI and deployment boundary

RecommendationCard renders WHAT / WHY / RISK / WHAT IF I WAIT, with TrustScoreCard inside WHY. TrustScoreBadge is reusable on buyer profiles. /preview/decision is a synthetic scaffold, not a production recommendation route. Production wiring, localization and authenticated API integration remain proposed.

Preserve existing hosting flexibility; no new service is required for the scaffold. Before production: real auth/delivery, payment provider review, backups, privacy/security review and monitoring. Proposed Prisma fragment is additive and not part of the active schema. No migration, destructive backfill or ad-code removal is authorized by this document.

## 8. Out-of-scope legacy capabilities

Marketplace advertising is deferred and excluded from ranking, current monetization and milestones. Existing MarketplaceAd data/endpoints remain for review. Broad equipment/labor/input expansion and agronomy require explicit linkage to sale decisions before prioritization.
