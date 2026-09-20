import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KrishiSetu',
    short_name: 'KrishiSetu',
    description: 'Market linkage and farm services for Maharashtra',
    start_url: '/farmer/home',
    display: 'standalone',
    background_color: '#f6f8f4',
    theme_color: '#176448',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
