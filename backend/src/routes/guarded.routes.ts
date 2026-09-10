import { Router } from 'express';
import { authenticateToken, requireRoles, AuthenticatedRequest } from '../middleware/auth.middleware';
import { PartyRole } from '@prisma/client';

const router = Router();

// Apply authentication middleware to all guarded test routes
router.use(authenticateToken);

const createHandler = (roleName: string) => {
  return (req: AuthenticatedRequest, res: any) => {
    res.status(200).json({
      success: true,
      message: `Access granted to ${roleName} guarded route`,
      user: req.user,
    });
  };
};

// Route guards for each of the 11 PartyRole values
router.get('/farmer', requireRoles(PartyRole.FARMER), createHandler('FARMER'));
router.get('/fpo-admin', requireRoles(PartyRole.FPO_ADMIN), createHandler('FPO_ADMIN'));
router.get('/buyer', requireRoles(PartyRole.BUYER), createHandler('BUYER'));
router.get('/storage-operator', requireRoles(PartyRole.STORAGE_OPERATOR), createHandler('STORAGE_OPERATOR'));
router.get('/transport-operator', requireRoles(PartyRole.TRANSPORT_OPERATOR), createHandler('TRANSPORT_OPERATOR'));
router.get('/equipment-provider', requireRoles(PartyRole.EQUIPMENT_PROVIDER), createHandler('EQUIPMENT_PROVIDER'));
router.get('/labor-contractor', requireRoles(PartyRole.LABOR_CONTRACTOR), createHandler('LABOR_CONTRACTOR'));
router.get('/input-supplier', requireRoles(PartyRole.INPUT_SUPPLIER), createHandler('INPUT_SUPPLIER'));
router.get('/district-admin', requireRoles(PartyRole.DISTRICT_ADMIN), createHandler('DISTRICT_ADMIN'));
router.get('/state-admin', requireRoles(PartyRole.STATE_ADMIN), createHandler('STATE_ADMIN'));
router.get('/platform-admin', requireRoles(PartyRole.PLATFORM_ADMIN), createHandler('PLATFORM_ADMIN'));

// Composite role guard example (any admin role)
router.get(
  '/admin-any',
  requireRoles(PartyRole.DISTRICT_ADMIN, PartyRole.STATE_ADMIN, PartyRole.PLATFORM_ADMIN),
  createHandler('ANY_ADMIN')
);

export default router;
