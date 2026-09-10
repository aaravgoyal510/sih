import { Router } from 'express';
import { getMandiPrices } from '../controllers/mandi-price.controller';

const router = Router();

// Public / Farmer endpoint for checking mandi prices (with fallback)
router.get('/mandi-prices', getMandiPrices);

export default router;
