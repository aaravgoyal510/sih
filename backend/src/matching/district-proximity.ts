/**
 * District Proximity Matrix & Heuristic for Maharashtra
 * Used to calculate distance scores (0 - 100) when full geocoding/GPS coordinates are absent.
 */

const MAHARASHTRA_DIVISIONS: Record<string, string[]> = {
  KHANDESH: ['Nashik', 'Ahmednagar', 'Jalgaon', 'Dhule', 'Nandurbar'],
  PASCHIM: ['Pune', 'Satara', 'Sangli', 'Solapur', 'Kolhapur'],
  MARATHWADA: ['Chhatrapati Sambhajinagar', 'Aurangabad', 'Jalna', 'Beed', 'Latur', 'Dharashiv', 'Nanded', 'Parbhani', 'Hingoli'],
  KONKAN: ['Mumbai', 'Mumbai Suburban', 'Thane', 'Palghar', 'Raigad', 'Ratnagiri', 'Sindhudurg'],
  VIDARBHA_WEST: ['Amravati', 'Akola', 'Buldhana', 'Yavatmal', 'Washim'],
  VIDARBHA_EAST: ['Nagpur', 'Wardha', 'Bhandara', 'Gondia', 'Chandrapur', 'Gadchiroli'],
};

export function getDistrictDistanceScore(districtA?: string | null, districtB?: string | null): number {
  if (!districtA || !districtB) return 50; // Default neutral score if district missing
  const dA = districtA.trim().toLowerCase();
  const dB = districtB.trim().toLowerCase();

  if (dA === dB) {
    return 100; // Same district (0 - 20 km) -> 100%
  }

  // Find division for each district
  let divA: string | null = null;
  let divB: string | null = null;

  for (const [division, districts] of Object.entries(MAHARASHTRA_DIVISIONS)) {
    if (districts.some((d) => d.toLowerCase() === dA)) divA = division;
    if (districts.some((d) => d.toLowerCase() === dB)) divB = division;
  }

  if (divA && divB && divA === divB) {
    return 80; // Same division / neighbor district (~50-100 km) -> 80%
  }

  if (divA && divB) {
    return 50; // Same state, different division (~150-250 km) -> 50%
  }

  return 30; // Different region / fallback -> 30%
}
