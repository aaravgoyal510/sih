# KrishiSetu — Farmer Net-Realization & Assured Market Decision Platform
## Technical architecture: current baseline and proposed decision layer

The product answers: “Where, when, and how should I sell my crop to maximize what actually reaches my pocket?” PRD.md governs scope; backend/prisma/schema.prisma is database truth. The configured evaluation database now stores recommendations, trust snapshots, notifications and booking events; this is not proof of production deployment or calibrated forecasting.

## 1. Existing implementation

Next.js/React frontend, Express/TypeScript API, Prisma/PostgreSQL and scheduled worker. Role workspaces share Listing, Requirement, Offer, Booking, Rating, Verification and Dispute. Resource-specific JSON attributes use the existing Zod registry in backend/src/schemas/resource-attributes.schema.ts. Matching identifies candidate fit; it is not an expected-net engine.

JWT-authenticated workspace routes enforce ownership and jurisdiction. Password registration uses salted scrypt and excludes privileged roles. Development OTP/demo sign-in are explicitly gated evaluation facilities; phone ownership and recovery still require delivery integration. Payments are simulated. Offline access shows saved feed observations and the current account's crop draft; private API responses and mutations are not queued. README.md describes runtime boundaries.

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

## 4. Implemented API and remaining attribution contract

- POST /api/workspace/recommendations/preview: validate an owned crop lot, matching buyer requirement and integer-paise costs; persist and return a versioned indicative-budget estimate. Missing baseline yields null delta. Waiting forecasts remain UNAVAILABLE.
- GET /api/workspace/recommendations and GET /api/workspace/recommendations/:id: owner-only history and immutable evidence. No expanded FPO access is implemented.
- GET /api/workspace/trust/:partyId: authenticated public-safe buyer metrics, upserting the current TrustScore cache; no private KYC documents or dispute allegations.
- GET /api/workspace/updates and POST /api/workspace/updates/read: own durable notifications and account-level read state.
- Future: an idempotent recommendation-choice event linked to a booking, after revalidation. Accepted booking terms are already snapshotted, but recommendation-to-realized-outcome attribution is not implemented.

Use existing JWT/error conventions. GET is side-effect-free for recommendation generation. Add bounded timeouts, request coalescing and cache keys scoped to party/lot/version. Never expose API keys in evidence.

## 5. Trust computation and governance

PRD.md §5.2 specifies proposed weights, exact 87-point fixture and provisional/suspended handling. Recompute from completed bookings, payment due/receipt events, attributed cancellations, verified transaction ratings, current KYC and final at-fault dispute decisions. Store denominators, asOf and formulaVersion.

Booking now has nullable due-time fields and cancellation actor/time/reason. These are not historical proof of paid timestamps or cancellation fault. Dispute still lacks explicit outcome attribution fields. Verified payment and adjudication evidence is required before reliable score backfill; do not infer on-time payments from RELEASED or guilt from RESOLVED alone.

Keep legacy CredibilityScore active until dual-read/shadow computation is approved. New TrustScore uses party+role uniqueness. Apply penalties idempotently per dispute decision and support reversal on appeal. Suspension must block new offers/acceptance as well as publication; preserve payment, fulfillment and dispute access for existing obligations. Three-case window/reinstatement requires product approval.

## 6. Data and workers

The implemented market pipeline has five-minute on-access freshness, one-minute refresh cooldown, 15-minute worker attempts, hourly aggregates and 15-minute SLA checks. Provenance, partial coverage and outages are visible. Only AGMARKNET_LIVE observations enter the verified feed. See MARKET_DATA.md for observed upstream failures and precise coverage.

Proposed jobs: trust snapshot recomputation on relevant events plus reconciliation; recommendation expiry/invalidation; outcome aggregation. Do not relabel sample e-NAM/IMD/WDRA adapters as live. Generic market averages across grades must not be represented as firm lot-specific offers. Admin operational queues use transactional data; statistical dashboards use aggregates, not a blanket ban on live admin reads.

## 7. UI and deployment boundary

RecommendationCard renders WHAT / WHY / RISK / WHAT IF I WAIT, with buyer trust inside WHY. Buyer profiles expose the evidence card. Authenticated farmer buyer comparisons create real saved estimates, and `/farmer/decisions` reopens history. Core farmer assistance is localized EN/HI/MR, with browser voice and typing fallback; extended admin/provider copy remains English. `/preview/decision` is separately labelled synthetic.

Next.js proxies browser requests through its own `/api/backend` origin to Express, supporting separate hosting and a single frontend tunnel. Apply the additive database upgrade before deploying the new API (see Schema.md). Before real-user production: phone/recovery delivery, payment integration, backups, privacy/security review and monitoring. No destructive backfill or ad-code deletion is part of this implementation.

## 8. Out-of-scope legacy capabilities

Marketplace advertising is deferred and excluded from ranking, monetization and milestones. Endpoints are disabled; existing MarketplaceAd code/data remain for review. Unsupported legacy crop diagnosis is similarly disabled without deleting its records. Broad equipment/labor/input expansion and agronomy require explicit linkage to sale decisions before prioritization.
