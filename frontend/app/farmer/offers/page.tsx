import { Suspense } from 'react';
import FarmerOffers from '../../components/FarmerOffers';

export default function Page() {
  return (
    <Suspense fallback={<div className="ks-loading">Loading…</div>}>
      <FarmerOffers />
    </Suspense>
  );
}
