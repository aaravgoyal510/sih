-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TrustRole" AS ENUM ('BUYER', 'FARMER');

-- CreateEnum
CREATE TYPE "TrustTier" AS ENUM ('HIGH_TRUST', 'MEDIUM_TRUST', 'LOW_TRUST');

-- CreateEnum
CREATE TYPE "RecommendationRisk" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "PartyRole" AS ENUM ('FARMER', 'FPO_ADMIN', 'BUYER', 'STORAGE_OPERATOR', 'TRANSPORT_OPERATOR', 'EQUIPMENT_PROVIDER', 'LABOR_CONTRACTOR', 'INPUT_SUPPLIER', 'DISTRICT_ADMIN', 'STATE_ADMIN', 'PLATFORM_ADMIN');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('CROP_LOT', 'COLD_STORAGE', 'TRANSPORT', 'EQUIPMENT_SERVICE', 'LABOR', 'USED_EQUIPMENT', 'INPUT_GROUP_BUY', 'CONTRACT_FARMING');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('OPEN', 'POOLED', 'MATCHED', 'BOOKED', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'COUNTERED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'ESCROWED', 'RELEASED', 'FAILED');

-- CreateEnum
CREATE TYPE "DisputeCategory" AS ENUM ('PAYMENT', 'QUALITY', 'LOGISTICS', 'STORAGE_DAMAGE', 'SERVICE_NOT_RENDERED', 'OTHER');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_DISTRICT_REVIEW', 'ESCALATED', 'UNDER_STATE_REVIEW', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'ESCALATED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT,
    "preferredLang" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "village" TEXT,
    "roles" "PartyRole"[],
    "fpoId" TEXT,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "farmerPartyId" TEXT NOT NULL,
    "buyerPartyId" TEXT,
    "listingId" TEXT NOT NULL,
    "what" JSONB NOT NULL,
    "why" JSONB NOT NULL,
    "risk" "RecommendationRisk" NOT NULL,
    "riskBasis" JSONB NOT NULL,
    "what_if_wait" JSONB NOT NULL,
    "expectedNetPaise" BIGINT NOT NULL,
    "baselineNetPaise" BIGINT,
    "deltaPaise" BIGINT,
    "trustSnapshot" JSONB,
    "inputSnapshot" JSONB NOT NULL,
    "explanationVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustScore" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "role" "TrustRole" NOT NULL,
    "score" INTEGER NOT NULL,
    "tier" "TrustTier" NOT NULL,
    "kycVerified" BOOLEAN NOT NULL DEFAULT false,
    "totalTransactions" INTEGER NOT NULL DEFAULT 0,
    "eligibleOrders" INTEGER NOT NULL DEFAULT 0,
    "onTimePayments" INTEGER NOT NULL DEFAULT 0,
    "eligiblePayments" INTEGER NOT NULL DEFAULT 0,
    "onTimePaymentPct" DOUBLE PRECISION,
    "onTimeFulfillmentPct" DOUBLE PRECISION,
    "disputesCount" INTEGER NOT NULL DEFAULT 0,
    "confirmedAtFaultDisputes" INTEGER NOT NULL DEFAULT 0,
    "cancelledOrdersCount" INTEGER NOT NULL DEFAULT 0,
    "counterpartRating" DOUBLE PRECISION,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "provisional" BOOLEAN NOT NULL DEFAULT true,
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "formulaVersion" TEXT NOT NULL,
    "evidenceSnapshot" JSONB NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrustScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingEvent" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fpo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "registrationRef" TEXT,

    CONSTRAINT "Fpo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "district" TEXT NOT NULL,
    "availableFrom" TIMESTAMP(3),
    "availableTo" TIMESTAMP(3),
    "price" DOUBLE PRECISION,
    "priceUnit" TEXT,
    "status" "ListingStatus" NOT NULL DEFAULT 'OPEN',
    "attributes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requirement" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "district" TEXT,
    "quantityNeeded" DOUBLE PRECISION,
    "budget" DOUBLE PRECISION,
    "deadline" TIMESTAMP(3),
    "attributes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Requirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "requirementId" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION,
    "agreementUrl" TEXT,
    "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "logisticsNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agreementSnapshot" JSONB,
    "deliveryDueAt" TIMESTAMP(3),
    "paymentDueAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "cancellationReason" TEXT,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "giverPartyId" TEXT NOT NULL,
    "receiverPartyId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "raisedByPartyId" TEXT NOT NULL,
    "respondentPartyId" TEXT NOT NULL,
    "category" "DisputeCategory" NOT NULL,
    "reason" TEXT NOT NULL,
    "evidenceUrls" TEXT[],
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "districtAdminId" TEXT,
    "stateAdminId" TEXT,
    "resolutionNote" TEXT,
    "slaDeadline" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisputeAuditLog" (
    "id" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CredibilityScore" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "txnCount" INTEGER NOT NULL DEFAULT 0,
    "onTimePayPct" DOUBLE PRECISION,
    "disputeCount" INTEGER NOT NULL DEFAULT 0,
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CredibilityScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "role" "PartyRole" NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentRef" TEXT,
    "documentUrl" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "slaDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationAuditLog" (
    "id" TEXT NOT NULL,
    "verificationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MandiPrice" (
    "id" TEXT NOT NULL,
    "crop" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "pricePerKg" DOUBLE PRECISION NOT NULL,
    "arrivalsKg" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MandiPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalSyncLog" (
    "id" TEXT NOT NULL,
    "portal" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseReceipt" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "warehouseRef" TEXT NOT NULL,
    "crop" TEXT NOT NULL,
    "quantityKg" DOUBLE PRECISION NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "WarehouseReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistrictDailyStats" (
    "id" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "avgPricePerCrop" JSONB NOT NULL,
    "totalLotsCreated" INTEGER NOT NULL,
    "totalLotsMatched" INTEGER NOT NULL,
    "totalLotsPooled" INTEGER NOT NULL,
    "activeStorageUtilizationPct" DOUBLE PRECISION,
    "activeTransportBookings" INTEGER NOT NULL,
    "pendingVerifications" INTEGER NOT NULL,
    "openDisputes" INTEGER NOT NULL,
    "resolvedDisputesWithinSla" INTEGER NOT NULL,

    CONSTRAINT "DistrictDailyStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StateDailyStats" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "avgPricePerCropByDistrict" JSONB NOT NULL,
    "aggregationRateByDistrict" JSONB NOT NULL,
    "integrationHealthSummary" JSONB NOT NULL,
    "escalatedItemsCount" INTEGER NOT NULL,

    CONSTRAINT "StateDailyStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceAd" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "targetUrl" TEXT,
    "placement" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceAd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FarmActivityLog" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "crop" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "costAmount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FarmActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CropIssueReport" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "crop" TEXT NOT NULL,
    "imageUrl" TEXT,
    "issueType" TEXT NOT NULL,
    "aiDiagnosis" TEXT NOT NULL,
    "advisoryNote" TEXT NOT NULL,
    "expertEscalated" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'DIAGNOSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CropIssueReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Party_userId_key" ON "Party"("userId");

-- CreateIndex
CREATE INDEX "Recommendation_farmerPartyId_createdAt_idx" ON "Recommendation"("farmerPartyId", "createdAt");

-- CreateIndex
CREATE INDEX "Recommendation_listingId_validUntil_idx" ON "Recommendation"("listingId", "validUntil");

-- CreateIndex
CREATE INDEX "TrustScore_role_tier_suspended_idx" ON "TrustScore"("role", "tier", "suspended");

-- CreateIndex
CREATE UNIQUE INDEX "TrustScore_partyId_role_key" ON "TrustScore"("partyId", "role");

-- CreateIndex
CREATE INDEX "Notification_partyId_readAt_createdAt_idx" ON "Notification"("partyId", "readAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_partyId_eventKey_key" ON "Notification"("partyId", "eventKey");

-- CreateIndex
CREATE INDEX "BookingEvent_bookingId_createdAt_idx" ON "BookingEvent"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "Listing_partyId_status_createdAt_idx" ON "Listing"("partyId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Requirement_partyId_createdAt_idx" ON "Requirement"("partyId", "createdAt");

-- CreateIndex
CREATE INDEX "Offer_listingId_status_idx" ON "Offer"("listingId", "status");

-- CreateIndex
CREATE INDEX "Offer_requirementId_status_idx" ON "Offer"("requirementId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_offerId_key" ON "Booking"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_bookingId_key" ON "Dispute"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "CredibilityScore_partyId_key" ON "CredibilityScore"("partyId");

-- CreateIndex
CREATE INDEX "Verification_partyId_status_idx" ON "Verification"("partyId", "status");

-- CreateIndex
CREATE INDEX "MandiPrice_crop_district_recordedAt_idx" ON "MandiPrice"("crop", "district", "recordedAt");

-- CreateIndex
CREATE INDEX "DistrictDailyStats_district_date_idx" ON "DistrictDailyStats"("district", "date");

-- CreateIndex
CREATE INDEX "StateDailyStats_date_idx" ON "StateDailyStats"("date");

-- CreateIndex
CREATE UNIQUE INDEX "OtpCode_phone_key" ON "OtpCode"("phone");

-- CreateIndex
CREATE INDEX "MarketplaceAd_placement_active_idx" ON "MarketplaceAd"("placement", "active");

-- CreateIndex
CREATE INDEX "FarmActivityLog_partyId_crop_idx" ON "FarmActivityLog"("partyId", "crop");

-- CreateIndex
CREATE INDEX "CropIssueReport_partyId_status_idx" ON "CropIssueReport"("partyId", "status");

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_fpoId_fkey" FOREIGN KEY ("fpoId") REFERENCES "Fpo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_farmerPartyId_fkey" FOREIGN KEY ("farmerPartyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_buyerPartyId_fkey" FOREIGN KEY ("buyerPartyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustScore" ADD CONSTRAINT "TrustScore_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingEvent" ADD CONSTRAINT "BookingEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeAuditLog" ADD CONSTRAINT "DisputeAuditLog_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CredibilityScore" ADD CONSTRAINT "CredibilityScore_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationAuditLog" ADD CONSTRAINT "VerificationAuditLog_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "Verification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseReceipt" ADD CONSTRAINT "WarehouseReceipt_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceAd" ADD CONSTRAINT "MarketplaceAd_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmActivityLog" ADD CONSTRAINT "FarmActivityLog_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CropIssueReport" ADD CONSTRAINT "CropIssueReport_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;
