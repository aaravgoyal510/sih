/** Decision API contracts. All money is safe-integer paise; fixtures are synthetic. */
export type TrustScore = {
  partyId: string;
  role: 'BUYER' | 'FARMER';
  score: number;
  tier: 'HIGH_TRUST' | 'MEDIUM_TRUST' | 'LOW_TRUST';
  kycVerified: boolean;
  totalTransactions: number;
  eligibleOrders: number;
  onTimePayments: number;
  eligiblePayments: number;
  onTimePaymentPct: number | null;
  onTimeFulfillmentPct: number | null;
  disputesCount: number;
  confirmedAtFaultDisputes: number;
  cancelledOrdersCount: number;
  counterpartRating: number | null;
  ratingCount: number;
  provisional: boolean;
  suspended: boolean;
  asOf: string;
  formulaVersion: string;
};

export type WaitScenario =
  | { status: 'AVAILABLE'; horizonDays: number; expectedDeltaPaise: number;
      upsidePaise: number; downsidePaise: number; riskFactor: string; riskChange: string }
  | { status: 'UNAVAILABLE'; reason: string };

export type Recommendation = {
  id: string;
  synthetic: boolean;
  persisted?: boolean;
  createdAt: string;
  validUntil: string;
  explanationVersion: string;
  what: { action: string; counterpartyName?:string; quantityKg: number; timing: string };
  why: {
    expectedNetPaise: number; baselineNetPaise: number|null; deltaPaise: number|null;
    baselineLabel: string; grossPaise: number;
    costs: { label: string; amountPaise: number }[];
    basis: string;
  };
  risk: { level: 'Low' | 'Medium' | 'High'; basis: string[] };
  what_if_wait: WaitScenario;
  buyerTrust: TrustScore | null;
};

export function formatPaise(value: number): string {
  if (!Number.isSafeInteger(value)) throw new Error('Money must be safe-integer paise');
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: value % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

export function signedPaise(value: number): string {
  return `${value >= 0 ? '+' : '−'}${formatPaise(Math.abs(value))}`;
}

export const buyerTrustFixture: TrustScore = {
  partyId: 'fixture-xyz-buyer', role: 'BUYER', score: 87, tier: 'HIGH_TRUST',
  kycVerified: true, totalTransactions: 47, eligibleOrders: 49,
  onTimePayments: 48, eligiblePayments: 50, onTimePaymentPct: 96,
  onTimeFulfillmentPct: null, disputesCount: 1, confirmedAtFaultDisputes: 1,
  cancelledOrdersCount: 2, counterpartRating: 4.7, ratingCount: 20,
  provisional: false, suspended: false,
  asOf: '2026-09-12T06:00:00.000Z', formulaVersion: 'buyer-v1-proposed',
};

export const recommendationFixture: Recommendation = {
  id: 'fixture-sell-xyz', synthetic: true,
  createdAt: '2026-09-12T06:00:00.000Z', validUntil: '2026-09-12T12:00:00.000Z',
  explanationVersion: 'net-v1-proposed',
  what: { action: 'Sell to XYZ buyer', quantityKg: 1000, timing: 'Sell now' },
  why: {
    expectedNetPaise: 2585000, baselineNetPaise: 2300000, deltaPaise: 285000,
    baselineLabel: 'Feasible local sell-now option, same 1,000 kg lot',
    grossPaise: 2800000,
    costs: [{ label: 'Transport', amountPaise: 150000 },
      { label: 'Handling and commission', amountPaise: 65000 }],
    basis: 'Illustrative firm-quality scenario: no storage or incremental losses assumed. Costs are hypothetical, not fetched quotes.',
  },
  risk: { level: 'Medium', basis: ['Pickup timing is not confirmed.',
    'Buyer trust does not remove logistics or rainfall uncertainty.'] },
  what_if_wait: { status: 'AVAILABLE', horizonDays: 3, expectedDeltaPaise: 110000,
    upsidePaise: 160000, downsidePaise: -90000, riskFactor: 'rainfall', riskChange: 'increases' },
  buyerTrust: buyerTrustFixture,
};

export const unavailableWaitFixture: Recommendation = {
  ...recommendationFixture, id: 'fixture-wait-unavailable',
  what_if_wait: { status: 'UNAVAILABLE', reason: 'No validated forecast or current weather evidence.' },
  buyerTrust: null,
};
