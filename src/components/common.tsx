"use client";

import Link from "next/link";
import { ArrowUpRight, CarFront, ChevronRight, CircleAlert, Fuel, Gauge, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { formatMoney } from "@/lib/booking/domain";
import { vehicleName, type Quote, type Vehicle } from "@/lib/booking/types";
import type { Command, Receipt } from "@/lib/demo/actions";

export type Lang = "en" | "sl";
export type Perform = (action: Command) => Promise<Receipt | undefined>;
export const l = (lang: Lang, en: string, sl: string) => lang === "sl" ? sl : en;
export const txStatus = (status: string, lang: Lang) => {
  const words: Record<string, [string, string]> = { REQUESTED: ["Requested", "Prejeto"], CONFIRMED: ["Confirmed", "Potrjeno"], PICKED_UP: ["Picked up", "Prevzeto"], RETURNED: ["Returned", "Vrnjeno"], CANCELLED: ["Cancelled", "Preklicano"], REJECTED: ["Rejected", "Zavrnjeno"] };
  return words[status]?.[lang === "sl" ? 1 : 0] ?? status;
};
export function Brand({ brand, small = false }: { brand: string; small?: boolean }) {
  return <Link className={"brand" + (small ? " brand-small" : "")} href="/" aria-label={brand + " home"}>
    {brand === "Sharetoo Concept" ? <><img className="wordmark" src="/demo/wordmark.webp" alt="" /><span>CONCEPT</span></> : <strong>{brand}</strong>}
  </Link>;
}
export function ImageCar({ vehicle, lang = "en", label = true }: { vehicle: Vehicle; lang?: Lang; label?: boolean }) {
  return <div className="car-media">
    {vehicle.photo ? <img src={vehicle.photo} alt={vehicleName(vehicle)} loading="lazy" /> : <div className="car-placeholder"><CarFront size={52} strokeWidth={1} /></div>}
    {label && vehicle.photoSource === "illustrative" && vehicle.photo && <span className="media-label">{l(lang, "Illustrative image", "Simbolična fotografija")}</span>}
  </div>;
}
export function CarCard({ vehicle, lang, href, quote, available }: { vehicle: Vehicle; lang: Lang; href: string; quote?: Quote; available?: boolean }) {
  return <article className="car-card">
    <Link href={href} aria-label={vehicleName(vehicle)}><ImageCar vehicle={vehicle} lang={lang} /></Link>
    <div className="card-body">
      <div className="spread"><span className="eyebrow">{vehicle.category} · {vehicle.year}</span>{available && <span className="pill"><span className="dot" /> {l(lang,"Available","Na voljo")}</span>}</div>
      <h3><Link href={href}>{vehicleName(vehicle)}</Link></h3>
      <div className="specs"><span><Gauge size={15} />{vehicle.transmission}</span><span><UsersRound size={15} />{vehicle.seats}</span><span><Fuel size={15} />{vehicle.fuel}</span></div>
      <div className="card-bottom spread"><div><strong>{formatMoney(quote?.total ?? vehicle.dailyRate, lang)}</strong> <span>{quote ? l(lang,"trip total","najem skupaj") : l(lang,"/ day","/ dan")}</span></div><Link className="icon-btn" href={href} aria-label={l(lang,"View vehicle","Ogled vozila")}><ArrowUpRight size={18} /></Link></div>
    </div>
  </article>;
}
export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <div className={"notice" + (error ? " error" : "")} role={error ? "alert" : "status"}>{error && <CircleAlert size={18} />}{children}</div>;
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}
export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return <nav className="breadcrumb" aria-label="Breadcrumb">{items.map((item, i) => <span key={item.label}>{i > 0 && <ChevronRight size={13} />}{item.href ? <Link href={item.href}>{item.label}</Link> : <strong>{item.label}</strong>}</span>)}</nav>;
}
export function QuoteCard({ quote, lang }: { quote: Quote; lang: Lang }) {
  return <div className="quote-box">
    <div className="spread"><span>{quote.days} × {formatMoney(quote.dailyRate, lang)} {l(lang,"daily rate","dnevna cena")}</span><b>{formatMoney(quote.subtotal, lang)}</b></div>
    {quote.fee > 0 && <div className="spread"><span>{l(lang,"Fee","Pristojbina")}</span><b>{formatMoney(quote.fee, lang)}</b></div>}
    <div className="spread quote-total"><b>{l(lang,"Rental total","Skupni najem")}</b><strong>{formatMoney(quote.total, lang)}</strong></div>
    <div className="spread"><span>{l(lang,"Refundable deposit","Vračljiva varščina")}</span><b>{formatMoney(quote.deposit, lang)}</b></div>
  </div>;
}
export const intervalQuery = (range?: { pickup: string; returnAt: string }) => range ? "?" + new URLSearchParams({ pickup: range.pickup, return: range.returnAt }) : "";
