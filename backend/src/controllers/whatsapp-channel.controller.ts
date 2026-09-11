import { Request, Response } from 'express';
import { whatsappSmsChannelService } from '../services/whatsapp-sms-channel.service';

/**
 * POST /api/channels/whatsapp/webhook
 * Standard Webhook endpoint for Twilio WhatsApp integration
 */
export const handleWhatsAppWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const fromPhone = req.body.From || req.body.fromPhone || '+919822012345';
    const messageBody = req.body.Body || req.body.message || 'PRICE ONION NASHIK';

    const result = await whatsappSmsChannelService.handleIncomingMessage(fromPhone, messageBody);

    // Return TwiML XML if Twilio request, or JSON if direct REST webhook
    if (req.headers['user-agent']?.includes('Twilio') || req.headers['content-type']?.includes('urlencoded')) {
      res.type('text/xml');
      res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${result.replyText}</Message></Response>`);
    } else {
      res.status(200).json({
        success: true,
        channel: 'WHATSAPP',
        result,
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/channels/whatsapp/simulate
 * Scripted WhatsApp / SMS demo simulator endpoint
 */
export const simulateWhatsAppMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fromPhone = '+919822012345', message = 'PRICE ONION NASHIK' } = req.body;
    const result = await whatsappSmsChannelService.handleIncomingMessage(fromPhone, message);

    res.status(200).json({
      success: true,
      simulationMode: true,
      result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
