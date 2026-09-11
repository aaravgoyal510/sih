import { Router } from 'express';
import { handleWhatsAppWebhook, simulateWhatsAppMessage } from '../controllers/whatsapp-channel.controller';

const router = Router();

router.post('/whatsapp/webhook', handleWhatsAppWebhook);
router.post('/whatsapp/simulate', simulateWhatsAppMessage);

export default router;
