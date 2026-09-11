# Schema.md — Market Linkage & Farm Services Platform (PostgreSQL via Prisma)

## 1. Design Approach
One generic marketplace engine (`Listing`, `Requirement`, `Offer`, `Booking`,
`Payment`, `Rating`, `Dispute`) serves every transaction type via a `resourceType`
enum + a `JSONB attributes` field, validated at the API layer against a
per-resourceType schema (see TechSpec.md). Role-specific identity/compliance data
(`Verification`) is kept separate from listings, since compliance is a property of
the *party*, not the transaction. Admin dashboards read from a separate,
periodically-refreshed aggregation layer, never from live transactional tables.

## 2. Core Identity

```prisma
model User {
  id            String   @id @default(uuid())
  phone         String   @unique
  passwordHash  String?
  preferredLang String   @default("en") // en | hi | mr
  createdAt     DateTime @default(now())
  party         Party?
}

model Party {
  id         String       @id @default(uuid())
  userId     String       @unique
  user       User         @relation(fields: [userId], references: [id])
  name       String
  district   String
  village    String?
  roles      PartyRole[]
  fpoId      String?
  fpo        Fpo?         @relation(fields: [fpoId], references: [id])

  listings      Listing[]
  requirements  Requirement[]
  verifications Verification[]
  credibility   CredibilityScore?
}

enum PartyRole {
  FARMER
  FPO_ADMIN
  BUYER
  STORAGE_OPERATOR
  TRANSPORT_OPERATOR
  EQUIPMENT_PROVIDER
  LABOR_CONTRACTOR
  INPUT_SUPPLIER
  DISTRICT_ADMIN
  STATE_ADMIN
  PLATFORM_ADMIN
}

model Fpo {
  id              String   @id @default(uuid())
  name            String
  district        String
  registrationRef String?  // NABARD/SFAC registry ref (Tier 3)
  members         Party[]
}

model OtpCode {
  id        String   @id @default(uuid())
  phone     String   @unique
  code      String
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

## 3. Generic Marketplace Engine

```prisma
enum ResourceType {
  CROP_LOT
  COLD_STORAGE
  TRANSPORT
  EQUIPMENT_SERVICE
  LABOR
  USED_EQUIPMENT
  INPUT_GROUP_BUY
  CONTRACT_FARMING
}

model Listing {
  id            String       @id @default(uuid())
  partyId       String
  party         Party        @relation(fields: [partyId], references: [id])
  resourceType  ResourceType
  district      String
  availableFrom DateTime?
  availableTo   DateTime?
  price         Float?
  priceUnit     String?      // per_kg | per_quintal | per_day | per_trip | flat
  status        ListingStatus @default(OPEN)
  attributes    Json         // validated per resourceType at API layer, see TechSpec.md
  createdAt     DateTime     @default(now())

  offers        Offer[]
}

enum ListingStatus {
  OPEN
  POOLED
  MATCHED
  BOOKED
  COMPLETED
  EXPIRED
}

model Requirement {
  id             String       @id @default(uuid())
  partyId        String
  party          Party        @relation(fields: [partyId], references: [id])
  resourceType   ResourceType
  district       String?
  quantityNeeded Float?
  budget         Float?
  deadline       DateTime?
  attributes     Json
  createdAt      DateTime     @default(now())

  offers         Offer[]
}

model Offer {
  id             String   @id @default(uuid())
  listingId      String
  listing        Listing  @relation(fields: [listingId], references: [id])
  requirementId  String?
  requirement    Requirement? @relation(fields: [requirementId], references: [id])
  price          Float
  status         OfferStatus @default(PENDING)
  createdAt      DateTime @default(now())
  booking        Booking?
}

enum OfferStatus {
  PENDING
  COUNTERED
  ACCEPTED
  REJECTED
}

model Booking {
  id             String   @id @default(uuid())
  offerId        String   @unique
  offer          Offer    @relation(fields: [offerId], references: [id])
  totalAmount    Float?   // computed total transaction value (quantity * offer.price), separate from Offer.price per-unit semantics
  agreementUrl   String?
  fulfillmentStatus FulfillmentStatus @default(PENDING)
  paymentStatus  PaymentStatus @default(PENDING)
  logisticsNote  String?
  createdAt      DateTime @default(now())
  dispute        Dispute?
  ratings        Rating[]
}

enum FulfillmentStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum PaymentStatus {
  PENDING
  ESCROWED
  RELEASED
  FAILED
}

model Rating {
  id          String   @id @default(uuid())
  bookingId   String
  booking     Booking  @relation(fields: [bookingId], references: [id])
  giverPartyId    String
  receiverPartyId String
  score       Int      // 1-5
  comment     String?
  createdAt   DateTime @default(now())
}
```

## 4. Trust, Safety & Dispute

```prisma
model Dispute {
  id               String   @id @default(uuid())
  bookingId        String   @unique
  booking          Booking  @relation(fields: [bookingId], references: [id])
  raisedByPartyId  String
  respondentPartyId String
  category         DisputeCategory
  reason           String
  evidenceUrls     String[]
  status           DisputeStatus @default(OPEN)
  districtAdminId  String?
  stateAdminId     String?
  resolutionNote   String?
  slaDeadline      DateTime?
  resolvedAt       DateTime?
  createdAt        DateTime @default(now())

  auditLogs        DisputeAuditLog[]
}

enum DisputeCategory {
  PAYMENT
  QUALITY
  LOGISTICS
  STORAGE_DAMAGE
  SERVICE_NOT_RENDERED
  OTHER
}

