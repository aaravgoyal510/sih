import { Router } from 'express';
import {
  createListing,
  getListings,
  getListingById,
  createRequirement,
  getRequirements,
  createOffer,
  updateOfferStatus,
  getBookingById,
} from '../controllers/generic-engine.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateResourceAttributesMiddleware } from '../middleware/validation.middleware';

const router = Router();

// Apply JWT authentication middleware to generic engine endpoints
router.use(authenticateToken);

// Listing endpoints
router.post('/listings', validateResourceAttributesMiddleware, createListing);
router.get('/listings', getListings);
router.get('/listings/:id', getListingById);

// Requirement endpoints
router.post('/requirements', validateResourceAttributesMiddleware, createRequirement);
router.get('/requirements', getRequirements);

// Offer endpoints
router.post('/offers', createOffer);
router.patch('/offers/:id/status', updateOfferStatus);

// Booking endpoints
router.get('/bookings/:id', getBookingById);

export default router;
