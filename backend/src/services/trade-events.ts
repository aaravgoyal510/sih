import {Prisma} from '@prisma/client';
export async function notifyParties(tx:Prisma.TransactionClient,partyIds:Array<string|null|undefined>,eventKey:string,kind:string,payload:Record<string,unknown>){
 const ids=[...new Set(partyIds.filter((id):id is string=>!!id))];if(!ids.length)return;
 await tx.notification.createMany({data:ids.map(partyId=>({partyId,eventKey,kind,payload:payload as Prisma.InputJsonValue})),skipDuplicates:true});
}
export async function tradeEvent(tx:Prisma.TransactionClient,actorId:string,offer:any,kind:string){
 const booking=offer.booking;
 const payload={reference:offer.id,status:offer.status,paymentStatus:booking?.paymentStatus||null,fulfillmentStatus:booking?.fulfillmentStatus||null,event:kind};
 if(booking)await tx.bookingEvent.create({data:{bookingId:booking.id,actorId,kind,snapshot:payload}});
 await notifyParties(tx,[offer.listing.partyId,offer.requirement?.partyId],`${offer.id}:${kind}:${offer.price}`,'TRADE',payload);
}