enum DisputeStatus {
  OPEN
  UNDER_DISTRICT_REVIEW
  ESCALATED
  UNDER_STATE_REVIEW
  RESOLVED
  REJECTED
}

model DisputeAuditLog {
  id         String   @id @default(uuid())
  disputeId  String
  dispute    Dispute  @relation(fields: [disputeId], references: [id])
  actorId    String
  fromStatus String
  toStatus   String
  note       String?
  createdAt  DateTime @default(now())
}

model CredibilityScore {
  id           String   @id @default(uuid())
  partyId      String   @unique
  party        Party    @relation(fields: [partyId], references: [id])
  score        Float    @default(50) // 0-100
  txnCount     Int      @default(0)
  onTimePayPct Float?
  disputeCount Int      @default(0)
  suspended    Boolean  @default(false)
  updatedAt    DateTime @updatedAt
}
```

## 5. Verification & Governance

```prisma
model Verification {
  id            String   @id @default(uuid())
  partyId       String
  party         Party    @relation(fields: [partyId], references: [id])
  role          PartyRole
  documentType  String   // WDRA_LICENSE | TRANSPORT_PERMIT | MACHINE_REG |
                          // LABOR_REGISTRATION | GST | PESTICIDE_DEALER_LICENSE
  documentRef   String?
  documentUrl   String?
  status        VerificationStatus @default(PENDING)
  reviewedBy    String?  // adminId
  reviewedAt    DateTime?
  rejectionReason String?
  expiresAt     DateTime?
  slaDeadline   DateTime?
  createdAt     DateTime @default(now())

  auditLogs     VerificationAuditLog[]
}

enum VerificationStatus {
  PENDING
  APPROVED
  REJECTED
  EXPIRED
  ESCALATED
}

model VerificationAuditLog {
  id             String   @id @default(uuid())
  verificationId String
  verification   Verification @relation(fields: [verificationId], references: [id])
  actorId        String
  fromStatus     String
  toStatus       String
  note           String?
  createdAt      DateTime @default(now())
}
```

## 6. Intelligence & Integration Layer

```prisma
model MandiPrice {
  id          String   @id @default(uuid())
  crop        String
  district    String
  market      String
  pricePerKg  Float
  arrivalsKg  Float?
  source      String   // AGMARKNET | ENAM
  recordedAt  DateTime
  ingestedAt  DateTime @default(now())

  @@index([crop, district, recordedAt])
}

model PortalSyncLog {
  id        String   @id @default(uuid())
  portal    String   // AGMARKNET | ENAM | WDRA | IMD | NABARD_SFAC | PAYMENT_GW
  tier      Int      // 1 = live, 2 = simulated-live, 3 = stubbed
  status    String   // SUCCESS | FAILED | STUBBED
  message   String?
  syncedAt  DateTime @default(now())
}

model WarehouseReceipt {
  id           String   @id @default(uuid())
  partyId      String
  party        Party    @relation(fields: [partyId], references: [id])
  warehouseRef String   // WDRA / e-NWR reference
  crop         String
  quantityKg   Float
  issuedAt     DateTime
  status       String   // ACTIVE | REDEEMED
}
```

## 7. Aggregation Layer (admin dashboards read ONLY from here)

```prisma
model DistrictDailyStats {
  id                          String   @id @default(uuid())
  district                    String
  date                        DateTime
  avgPricePerCrop             Json     // { "onion": 1850, "tomato": 900 }
  totalLotsCreated            Int
  totalLotsMatched            Int
  totalLotsPooled             Int
  activeStorageUtilizationPct Float?
  activeTransportBookings     Int
  pendingVerifications        Int
  openDisputes                Int
  resolvedDisputesWithinSla   Int

  @@index([district, date])
}

model StateDailyStats {
  id                         String   @id @default(uuid())
  date                       DateTime
  avgPricePerCropByDistrict  Json     // { district: { crop: avgPrice } }
  aggregationRateByDistrict  Json
  integrationHealthSummary   Json
  escalatedItemsCount        Int

  @@index([date])
}
```

## 8. Notes
- `Listing.attributes` / `Requirement.attributes` schemas per `resourceType` are
  defined and enforced in TechSpec.md, not in the database.
- `CredibilityScore.disputeCount` and `suspended` back the repeat-offender
  trust & safety mechanism described in TechSpec.md / ImplementationPlan.md.
- `DistrictDailyStats` / `StateDailyStats` are written by scheduled jobs, never
  by request-path code — see TechSpec.md §7 for refresh cadence.
- `OtpCode` provides persistent storage and expiry validation for OTP-based farmer authentication across restarts.
- `Booking.totalAmount` stores the computed total transaction value (quantityNeeded * offer.price), leaving `Offer.price` strictly as the per-unit negotiated price.
- `MarketplaceAd` stores verified-seller promotional ad banners (agri-inputs, equipment, storage). It is intentionally designed as a standalone table rather than reusing the generic `Listing`/`Requirement` engine because ads are promotional content served across specific UI surfaces (resource detail pages, buyer/provider dashboards) rather than transactable marketplace resources that participate in matching, offers, bookings, escrow payments, and ratings. Gating is enforced via the seller's `Verification` status (`APPROVED`).

```prisma
model MarketplaceAd {
  id          String   @id @default(uuid())
  partyId     String
  party       Party    @relation(fields: [partyId], references: [id])
  title       String
  description String
  imageUrl    String?
  targetUrl   String?
  placement   String   // RESOURCE_DETAIL | BUYER_DASHBOARD | PROVIDER_DASHBOARD
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())

  @@index([placement, active])
}
```

