import assert from 'node:assert/strict';
import {CropLotMatchingStrategy} from '../matching/strategies/crop-lot-matching.strategy';
const requirement:any={resourceType:'CROP_LOT',quantityNeeded:100,budget:20,district:'Nashik',attributes:{crop:'Rice',qualityGrade:'A'}};
const lot:any={id:'valid',resourceType:'CROP_LOT',price:20,district:'Nashik',attributes:{crop:'Rice',qualityGrade:'A',quantityKg:100},party:{name:'Test farmer',credibility:{score:50}}};
const candidates=[lot,{...lot,id:'different',attributes:{...lot.attributes,crop:'Rice bran'}},{...lot,id:'short',attributes:{...lot.attributes,quantityKg:50}},{...lot,id:'wrong-grade',attributes:{...lot.attributes,qualityGrade:'B'}},{...lot,id:'partial-pool',attributes:{...lot.attributes,quantityKg:200,isPooled:true}}];
assert.deepEqual(new CropLotMatchingStrategy().scoreCandidates(requirement,candidates).map(m=>m.listingId),['valid']);
console.log('PASS: crop matching excludes substring crops, wrong grades, insufficient quantity and unsupported partial pools.');
