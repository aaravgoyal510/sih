const { PHASE_DEVELOPMENT_SERVER } = require('next/constants');
const { backendTarget } = require('./lib/backend-target.cjs');
module.exports = (phase) => ({
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
  async rewrites() {
    const origin = backendTarget();
    return [{ source: '/api/backend/:path*', destination: `${origin}/:path*` }];
  },
  async headers() {
    return [{ source: '/api/backend/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] }];
  },
});
