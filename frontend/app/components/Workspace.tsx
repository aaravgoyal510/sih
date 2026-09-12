"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import DemandPanel from "./DemandPanel";
import RoleOverview, { roleWork } from "./RoleOverview";
import SimpleAgreement from "./SimpleAgreement";
import FpoMembership from "./FpoMembership";
import LogisticsNote from "./LogisticsNote";
import LivePriceAssist from './LivePriceAssist';
import {VerificationDocument,VerificationForm} from './VerificationDocument';
import {useLanguage} from '../../lib/LanguageContext';
import {copy} from '../../lib/assist-copy';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ClipboardList,
  FileText,
  Layers3,
  Leaf,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  request,
  money,
  label,
  resourceTitle,
  resourceLabels,
  roleLabels,
  resourceFields,
  attributesFromForm,
  destination,
} from "../../lib/workspace";

type View =
  | "overview"
  | "market"
  | "create"
  | "offers"
  | "verification"
  | "disputes"
  | "analytics"
  | "members";
type Modal = {
  kind:
    | "offer"
    | "counter"
    | "dispute"
    | "rating"
    | "review"
    | "agreement"
    | "cancel";
  item: any;
  reviewKind?: string;
} | null;
const providerType: Record<string, string> = {
  STORAGE_OPERATOR: "COLD_STORAGE",
  TRANSPORT_OPERATOR: "TRANSPORT",
  EQUIPMENT_PROVIDER: "EQUIPMENT_SERVICE",
  LABOR_CONTRACTOR: "LABOR",
  INPUT_SUPPLIER: "INPUT_GROUP_BUY",
};
const districts = [
  "Ahmednagar",
  "Akola",
  "Amravati",
  "Aurangabad",
  "Beed",
  "Bhandara",
  "Buldhana",
  "Chandrapur",
  "Dhule",
  "Gadchiroli",
  "Gondia",
  "Hingoli",
  "Jalgaon",
  "Jalna",
  "Kolhapur",
  "Latur",
  "Mumbai",
  "Mumbai Suburban",
  "Nagpur",
  "Nanded",
  "Nandurbar",
  "Nashik",
  "Osmanabad",
  "Palghar",
  "Parbhani",
  "Pune",
  "Raigad",
  "Ratnagiri",
  "Sangli",
  "Satara",
  "Sindhudurg",
  "Solapur",
  "Thane",
  "Wardha",
  "Washim",
  "Yavatmal",
];
function Badge({
  children,
  good = false,
}: {
  children: React.ReactNode;
  good?: boolean;
}) {
  return <span className={`ks-badge ${good ? "good" : ""}`}>{children}</span>;
}
function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="ks-empty">
      <Package size={30} />
      <h3>{title}</h3>
      <p>{detail}</p>
    </div>
  );
}

