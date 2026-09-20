'use client';
import React from 'react';
import { FileText } from 'lucide-react';
import { useLanguage } from '../../lib/LanguageContext';
import { copy } from '../../lib/assist-copy';
import { money, resourceTitle } from '../../lib/workspace';
import { ReadAloud } from './VoiceControls';
function printAgreement(event: React.MouseEvent<HTMLButtonElement>) {
  const target = event.currentTarget.closest('.ks-agreement');
  if (!target) return;
  document.body.classList.add('ks-printing');
  target.classList.add('ks-print-target');
  const cleanup = () => {
    document.body.classList.remove('ks-printing');
    target.classList.remove('ks-print-target');
  };
  window.addEventListener('afterprint', cleanup, { once: true });
  try {
    window.print();
  } catch {
    cleanup();
  }
}
export default function SimpleAgreement({ offer: o }: { offer: any }) {
  const { language } = useLanguage(),
    c = (s: string) => copy(language, s),
    b = o.booking,
    s = b.agreementSnapshot;
  const quantity = s?.quantity ?? o.requirement?.quantityNeeded ?? 1,
    price = s?.pricePerUnit ?? o.price,
    pricingUnit = s?.unit ?? o.listing.priceUnit;
  const unit =
    pricingUnit === 'per_kg'
      ? 'kg'
      : pricingUnit === 'per_quintal'
        ? 'quintal'
        : pricingUnit === 'per_trip'
          ? 'trip'
          : pricingUnit === 'per_day'
            ? 'day'
            : 'unit';
  const status =
    b.dispute && !['RESOLVED', 'REJECTED'].includes(b.dispute.status)
      ? 'Disputed'
      : b.fulfillmentStatus === 'CANCELLED'
        ? 'Cancelled'
        : b.fulfillmentStatus === 'COMPLETED'
          ? 'Fulfilled'
          : b.fulfillmentStatus === 'IN_PROGRESS'
            ? 'Active'
            : 'Accepted';
  const resource = s ? { resourceType: s.resourceType, attributes: s.resource } : o.listing;
  const rows = [
    [c('Supplier'), s?.seller?.name || o.listing.party.name],
    [c('Buyer'), s?.buyer?.name || o.requirement?.party?.name || c('Not agreed yet')],
    [c('Crop'), c(resourceTitle(resource))],
    [c('Quantity'), quantity + ' ' + c(unit)],
    [c('Quality'), resource.attributes.qualityGrade || c('Not agreed yet')],
    [c('Agreed price'), money(price) + ' / ' + c(unit)],
    [
      c('Total value'),
      money(
        s?.totalAmountPaise !== undefined
          ? s.totalAmountPaise / 100
          : (b.totalAmount ?? price * quantity)
      ),
    ],
    [c('Status'), c(status)],
    [
      c('Created'),
      new Date(s?.acceptedAt || b.createdAt).toLocaleString(
        language === 'en' ? 'en-IN' : language === 'hi' ? 'hi-IN' : 'mr-IN'
      ),
    ],
  ];
  const eventNames: Record<string, string> = {
    ACCEPT: 'Agreement accepted',
    FUND: 'Simulated funding recorded',
    START: 'Delivery started',
    COMPLETE: 'Delivery marked complete',
    RELEASE: 'Simulated payment released',
    CANCEL: 'Agreement cancelled',
    LOGISTICS_UPDATED: 'Delivery instructions updated',
    DISPUTE_OPENED: 'Dispute update',
  };
  const summary =
    rows.map(([name, value]) => name + ': ' + value).join('. ') +
    '. ' +
    c('Payment simulation — no real money moves.');
  return (
    <div className="ks-agreement">
      <p className="ks-eyebrow">KRISHISETU · {c('Trade agreement')}</p>
      <p className="ks-note">
        {c('Check quantity, quality and delivery details with the other party before dispatch.')}
      </p>
      <ReadAloud text={summary} />
      <dl>
        {rows.map(([name, value]) => (
          <React.Fragment key={name}>
            <dt>{name}</dt>
            <dd>{value}</dd>
          </React.Fragment>
        ))}
      </dl>
      <p className="ks-note">
        {c(
          s
            ? 'Accepted terms are preserved as a versioned snapshot. Later delivery notes do not rewrite them.'
            : 'Legacy booking: no historical acceptance snapshot was recorded.'
        )}
      </p>
      <p>
        <strong>{c('Delivery')}</strong>: {b.logisticsNote || c('Not agreed yet')}
      </p>
      <p>
        <strong>{c('Payment terms')}</strong>: {c('Payment simulation — no real money moves.')}
      </p>
      {b.cancellationReason && (
        <p>
          <strong>{c('Cancellation reason')}</strong>: {b.cancellationReason}
        </p>
      )}
      <p>
        {c(
          'Acceptance is recorded when the offer is accepted. No separate e-signature is claimed.'
        )}
      </p>
      <details>
        <summary>
          {c('Recorded activity')} ({b.events?.length || 0})
        </summary>
        {b.events?.map((event: any) => (
          <div className="ks-update" key={event.id}>
            <strong>{c(eventNames[event.kind] || event.kind)}</strong>
            <small>
              {new Date(event.createdAt).toLocaleString()} · {c('Participant')}:{' '}
              {event.actorId.slice(0, 8)}
            </small>
            {event.snapshot?.note && <p>{event.snapshot.note}</p>}
          </div>
        ))}
      </details>
      <p className="ks-muted">
        {c('Agreement reference')}: {b.id}
        {s ? ' · v' + s.version : ''}
      </p>
      <button className="ks-button full" onClick={printAgreement}>
        <FileText size={17} />
        {c('Print / save PDF')}
      </button>
    </div>
  );
}
