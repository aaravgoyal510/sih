const assert = require('node:assert/strict');
const { backendTarget } = require('../lib/backend-target.cjs');
assert.equal(backendTarget({}), 'http://127.0.0.1:4000');
assert.equal(backendTarget({ BACKEND_URL: ' https://example.onrender.com/api/ ' }), 'https://example.onrender.com');
assert.equal(backendTarget({ BACKEND_URL: 'https://example.onrender.com/health' }), 'https://example.onrender.com');
assert.equal(backendTarget({ NEXT_PUBLIC_BACKEND_URL: 'https://new.example', NEXT_PUBLIC_API_URL: 'http://localhost:4000' }), 'https://new.example');
assert.equal(backendTarget({ BACKEND_URL: 'https://server.example', NEXT_PUBLIC_BACKEND_URL: 'https://legacy.example' }), 'https://server.example');
assert.equal(backendTarget({ NEXT_PUBLIC_API_URL: 'https://legacy.example/' }), 'https://legacy.example');
for (const env of [
  { VERCEL: '1' }, { VERCEL: '1', BACKEND_URL: 'http://localhost:4000' },
  { VERCEL: '1', BACKEND_URL: 'https://127.0.0.1' },
  { BACKEND_URL: 'ftp://example.com' }, { BACKEND_URL: 'https://user:secret@example.com' },
  { BACKEND_URL: 'https://example.com?key=secret' }, { BACKEND_URL: 'https://example.com/other' },
]) assert.throws(() => backendTarget(env));
console.log('Backend target checks passed: local tunnel default, environment precedence, URL normalization and invalid deployment guards.');
