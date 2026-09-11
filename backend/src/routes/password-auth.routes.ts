import {Router} from 'express';
import {randomBytes,scrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {z} from 'zod';
import {prisma} from '../config/prisma';
import {signToken} from '../utils/jwt';
const router=Router();
const derive=promisify(scrypt);
const phone=z.string().trim().regex(/^\+91[6-9]\d{9}$/,'Use +91 and a valid 10-digit mobile number.');
const credentials=z.object({phone,password:z.string().min(12).max(128)});
const registration=credentials.extend({name:z.string().trim().min(2).max(100),district:z.string().trim().min(2).max(100),role:z.enum(['FARMER','BUYER','STORAGE_OPERATOR','TRANSPORT_OPERATOR','EQUIPMENT_PROVIDER','LABOR_CONTRACTOR','INPUT_SUPPLIER']).default('FARMER')});
// Bounded single-instance abuse protection. Shared ingress limiting is still
// required when scaling replicas; never trust caller-supplied X-Forwarded-For.
const attempts=new Map<string,{count:number;until:number}>();
router.use((req,res,next)=>{
 const now=Date.now();for(const [key,item] of attempts)if(item.until<now)attempts.delete(key);
 const keys=[{key:`phone:${String(req.body?.phone||'').slice(0,30)}`,limit:10},{key:`socket:${req.socket.remoteAddress}`,limit:200}];
 if(attempts.size>=10000||keys.some(({key,limit})=>(attempts.get(key)?.count||0)>=limit)){res.setHeader('Retry-After','900');res.status(429).json({success:false,error:'Too many sign-in attempts. Try again in 15 minutes.'});return;}
 for(const {key}of keys){const item=attempts.get(key)||{count:0,until:now+15*60000};item.count++;attempts.set(key,item);}next();
});
async function hash(password:string){const salt=randomBytes(16).toString('hex');const key=await derive(password,salt,64) as Buffer;return `scrypt:${salt}:${key.toString('hex')}`;}
async function verify(password:string,encoded:string|null){const [,salt,expected]=String(encoded||'').split(':');if(!salt||!expected||!/^[a-f0-9]{128}$/.test(expected)){await derive(password,'invalid-account-timing-salt',64);return false;}const key=await derive(password,salt,64) as Buffer;return timingSafeEqual(key,Buffer.from(expected,'hex'));}
function session(user:any,res:any){const party=user.party;if(!party){res.status(403).json({success:false,error:'Account needs an assigned workspace.'});return;}res.setHeader('Cache-Control','no-store');res.json({success:true,token:signToken({userId:user.id,phone:user.phone,partyId:party.id,roles:party.roles,district:party.district}),party});}
router.post('/register',async(req,res)=>{try{const input=registration.parse(req.body);const passwordHash=await hash(input.password);const user=await prisma.user.create({data:{phone:input.phone,passwordHash,party:{create:{name:input.name,district:input.district,roles:[input.role]}}},include:{party:true}});session(user,res);}catch(e:any){res.status(e instanceof z.ZodError?400:e.code==='P2002'?409:503).json({success:false,error:e instanceof z.ZodError?'Enter name, district, +91 mobile number and a password of 12–128 characters.':e.code==='P2002'?'An account already exists. Sign in or use the demo selector for evaluation accounts.':'Could not confirm account creation. Try signing in before registering again.'});}});
router.post('/password-login',async(req,res)=>{try{const input=credentials.parse(req.body);const user=await prisma.user.findUnique({where:{phone:input.phone},include:{party:true}});if(!await verify(input.password,user?.passwordHash||null)){res.status(401).json({success:false,error:'Mobile number or password is incorrect.'});return;}session(user,res);}catch(e){res.status(e instanceof z.ZodError?400:503).json({success:false,error:e instanceof z.ZodError?'Enter a valid +91 mobile number and password.':'Sign-in is temporarily unavailable. Your account has not been changed. Try again shortly.'});}});
export default router;
