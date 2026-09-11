import { Router } from 'express';
import { createAd, getAds } from '../controllers/ad.controller';

const router = Router();

router.post('/', createAd);
router.get('/', getAds);

export default router;

