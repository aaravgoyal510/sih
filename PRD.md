# PRD.md — KrishiSetu: State-Deployable Market Linkage and Farm-Services Ecosystem (SIH 2026)

## 1. Problem Statement (Govt of Maharashtra, SIH 2026, PS 26132)
Smallholder farmers and FPOs lack real-time visibility into mandi prices, buyer demand,
quality requirements, logistics, and buyer reliability. This forces distress selling at
harvest and weak bargaining power, while buyers struggle to source consistent, verified
volumes. The platform must enable transparent price discovery and reliable farm-gate-to-
buyer transactions.

## 2. Product Vision
A role-based, state-deployable market intelligence and services platform. One generic
marketplace engine (listing → match → offer → booking → payment → rating → dispute)
powers every transaction type — crop sales, cold storage rental, transport booking,
equipment/operator hiring, labor hiring, input group-buying, contract farming, and
used-equipment trading — while the **farmer-facing surface stays radically simple**
(big buttons, no sidebar, no emoji, mobile-first). Complexity lives in the backend
engine and in professional-user (buyer/provider/admin) dashboards, not on the
farmer's screen.

Guiding principles:
- **One engine, many resource types** — new features are new `resourceType` entries
  plugged into the same engine, not new subsystems.
- **Feature-rich system, simple farmer surface** — nothing added to scope is ever
  removed; complexity is organized, not hidden or cut.
- **Designed for state-scale deployment**, not just a demo — dedicated provider
  roles, verification/compliance, district/state governance layers, and an
  aggregation pipeline are first-class, not afterthoughts.

## 3. Roles
| Role | Core need |
|---|---|
| Farmer (individual) | Sell crop well, access storage/transport/equipment/labor, get paid reliably |
| FPO Admin | Aggregate members' produce/purchasing, negotiate as a group |
| Buyer (processor/trader/institutional) | Source verified, consistent volumes at known quality |
| Storage Operator (govt/private) | List and manage cold storage capacity |
| Transport Operator | List and manage vehicle availability/routes |
| Equipment Provider | List machine + operator "packages" (sowing, harvesting, spraying) |
| Labor Contractor | List crews for hire |
| Input Supplier | Group-buying listings for seed/fertilizer/pesticide (verified/licensed only) |
| District Admin | Verify local providers, resolve district-level disputes, monitor local data feeds |
| State Admin | Statewide analytics, escalation handling, policy-level oversight |
| Platform Admin | System-wide config, integration health, trust & safety enforcement |

## 4. Feature Set

### 4.1 Farmer-facing (kept minimal — 4 top-level actions, see Design.md)
1. **Sell my crop** — lot creation, net-realization ranking, sale-window nudge
2. **Check prices near me** — trend chart, ranked nearby markets/buyers, anomaly/weather flags
3. **Get help / Services** — resource-type grid: Storage · Transport · Equipment ·
   Labor · Buy/Sell used gear · Group buying & contracts
4. **My offers & payments** — offers, payment tracker, ratings, dispute entry point

Also: voice/WhatsApp/SMS channel parity for all 4 actions; offline-first caching.

### 4.2 FPO Admin
- Consolidated multi-crop, multi-member dashboard
- Pool member lots to meet buyer minimums; pool input purchases for bulk pricing
- Manage member roster and verification

### 4.3 Buyer
- Post demand/RFQ; browse matched lots ranked by fit + credibility
- Digital offers, negotiation, auto-generated agreement, logistics + payment tracking
- Contract farming: pre-season commitment at agreed price/quality
- KYC/verification badge application

### 4.4 Provider roles (Storage / Transport / Equipment / Labor / Input Supplier)
- List capacity/availability/service package with role-specific attributes
- Receive and respond to requirement matches; manage bookings and payment status
- Role-specific verification (see 4.7)

### 4.5 Intelligence layer (backend services)
- Mandi price ingestion & trend computation (Agmarknet, eNAM)
- Arrival-volume tracking, price anomaly detection, weather-linked price impact
- Sale-window recommendation (seasonality heuristic)
- Matching engine: per-resource-type scoring strategy (see TechSpec.md)
- Quality grading assist (rule-based v1)
- Credibility scoring for all transacting parties (farmers, buyers, all provider roles)
- Statewide/district aggregation jobs feeding admin dashboards and the price heatmap

### 4.6 Trust & transaction layer
- Digital offer → acceptance → auto-generated agreement (PDF)
- Escrow-style payment status simulation (pending/held/released)
- Two-way ratings for every transaction type
- Category-tagged dispute workflow with district → state escalation (see TechSpec.md)
- Repeat-offender flagging and suspension (trust & safety)

### 4.7 Verification & governance (state-scale requirement)
- Role-specific compliance documents: WDRA license (storage), vehicle RC/permit
  (transport), machine registration (equipment), labor registration (labor),
  GST + pesticide dealer license (input supplier)
- District-admin-led verification queue with SLA and auto-escalation to state admin
- Immutable audit logs for verification decisions and dispute resolutions
- District/state governance dashboards (queues, local data health, aggregation
  stats, statewide price heatmap, escalations)

### 4.8 Multi-portal integration (tiered)
- **Tier 1 (live)**: Agmarknet, eNAM
- **Tier 2 (real data, simulated live)**: WDRA, IMD weather
- **Tier 3 (stubbed, architecture-ready)**: NABARD/SFAC FPO registry, UPI/payment
  gateway, external logistics API (largely superseded by the in-platform transport
  marketplace, but kept as an alternate integration path)

### 4.9 Platform/accessibility
- Hindi + Marathi localization on all farmer-facing screens and alert templates
- Offline-first caching; SMS fallback for critical alerts
- Mobile-first UI: no sidebar, large buttons with icons/logos, no emoji, minimal text

### 4.10 Sustainability / monetization
- Verified-seller-only marketplace ads (agri-input suppliers), placed outside the
  core farmer action screens, gated by license verification

## 5. Non-Goals (explicit, honest scope boundary)
- Not an irrigation/water-management solution (water scarcity, droughts)
- Not a crop-loss weather-resilience solution beyond price-impact flagging
- Not a soil-health/agronomy advisory tool (soil testing *booking* is in scope;
  agronomic advice is not)
- No real payment settlement (simulated status) or live micro-credit/insurance
  integration in v1 — documented as roadmap only

## 6. Success Metrics
- Farmer net-price-realization uplift; reduction in distress-sale rate
- % lots matched within X hours; FPO/input aggregation rate
- Storage/transport/equipment booking volume and utilization
- Dispute resolution turnaround vs. SLA; repeat-offender rate
- Verification queue turnaround (district vs. escalated-to-state)
- Integration health (Tier 1/2/3 uptime, cache staleness)

## 7. Key Risks
- Public API rate limits/staleness -> caching + PortalSyncLog + graceful fallback
- Farmer trust/adoption -> WhatsApp/SMS/voice channel parity
- Provider fraud/no-shows across 5 new provider roles -> verification gate +
  credibility scoring + repeat-offender suspension
- District admin overload at scale -> SLA-based auto-escalation to state admin
- Schema flexibility (JSONB attributes) vs. type safety -> enforced via per-
  resourceType validation schemas at the API layer (see TechSpec.md)
