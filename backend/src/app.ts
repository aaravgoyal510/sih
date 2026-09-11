import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
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
import fasalrakshakRoutes from './routes/fasalrakshak.routes';

dotenv.config();

export const app = express();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'KrishiSetu API',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/guarded', guardedRoutes);
app.use('/api/ads', adRoutes); // Marketplace Ads routes (Verified Seller Gated)
app.use('/api/channels', whatsappChannelRoutes); // WhatsApp / SMS Channel Adapter routes
app.use('/api/fasalrakshak', fasalrakshakRoutes); // FasalRakshak On-Farm Decision Support Module
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
