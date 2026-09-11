// Always call the frontend origin. Next forwards this prefix to the API.
// This also works over a port-3000 tunnel: localhost belongs to the Next server,
// never to the remote visitor's browser. See next.config.js / BACKEND_URL.
export const API_URL = '/api/backend';
