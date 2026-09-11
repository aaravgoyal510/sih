# Strategic pivot review — KrishiSetu

12 September 2026 · Documentation and component-scaffold delivery

## Outcome and boundaries

The governing identity is **KrishiSetu — Farmer Net-Realization & Assured Market Decision Platform**. The docs now derive scope from “Where, when, and how should I sell my crop to maximize what actually reaches my pocket?”

This change restructures the product/specification documents, proposes additive Prisma entities and scaffolds reusable components. It does not deploy a recommendation API, migrate the database, backfill trust, integrate forecasts, alter production ranking or remove advertising code/data.

## What changed and why

| Document | Removed/reworded/restructured | Reason |
| --- | --- | --- |
| PRD.md | Replaced generic market-linkage vision/problem with farmer-specific expected take-home decisions; added e-NAM differentiation with factual caveat | Listing and price visibility are supporting inputs, not the differentiator |
| PRD.md | Re-derived feature requirements and justifications, net formula, baseline and success metrics | Each feature must improve or execute a sell decision; transaction count is not income uplift |
| PRD.md | Elevated Recommendation and visible KrishiTrust to first-class primitives with fixtures, evidence, weights and suspension behavior | Explanations and reliability must be visible, testable and persisted |
| PRD.md / ImplementationPlan.md | Replaced “nothing removed” and A/B/C marketplace breadth with six ordered outcome phases | Prioritize farmer income → transparency → trust → FPO → infrastructure → state intelligence |
| PRD.md / TechSpec.md / Design.md | Removed advertising from current feature, monetization and placement requirements; explicitly deferred legacy items | Advertising does not serve the core question and can bias recommendations |
| TechSpec.md | Replaced generic matching-as-intelligence framing with feasibility, net ranking, immutable evidence, proposed APIs and outcome feedback | Existing fit matching does not compute expected take-home proceeds |
| TechSpec.md / AppFlow.md / Design.md | Corrected unconditional live-feed, forecast, SMS and offline-write promises | Separate implemented infrastructure from proposed integrations and unknown data |
| Schema.md | Replaced a stale duplicate full schema with links to the active schema and additive proposal, backrelations and rollout constraints | Avoid presenting aspirational model definitions as deployed tables; no active models were removed |
| AppFlow.md / Design.md | Made four-field cards central to lot, comparison, offer, waiting and FPO decisions; trust inside WHY and buyer profiles | Consistent decision surfaces rather than a disconnected UI mockup |
| README.md | Repositioned introduction and separated current evaluation build from target product | Honest entry-point description without losing run instructions |
| MARKET_DATA.md / DELIVERY.md | Added pivot context and deferred-ads status; preserved historical verification/outage evidence | Past implementation results are not proof that the new engine shipped |

## Code deliverables

- `backend/prisma/proposals/decision-platform.prisma`: additive Recommendation/TrustScore models, enums, relations, timestamps and indexes. Merge-time Party/Listing backrelations are in Schema.md. Active schema remains unchanged.
- `frontend/lib/decision-platform.ts`: typed UI/API payload proposal, integer-paise formatter, exact required buyer/recommendation fixtures and unavailable-wait fixture.
- `frontend/app/components/decision/RecommendationCard.tsx`: WHAT / WHY / RISK / WHAT IF I WAIT, quantified baseline comparison, inspectable costs and embedded buyer trust.
- `frontend/app/components/decision/TrustScoreCard.tsx`: standalone metric card and exported TrustScoreBadge for buyer-profile integration; includes limited-history, suspension and unknown evidence states.
- `frontend/app/components/decision/decision.module.css`: scoped responsive styling using existing ks-* design tokens, semantic details/summary and keyboard focus.
- `/preview/decision`: clearly labelled synthetic component catalog. No Storybook setup exists in the repository; no new framework was installed.
- `frontend/scripts/test-decision.cjs`: React server-render assertions for field order, exact examples, arithmetic, proposed 87-point formula, role labels, missing evidence and formatting.

## Proposed production integration map

