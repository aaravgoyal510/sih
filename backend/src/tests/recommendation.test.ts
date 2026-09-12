import assert from 'node:assert/strict';
import {makeRecommendation} from '../services/recommendation';
const input={buyerName:'XYZ buyer',quantityKg:1000,budgetPerKg:28,transportPaise:150000,otherCostsPaise:65000,baselineNetPaise:2300000};
const r=makeRecommendation(input);assert.equal(r.why.deltaPaise,285000);assert.equal(r.why.expectedNetPaise,2585000);assert.equal(r.what_if_wait.status,'UNAVAILABLE');assert.equal(r.synthetic,false);assert.equal(r.persisted,false);
const unknown=makeRecommendation({...input,baselineNetPaise:undefined});assert.equal(unknown.why.deltaPaise,null);assert.equal(unknown.why.baselineNetPaise,null);
assert.throws(()=>makeRecommendation({...input,transportPaise:-1}));assert.throws(()=>makeRecommendation({...input,budgetPerKg:Number.MAX_SAFE_INTEGER}));
assert.match(makeRecommendation({...input,otherCostsPaise:10000000}).what.action,/Do not sell/);
const offered=makeRecommendation({...input,source:'OFFER',budgetPerKg:30});assert.equal(offered.explanationVersion,'offer-net-v1');assert.equal(offered.why.expectedNetPaise,2785000);assert.match(offered.why.basis,/recorded offer price/);
console.log('PASS: exact ₹2,850 delta, safe-integer money, missing baseline, negative-net warning and no invented forecast.');
