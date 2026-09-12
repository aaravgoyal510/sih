-- Additive Phase 2. No historical data backfill or destructive rollback.
-- Roll back application code while retaining these nullable columns and evidence tables.
-- Atomic and repeatable; the marker table is created in the same transaction.
DO $phase2$
BEGIN
PERFORM pg_advisory_xact_lock(26132, 2);
IF to_regclass('"DecisionRun"') IS NOT NULL THEN RETURN; END IF;
-- AlterEnum
ALTER TYPE "ListingStatus" ADD VALUE 'DRAFT';

-- AlterTable
ALTER TABLE "Recommendation" ADD COLUMN     "evidenceHash" TEXT,
ADD COLUMN     "formulaVersion" TEXT,
ADD COLUMN     "poolPlanId" TEXT,
ADD COLUMN     "quoteId" TEXT,
ADD COLUMN     "runId" TEXT,
ADD COLUMN     "scenarioStatus" TEXT,
ADD COLUMN     "sharedFpoId" TEXT;

-- CreateTable
CREATE TABLE "DecisionRun" (
    "id" TEXT NOT NULL,
    "farmerPartyId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "diagnostics" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionQuote" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "issuerPartyId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "serviceListingId" TEXT,
    "offerId" TEXT,
    "quantityGrams" BIGINT NOT NULL,
    "unitPricePaise" BIGINT NOT NULL,
    "priceBasis" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "paymentDueAt" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "evidence" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionSelection" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "selectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evidenceHash" TEXT NOT NULL,
    "bookingId" TEXT,
    "linkedAt" TIMESTAMP(3),

    CONSTRAINT "DecisionSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionReservation" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "DecisionReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoolPlan" (
    "id" TEXT NOT NULL,
    "fpoId" TEXT NOT NULL,
    "administratorId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "members" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" TIMESTAMP(3),

    CONSTRAINT "PoolPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoolConsent" (
    "id" TEXT NOT NULL,
    "poolPlanId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "farmerPartyId" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PoolConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingOutcomeEvent" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "responsiblePartyId" TEXT NOT NULL,
    "amountPaise" BIGINT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3),
    "evidenceRef" TEXT,
    "simulation" BOOLEAN NOT NULL,
    "evidenceLevel" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "relatedEventId" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingOutcomeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustHistory" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "evidenceHash" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "legacySnapshot" JSONB NOT NULL,
    "formulaVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrustHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionJob" (
    "id" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DecisionRun_farmerPartyId_createdAt_idx" ON "DecisionRun"("farmerPartyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DecisionRun_farmerPartyId_requestKey_key" ON "DecisionRun"("farmerPartyId", "requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "DecisionQuote_offerId_key" ON "DecisionQuote"("offerId");

-- CreateIndex
CREATE INDEX "DecisionQuote_listingId_kind_status_validUntil_idx" ON "DecisionQuote"("listingId", "kind", "status", "validUntil");

-- CreateIndex
CREATE INDEX "DecisionQuote_issuerPartyId_createdAt_idx" ON "DecisionQuote"("issuerPartyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DecisionSelection_recommendationId_key" ON "DecisionSelection"("recommendationId");

-- CreateIndex
CREATE INDEX "DecisionSelection_bookingId_idx" ON "DecisionSelection"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "DecisionReservation_quoteId_bookingId_key" ON "DecisionReservation"("quoteId", "bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "PoolPlan_listingId_key" ON "PoolPlan"("listingId");

-- CreateIndex
CREATE INDEX "PoolPlan_fpoId_status_idx" ON "PoolPlan"("fpoId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PoolConsent_recommendationId_key" ON "PoolConsent"("recommendationId");

-- CreateIndex
CREATE UNIQUE INDEX "PoolConsent_poolPlanId_listingId_key" ON "PoolConsent"("poolPlanId", "listingId");

-- CreateIndex
CREATE INDEX "BookingOutcomeEvent_bookingId_occurredAt_idx" ON "BookingOutcomeEvent"("bookingId", "occurredAt");

-- CreateIndex
CREATE INDEX "BookingOutcomeEvent_responsiblePartyId_kind_idx" ON "BookingOutcomeEvent"("responsiblePartyId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "BookingOutcomeEvent_bookingId_actorId_idempotencyKey_key" ON "BookingOutcomeEvent"("bookingId", "actorId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "TrustHistory_partyId_createdAt_idx" ON "TrustHistory"("partyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrustHistory_partyId_evidenceHash_key" ON "TrustHistory"("partyId", "evidenceHash");

-- CreateIndex
CREATE UNIQUE INDEX "DecisionJob_eventKey_key" ON "DecisionJob"("eventKey");

-- CreateIndex
CREATE INDEX "DecisionJob_completedAt_createdAt_idx" ON "DecisionJob"("completedAt", "createdAt");

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_runId_fkey" FOREIGN KEY ("runId") REFERENCES "DecisionRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "DecisionQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_poolPlanId_fkey" FOREIGN KEY ("poolPlanId") REFERENCES "PoolPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionRun" ADD CONSTRAINT "DecisionRun_farmerPartyId_fkey" FOREIGN KEY ("farmerPartyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionRun" ADD CONSTRAINT "DecisionRun_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionQuote" ADD CONSTRAINT "DecisionQuote_issuerPartyId_fkey" FOREIGN KEY ("issuerPartyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionQuote" ADD CONSTRAINT "DecisionQuote_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionQuote" ADD CONSTRAINT "DecisionQuote_serviceListingId_fkey" FOREIGN KEY ("serviceListingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionQuote" ADD CONSTRAINT "DecisionQuote_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionSelection" ADD CONSTRAINT "DecisionSelection_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionSelection" ADD CONSTRAINT "DecisionSelection_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionReservation" ADD CONSTRAINT "DecisionReservation_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "DecisionQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionReservation" ADD CONSTRAINT "DecisionReservation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolPlan" ADD CONSTRAINT "PoolPlan_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolConsent" ADD CONSTRAINT "PoolConsent_poolPlanId_fkey" FOREIGN KEY ("poolPlanId") REFERENCES "PoolPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolConsent" ADD CONSTRAINT "PoolConsent_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingOutcomeEvent" ADD CONSTRAINT "BookingOutcomeEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingOutcomeEvent" ADD CONSTRAINT "BookingOutcomeEvent_relatedEventId_fkey" FOREIGN KEY ("relatedEventId") REFERENCES "BookingOutcomeEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustHistory" ADD CONSTRAINT "TrustHistory_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DecisionQuote" ADD CONSTRAINT "DecisionQuote_valid_money" CHECK ("quantityGrams">0 AND "unitPricePaise">=0 AND ("kind"<>'SALE' OR "unitPricePaise">0) AND "endAt">="startAt" AND "validUntil">"createdAt");
ALTER TABLE "BookingOutcomeEvent" ADD CONSTRAINT "BookingOutcomeEvent_nonnegative_amount" CHECK ("amountPaise" IS NULL OR "amountPaise">=0);
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_v2_consistency" CHECK ("formulaVersion" IS NULL OR ("expectedNetPaise"=("why"->>'expectedNetPaise')::bigint AND "baselineNetPaise"=("why"->>'baselineNetPaise')::bigint AND "deltaPaise"=("why"->>'deltaPaise')::bigint AND "baselineNetPaise" IS NOT NULL AND "deltaPaise"="expectedNetPaise"-"baselineNetPaise"));
CREATE FUNCTION krishi_outcome_immutable() RETURNS trigger LANGUAGE plpgsql AS $fn$ BEGIN RAISE EXCEPTION 'Outcome evidence is append-only; add a correction event'; END $fn$;
CREATE TRIGGER "BookingOutcomeEvent_immutable" BEFORE UPDATE ON "BookingOutcomeEvent" FOR EACH ROW EXECUTE FUNCTION krishi_outcome_immutable();
CREATE FUNCTION krishi_recommendation_immutable() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
 IF OLD."formulaVersion" IS NOT NULL AND (to_jsonb(OLD)-'scenarioStatus'-'sharedFpoId') IS DISTINCT FROM (to_jsonb(NEW)-'scenarioStatus'-'sharedFpoId') THEN
  RAISE EXCEPTION 'Recommendation evidence is immutable; generate a new recommendation';
 END IF;
 RETURN NEW;
END $fn$;
CREATE TRIGGER "Recommendation_immutable_evidence" BEFORE UPDATE ON "Recommendation" FOR EACH ROW EXECUTE FUNCTION krishi_recommendation_immutable();
CREATE FUNCTION krishi_selection_immutable() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
 IF (to_jsonb(OLD)-'bookingId'-'linkedAt') IS DISTINCT FROM (to_jsonb(NEW)-'bookingId'-'linkedAt') OR (OLD."bookingId" IS NOT NULL AND OLD."bookingId" IS DISTINCT FROM NEW."bookingId") THEN
  RAISE EXCEPTION 'Chosen evidence and existing booking linkage are immutable';
 END IF;
 RETURN NEW;
END $fn$;
CREATE TRIGGER "DecisionSelection_immutable" BEFORE UPDATE ON "DecisionSelection" FOR EACH ROW EXECUTE FUNCTION krishi_selection_immutable();

END $phase2$;
