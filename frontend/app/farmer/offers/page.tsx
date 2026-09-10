'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Receipt } from 'lucide-react';

export default function MyOffersPlaceholderPage() {
  return (
    <div style={{ paddingTop: '10px' }}>
      <Link href="/farmer/home" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#15803d', textDecoration: 'none', fontWeight: 600, marginBottom: '20px' }}>
        <ArrowLeft size={20} />
        Back to Home
      </Link>

      <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '2px dashed #cbd5e1' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '16px', backgroundColor: '#fae8ff', color: '#c026d3', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
          <Receipt size={36} />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>My Offers & Payments</h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
          Navigation Target Active: Unified list of active items, offer accept/counter/reject, payment tracker, and dispute entry point will be rendered here.
        </p>
      </div>
    </div>
  );
}
