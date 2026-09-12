const crops:Record<string,string[]>={Onion:['onion','प्याज','प्याज़','कांदा'],Tomato:['tomato','टमाटर','टोमॅटो'],Wheat:['wheat','गेहूं','गेहूँ','गहू','गहूं'],Rice:['rice','चावल','धान','तांदूळ'],Mustard:['mustard','सरसों','मोहरी'],Soybean:['soybean','soya','सोयाबीन'],Grape:['grape','अंगूर','द्राक्ष'],Pomegranate:['pomegranate','अनार','डाळिंब'],Cotton:['cotton','कपास','कापूस'],Maize:['maize','corn','मक्का','मका']};
export function parseVoiceListing(input:string){
 const text=input.toLowerCase().replace(/[०-९]/g,c=>String('०१२३४५६७८९'.indexOf(c))).replace(/(\d),(?=\d{3}(?:\D|$))/g,'$1');
 const foundCrops=Object.entries(crops).filter(([,names])=>names.some(name=>text.includes(name)));
 const crop=foundCrops.length===1?foundCrops[0][0]:undefined;
 const numberWords:Record<string,string>={'बीस':'20','वीस':'20','twenty':'20','दस':'10','दहा':'10','ten':'10','पचास':'50','पन्नास':'50','fifty':'50','सौ':'100','शंभर':'100','hundred':'100'};
 let numeric=text;for(const [word,value]of Object.entries(numberWords))numeric=numeric.replaceAll(word,value);
 const match=numeric.match(/(\d+(?:\.\d+)?)\s*(quintals?|क्विंटल|क्विन्टल|क्विन्टाळ|क्विंटळ|kg|kilograms?|किलो(?:ग्राम)?|किग्रा|tonnes?|tons?|टन)/i);
 const ambiguous=/[-−]\s*\d/.test(numeric)||foundCrops.length>1;
 const amount=match&&!ambiguous?Number(match[1]):undefined;
 const unit=match?(/quint|क्वि/i.test(match[2])?'quintal':/ton|टन/i.test(match[2])?'tonne':'kg'):undefined;
 return {crop,quantity:amount&&Number.isFinite(amount)&&amount>0?amount:undefined,unit};
}
