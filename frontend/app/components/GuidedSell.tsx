"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Sprout,
  Package,
  ClipboardCheck,
  WifiOff,
  BarChart3,
  X,
} from "lucide-react";
import { useLanguage } from "../../lib/LanguageContext";
import { copy, cropNames } from "../../lib/assist-copy";
import { parseVoiceListing } from "../../lib/voice-listing";
import { request, money, ApiError } from "../../lib/workspace";
import VoiceInput, { ReadAloud } from "./VoiceControls";
import CropIcon from "./CropIcon";
import { API_URL } from '../../lib/api-config';

const empty = {
  crop: "",
  quantity: "",
  unit: "quintal",
  grade: "",
  district: "",
  price: "",
};
export default function GuidedSell() {
  const { language } = useLanguage();
  const c = (text: string) => copy(language, text);
  const [party, setParty] = useState<any>(null),
    [draft, setDraft] = useState(empty),
    [step, setStep] = useState(0),
    [phrase, setPhrase] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [offline, setOffline] = useState(false),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState<string | null>(null),
    [pricePopup,setPricePopup]=useState(false),
    [nearbyPrices,setNearbyPrices]=useState<any[]>([]),
    [priceFeed,setPriceFeed]=useState<any>(null),
    [pricesLoading,setPricesLoading]=useState(false),
    [pricesError,setPricesError]=useState(''),
    [ready, setReady] = useState(false);
  const requestId = useRef(""),
    lock = useRef(false),
    frozen = useRef<any>(null);
  useEffect(() => {
    let active = true;
    request("/me")
      .then((d) => {
        if (!active) return;
        setParty(d.party);
        let stored: any = null;
        try {
          stored = JSON.parse(
            localStorage.getItem(`ks_crop_draft_${d.party.id}`) || "null",
          );
        } catch {}
        if (stored?.draft) {
          setDraft({ ...empty, ...stored.draft });
          requestId.current = stored.requestId || crypto.randomUUID();
          frozen.current = stored.pendingPayload || null;
        } else {
          setDraft({ ...empty, district: d.party.district });
          requestId.current = crypto.randomUUID();
        }
        setReady(true);
      })
      .catch(() => setError("Please sign in again."));
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      active = false;
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    if (ready && party && !saved) {
      try {
        localStorage.setItem(
          `ks_crop_draft_${party.id}`,
          JSON.stringify({
            draft,
            requestId: requestId.current,
            pendingPayload: frozen.current,
          }),
        );
      } catch {}
    }
  }, [draft, party, ready, saved]);
  const update = (key: string, value: string) => {
    if (frozen.current) {
      setError("Check the status before trying again.");
      return;
    }
    setDraft((v) => ({ ...v, [key]: value }));
  };
  async function openPricePopup(forceRefresh=true){
    setPricePopup(true);setPricesError('');setNearbyPrices([]);
    if(!draft.crop||draft.district.trim().length<2){setPricesError('Pehle fasal aur zila bharein.');return;}
    setPricesLoading(true);
    try{const response=await fetch(`${API_URL}/api/mandi-prices?limit=20&crop=${encodeURIComponent(draft.crop)}&district=${encodeURIComponent(draft.district.trim())}${forceRefresh?'&refresh=1':''}`,{cache:'no-store',signal:AbortSignal.timeout(75000)}),data=await response.json().catch(()=>null);if(!response.ok||!data?.success||data.source!=='AGMARKNET_LIVE')throw new Error('Sarkari mandi ke live daam abhi nahi mil paaye.');setPriceFeed(data);setNearbyPrices(Array.isArray(data.prices)?data.prices.map((price:any)=>data.fallbackDistrict?{...price,market:`${price.market} (${price.district})`}:price):[]);}catch(e:any){setPricesError(e.message||'Daam abhi nahi mil paaye.');}finally{setPricesLoading(false);}
  }
  function capture(text: string) {
    setPhrase(text);
    const found = parseVoiceListing(text);
    if (frozen.current) return;
    setDraft((v) => ({
      ...v,
      ...(found.crop ? { crop: found.crop } : {}),
      ...(found.quantity
        ? { quantity: String(found.quantity), unit: found.unit || "kg" }
        : {}),
    }));
    setMessage(
      found.crop || found.quantity
        ? "Review the captured details. Nothing is published automatically."
        : "We could not identify a crop or quantity. Choose them below.",
    );
  }
  const kg =
    Number(draft.quantity) *
    (draft.unit === "quintal" ? 100 : draft.unit === "tonne" ? 1000 : 1);
  const valid =
    !!draft.crop &&
    ["A", "B", "C"].includes(draft.grade) &&
    kg > 0 &&
    kg <= 10000000 &&
    draft.district.trim().length >= 2 &&
    Number(draft.price) > 0 &&
    Number.isFinite(Number(draft.price));
  async function publish() {
    if (lock.current || offline || !valid || !party) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const payload = frozen.current || {
      clientRequestId: requestId.current,
      resourceType: "CROP_LOT",
      district: draft.district.trim(),
      price: Number(draft.price),
      priceUnit: "per_kg",
      attributes: {
        crop: draft.crop,
        quantityKg: kg,
        qualityGrade: draft.grade,
      },
    };
    frozen.current = payload;
    try {
      localStorage.setItem(
        `ks_crop_draft_${party.id}`,
        JSON.stringify({
          draft,
          requestId: requestId.current,
          pendingPayload: payload,
        }),
      );
    } catch {}
    try {
      const result = await request("/resources/listing", "POST", payload);
      setSaved(result.listing.id);
      try {
        localStorage.removeItem(`ks_crop_draft_${party.id}`);
      } catch {}
    } catch (error) {
      if (
        error instanceof ApiError &&
        [400, 401, 403, 422].includes(error.status)
      ) {
        frozen.current = null;
        setError(
          error.status === 401
            ? "Please sign in again."
            : "Please enter a valid quantity, district and price.",
        );
        try {
          localStorage.setItem(
            `ks_crop_draft_${party.id}`,
            JSON.stringify({ draft, requestId: requestId.current }),
          );
        } catch {}
      } else
        setError(
          "We could not confirm the save. Your draft is kept. Retry the same submission safely.",
        );
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  const headings = [
    "Choose your crop",
    "How much do you have?",
    "Check before publishing",
  ];
  if (party && !party.roles.includes("FARMER"))
    return (
      <section className="ks-panel">
        <p>{c("This page is for farmers. Choose your own portal.")}</p>
        <Link href="/demo">{c("Switch portal")}</Link>
      </section>
    );
  if (saved)
    return (
      <section className="ks-assisted ks-panel">
        <CheckCircle2 size={56} color="#176448" />
        <h1>{c("Your crop is published")}</h1>
        <p>
          {c(
            "Buyers can now send you offers. You decide which offer to accept.",
          )}
        </p>
        <p>
          {c(draft.crop)} · {kg.toLocaleString("en-IN")} {c("kg")} ·{" "}
          {money(Number(draft.price))}/{c("kg")}
        </p>
        <ReadAloud
          text={
            c("Your crop is published") +
            ". " +
            c(
              "Buyers can now send you offers. You decide which offer to accept.",
            )
          }
        />
        <Link href={`/farmer/buyers?listingId=${saved}`} className="ks-button">
          {c("Find buyers")} <ArrowRight size={19} />
        </Link>
        <Link href="/farmer/offers" className="ks-button secondary">
          {c("View my offers")} <ArrowRight size={19} />
        </Link>
        <button
          className="ks-button secondary"
          onClick={() => {
            setSaved(null);
            setDraft({ ...empty, district: party.district });
            setStep(0);
            requestId.current = crypto.randomUUID();
            frozen.current = null;
            setPhrase("");
            setMessage("");
          }}
        >
          {c("Add another crop")}
        </button>
      </section>
    );
  return (
    <div className="ks-assisted">
      <Link className="ks-back" href="/farmer/home">
        <ArrowLeft size={16} />
        {c("Go home")}
      </Link>
      <header className="ks-assist-heading">
        <p className="ks-eyebrow">{c("Assisted selling")}</p>
        <h1>{c("Sell my crop")}</h1>
        <p>{c("Three small steps. You stay in control.")}</p>
      </header>
      <ol className="ks-steps" aria-label={c("Review")}>
        {[Sprout, Package, ClipboardCheck].map((Icon, i) => (
          <li
            key={i}
            aria-current={step === i ? "step" : undefined}
            className={i <= step ? "active" : ""}
          >
            <Icon size={21} />
            <span>{i + 1}</span>
          </li>
        ))}
      </ol>
      {offline && (
        <p className="ks-alert">
          <WifiOff size={20} />
          {c("Offline. Your draft is safe here; reconnect before publishing.")}
        </p>
      )}
      {error && (
        <p role="alert" className="ks-alert error">
          {c(error)}
          {!party && <Link href="/demo">{c("Sign in to continue")}</Link>}
        </p>
      )}
      <section className="ks-panel">
        <div className="ks-section-heading">
          <h2>{c(headings[step])}</h2>
          <ReadAloud
            text={
              c(headings[step]) +
              ". " +
              (step === 0
                ? c("Example: I have 20 quintals of wheat")
                : step === 1
                  ? c("Quantity") +
                    ", " +
                    c("Quality") +
                    ", " +
                    c("Your asking price")
                  : c(draft.crop) +
                    ", " +
                    kg +
                    " " +
                    c("kg") +
                    ", " +
                    money(Number(draft.price)) +
                    " " +
                    c("Price per kg"))
            }
          />
        </div>
        {step === 0 && (
          <>
            <VoiceInput onText={capture} />
            <label className="ks-assist-label">
              {c("You can also type what you would say")}
              <input
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                placeholder={c("Example: I have 20 quintals of wheat")}
              />
            </label>
            <button
              type="button"
              className="ks-button secondary"
              disabled={!phrase || !!frozen.current}
              onClick={() => capture(phrase)}
            >
              {c("Use these details")}
            </button>
            {message && (
              <p role="status" className="ks-note">
                {c(message)}
              </p>
            )}
            <div className="ks-crop-grid">
              {cropNames.map((crop, i) => (
                <button
                  type="button"
                  key={crop}
                  disabled={!!frozen.current}
                  aria-pressed={draft.crop === crop}
                  className={draft.crop === crop ? "selected" : ""}
                  onClick={() => update("crop", crop)}
                >
                  <span className={`ks-crop-symbol crop-${i % 4}`}>
                    <CropIcon crop={crop} />
                  </span>
                  {c(crop)}
                </button>
              ))}
            </div>
          </>
        )}
        {step === 1 && (
          <div className="ks-form">
            <label>
              {c("Quantity")}
              <input
                inputMode="decimal"
                type="number"
                min="0.01"
                step="any"
                value={draft.quantity}
                disabled={!!frozen.current}
                onChange={(e) => update("quantity", e.target.value)}
              />
            </label>
            <label>
              {c("kg")} / {c("quintal")}
              <select
                value={draft.unit}
                disabled={!!frozen.current}
                onChange={(e) => update("unit", e.target.value)}
              >
                {["kg", "quintal", "tonne"].map((unit) => (
                  <option key={unit} value={unit}>
                    {c(unit)}
                  </option>
                ))}
              </select>
            </label>
            <p className="ks-note">
              = {Number.isFinite(kg) ? kg.toLocaleString("en-IN") : 0} {c("kg")}
            </p>
            <label>
              {c("Quality")}
              <select
                aria-label={c('Quality')}
                value={draft.grade}
                disabled={!!frozen.current}
                onChange={(e) => update("grade", e.target.value)}
              >
                <option value="" disabled>{c('Choose the quality you can supply')}</option>
                {[
                  "A — sorted, good quality",
                  "B — mixed sizes",
                  "C — needs inspection",
                ].map((grade) => (
                  <option value={grade[0]} key={grade}>
                    {c(grade)}
                  </option>
                ))}
              </select>
            </label>
            <p>
              {c("Your grade is self-declared. The buyer must inspect it.")}
            </p>
            <label>
              {c("District")}
              <input
                value={draft.district}
                disabled={!!frozen.current}
                onChange={(e) => update("district", e.target.value)}
              />
            </label>
            <label>
              {c("Price per kg")} (₹)
              <input
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={draft.price}
                disabled={!!frozen.current}
                onChange={(e) => update("price", e.target.value)}
              />
            </label>
            <a href="#" className="ks-link" onClick={(event)=>{event.preventDefault();void openPricePopup();}}>
              <BarChart3 size={17}/>
              {c("Compare prices")} ↗
            </a>
          </div>
        )}
        {step === 2 && (
          <>
            <dl className="ks-review-details">
              {[
                [c("Crop"), c(draft.crop)],
                [c("Quantity"), `${kg.toLocaleString("en-IN")} ${c("kg")}`],
                [c("Quality"), draft.grade],
                [c("District"), draft.district],
                [c("Price per kg"), money(Number(draft.price))],
                [c("Total asking value"), money(kg * Number(draft.price))],
              ].map(([name, value]) => (
                <div key={name}>
                  <dt>{name}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <p className="ks-note">
              {c(
                "This is an asking price, not a guaranteed sale or take-home amount.",
              )}
            </p>
          </>
        )}
        <div className="ks-assist-actions">
          {step > 0 && (
            <button
              type="button"
              className="ks-button secondary"
              disabled={busy}
              onClick={() => setStep((s) => s - 1)}
            >
              <ArrowLeft size={18} />
              {c("Back")}
            </button>
          )}
          {step < 2 ? (
            <button
              className="ks-button"
              disabled={!ready || (step === 0 ? !draft.crop : !valid)}
              onClick={() => setStep((s) => s + 1)}
            >
              {c(step === 1 ? "Review" : "Next")}
              <ArrowRight size={19} />
            </button>
          ) : (
            <button
              className="ks-button"
              disabled={busy || offline || !valid || !party}
              onClick={publish}
            >
              {c(busy ? "Saving your crop…" : "Publish crop")}
              <CheckCircle2 size={19} />
            </button>
          )}
        </div>
        <p className="ks-subtitle">{c("Saved on this device as a draft.")}</p>
      </section>
      {pricePopup&&<div className="ks-modal-backdrop" role="presentation" onMouseDown={()=>setPricePopup(false)}><section className="ks-modal" role="dialog" aria-modal="true" aria-labelledby="nearby-price-title" onMouseDown={e=>e.stopPropagation()}><header className="ks-section-heading"><div><p className="ks-eyebrow">Aas paas ke daam</p><h2 id="nearby-price-title">Price Compare</h2></div><button className="ks-icon-button" aria-label="Band Karein" onClick={()=>setPricePopup(false)}><X size={20}/></button></header><p className="ks-subtitle">{draft.crop} · {draft.district}. Mandi ke daam sirf jaankari ke liye hain; yeh pakka khareedar ka daam nahi hai.</p>{pricesLoading?<p className="ks-loading">Daam dekh rahe hain…</p>:pricesError?<p className="ks-alert error">{pricesError}</p>:nearbyPrices.length?<dl className="ks-review-details">{nearbyPrices.map((price:any)=><div key={price.id}><dt>{price.market}</dt><dd><strong>{money(Number(price.pricePerKg))}/kg</strong><small>Mandi daam · {new Date(price.recordedAt).toLocaleDateString('en-IN')}</small><button type="button" className="ks-button secondary" onClick={()=>{update('price',String(price.pricePerKg));setPricePopup(false);}}>Use this price</button></dd></div>)}</dl>:<p className="ks-note">Is fasal ke liye is zila mein abhi koi mandi daam nahi mila. Apna daam bhar sakte hain.</p>}<button type="button" className="ks-button secondary full" onClick={()=>setPricePopup(false)}>Band Karein</button></section></div>}
    </div>
  );
}
