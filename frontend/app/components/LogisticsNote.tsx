'use client';
import { useState } from 'react';
import { request } from '../../lib/workspace';

export default function LogisticsNote({ booking, readOnly = false }: { booking: any; readOnly?: boolean }) {
  const [note, setNote] = useState(booking.logisticsNote || '');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  return <details className="ks-logistics"><summary>Pickup & delivery instructions</summary>{readOnly ? <p>{note || 'No instructions recorded.'}</p> : <form className="ks-form" onSubmit={async e => { e.preventDefault(); setBusy(true); try { await request(`/bookings/${booking.id}/logistics`, 'PATCH', { note }); setStatus('Delivery instructions saved for both participants.'); } catch(e: any) { setStatus(e.message); } finally { setBusy(false); } }}><label>Shared logistics note<textarea value={note} onChange={e => setNote(e.target.value)} minLength={3} maxLength={2000} rows={3} placeholder="Pickup point, contact person, delivery window and handling instructions" required/></label><button className="ks-button secondary" disabled={busy}>{busy ? 'Saving…' : 'Save instructions'}</button>{status && <p role="status">{status}</p>}</form>}</details>;
}
