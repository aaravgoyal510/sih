'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Compass,
  UserCheck,
  Building2,
  ShoppingBag,
  Warehouse,
  Truck,
  Tractor,
  Users,
  Sprout,
  ShieldCheck,
  Landmark,
  ChevronDown,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const DEMO_ROLES = [
  {
    id: 'farmer',
    role: 'FARMER',
    title: 'Individual Farmer',
    name: 'Bhausaheb Patil',
    district: 'Nashik (Lasalgaon)',
    route: '/farmer/home',
    icon: UserCheck,
    badgeColor: '#16a34a',
    desc: 'Sell crop lots, check mandi prices, request farm services, view offers.',
  },
  {
    id: 'fpo',
    role: 'FPO_ADMIN',
    title: 'FPO Aggregator Admin',
    name: 'Sahyadri Farmers Producer Co.',
    district: 'Nashik (Dindori)',
    route: '/farmer/home?role=FPO_ADMIN',
    icon: Building2,
    badgeColor: '#059669',
    desc: 'Pool smallholder listings into aggregated bulk lots with WDRA certification.',
  },
  {
    id: 'buyer_inst',
    role: 'BUYER',
    title: 'Institutional Bulk Buyer',
    name: 'Reliance Fresh Wholesale',
    district: 'Mumbai / Nashik Hub',
    route: '/buyer',
    icon: ShoppingBag,
    badgeColor: '#2563eb',
    desc: 'Post demand RFQs, browse matched farmer lots with credibility scores, lock escrow.',
  },
  {
    id: 'buyer_retail',
    role: 'BUYER',
    title: 'Retail & Processing Buyer',
    name: 'Sahyadri Processing Exports',
    district: 'Pune District',
    route: '/buyer?type=RETAIL',
    icon: ShoppingBag,
    badgeColor: '#3b82f6',
    desc: 'Sourcing quality-graded Soybean & Grape produce for export processing.',
  },
  {
    id: 'storage',
    role: 'STORAGE_OPERATOR',
    title: 'Storage Operator',
    name: 'Nashik Cold Chain Storage Corp',
    district: 'Nashik',
    route: '/farmer/services?role=STORAGE_OPERATOR',
    icon: Warehouse,
    badgeColor: '#0284c7',
    desc: 'Manage WDRA warehouse capacity, issue digital receipts, log temp controls.',
  },
  {
    id: 'transport',
    role: 'TRANSPORT_OPERATOR',
    title: 'Transport & Freight Operator',
    name: 'Maha Super Freight Logistics',
    district: 'Nashik',
    route: '/farmer/services?role=TRANSPORT_OPERATOR',
    icon: Truck,
    badgeColor: '#0d9488',
    desc: 'List ventilated trucks, accept crop dispatch bookings, track freight routes.',
  },
  {
    id: 'equip',
    role: 'EQUIPMENT_PROVIDER',
    title: 'Custom Hiring Equipment Provider',
    name: 'Krishi Harvester & Tractor Hiring',
    district: 'Ahmednagar',
    route: '/farmer/services?role=EQUIPMENT_PROVIDER',
    icon: Tractor,
    badgeColor: '#d97706',
    desc: 'Provide harvester & tractor hiring services, manage RC machine verification.',
  },
  {
    id: 'labor',
    role: 'LABOR_CONTRACTOR',
    title: 'Agricultural Labor Contractor',
    name: 'Shinde Agricultural Labor Crew',
    district: 'Solapur',
    route: '/farmer/services?role=LABOR_CONTRACTOR',
    icon: Users,
    badgeColor: '#7c3aed',
    desc: 'Manage farm harvesting crews, dispatch skilled labor teams for crop cutting.',
  },
  {
    id: 'inputs',
    role: 'INPUT_SUPPLIER',
    title: 'Agri Inputs & Bio-Fertilizer Supplier',
    name: 'Maha Agri Seeds & Bio-Inputs Ltd',
    district: 'Nashik',
    route: '/farmer/services?role=INPUT_SUPPLIER',
    icon: Sprout,
    badgeColor: '#15803d',
    desc: 'Group-buy discounts on NPK bio-fertilizers & certified seeds for FPOs.',
  },
  {
    id: 'dist_admin',
    role: 'DISTRICT_ADMIN',
    title: 'District Nodal Admin',
    name: 'Shri. V. K. Patil (District Admin)',
    district: 'Nashik District',
    route: '/district-admin',
    icon: ShieldCheck,
    badgeColor: '#0284c7',
    desc: 'Provider verification SLA queue, local dispute resolution, sync audit logs.',
  },
  {
    id: 'state_admin',
    role: 'STATE_ADMIN',
    title: 'State Command Admin',
    name: 'Dr. A. S. Deshmukh, IAS (Principal Secy)',
    district: 'Govt of Maharashtra',
    route: '/state-admin',
    icon: Landmark,
    badgeColor: '#7c3aed',
    desc: 'Statewide 4-color price realization heatmap, escalated appeals, portal telemetry.',
  },
];

export default function DemoRoleSwitcherHeader() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectRole = (roleItem: typeof DEMO_ROLES[0]) => {
    setIsOpen(false);
    // Set localStorage active session for demo
    if (typeof window !== 'undefined') {
      localStorage.setItem('maha_demo_role', roleItem.role);
      localStorage.setItem('maha_party_name', roleItem.name);
      localStorage.setItem('maha_district', roleItem.district);
    }
    router.push(roleItem.route);
  };

  return (
    <div style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b', padding: '8px 20px', position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        
        <button
          onClick={() => router.push('/demo')}
          style={{
            backgroundColor: '#1e293b',
            color: '#c084fc',
            border: '1px solid #7c3aed',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Compass size={15} /> Demo Hub (11 Roles)
        </button>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            style={{
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Sparkles size={14} color="#fbbf24" /> Switch Active Demo Role <ChevronDown size={14} />
          </button>

          {isOpen && (
            <div style={{ position: 'absolute', right: 0, top: '40px', width: '340px', maxHeight: '480px', overflowY: 'auto', backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', padding: '12px', zIndex: 1100 }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', padding: '0 4px' }}>
                Select Supported Role to Evaluate (11 Total)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {DEMO_ROLES.map((r) => {
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.id}
                      onClick={() => handleSelectRole(r)}
                      style={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #1e293b',
                        borderRadius: '8px',
                        padding: '10px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'background-color 0.2s',
                      }}
                    >
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: r.badgeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                        <Icon size={18} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {r.title}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {r.name} • {r.district}
                        </div>
                      </div>
                      <ArrowRight size={14} color="#64748b" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
