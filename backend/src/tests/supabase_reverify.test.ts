import http from 'http';
import { app } from '../app';
import { prisma } from '../config/prisma';
import { ResourceType, ListingStatus } from '@prisma/client';

const PORT = 4098;

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

async function runReverification() {
  const testPhone = `+919999${Math.floor(100000 + Math.random() * 900000)}`;

  const server = app.listen(PORT, async () => {
    console.log(`\n=================================================`);
    console.log(` SUPABASE POSTGRESQL RE-VERIFICATION TEST SUITE `);
    console.log(` Server listening on port ${PORT}`);
    console.log(`=================================================\n`);

    try {
      // -----------------------------------------------------------------------
      // 1. Request OTP (Security Check: Code NOT returned in response body)
      // -----------------------------------------------------------------------
      console.log('--- TEST 1: Request OTP Response (No code returned in response) ---');
      const otpReqRes = await request({
        method: 'POST',
        path: '/api/auth/request-otp',
        body: { phone: testPhone },
      });
      console.log('POST /api/auth/request-otp Output:', JSON.stringify(otpReqRes, null, 2));

      if (otpReqRes.body.code) {
        throw new Error('SECURITY VIOLATION: OTP code should NOT be returned in API response!');
      }

      // -----------------------------------------------------------------------
      // 2. Verify OTP & Real Database Entry Creation
      // -----------------------------------------------------------------------
      console.log('\n--- TEST 2: Verify OTP & DB User/Party Creation ---');
      const verifyRes = await request({
        method: 'POST',
        path: '/api/auth/verify-otp',
        body: {
          phone: testPhone,
          code: '123456',
          name: 'Balasaheb Shinde',
          district: 'Nashik',
          village: 'Pimple Gaon',
        },
      });
      console.log('POST /api/auth/verify-otp Output:', JSON.stringify(verifyRes, null, 2));

      const farmerToken = verifyRes.body.token;
      if (!farmerToken) {
        throw new Error('Token missing in verify-otp response!');
      }

      // -----------------------------------------------------------------------
      // 3. /api/auth/me Database Lookup Test
      // -----------------------------------------------------------------------
      console.log('\n--- TEST 3: /api/auth/me Real Supabase Database Lookup ---');
      const meRes = await request({
        method: 'GET',
        path: '/api/auth/me',
        headers: { Authorization: `Bearer ${farmerToken}` },
      });
      console.log('GET /api/auth/me Output:', JSON.stringify(meRes, null, 2));

      if (meRes.body.party.name !== 'Balasaheb Shinde' || meRes.body.party.village !== 'Pimple Gaon') {
        throw new Error(`DB Lookup Failure! Expected name 'Balasaheb Shinde' & village 'Pimple Gaon', got name '${meRes.body.party?.name}' & village '${meRes.body.party?.village}'`);
      }

      // -----------------------------------------------------------------------
      // 4. PostgreSQL JSONB, Array & Enum Round-Trip Test via Prisma
      // -----------------------------------------------------------------------
      console.log('\n--- TEST 4: PostgreSQL JSONB, Array, and Enum Round-Trip Test ---');
      const partyId = meRes.body.party.id;

      const sampleAttributes = {
        crop: 'Red Onion',
        quantityKg: 7500,
        qualityGrade: 'A',
        photoUrls: [
          'https://atsctuwmoeszrvromxrg.supabase.co/storage/v1/object/public/crops/onion1.jpg',
          'https://atsctuwmoeszrvromxrg.supabase.co/storage/v1/object/public/crops/onion2.jpg',
        ],
        moisturePercentage: 12.5,
      };

      console.log('Writing test Listing row to Supabase Postgres...');
      const createdListing = await prisma.listing.create({
        data: {
          partyId,
          resourceType: ResourceType.CROP_LOT,
          district: 'Nashik',
          price: 26.5,
          priceUnit: 'per_kg',
          status: ListingStatus.OPEN,
          attributes: sampleAttributes,
        },
      });

      console.log('Listing inserted successfully into Supabase. ID:', createdListing.id);

      console.log('Reading back Listing row from Supabase Postgres...');
      const fetchedListing = await prisma.listing.findUnique({
        where: { id: createdListing.id },
        include: { party: true },
      });

      console.log('Fetched Listing from Supabase DB:');
      console.log(JSON.stringify(fetchedListing, null, 2));

      const fetchedAttributes = fetchedListing?.attributes as typeof sampleAttributes;
      if (
        fetchedListing?.resourceType !== ResourceType.CROP_LOT ||
        fetchedListing?.status !== ListingStatus.OPEN ||
        fetchedAttributes.crop !== 'Red Onion' ||
        fetchedAttributes.quantityKg !== 7500 ||
        !Array.isArray(fetchedAttributes.photoUrls) ||
        fetchedAttributes.photoUrls.length !== 2
      ) {
        throw new Error('JSONB / Enum round-trip verification failed!');
      }

      console.log('\n>>> Round-Trip Verified Successfully! JSONB, Arrays, and Enums intact.');

      // Clean up test listing, credibility score, and user/party
      await prisma.listing.delete({ where: { id: createdListing.id } });
      await prisma.credibilityScore.deleteMany({ where: { partyId } });
      await prisma.user.delete({ where: { id: meRes.body.user.id } });
      console.log('Cleaned up test Listing, CredibilityScore, and User records from Supabase DB.');

      console.log('\n=================================================');
      console.log(' ALL STEP 1 RE-VERIFICATION TESTS PASSED (SUPABASE) ');
      console.log('=================================================\n');
    } catch (err: any) {
      console.error('\nRE-VERIFICATION FAILED:', err);
    } finally {
      server.close();
      await prisma.$disconnect();
    }
  });
}

runReverification();
