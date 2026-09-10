# AppFlow.md — Market Linkage & Farm Services Platform

## 1. Farmer Flow (mobile, 4 top-level actions, no sidebar)
```
Login/OTP -> Home
Home shows exactly 4 big buttons:
  [ Sell my crop ]  [ Check prices near me ]  [ Get help / Services ]  [ My offers & payments ]

[Sell my crop]
  -> Select crop -> quantity -> quality grade (photo optional)
  -> System shows: "Best net value nearby: Rs.X at [Buyer/Market Y]" + sale-window nudge
  -> If quantity < buyer minimum -> contextual prompt: "Join pool with N nearby
     farmers to meet minimum? [Yes/No]"
  -> Confirm -> lot goes live to matched buyers

[Check prices near me]
  -> District + crop -> price trend chart (single line)
  -> Nearby markets/buyers ranked by net realization
  -> Weather/anomaly flag shown only if relevant

[Get help / Services]  (resource-type grid, big icon tiles, no emoji)
  [ Storage ] [ Transport ] [ Equipment ]
  [ Labor ]   [ Buy/Sell used gear ] [ Group buying & contracts ]
  -> Each tile opens the SAME generic flow:
     Browse/Search matches -> view provider (rating + credibility) -> request/book
     -> OR List my own (e.g. sell used tractor) -> same listing form template,
        fields driven by resourceType schema
  -> Booking confirmation -> same payment tracker used everywhere else

[My offers & payments]
  -> List of active lots/bookings (any resource type, unified list) -> tap one
     -> see offers (accept / counter / reject)
  -> On accept -> digital agreement auto-generated -> payment tracker
     (Pending -> Escrowed -> Released)
  -> Rate the counterparty after completion
  -> [Raise a dispute] available on any active/completed booking, tagged by category

Alternate channel: WhatsApp/SMS/voice bot mirrors the same 4 top-level intents
via conversational prompts, hitting the same backend endpoints.
```

## 2. FPO Admin Flow
```
Login -> FPO Dashboard (multi-crop, multi-member)
  -> Pool member lots below buyer minimums -> [Create pooled lot]
  -> Pool member input-purchase requests -> [Create group-buy order]
  -> Manage members (add/remove/verify)
  -> Respond to buyer RFQs / contract-farming offers on behalf of the pool
  -> View consolidated payment/settlement status across members
```

## 3. Buyer Flow
```
Login/KYC -> Buyer Dashboard
  -> [Post a requirement] (crop, qty, quality spec, timeline, budget)
     OR [Post a contract-farming offer] (pre-season price/quality commitment)
  -> Matched lots/FPOs ranked with credibility score + history
  -> Send offer -> negotiate -> accept -> agreement generated
  -> Track logistics (own transport booking or matched Transport Operator)
  -> Track payment release -> rate counterparty
```

## 4. Provider Flows (Storage / Transport / Equipment / Labor / Input Supplier)
```
Signup -> Role selection -> Document upload (role-specific, see PRD 4.7)
  -> Verification queued (district admin) -> APPROVED/REJECTED notification
On approval:
  -> [Create listing] (capacity/availability/package, using role-specific form)
  -> Receive matched requirements -> respond with offer
  -> Manage bookings -> update fulfillment status -> track payment
  -> Respond to ratings/disputes
```

## 5. District Admin Flow
```
Login -> District Console
  -> Verification queue (SLA countdown visible) -> approve/reject/request-info
  -> Dispute queue (district-scoped) -> review evidence -> resolve or escalate
  -> Local data feed health (PortalSyncLog filtered to district)
  -> Provider directory + utilization stats
  -> Aggregation view (pooled lots/input orders originating in-district)
```

## 6. State Admin Flow
```
Login -> State Console
  -> Statewide price heatmap (crop-wise, district-wise, deviation from state avg)
  -> Escalated verifications/disputes queue
  -> Scheme participation analytics (if govt-scheme feature enabled)
  -> Cross-district logistics gap view (surplus vs. transport-provider density)
  -> Statewide integration health (Tier 1/2/3 status)
```

## 7. Cross-cutting notification triggers
- Price threshold crossed for a watched crop -> push/SMS
- New offer/booking request received -> push/SMS/WhatsApp
- Payment or booking status change -> push/SMS
- Verification status change -> push/SMS
- Dispute status change (including escalation) -> push
- SLA breach on verification/dispute -> auto-escalation notification to next admin tier
