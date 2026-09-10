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
    "agreementUrl" TEXT,
    "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "logisticsNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Party_userId_key" ON "Party"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_offerId_key" ON "Booking"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_bookingId_key" ON "Dispute"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "CredibilityScore_partyId_key" ON "CredibilityScore"("partyId");

-- CreateIndex
CREATE INDEX "MandiPrice_crop_district_recordedAt_idx" ON "MandiPrice"("crop", "district", "recordedAt");

-- CreateIndex
CREATE INDEX "DistrictDailyStats_district_date_idx" ON "DistrictDailyStats"("district", "date");

-- CreateIndex
CREATE INDEX "StateDailyStats_date_idx" ON "StateDailyStats"("date");

-- CreateIndex
CREATE UNIQUE INDEX "OtpCode_phone_key" ON "OtpCode"("phone");

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_fpoId_fkey" FOREIGN KEY ("fpoId") REFERENCES "Fpo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
