import http from 'http';
import { app } from '../app';
import { PartyRole } from '@prisma/client';

const PORT = 4099;

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

async function runTests() {
  const server = app.listen(PORT, async () => {
    console.log(`[TEST SERVER STARTED] Running on port ${PORT}`);

    try {
      console.log('\n--- 1. Testing OTP-based Farmer Login Flow ---');
      const otpReq = await request({
        method: 'POST',
        path: '/api/auth/request-otp',
        body: { phone: '+919876543210' },
      });
      console.log('Request OTP Output:', otpReq);

      const otpVerify = await request({
        method: 'POST',
        path: '/api/auth/verify-otp',
        body: {
          phone: '+919876543210',
          code: '123456',
          name: 'Ramesh Patil',
          district: 'Nashik',
        },
      });
      console.log('Verify OTP Output:', otpVerify);

      const farmerToken = otpVerify.body.token;
      if (!farmerToken) {
        throw new Error('Failed to issue JWT token for Farmer!');
      }

      console.log('\n--- 2. Testing /api/auth/me Profile Route ---');
      const meRes = await request({
        method: 'GET',
        path: '/api/auth/me',
        headers: { Authorization: `Bearer ${farmerToken}` },
      });
      console.log('/api/auth/me Output:', meRes);

      console.log('\n--- 3. Testing Role Guards across all 11 PartyRoles ---');

      // Test Farmer access to Farmer route (Authorized)
      const farmerOnFarmerRoute = await request({
        method: 'GET',
        path: '/api/guarded/farmer',
        headers: { Authorization: `Bearer ${farmerToken}` },
      });
      console.log('Farmer on /api/guarded/farmer:', farmerOnFarmerRoute.status, farmerOnFarmerRoute.body.message);

      // Test Farmer access to Buyer route (Forbidden)
      const farmerOnBuyerRoute = await request({
        method: 'GET',
        path: '/api/guarded/buyer',
        headers: { Authorization: `Bearer ${farmerToken}` },
      });
      console.log('Farmer on /api/guarded/buyer (Should be 403):', farmerOnBuyerRoute.status, farmerOnBuyerRoute.body.error);

      // Test each of the 11 PartyRoles
      const roles: PartyRole[] = [
        'FARMER',
        'FPO_ADMIN',
        'BUYER',
        'STORAGE_OPERATOR',
        'TRANSPORT_OPERATOR',
        'EQUIPMENT_PROVIDER',
        'LABOR_CONTRACTOR',
        'INPUT_SUPPLIER',
        'DISTRICT_ADMIN',
        'STATE_ADMIN',
        'PLATFORM_ADMIN',
      ];

      for (const role of roles) {
        const routeSlug = role.toLowerCase().replace(/_/g, '-');
        // Login as role
        const roleLogin = await request({
          method: 'POST',
          path: '/api/auth/login-role',
          body: { phone: `+91900000000${roles.indexOf(role)}`, role, name: `Demo ${role}`, district: 'Pune' },
        });

        const token = roleLogin.body.token;
        const testRes = await request({
          method: 'GET',
          path: `/api/guarded/${routeSlug}`,
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log(`Role [${role}] on /api/guarded/${routeSlug}: Status ${testRes.status} -> ${testRes.body.success ? 'PASSED' : 'FAILED'}`);
      }

      console.log('\n=================================================');
      console.log(' ALL STEP 1 AUTH & ROLE GUARD TESTS COMPLETED! ');
      console.log('=================================================\n');
    } catch (err) {
      console.error('Test Execution Error:', err);
    } finally {
      server.close();
    }
  });
}

runTests();
