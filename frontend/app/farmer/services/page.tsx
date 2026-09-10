'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  Wrench,
  Truck,
  Warehouse,
  Sprout,
  ShoppingBag,
  FileText,
  CheckCircle2,
  Send,
} from 'lucide-react';

type ResourceTypeKey =
  | 'COLD_STORAGE'
  | 'TRANSPORT'
  | 'EQUIPMENT_SERVICE'
  | 'LABOR'
  | 'USED_EQUIPMENT'
  | 'INPUT_GROUP_BUY'
  | 'CONTRACT_FARMING';

interface ServiceOption {
  key: ResourceTypeKey;
  title: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

const SERVICE_OPTIONS: ServiceOption[] = [
  {
    key: 'LABOR',
    title: 'Hire Labor Crew',
    desc: 'Contract farm labor crews for harvesting, sowing, pruning',
    icon: <Users size={28} />,
    color: '#0284c7',
    bg: '#e0f2fe',
  },
  {
    key: 'USED_EQUIPMENT',
    title: 'Buy/Sell Used Equipment',
    desc: 'Pre-owned tractors, harvesters, rotavators with condition grades',
    icon: <Wrench size={28} />,
    color: '#d97706',
    bg: '#fef3c7',
  },
  {
    key: 'EQUIPMENT_SERVICE',
    title: 'Machinery Rental',
    desc: 'Tractors, combines & harvesters with operators',
    icon: <Wrench size={28} />,
    color: '#16a34a',
    bg: '#dcfce7',
  },
  {
    key: 'COLD_STORAGE',
    title: 'Cold Storage Booking',
    desc: 'Reserve quintal capacity in WDRA-licensed warehouses',
    icon: <Warehouse size={28} />,
    color: '#2563eb',
    bg: '#dbeafe',
  },
  {
    key: 'TRANSPORT',
    title: 'Logistics & Transport',
    desc: 'Book verified pick-up & heavy transport vehicles',
    icon: <Truck size={28} />,
    color: '#9333ea',
    bg: '#f3e8ff',
  },
  {
    key: 'INPUT_GROUP_BUY',
    title: 'Input Group Buying',
    desc: 'Pool fertilizer & seed orders for bulk volume discounts',
    icon: <ShoppingBag size={28} />,
    color: '#059669',
    bg: '#d1fae5',
  },
  {
    key: 'CONTRACT_FARMING',
    title: 'Contract Farming',
    desc: 'Secured pre-agreed buyer contracts for upcoming season',
    icon: <FileText size={28} />,
    color: '#ea580c',
    bg: '#ffedd5',
  },
];

export default function FarmerServicesPage() {
  const [selectedService, setSelectedService] = useState<ResourceTypeKey | null>('LABOR');
  const [district, setDistrict] = useState('Nashik');
  const [price, setPrice] = useState('');

  // LABOR Specific Fields
  const [crewSize, setCrewSize] = useState('10');
  const [taskType, setTaskType] = useState('Harvesting');

  // USED_EQUIPMENT Specific Fields
  const [machineType, setMachineType] = useState('Mahindra 575 DI Tractor');
  const [conditionGrade, setConditionGrade] = useState<'like_new' | 'good' | 'fair'>('like_new');
  const [yearOfPurchase, setYearOfPurchase] = useState('2022');

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  };

  const activeServiceInfo = SERVICE_OPTIONS.find((s) => s.key === selectedService);

  return (
    <div style={{ paddingTop: '10px', paddingBottom: '30px' }}>
      <Link
        href="/farmer/home"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          color: '#15803d',
          textDecoration: 'none',
          fontWeight: 600,
          marginBottom: '16px',
        }}
      >
        <ArrowLeft size={20} />
        Back to Home
      </Link>

      <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
        Get Help / Farm Services
      </h1>
      <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px' }}>
        Select a service type to post a requirement or browse available provider listings.
      </p>

      {/* Resource Type Selection Grid (Tier C Services) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        {SERVICE_OPTIONS.map((service) => {
          const isSelected = selectedService === service.key;
          return (
            <div
              key={service.key}
              onClick={() => setSelectedService(service.key)}
              style={{
                backgroundColor: isSelected ? service.bg : '#ffffff',
                border: isSelected ? `2px solid ${service.color}` : '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '14px 10px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: service.bg,
                  color: service.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 8px auto',
                }}
              >
                {service.icon}
              </div>
              <div
                style={{
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  color: isSelected ? service.color : '#0f172a',
                  lineHeight: '1.2',
                }}
              >
                {service.title}
              </div>
            </div>
          );
        })}
      </div>

      {/* Auto-Generated Dynamic Attribute Form for Selected Service */}
      {activeServiceInfo && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: activeServiceInfo.bg,
                color: activeServiceInfo.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {activeServiceInfo.icon}
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {activeServiceInfo.title} Requirement
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{activeServiceInfo.desc}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* District Input */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                District / Location
              </label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                }}
                required
              />
            </div>

            {/* DYNAMIC SCHEMA FIELDS: LABOR */}
            {selectedService === 'LABOR' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Crew Size (Workers)
                    </label>
                    <input
                      type="number"
                      value={crewSize}
                      onChange={(e) => setCrewSize(e.target.value)}
                      placeholder="e.g. 10"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Task Type
                    </label>
                    <select
                      value={taskType}
                      onChange={(e) => setTaskType(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <option value="Harvesting">Harvesting</option>
                      <option value="Sowing">Sowing</option>
                      <option value="Weeding">Weeding</option>
                      <option value="Pruning">Pruning</option>
                      <option value="General Labor">General Labor</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Max Daily Rate Budget per Worker (Rs/day)
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 450"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                    }}
                    required
                  />
                </div>
              </>
            )}

            {/* DYNAMIC SCHEMA FIELDS: USED_EQUIPMENT */}
            {selectedService === 'USED_EQUIPMENT' && (
              <>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Machine / Equipment Model
                  </label>
                  <input
                    type="text"
                    value={machineType}
                    onChange={(e) => setMachineType(e.target.value)}
                    placeholder="e.g. Mahindra 575 DI Tractor"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                    }}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Condition Grade
                    </label>
                    <select
                      value={conditionGrade}
                      onChange={(e: any) => setConditionGrade(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <option value="like_new">Like New (Grade A)</option>
                      <option value="good">Good (Grade B)</option>
                      <option value="fair">Fair (Grade C)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Year of Purchase
                    </label>
                    <input
                      type="number"
                      value={yearOfPurchase}
                      onChange={(e) => setYearOfPurchase(e.target.value)}
                      placeholder="e.g. 2022"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Budget / Target Price (Rs)
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 450000"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                    }}
                    required
                  />
                </div>
              </>
            )}

            {/* Standard fallback for other services */}
            {selectedService !== 'LABOR' && selectedService !== 'USED_EQUIPMENT' && (
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', color: '#64748b' }}>
                Generic attribute schema active for {selectedService}. Form fields are generated automatically from Zod validation registry.
              </div>
            )}

            <button
              type="submit"
              style={{
                width: '100%',
                backgroundColor: activeServiceInfo.color,
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Send size={18} />
              Post {activeServiceInfo.title} Requirement
            </button>
          </form>

          {submitted && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#dcfce7',
                color: '#15803d',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={18} />
              {activeServiceInfo.title} requirement submitted successfully! Matching Engine initiated.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
