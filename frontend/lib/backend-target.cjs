// Server/config only. Never accept a proxy destination from a request parameter.
function backendTarget(env = process.env) {
  const configured = env.BACKEND_URL || env.NEXT_PUBLIC_BACKEND_URL || env.NEXT_PUBLIC_API_URL;
  if (!configured && env.VERCEL === '1') {
    throw new Error('Set BACKEND_URL to your Render service origin in Vercel, then redeploy.');
  }
  let url;
  try { url = new URL((configured || 'http://127.0.0.1:4000').trim()); }
  catch { throw new Error('BACKEND_URL must be an absolute http(s) URL.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('BACKEND_URL must be an http(s) origin without credentials, query or fragment.');
  }
  // Accept the common accidental /api or /health suffix, but not arbitrary paths.
  if (!['', '/', '/api', '/api/', '/health', '/health/'].includes(url.pathname)) {
    throw new Error('BACKEND_URL must point to the backend origin, not an endpoint.');
  }
  if (env.VERCEL === '1' && (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) {
    throw new Error('Vercel requires a reachable HTTPS backend URL, not localhost.');
  }
  return url.origin;
}
module.exports = { backendTarget };
