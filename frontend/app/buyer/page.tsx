'use client';

import React, { useState } from 'react';
import {
  Search,
  PlusCircle,
  Package,
  Sparkles,
  MapPin,
  CheckCircle2,
  Send,
  Lock,
  Building2,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';

export default function BuyerDashboardPage() {
  const [activeTab, setActiveTab] = useState<'browse' | 'post' | 'orders'>('browse');

  // Form State for Post Requirement
  const [reqCrop, setReqCrop] = useState('Onion');
  const [reqDistrict, setReqDistrict] = useState('Nashik');
  const [reqQty, setReqQty] = useState('5000');
  const [reqBudget, setReqBudget] = useState('20');
  const [reqGrade, setReqGrade] = useState('A');
  const [postSuccess, setPostSuccess] = useState(false);

  // Offer Creation Modal / Action State
  const [selectedLotForOffer, setSelectedLotForOffer] = useState<any | null>(null);
  const [offerPriceInput, setOfferPriceInput] = useState('19.5');
  const [offerSentSuccess, setOfferSentSuccess] = useState(false);

  // Real Seeded Data matching Step 17 DB state
  const buyerProfile = {
    name: 'Reliance Fresh Wholesale',
    company: 'Reliance Retail Bulk Procurement Ltd.',
    district: 'Mumbai / Nashik Hub',
    kycStatus: 'VERIFIED_BUYER',
    gstin: '27AAAAA0000A1Z5',
    credibilityScore: 88,
  };

  // Seeded Matched Lots from Step 17 (Bhausaheb Patil, Sitaram Deshmukh, Sahyadri FPO)
  const matchedLots = [
    {
      id: 'lot-001',
      farmerName: 'Bhausaheb Patil',
      farmerDistrict: 'Nashik (Lasalgaon)',
      crop: 'Onion',
      quantityKg: 5000,
      pricePerKg: 19.5,
      qualityGrade: 'Grade A (Medium Pink)',
      matchScorePct: 96,
      credibilityScore: 92,
      verificationStatus: 'APPROVED',
      verificationDoc: 'Land Revenue 7/12 Verified',
      isPooled: false,
    },
    {
      id: 'lot-002',
      farmerName: 'Sahyadri Farmers Producer Co. (Pooled FPO Lot)',
      farmerDistrict: 'Nashik (Dindori Cluster)',
      crop: 'Onion',
      quantityKg: 25000,
      pricePerKg: 19.2,
      qualityGrade: 'Grade A (Export Quality)',
      matchScorePct: 91,
      credibilityScore: 95,
      verificationStatus: 'APPROVED',
      verificationDoc: 'SFAC/NABARD FPO Registry Ref: SFAC-MH-FPO-2022-9988',
      isPooled: true,
      participatingFarmersCount: 8,
    },
    {
      id: 'lot-003',
      farmerName: 'Sitaram Deshmukh',
      farmerDistrict: 'Latur (Murud)',
      crop: 'Soybean',
      quantityKg: 10000,
      pricePerKg: 44.0,
      qualityGrade: 'Grade A (Yellow Oil-seed)',
      matchScorePct: 89,
      credibilityScore: 85,
      verificationStatus: 'APPROVED',
      verificationDoc: 'Aadhaar + Land Holding Verified',
      isPooled: false,
    },
  ];

  // Active Procurement Orders & Escrow Tracking from Step 17
  const activeOrders = [
    {
      id: 'BKG-NSK-2026-991',
      crop: 'Onion',
      quantityKg: 5000,
      pricePerKg: 19.5,
      totalAmount: 97500,
      farmerName: 'Bhausaheb Patil',
      farmerDistrict: 'Nashik',
      fulfillmentStatus: 'IN_PROGRESS',
      paymentStatus: 'ESCROWED', // PENDING -> ESCROWED -> RELEASED
      logisticsNote: 'Dispatched via Maha Super Freight Logistics Truck #MH-15-AB-1234',
      date: '2026-09-11',
    },
    {
      id: 'BKG-LTR-2026-882',
      crop: 'Soybean',
      quantityKg: 10000,
      pricePerKg: 44.0,
      totalAmount: 440000,
      farmerName: 'Sitaram Deshmukh',
      farmerDistrict: 'Latur',
      fulfillmentStatus: 'COMPLETED',
      paymentStatus: 'RELEASED',
      logisticsNote: 'Delivered to Latur Processing Unit. Quality inspected and approved.',
      date: '2026-09-10',
    },
  ];

  const handlePostRequirement = (e: React.FormEvent) => {
    e.preventDefault();
    setPostSuccess(true);
    setTimeout(() => {
      setPostSuccess(false);
      setActiveTab('browse');
    }, 1500);
  };

  const handleSendOffer = () => {
    setOfferSentSuccess(true);
    setTimeout(() => {
      setOfferSentSuccess(false);
      setSelectedLotForOffer(null);
      setActiveTab('orders');
    }, 1500);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Top Navigation Bar */}
      <header style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: '#fff' }}>
            <Building2 size={22} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              KrishiSetu <span style={{ color: '#60a5fa', fontWeight: 400 }}>| Buyer Procurement Portal</span>
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>Institutional Sourcing & Escrow Settlement Hub</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f1f5f9' }}>{buyerProfile.name}</div>
            <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
              <ShieldCheck size={14} /> VERIFIED BUYER • GSTIN: {buyerProfile.gstin}
            </div>
          </div>
          <div style={{ backgroundColor: '#1e3a8a', color: '#93c5fd', padding: '8px 14px', borderRadius: '8px', border: '1px solid #3b82f6', fontSize: '0.85rem', fontWeight: 600 }}>
            Credibility Score: <span style={{ color: '#fff', fontWeight: 700 }}>{buyerProfile.credibilityScore}/100</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Stats Quick Banner */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '14px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Active Requirements</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc', marginTop: '6px' }}>3 Posted</div>
            <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrendingUp size={14} /> {matchedLots.length} Matched Farmer Lots
            </div>
          </div>
          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '14px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Escrow Balance Held</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#60a5fa', marginTop: '6px' }}>₹97,500</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Booking BKG-NSK-2026-991</div>
          </div>
          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '14px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Completed Transactions</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#34d399', marginTop: '6px' }}>₹4,40,000</div>
            <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '4px' }}>100% Escrow Settled</div>
          </div>
          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '14px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Avg Net Price Savings</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f59e0b', marginTop: '6px' }}>8.4%</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>vs Mandi Intermediary Rates</div>
          </div>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #334155', paddingBottom: '16px', marginBottom: '28px' }}>
          <button
            onClick={() => setActiveTab('browse')}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeTab === 'browse' ? '#2563eb' : '#1e293b',
              color: activeTab === 'browse' ? '#ffffff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Search size={18} /> Browse Matched Farmer Lots ({matchedLots.length})
          </button>
          <button
            onClick={() => setActiveTab('post')}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeTab === 'post' ? '#2563eb' : '#1e293b',
              color: activeTab === 'post' ? '#ffffff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <PlusCircle size={18} /> Post New Requirement / RFQ
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeTab === 'orders' ? '#2563eb' : '#1e293b',
              color: activeTab === 'orders' ? '#ffffff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Package size={18} /> Active Procurement & Escrow Tracker ({activeOrders.length})
          </button>
        </div>

        {/* TAB 1: BROWSE MATCHED FARMER LOTS */}
        {activeTab === 'browse' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                Matched Produce Lots (Ranked by Fit Score & Credibility)
              </h2>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Filter: <strong style={{ color: '#60a5fa' }}>Onion & Soybean in Maharashtra</strong>
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
              {matchedLots.map((lot) => (
                <div key={lot.id} style={{ backgroundColor: '#1e293b', borderRadius: '16px', border: '1px solid #334155', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                  
                  {/* Top Badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <span style={{ backgroundColor: '#1e3a8a', color: '#60a5fa', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Sparkles size={13} /> {lot.matchScorePct}% Match Fit
                    </span>
                    {lot.isPooled ? (
                      <span style={{ backgroundColor: '#065f46', color: '#34d399', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                        FPO POOLED LOT ({lot.participatingFarmersCount} Farmers)
                      </span>
                    ) : (
                      <span style={{ backgroundColor: '#312e81', color: '#c7d2fe', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>
                        INDIVIDUAL FARMER
                      </span>
                    )}
                  </div>

                  {/* Header info */}
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>{lot.farmerName}</h3>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={14} /> {lot.farmerDistrict}
                    </p>

                    <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #1e293b' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Produce Commodity:</span>
                        <strong style={{ color: '#f1f5f9' }}>{lot.crop}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Available Volume:</span>
                        <strong style={{ color: '#34d399' }}>{lot.quantityKg.toLocaleString()} kg</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Expected Price:</span>
                        <strong style={{ color: '#fbbf24' }}>₹{lot.pricePerKg.toFixed(2)} / kg</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Quality Grade:</span>
                        <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{lot.qualityGrade}</span>
                      </div>
                    </div>

                    {/* Credibility & Verification Badges */}
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>
                        <span>Credibility Score:</span>
                        <strong style={{ color: '#34d399' }}>{lot.credibilityScore} / 100</strong>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={14} color="#34d399" /> {lot.verificationDoc}
                      </div>
                    </div>
                  </div>

                  {/* Send Offer Button */}
                  <button
                    onClick={() => setSelectedLotForOffer(lot)}
                    style={{
                      width: '100%',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      padding: '12px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      transition: 'background-color 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <Send size={16} /> Send Digital Offer to Farmer
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: POST NEW REQUIREMENT / RFQ */}
        {activeTab === 'post' && (
          <div style={{ maxWidth: '680px', margin: '0 auto', backgroundColor: '#1e293b', padding: '32px', borderRadius: '16px', border: '1px solid #334155' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>Post Demand Requirement (RFQ)</h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '24px' }}>
              Publish your procurement parameters to run live net-realization matching against farmer and FPO crop lots.
            </p>

            {postSuccess && (
              <div style={{ backgroundColor: '#065f46', color: '#34d399', padding: '16px', borderRadius: '10px', marginBottom: '20px', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} /> Requirement posted successfully! Running matching engine...
              </div>
            )}

            <form onSubmit={handlePostRequirement}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>Crop Commodity</label>
                  <select
                    value={reqCrop}
                    onChange={(e) => setReqCrop(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '0.95rem' }}
                  >
                    <option value="Onion">Onion (कांदा)</option>
                    <option value="Tomato">Tomato (टोमॅटो)</option>
                    <option value="Soybean">Soybean (सोयाबीन)</option>
                    <option value="Grape">Grape (द्राक्षे)</option>
                    <option value="Pomegranate">Pomegranate (डाळिंब)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>Target Sourcing District</label>
                  <select
                    value={reqDistrict}
                    onChange={(e) => setReqDistrict(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '0.95rem' }}
                  >
                    <option value="Nashik">Nashik</option>
                    <option value="Pune">Pune</option>
                    <option value="Ahmednagar">Ahmednagar</option>
                    <option value="Latur">Latur</option>
                    <option value="Nagpur">Nagpur</option>
                    <option value="Solapur">Solapur</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>Quantity Needed (kg)</label>
                  <input
                    type="number"
                    value={reqQty}
                    onChange={(e) => setReqQty(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '0.95rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>Target Budget (₹ / kg)</label>
                  <input
                    type="number"
                    value={reqBudget}
                    onChange={(e) => setReqBudget(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '0.95rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>Quality Grade Spec</label>
                <select
                  value={reqGrade}
                  onChange={(e) => setReqGrade(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '0.95rem' }}
                >
                  <option value="A">Grade A (Premium / Export Quality)</option>
                  <option value="B">Grade B (Standard Market Quality)</option>
                  <option value="C">Grade C (Processing / Industrial)</option>
                </select>
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '14px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <Sparkles size={18} /> Post Requirement & Run Matching Engine
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: ACTIVE PROCUREMENT ORDERS & ESCROW TRACKER */}
        {activeTab === 'orders' && (
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '20px' }}>
              Active Procurement Orders & Escrow Payment Status
            </h2>

            <div style={{ backgroundColor: '#1e293b', borderRadius: '16px', border: '1px solid #334155', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '16px 20px' }}>Order ID & Date</th>
                    <th style={{ padding: '16px 20px' }}>Farmer / Counterparty</th>
                    <th style={{ padding: '16px 20px' }}>Commodity & Qty</th>
                    <th style={{ padding: '16px 20px' }}>Total Amount</th>
                    <th style={{ padding: '16px 20px' }}>Escrow Payment Tracker</th>
                    <th style={{ padding: '16px 20px' }}>Fulfillment & Logistics</th>
                  </tr>
                </thead>
                <tbody>
                  {activeOrders.map((order) => (
                    <tr key={order.id} style={{ borderBottom: '1px solid #334155', color: '#f1f5f9' }}>
                      <td style={{ padding: '18px 20px' }}>
                        <div style={{ fontWeight: 700, color: '#60a5fa' }}>{order.id}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{order.date}</div>
                      </td>
                      <td style={{ padding: '18px 20px' }}>
                        <div style={{ fontWeight: 600 }}>{order.farmerName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} /> {order.farmerDistrict}
                        </div>
                      </td>
                      <td style={{ padding: '18px 20px' }}>
                        <div style={{ fontWeight: 600 }}>{order.crop}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{order.quantityKg.toLocaleString()} kg @ ₹{order.pricePerKg}/kg</div>
                      </td>
                      <td style={{ padding: '18px 20px' }}>
                        <div style={{ fontWeight: 700, color: '#fbbf24' }}>₹{order.totalAmount.toLocaleString()}</div>
                      </td>
                      <td style={{ padding: '18px 20px' }}>
                        {order.paymentStatus === 'ESCROWED' && (
                          <span style={{ backgroundColor: '#1e3a8a', color: '#60a5fa', padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <Lock size={14} /> ESCROWED (Funds Held)
                          </span>
                        )}
                        {order.paymentStatus === 'RELEASED' && (
                          <span style={{ backgroundColor: '#065f46', color: '#34d399', padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle2 size={14} /> RELEASED to Farmer
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '18px 20px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px' }}>{order.logisticsNote}</div>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                          Status: <strong style={{ color: order.fulfillmentStatus === 'COMPLETED' ? '#34d399' : '#fbbf24' }}>{order.fulfillmentStatus}</strong>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* Send Offer Modal */}
      {selectedLotForOffer && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#1e293b', width: '100%', maxWidth: '480px', padding: '28px', borderRadius: '16px', border: '1px solid #334155' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>Send Offer to {selectedLotForOffer.farmerName}</h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '20px' }}>
              Commodity: <strong>{selectedLotForOffer.crop}</strong> ({selectedLotForOffer.quantityKg} kg) in {selectedLotForOffer.farmerDistrict}
            </p>

            {offerSentSuccess ? (
              <div style={{ backgroundColor: '#065f46', color: '#34d399', padding: '16px', borderRadius: '10px', textAlign: 'center', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} /> Digital Offer sent! Agreement auto-generated and payment status set to PENDING.
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>Offered Price (₹ / kg)</label>
                  <input
                    type="number"
                    value={offerPriceInput}
                    onChange={(e) => setOfferPriceInput(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '1rem' }}
                  />
                </div>

                <div style={{ backgroundColor: '#0f172a', padding: '14px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.85rem', color: '#94a3b8' }}>
                  Total Computed Escrow Value: <strong style={{ color: '#fbbf24' }}>₹{(Number(offerPriceInput || 0) * selectedLotForOffer.quantityKg).toLocaleString()}</strong>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setSelectedLotForOffer(null)}
                    style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendOffer}
                    style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <Send size={16} /> Confirm & Send Offer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
