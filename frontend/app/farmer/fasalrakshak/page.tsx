'use client';

import React, { useState } from 'react';
import {
  Sprout,
  ShieldAlert,
  FileText,
  Calculator,
  Camera,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  PlusCircle,
  Warehouse,
  DollarSign,
  Droplets,
  Sun,
  ShieldCheck,
  ArrowRight,
  UserCheck
} from 'lucide-react';

export default function FasalRakshakPage() {
  const [activeTab, setActiveTab] = useState<'advisory' | 'diagnosis' | 'diary' | 'planner'>('advisory');

  // Activity Diary Form State
  const [actCrop, setActCrop] = useState('Onion');
  const [actType, setActType] = useState('FERTILIZATION');
  const [actCost, setActCost] = useState('8500');
  const [actNotes, setActNotes] = useState('Applied 19-19-19 NPK bio-fertilizer and micro-nutrients.');
  const [actSuccess, setActSuccess] = useState(false);

  // Initial Seeded Activity Logs for Bhausaheb Patil
  const [activities, setActivities] = useState([
    {
      id: 'act-1',
      date: '2026-09-02',
      crop: 'Onion',
      type: 'SOWING',
      cost: 12000,
      notes: 'Planted certified Nashik Red Onion seeds in 2.5 acres.',
    },
    {
      id: 'act-2',
      date: '2026-09-07',
      crop: 'Onion',
      type: 'FERTILIZATION',
      cost: 8500,
      notes: 'Applied 19-19-19 NPK bio-fertilizer and micro-nutrients.',
    },
    {
      id: 'act-3',
      date: '2026-09-10',
      crop: 'Onion',
      type: 'IRRIGATION',
      cost: 3500,
      notes: 'Drip irrigation cycle 12 hours.',
    },
  ]);

  // Calculated Costs
  const totalCost = activities.reduce((sum, item) => sum + item.cost, 0);
  const expectedYieldKg = 5000;
  const costPerKg = (totalCost / expectedYieldKg).toFixed(2);

  // Diagnosis Form State
  const [diagCrop, setDiagCrop] = useState('Onion');
  const [diagIssueType, setDiagIssueType] = useState('PEST_ATTACK');
  const [diagImageUploaded, setDiagImageUploaded] = useState(true);
  const [diagResult, setDiagResult] = useState<any | null>({
    issueType: 'PEST_ATTACK',
    aiDiagnosis: 'Thrips & Helicoverpa Armigera Larval Infestation (Confidence 94%)',
    advisoryNote: 'Spray Emamectin Benzoate 5% SG @ 4g per 10L water or Neem Oil (10,000 ppm) @ 3ml/L. Maintain sticky yellow traps in field.',
    expertEscalated: false,
    status: 'DIAGNOSED',
  });

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    const newAct = {
      id: `act-${Date.now()}`,
      date: '2026-09-11',
      crop: actCrop,
      type: actType,
      cost: Number(actCost),
      notes: actNotes,
    };
    setActivities([newAct, ...activities]);
    setActSuccess(true);
    setTimeout(() => setActSuccess(false), 2000);
  };

  const handleRunDiagnosis = (e: React.FormEvent) => {
    e.preventDefault();
    if (diagIssueType === 'WILTING') {
      setDiagResult({
        issueType: 'WILTING',
        aiDiagnosis: 'Severe Root Rot & Fusarium Vascular Wilt (Low Confidence 62%)',
        advisoryNote: 'High severity detected. Escalated to Krishi Vigyan Kendra (KVK Nashik) Senior Plant Pathologist for field verification.',
        expertEscalated: true,
        status: 'ESCALATED_TO_KVK',
      });
    } else if (diagIssueType === 'LEAF_BLIGHT') {
      setDiagResult({
        issueType: 'LEAF_BLIGHT',
        aiDiagnosis: 'Purple Blotch / Stemphylium Leaf Blight Fungal Infection (Confidence 91%)',
        advisoryNote: 'Apply Mancozeb 75% WP @ 2.5g/L or Tebuconazole @ 1ml/L. Avoid overhead sprinkler irrigation during high humidity.',
        expertEscalated: false,
        status: 'DIAGNOSED',
      });
    } else if (diagIssueType === 'NUTRIENT_DEFICIENCY') {
      setDiagResult({
        issueType: 'NUTRIENT_DEFICIENCY',
        aiDiagnosis: 'Zinc & Nitrogen Micronutrient Deficiency (Confidence 89%)',
        advisoryNote: 'Foliar spray 19-19-19 NPK @ 5g/L + Chelated Zinc @ 1g/L during early morning hours.',
        expertEscalated: false,
        status: 'DIAGNOSED',
      });
    } else {
      setDiagResult({
        issueType: 'PEST_ATTACK',
        aiDiagnosis: 'Thrips & Helicoverpa Armigera Larval Infestation (Confidence 94%)',
        advisoryNote: 'Spray Emamectin Benzoate 5% SG @ 4g per 10L water or Neem Oil (10,000 ppm) @ 3ml/L. Maintain sticky yellow traps in field.',
        expertEscalated: false,
        status: 'DIAGNOSED',
      });
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Top Header */}
      <header style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <Sprout size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              KrishiSetu <span style={{ color: '#4ade80', fontWeight: 400 }}>| FasalRakshak Decision Support Subsystem</span>
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>On-Farm Advisory, Cost Calculator, Diagnosis & Market Planner</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f1f5f9' }}>Bhausaheb Patil</div>
            <div style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 600 }}>Farmer • Nashik (Lasalgaon)</div>
          </div>
          <div style={{ backgroundColor: '#064e3b', color: '#6ee7b7', padding: '8px 14px', borderRadius: '8px', border: '1px solid #10b981', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={16} /> 7/12 Land Revenue Verified
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Quick Summary Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
          
          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '14px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Active Crop Stage</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', marginTop: '6px' }}>Onion Day 75</div>
            <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={13} /> Pre-Harvest Bulb Phase
            </div>
          </div>

          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '14px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total Cultivation Cost</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#60a5fa', marginTop: '6px' }}>₹{totalCost.toLocaleString()}</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
              Unit Cost: <strong style={{ color: '#fbbf24' }}>₹{costPerKg} / kg</strong>
            </div>
          </div>

          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '14px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Crop Health Diagnosis</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#34d399', marginTop: '6px' }}>94% Confidence</div>
            <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={13} color="#fbbf24" /> Thrips Treatment Active
            </div>
          </div>

          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '14px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Net Price Realization</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#34d399', marginTop: '6px' }}>₹18.90 / kg</div>
            <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrendingUp size={13} /> +16.6% vs Mandi Net Rate
            </div>
          </div>

        </div>

        {/* Tab Selection Navigation */}
        <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #334155', paddingBottom: '16px', marginBottom: '28px' }}>
          <button
            onClick={() => setActiveTab('advisory')}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeTab === 'advisory' ? '#16a34a' : '#1e293b',
              color: activeTab === 'advisory' ? '#ffffff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <Sun size={18} /> Daily Action Engine (Advisory)
          </button>
          <button
            onClick={() => setActiveTab('diagnosis')}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeTab === 'diagnosis' ? '#16a34a' : '#1e293b',
              color: activeTab === 'diagnosis' ? '#ffffff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <Camera size={18} /> Crop Problem Assistant (AI Diagnosis & KVK)
          </button>
          <button
            onClick={() => setActiveTab('diary')}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeTab === 'diary' ? '#16a34a' : '#1e293b',
              color: activeTab === 'diary' ? '#ffffff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <Calculator size={18} /> Expense & Activity Diary (Cost/Kg Calculator)
          </button>
          <button
            onClick={() => setActiveTab('planner')}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeTab === 'planner' ? '#16a34a' : '#1e293b',
              color: activeTab === 'planner' ? '#ffffff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <TrendingUp size={18} /> Harvest & Market Realization Planner
          </button>
        </div>

        {/* TAB 1: DAILY ACTION ENGINE */}
        {activeTab === 'advisory' && (
          <div>
            {/* Weather Alert Banner */}
            <div style={{ backgroundColor: '#7c2d12', color: '#ffedd5', padding: '20px 24px', borderRadius: '14px', border: '1px solid #c2410c', marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <AlertTriangle size={24} color="#f97316" />
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 700 }}>
                    Nashik Weather Advisory: High Relative Humidity Alert (78% RH, 28°C)
                  </div>
                  <div style={{ fontSize: '0.85rem', marginTop: '4px', opacity: 0.9 }}>
                    Elevated risk of Purple Blotch / Stemphylium fungal blight infection on lower leaf canopy.
                  </div>
                </div>
              </div>
              <span style={{ backgroundColor: '#c2410c', color: '#fff', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>
                HIGH RISK ALERT
              </span>
            </div>

            {/* Recommended Daily Actions */}
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '20px' }}>
              Recommended On-Farm Actions (Day 75 Pre-Harvest Phase)
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
              <div style={{ backgroundColor: '#1e293b', borderRadius: '16px', border: '1px solid #334155', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ backgroundColor: '#0284c7', color: '#fff', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                      IRRIGATION MANAGEMENT
                    </span>
                    <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 700 }}>HIGH URGENCY</span>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>Regulate Water & Stop Flood Irrigation</h3>
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
                    Halt flood irrigation 10 days prior to harvest. Switch to light drip cycles to prevent bulb rotting and improve storage life.
                  </p>
                </div>
                <button style={{ marginTop: '20px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#38bdf8', padding: '10px', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Droplets size={16} /> Mark Water Schedule Completed
                </button>
              </div>

              <div style={{ backgroundColor: '#1e293b', borderRadius: '16px', border: '1px solid #334155', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ backgroundColor: '#16a34a', color: '#fff', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                      CROP NUTRITION
                    </span>
                    <span style={{ color: '#fbbf24', fontSize: '0.75rem', fontWeight: 700 }}>MEDIUM URGENCY</span>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>Foliar Spray Potassium Sulphate (0-0-50)</h3>
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
                    Foliar application @ 5g/L water during early morning. Enhances onion bulb weight, skin color, and firmness.
                  </p>
                </div>
                <button style={{ marginTop: '20px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#4ade80', padding: '10px', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Sprout size={16} /> Order Group-Buy Bio-Inputs
                </button>
              </div>

              <div style={{ backgroundColor: '#1e293b', borderRadius: '16px', border: '1px solid #334155', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ backgroundColor: '#7c3aed', color: '#fff', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                      MARKET STRATEGY
                    </span>
                    <span style={{ color: '#34d399', fontSize: '0.75rem', fontWeight: 700 }}>RECOMMENDED</span>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>Lasalgaon Mandi Trend Signal</h3>
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
                    Mandi prices up +6.2% (₹19.50/kg). Strategy: Direct sale 60% harvest now, hold 40% in Nashik Cold Chain bay for peak season.
                  </p>
                </div>
                <button style={{ marginTop: '20px', backgroundColor: '#2563eb', border: 'none', color: '#ffffff', padding: '10px', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <TrendingUp size={16} /> Open Harvest Planner
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CROP PROBLEM ASSISTANT (PHOTO DIAGNOSIS & KVK) */}
        {activeTab === 'diagnosis' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            {/* Upload & Issue Selector */}
            <div style={{ backgroundColor: '#1e293b', padding: '28px', borderRadius: '16px', border: '1px solid #334155' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
                Photo Crop Problem Diagnostic Assistant
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '24px' }}>
                Upload a leaf or field photo to run rule-based AI diagnostic inference with automated Krishi Vigyan Kendra (KVK) expert fallback routing.
              </p>

              <form onSubmit={handleRunDiagnosis}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>Select Crop Commodity</label>
                  <select
                    value={diagCrop}
                    onChange={(e) => setDiagCrop(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '0.95rem' }}
                  >
                    <option value="Onion">Onion (कांदा)</option>
                    <option value="Tomato">Tomato (टोमॅटो)</option>
                    <option value="Soybean">Soybean (सोयाबीन)</option>
                    <option value="Grape">Grape (द्राक्षे)</option>
                    <option value="Pomegranate">Pomegranate (डाळिंब)</option>
                  </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>Observed Crop Issue Type</label>
                  <select
                    value={diagIssueType}
                    onChange={(e) => setDiagIssueType(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '0.95rem' }}
                  >
                    <option value="PEST_ATTACK">Pest Attack / Insect Larvae (Thrips)</option>
                    <option value="LEAF_BLIGHT">Fungal Leaf Blight / Purple Blotch</option>
                    <option value="NUTRIENT_DEFICIENCY">Yellowing / Micronutrient Deficiency</option>
                    <option value="WILTING">Severe Plant Wilting & Root Decay (Low Confidence / KVK Trigger)</option>
                  </select>
                </div>

                {/* Photo Dropzone Mock */}
                <div style={{ border: '2px dashed #334155', borderRadius: '12px', padding: '24px', textAlign: 'center', backgroundColor: '#0f172a', marginBottom: '24px' }}>
                  <Camera size={32} color="#60a5fa" style={{ marginBottom: '8px' }} />
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f1f5f9' }}>Leaf Photo Uploaded</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>`onion_thrips_lasalgaon_field.jpg` (2.4 MB)</div>
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
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <Sparkles size={18} /> Run AI Diagnostic Inference
                </button>
              </form>
            </div>

            {/* Diagnostic Result Card */}
            {diagResult && (
              <div style={{ backgroundColor: '#1e293b', padding: '28px', borderRadius: '16px', border: `1px solid ${diagResult.expertEscalated ? '#ef4444' : '#10b981'}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>AI Diagnostic Finding</h3>
                    {diagResult.expertEscalated ? (
                      <span style={{ backgroundColor: '#7f1d1d', color: '#fca5a5', padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <ShieldAlert size={14} /> ESCALATED TO KVK EXPERT
                      </span>
                    ) : (
                      <span style={{ backgroundColor: '#065f46', color: '#34d399', padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={14} /> DIAGNOSED (HIGH CONFIDENCE)
                      </span>
                    )}
                  </div>

                  <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #1e293b' }}>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>Inferred Problem Identification</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9' }}>{diagResult.aiDiagnosis}</div>
                  </div>

                  <div style={{ backgroundColor: diagResult.expertEscalated ? '#451a03' : '#064e3b', padding: '18px', borderRadius: '12px', border: `1px solid ${diagResult.expertEscalated ? '#d97706' : '#059669'}`, color: diagResult.expertEscalated ? '#fde68a' : '#a7f3d0' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                      {diagResult.expertEscalated ? 'KVK Fallback Advisory Note' : 'Recommended Agronomic Treatment'}
                    </div>
                    <p style={{ fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
                      {diagResult.advisoryNote}
                    </p>
                  </div>
                </div>

                <div style={{ marginTop: '24px', fontSize: '0.8rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Diagnostic Model: <strong style={{ color: '#cbd5e1' }}>FasalRakshak Heuristic Engine v2.4</strong></span>
                  <span>Reference: <strong style={{ color: '#38bdf8' }}>KVK Nashik Registry</strong></span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: EXPENSE & ACTIVITY DIARY (CULTIVATION COST CALCULATOR) */}
        {activeTab === 'diary' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' }}>
            {/* Form */}
            <div style={{ backgroundColor: '#1e293b', padding: '28px', borderRadius: '16px', border: '1px solid #334155' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
                Log Farm Activity & Expense
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '20px' }}>
                Track input costs to compute unit cultivation cost per kilogram (Cost/Kg = Total Cost / Yield).
              </p>

              {actSuccess && (
                <div style={{ backgroundColor: '#065f46', color: '#34d399', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={16} /> Activity logged & unit cost updated!
                </div>
              )}

              <form onSubmit={handleAddActivity}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>Crop Commodity</label>
                  <input
                    type="text"
                    value={actCrop}
                    onChange={(e) => setActCrop(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '0.95rem' }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>Activity Category</label>
                  <select
                    value={actType}
                    onChange={(e) => setActType(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '0.95rem' }}
                  >
                    <option value="SOWING">Sowing / Seed Planting</option>
                    <option value="IRRIGATION">Irrigation & Drip Management</option>
                    <option value="FERTILIZATION">Fertilization & Bio-Inputs</option>
                    <option value="PESTICIDE_SPRAY">Pesticide / Spraying</option>
                    <option value="HARVESTING">Harvesting & Labor Crew</option>
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>Cost Incurred (₹)</label>
                  <input
                    type="number"
                    value={actCost}
                    onChange={(e) => setActCost(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '0.95rem' }}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>Activity Notes</label>
                  <textarea
                    rows={2}
                    value={actNotes}
                    onChange={(e) => setActNotes(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    width: '100%',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <PlusCircle size={16} /> Add to Activity Diary
                </button>
              </form>
            </div>

            {/* Diary Table & Cultivation Cost Calculation Card */}
            <div>
              <div style={{ backgroundColor: '#1e3a8a', border: '1px solid #2563eb', borderRadius: '16px', padding: '24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#93c5fd', textTransform: 'uppercase', fontWeight: 600 }}>Cultivation Cost Formula</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginTop: '4px' }}>
                    Total Incurred Cost: ₹{totalCost.toLocaleString()} ÷ Yield Benchmark ({expectedYieldKg.toLocaleString()} kg)
                  </div>
                </div>

                <div style={{ backgroundColor: '#0f172a', padding: '12px 20px', borderRadius: '12px', border: '1px solid #1e293b', textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Unit Cultivation Cost</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fbbf24' }}>₹{costPerKg} / kg</div>
                </div>
              </div>

              {/* Activity Log Table */}
              <div style={{ backgroundColor: '#1e293b', borderRadius: '16px', border: '1px solid #334155', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                      <th style={{ padding: '16px 20px' }}>Date & Crop</th>
                      <th style={{ padding: '16px 20px' }}>Activity Type</th>
                      <th style={{ padding: '16px 20px' }}>Cost Incurred</th>
                      <th style={{ padding: '16px 20px' }}>Notes & Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #334155', color: '#f1f5f9' }}>
                        <td style={{ padding: '18px 20px' }}>
                          <div style={{ fontWeight: 700, color: '#60a5fa' }}>{item.crop}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.date}</div>
                        </td>
                        <td style={{ padding: '18px 20px' }}>
                          <span style={{ backgroundColor: '#0f172a', color: '#cbd5e1', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid #334155' }}>
                            {item.type}
                          </span>
                        </td>
                        <td style={{ padding: '18px 20px' }}>
                          <div style={{ fontWeight: 700, color: '#fbbf24' }}>₹{item.cost.toLocaleString()}</div>
                        </td>
                        <td style={{ padding: '18px 20px' }}>
                          <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{item.notes}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: HARVEST & MARKET REALIZATION PLANNER */}
        {activeTab === 'planner' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                  Harvest & Market Net Realization Comparison Planner
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
                  Comparing net payout (Gross Price - Logistics - Commissions) across selling channels.
                </p>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                Unit Production Cost: <strong style={{ color: '#fbbf24' }}>₹{costPerKg} / kg</strong>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
              
              {/* Channel 1: Direct Marketplace Sale (RECOMMENDED) */}
              <div style={{ backgroundColor: '#1e293b', borderRadius: '16px', border: '2px solid #16a34a', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
                <div>
                  <div style={{ backgroundColor: '#16a34a', color: '#fff', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-block', marginBottom: '16px' }}>
                    RECOMMENDED CHANNEL
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>Direct Buyer Marketplace</h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '16px' }}>Sell directly to Reliance Fresh Wholesale (Mumbai/Nashik Hub)</p>

                  <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                      <span style={{ color: '#94a3b8' }}>Offered Price:</span>
                      <strong style={{ color: '#f1f5f9' }}>₹19.50 / kg</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                      <span style={{ color: '#94a3b8' }}>Logistics Freight Fee:</span>
                      <span style={{ color: '#f87171' }}>-₹0.60 / kg</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                      <span style={{ color: '#94a3b8' }}>Platform Escrow Fee:</span>
                      <span style={{ color: '#34d399' }}>₹0.00 (0% Farmer Fee)</span>
                    </div>
                    <div style={{ borderTop: '1px dashed #334155', paddingTop: '8px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                      <span style={{ color: '#34d399', fontWeight: 700 }}>Net Farmer Realization:</span>
                      <strong style={{ color: '#34d399', fontSize: '1.1rem' }}>₹18.90 / kg</strong>
                    </div>
                  </div>
                </div>

                <div style={{ backgroundColor: '#064e3b', color: '#a7f3d0', padding: '12px', borderRadius: '8px', fontSize: '0.8rem', textAlign: 'center', fontWeight: 700 }}>
                  Net Profit: +₹14.10 / kg above cultivation cost!
                </div>
              </div>

              {/* Channel 2: Traditional APMC Mandi Sale */}
              <div style={{ backgroundColor: '#1e293b', borderRadius: '16px', border: '1px solid #334155', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ backgroundColor: '#475569', color: '#cbd5e1', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-block', marginBottom: '16px' }}>
                    TRADITIONAL MANDI
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>Lasalgaon APMC Mandi</h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '16px' }}>Auction via traditional mandi commission agent</p>

                  <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                      <span style={{ color: '#94a3b8' }}>Mandi Auction Price:</span>
                      <strong style={{ color: '#f1f5f9' }}>₹18.50 / kg</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                      <span style={{ color: '#94a3b8' }}>Transport & Loading:</span>
                      <span style={{ color: '#f87171' }}>-₹1.10 / kg</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                      <span style={{ color: '#94a3b8' }}>Agent Commission (6.5%):</span>
                      <span style={{ color: '#f87171' }}>-₹1.20 / kg</span>
                    </div>
                    <div style={{ borderTop: '1px dashed #334155', paddingTop: '8px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                      <span style={{ color: '#f8fafc', fontWeight: 700 }}>Net Farmer Realization:</span>
                      <strong style={{ color: '#fbbf24', fontSize: '1.1rem' }}>₹16.20 / kg</strong>
                    </div>
                  </div>
                </div>

                <div style={{ backgroundColor: '#451a03', color: '#fde68a', padding: '12px', borderRadius: '8px', fontSize: '0.8rem', textAlign: 'center', fontWeight: 600 }}>
                  Loss: -₹2.70 / kg vs Direct Marketplace Net
                </div>
              </div>

              {/* Channel 3: Cold Storage Holding Strategy */}
              <div style={{ backgroundColor: '#1e293b', borderRadius: '16px', border: '1px solid #334155', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ backgroundColor: '#0284c7', color: '#fff', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-block', marginBottom: '16px' }}>
                    HOLDING STRATEGY
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>Nashik Cold Chain Storage</h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '16px' }}>Store produce for 45 days to capture post-harvest surge</p>

                  <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                      <span style={{ color: '#94a3b8' }}>Expected Surge Price:</span>
                      <strong style={{ color: '#f1f5f9' }}>₹23.00 / kg</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                      <span style={{ color: '#94a3b8' }}>Storage Fee (45 Days):</span>
                      <span style={{ color: '#f87171' }}>-₹1.80 / kg</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                      <span style={{ color: '#94a3b8' }}>Weight Loss (Shrinkage 3%):</span>
                      <span style={{ color: '#f87171' }}>-₹0.80 / kg</span>
                    </div>
                    <div style={{ borderTop: '1px dashed #334155', paddingTop: '8px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                      <span style={{ color: '#38bdf8', fontWeight: 700 }}>Projected Net Realization:</span>
                      <strong style={{ color: '#38bdf8', fontSize: '1.1rem' }}>₹20.40 / kg</strong>
                    </div>
                  </div>
                </div>

                <button style={{ backgroundColor: '#0284c7', border: 'none', color: '#ffffff', padding: '10px', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Warehouse size={16} /> Book WDRA Cold Bay Now
                </button>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
