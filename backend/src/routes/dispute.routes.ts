import { Router } from 'express';
import { raiseDispute, getDistrictAdminDisputeQueue, reviewDispute } from '../controllers/dispute.controller';

const router = Router();

router.post('/disputes/raise', raiseDispute);
router.get('/disputes/district-queue', getDistrictAdminDisputeQueue);
router.post('/disputes/:disputeId/review', reviewDispute);

export default router;
