"use client";
import React from "react";
import {
  ArrowRight,
  Warehouse,
  Truck,
  Tractor,
  Users,
  Package,
  ShoppingBasket,
  ShieldCheck,
  Landmark,
  Activity,
} from "lucide-react";
import { money, resourceTitle, label } from "../../lib/workspace";
import {useLanguage} from '../../lib/LanguageContext';
import {copy} from '../../lib/assist-copy';

export const roleWork: Record<
  string,
  {
    title: string;
    description: string;
    create: string;
    market: string;
    unit: string;
    field: string;
    type?: string;
    icon: any;
  }
> = {
  BUYER: {
    title: "Procurement desk",
    description:
      "Match your crop requirements, negotiate rates and track incoming deliveries.",
    create: "Post demand",
    market: "Source produce",
    unit: "requirements",
    field: "quantityNeeded",
    icon: ShoppingBasket,
  },
  FPO_ADMIN: {
    title: "Member harvest desk",
    description:
      "Combine compatible member harvests and negotiate one bulk order.",
    create: "Publish pooled supply",
    market: "Buyer demand",
    unit: "member lots",
    field: "quantityKg",
    icon: Users,
  },
  STORAGE_OPERATOR: {
    title: "Storage capacity desk",
    description:
      "Manage crop-compatible space, storage requests and intake bookings.",
    create: "Add storage capacity",
    market: "Storage requests",
    unit: "quintals offered",
    field: "capacityQuintal",
    type: "COLD_STORAGE",
    icon: Warehouse,
  },
  TRANSPORT_OPERATOR: {
    title: "Dispatch desk",
    description:
      "Match crop pickup requests to your routes, vehicle capacity and delivery jobs.",
    create: "Add vehicle & route",
    market: "Transport requests",
    unit: "kg vehicle capacity",
    field: "capacityKg",
    type: "TRANSPORT",
    icon: Truck,
  },
  EQUIPMENT_PROVIDER: {
    title: "Equipment rental desk",
    description:
      "Publish machine/operator packages and manage hired equipment jobs.",
    create: "Add machine package",
    market: "Equipment requests",
    unit: "machine packages",
    field: "",
    type: "EQUIPMENT_SERVICE",
    icon: Tractor,
  },
  LABOR_CONTRACTOR: {
    title: "Crew scheduling desk",
    description:
      "Offer crews for the right farm tasks and track confirmed work.",
    create: "Add crew availability",
    market: "Labor requests",
    unit: "workers offered",
    field: "crewSize",
    type: "LABOR",
    icon: Users,
  },
  INPUT_SUPPLIER: {
    title: "Farm supplies desk",
    description:
      "Respond to group-buy demand and fulfill seed and input orders.",
    create: "Add supply offer",
    market: "Input requests",
    unit: "units offered",
    field: "targetQuantity",
    type: "INPUT_GROUP_BUY",
    icon: Package,
  },
  DISTRICT_ADMIN: {
    title: "District case desk",
    description:
      "Review local verification and grievances. Resolve urgent cases before their deadline.",
    create: "Review verification",
    market: "District disputes",
    unit: "pending cases",
    field: "",
    icon: ShieldCheck,
  },
  STATE_ADMIN: {
    title: "State escalation desk",
    description:
      "Resolve escalations and inspect district-level evidence and integration failures.",
    create: "Review escalations",
    market: "State intelligence",
    unit: "escalated cases",
    field: "",
    icon: Landmark,
  },
  PLATFORM_ADMIN: {
    title: "Platform reliability desk",
    description:
      "Monitor operational exceptions, integration health and transaction safety.",
    create: "Review exceptions",
    market: "Integration health",
    unit: "open cases",
    field: "",
    icon: Activity,
  },
};

