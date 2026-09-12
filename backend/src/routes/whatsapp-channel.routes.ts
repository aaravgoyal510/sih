import { Router } from 'express';
import { handleWhatsAppWebhook, simulateWhatsAppMessage } from '../controllers/whatsapp-channel.controller';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();

// Do not accept caller-supplied identities before gateway signature validation exists.
router.post('/whatsapp/webhook', (_req, res) => { res.status(503).json({ success: false, error: 'WhatsApp gateway and signed webhook verification are not configured.' }); });
router.post('/whatsapp/simulate', authenticateToken, (req: AuthenticatedRequest, res, next) => {
  if (process.env.NODE_ENV === 'production') { res.status(404).json({ success: false, error: 'Simulator disabled' }); return; }
  req.body.fromPhone = req.user?.phone;
  next();
}, simulateWhatsAppMessage);

export default router;