export default function Workspace({
  initialView = "overview",
  audience = "provider",
  resourceFilter,
}: {
  initialView?: View;
  audience?: string;
  resourceFilter?: string;
}) {
  const pathname = usePathname();
  const {language}=useLanguage(),c=(s:string)=>copy(language,s);
  const [data, setData] = useState<any>(null);
  const [view, setView] = useState<View>(initialView);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(
    resourceFilter || (audience === "buyer" ? "CROP_LOT" : "ALL"),
  );
  const [type, setType] = useState("CROP_LOT");
  const [kind, setKind] = useState("listing");
  const [modal, setModal] = useState<Modal>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [crop, setCrop] = useState("Onion");
  const [listingCrop,setListingCrop]=useState('Onion');
  const [listingDistrict,setListingDistrict]=useState('');
  const [listingPrice,setListingPrice]=useState('20');
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>(".ks-modal");
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input, textarea, select, a[href]",
        ) || [],
      );
    focusable()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) setModal(null);
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [modal, busy]);
  const readSequence = useRef(0),
    mutationLock = useRef(false),
    submissionKeys = useRef<Record<string, string>>({});
  const reload = useCallback(async () => {
    const sequence = ++readSequence.current;
    try {
      const result = await request(`/snapshot?section=${view}`);
      if (sequence === readSequence.current) {
        setData(result);
        setError("");
      }
    } catch (e: any) {
      if (sequence === readSequence.current) setError(e.message);
    } finally {
      if (sequence === readSequence.current) setLoading(false);
    }
  }, [view]);
  useEffect(() => {
    setLoading(true);
    reload();
    window.addEventListener("session-change", reload);
    return () => {
      readSequence.current++;
      window.removeEventListener("session-change", reload);
    };
  }, [reload]);
  useEffect(() => {
    if (data?.party) {
      setType(providerType[data.party.roles[0]] || "CROP_LOT");
      setKind(data.party.roles.includes("BUYER") ? "requirement" : "listing");
    }
  }, [data?.party?.id]);
  async function mutate(
    path: string,
    method: string,
    body: unknown,
    message: string,
  ) {
    if (mutationLock.current) return false;
    mutationLock.current = true;
    const key = `${data?.party?.id}:${path}:${(body as any)?.listingId || ""}`;
    const keyed =
      method === "POST" &&
      (path.startsWith("/resources/") || path === "/offers");
    if (keyed)
      body = {
        ...(body as any),
        clientRequestId: (submissionKeys.current[key] ||= crypto.randomUUID()),
      };
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await request(path, method, body);
      if (keyed) delete submissionKeys.current[key];
      setNotice(message);
      setModal(null);
      if (result.listing || result.requirement) {
        setData((current: any) => ({
          ...current,
          listings: result.listing
            ? [{ ...result.listing, party: current.party }, ...current.listings]
            : current.listings,
          requirements: result.requirement
            ? [
                {
                  ...result.requirement,
                  party: current.party,
                  _count: { offers: 0 },
                },
                ...current.requirements,
              ]
            : current.requirements,
        }));
      } else {
        void reload();
      }
      return true;
    } catch (e: any) {
      if (keyed && [400, 401, 403, 404].includes(e.status))
        delete submissionKeys.current[key];
      setError(e.message);
      return false;
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  }
  if (loading)
    return (
      <div className="ks-loading">
        <RefreshCw className="spin" size={24} />
        <p>{c('Opening your workspace…')}</p>
      </div>
    );
  if (!data)
    return (
      <div className="ks-empty">
        <ShieldCheck size={32} />
        <h1>{c('Open your workspace')}</h1>
        <p>{error || "Sign in to continue."}</p>
        <Link className="ks-button" href="/demo">
          Choose a demo profile <ArrowRight size={16} />
        </Link>
        <Link href="/login">{c('Sign in')}</Link>
      </div>
    );
  const p = data.party;
  const role = p.roles[0];
  const routeRoles: Record<string, string[]> = {
    "/buyer": ["BUYER"],
    "/fpo": ["FPO_ADMIN"],
    "/district-admin": ["DISTRICT_ADMIN"],
    "/state-admin": ["STATE_ADMIN"],
    "/platform-admin": ["PLATFORM_ADMIN"],
    "/provider": Object.keys(providerType),
  };
  const allowedRoute = pathname.startsWith("/farmer")
    ? ["FARMER"]
    : routeRoles[pathname];
  if (allowedRoute && !p.roles.some((r: string) => allowedRoute.includes(r)))
    return (
      <section className="ks-panel">
        <h1>Open your own workspace</h1>
        <p>This portal belongs to a different role.</p>
        <Link href={destination(role)} className="ks-button">
          Continue as {roleLabels[role]}
        </Link>
      </section>
    );
  const work = roleWork[role];
  const admin = p.roles.some((r: string) =>
    ["DISTRICT_ADMIN", "STATE_ADMIN", "PLATFORM_ADMIN"].includes(r),
  );
  const fpo = p.roles.includes("FPO_ADMIN");
  const buyer = p.roles.includes("BUYER");
  const farmer = p.roles.includes("FARMER");
  const cropPriceListing=kind==='listing'&&['CROP_LOT','CONTRACT_FARMING'].includes(type);
  const myListings = data.listings.filter((l: any) => l.partyId === p.id);
  const myRequirements = data.requirements.filter(
    (r: any) => r.partyId === p.id,
  );
  const bookings = data.offers.filter((o: any) => o.booking);
  const pending = data.offers.filter((o: any) =>
    ["PENDING", "COUNTERED"].includes(o.status),
  );
  const openDisputes = data.disputes.filter(
    (d: any) => !["RESOLVED", "REJECTED"].includes(d.status),
  );
  const escrow = bookings
    .filter((o: any) => o.booking.paymentStatus === "ESCROWED")
    .reduce((s: number, o: any) => s + (o.booking.totalAmount || 0), 0);
  const tabs: Array<[View, string, any]> =
    pathname === "/farmer/account"
      ? [
          ["verification", "Verification", ShieldCheck],
          ["disputes", "Disputes", ClipboardList],
        ]
      : admin
        ? [
            ["overview", "Overview", Layers3],
            ["verification", "Verification", ShieldCheck],
            ["disputes", "Disputes", ClipboardList],
            ["analytics", "Market intelligence", TrendingUp],
            ["offers", "Transactions", Wallet],
          ]
        : [
            ["overview", "Overview", Layers3],
            ["market", work?.market || "Marketplace", Search],
            ["create", work?.create || "Create listing", Plus],
            ["offers", "Offers & bookings", Wallet],
            ...(fpo
              ? [["members", "FPO pooling", Users] as [View, string, any]]
              : []),
            ["verification", "Verification", ShieldCheck],
          ];
  const matched = data.listings.filter(
    (l: any) =>
      l.status === "OPEN" &&
      l.partyId !== p.id &&
      (filter === "ALL" || l.resourceType === filter) &&
      `${resourceTitle(l)} ${l.district} ${l.party.name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const fields = resourceFields[type];
  const allowedTypes = buyer
    ? ["CROP_LOT", "CONTRACT_FARMING"]
    : fpo
      ? ["CROP_LOT", "INPUT_GROUP_BUY"]
      : farmer
        ? ["CROP_LOT", "USED_EQUIPMENT"]
        : [providerType[role]].filter(Boolean);
  async function submitResource(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const saved = await mutate(
      `/resources/${kind}`,
      "POST",
      {
        resourceType: type,
        district: String(form.get("district")),
        price: Number(form.get("price")),
        priceUnit: String(form.get("priceUnit")),
        quantityNeeded: Number(
          form.get(type === "CROP_LOT" ? "quantityKg" : "quantityNeeded") || 1,
        ),
        attributes: attributesFromForm(type, form),
      },
      kind === "listing"
        ? "Listing published. It is now visible in the marketplace."
        : "Demand published. Suppliers can now respond.",
    );
    if (saved) setView("overview");
  }
  async function submitModal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!modal) return;
    const f = new FormData(e.currentTarget);
    const item = modal.item;
    if (modal.kind === "cancel")
      await mutate(
        `/bookings/${item.id}/action`,
        "POST",
        { action: "CANCEL", reason: String(f.get("reason")) },
        "Booking cancelled. The resource is available again; both parties are notified.",
      );
    if (modal.kind === "offer")
      await mutate(
        "/offers",
        "POST",
        {
          listingId: item.id,
          price: Number(f.get("price")),
          quantity: Number(f.get("quantity")),
        },
        "Offer sent. The seller will see it in their workspace.",
      );
    if (modal.kind === "counter")
      await mutate(
        `/offers/${item.id}`,
        "PATCH",
        { action: "COUNTER", price: Number(f.get("price")) },
        "Counter-offer sent to the buyer.",
      );
    if (modal.kind === "dispute")
      await mutate(
        `/bookings/${item.id}/dispute`,
        "POST",
        {
          category: f.get("category"),
          reason: f.get("reason"),
          evidenceUrls: f.get("evidence") ? [String(f.get("evidence"))] : [],
        },
        "Dispute submitted to district review.",
      );
    if (modal.kind === "rating")
      await mutate(
        `/bookings/${item.id}/rating`,
        "POST",
        { score: Number(f.get("score")), comment: f.get("comment") },
        "Your rating has been saved.",
      );
    if (modal.kind === "review")
      await mutate(
        `/review/${modal.reviewKind}/${item.id}`,
        "POST",
        {
          action: f.get("action"),
          note: f.get("note"),
          ...(f.get("atFaultPartyId")
            ? { atFaultPartyId: f.get("atFaultPartyId") }
            : {}),
        },
        "Decision recorded with an audit trail.",
      );
  }
  return (
    <div className="ks-workspace">
      <header className="ks-page-heading">
        <div>
          <p className="ks-eyebrow">
            {c(roleLabels[role])} / {p.district}
          </p>
          <h1>
            {audience === "farmer"
              ? view === "create"
                ? "Sell my crop"
                : view === "offers"
                  ? "Offers & payments"
                  : view === "verification"
                    ? "My verification"
                    : view === "disputes"
                      ? "My disputes"
                      : "Farm services"
              : role === "STATE_ADMIN"
                ? "Maharashtra at a glance"
                : role === "PLATFORM_ADMIN"
                  ? "Platform operations"
                  : p.name}
          </h1>
          <p className="ks-subtitle">
            {admin
              ? "Review what needs attention. Keep every decision traceable."
              : fpo
                ? "Grow together. Turn member harvests into stronger market opportunities."
                : buyer
                  ? "Source better produce. Build direct, trusted farmer relationships."
                  : "Your market, your terms. Manage every step from one place."}
          </p>
        </div>
        <button className="ks-button secondary" onClick={reload}>
          <RefreshCw size={16} /> {c('Refresh')}
        </button>
      </header>
      {error && (
        <div className="ks-alert error" role="alert">
          {error}
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {notice && (
        <div className="ks-alert" role="status">
          <CheckCircle2 size={18} />
          {c(notice)}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {audience === "farmer" && (
        <Link className="ks-back" href="/farmer/home">
          ← Farmer home
        </Link>
      )}
      {view === "overview" && audience === "farmer" && (
        <div className="ks-stats">
          {(admin
            ? [
                [
                  ShieldCheck,
                  data.verifications.filter((v: any) =>
                    ["PENDING", "ESCALATED"].includes(v.status),
                  ).length,
                  "Awaiting verification",
                ],
                [ClipboardList, openDisputes.length, "Open disputes"],
                [
                  Package,
                  data.listings.filter(
                    (l: any) =>
                      role !== "DISTRICT_ADMIN" || l.district === p.district,
                  ).length,
                  "Marketplace listings",
                ],
                [Wallet, money(escrow), "Simulated escrow"],
              ]
            : [
                [Package, myListings.length, "Your listings"],
                [ClipboardList, myRequirements.length, "Your requirements"],
                [ArrowUpRight, pending.length, "Open offers"],
                [Wallet, money(escrow), "Simulated escrow"],
              ]
          ).map(([Icon, value, title]: any) => (
            <div className="ks-stat" key={title}>
              <span className="ks-stat-icon">
                <Icon size={19} />
              </span>
              <span>{title}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      )}
      <nav className="ks-tabs" aria-label="Workspace sections">
        {(pathname === "/farmer/account"
          ? tabs.filter(([key]) => ["verification", "disputes"].includes(key))
          : tabs
        ).map(([key, name, Icon]) => (
          <button
            key={key}
            className={view === key ? "active" : ""}
            onClick={() => {
              setView(key);
              if (key === "create") setKind(buyer ? "requirement" : "listing");
            }}
          >
            <Icon size={17} />
            {c(name)}
          </button>
        ))}
      </nav>

      {view === "overview" && audience !== "farmer" && (
        <RoleOverview data={data} onNavigate={setView} />
      )}
      {view === "overview" && audience === "farmer" && (
        <div className="ks-two-column">
          <section className="ks-panel">
            <div className="ks-section-heading">
              <div>
                <p className="ks-eyebrow">YOUR NEXT MOVE</p>
                <h2>
                  {admin
                    ? "Review queue"
                    : buyer
                      ? "Demand and procurement"
                      : "Your active listings"}
                </h2>
              </div>
              <button
                className="ks-link"
                onClick={() =>
                  setView(admin ? "verification" : buyer ? "create" : "market")
                }
              >
                View all <ArrowRight size={15} />
              </button>
            </div>
            {admin ? (
              data.verifications.slice(0, 5).map((v: any) => (
                <div className="ks-row" key={v.id}>
                  <div>
                    <strong>{v.party.name}</strong>
                    <small>
                      {label(v.documentType)} · {v.party.district}
                    </small>
                  </div>
                  <Badge good={v.status === "APPROVED"}>
                    {label(v.status)}
                  </Badge>
                </div>
              ))
            ) : (buyer ? myRequirements : myListings).length ? (
              (buyer ? myRequirements : myListings)
                .slice(0, 6)
                .map((l: any) => (
                  <div className="ks-row" key={l.id}>
                    <span className="ks-resource-icon">
                      <Leaf size={22} />
                    </span>
                    <div className="ks-grow">
                      <strong>{resourceTitle(l)}</strong>
                      <small>
                        {resourceLabels[l.resourceType]} · {l.district}
                      </small>
                    </div>
                    <div className="ks-right">
                      <strong>{money(l.price || l.budget)}</strong>
                      <small>{label(l.priceUnit || "budget")}</small>
                    </div>
                    <Badge good={l.status === "OPEN"}>
                      {label(l.status || "Open demand")}
                    </Badge>
                  </div>
                ))
            ) : (
              <Empty
                title="Your next opportunity starts here"
                detail="Publish a listing or demand request to get started."
              />
            )}
            <button
              className="ks-button secondary full"
              onClick={() => {
                setView(admin ? "verification" : "create");
                setKind(buyer ? "requirement" : "listing");
              }}
            >
              {admin
                ? "Open verification queue"
                : buyer
                  ? "Post a requirement"
                  : "Create a listing"}{" "}
              <Plus size={16} />
            </button>
          </section>
          <aside className="ks-panel ks-dark-panel">
            <ShieldCheck size={30} />
            <p className="ks-eyebrow">CONNECTED & ACCOUNTABLE</p>
            <h2>
              {admin
                ? "Every decision has a record."
                : "Good trade starts with trust."}
            </h2>
            <p>
              {admin
                ? "Review evidence, leave a clear reason, and escalate cases that need state attention."
                : "Complete role verification, compare offers, and track fulfillment before releasing payment."}
            </p>
            <div className="ks-dark-stat">
              <span>{admin ? "Your jurisdiction" : "Credibility score"}</span>
              <strong>
                {admin ? p.district : `${p.credibility?.score ?? 50}/100`}
              </strong>
            </div>
            <button
              className="ks-button light"
              onClick={() => setView("verification")}
            >
              View verification <ArrowRight size={16} />
            </button>
            <small>Payments are simulated for this evaluation build.</small>
          </aside>
        </div>
      )}

      {view === "market" && (
        <DemandPanel
          data={{
            ...data,
            requirements: data.requirements.filter(
              (r: any) =>
                !providerType[role] || r.resourceType === providerType[role],
            ),
          }}
          onSaved={reload}
        />
      )}
      {view === "create" && farmer && (
        <FpoMembership party={p} onSaved={reload} />
      )}
      {view === "market" && !providerType[role] && (
        <section>
          <div className="ks-toolbar">
            <label className="ks-search">
              <Search size={18} />
              <input
                aria-label="Search marketplace"
                placeholder="Search crop, provider or district"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select
              aria-label="Resource type"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="ALL">All resources</option>
              {Object.entries(resourceLabels).map(([key, title]) => (
                <option key={key} value={key}>
                  {title}
                </option>
              ))}
            </select>
            <Badge>{matched.length} available</Badge>
          </div>
          <div className="ks-card-grid">
            {matched.map((l: any) => (
              <article className="ks-listing" key={l.id}>
                <div
                  className={`ks-listing-art ${l.resourceType.toLowerCase()}`}
                >
                  <span>{resourceLabels[l.resourceType]}</span>
                  {l.resourceType === "TRANSPORT" ? (
                    <Truck size={54} />
                  ) : (
                    <Leaf size={54} />
                  )}
                  <Badge good>
                    {l.attributes.isPooled ? "FPO pooled" : "Available"}
                  </Badge>
                </div>
                <div className="ks-listing-body">
                  <h3>{resourceTitle(l)}</h3>
                  <p>
                    <MapPin size={14} />
                    {l.district} · {l.party.name}
                  </p>
                  <div className="ks-details">
                    {Object.entries(l.attributes)
                      .filter(([k, v]) =>
                        [
                          "quantityKg",
                          "capacityKg",
                          "capacityQuintal",
                          "qualityGrade",
                          "crewSize",
                          "packageType",
                          "conditionGrade",
                          "targetQuantity",
                        ].includes(k),
                      )
                      .map(([key, value]) => (
                        <span key={key}>
                          {label(key.replace(/([A-Z])/g, " $1"))}:{" "}
                          <b>{String(value)}</b>
                        </span>
                      ))}
                  </div>
                  <div className="ks-listing-price">
                    <strong>{money(l.price)}</strong>
                    <span>
                      {label(l.priceUnit || "flat")} · Trust{" "}
                      {l.party.credibility?.score ?? 50}/100
                    </span>
                  </div>
                  <button
                    className="ks-button full"
                    onClick={() => setModal({ kind: "offer", item: l })}
                  >
                    Send offer <ArrowUpRight size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!matched.length && (
            <Empty
              title="No matching listings"
              detail="Try a different resource or search. New listings appear here after publication."
            />
          )}
        </section>
      )}

      {view === "create" && (
        <div className="ks-two-column">
          <section className="ks-panel">
            <h2>
              {c(kind === "listing"
                ? "Publish what you offer"
                : "Tell the market what you need")}
            </h2>
            <p className="ks-subtitle">
              {c('Clear quantities and pricing help the right partner find you.')}
            </p>
            <form
              key={`${type}-${kind}`}
              className="ks-form"
              onSubmit={submitResource}
            >
              <div className="ks-form-grid">
                <label>
                  {c('Post type')}
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                  >
                    <option value="listing">{c('Listing — I supply')}</option>
                    <option value="requirement">{c('Requirement — I need')}</option>
                  </select>
                </label>
                <label>
                  {c('Resource')}
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    {Object.entries(resourceLabels)
                      .filter(([key]) => allowedTypes.includes(key))
                      .map(([key, title]) => (
                        <option key={key} value={key}>
                          {c(title)}
                        </option>
                      ))}
                  </select>
                </label>
                {fields.map((f) => (
                  <label key={f.key}>
                    {c(f.label)}
                    {f.options ? (
                      <select name={f.key} defaultValue={f.value}>
                        {f.options.map((v) => (
                          <option key={v} value={v}>{c(v)}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        name={f.key}
                        type={f.type || "text"}
                        {...(cropPriceListing&&f.key==='crop'?{value:listingCrop,onChange:(e)=>setListingCrop(e.target.value)}:{defaultValue:f.value})}
                        min={f.type === "number" ? 1 : undefined}
                        step={f.type === "number" ? "any" : undefined}
                        required
                      />
                    )}
                  </label>
                ))}
                <label>
                  {c('District')}
                  <input
                    name="district"
                    value={listingDistrict||p.district}
                    onChange={(e)=>setListingDistrict(e.target.value)}
                    required
                    minLength={2}
                  />
                </label>
                <label>
                  {c('Price / budget per unit')} (₹)
                  <input
                    name="price"
                    type="number"
                    min="0.01"
                    step="0.01"
                    {...(cropPriceListing?{value:listingPrice,onChange:(e)=>setListingPrice(e.target.value)}:{defaultValue:20})}
                    required
                  />
                </label>
                <label>
                  {c('Pricing unit')}
                  <select
                    name="priceUnit"
                    defaultValue={
                      ['CROP_LOT','CONTRACT_FARMING'].includes(type)
                        ? "per_kg"
                        : type === "COLD_STORAGE"
                          ? "per_quintal"
                          : type === "TRANSPORT"
                            ? "per_trip"
                            : ['USED_EQUIPMENT','INPUT_GROUP_BUY'].includes(type)?'flat':"per_day"
                    }
                  >
                    <option value="per_kg">{c('Per kg')}</option>
                    <option value="per_quintal">{c('Per quintal')}</option>
                    <option value="per_day">{c('Per day')}</option>
                    <option value="per_trip">{c('Per trip')}</option>
                    <option value="flat">{c('Flat price')}</option>
                  </select>
                </label>
                {kind === "requirement" && type !== "CROP_LOT" && (
                  <label>
                    {c('Units required')}
                    <input
                      name="quantityNeeded"
                      type="number"
                      min="1"
                      defaultValue="500"
                      required
                    />
                  </label>
                )}
              </div>
              {cropPriceListing && <LivePriceAssist crop={listingCrop} district={listingDistrict || p.district} onUsePrice={(price) => setListingPrice(String(price))} />}
              <button disabled={busy} className="ks-button full">
                {c(busy
                  ? "Saving…"
                  : kind === "listing"
                    ? "Publish listing"
                    : "Publish demand")}
                <ArrowRight size={17} />
              </button>
            </form>
          </section>
          <aside className="ks-panel ks-dark-panel">
            <Leaf size={34} />
            <p className="ks-eyebrow">BETTER INFORMATION. BETTER TRADE.</p>
            <h2>Make every harvest count.</h2>
            <p>
              Use the same quality grade and unit in your listing and buyer
              agreement. Check nearby market prices before choosing an asking
              price.
            </p>
            <Link href="/farmer/prices" className="ks-button light">
              Compare market prices <TrendingUp size={17} />
            </Link>
            <small>
              Service providers need approved role verification before
              publishing. Buyers can post demand immediately.
            </small>
          </aside>
        </div>
      )}

      {view === "offers" && (
        <section>
          <div className="ks-section-heading">
            <h2>Offers, fulfillment & payments</h2>
            <Badge>Payment simulation</Badge>
          </div>
          <div className="ks-offer-grid">
            {data.offers.map((o: any) => {
              const b = o.booking;
              const seller = o.listing.partyId === p.id;
              const canAccept =
                (seller && o.status === "PENDING") ||
                (!seller && o.status === "COUNTERED");
              return (
                <article className="ks-panel" key={o.id}>
                  <div className="ks-section-heading">
                    <div>
                      <p className="ks-eyebrow">
                        {resourceLabels[o.listing.resourceType]}
                      </p>
                      <h3>{resourceTitle(o.listing)}</h3>
                    </div>
                    <Badge good={o.status === "ACCEPTED"}>
                      {label(o.status)}
                    </Badge>
                  </div>
                  <p className="ks-subtitle">
                    {o.listing.party.name} →{" "}
                    {o.requirement?.party?.name || "Legacy buyer unavailable"}
                  </p>
                  <div className="ks-trade-value">
                    <strong>
                      {money(o.price)}
                      <small>
                        {" "}
                        /{" "}
                        {label(
                          o.listing.priceUnit?.replace("per_", "") || "unit",
                        )}
                      </small>
                    </strong>
                    <span>
                      {o.requirement?.quantityNeeded || 1} units · Total{" "}
                      {money(
                        b?.totalAmount ||
                          o.price * (o.requirement?.quantityNeeded || 1),
                      )}
                    </span>
                  </div>
                  {!admin && ["PENDING", "COUNTERED"].includes(o.status) && (
                    <div className="ks-actions">
                      {canAccept && (
                        <button
                          disabled={busy}
                          className="ks-button"
                          onClick={() =>
                            mutate(
                              `/offers/${o.id}`,
                              "PATCH",
                              { action: "ACCEPT" },
                              "Offer accepted. Booking created with payment pending.",
                            )
                          }
                        >
                          Accept
                        </button>
                      )}
                      {seller && o.status === "PENDING" && (
                        <button
                          className="ks-button secondary"
                          onClick={() => setModal({ kind: "counter", item: o })}
                        >
                          Counter
                        </button>
                      )}
                      <button
                        disabled={busy}
                        className="ks-button ghost"
                        onClick={() =>
                          mutate(
                            `/offers/${o.id}`,
                            "PATCH",
                            { action: "REJECT" },
                            "Offer rejected.",
                          )
                        }
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  {b && (
                    <>
                      <div className="ks-tracker">
                        {["Agreement", "Escrow", "Fulfillment", "Released"].map(
                          (step, index) => (
                            <div
                              key={step}
                              className={
                                index === 0 ||
                                (index === 1 &&
                                  b.paymentStatus !== "PENDING") ||
                                (index === 2 &&
                                  b.fulfillmentStatus === "COMPLETED") ||
                                (index === 3 && b.paymentStatus === "RELEASED")
                                  ? "done"
                                  : ""
                              }
                            >
                              <Check size={14} />
                              <span>{step}</span>
                            </div>
                          ),
                        )}
                      </div>
                      <p className="ks-subtitle">
                        {label(b.fulfillmentStatus)} · Payment{" "}
                        {label(b.paymentStatus)}
                      </p>
                      <div className="ks-actions">
                        <button
                          className="ks-button secondary"
                          onClick={() =>
                            setModal({ kind: "agreement", item: o })
                          }
                        >
                          <FileText size={16} /> Agreement
                        </button>
                        {!admin && b.fulfillmentStatus !== "CANCELLED" && (
                          <>
                            {b.paymentStatus === "PENDING" &&
                              b.fulfillmentStatus === "PENDING" && (
                                <button
                                  className="ks-button secondary"
                                  disabled={busy}
                                  onClick={() =>
                                    setModal({ kind: "cancel", item: b })
                                  }
                                >
                                  Cancel booking
                                </button>
                              )}
                            {!seller && b.paymentStatus === "PENDING" && (
                              <button
                                disabled={busy}
                                className="ks-button"
                                onClick={() =>
                                  mutate(
                                    `/bookings/${b.id}/action`,
                                    "POST",
                                    { action: "FUND" },
                                    "Simulated escrow funded. No real money moved.",
                                  )
                                }
                              >
                                Simulate funding
                              </button>
                            )}
                            {seller &&
                              b.paymentStatus === "ESCROWED" &&
                              b.fulfillmentStatus === "PENDING" && (
                                <button
                                  disabled={busy}
                                  className="ks-button"
                                  onClick={() =>
                                    mutate(
                                      `/bookings/${b.id}/action`,
                                      "POST",
                                      { action: "START" },
                                      "Fulfillment started.",
                                    )
                                  }
                                >
                                  Start fulfillment
                                </button>
                              )}
                            {seller &&
                              b.fulfillmentStatus === "IN_PROGRESS" && (
                                <button
                                  disabled={busy}
                                  className="ks-button"
                                  onClick={() =>
                                    mutate(
                                      `/bookings/${b.id}/action`,
                                      "POST",
                                      { action: "COMPLETE" },
                                      "Fulfillment completed.",
                                    )
                                  }
                                >
                                  Mark delivered
                                </button>
                              )}
                            {!seller &&
                              b.fulfillmentStatus === "COMPLETED" &&
                              b.paymentStatus === "ESCROWED" && (
                                <button
                                  disabled={busy}
                                  className="ks-button"
                                  onClick={() =>
                                    mutate(
                                      `/bookings/${b.id}/action`,
                                      "POST",
                                      { action: "RELEASE" },
                                      "Simulated payment released.",
                                    )
                                  }
                                >
                                  Confirm & release
                                </button>
                              )}
                            {b.fulfillmentStatus === "COMPLETED" &&
                              !b.ratings.some(
                                (r: any) => r.giverPartyId === p.id,
                              ) && (
                                <button
                                  className="ks-button secondary"
                                  onClick={() =>
                                    setModal({ kind: "rating", item: b })
                                  }
                                >
                                  Rate partner
                                </button>
                              )}
                            {!b.dispute && (
                              <button
                                className="ks-button ghost"
                                onClick={() =>
                                  setModal({ kind: "dispute", item: b })
                                }
                              >
                                Raise dispute
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    <LogisticsNote booking={b} readOnly={admin} onSaved={booking=>setData((d:any)=>({...d,offers:d.offers.map((item:any)=>item.id===o.id?{...item,booking:{...item.booking,...booking}}:item)}))}/>
                      {b.dispute && (
                        <div className="ks-note">
                          Dispute: {label(b.dispute.status)} —{" "}
                          {b.dispute.reason}
                        </div>
                      )}
                    </>
                  )}
                </article>
              );
            })}
          </div>
          {!data.offers.length && (
            <Empty
              title="No offers yet"
              detail="Send an offer from the marketplace, or publish your listing to start receiving interest."
            />
          )}
        </section>
      )}

      {view === "verification" && (
        <div className="ks-two-column">
          <section className="ks-panel">
            <h2>
              {admin
                ? "Verification review queue"
                : "Your verification documents"}
            </h2>
            {data.verifications.map((v: any) => (
              <div className="ks-review" key={v.id}>
                <div className="ks-section-heading">
                  <div>
                    <strong>{v.party.name}</strong>
                    <small>
                      {label(v.role)} · {v.party.district}
                    </small>
                  </div>
                  <Badge good={v.status === "APPROVED"}>
                    {label(v.status)}
                  </Badge>
                </div>
                <p>
                  {label(v.documentType)} · {v.documentRef}
                </p>
                <small>
                  {v.slaDeadline
                    ? `Review due ${new Date(v.slaDeadline).toLocaleString()}`
                    : "No SLA deadline"}
                </small>
                <VerificationDocument verification={v}/>
                {admin && ["PENDING", "ESCALATED"].includes(v.status) && (
                  <button
                    className="ks-button secondary"
                    onClick={() =>
                      setModal({
                        kind: "review",
                        item: v,
                        reviewKind: "verification",
                      })
                    }
                  >
                    Review submission
                  </button>
                )}
                <details>
                  <summary>Audit history ({v.auditLogs.length})</summary>
                  {v.auditLogs.map((log: any) => (
                    <p key={log.id}>
                      <small>{new Date(log.createdAt).toLocaleString()}</small>
                      {label(log.toStatus)} — {log.note}
                    </p>
                  ))}
                </details>
              </div>
            ))}
            {!data.verifications.length && (
              <Empty
                title="No documents awaiting review"
                detail="New submissions appear here with their review deadline."
              />
            )}
          </section>
          {!admin ? (
            <section className="ks-panel">
              <h2>{c('Submit a document')}</h2>
              <VerificationForm key={role} role={role} documents={data.documents[role]||[]} onSubmitted={()=>{setNotice(c('Document submitted for review. This is not automatic government verification.'));void reload();}}/>
            </section>
          ) : (
            <aside className="ks-panel ks-dark-panel">
              <ShieldCheck size={32} />
              <h2>A clear reason for every decision.</h2>
              <p>
                Approve valid documents, request clarification, or escalate
                cases for state review. Every action is stored in the audit
                history.
              </p>
            </aside>
          )}
        </div>
      )}

      {view === "disputes" && (
        <section className="ks-panel">
          <h2>Disputes & escalations</h2>
          {data.disputes.map((d: any) => (
            <div className="ks-review" key={d.id}>
              <div className="ks-section-heading">
                <h3>{label(d.category)}</h3>
                <Badge good={d.status === "RESOLVED"}>{label(d.status)}</Badge>
              </div>
              <p>{d.reason}</p>
              <small>
                {d.booking.offer.listing.district} · Due{" "}
                {d.slaDeadline ? new Date(d.slaDeadline).toLocaleString() : "—"}
              </small>
              {d.resolutionNote && (
                <p className="ks-note">{d.resolutionNote}</p>
              )}
              {admin && !["RESOLVED", "REJECTED"].includes(d.status) && (
                <button
                  className="ks-button secondary"
                  onClick={() =>
                    setModal({ kind: "review", item: d, reviewKind: "dispute" })
                  }
                >
                  Review dispute
                </button>
              )}
              <details>
                <summary>Audit history ({d.auditLogs.length})</summary>
                {d.auditLogs.map((l: any) => (
                  <p key={l.id}>
                    {label(l.toStatus)} — {l.note}
                  </p>
                ))}
              </details>
            </div>
          ))}
          {!data.disputes.length && (
            <Empty
              title="No disputes in your queue"
              detail="Cases are routed according to the booking district."
            />
          )}
        </section>
      )}

      {view === "members" && (
        <section className="ks-panel">
          <div className="ks-section-heading">
            <div>
              <p className="ks-eyebrow">STRONGER TOGETHER</p>
              <h2>Pool member harvests</h2>
            </div>
            <Badge>{data.members.length} members</Badge>
          </div>
          <p className="ks-subtitle">
            Select two or more open lots of the same crop and grade. A
            weighted-price bulk listing is created atomically.
          </p>
          {!p.fpoId && (
            <p className="ks-note">
              This account is not linked to an FPO yet. A platform administrator
              must complete your membership setup.
            </p>
          )}
          <div className="ks-member-list">
            {data.listings
              .filter(
                (l: any) =>
                  data.members.some((m: any) => m.id === l.partyId) &&
                  l.resourceType === "CROP_LOT" &&
                  l.status === "OPEN" &&
                  !l.attributes.isPooled,
              )
              .map((l: any) => (
                <label className="ks-row" key={l.id}>
                  <input
                    type="checkbox"
                    checked={selection.includes(l.id)}
                    onChange={(e) =>
                      setSelection(
                        e.target.checked
                          ? [...selection, l.id]
                          : selection.filter((id) => id !== l.id),
                      )
                    }
                  />
                  <div className="ks-grow">
                    <strong>
                      {l.party.name} · {resourceTitle(l)}
                    </strong>
                    <small>
                      Grade {l.attributes.qualityGrade} ·{" "}
                      {l.attributes.quantityKg} kg
                    </small>
                  </div>
                  <strong>{money(l.price)}/kg</strong>
                </label>
              ))}
          </div>
          <button
            disabled={busy || selection.length < 2}
            className="ks-button"
            onClick={async () => {
              if (
                await mutate(
                  "/pool",
                  "POST",
                  { listingIds: selection },
                  "Member lots pooled. The bulk listing is available to buyers.",
                )
              )
                setSelection([]);
            }}
          >
            Pool {selection.length} selected lots <Layers3 size={16} />
          </button>
        </section>
      )}

      {view === "analytics" && (
        <section>
          <div className="ks-toolbar">
            <div>
              <p className="ks-eyebrow">DISTRICT PRICE COMPARISON</p>
              <h2>Where is the market moving?</h2>
            </div>
            <select
              aria-label="Heatmap crop"
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
            >
              {["Onion", "Tomato", "Soybean", "Grape", "Pomegranate"].map(
                (c) => (
                  <option key={c}>{c}</option>
                ),
              )}
            </select>
          </div>
          <p className="ks-subtitle">
            Prices relative to the district average, from the latest saved
            aggregation. Gray means no data; it never means zero.
          </p>
          <div className="ks-district-grid">
            {(() => {
              const latest = new Map<string, any>();
              for (const s of data.stats)
                if (!latest.has(s.district)) latest.set(s.district, s);
              const prices = Array.from(latest.values())
                .map((s: any) =>
                  Number(
                    s.avgPricePerCrop[crop] ??
                      s.avgPricePerCrop[crop.toLowerCase()],
                  ),
                )
                .filter((n) => n > 0);
              const avg =
                prices.reduce((s, n) => s + n, 0) / (prices.length || 1);
              return districts.map((d) => {
                const s = latest.get(d);
                const value = Number(
                  s?.avgPricePerCrop?.[crop] ??
                    s?.avgPricePerCrop?.[crop.toLowerCase()],
                );
                const deviation =
                  value > 0 ? ((value - avg) / avg) * 100 : null;
                return (
                  <div
                    key={d}
                    className={`ks-district ${deviation === null ? "no-data" : deviation > 3 ? "high" : deviation < -3 ? "low" : "neutral"}`}
                  >
                    <strong>{d}</strong>
                    <b>{value > 0 ? money(value) : "No data"}</b>
                    <small>
                      {deviation === null
                        ? "Awaiting coverage"
                        : `${deviation >= 0 ? "+" : ""}${deviation.toFixed(1)}% vs average`}
                    </small>
                  </div>
                );
              });
            })()}
          </div>
          <section className="ks-panel">
            <h2>Integration history</h2>
            <p className="ks-subtitle">
              Actual recorded sync attempts. Tier 3 entries are simulations or
              stubs.
            </p>
            {data.logs.map((l: any) => (
              <div className="ks-row" key={l.id}>
                <div className="ks-grow">
                  <strong>{l.portal}</strong>
                  <small>{l.message}</small>
                </div>
                <div className="ks-right">
                  <Badge good={l.status === "SUCCESS"}>
                    {l.status} · Tier {l.tier}
                  </Badge>
                  <small>{new Date(l.syncedAt).toLocaleString()}</small>
                </div>
              </div>
            ))}
          </section>
        </section>
      )}

      {modal && (
        <div
          className="ks-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setModal(null);
          }}
        >
          <section
            className="ks-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="ks-section-heading">
              <h2 id="modal-title">
                {
                  {
                    offer: "Send an offer",
                    counter: "Counter-offer",
                    dispute: "Raise a dispute",
                    rating: "Rate your partner",
                    review: "Record your decision",
                    agreement: "Trade agreement",
                    cancel: "Cancel booking",
                  }[modal.kind]
                }
              </h2>
              <button
                className="ks-icon-button"
                aria-label="Close dialog"
                disabled={busy}
                onClick={() => setModal(null)}
              >
                <X size={20} />
              </button>
            </div>
            {error && (
              <p className="ks-alert error" role="alert">
                {error}
              </p>
            )}
            {modal.kind === "agreement" ? (
              <SimpleAgreement offer={modal.item} />
            ) : (
              <form className="ks-form" onSubmit={submitModal}>
                {["offer", "counter"].includes(modal.kind) && (
                  <>
                    <label>
                      Offer price per unit (₹)
                      <input
                        name="price"
                        type="number"
                        min="0.01"
                        step="0.01"
                        defaultValue={modal.item.price || 20}
                        required
                      />
                    </label>
                    {modal.kind === "offer" && (
                      <label>
                        Quantity / billable units
                        <input
                          name="quantity"
                          type="number"
                          min="1"
                          defaultValue={
                            modal.item.attributes.quantityKg ||
                            modal.item.attributes.capacityQuintal ||
                            1
                          }
                          required
                        />
                      </label>
                    )}
                  </>
                )}
                {modal.kind === "dispute" && (
                  <>
                    <label>
                      Category
                      <select name="category">
                        {[
                          "PAYMENT",
                          "QUALITY",
                          "LOGISTICS",
                          "STORAGE_DAMAGE",
                          "SERVICE_NOT_RENDERED",
                          "OTHER",
                        ].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      What happened?
                      <textarea
                        name="reason"
                        required
                        minLength={10}
                        rows={4}
                      />
                    </label>
                    <label>
                      Evidence URL (optional)
                      <input name="evidence" type="url" />
                    </label>
                  </>
                )}
                {modal.kind === "cancel" && (
                  <>
                    <p>
                      Only an unfunded, unstarted booking can be cancelled. Both
                      participants are notified and the resource becomes
                      available again.
                    </p>
                    <label>
                      Cancellation reason
                      <textarea
                        name="reason"
                        minLength={5}
                        maxLength={1000}
                        rows={3}
                        required
                      />
                    </label>
                  </>
                )}
                {modal.kind === "rating" && (
                  <>
                    <label>
                      Rating
                      <select name="score">
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Comment
                      <textarea name="comment" rows={3} />
                    </label>
                  </>
                )}
                {modal.kind === "review" && (
                  <>
                    <label>
                      Decision
                      <select name="action">
                        {(modal.reviewKind === "verification"
                          ? [
                              "APPROVE",
                              "REJECT",
                              "REQUEST_MORE_INFO",
                              "ESCALATE",
                            ]
                          : [
                              "RESOLVE",
                              "REJECT",
                              "REQUEST_MORE_INFO",
                              "ESCALATE",
                            ]
                        ).map((a) => (
                          <option key={a} value={a}>
                            {label(a)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Reason / resolution
                      <textarea name="note" rows={4} minLength={5} required />
                    </label>
                    {modal.reviewKind === "dispute" && (
                      <label>
                        At-fault participant (optional)
                        <select name="atFaultPartyId">
                          <option value="">No credibility penalty</option>
                          <option value={modal.item.raisedByPartyId}>
                            Complainant
                          </option>
                          <option value={modal.item.respondentPartyId}>
                            Respondent
                          </option>
                        </select>
                      </label>
                    )}
                  </>
                )}
                <button disabled={busy} className="ks-button full">
                  {busy ? "Saving…" : "Confirm"}
                  <Check size={17} />
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
