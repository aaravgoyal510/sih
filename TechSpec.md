# TechSpec.md — KrishiSetu: State-Deployable Market Linkage and Farm-Services Ecosystem (SIH 2026)

## 1. Architecture Overview
```
Next.js (Vercel) -- farmer PWA, mobile-first, no-sidebar UI + buyer/provider/admin dashboards
        |  REST/JSON, JWT auth, role-based route guards
Express API (Render) -- generic marketplace engine, matching engine, verification
             workflow, dispute workflow, notification dispatch
        |
PostgreSQL (Supabase, via Prisma ORM) -- see Schema.md
        |
Scheduled background workers (Render Cron Jobs / worker service): price
ingestion, credibility scoring, sale-window/anomaly detection, aggregation jobs
(District/StateDailyStats), notification dispatch
```

### 1.1 Hosting (locked)
| Layer | Service |
|---|---|
| Database | Supabase (managed PostgreSQL) |
| Frontend | Vercel |
| Backend / API | Render |
| Background workers | Render (Cron Jobs, or a persistent worker service on Render if sub-hourly scheduling is needed) |
| Source control | GitHub, self-managed repo |

- **Auth**: JWT (access + refresh). Phone/OTP for Farmers; email/password + KYC
  doc upload for Buyers and all Provider roles.
- **Farmer channel adapters**: Web/PWA, WhatsApp Business API webhook, SMS gateway,
  optional IVR — all normalize into the same internal intent calls
  (createListing, checkPrice, listOffers, bookingStatus).
- **Offline support**: PWA service worker caches last-fetched price/listing data;
  writes queue locally, sync on reconnect.

## 2. Generic Marketplace Engine

### 2.1 Validation-schema-per-resourceType (enforced at API boundary)
`Listing.attributes` / `Requirement.attributes` are untyped JSONB at the DB level;
correctness is enforced in Express middleware before any write, via a schema
registry (illustrative, using Zod):

```js
const AttributeSchemas = {
  CROP_LOT: z.object({
    crop: z.string(), quantityKg: z.number().positive(),
    qualityGrade: z.enum(["A","B","C"]), photoUrls: z.array(z.string().url()).optional(),
    moisturePercentage: z.number().positive().optional(),
    isPooled: z.boolean().optional(), pooledFromListingIds: z.array(z.string()).optional(),
    participatingFarmerCount: z.number().int().positive().optional()
  }),
  COLD_STORAGE: z.object({
    capacityQuintal: z.number().positive(),
    cropSuitability: z.array(z.string()), tempRange: z.string().optional()
  }),
  TRANSPORT: z.object({
    vehicleType: z.string(), capacityKg: z.number().positive(),
    route: z.object({ from: z.string(), to: z.string() })
  }),
  EQUIPMENT_SERVICE: z.object({
    machineType: z.string(), packageType: z.string(), includesOperator: z.boolean()
  }),
  LABOR: z.object({ crewSize: z.number().int().positive(), taskType: z.string() }),
  USED_EQUIPMENT: z.object({
    machineType: z.string(), conditionGrade: z.enum(["like_new","good","fair"]),
    yearOfPurchase: z.number().optional()
  }),
  INPUT_GROUP_BUY: z.object({ inputType: z.string(), targetQuantity: z.number() }),
  CONTRACT_FARMING: z.object({
    crop: z.string(), agreedPricePerKg: z.number(), qualitySpec: z.string(),
    seasonWindow: z.object({ start: z.string(), end: z.string() })
  })
};
// validateAttributes(resourceType, attributes) runs on POST /listings and
// POST /requirements before the DB write. Adding a new resourceType = one
// new registry entry; no other structural change required.
```
The same registry drives auto-generated frontend forms (map each schema field to
an input type), so a new resource type doesn't need a hand-built form either.

### 2.2 Matching engine (strategy pattern per resourceType)
```
MatchingEngine.match(requirement) -> picks MatchingStrategy by resourceType -> scores candidate Listings

CropLotMatchingStrategy:      quality fit (25%) + quantity fit (25%) + distance (20%) + credibility (15%) + price (15%)
StorageMatchingStrategy:      capacity fit (30%) + crop suitability (30%) + distance (20%) + duration overlap (20%)
TransportMatchingStrategy:    route overlap (40%) + capacity fit (30%) + price (30%)
EquipmentMatchingStrategy:    package match + availability window + distance
LaborMatchingStrategy:        crew size fit + availability window + district
InputGroupBuyStrategy:        aggregate demand toward supplier minimum order quantity
ContractFarmingStrategy:      crop/quality/season match + buyer credibility
```
New feature = new ResourceType enum value + one strategy class + one schema entry
+ one icon — not a new subsystem.

