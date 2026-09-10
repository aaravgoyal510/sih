import { Router } from 'express';
import { poolListings } from '../controllers/fpo.controller';

const router = Router();

router.post('/fpo/pool-listings', poolListings);

export default router;
