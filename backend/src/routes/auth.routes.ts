import { Router } from 'express';
import { requestOtp, verifyOtp, loginRole, getMe } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
router.use(['/request-otp','/verify-otp'],(_req,res,next)=>{
  if(process.env.NODE_ENV==='production'||process.env.ENABLE_DEV_OTP!=='true'){
    res.status(503).json({success:false,error:'SMS authentication is not configured. Use password sign-in or the designated demonstration profiles.'});return;
  }
  next();
});

router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtp);
router.post('/login-role', (_req, res) => { res.status(410).json({ success: false, error: 'Use the local demo profile selector or phone authentication. Arbitrary role assignment has been removed.' }); });
router.get('/me', authenticateToken, getMe);

export default router;
