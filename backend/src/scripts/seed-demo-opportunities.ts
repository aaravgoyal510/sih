import { prisma } from '../config/prisma';
import { ResourceType } from '@prisma/client';

async function main(){
 const farmer=await prisma.party.findFirst({where:{name:'Bhausaheb Patil',roles:{has:'FARMER'}}});
 if(!farmer) throw new Error('Existing evaluation farmer is missing. No seed changes made.');
 const examples:[string,number,number,string][]=[['Onion',500,19.5,'A'],['Tomato',800,15.5,'A'],['Grape',1200,65,'A'],['Pomegranate',600,95,'B']];
 for(const [crop,quantityKg,price,qualityGrade] of examples){const marker=`ks-evaluation-open-${crop}`;const exists=await prisma.listing.findFirst({where:{partyId:farmer.id,attributes:{path:['demoScenario'],equals:marker}}});if(!exists)await prisma.listing.create({data:{partyId:farmer.id,resourceType:ResourceType.CROP_LOT,district:farmer.district,price,priceUnit:'per_kg',attributes:{crop,quantityKg,qualityGrade,demoScenario:marker}}});}
 console.log('Four clearly tagged evaluation crop opportunities available. No existing rows replaced.');
}
main().catch(e=>{console.error(e.code||e.message);process.exitCode=1;}).finally(()=>prisma.$disconnect());
