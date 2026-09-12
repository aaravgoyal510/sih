import { Request, Response } from 'express';
import { liveMarket } from '../services/live-market.service';

const cropAliases: Record<string,string[]> = {
  bhindi:['ladiesfinger','okra'], ladiesfinger:['bhindi','okra'], okra:['bhindi','ladiesfinger'],
  baingan:['brinjal','eggplant'], brinjal:['baingan','eggplant'], eggplant:['brinjal','baingan'],
  kheera:['cucumbar','cucumber'], cucumber:['cucumbar','kheera'], cucumbar:['cucumber','kheera'],
  mirchi:['chilli','chily'], chilli:['mirchi','chily'], chily:['mirchi','chilli'],
  jowar:['sorghum'], sorghum:['jowar'], moong:['greengram'], greengram:['moong'],
  urad:['blackgram'], blackgram:['urad'], tur:['redgram','arhar'], arhar:['redgram','tur'],
};
const compact=(value:string)=>value.replace(/[^a-z0-9]/g,'');
const matchesCrop=(name:string,query:string)=>{
  if(!query)return true;const observed=compact(name),wanted=compact(query);
  return observed.includes(wanted)||wanted.includes(observed)||Boolean(cropAliases[wanted]?.some(alias=>observed.includes(alias)));
};

export const getMandiPrices = async (req:Request,res:Response):Promise<void> => {
  const text=(value:unknown)=>typeof value==='string'?value.trim().slice(0,100).toLowerCase():'';
  const crop=text(req.query.crop),district=text(req.query.district);
  const limit=Math.min(2500,Math.max(1,Math.floor(Number(req.query.limit)||500)));
  try{
    const result=await liveMarket.get(req.query.refresh==='1');
    const cropMatches=result.prices.filter(p=>matchesCrop(p.crop.toLowerCase(),crop));
    let fallbackDistrict=false;
    let prices=cropMatches.filter(p=>!district||p.district.toLowerCase().includes(district));
    // A government feed does not publish every crop in every district every day.
    // Return a clearly marked Maharashtra observation instead of a misleading empty
    // result, while keeping the requested-district result first whenever present.
    if(district&&crop&&prices.length===0&&cropMatches.length){prices=cropMatches;fallbackDistrict=true;}
    prices=prices.slice(0,limit);
    res.setHeader('Cache-Control','no-store');
    res.json({...result,success:true,prices,count:prices.length,fallbackDistrict,requested:{crop:crop||null,district:district||null},unit:'INR/kg',priceBasis:'Mean reported modal price across varieties/grades per market, crop and observation date',sourceUrl:'https://www.data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi'});
  }catch{
    res.status(503).json({success:false,error:'Live market feed and saved verified observations are unavailable.'});
  }
};
