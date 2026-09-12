"use client";
import { useState, useRef } from "react";
import { request } from "../../lib/workspace";
import { useLanguage } from "../../lib/LanguageContext";
import { copy } from "../../lib/assist-copy";
import { ReadAloud } from "./VoiceControls";

export default function LogisticsNote({
  booking,
  readOnly = false,
  onSaved,
}: {
  booking: any;
  readOnly?: boolean;
  onSaved?:(booking:any)=>void;
}) {
  const [note, setNote] = useState(booking.logisticsNote || "");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false),
    { language } = useLanguage(),
    c = (s: string) => copy(language, s);
  return (
    <details className="ks-logistics">
      <summary>{c("Pickup & delivery instructions")}</summary>
      {readOnly || booking.fulfillmentStatus==='CANCELLED' ? (
        <p>{booking.logisticsNote || c("No instructions recorded.")}</p>
      ) : (
        <form
          className="ks-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (lock.current) return;
            lock.current = true;
            setBusy(true);
            try {
              const result=await request(`/bookings/${booking.id}/logistics`, "PATCH", {
                note,
              });
              onSaved?.(result.booking);
              setStatus("Delivery instructions saved for both participants.");
            } catch {
              setStatus("Check the status before trying again.");
            } finally {
              lock.current = false;
              setBusy(false);
            }
          }}
        >
          <label>
            {c("Shared logistics note")}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              minLength={3}
              maxLength={2000}
              rows={3}
              placeholder={c(
                "Pickup point, contact person, delivery window and handling instructions",
              )}
              required
            />
          </label>
          <button className="ks-button secondary" disabled={busy}>
            {c(busy ? "Saving…" : "Save instructions")}
          </button>
          {status && <p role="status">{c(status)}</p>}
        </form>
      )}
      {note && <ReadAloud text={note} />}
    </details>
  );
}
