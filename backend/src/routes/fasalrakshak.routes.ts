import { Router } from 'express';
import {
  logFarmActivity,
  getFarmActivities,
  submitCropIssue,
  getDailyAdvisory,
} from '../controllers/fasalrakshak.controller';

const router = Router();

router.post('/activity', logFarmActivity);
router.get('/activity/:partyId', getFarmActivities);
router.post('/crop-issue', submitCropIssue);
router.get('/daily-advisory/:partyId', getDailyAdvisory);

export default router;