### 2.3 Common lifecycle (identical for every resourceType)
```
Listing/Requirement created -> Matching -> Offer -> Offer response
  -> Booking confirmed -> Fulfillment -> Payment tracked -> Rating -> (Dispute)
```

## 3. Verification & Onboarding Pipeline
```
Signup (phone/OTP) -> role selection -> role-specific document upload
  -> Verification record created (status=PENDING, slaDeadline set)
  -> Routed to DISTRICT_ADMIN queue (by party's district)
  -> District admin: APPROVE / REJECT / REQUEST_MORE_INFO
  -> If no action within SLA (e.g. 72h) -> auto-ESCALATED to STATE_ADMIN queue
  -> Every status transition writes a VerificationAuditLog entry
  -> On APPROVED: party may create Listings for that role
  -> expiresAt triggers automatic re-verification prompts (permits, insurance, etc.)
```
Role -> required documentType mapping is a simple config table, not hardcoded
logic, so adding a new provider role's compliance requirement is a config change.

### 3.1 Role -> Compliance Document Configuration
| Party Role | Supported Compliance Document Types |
|---|---|
| `STORAGE_OPERATOR` | `WDRA_LICENSE`, `GST`, `STORAGE_PERMIT` |
| `TRANSPORT_OPERATOR` | `TRANSPORT_PERMIT`, `VEHICLE_FITNESS_CERT`, `GST` |
| `EQUIPMENT_PROVIDER` | `MACHINE_REG`, `GST` |
| `LABOR_CONTRACTOR` | `LABOR_REGISTRATION` |
| `INPUT_SUPPLIER` | `PESTICIDE_DEALER_LICENSE`, `GST` |

## 4. Dispute Resolution Workflow
```
Either Booking party raises a Dispute, tagged with a DisputeCategory
  -> auto-routed to DISTRICT_ADMIN covering the Listing's district
  -> district admin reviews evidence, may request more (status stays
     UNDER_DISTRICT_REVIEW), or resolves
  -> Resolved at district level: resolution logged, Booking status/paymentStatus
     updated accordingly, CredibilityScore recalculated for both parties
  -> OR Escalated (SLA breach or admin-flagged) -> STATE_ADMIN queue -> resolved
  -> Every transition writes a DisputeAuditLog entry (immutable)
```
### 4.1 Credibility Score Penalty & Repeat-Offender Rule
- **Baseline Score**: Starts at 50 (range 0–100) for new parties, initialized up to 90 for verified accounts.
- **Dispute Resolution Penalty**: When a dispute is resolved against an at-fault party (`RESOLVE` action with `atFaultPartyId` specified):
  - `CredibilityScore.disputeCount` is incremented by **1**.
  - `CredibilityScore.score` is penalized by **-10 points** per resolved dispute against the party (clamped at minimum 0).
- **Repeat-Offender Suspension Rule**: If a party reaches `disputeCount >= 3`, `CredibilityScore.suspended` is set to `true`, auto-suspending the party from creating new listings or posting requirements on the platform.

## 5. Aggregation Pipeline (feeds District/State dashboards + price heatmap)
```
Agmarknet/eNAM sync (scheduled, Tier 1)
  -> raw MandiPrice rows
  -> nightly job: group by (district, crop, date) -> avg/min/max, arrivals
     -> write DistrictDailyStats.avgPricePerCrop (+ booking/verification/dispute
        counts aggregated from transactional tables the same run)
  -> rollup job: DistrictDailyStats -> StateDailyStats
     (avgPricePerCropByDistrict feeds the heatmap directly)
```
- **Refresh cadence**: production default nightly; demo default near-real-time
  against seed data (configurable, not hardcoded) so the dashboard looks live
  without hammering transactional tables.
- **Why a dedicated table, not a cached live query**: dashboards need fast,
  independently-indexable reads by district/date; recomputing a statewide join
  on every dashboard load doesn't scale once transactional data grows.
- **Heatmap metric**: default to price deviation from state average (not
  absolute price) — more informative for spotting underpriced districts.
  Districts with insufficient Tier-1 coverage render as a distinct "no data"
  shade, never defaulted to zero.

