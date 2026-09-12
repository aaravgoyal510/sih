-- Additive, idempotent release upgrade. No existing row is deleted or rewritten.
-- A single DO statement also runs through Prisma's existing transaction pool.
DO $upgrade$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('krishisetu-decision-records-v1'));
  BEGIN CREATE TYPE "TrustRole" AS ENUM ('BUYER','FARMER'); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE TYPE "TrustTier" AS ENUM ('HIGH_TRUST','MEDIUM_TRUST','LOW_TRUST'); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE TYPE "RecommendationRisk" AS ENUM ('LOW','MEDIUM','HIGH'); EXCEPTION WHEN duplicate_object THEN NULL; END;
  CREATE TABLE IF NOT EXISTS "Recommendation" (
    "id" TEXT PRIMARY KEY,
    "farmerPartyId" TEXT NOT NULL REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "buyerPartyId" TEXT REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "listingId" TEXT NOT NULL REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "what" JSONB NOT NULL, "why" JSONB NOT NULL, "risk" "RecommendationRisk" NOT NULL,
    "riskBasis" JSONB NOT NULL, "what_if_wait" JSONB NOT NULL,
    "expectedNetPaise" BIGINT NOT NULL, "baselineNetPaise" BIGINT, "deltaPaise" BIGINT,
    "trustSnapshot" JSONB, "inputSnapshot" JSONB NOT NULL, "explanationVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "validUntil" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Recommendation_delta_check" CHECK (("baselineNetPaise" IS NULL AND "deltaPaise" IS NULL) OR ("baselineNetPaise" IS NOT NULL AND "deltaPaise" IS NOT NULL AND "deltaPaise" = "expectedNetPaise" - "baselineNetPaise"))
  );
  CREATE INDEX IF NOT EXISTS "Recommendation_farmerPartyId_createdAt_idx" ON "Recommendation"("farmerPartyId","createdAt");
  CREATE INDEX IF NOT EXISTS "Recommendation_listingId_validUntil_idx" ON "Recommendation"("listingId","validUntil");
  CREATE TABLE IF NOT EXISTS "TrustScore" (
    "id" TEXT PRIMARY KEY, "partyId" TEXT NOT NULL REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "role" "TrustRole" NOT NULL, "score" INTEGER NOT NULL CHECK ("score" BETWEEN 0 AND 100), "tier" "TrustTier" NOT NULL,
    "kycVerified" BOOLEAN NOT NULL DEFAULT false, "totalTransactions" INTEGER NOT NULL DEFAULT 0,
    "eligibleOrders" INTEGER NOT NULL DEFAULT 0, "onTimePayments" INTEGER NOT NULL DEFAULT 0, "eligiblePayments" INTEGER NOT NULL DEFAULT 0,
    "onTimePaymentPct" DOUBLE PRECISION, "onTimeFulfillmentPct" DOUBLE PRECISION,
    "disputesCount" INTEGER NOT NULL DEFAULT 0, "confirmedAtFaultDisputes" INTEGER NOT NULL DEFAULT 0,
    "cancelledOrdersCount" INTEGER NOT NULL DEFAULT 0, "counterpartRating" DOUBLE PRECISION,
    "ratingCount" INTEGER NOT NULL DEFAULT 0, "provisional" BOOLEAN NOT NULL DEFAULT true, "suspended" BOOLEAN NOT NULL DEFAULT false,
    "formulaVersion" TEXT NOT NULL, "evidenceSnapshot" JSONB NOT NULL, "asOf" TIMESTAMP(3) NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS "TrustScore_partyId_role_key" ON "TrustScore"("partyId","role");
  CREATE INDEX IF NOT EXISTS "TrustScore_role_tier_suspended_idx" ON "TrustScore"("role","tier","suspended");
  CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT PRIMARY KEY, "partyId" TEXT NOT NULL REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "eventKey" TEXT NOT NULL, "kind" TEXT NOT NULL, "payload" JSONB NOT NULL,
    "readAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE UNIQUE INDEX IF NOT EXISTS "Notification_partyId_eventKey_key" ON "Notification"("partyId","eventKey");
  CREATE INDEX IF NOT EXISTS "Notification_partyId_readAt_createdAt_idx" ON "Notification"("partyId","readAt","createdAt");
  CREATE TABLE IF NOT EXISTS "BookingEvent" (
    "id" TEXT PRIMARY KEY, "bookingId" TEXT NOT NULL REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "actorId" TEXT NOT NULL, "kind" TEXT NOT NULL, "snapshot" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS "BookingEvent_bookingId_createdAt_idx" ON "BookingEvent"("bookingId","createdAt");
  ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "agreementSnapshot" JSONB;
  ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "deliveryDueAt" TIMESTAMP(3);
  ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "paymentDueAt" TIMESTAMP(3);
  ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
  ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "cancelledById" TEXT;
  ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;
  CREATE INDEX IF NOT EXISTS "Listing_partyId_status_createdAt_idx" ON "Listing"("partyId","status","createdAt");
  CREATE INDEX IF NOT EXISTS "Requirement_partyId_createdAt_idx" ON "Requirement"("partyId","createdAt");
  CREATE INDEX IF NOT EXISTS "Offer_listingId_status_idx" ON "Offer"("listingId","status");
  CREATE INDEX IF NOT EXISTS "Offer_requirementId_status_idx" ON "Offer"("requirementId","status");
  CREATE INDEX IF NOT EXISTS "Verification_partyId_status_idx" ON "Verification"("partyId","status");
END;
$upgrade$;
