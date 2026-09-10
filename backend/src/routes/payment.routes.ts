import { Router } from 'express';
import { initiatePayment, getPaymentStatus, updatePaymentStatus } from '../controllers/payment.controller';

const router = Router();

router.post('/payments/initiate', initiatePayment);
router.get('/payments/:bookingId/status', getPaymentStatus);
router.post('/payments/simulate-status', updatePaymentStatus);

export default router;
