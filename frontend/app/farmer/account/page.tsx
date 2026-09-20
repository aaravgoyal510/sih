import { Suspense } from 'react';
import FarmerAccount from '../../components/FarmerAccount';

export default function Page() {
  return (
    <Suspense fallback={<div className="ks-loading">Loading…</div>}>
      <FarmerAccount />
    </Suspense>
  );
}
