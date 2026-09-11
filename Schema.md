# KrishiSetu — Farmer Net-Realization & Assured Market Decision Platform
## 1. Source of truth and status

The active schema is [backend/prisma/schema.prisma](backend/prisma/schema.prisma). Alongside identity, Listing → Offer → Booking, reviews and market evidence, it now includes Recommendation, TrustScore, Notification and BookingEvent. Booking stores an immutable accepted agreement snapshot and nullable cancellation/due-time metadata.

The additive upgrade preserves existing rows and retains MarketplaceAd, FarmActivityLog and CropIssueReport. Operational history is distinct from verified payment/outcome evidence, which remains incomplete.

## 2. Implemented entities and historical proposal

The active schema follows PostgreSQL, String UUID identifiers, enums, JSON payloads, relation and index conventions. The [original proposal](backend/prisma/proposals/decision-platform.prisma) is historical; deploy the active schema and [additive SQL](backend/prisma/migrations/20260912000000_decision_records/migration.sql). Client generation and the additive upgrade have been applied to the configured evaluation database. Party and Listing backrelations are defined in the active schema, not a separately merged fragment.

Recommendation belongs to the farmer and crop listing, optionally a buyer. It stores WHAT, quantified WHY, risk level/bases and WHAT IF I WAIT, immutable input/trust snapshots, explanation version and validity. API risk combines persisted risk + riskBasis into { level, basis }. JSON why contains the readable breakdown, while indexed/auditable top-level monetary fields must agree with it. Validate those duplicates in one write transaction.

TrustScore is unique per party+role, supporting parties with both buyer/farmer roles. Buyer payment reliability and farmer fulfillment reliability are different metrics. Farmer scoring remains a policy proposal, not a reuse of buyer weights.

## 3. Money and validation

New recommendation totals use BigInt integer paise to avoid extending the legacy Float-money convention. Existing Offer/Booking Float columns are unchanged. API adapters convert BigInt to safe integer paise only within Number.MAX_SAFE_INTEGER; reject values beyond that boundary. Never pass BigInt directly to JSON.stringify. A later whole-ledger money migration needs independent review.

Contracts and fixtures: [frontend/lib/decision-platform.ts](frontend/lib/decision-platform.ts). The server validates bounded scenario inputs with Zod, computes explanation JSON itself and restricts generation to farmer-owned CROP_LOT records and feasible counterparties. SQL checks enforce score 0–100 and consistent known/unknown baseline arithmetic. Baseline and delta are both nullable when the farmer supplies no comparison. Additional database checks for ratings, percentages, counts, denominators and expiry remain hardening work; do not claim them implemented. JSON fields must not accept arbitrary client-authored explanations.

Store quantity, quality/grade adjustments, line-item costs, cash horizon, quote IDs/expiry, observation dates, source coverage and known/missing inputs. Do not store credentials or raw KYC documents in farmer-visible snapshots.

## 4. Evidence additions required before backfill

BookingEvent records new operational transitions, logistics updates and disputes. New unfunded cancellations record actor, time and reason, but actor alone does not establish fault. Nullable due-time fields are not backfilled. Current data is insufficient to derive verified on-time payment.

Propose an append-only BookingOutcomeEvent model in the next implementation review: booking relation, event type (PAYMENT_DUE, PAYMENT_RECEIVED, COST_RECORDED, CANCELLED), occurredAt, dueAt, amountPaise, responsiblePartyId, evidence reference, actor, idempotency key and simulation flag. Correction events reference the event being reversed rather than editing history. Add adjudication outcome/at-fault party and reversible penalty identity to dispute decisions.

These events also support realized-net measurement. Merely marking a simulated booking RELEASED is not evidence of real farmer income. Recommendation-choice/booking linkage needs an immutable selection event so later outcomes can be attributed to the chosen explanation.

## 5. Trust migration and retention

Keep CredibilityScore and its current enforcement until approved shadow calculation and policy cutover. Do not fabricate historical due times, KYC or payment percentages. Backfill only auditable fields; missing evidence gives a provisional score. Record denominators and formula version; the 87 fixture's one dispute is explicitly confirmed at fault.

Apply one penalty per upheld decision, with auditable reversal on appeal. PRD.md specifies proposed score weights/tier/suspension behavior; the existing lifetime three-dispute threshold requires a lookback/reinstatement decision.

No cascade deletion of recommendation evidence is proposed. Retention, anonymization and deletion rights need a privacy policy and controlled migration.

## 6. Deferred existing models

MarketplaceAd is retained as legacy data/code only, excluded from current monetization and decision ranking. Removing its table, routes or migrations requires explicit approval. Existing broad resource types remain intact while their expansion is deprioritized.

## 7. Rollout and verification

For an existing provisioned database, run `npm --prefix backend run db:check`, then `npm --prefix backend run db:upgrade` before starting the upgraded API/worker. The narrowly scoped script executes the checked-in additive SQL using the runtime connection; it performs no seed, deletion or historical-data backfill. The SQL is repeatable and transactionally guarded. It does not mark Prisma migration history, so reconcile your baseline before adopting normal `prisma migrate deploy`; never use reset to resolve that bookkeeping. Take deployment backups through your database provider. New recommendations, trust snapshots, notifications and booking events are exercised by the isolated workspace integration suite, including ownership and cancellation checks.

