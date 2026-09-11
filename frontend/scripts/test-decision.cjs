// Dependency-free component render checks using the existing TypeScript/React packages.
// CSS is mocked only for server markup assertions; this is not visual/browser QA.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
for (const extension of ['.ts', '.tsx']) {
  require.extensions[extension] = (module, filename) => {
    const source = fs.readFileSync(filename, 'utf8');
    const result = ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true, target: ts.ScriptTarget.ES2020,
    }});
    module._compile(result.outputText, filename);
  };
}
require.extensions['.css'] = module => { module.exports = {}; };
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { default: RecommendationCard } = require('../app/components/decision/RecommendationCard.tsx');
const { default: TrustScoreCard, TrustScoreBadge } = require('../app/components/decision/TrustScoreCard.tsx');
const { recommendationFixture: r, buyerTrustFixture: t, unavailableWaitFixture, formatPaise } = require('../lib/decision-platform.ts');
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const html = render(RecommendationCard, { recommendation: r });
assert.deepEqual([...html.matchAll(/data-decision-field="([^"]+)"/g)].map(m => m[1]), ['WHAT', 'WHY', 'RISK', 'WHAT IF I WAIT']);
for (const copy of ['Sell to XYZ buyer', 'Net realization ₹2,850 higher', 'Medium',
  'Expected +₹1,100, but rainfall risk increases', '87/100 — HIGH TRUST',
  'Verified KYC', 'Verified', '47', '96%', 'Disputes', 'Cancelled orders', '4.7/5',
  'downside −₹900', 'upside +₹1,600', 'Synthetic fixture']) assert.ok(html.includes(copy), copy);
assert.equal(r.why.deltaPaise, r.why.expectedNetPaise - r.why.baselineNetPaise);
assert.equal(r.why.expectedNetPaise, r.why.grossPaise - r.why.costs.reduce((sum, c) => sum + c.amountPaise, 0));
const weighted = 20 + 40 * t.onTimePayments / t.eligiblePayments
  + 10 * Math.min(t.totalTransactions / 40, 1)
  + 10 * (1 - t.cancelledOrdersCount / t.eligibleOrders)
  + 20 * t.counterpartRating / 5;
assert.equal(Math.round(weighted) - 10 * t.confirmedAtFaultDisputes, 87);
assert.ok(render(RecommendationCard, { recommendation: unavailableWaitFixture }).includes('Projection unavailable:'));
assert.ok(render(RecommendationCard, { recommendation: unavailableWaitFixture }).includes('Buyer trust: not enough evidence'));
assert.ok(render(TrustScoreBadge, { trust: { ...t, score: 50, tier: 'MEDIUM_TRUST', provisional: true } }).includes('Limited history'));
assert.ok(render(TrustScoreBadge, { trust: { ...t, score: 49, tier: 'LOW_TRUST', suspended: true } }).includes('Suspended'));
const missing = render(TrustScoreCard, { trust: { ...t, onTimePaymentPct: null, counterpartRating: null } });
assert.ok(missing.includes('Not enough evidence'));
const farmer = render(TrustScoreCard, { trust: { ...t, role: 'FARMER', onTimeFulfillmentPct: 90 } });
assert.ok(farmer.includes('Buyer rating') && farmer.includes('On-time fulfillment'));
assert.equal(formatPaise(101), '₹1.01');
assert.throws(() => formatPaise(1.1));
const lower = render(RecommendationCard, { recommendation: { ...r, why: { ...r.why, deltaPaise: -100 } } });
assert.ok(lower.includes('₹1 lower'));
console.log('Decision component render checks passed: order, exact fixtures, arithmetic, trust weights, missing evidence, role labels and money formatting.');
