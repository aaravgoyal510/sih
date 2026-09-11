# KrishiSetu — Farmer Net-Realization & Assured Market Decision Platform

Product requirements • PS 26132 • Strategic pivot, 12 September 2026

## 1. Vision and driving problem

> Where, when, and how should I sell my crop to maximize what actually reaches my pocket?

A higher quoted price is not necessarily a better sale. Transport, storage, quantity thresholds, quality deductions, payment delays and counterparty failure can consume the difference. Small farmers also need a feasible way to execute the option they choose.

KrishiSetu turns those constraints into an explainable comparison of expected take-home proceeds, then connects that decision to offers, aggregation, logistics, agreements and payment tracking. The transaction ecosystem is execution infrastructure, not the product's differentiator.

“Assured” means an evidence-backed, traceable decision and accountable execution workflow. It does not mean a guaranteed buyer, price, return, payment or insured loss. Current payments are simulations.

## 2. Why not e-NAM?

> e-NAM tells the farmer where market prices exist. KrishiSetu determines the farmer's expected net realization after transport, storage, quantity, quality, buyer reliability and timing, and then helps execute that decision through the same transaction ecosystem.

This is our positioning shorthand, not a claim that e-NAM only lists prices. e-NAM also supports electronic trading, payment and logistics workflows. Our proposed differentiation is a farmer-specific, explainable decision layer over market and execution options, not exclusive ownership of those transaction capabilities. See [e-NAM overview](https://enam.gov.in/) and [registration and logistics guidance](https://www.enam.gov.in/web/resources/registration-guideline).

The team's SasyaSetu/AgriLink comparison motivates this pivot; their feature coverage has not been independently audited here. Do not claim competitive exclusivity without a dated comparison.

## 3. Value proposition and users

For farmers: compare money likely to reach their pocket, understand uncertainty, choose freely and track the outcome.
For buyers: discover feasible lots and make executable, transparent offers; reliability becomes visible.
For FPOs: demonstrate each member's net benefit from pooling after shared costs.
For storage/transport providers: expose priced, available capacity when it improves a sale decision.
For district/state teams: resolve execution failures first; later use privacy-preserving outcome aggregates to identify bottlenecks.

All eleven existing role types remain supported as execution infrastructure. Having many portals is not a success metric.

## 4. Net-realization engine

For a fixed lot and horizon:

Expected net = grade-adjusted gross proceeds − transport − storage − handling/commission − incremental spoilage loss − financing/timing cost − calibrated counterparty loss.

Use kg internally and INR with explicit total-versus-unit labels. Avoid double-counting quality deductions and spoilage. Compare the same saleable quantity, grade assumptions and cost responsibilities. Historical production costs may be reported separately; net sale proceeds are not farm profit.

The baseline is the farmer's feasible sell-now option, named and timestamped; never choose an artificially poor comparator. Store every cost, quote source, observation time, quantity assumption and model version. Unquoted costs are unknown, not zero. Uncalibrated trust scores are not default probabilities: 87/100 must never imply a 13% monetary loss deduction.

Only feasible candidates enter ranking: quantity/grade fit, valid quote, availability, required verification and non-suspended counterparties. Missing critical inputs produce “More information needed,” not a fabricated best option. Farmer-entered scenarios remain explicitly labelled estimates. Waiting scenarios require a horizon, upside/downside, assumptions and a named risk factor; missing weather data means weather risk unknown.

## 5. Core product primitives

### 5.1 Explainable Recommendation Card

A persisted Recommendation is the engine's primary communication surface, not a decorative summary. Every farmer sell-decision surface must use it: lot review, market-option comparison, buyer offer comparison, wait/storage choice and FPO pool decision. Raw observations may appear without a recommendation, but cannot be labelled “best sale.”

Fixed field order:

1. WHAT — action, buyer/market, lot quantity, timing and execution route.
2. WHY — expected net, named baseline net, quantified INR delta and cost breakdown; embed the buyer's visible KrishiTrust snapshot.
3. RISK — Low / Medium / High, with human-readable bases, evidence age and missing inputs.
4. WHAT IF I WAIT — horizon, expected change and upside/downside relative to selling now, plus named risk factor. Unknown projections explicitly say unavailable.

Backend fields are structured `what`, `why`, `risk`, `what_if_wait`, with farmer/listing/buyer references, evidence snapshot, validity time and explanation version. See [Schema.md](Schema.md) and the active [Prisma schema](backend/prisma/schema.prisma). Monetary API values use integer paise; baseline and delta remain unknown when no comparable baseline is entered.

Required synthetic acceptance fixture:

```text
WHAT: Sell to XYZ buyer
WHY: Net realization ₹2,850 higher
RISK: Medium
WHAT IF I WAIT: Expected +₹1,100, but rainfall risk increases
```

The fixture compares ₹25,850 with ₹23,000 for the same lot; a hypothetical three-day wait has downside −₹900 and upside +₹1,600. These are illustrative scenarios, not live quotes or forecasts. Medium risk can coexist with high buyer trust because timing/logistics uncertainty is distinct.

Feature Justification: answers all three parts of the driving question with a decision the farmer can inspect and challenge.

### 5.2 Visible KrishiTrust Score

TrustScore belongs to a party in a role (BUYER initially; FARMER proposed separately). It includes score 0–100, HIGH TRUST / MEDIUM TRUST / LOW TRUST tier, verified KYC, total completed transactions, on-time payment percentage, disputes count, cancelled orders, counterpart rating out of five, denominators, evidence time, formula version and suspension state.

Display a badge and expandable component metrics on buyer profiles, sourcing/offer details and within the Recommendation Card's WHY section. Buyer trust uses farmer ratings. A farmer profile would use buyer ratings and on-time fulfillment, not on-time payment by the farmer; do not conflate those measures.

Proposed v1 buyer formula (subject to product approval):

- KYC: 20 points when approved and unexpired.
- On-time payment: 40 × on-time fraction, using settled payments with a recorded due time.
- Completed history: 10 × min(completed transactions / 40, 1).
- Cancellation reliability: 10 × (1 − attributable cancellations / eligible accepted orders).
- Counterpart rating: 20 × average verified-transaction rating / 5.
- Round the weighted sum, then subtract 10 per confirmed, resolved, at-fault dispute; clamp to 0–100.

A filed complaint is visible but does not itself trigger a penalty. Proposed tiers: HIGH ≥80, MEDIUM 50–79, LOW <50. Missing critical evidence or fewer than ten completed transactions yields a provisional score capped at 59 and a visible “Limited history” label; missing values must not be presented as observed percentages.

Preserve the existing three-confirmed-dispute suspension concept pending policy review: at three at-fault cases, block new trading actions, cap visible score at 49 and show Suspended / LOW TRUST. Appeals reverse only the corresponding audited penalty; never erase dispute history. Existing transaction obligations and grievance access remain available. Final lookback window and reinstatement policy require approval.

Required synthetic fixture:

```text
Buyer Trust Score: 87/100 — HIGH TRUST
Verified KYC: ✓
Transactions: 47
On-time payments: 96%
Disputes: 1
Cancelled orders: 2
Farmer rating: 4.7/5
```

Fixture denominators: 48/50 payment milestones on time (orders can have installments), 47 completed + 2 cancelled = 49 eligible orders, 20 ratings, and one confirmed at-fault dispute. Formula: round(20 + 38.4 + 10 + 10×47/49 + 18.8) − 10 = 87.

Feature Justification: makes “how should I sell?” include the likelihood of accountable fulfillment, not just a headline bid.

## 6. Feature scope and justification

| Major feature | Decision-first requirement | Feature Justification |
| --- | --- | --- |
| Lot capture and quality | Quantity, grade evidence, location, harvest date and cash deadline | Establishes which sale options are feasible. |
| Market observations | Provenance, observation age, units and coverage; input to net comparison | Helps answer where without confusing gross price with take-home proceeds. |
| Net comparison and recommendations | Costed feasible options, baseline, delta, explanation and uncertainty | Directly answers the driving question. |
| Timing and storage scenarios | Cost of waiting, spoilage, cash deadline and sourced weather uncertainty | Answers when; waiting must beat incremental costs and risks. |
| Buyer demand, offers and negotiation | Concrete terms, trust snapshot and recomputation when terms change | Converts “where/how” into an executable choice. |
| Agreements, logistics and payment tracking | Trace chosen recommendation to booking and actual receipts/costs | Tests whether projected income reached the farmer. |
| Ratings, KYC and dispute governance | Visible trust, role verification, audited penalties and appeals | Protects reliability of the chosen route. |
| FPO harvest pooling | Compare member-level net outcomes after fees and cost allocation | Makes otherwise infeasible buyer quantities accessible. |
| Transport and storage capacity | Quote, availability, validity and booking linked to decision | Reduces execution costs and avoidable losses. |
| Accessibility and offline evidence | Four simple farmer entry points, large controls, EN/HI/MR; dated saved observations | Makes informed decisions usable without hiding stale information. |
| Notifications and assisted channels | Consent-based offer, expiry, payment and risk updates; future SMS/voice/WhatsApp integrations | Keeps a chosen decision valid as conditions change. |
| District governance and state intelligence | Operational dispute queues now; anonymized net-outcome/capacity aggregates later | Fixes barriers to take-home income rather than maximizing listings. |
| Inputs, labor, equipment, used gear, contract farming | Existing resources retained; expansion deferred pending a demonstrated sale-decision benefit | Indirect or unproven fit; not equal-priority v1 differentiators. |
| Marketplace advertising | Excluded from current feature and monetization scope | Does not answer the driving question and can distort rankings. |
| FasalRakshak/agronomy and scheme discovery | Outside this release; retain legacy code pending review | No established direct contribution to the sell decision. |

Four implemented primary farmer entry points: Sell my crop; Market prices and take-home comparison; Services; My offers & payments. Services retains storage, transport and other existing providers, with contextual access to FPO membership. Saved decisions and account verification are secondary links. This preserves access while reducing the first-screen choices.

## 7. Phase focus and milestones

Phase focus: farmer income → transparency → trust → FPO aggregation → infrastructure utilization → state intelligence

1. Farmer income: costed sell-now comparisons and outcome capture; no unsupported uplift claim.
2. Transparency: four-field card on every sell-decision surface, baseline/cost provenance, expiry and unknown states.
3. Trust: visible buyer score, audited formula, dispute penalty and appeal rules. Safety gates remain mandatory from phase 1.
4. FPO aggregation: member consent, cost allocation and individual net-benefit comparisons.
5. Infrastructure utilization: reliable storage/transport quote and availability integration, utilization measured against capacity.
6. State intelligence: privacy-safe outcome, payment-delay and infrastructure-gap aggregates.

Advertising is not a revenue assumption or deliverable for these phases. The former ImplementationPlan Tier C ads item and build step 16 are explicitly deferred, not silently completed or deleted. No quantified advertising-funded milestone or revenue forecast was found in the reviewed docs. Monetization and funding require a separate decision; do not introduce paid ranking as a substitute.

## 8. Success metrics and acceptance

North star: median realized net proceeds per kg improvement against a recorded comparable feasible baseline, with sample size, crop/grade, district, period and comparison limitations. This is not automatically causal income uplift.

Supporting metrics:

- Realized net = confirmed receipts less evidenced farmer-borne sale costs; report missing-cost coverage.
- Forecast error: absolute expected-versus-realized net difference, median and upper percentile.
- Decision completion: completed settlements / chosen recommendations, with abandonment reasons.
- Transparency: 100% of presented sell recommendations have four fields, baseline, validity and risk basis.
- Trust: score evidence completeness, on-time payment rate, attributable cancellations, upheld disputes and appeal reversals.
- Farmer comprehension: can sampled users explain the reason and waiting risk? Pilot target to be agreed.
- Pooling: per-member net benefit after allocated costs; not merely pooled tonnage.
- Infrastructure: booked capacity / available capacity and net savings attributable to its use.
- Safety: zero suspended counterparties eligible for new recommendations; zero demo forecasts labelled live.

No numeric income-uplift promise before a measured pilot. Analytics must separate simulation, estimated outcomes and verified receipts.

## 9. Release boundaries, dependencies and risks

Current evaluation build: authenticated multi-role transactions, password registration, simulated payments, costed market comparisons, price provenance, FPO pooling, dispute penalties, persisted budget-based recommendations, visible provisional buyer trust, immutable acceptance snapshots, booking history and durable in-app notifications. Core farmer assistance includes EN/HI/MR and browser voice with typing fallback. Timing forecasts, verified realized-income attribution, member-level pooled settlement and production integrations remain unshipped. `/preview/decision` remains a synthetic fixture, separate from authenticated saved decisions. Recommendations are indicative estimates, not guaranteed buyer quotes.

Agmarknet refresh is implemented but successful live ingestion was not verified during the last checks; see [MARKET_DATA.md](MARKET_DATA.md). e-NAM, IMD, WDRA and registry access are not assumed production integrations. Missing feeds must not be replaced with plausible-looking samples.

No real settlement, insurance guarantee, production SMS, offline transaction queue or full-language parity is claimed. Risks include uncertain costs, stale quotes, selection bias, sparse trust history, false accusations, weather uncertainty and privacy leakage. Mitigate with provenance, abstention, evidence requirements, appeals, freshness checks and explicit consent.

See [ImplementationPlan.md](ImplementationPlan.md) for acceptance gates and [PIVOT_REVIEW.md](PIVOT_REVIEW.md) for changes and decisions requiring approval.