| Existing surface/system | Next implementation change |
| --- | --- |
| Farmer sell and market comparison pages | Collect complete cost/quality/cash constraints; request validated recommendations; remove unsupported best-option wording |
| Shared Workspace offer/lot views | Embed card wherever farmer chooses a sale; revalidate terms and store chosen recommendation linkage |
| Buyer profile/detail surfaces | Fetch role-specific public-safe TrustScore; show badge/card, denominators and timestamp |
| FPO pooling | Add member consent, shared-cost allocation and per-member net comparisons |
| Backend matching | Retain as candidate generator; add feasibility filter and net-ranking service separately |
| Booking/payment/dispute persistence | Add auditable due/receipt/cost/cancellation/outcome events before score/outcome backfill |
| Worker and admin analytics | Reconcile trust snapshots, invalidate advice and aggregate evidenced net outcomes separately from simulation |
| Branding/navigation | Existing runtime hero, metadata, service grid and copy still need a coordinated pivot pass; scaffold does not silently rewrite them |

## Advertising dependency audit

Explicit old roadmap dependencies found: ImplementationPlan Tier C “Marketplace ads (verified-seller-gated)” and build-order step 16 “Marketplace ads placement.” Both are now marked deferred, not silently removed from history. The old PRD monetization section and TechSpec ads section no longer authorize current advertising work.

No numeric revenue forecast or milestone explicitly financed by ad revenue was found in the reviewed docs. External budgets/pitch decks may still need review.

Retained artifacts include MarketplaceAd/Party.marketplaceAds in the active Prisma schema, `backend/src/controllers/ad.controller.ts`, ad endpoints in `backend/src/routes/workspace.routes.ts`, legacy step16/step17 ad tests and seed/integrity scripts. They are not evidence of an approved advertising roadmap. Disabling endpoints or deleting tables/files is a separate decision; no such action was taken.

## Product decisions required before full implementation

1. **Assurance promise:** approve accountable workflow as the meaning of “assured,” or define a funded/regulated guarantee product separately. Current payments remain simulated.
2. **Baseline and accounting:** approve feasible local sell-now baseline, farmer-borne cost responsibilities and net-sale-proceeds versus farm-profit distinction. Establish pilot targets and comparable outcome methodology before claiming uplift.
3. **Trust policy:** approve proposed weights, high-trust threshold, provisional cap, minimum history, installment-payment denominators and attributable cancellation rules. Define dispute lookback, appeals, reinstatement and whether three lifetime cases remain appropriate. Existing evidence cannot support reliable on-time backfill.
4. **Farmer trust:** approve whether to launch alongside buyer trust; it needs fulfillment-specific weights and protections against unfair buyer ratings. Buyer payment weights must not be reused.
5. **Timing/risk:** choose validated forecast/weather inputs and calibration requirements. Until then, waiting projections remain hypothetical or unavailable, never live rainfall advice.
6. **Navigation and broad services:** approve the proposed Compare take-home value / Storage & transport labels and decide where retained equipment/labor/inputs/used-gear/contracts remain discoverable. FasalRakshak and scheme discovery are outside this release.
7. **Advertising and funding:** leave legacy endpoints dormant or explicitly disable them? Any table/file removal requires confirmation. Select a funding/monetization model separately; no paid ranking is proposed.
8. **Privacy and retention:** approve visibility of trust metrics, minimum aggregate cohort size and retention/anonymization for recommendation/dispute evidence.

The e-NAM paragraph retains the requested positioning but avoids an inaccurate claim that e-NAM lacks trading/payment/logistics. Official sources: [overview](https://enam.gov.in/) and [registration/logistics guidance](https://www.enam.gov.in/web/resources/registration-guideline). SasyaSetu/AgriLink coverage remains a team-provided competitive assumption, not an independently verified feature audit.

## Verification

Passed in this change: component render/fixture assertions, frontend TypeScript, Next.js production build (21 generated pages, including `/preview/decision`), `git diff --check`, and Prisma validation of the assembled schema proposal. The temporary validation copy was removed afterward; the active schema and database were untouched. No visual-browser review or production recommendation API test was performed.

Run `node frontend/scripts/test-decision.cjs` for the component/fixture checks and `npm --prefix frontend run build` for the production build. This is render/type/build coverage, not a visual browser or production API acceptance test. Schema validation covers an assembled copy of the proposed fragment plus documented backrelations, not a migration or database backfill.
