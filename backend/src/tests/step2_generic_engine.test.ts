import http from 'http';
import { app } from '../app';
import { prisma } from '../config/prisma';

const PORT = 4097;

function request(options: { method: string; path: string; headers?: Record<string, string>; body?: any }): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const postData = options.body ? JSON.stringify(options.body) : '';
    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path: options.path,
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          ...(options.headers || {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 500, body: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode || 500, body: data });
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

async function runStep2Tests() {
  const server = app.listen(PORT, async () => {
    console.log(`\n=================================================`);
    console.log(` BUILD-ORDER STEP 2: GENERIC ENGINE TEST SUITE `);
    console.log(` Server running on port ${PORT}`);
    console.log(`=================================================\n`);

    try {
      // 1. Setup Auth Users
      console.log('--- 1. Setting up Parties for CROP_LOT, COLD_STORAGE, TRANSPORT ---');
      const farmerRes = await request({
        method: 'POST',
        path: '/api/auth/verify-otp',
        body: {
          phone: `+919800${Math.floor(100000 + Math.random() * 900000)}`,
          code: '123456',
          name: 'Balasaheb Patil',
          district: 'Nashik',
          village: 'Pimple Gaon',
        },
      });
      const farmerToken = farmerRes.body.token;

      const storageRes = await request({
        method: 'POST',
        path: '/api/auth/login-role',
        body: {
          phone: `+919811${Math.floor(100000 + Math.random() * 900000)}`,
          role: 'STORAGE_OPERATOR',
          name: 'Sahyadri Cold Storage',
          district: 'Nashik',
        },
      });
      const storageToken = storageRes.body.token;

      const transportRes = await request({
        method: 'POST',
        path: '/api/auth/login-role',
        body: {
          phone: `+919822${Math.floor(100000 + Math.random() * 900000)}`,
          role: 'TRANSPORT_OPERATOR',
          name: 'Maha Express Logistics',
          district: 'Nashik',
        },
      });
      const transportToken = transportRes.body.token;

      console.log('Parties initialized successfully.');

      // 2. Test Listing Creation for CROP_LOT, COLD_STORAGE, TRANSPORT
      console.log('\n--- 2. Creating Listings via Generic Engine Validation Registry ---');

      // 2a. CROP_LOT
      const cropListingRes = await request({
        method: 'POST',
        path: '/api/listings',
        headers: { Authorization: `Bearer ${farmerToken}` },
        body: {
          resourceType: 'CROP_LOT',
          district: 'Nashik',
          price: 25.0,
          priceUnit: 'per_kg',
          attributes: {
            crop: 'Red Onion',
            quantityKg: 10000,
            qualityGrade: 'A',
            moisturePercentage: 12.0,
            photoUrls: ['https://supabase.co/storage/onion.jpg'],
          },
        },
      });
      console.log('Created CROP_LOT Listing:', cropListingRes.body.listing?.id, cropListingRes.body.listing?.attributes);

      // 2b. COLD_STORAGE
      const storageListingRes = await request({
        method: 'POST',
        path: '/api/listings',
        headers: { Authorization: `Bearer ${storageToken}` },
        body: {
          resourceType: 'COLD_STORAGE',
          district: 'Nashik',
          price: 15.0,
          priceUnit: 'per_quintal_per_day',
          attributes: {
            capacityQuintal: 500,
            cropSuitability: ['Red Onion', 'Potato', 'Grapes'],
            tempRange: '2°C - 4°C',
          },
        },
      });
      console.log('Created COLD_STORAGE Listing:', storageListingRes.body.listing?.id, storageListingRes.body.listing?.attributes);

      // 2c. TRANSPORT
      const transportListingRes = await request({
        method: 'POST',
        path: '/api/listings',
        headers: { Authorization: `Bearer ${transportToken}` },
        body: {
          resourceType: 'TRANSPORT',
          district: 'Nashik',
          price: 12000.0,
          priceUnit: 'per_trip',
          attributes: {
            vehicleType: '10-Ton Eicher Open Truck',
            capacityKg: 10000,
            route: { from: 'Nashik Mandi', to: 'Vashi APMC Mumbai' },
          },
        },
      });
      console.log('Created TRANSPORT Listing:', transportListingRes.body.listing?.id, transportListingRes.body.listing?.attributes);

      // 2d. Test Invalid Attribute Rejection by Middleware
      console.log('\n--- 3. Testing Middleware Rejection of Invalid Attributes ---');
      const invalidListingRes = await request({
        method: 'POST',
        path: '/api/listings',
        headers: { Authorization: `Bearer ${farmerToken}` },
        body: {
          resourceType: 'CROP_LOT',
          district: 'Nashik',
          price: 25.0,
          attributes: {
            crop: 'Red Onion',
            quantityKg: 10000,
            qualityGrade: 'INVALID_GRADE_X', // Invalid enum value
          },
        },
      });
      console.log('Invalid attribute submission response (Should be 400):', invalidListingRes.status, invalidListingRes.body.error);

      if (invalidListingRes.status !== 400) {
        throw new Error('Validation middleware failed to reject invalid attributes!');
      }

      // 4. Test Offer & Booking Lifecycle
      console.log('\n--- 4. Testing Offer & Automatic Booking Lifecycle ---');
      const cropListingId = cropListingRes.body.listing.id;

      // Post offer
      const offerRes = await request({
        method: 'POST',
        path: '/api/offers',
        headers: { Authorization: `Bearer ${storageToken}` },
        body: {
          listingId: cropListingId,
          price: 24.5,
        },
      });
      console.log('Created Offer:', offerRes.body.offer?.id, 'Price:', offerRes.body.offer?.price, 'Status:', offerRes.body.offer?.status);

      const offerId = offerRes.body.offer.id;

      // Accept offer -> triggers automatic Booking creation & Listing status update to BOOKED
      const acceptRes = await request({
        method: 'PATCH',
        path: `/api/offers/${offerId}/status`,
        headers: { Authorization: `Bearer ${farmerToken}` },
        body: { status: 'ACCEPTED' },
      });
      console.log('Accepted Offer & Auto-Created Booking:', acceptRes.body.booking?.id, 'Listing Status:', acceptRes.body.offer?.listing?.status);

      const bookingId = acceptRes.body.booking.id;

      // Fetch booking details
      const bookingDetailsRes = await request({
        method: 'GET',
        path: `/api/bookings/${bookingId}`,
        headers: { Authorization: `Bearer ${farmerToken}` },
      });
      console.log('Fetched Booking Details from DB:', JSON.stringify(bookingDetailsRes.body.booking, null, 2));

      // Clean up test data
      console.log('\n--- 5. Cleaning Up Test Data ---');
      await prisma.booking.delete({ where: { id: bookingId } });
      await prisma.offer.delete({ where: { id: offerId } });
      await prisma.listing.deleteMany({
        where: {
          id: {
            in: [cropListingId, storageListingRes.body.listing.id, transportListingRes.body.listing.id],
          },
        },
      });
      await prisma.credibilityScore.deleteMany({
        where: {
          partyId: {
            in: [farmerRes.body.party.id, storageRes.body.party.id, transportRes.body.party.id],
          },
        },
      });
      await prisma.user.deleteMany({
        where: {
          id: {
            in: [farmerRes.body.user.id, storageRes.body.user.id, transportRes.body.user.id],
          },
        },
      });
      console.log('Test data cleaned up successfully from Supabase DB.');

      console.log('\n=================================================');
      console.log(' STEP 2 GENERIC ENGINE TESTS PASSED SUCCESSFULLY ');
      console.log('=================================================\n');
    } catch (err: any) {
      console.error('STEP 2 TEST FAILED:', err);
    } finally {
      server.close();
      await prisma.$disconnect();
    }
  });
}

runStep2Tests();
