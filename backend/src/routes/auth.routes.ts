import { Router } from 'express';
import { requestOtp, verifyOtp, loginRole, getMe } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtp);
router.post('/login-role', loginRole);
router.get('/me', authenticateToken, getMe);

export default router;
