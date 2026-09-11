import assert from 'node:assert/strict';
import {scoreTrust,TrustEvidence} from '../services/trust-score';
const fixture:TrustEvidence={partyId:'fixture',role:'BUYER',kycVerified:true,totalTransactions:47,eligibleOrders:49,onTimePayments:48,eligiblePayments:50,attributableCancellations:2,cancelledOrdersCount:2,counterpartRating:4.7,ratingCount:20,disputesCount:1,confirmedAtFaultDisputes:1,suspended:false};
assert.equal(scoreTrust(fixture).score,87);assert.equal(scoreTrust(fixture).tier,'HIGH_TRUST');assert.equal(scoreTrust(fixture).onTimePaymentPct,96);
const unknown=scoreTrust({...fixture,eligiblePayments:0,onTimePayments:0});assert.equal(unknown.onTimePaymentPct,null);assert.equal(unknown.provisional,true);assert.ok(unknown.score<=59);
const suspended=scoreTrust({...fixture,confirmedAtFaultDisputes:3});assert.equal(suspended.suspended,true);assert.ok(suspended.score<50);
assert.equal(scoreTrust({...fixture,disputesCount:10}).score,87);
console.log('PASS: exact 87-point fixture, unknown-payment evidence, suspension and no penalty for unproven complaints.');
