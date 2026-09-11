import { Request, Response } from 'express';
import { paymentGatewayAdapter } from '../adapters/payment-gateway.adapter';
import { PaymentStatus } from '@prisma/client';

export const initiatePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookingId, amount } = req.body;
    if (!bookingId || typeof amount !== 'number') {
      res.status(400).json({ success: false, error: 'bookingId and numeric amount are required' });
      return;
    }

    const result = await paymentGatewayAdapter.initiate(bookingId, amount);

    res.status(200).json({
      success: true,
      result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getPaymentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const result = await paymentGatewayAdapter.getStatus(bookingId as string);

    res.status(200).json({
      success: true,
      result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updatePaymentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookingId, status } = req.body;
    if (!bookingId || !status || !Object.values(PaymentStatus).includes(status)) {
      res.status(400).json({ success: false, error: `Invalid status or missing bookingId` });
      return;
    }

    const result = await paymentGatewayAdapter.updateStatus(bookingId, status as PaymentStatus);

    res.status(200).json({
      success: true,
      result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
