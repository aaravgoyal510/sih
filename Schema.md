# KrishiSetu — Farmer Net-Realization & Assured Market Decision Platform
## 1. Source of truth and status

The active schema is [backend/prisma/schema.prisma](backend/prisma/schema.prisma). It currently contains identity/roles, the generic Listing → Offer → Booking execution engine, ratings, verification/dispute audit history, CredibilityScore, observations and aggregates. It does not contain Recommendation or TrustScore.

The previous duplicated schema specification mixed planned and implemented fields. This document instead defines an additive proposal, without replacing the current schema or deleting MarketplaceAd, FarmActivityLog or CropIssueReport.

## 2. Proposed entities as Prisma code

See [decision-platform.prisma](backend/prisma/proposals/decision-platform.prisma). It follows the repository's PostgreSQL, String UUID identifiers, enums, JSON payloads, relation and index conventions. It is deliberately outside the active schema; no client generation, migration or shared database change has been applied.

Merge-time backrelations:

```prisma
// Add inside existing Party:
farmerRecommendations Recommendation[] @relation("FarmerRecommendations")
buyerRecommendations  Recommendation[] @relation("BuyerRecommendations")
trustScores            TrustScore[]

// Add inside existing Listing:
recommendations Recommendation[]
```

Recommendation belongs to the farmer and crop listing, optionally a buyer. It stores WHAT, quantified WHY, risk level/bases and WHAT IF I WAIT, immutable input/trust snapshots, explanation version and validity. API risk combines persisted risk + riskBasis into { level, basis }. JSON why contains the readable breakdown, while indexed/auditable top-level monetary fields must agree with it. Validate those duplicates in one write transaction.

TrustScore is unique per party+role, supporting parties with both buyer/farmer roles. Buyer payment reliability and farmer fulfillment reliability are different metrics. Farmer scoring remains a policy proposal, not a reuse of buyer weights.

## 3. Money and validation

New recommendation totals use BigInt integer paise to avoid extending the legacy Float-money convention. Existing Offer/Booking Float columns are unchanged. API adapters convert BigInt to safe integer paise only within Number.MAX_SAFE_INTEGER; reject values beyond that boundary. Never pass BigInt directly to JSON.stringify. A later whole-ledger money migration needs independent review.

Contracts and required fixtures: [frontend/lib/decision-platform.ts](frontend/lib/decision-platform.ts). Before implementation, add server Zod schemas for JSON payloads and reviewed SQL CHECK constraints for score 0–100, rating 1–5, percentage 0–100, nonnegative counts, numerator ≤ denominator, validUntil > createdAt and delta = expected − baseline. Restrict Recommendation to farmer-owned CROP_LOT records and eligible counterparties in application authorization. JSON fields are not unconstrained escape hatches.

Store quantity, quality/grade adjustments, line-item costs, cash horizon, quote IDs/expiry, observation dates, source coverage and known/missing inputs. Do not store credentials or raw KYC documents in farmer-visible snapshots.

## 4. Evidence additions required before backfill

Current statuses are insufficient to derive on-time payment or responsibility for cancellations.

Propose an append-only BookingOutcomeEvent model in the next implementation review: booking relation, event type (PAYMENT_DUE, PAYMENT_RECEIVED, COST_RECORDED, CANCELLED), occurredAt, dueAt, amountPaise, responsiblePartyId, evidence reference, actor, idempotency key and simulation flag. Correction events reference the event being reversed rather than editing history. Add adjudication outcome/at-fault party and reversible penalty identity to dispute decisions.

These events also support realized-net measurement. Merely marking a simulated booking RELEASED is not evidence of real farmer income. Recommendation-choice/booking linkage needs an immutable selection event so later outcomes can be attributed to the chosen explanation.

## 5. Trust migration and retention

Keep CredibilityScore and its current enforcement until approved shadow calculation and policy cutover. Do not fabricate historical due times, KYC or payment percentages. Backfill only auditable fields; missing evidence gives a provisional score. Record denominators and formula version; the 87 fixture's one dispute is explicitly confirmed at fault.

Apply one penalty per upheld decision, with auditable reversal on appeal. PRD.md specifies proposed score weights/tier/suspension behavior; the existing lifetime three-dispute threshold requires a lookback/reinstatement decision.

No cascade deletion of recommendation evidence is proposed. Retention, anonymization and deletion rights need a privacy policy and controlled migration.

## 6. Deferred existing models

MarketplaceAd is retained as legacy data/code only, excluded from current monetization and decision ranking. Removing its table, routes or migrations requires explicit approval. Existing broad resource types remain intact while their expansion is deprioritized.

## 7. Rollout and verification

Review fragment and policies → assemble and validate schema → review additive SQL in a disposable database → backup/approval → migrate → evidence-only backfill → shadow score comparison → API/UI rollout. Current delivery may validate a temporary assembled schema syntactically; that is not migration or data-integrity verification.

