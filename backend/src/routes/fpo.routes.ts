import { Router } from 'express';
import { poolListings, lookupFpoRegistry } from '../controllers/fpo.controller';

const router = Router();

router.post('/fpo/pool-listings', poolListings);
router.get('/fpo/registry-lookup/:cinOrRegNo', lookupFpoRegistry);

export default router;

