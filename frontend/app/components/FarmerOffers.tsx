'use client';
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Receipt, RefreshCw, X, AlertTriangle, Truck, PackageCheck, Award } from 'lucide-react';
import { request, money, ApiError } from '../../lib/workspace';
import { useLanguage } from '../../lib/LanguageContext';
import { copy } from '../../lib/assist-copy';
import SimpleAgreement from './SimpleAgreement';
import OfferDecision from './OfferDecision';
import LogisticsNote from './LogisticsNote';
import { ReadAloud } from './VoiceControls';

type Action = { offer: any; type: string } | null;

export default function FarmerOffers() {
  const { t, language } = useLanguage();
  const c = (s: string) => copy(language, s);

  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<Action>(null);
  const [loading, setLoading] = useState(true);

  const lock = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);

  async function load() {
    setLoading(true);
    try {
      setData(await request('/snapshot?section=offers'));
      setError('');
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 401
          ? 'Please sign in again.'
          : 'Check the status before trying again.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (action) dialog.current?.showModal();
    else dialog.current?.close();
  }, [action]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    const f = new FormData(event.currentTarget);
    const o = action.offer;
    const type = action.type;
    let path = `/offers/${o.id}`;
    let method = 'PATCH';
    let body: any = { action: type };

    if (type === 'COUNTER') body.price = Number(f.get('price'));
    if (['FUND', 'START', 'COMPLETE', 'RELEASE', 'CANCEL'].includes(type)) {
      path = `/bookings/${o.booking.id}/action`;
      method = 'POST';
      if (type === 'CANCEL') body.reason = String(f.get('reason'));
    }
    if (type === 'DISPUTE') {
      path = `/bookings/${o.booking.id}/dispute`;
      method = 'POST';
      body = {
        category: 'OTHER',
        reason: String(f.get('reason')),
        evidenceUrls: [],
      };
    }
    if (type === 'RATING') {
      path = `/bookings/${o.booking.id}/rating`;
      method = 'POST';
      body = {
        score: Number(f.get('score')),
        comment: String(f.get('comment') || ''),
      };
    }
    try {
      const result = await request(path, method, body);
      setData((d: any) => ({
        ...d,
        offers: d.offers.map((item: any) => {
          if (item.id !== o.id) return item;
          if (result.offer) return result.offer;
          return {
            ...item,
            ...(result.booking?.fulfillmentStatus === 'CANCELLED' ? { status: 'REJECTED' } : {}),
            booking: {
              ...item.booking,
              ...result.booking,
              ...(result.dispute ? { dispute: result.dispute } : {}),
              ...(result.rating
                ? { ratings: [...(item.booking.ratings || []), result.rating] }
                : {}),
            },
          };
        }),
      }));
      setNotice('Action saved.');
      setAction(null);
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 401
          ? 'Please sign in again.'
          : 'Check the status before trying again.'
      );
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }

  const names: Record<string, string> = {
    ACCEPT: t('acceptOfferBtn'),
    REJECT: t('rejectOfferBtn'),
    COUNTER: t('counterOfferBtn'),
    FUND: t('payEscrowBtn'),
    START: t('startDeliveryBtn'),
    COMPLETE: t('markDeliveredBtn'),
    RELEASE: t('releasePaymentBtn'),
    DISPUTE: t('problemWithOrder'),
    RATING: t('ratePartnerBtn'),
    CANCEL: t('cancelOrderBtn'),
  };

  if (data && !data.party.roles.includes('FARMER'))
    return (
      <section className="ks-panel">
        <p>{c('This page is for farmers. Choose your own portal.')}</p>
        <Link href="/demo">{c('Switch portal')}</Link>
      </section>
    );

  const statuses: Record<string, string> = {
    PENDING: 'Pending',
    COUNTERED: 'Countered',
    ACCEPTED: 'Accepted',
    REJECTED: 'Rejected',
    IN_PROGRESS: 'Active Transit',
    COMPLETED: 'Fulfilled',
    CANCELLED: 'Cancelled',
    ESCROWED: 'Payment held in Escrow',
    RELEASED: 'Payment released to account',
    FAILED: 'Payment failed',
  };

  return (
    <div className="ks-assisted" style={{ maxWidth: 860, margin: '0 auto' }}>
      <Link href="/farmer/home" className="ks-back">
        <ArrowLeft size={17} />
        {t('backToHome')}
      </Link>

      <header className="ks-page-heading">
        <h1>{t('myOffersTitle')}</h1>
        <button className="ks-button secondary" disabled={loading} onClick={load}>
          <RefreshCw size={17} />
          {c('Refresh')}
        </button>
      </header>
      <p className="ks-note">{c('Payment simulation — no real money moves.')}</p>

      {error && (
        <p className="ks-alert error" role="alert">
          {c(error)} <Link href="/demo">{c('Sign in to continue')}</Link>
        </p>
      )}
      {notice && (
        <p className="ks-alert" role="status">
          <CheckCircle2 size={20} />
          {c(notice)}
        </p>
      )}

      {loading && !data ? (
        <p className="ks-loading">{c('Loading…')}</p>
      ) : data?.offers.length ? (
        data.offers.map((o: any) => {
          const b = o.booking;
          const shownPrice = b?.agreementSnapshot?.pricePerUnit ?? o.price;
          const shownQuantity = b?.agreementSnapshot?.quantity ?? o.requirement?.quantityNeeded ?? 1;
          const seller = o.listing.partyId === data.party.id;
          const canAccept = (seller && o.status === 'PENDING') || (!seller && o.status === 'COUNTERED');
          const unit =
            o.listing.priceUnit === 'per_quintal'
              ? 'quintal'
              : o.listing.priceUnit === 'per_kg'
                ? 'kg'
                : 'unit';

          const frozen = b?.dispute && !['RESOLVED', 'REJECTED'].includes(b.dispute.status);

          // Direct Buttons Generation
          const buttons: string[] = [];
          if (['PENDING', 'COUNTERED'].includes(o.status)) {
            if (canAccept) buttons.push('ACCEPT');
            if (seller && o.status === 'PENDING') buttons.push('COUNTER');
            buttons.push('REJECT');
          }
          if (b && !frozen && b.fulfillmentStatus !== 'CANCELLED') {
            if (!seller && b.paymentStatus === 'PENDING') buttons.push('FUND');
            if (seller && b.paymentStatus === 'ESCROWED' && b.fulfillmentStatus === 'PENDING')
              buttons.push('START');
            if (seller && b.fulfillmentStatus === 'IN_PROGRESS') buttons.push('COMPLETE');
            if (!seller && b.fulfillmentStatus === 'COMPLETED' && b.paymentStatus === 'ESCROWED')
              buttons.push('RELEASE');
            if (
              b.fulfillmentStatus === 'COMPLETED' &&
              !b.ratings?.some((r: any) => r.giverPartyId === data.party.id)
            )
              buttons.push('RATING');
          }

          return (
            <article key={o.id} className="ks-panel" style={{ marginTop: 20, borderRadius: 14, padding: 22 }}>
              <div className="ks-section-heading">
                <div>
                  <p className="ks-eyebrow">
                    {c(seller ? 'Buyer' : 'Supplier')}:{' '}
                    <strong>
                      {seller
                        ? o.requirement?.party?.name || o.booking?.buyerParty?.name || c('Maha Mandi Wholesale Buyer')
                        : o.listing?.party?.name || c('Supplier')}
                    </strong>
                  </p>
                  <h2 style={{ fontSize: '1.4rem', margin: '4px 0 0' }}>
                    {c(o.listing.attributes.crop || o.listing.resourceType)}
                  </h2>
                </div>
                <span className={`ks-badge ${['ACCEPTED', 'COMPLETED'].includes(o.status) ? 'good' : ''}`}>
                  {c(statuses[o.status] || o.status)}
                </span>
              </div>

              <div className="ks-trade-value" style={{ margin: '14px 0', background: '#f8fafc', padding: 14, borderRadius: 10 }}>
                <strong style={{ fontSize: '1.2rem', color: '#176448' }}>
                  {money(shownPrice * 100)} / {c('quintal')} (₹{shownPrice.toFixed(2)}/kg)
                </strong>
                <div style={{ fontSize: '0.95rem', color: '#475569', marginTop: 4 }}>
                  {shownQuantity} {c(unit)} · <strong>{c('Total value')}: {money(b?.totalAmount ?? shownPrice * shownQuantity)}</strong>
                </div>
              </div>

              <ReadAloud
                text={`${c(seller ? 'Buyer' : 'Supplier')}: ${seller ? o.requirement?.party?.name : o.listing.party.name}. ${c('Agreed price')}: ${money(shownPrice)} ${c(unit)}. ${c('Quantity')}: ${shownQuantity}. ${c('Status')}: ${c(statuses[o.status] || o.status)}`}
              />

              {/* Status Banners */}
              {b?.paymentStatus === 'ESCROWED' && b?.fulfillmentStatus === 'PENDING' && (
                <div className="ks-alert" style={{ backgroundColor: '#e6f4ea', color: '#137333', marginTop: 12, border: '1px solid #bbf7d0', borderRadius: 10 }}>
                  <CheckCircle2 size={20} />
                  <span>{t('escrowSafeBanner')}</span>
                </div>
              )}
              {b?.paymentStatus === 'ESCROWED' && b?.fulfillmentStatus === 'COMPLETED' && seller && (
                <div className="ks-alert" style={{ backgroundColor: '#fef3c7', color: '#b45309', marginTop: 12, border: '1px solid #fde68a', borderRadius: 10 }}>
                  <PackageCheck size={20} />
                  <span>{t('waitingReleaseBanner')}</span>
                </div>
              )}

              {seller && <OfferDecision offer={o} />}

              {/* Directly Rendered Stage-Specific Primary & Secondary Buttons */}
              <div
                className="ks-actions"
                style={{
                  marginTop: 18,
                  display: 'flex',
                  gap: 12,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                {buttons.map((type) => {
                  const isPrimary = ['ACCEPT', 'START', 'COMPLETE', 'RELEASE', 'FUND'].includes(type);
                  const isRed = type === 'REJECT';
                  return (
                    <button
                      key={type}
                      className={isPrimary ? 'ks-button' : 'ks-button secondary'}
                      disabled={busy}
                      style={{
                        minHeight: 48,
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        borderRadius: 10,
                        padding: '10px 20px',
                        ...(isRed ? { border: '2px solid #ef4444', color: '#ef4444', background: '#fef2f2' } : {}),
                      }}
                      onClick={() => {
                        setError('');
                        setAction({ offer: o, type });
                      }}
                    >
                      {names[type] || c(type)}
                    </button>
                  );
                })}
              </div>

              {/* Agreement & Dispute Access */}
              {b && (
                <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <details style={{ display: 'inline-block' }}>
                    <summary className="ks-button secondary" style={{ cursor: 'pointer', fontSize: '0.9rem' }}>
                      <Receipt size={16} />
                      {c('Agreement')}
                    </summary>
                    <SimpleAgreement offer={o} />
                  </details>

                  {!b.dispute ? (
                    <button
                      type="button"
                      className="ks-link"
                      style={{ fontSize: '0.9rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}
                      onClick={() => {
                        setError('');
                        setAction({ offer: o, type: 'DISPUTE' });
                      }}
                    >
                      <AlertTriangle size={15} />
                      {t('problemWithOrder')}
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.9rem', color: '#b45309', fontWeight: 700 }}>
                      ⚠️ {c('Disputed')}: {b.dispute.reason}
                    </span>
                  )}
                </div>
              )}
            </article>
          );
        })
      ) : (
        <section className="ks-panel" style={{ textAlign: 'center', padding: 32 }}>
          <Receipt size={40} style={{ margin: '0 auto 12px', color: '#94a3b8' }} />
          <h2 style={{ fontSize: '1.4rem' }}>{c('No offers yet')}</h2>
          <p>{c('Publish a crop so buyers can make an offer.')}</p>
          <Link href="/farmer/sell" className="ks-button full" style={{ marginTop: 16 }}>
            {t('sellMyCropTitle')}
          </Link>
        </section>
      )}

      {/* Action Dialog */}
      <dialog
        ref={dialog}
        className="ks-native-dialog"
        aria-labelledby="offer-action-title"
        onCancel={(e) => {
          if (busy) e.preventDefault();
          else setAction(null);
        }}
      >
        {action && (
          <form className="ks-form" onSubmit={save}>
            <header className="ks-section-heading">
              <h2 id="offer-action-title">{names[action.type] || c(action.type)}</h2>
              <button
                type="button"
                className="ks-icon-button"
                disabled={busy}
                aria-label={c('Cancel')}
                onClick={() => setAction(null)}
              >
                <X size={20} />
              </button>
            </header>
            <p style={{ fontWeight: 700 }}>
              {c(action.offer.listing.attributes.crop || action.offer.listing.resourceType)} ·{' '}
              {money(action.offer.price * 100)}/{c('quintal')}
            </p>
            {action.type === 'ACCEPT' && (
              <p className="ks-note">
                {c('You are accepting these terms. A booking will be created.')}
              </p>
            )}
            {['FUND', 'RELEASE'].includes(action.type) && (
              <p>{c('Payment simulation — no real money moves.')}</p>
            )}
            {action.type === 'COUNTER' && (
              <label>
                {c('Your asking price')}
                <input
                  name="price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue={action.offer.price}
                  required
                />
              </label>
            )}
            {['DISPUTE', 'CANCEL'].includes(action.type) && (
              <label>
                {c(action.type === 'CANCEL' ? 'Cancellation reason' : 'What happened?')}
                <textarea
                  name="reason"
                  minLength={5}
                  maxLength={action.type === 'CANCEL' ? 1000 : 3000}
                  rows={4}
                  required
                />
              </label>
            )}
            {action.type === 'RATING' && (
              <label>
                {t('ratePartnerBtn')}
                <select name="score">
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n}/5
                    </option>
                  ))}
                </select>
              </label>
            )}
            {error && (
              <p role="alert" className="ks-alert error">
                {c(error)}
              </p>
            )}
            <button className="ks-button full" disabled={busy} style={{ marginTop: 12 }}>
              {c(busy ? 'Saving…' : 'Confirm')}
            </button>
            <button
              type="button"
              className="ks-button secondary full"
              disabled={busy}
              style={{ marginTop: 8 }}
              onClick={() => setAction(null)}
            >
              {c('Cancel')}
            </button>
          </form>
        )}
      </dialog>
    </div>
  );
}
