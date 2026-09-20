import express from 'express';
import './config/env';
import workspaceRoutes from './routes/workspace.routes';
import cors from 'cors';
import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import authRoutes from './routes/auth.routes';
import passwordAuthRoutes from './routes/password-auth.routes';
import guardedRoutes from './routes/guarded.routes';
import genericEngineRoutes from './routes/generic-engine.routes';
import mandiPriceRoutes from './routes/mandi-price.routes';
import paymentRoutes from './routes/payment.routes';
import verificationRoutes from './routes/verification.routes';
import disputeRoutes from './routes/dispute.routes';
import fpoRoutes from './routes/fpo.routes';
import matchingRoutes from './routes/matching.routes';
import adminRoutes from './routes/admin.routes';
import adRoutes from './routes/ad.routes';
import whatsappChannelRoutes from './routes/whatsapp-channel.routes';

// Local development supports either backend/.env (the documented location) or
// the repository-root .env used by the current workspace. Runtime/deployment
// environment variables always take precedence because dotenv does not override.
const backendEnvPath = resolve(process.cwd(), '.env');
dotenv.config({ path: existsSync(backendEnvPath) ? backendEnvPath : resolve(process.cwd(), '..', '.env') });

if (!process.env.JUDGE_ACCESS_NUMBER) {
  console.warn('[WARNING] JUDGE_ACCESS_NUMBER environment variable is not set. Judge evaluation routes (/api/workspace/judge-*) will fail-closed with HTTP 500.');
}

export const app = express();
app.disable('x-powered-by');

app.use(cors());
app.use(express.json({limit:'128kb'}));
app.use((_req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');next();});

// Health check endpoint
app.get('/health', (req, res) => {
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({
    status: 'ok',
    service: 'KrishiSetu API',
    release:'decision-platform-2026-09-12',
    revision:process.env.RENDER_GIT_COMMIT?.slice(0,12)||'local',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', passwordAuthRoutes);
app.use('/api/workspace', workspaceRoutes);
// The old demo endpoints trusted caller-supplied party IDs. New transactions
// must use the authenticated workspace routes above instead.
app.use('/api', (req, res, next) => {
  // These old read handlers did not consistently enforce participant ownership
  // or district jurisdiction. The scoped workspace API replaces them.
  if (req.method === 'GET' && /^\/(listings|requirements|offers|bookings|payments|verifications|disputes|admin|fpo)(\/|$)/.test(req.path)) {
    res.status(410).json({ success:false,error:'Use the authenticated, role-scoped /api/workspace endpoints.' });
    return;
  }
  if (req.method !== 'GET' && /^\/(listings|requirements|offers|bookings|payments|verifications|disputes|fpo|ads)(\/|$)/.test(req.path)) {
    res.status(410).json({ success: false, error: 'This legacy mutation endpoint has been replaced by /api/workspace.' });
    return;
  }
  next();
});
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/guarded', guardedRoutes);
}
app.use('/api/ads', (_req,res)=>{res.status(410).json({success:false,error:'Advertising is outside the current product scope.'});}); // Legacy records retained.
app.use('/api/channels', whatsappChannelRoutes); // WhatsApp / SMS Channel Adapter routes
app.use('/api', mandiPriceRoutes); // Public / Farmer mandi price check
app.use('/api', genericEngineRoutes); // Authenticated generic engine routes
app.use('/api', matchingRoutes); // Matching Engine routes
app.use('/api', paymentRoutes); // Payment Gateway Stub routes
app.use('/api', verificationRoutes); // Verification & Onboarding routes
app.use('/api', disputeRoutes); // Dispute Resolution routes
app.use('/api', fpoRoutes); // FPO Pooling routes
app.use('/api', adminRoutes); // State Admin Dashboard & Price Heatmap routes




// Global 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});
app.use((error:any,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
 const status=error.type==='entity.too.large'?413:error.type==='entity.parse.failed'?400:500;
 res.status(status).json({success:false,error:status===413?'Request is too large.':status===400?'Send a valid JSON request body.':'The service could not complete this request. Please try again.'});
});
