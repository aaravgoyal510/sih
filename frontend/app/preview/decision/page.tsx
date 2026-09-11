import Link from 'next/link';
import RecommendationCard from '../../components/decision/RecommendationCard';
import TrustScoreCard, { TrustScoreBadge } from '../../components/decision/TrustScoreCard';
import { recommendationFixture, buyerTrustFixture, unavailableWaitFixture } from '../../../lib/decision-platform';

export default function DecisionPreview() {
  return <div style={{ maxWidth: 840, margin: '0 auto' }}>
    <p className="ks-eyebrow">COMPONENT PREVIEW · SYNTHETIC DATA ONLY</p>
    <h1>KrishiSetu — Farmer Net-Realization &amp; Assured Market Decision Platform</h1>
    <p>Where, when, and how should I sell my crop to maximize what actually reaches my pocket?</p>
    <p>Scaffold only: no recommendation API, real forecast or payment guarantee. <Link href="/demo">Return to existing portals</Link></p>
    <RecommendationCard recommendation={recommendationFixture} />
    <h2>Buyer profile component</h2><TrustScoreCard trust={buyerTrustFixture} />
    <h2 style={{ marginTop: 24 }}>Evidence and suspension states</h2>
    <p><TrustScoreBadge trust={{ ...buyerTrustFixture, score: 50, tier: 'MEDIUM_TRUST', provisional: true }} /></p>
    <p><TrustScoreBadge trust={{ ...buyerTrustFixture, score: 49, tier: 'LOW_TRUST', suspended: true }} /></p>
    <RecommendationCard recommendation={unavailableWaitFixture} />
  </div>;
}