## 6. Multi-Portal Integration Tiers — Automated, Scheduled Ingestion (no manual pulls)
| Tier | Portals | Approach |
|---|---|---|
| 1 — Live | Agmarknet (via data.gov.in OGD API) | Automated scheduled pull, no manual fetch/upload step, ever |
| 2 — Real data, simulated live | eNAM, WDRA, IMD weather | Real sample/historical data seeded once; scheduled job simulates a live poll cadence on top of it |
| 3 — Stubbed, architecture-ready | NABARD/SFAC FPO registry, Payment Gateway | Common `PortalAdapter.sync()` interface; mock implementation, real contract documented |

All adapters implement a common `PortalAdapter.sync()` interface so swapping a
stub for a real integration later is a drop-in change.

### 6.1 Automated ingestion design (not manual)
This runs entirely as unattended, scheduled jobs — nobody downloads a CSV and
uploads it by hand, at any tier:
```
PortalAdapter (interface)
  sync(): fetches from source, normalizes, writes to MandiPrice/etc.,
          writes one PortalSyncLog row (SUCCESS/FAILED/STUBBED) every run

Scheduler (Render Cron Job per adapter, or a single worker service running
node-cron internally if finer-grained/more-frequent scheduling is needed):
  AgmarknetAdapter.sync()  -- e.g. every 6 hours
  ENAMAdapter.sync()       -- simulated cadence, e.g. every 6 hours against seed data
  WDRAAdapter.sync()       -- daily
  IMDAdapter.sync()        -- every few hours

On failure: log to PortalSyncLog with status=FAILED and a message; the API layer
always serves the last successfully cached data (per resourceType/crop/district)
rather than blocking on a failed live call -- this is what makes a mid-demo API
outage invisible to the audience.
```
- Render Cron Jobs are the default choice (simple, no extra infra) since your
  ingestion cadence (hours, not seconds) doesn't need a message queue.
- If a job needs to run more often than Render Cron's minimum interval allows,
  fall back to a single always-on worker service on Render running `node-cron`
  internally, looping through all adapters on their own schedules.

## 7. Payment Gateway — Open Endpoint (not wired to a provider yet)
The payment/escrow layer is built against an internal interface now, with the
actual gateway left unplugged until a provider is chosen:
```
POST /payments/initiate      { bookingId, amount }   -> returns a payment reference
POST /payments/webhook       (gateway calls this on status change) -- currently unused
GET  /payments/:bookingId/status

PaymentGatewayAdapter (interface):
  initiate(amount, bookingId) -> { paymentRef, redirectUrl? }
  handleWebhook(payload) -> updates Booking.paymentStatus
  # v1 implementation: StubPaymentGatewayAdapter -- marks ESCROWED/RELEASED
  # manually via admin action or a timed simulation, no real gateway call
```
When a provider (Razorpay/Cashfree/UPI) is selected, only a new
`PaymentGatewayAdapter` implementation is needed — the routes, `Booking` schema,
and frontend payment tracker do not change. This is the same swap-in pattern
used for the Tier 3 data portals.

## 8. Resilience & Data Integrity (state-scale concerns)
- **Rate-limit/backoff + caching** on Agmarknet/eNAM polling; graceful fallback to
  last-cached MandiPrice data if a live pull fails (feature-flagged per tier, not
  hardcoded, so a mid-demo outage degrades gracefully instead of breaking the app)
- **Dedup-on-ingest** for MandiPrice (govt feeds occasionally report duplicate/late
  entries per market/day)
- **Idempotency** on Offer-accept and payment-status transitions to prevent
  double-accept race conditions
- **Realistic seed/demo dataset**: plausible farmers, listings, bookings, and
  transaction history across all resourceTypes and districts, not an empty or
  obviously synthetic DB, for the live demo

## 9. Non-Functional Notes
- Localization: i18n strings for en/hi/mr on farmer-facing routes and SMS/WhatsApp
  templates only (v1)
- Security: short-lived JWT access tokens + refresh rotation; role-based route
  guards on both Express middleware and Next.js API routes
- Observability: PortalSyncLog doubles as a lightweight audit/health view for the
  district/state admin consoles
- Ads: verified-seller-only marketplace ad slots (license-gated), rendered outside
  the 4 core farmer action screens (e.g. within Get help/Services or provider
  dashboards), never on the farmer Home screen
