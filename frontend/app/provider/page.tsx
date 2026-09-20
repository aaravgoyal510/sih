import { Suspense } from 'react';
import Workspace from '../components/Workspace';

export default function Page() {
  return (
    <Suspense fallback={<div className="ks-loading">Loading…</div>}>
      <Workspace initialView="overview" audience="provider" />
    </Suspense>
  );
}
