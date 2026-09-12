# Live market-data flow

In **KrishiSetu — Farmer Net-Realization & Assured Market Decision Platform**, these observations are evidence inputs, not the final sell decision. The proposed engine must combine them with lot-specific quality, feasible quotes, costs, timing and trust; this existing feed does not itself produce Recommendation or TrustScore records. See [PRD.md](PRD.md).

Market prices now fetch the government data.gov.in Agmarknet resource on page access, not just database seed rows. Source: [official daily mandi-price resource](https://www.data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi).

## Refresh and provenance

- `GET /api/mandi-prices` checks upstream when its five-minute in-process freshness window expires.
- `?refresh=1` requests an earlier check, subject to a one-minute cooldown. Concurrent requests share one refresh. Failed attempts also back off for one minute.
- The visible prices page auto-checks every five minutes and refreshes when connectivity returns. The worker attempts a background sync every 15 minutes.
- Fetching is bounded to four 500-row pages, two attempts per page and a 20-second total upstream deadline. Incomplete pagination is reported as partial coverage.
- Only validated Maharashtra observations are stored with source `AGMARKNET_LIVE`. Pre-existing `AGMARKNET` demo rows are preserved but excluded from live prices, new aggregation and the WhatsApp price lookup.
- Invalid/missing dates, future dates beyond the permitted reporting-day boundary, non-positive prices and other-state rows are rejected. Observation dates are never replaced with today's date.
- Prices are normalized from rupees/quintal to rupees/kg. Where multiple varieties/grades occur for a crop/market/day, the displayed price is the unweighted mean of their reported modal prices; this basis is shown in the UI.
- Stable content IDs prevent duplicate inserts. Changed reported prices create a new revision; reads select the newest ingestion for the same crop/market/date.

Response metadata separates `lastAttemptAt`, `lastFetchedAt` and `lastObservedAt`. Modes are `live`, `cached`, `stale` (latest observation older than 72 hours) and `unavailable`. A recent HTTP fetch does not make an old observation current. Partial coverage and provider failures remain visible.

The offline page uses a new verified-feed storage key; old browser seed caches are not treated as live observations. No live tick-by-tick trading feed is implied: these are reports published by mandis.

## Verification and current blocker

`npm --prefix backend run test:market` tests normalization, invalid dates, unit conversion, stable IDs, request coalescing, cooldown, retries and live/cached/stale/unavailable transitions with injected fixtures. It writes no fixture rows to the database. Browser price/offline tests explicitly intercept a UI-only fixture and do not establish live provider availability.

Actual network checks in this environment returned HTTP 500 with “There was a problem proxying the request” from data.gov.in, then timeouts. The official direct Agmarknet API returned HTTP 403 and was not bypassed. The actual local endpoint consequently returned `mode: unavailable`, `count: 0`, `lastFetchedAt: null` rather than showing seed data as live.

Successful live ingestion is therefore **not verified yet**. The refresh pipeline is implemented and retries automatically when the configured government source recovers. `AGMARKNET_API_KEY` and optional `AGMARKNET_RESOURCE_ID` are server-only environment settings. Do not put the key in frontend variables or URLs shown to users.

Verification: backend market-service tests passed, backend TypeScript passed, frontend production build passed, and all three focused browser scenarios passed (source-labelled calculator, offline navigation, and rejecting legacy seed cache during an upstream outage).