export default function RoleOverview({
  data,
  onNavigate,
}: {
  data: any;
  onNavigate: (view: any) => void;
}) {
  const {language}=useLanguage(),c=(s:string)=>copy(language,s);
  const p = data.party,
    role = p.roles[0],
    work = roleWork[role];
  if (!work) return null;
  const Icon = work.icon;
  const own = data.listings.filter((l: any) => l.partyId === p.id && l.status==='OPEN'),
    requirements = data.requirements.filter(
      (r: any) => r.partyId === p.id && !r._count?.offers,
    );
  const bookings = data.offers.filter((o: any) => o.booking),
    active = bookings.filter(
      (o: any) =>
        !["COMPLETED", "CANCELLED"].includes(o.booking.fulfillmentStatus),
    );
  const provider = !!work.type,
    admin = role.includes("ADMIN") && role !== "FPO_ADMIN";
  const queue = [
    ...data.verifications
      .filter((v: any) => ["PENDING", "ESCALATED"].includes(v.status))
      .map((v: any) => ({
        ...v,
        caseType: "verification",
        title: v.party.name,
        detail: label(v.documentType),
      })),
    ...data.disputes
      .filter((d: any) => !["RESOLVED", "REJECTED"].includes(d.status))
      .map((d: any) => ({
        ...d,
        caseType: "disputes",
        title: label(d.category),
        detail: d.reason,
      })),
  ]
    .filter((v: any) => role !== "STATE_ADMIN" || v.status === "ESCALATED")
    .sort(
      (a: any, b: any) =>
        Date.parse(a.slaDeadline || "9999-01-01") -
        Date.parse(b.slaDeadline || "9999-01-01"),
    );
  const offered = work.field
    ? own.reduce(
        (n: number, l: any) => n + Number(l.attributes[work.field] || 0),
        0,
      )
    : own.length;
  const summaries = admin
    ? [
        [queue.length, work.unit],
        [data.offers.length, "transactions in scope"],
      ]
    : role === "BUYER"
      ? [
          [requirements.length, "open requirements"],
          [active.length, "incoming deliveries"],
          [
            money(
              bookings.reduce(
                (n: number, o: any) => n + Number(o.booking.totalAmount || 0),
                0,
              ),
            ),
            "agreed procurement value",
          ],
        ]
      : role === "FPO_ADMIN"
        ? [
            [data.members.length, "members"],
            [
              own.filter((l: any) => l.attributes.isPooled).length,
              "published pools",
            ],
            [active.length, "bulk orders in progress"],
          ]
        : [
            [offered, work.unit],
            [active.length, "jobs in progress"],
            [
              bookings.filter(
                (o: any) => o.booking.fulfillmentStatus === "COMPLETED",
              ).length,
              "completed jobs",
            ],
          ];
  const approved = p.verifications.some(
    (v: any) =>
      v.role === role &&
      v.status === "APPROVED" &&
      (!v.expiresAt || Date.parse(v.expiresAt) > Date.now()),
  );
  return (
    <section className="ks-role-home" data-role={role}>
      <header className="ks-role-hero">
        <span className="ks-role-mark">
          <Icon size={34} />
        </span>
        <div>
          <p className="ks-eyebrow">{p.name}</p>
          <h2>{c(work.title)}</h2>
          <p>{c(work.description)}</p>
        </div>
      </header>
      <div className="ks-role-metrics">
        {summaries.map(([value, name]) => (
          <div key={String(name)}>
            <strong>{value}</strong>
            <span>{c(String(name))}</span>
          </div>
        ))}
      </div>
      <div className="ks-role-actions">
        <button
          className="ks-button"
          onClick={() =>
            onNavigate(
              admin
                ? "verification"
                : role === "FPO_ADMIN"
                  ? "members"
                  : "create",
            )
          }
        >
          {c(admin
            ? work.create
            : role === "FPO_ADMIN"
              ? "Pool member harvests"
              : work.create)}
          <ArrowRight size={18} />
        </button>
        <button
          className="ks-button secondary"
          onClick={() =>
            onNavigate(
              admin
                ? role === "DISTRICT_ADMIN"
                  ? "disputes"
                  : "analytics"
                : "market",
            )
          }
        >
          {c(work.market)}
          <ArrowRight size={18} />
        </button>
        <button
          className="ks-button secondary"
          onClick={() => onNavigate("offers")}
        >
          {c(admin
            ? "Inspect transactions"
            : provider
              ? "Manage booked jobs"
              : "Track orders")}
        </button>
      </div>
      {provider && !approved && (
        <div className="ks-alert">
          {c('Your role verification is needed before publishing. You can prepare details and review requests now.')}
          <button onClick={() => onNavigate("verification")}>
            {c('Complete verification')} →
          </button>
        </div>
      )}
      <div className="ks-two-column">
        <section className="ks-panel">
          <h3>
            {c(admin
              ? "Cases needing attention"
              : role === "BUYER"
                ? "Open procurement requirements"
                : role === "FPO_ADMIN"
                  ? "Member pooling workflow"
                  : "Your available resources")}
          </h3>
          {admin ? (
            queue.length ? (
              queue.slice(0, 8).map((item: any) => (
                <button
                  key={item.id}
                  className="ks-task-row"
                  onClick={() => onNavigate(item.caseType)}
                >
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </span>
                  <span>
                    {item.slaDeadline &&
                    Date.parse(item.slaDeadline) < Date.now()
                      ? c("Overdue")
                      : c(label(item.status))}
                    <ArrowRight size={16} />
                  </span>
                </button>
              ))
            ) : (
              <p className="ks-note">{c('No pending cases in this queue.')}</p>
            )
          ) : role === "FPO_ADMIN" ? (
            <>
              <p className="ks-note">
                1. Confirm membership → 2. Select same-crop, same-grade lots →
                3. Publish a combined lot → 4. Negotiate with buyers.
              </p>
              <button
                className="ks-button"
                onClick={() => onNavigate("members")}
              >
                {c('Select member lots')} <Users size={18} />
              </button>
            </>
          ) : (role === "BUYER" ? requirements : own).length ? (
            (role === "BUYER" ? requirements : own)
              .slice(0, 8)
              .map((l: any) => (
                <div key={l.id} className="ks-row">
                  <div className="ks-grow">
                    <strong>{resourceTitle(l)}</strong>
                    <small>
                      {provider && role === "TRANSPORT_OPERATOR"
                        ? `${l.attributes.route?.from || "Origin not set"} → ${l.attributes.route?.to || "Destination not set"}`
                        : provider && role === "STORAGE_OPERATOR"
                          ? `${l.attributes.cropSuitability?.join(", ")} · ${l.attributes.tempRange || "Temperature not set"}`
                          : provider && role === "EQUIPMENT_PROVIDER"
                            ? `${l.attributes.packageType} · ${l.attributes.includesOperator ? "With operator" : "Machine only"}`
                            : provider && role === "LABOR_CONTRACTOR"
                              ? `${l.attributes.crewSize} workers · ${l.attributes.taskType}`
                              : l.district}
                    </small>
                  </div>
                  <strong>{money(l.price || l.budget)}</strong>
                </div>
              ))
          ) : (
            <p className="ks-note">
              Start with “{work.create}”. Only resources relevant to your role
              will be offered.
            </p>
          )}
        </section>
        <aside className="ks-panel">
          <h3>
            {c(admin ? "Governance safeguards" : "Next fulfillment actions")}
          </h3>
          {admin ? (
            <p className="ks-note">
              Every review requires a reason. Escalation preserves jurisdiction
              and the audit trail. Payment statuses here are simulation only.
            </p>
          ) : active.length ? (
            active.slice(0, 5).map((o: any) => (
              <button
                className="ks-task-row"
                key={o.id}
                onClick={() => onNavigate("offers")}
              >
                <span>
                  <strong>{resourceTitle(o.listing)}</strong>
                  <small>
                    {label(o.booking.fulfillmentStatus)} ·{" "}
                    {label(o.booking.paymentStatus)}
                  </small>
                </span>
                <ArrowRight size={18} />
              </button>
            ))
          ) : (
            <p className="ks-note">
              Confirmed orders will appear here with their next action. No
              bookings are invented.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
