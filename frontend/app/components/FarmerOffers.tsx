"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Receipt, RefreshCw, X } from "lucide-react";
import { request, money, ApiError } from "../../lib/workspace";
import { useLanguage } from "../../lib/LanguageContext";
import { copy } from "../../lib/assist-copy";
import SimpleAgreement from "./SimpleAgreement";
import OfferDecision from "./OfferDecision";
import LogisticsNote from "./LogisticsNote";
import { ReadAloud } from "./VoiceControls";
type Action = { offer: any; type: string } | null;
export default function FarmerOffers() {
  const { language } = useLanguage(),
    c = (s: string) => copy(language, s);
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [action, setAction] = useState<Action>(null),
    [loading, setLoading] = useState(true);
  const lock = useRef(false),
    dialog = useRef<HTMLDialogElement>(null);
  async function load() {
    setLoading(true);
    try {
      setData(await request("/snapshot?section=offers"));
      setError("");
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 401
          ? "Please sign in again."
          : "Check the status before trying again.",
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
    setError("");
    const f = new FormData(event.currentTarget),
      o = action.offer,
      type = action.type;
    let path = `/offers/${o.id}`,
      method = "PATCH",
      body: any = { action: type };
    if (type === "COUNTER") body.price = Number(f.get("price"));
    if (["FUND", "START", "COMPLETE", "RELEASE", "CANCEL"].includes(type)) {
      path = `/bookings/${o.booking.id}/action`;
      method = "POST";
      if (type === "CANCEL") body.reason = String(f.get("reason"));
    }
    if (type === "DISPUTE") {
      path = `/bookings/${o.booking.id}/dispute`;
      method = "POST";
      body = {
        category: "OTHER",
        reason: String(f.get("reason")),
        evidenceUrls: [],
      };
    }
    if (type === "RATING") {
      path = `/bookings/${o.booking.id}/rating`;
      method = "POST";
      body = {
        score: Number(f.get("score")),
        comment: String(f.get("comment") || ""),
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
            ...(result.booking?.fulfillmentStatus === "CANCELLED"
              ? { status: "REJECTED" }
              : {}),
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
      setNotice("Action saved.");
      setAction(null);
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 401
          ? "Please sign in again."
          : "Check the status before trying again.",
      );
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  const names: Record<string, string> = {
    ACCEPT: "Accept",
    REJECT: "Reject",
    COUNTER: "Counter",
    FUND: "Simulate funding",
    START: "Start fulfillment",
    COMPLETE: "Mark delivered",
    RELEASE: "Confirm & release",
    DISPUTE: "Raise dispute",
    RATING: "Rate partner",
    CANCEL: "Cancel booking",
  };
  if (data && !data.party.roles.includes("FARMER"))
    return (
      <section className="ks-panel">
        <p>{c("This page is for farmers. Choose your own portal.")}</p>
        <Link href="/demo">{c("Switch portal")}</Link>
      </section>
    );
  const statuses: Record<string, string> = {
    PENDING: "Pending",
    COUNTERED: "Countered",
    ACCEPTED: "Accepted",
    REJECTED: "Rejected",
    IN_PROGRESS: "Active",
    COMPLETED: "Fulfilled",
    CANCELLED: "Cancelled",
    ESCROWED: "Payment held",
    RELEASED: "Payment released",
    FAILED: "Payment failed",
  };
  return (
    <div className="ks-assisted" style={{ maxWidth: 860 }}>
      <Link href="/farmer/home" className="ks-back">
        <ArrowLeft size={17} />
        {c("Go home")}
      </Link>
      <header className="ks-page-heading">
        <h1>{c("Offers & payments")}</h1>
        <button
          className="ks-button secondary"
          disabled={loading}
          onClick={load}
        >
          <RefreshCw size={17} />
          {c("Refresh")}
        </button>
      </header>
      <p className="ks-note">
        {c("Payment simulation — no real money moves.")}
      </p>
      {error && (
        <p className="ks-alert error" role="alert">
          {c(error)} <Link href="/demo">{c("Sign in to continue")}</Link>
        </p>
      )}
      {notice && (
        <p className="ks-alert" role="status">
          <CheckCircle2 size={20} />
          {c(notice)}
        </p>
      )}
      {loading && !data ? (
        <p className="ks-loading">{c("Loading…")}</p>
      ) : data?.offers.length ? (
        data.offers.map((o: any) => {
          const b = o.booking,
            seller = o.listing.partyId === data.party.id,
            canAccept =
              (seller && o.status === "PENDING") ||
              (!seller && o.status === "COUNTERED"),
            unit =
              o.listing.priceUnit === "per_quintal"
                ? "quintal"
                : o.listing.priceUnit === "per_kg"
                  ? "kg"
                  : o.listing.priceUnit === "per_trip"
                    ? "trip"
                    : o.listing.priceUnit === "per_day"
                      ? "day"
                      : "unit";
          const frozen =
            b?.dispute && !["RESOLVED", "REJECTED"].includes(b.dispute.status);
          const buttons: string[] = [];
          if (["PENDING", "COUNTERED"].includes(o.status)) {
            if (canAccept) buttons.push("ACCEPT");
            if (seller && o.status === "PENDING") buttons.push("COUNTER");
            buttons.push("REJECT");
          }
          if (b && !frozen && b.fulfillmentStatus !== "CANCELLED") {
            if (
              b.paymentStatus === "PENDING" &&
              b.fulfillmentStatus === "PENDING"
            )
              buttons.push("CANCEL");
            if (!seller && b.paymentStatus === "PENDING") buttons.push("FUND");
            if (
              seller &&
              b.paymentStatus === "ESCROWED" &&
              b.fulfillmentStatus === "PENDING"
            )
              buttons.push("START");
            if (seller && b.fulfillmentStatus === "IN_PROGRESS")
              buttons.push("COMPLETE");
            if (
              !seller &&
              b.fulfillmentStatus === "COMPLETED" &&
              b.paymentStatus === "ESCROWED"
            )
              buttons.push("RELEASE");
            if (
              b.fulfillmentStatus === "COMPLETED" &&
              !b.ratings?.some((r: any) => r.giverPartyId === data.party.id)
            )
              buttons.push("RATING");
            if (!b.dispute) buttons.push("DISPUTE");
          }
          return (
            <article key={o.id} className="ks-panel" style={{ marginTop: 20 }}>
              <div className="ks-section-heading">
                <div>
                  <p className="ks-eyebrow">
                    {c(seller ? "Buyer" : "Supplier")}:{" "}
                    {seller ? o.requirement?.party?.name : o.listing.party.name}
                  </p>
                  <h2>
                    {c(
                      o.listing.attributes.crop ||
                        o.listing.attributes.vehicleType ||
                        o.listing.resourceType,
                    )}
                  </h2>
                </div>
                <span className="ks-badge good">
                  {c(statuses[o.status] || o.status)}
                </span>
              </div>
              <div className="ks-trade-value">
                <strong>
                  {money(o.price)} / {c(unit)}
                </strong>
                <span>
                  {o.requirement?.quantityNeeded || 1} {c(unit)} ·{" "}
                  {c("Total value")}:{" "}
                  {money(
                    b?.totalAmount ??
                      o.price * (o.requirement?.quantityNeeded || 1),
                  )}
                </span>
              </div>
              <ReadAloud
                text={`${c("Buyer")}: ${o.requirement?.party?.name || ""}. ${c("Agreed price")}: ${money(o.price)} ${c(unit)}. ${c("Quantity")}: ${o.requirement?.quantityNeeded || 1}. ${c("Status")}: ${c(statuses[o.status] || o.status)}`}
              />
              {b && (
                <p className="ks-note">
                  {c("Delivery")}:{" "}
                  {c(statuses[b.fulfillmentStatus] || b.fulfillmentStatus)} ·{" "}
                  {c(statuses[b.paymentStatus] || b.paymentStatus)}
                </p>
              )}
              {seller && <OfferDecision offer={o} />}
              <div className="ks-actions" style={{ marginTop: 18 }}>
                {buttons.map((type) => (
                  <button
                    key={type}
                    className={`ks-button ${["REJECT", "DISPUTE", "RATING"].includes(type) ? "secondary" : ""}`}
                    disabled={busy}
                    onClick={() => {
                      setError("");
                      setAction({ offer: o, type });
                    }}
                  >
                    {c(names[type])}
                  </button>
                ))}
              </div>
              {b && (
                <>
                  <details style={{ marginTop: 20 }}>
                    <summary className="ks-button secondary">
                      <Receipt size={19} />
                      {c("Agreement")}
                    </summary>
                    <SimpleAgreement offer={o} />
                  </details>
                  <LogisticsNote booking={b} onSaved={booking=>setData((d:any)=>({...d,offers:d.offers.map((item:any)=>item.id===o.id?{...item,booking:{...item.booking,...booking}}:item)}))}/>
                  {b.dispute && (
                    <p className="ks-note">
                      {c("Disputed")}: {b.dispute.reason}
                    </p>
                  )}
                </>
              )}
            </article>
          );
        })
      ) : (
        <section className="ks-panel">
          <Receipt size={35} />
          <h2>{c("No offers yet")}</h2>
          <p>{c("Publish a crop so buyers can make an offer.")}</p>
          <Link href="/farmer/sell" className="ks-button">
            {c("Sell my crop")}
          </Link>
        </section>
      )}
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
              <h2 id="offer-action-title">{c(names[action.type])}</h2>
              <button
                type="button"
                className="ks-icon-button"
                disabled={busy}
                aria-label={c("Cancel")}
                onClick={() => setAction(null)}
              >
                <X size={20} />
              </button>
            </header>
            <p>
              {c(action.offer.listing.attributes.crop || action.offer.listing.resourceType)} ·{" "}
              {money(action.offer.price)}/
              {c(
                ({per_quintal:'quintal',per_kg:'kg',per_day:'day',per_trip:'trip'} as Record<string,string>)[action.offer.listing.priceUnit] || 'unit',
              )}
            </p>
            {action.type === "ACCEPT" && (
              <p className="ks-note">
                {c("You are accepting these terms. A booking will be created.")}
              </p>
            )}
            {["FUND", "RELEASE"].includes(action.type) && (
              <p>{c("Payment simulation — no real money moves.")}</p>
            )}
            {action.type === "COUNTER" && (
              <label>
                {c("Your asking price")}
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
            {action.type==='CANCEL'&&<p className="ks-note">{c('Only an unfunded, unstarted booking can be cancelled. The resource becomes available again.')}</p>}
            {["DISPUTE", "CANCEL"].includes(action.type) && (
              <label>
                {c(action.type==='CANCEL'?'Cancellation reason':'What happened?')}
                <textarea
                  name="reason"
                  minLength={10}
                  maxLength={action.type==='CANCEL'?1000:3000}
                  rows={4}
                  required
                />
              </label>
            )}
            {action.type === "RATING" && (
              <label>
                {c("Rate partner")}
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
            <button className="ks-button" disabled={busy}>
              {c(busy ? "Saving…" : "Confirm")}
            </button>
            <button
              type="button"
              className="ks-button secondary"
              disabled={busy}
              onClick={() => setAction(null)}
            >
              {c("Cancel")}
            </button>
          </form>
        )}
      </dialog>
    </div>
  );
}
