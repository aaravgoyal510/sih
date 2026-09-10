import { Router } from 'express';
import { getMatchesForRequirement } from '../controllers/matching.controller';

const router = Router();

router.get('/requirements/:requirementId/matches', getMatchesForRequirement);

export default router;
