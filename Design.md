# Design.md — Market Linkage & Farm Services Platform

## 1. Design Principle
**Progressive disclosure by role, one shared UI template across resource types.**
The system is feature-rich; the farmer's visible surface is not. Every resource
type (crop, storage, transport, equipment, labor, used gear, group-buy/contract)
renders through the SAME listing/offer/booking components — only the icon, label,
and form fields (driven by that resourceType's validation schema) change.

## 2. Hard UI Constraints (apply to all farmer-facing screens)
- **No sidebar, ever.** Navigation is a persistent bottom/top row of large buttons.
- **Big buttons, big icons/logos** — minimum comfortable touch target, icon-first,
  short text label under each.
- **No emoji anywhere in the UI.** Use simple flat-style SVG icons (licensed icon
  set or custom-designed), never emoji glyphs, for anything including alerts/status.
- **Mobile-first.** Design for a single-column, narrow viewport first; desktop/tablet
  is a scaled-up version of the same layout, not a separate design.
- Minimal text per screen; plain-language copy (see 4.4).

## 3. Information Architecture

### Farmer app (mobile-first)
```
Home (4 big buttons, icons, no sidebar)
├── Sell my crop
│   ├── Lot creation form
│   ├── Net-realization recommendation (contextual)
│   └── Pooling prompt (contextual, only if applicable)
├── Check prices near me
│   ├── Price trend (single line chart)
│   ├── Ranked nearby markets/buyers
│   └── Anomaly/weather flag (contextual banner)
├── Get help / Services
│   └── Resource-type grid (6 big icon tiles: Storage, Transport, Equipment,
│       Labor, Buy/Sell used gear, Group buying & contracts)
│       -> each tile opens the SAME generic browse/list/book template
└── My offers & payments
    ├── Unified list of active items across ALL resource types
    ├── Offer accept/counter/reject (same component regardless of type)
    ├── Payment tracker (same component regardless of type)
    └── Ratings + dispute entry point (same component regardless of type)
```

### Buyer / Provider / Admin dashboards (web, denser is acceptable)
Standard multi-panel layout: top nav (not a sidebar, to keep visual language
consistent with the farmer app — tabs instead), main content area with
tables/cards, detail drawer on row-click. Density is fine here since these are
professional users who expect it; the "simple, no sidebar, no emoji" rule for
Farmer screens does not have to extend as strictly to Admin/Buyer density,
but emoji are still avoided everywhere for a consistent, professional look.

## 4. Shared Component Template (the payoff of the generic engine)
- `ResourceTypeTile` — icon + label, used on the Services grid
- `ListingCreateForm` — auto-generated from the Zod schema per resourceType
- `ListingCard` / `RequirementCard` — same card layout, icon/title swap per type
- `OfferFlow` — identical accept/counter/reject screen for every resource type
- `BookingTracker` — identical pending -> confirmed -> completed progress bar
- `RatingPrompt`, `DisputeForm` — identical regardless of resource type
This means adding a new resource type later needs one icon + one form schema,
not a new screen design.

## 5. UI Language for Farmers
- Plain language over jargon: "Better to wait ~4 days - price rising" not
  "seasonality-adjusted forecast +6.2%"
- Net realization always shown as a single rupee figure
- Color coding: green (good time to sell / verified provider), amber (neutral/wait),
  red (avoid/unverified) - consistent across the whole farmer surface
- Numerals/units localized (Rs, quintal/kg as regionally standard)

## 6. Localization
- Hindi + Marathi for all farmer-facing screens and SMS/WhatsApp templates
- English-only acceptable for buyer/provider/admin dashboards in v1

## 7. Accessibility & Connectivity
- Offline-first caching: last-synced prices/listings shown with "last updated X ago"
- SMS fallback templates for: offer received, price threshold hit, payment released,
  verification status change
- Voice/WhatsApp bot reuses the same top-level intents - no separate flow to design

## 8. Admin/Governance Screens (District & State)
- Queue-style layouts (verification queue, dispute queue) with SLA countdown badges
- Statewide price heatmap: choropleth of Maharashtra districts, color-scaled by
  price deviation from state average (not absolute price) per selected crop
- Districts with insufficient Tier-1 data shown in a distinct "no data" shade,
  never silently defaulted to zero

## 9. Key Screens to Prototype for Demo
1. Farmer Home (4-action screen)
2. Lot creation + net-realization recommendation
3. Get help / Services grid + one generic booking flow (e.g. cold storage)
4. Buyer requirement posting + matched lot list with credibility scores
5. Offer negotiation + agreement generation
6. Unified payment tracker
7. District Admin verification + dispute queue
8. State Admin price heatmap
