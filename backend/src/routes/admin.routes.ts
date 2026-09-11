import { Router } from 'express';
import { getStateDashboard, getPriceHeatmap, getPortalSyncLogs } from '../controllers/admin.controller';
import { authenticateToken, requireRoles } from '../middleware/auth.middleware';
import { PartyRole } from '@prisma/client';

const router = Router();

// Apply authentication & role guards
// Allow STATE_ADMIN, PLATFORM_ADMIN, or DISTRICT_ADMIN for state dashboard & heatmap endpoints
router.use(authenticateToken);
router.use(requireRoles(PartyRole.STATE_ADMIN, PartyRole.PLATFORM_ADMIN, PartyRole.DISTRICT_ADMIN));

router.get('/admin/state-dashboard', getStateDashboard);
router.get('/admin/price-heatmap', getPriceHeatmap);
router.get('/admin/portal-sync-logs', getPortalSyncLogs);

export default router;

