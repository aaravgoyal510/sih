# ImplementationPlan.md — KrishiSetu: State-Deployable Market Linkage and Farm-Services Ecosystem (SIH 2026)

## 1. Build-Depth Tiers (nothing is cut from scope — this controls build depth
## for the hackathon timeline only; PRD.md keeps every feature)

**Tier A — fully built, live-clickable in the demo**
- Generic marketplace engine (Listing/Requirement/Offer/Booking/Payment/Rating)
- Farmer core loop: Sell my crop, Check prices, My offers & payments
- Price discovery: Agmarknet + eNAM live ingestion, net-realization ranking,
  sale-window nudge
- Buyer core loop: post requirement, matched lots, offer, agreement, payment status
- Cold storage booking, Transport booking (explicitly named in the PS as
  "storage options" / "logistics coordination")
- District Admin: verification queue, dispute queue, local data health
- Dispute workflow (district-level resolution)

**Tier B — working with seeded/sample data**
- FPO pooling, Input group-buying, Contract farming
- Equipment/operator hiring ("packages")
- Credibility scoring, two-way ratings across all resource types
- State Admin dashboard incl. price heatmap (fed by seeded DistrictDailyStats)
- WDRA-linked storage suggestion, weather-linked price flag
- Verification SLA auto-escalation to State Admin

**Tier C — architected + documented, shown as extensibility rather than fully
live-demoed**
- Labor hiring, Used-equipment marketplace, Govt scheme discovery
- NABARD/SFAC registry lookup, real payment gateway settlement
- Full WhatsApp/voice bot (demo one scripted flow instead of a complete bot)
- Marketplace ads (verified-seller-gated)

Frame this explicitly to judges: "one general marketplace engine, demonstrated at
full depth on the PS-named core (price, storage, transport) and extended to every
other farmer need at varying build depth — the architecture doesn't distinguish
between them, only our hackathon time budget does."

## 2. Suggested Build Order
1. Schema + auth skeleton (Party, roles, JWT, route guards)
2. Generic engine core: Listing/Requirement/Offer/Booking + validation-schema
   registry (start with CROP_LOT, COLD_STORAGE, TRANSPORT resourceTypes)
3. Price ingestion service (Agmarknet/eNAM -> MandiPrice) — unblocks recommendations
4. Farmer core loop UI (4-button home, no sidebar, mobile-first)
5. Matching engine: CropLotMatchingStrategy, StorageMatchingStrategy,
   TransportMatchingStrategy
6. Buyer requirement posting + offer/agreement/payment-status flow
7. Verification & onboarding pipeline (Storage/Transport operators first)
8. District Admin console: verification queue + dispute queue
9. Credibility scoring job + dispute workflow (district-level)
10. Add EQUIPMENT_SERVICE, INPUT_GROUP_BUY, CONTRACT_FARMING resourceTypes
    (schema entries + strategy classes only — engine unchanged)
11. FPO pooling flow; State Admin dashboard + aggregation jobs + price heatmap
12. SLA auto-escalation (verification + dispute) to State Admin
13. Add LABOR, USED_EQUIPMENT resourceTypes (Tier C — schema + basic UI only)
14. Localization pass (hi/mr) on farmer screens; offline caching
15. Stub adapters (NABARD/SFAC, payment gateway) + PortalSyncLog admin view
16. Marketplace ads (verified-seller-gated) placement
17. Realistic seed dataset + one scripted WhatsApp/SMS demo flow + polish

## 3. Suggested Team Split (5-6 person SIH team)
- **1-2 devs**: Backend — generic engine, matching strategies, verification/
  dispute workflows, aggregation jobs
- **1-2 devs**: Frontend — Next.js farmer PWA (shared component template) +
  buyer/provider/admin dashboards
- **1**: Data/integration — Agmarknet/eNAM ingestion, seed datasets for Tier B/C,
  aggregation pipeline
- **1**: Design/demo — UI polish (icons, no-sidebar layout), pitch deck,
  demo script, localization strings

## 4. Demo Script Skeleton
1. Problem framing (30s) — info asymmetry, distress selling, PS 26132 scope
2. Farmer flow live: create a crop lot -> net-realization recommendation ->
   receive offer -> accept -> payment tracker moves to "escrowed"
3. Same transaction from Buyer dashboard side, with credibility score + matching
4. Get help/Services: book cold storage in ~15s, showing the same UI template
   used for the crop lot (proves the "one engine" architecture live)
5. FPO pooling in ~15s (below-minimum lot -> pooled -> meets buyer minimum)
6. District Admin: verification queue + a dispute being resolved
7. State Admin: price heatmap (district deviation view) — strong closing visual
8. Close: architecture slide showing Tier A/B/C build depth honestly, plus roadmap
   (labor, used-equipment, credit/insurance linkage as future work)

## 5. Honesty Checklist Before Presenting
- [ ] Every "AI-powered" claim maps to an actual heuristic/model you can explain
- [ ] Every portal integration is labeled by its true tier (live/simulated/stubbed)
      in both the code (PortalSyncLog) and the pitch
- [ ] Payment flow is clearly described as simulated, not live settlement
- [ ] Tier B/C features are shown as architecture/roadmap, not claimed as fully
      live unless they actually are in the demo build
- [ ] No feature from PRD.md is silently missing from the pitch — if it's Tier C,
      say so explicitly rather than omitting it
- [x] WhatsApp/SMS channel uses standard text formatting unicode symbols (🌾, 📌, 💰) as a recorded medium-specific exception to the farmer web app's strict "no emoji on PWA UI" rule (Design.md §7)

