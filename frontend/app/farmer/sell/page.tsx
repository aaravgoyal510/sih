'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Sprout } from 'lucide-react';

export default function SellCropPlaceholderPage() {
  return (
    <div style={{ paddingTop: '10px' }}>
      <Link href="/farmer/home" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#15803d', textDecoration: 'none', fontWeight: 600, marginBottom: '20px' }}>
        <ArrowLeft size={20} />
        Back to Home
      </Link>

      <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '2px dashed #cbd5e1' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '16px', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
          <Sprout size={36} />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Sell My Crop</h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
          Navigation Target Active: Lot creation form, net-realization recommendation, and pooling prompt will be built here.
        </p>
      </div>
    </div>
  );
}
