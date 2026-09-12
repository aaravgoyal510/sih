import { Request, Response } from 'express';
import { liveMarket } from '../services/live-market.service';

export const getMandiPrices = async (req:Request,res:Response):Promise<void> => {
  const text=(value:unknown)=>typeof value==='string'?value.trim().slice(0,100).toLowerCase():'';
  const crop=text(req.query.crop),district=text(req.query.district);
  const limit=Math.min(2500,Math.max(1,Math.floor(Number(req.query.limit)||500)));
  try{
    const result=await liveMarket.get(req.query.refresh==='1');
    const prices=result.prices.filter(p=>(!crop||p.crop.toLowerCase().includes(crop))&&(!district||p.district.toLowerCase().includes(district))).slice(0,limit);
    res.setHeader('Cache-Control','no-store');
    res.json({...result,success:true,prices,count:prices.length,unit:'INR/kg',priceBasis:'Mean reported modal price across varieties/grades per market, crop and observation date',sourceUrl:'https://www.data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi'});
  }catch{
    res.status(503).json({success:false,error:'Live market feed and saved verified observations are unavailable.'});
  }
};
