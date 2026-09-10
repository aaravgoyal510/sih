'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('+919876543210');
  const [code, setCode] = useState('123456');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [isNewUser, setIsNewUser] = useState(false);
  const [name, setName] = useState('');
  const [district, setDistrict] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${backendUrl}/api/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (data.success) {
        setIsNewUser(!!data.isNewUser);
        if (data.isNewUser) {
          setName('Ramesh Patil');
          setDistrict('Nashik');
        }
        setStep('otp');
      } else {
        setError(data.error || 'Failed to request OTP');
      }
    } catch (err: any) {
      setError('Cannot connect to backend server. Make sure API is running on port 4000.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${backendUrl}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          code,
          name: isNewUser ? name : undefined,
          district: isNewUser ? district : undefined,
          village: isNewUser ? 'Pimple Gaon' : undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem('maha_token', data.token);
        localStorage.setItem('maha_party', JSON.stringify(data.party));
        router.push('/farmer/home');
      } else {
        setError(data.error || 'Invalid OTP code');
      }
    } catch (err: any) {
      setError('Cannot connect to backend server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ paddingTop: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#15803d' }}>Farmer Portal</h2>
        <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '4px' }}>
          {step === 'phone'
            ? 'Enter your mobile number to receive OTP'
            : isNewUser
            ? 'First-Time Registration — Enter details & OTP'
            : 'Welcome Back — Enter OTP to sign in'}
        </p>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            color: '#991b1b',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '0.875rem',
            marginBottom: '16px',
            border: '1px solid #fecaca',
          }}
        >
          {error}
        </div>
      )}

      {step === 'phone' ? (
        <form onSubmit={handleRequestOtp}>
          <div className="input-group">
            <label className="input-label">Mobile Number</label>
            <input
              type="text"
              className="input-field"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+919876543210"
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp}>
          {isNewUser && (
            <>
              <div
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#166534',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '0.825rem',
                  marginBottom: '16px',
                }}
              >
                New farmer profile detected for <strong>{phone}</strong>. Please complete registration below.
              </div>

              <div className="input-group">
                <label className="input-label">Full Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Patil"
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">District</label>
                <input
                  type="text"
                  className="input-field"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g. Nashik"
                  required
                />
              </div>
            </>
          )}

          <div className="input-group">
            <label className="input-label">Enter 6-Digit OTP</label>
            <input
              type="text"
              className="input-field"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              required
            />
            <span style={{ fontSize: '0.75rem', color: '#15803d', display: 'block', marginTop: '6px' }}>
              Dev mode enabled: Enter code <strong>123456</strong>
            </span>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Verifying...' : isNewUser ? 'Complete Registration & Login' : 'Verify OTP & Login'}
          </button>

          <button
            type="button"
            onClick={() => setStep('phone')}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              color: '#64748b',
              marginTop: '12px',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            Change Mobile Number
          </button>
        </form>
      )}
    </div>
  );
}
