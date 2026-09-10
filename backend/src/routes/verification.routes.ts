import { Router } from 'express';
import {
  submitVerification,
  getDistrictAdminQueue,
  reviewVerification,
} from '../controllers/verification.controller';

const router = Router();

router.post('/verifications/submit', submitVerification);
router.get('/verifications/district-queue', getDistrictAdminQueue);
router.post('/verifications/:verificationId/review', reviewVerification);

export default router;
