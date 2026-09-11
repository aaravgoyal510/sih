# KrishiSetu — Farmer Net-Realization & Assured Market Decision Platform
## 1. Design principle

Show what reaches the farmer's pocket, why an option wins, what can go wrong and what waiting changes. Shared transaction templates support this decision; they no longer determine the product hierarchy.

## 2. Primary component: RecommendationCard

Use the existing cream/forest-green ks-* design language, rounded panels, readable typography and Lucide/SVG icons. Mobile-first single column with four fixed labelled sections:

- WHAT: direct action, buyer/market, quantity and timing.
- WHY: quantified net delta, named baseline and comparable totals. Expandable costs and a visible TrustScoreCard live inside this section.
- RISK: Low/Medium/High in text, plus the basis. Never use color alone.
- WHAT IF I WAIT: horizon, expected change, upside/downside and named risk factor; unavailable is a valid state.

Source age, validity and scenario status are always visible. High trust is not a guarantee. A next-step control is only added after production API integration and eligibility validation; the scaffold has no fake working transaction button.

Required placements: lot review, market-option comparison, offer comparison, wait/storage and FPO sell decisions. A market observation alone is not a recommendation.

## 3. Trust components

TrustScoreBadge: score /100, explicit tier, limited-history or suspended state.
TrustScoreCard: badge plus KYC, transaction count, on-time payment %, disputes, cancelled orders, counterpart rating, evidence time and formula version. Buyer cards label the rating “Farmer rating”; proposed farmer cards use “Buyer rating” and on-time fulfillment. Unknown metrics render “Not enough evidence,” not zero.

Buyer profile and offer detail should display the reusable component; RecommendationCard embeds it under WHY. Keep historical recommendation trust snapshot separate from a current-profile score.

## 4. Navigation and accessibility

Four proposed farmer entries: Sell my crop; Compare take-home value; Storage & transport; My offers & payments. Existing broader services require a discoverability decision before navigation changes. No farmer sidebar or emoji. Large controls (minimum 44px target), semantic headings, keyboard focus, sufficient contrast and no horizontal overflow at 320px.

Full farmer copy should support English, Hindi and Marathi; existing localization covers home only. The scaffold is English pending translation. Avoid unqualified “best,” “guaranteed,” “AI forecast” and green success styling for missing evidence. Money shows INR and total/per-kg units; costs remain inspectable rather than hiding uncertainty in one large figure.

## 5. Secondary surfaces

Keep shared listing/requirement/offer/booking/rating/dispute UI. Promote transport/storage only when the net comparison justifies them. Buyer/provider/admin tabs may be denser. State analytics prioritize outcome gaps over a decorative price heatmap; absent data gets a separate state, not zero.

Offline UI displays dated saved verified observations; no private listing cache or write queue is implied. Assisted channels are future integrations and must preserve the same explanations.

## 6. Scaffold and acceptance

Preview: /preview/decision. Code: frontend/app/components/decision. Fixtures: frontend/lib/decision-platform.ts. No Storybook configuration exists, so a labelled preview route and render tests serve as the component catalog.

Verify exact fixture text, all metrics, fixed section order, unknown waiting state, provisional/suspended labels, keyboard access and mobile layout before production integration. Advertising is excluded from this design; no legacy files are removed.
