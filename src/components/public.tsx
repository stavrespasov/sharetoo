"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ArrowUpRight, CalendarDays, CarFront, Check, ChevronDown, Clock3, KeyRound, MapPin, Menu, Search, ShieldCheck, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { DomainError, formatDate, formatMoney, handoverHours, quickInterval, toInterval, validateWindow, type Quick } from "@/lib/booking/domain";
import { categories, vehicleName, type Interval, type Store, type Vehicle } from "@/lib/booking/types";
import { isListed, rentalQuote, unavailable, type Receipt } from "@/lib/demo/actions";
import { Brand, Breadcrumb, CarCard, Field, ImageCar, intervalQuery, l, Notice, QuoteCard, txStatus, txVehicle, type Lang, type Perform } from "./common";

import { RentalTime } from "./rental-time";

type Props = { state: Store; brand: string; lang: Lang; language: (lang: Lang) => void; path: string[]; perform: Perform; receipt?: Receipt };
type LocalRange = Interval;
const quickChoices: [Quick, string, string][] = [["today","Next available","Prvi prosti termin"],["weekend","Weekend","Vikend"],["week","7 days","7 dni"]];
const faq = [
  ["When is my booking confirmed?", "Your request stays pending until the rental owner approves it.", "Kdaj je moja rezervacija potrjena?", "Povpraševanje ostane v obravnavi, dokler ga skrbnik ne potrdi."],
  ["What do I bring to pickup?", "Bring your original driving licence and identity document. Check the minimum age and licence requirements on your vehicle page.", "Kaj potrebujem ob prevzemu?", "Prinesite izvirnik vozniškega dovoljenja in osebnega dokumenta. Pogoje preverite na strani vozila."],
  ["How is the price calculated?", "Rental time is rounded up to the next 24-hour day. No deposit is required.", "Kako se izračuna cena?", "Trajanje najema zaokrožimo navzgor na naslednjih 24 ur. Varščine ni."],
];
function Faq({ lang }: { lang: Lang }) {
  return <div className="faq-list">{faq.map(([en, a, sl, b]) => <details key={en}><summary>{l(lang,en,sl)}<ChevronDown size={20} /></summary><p>{l(lang,a,b)}</p></details>)}</div>;
}
function pickupHours(lang: Lang) {
  return l(lang, "Monday–Friday", "Ponedeljek–petek") + `, ${handoverHours.open}–${handoverHours.close}`;
}
function rentalMessage(error: unknown, state: Store, lang: Lang) {
  const fallback = error instanceof Error ? error.message : "Unable to process request.";
  if (lang === "en") return fallback;
  const { minNotice, minHours, maxDays } = state.settings;
  const messages: Record<string, string> = {
    dates: "Preverite datum in uro. Vračilo mora biti po prevzemu.",
    notice: `Izberite prevzem vsaj ${minNotice} minut vnaprej.`,
    duration: `Najem je mogoč za najmanj ${minHours} ur in največ ${maxDays} dni.`,
    hours: `Prevzem in vračilo sta mogoča od ponedeljka do petka med ${handoverHours.open} in ${handoverHours.close}.`,
    availability: "Vozilo za izbrani termin ni več na voljo.",
  };
  return (error instanceof DomainError && messages[error.code]) || "Povpraševanja ni bilo mogoče obdelati. Preverite podatke in poskusite znova.";
}
function SearchBar({ state, lang, initial, onSearch }: { state: Store; lang: Lang; initial?: LocalRange; onSearch: (range: LocalRange) => void }) {
  const [range, setRange] = useState(() => initial ?? quickInterval("today", state.settings));
  const [preset, setPreset] = useState<Quick | "">("");
  const [error, setError] = useState("");
  const change = (key: keyof LocalRange, value: string) => { setRange({ ...range, [key]: value }); setPreset(""); setError(""); };
  function submit(event: FormEvent) {
    event.preventDefault();
    try { validateWindow(toInterval(range.pickup, range.returnAt), state.settings); setError(""); onSearch(range); }
    catch (e) { setError(rentalMessage(e,state,lang)); }
  }
  return <form className="search-panel" onSubmit={submit}>
    <div className="search-top"><span className="location"><MapPin size={17} /> Koper, Slovenija</span><div className="quick-pills" aria-label={l(lang,"Rental presets","Hitri termini")}>{quickChoices.map(([key, en, sl]) => <button type="button" className={preset === key ? "selected" : ""} aria-pressed={preset === key} key={key} onClick={() => {setPreset(key);setRange(quickInterval(key,state.settings));setError("");}}>{l(lang,en,sl)}</button>)}</div></div>
    <div className="search-controls">
      <RentalTime label={l(lang,"Pickup","Prevzem")} value={range.pickup} onChange={(value) => change("pickup",value)} lang={lang} />
      <RentalTime label={l(lang,"Return","Vračilo")} value={range.returnAt} onChange={(value) => change("returnAt",value)} lang={lang} />
      <button className="btn primary search-cta"><Search size={18} />{l(lang,"Find a car","Poišči vozilo")}</button>
    </div>
    <small className="muted">{l(lang,"Pickup and return","Prevzem in vračilo")} · {pickupHours(lang)}</small>
    {error && <Notice error>{error}</Notice>}
  </form>;
}
function PublicHeader({ brand, lang, language }: Pick<Props,"brand"|"lang"|"language">) {
  const [menu, setMenu] = useState(false);
  const links = [
    [l(lang,"The fleet","Vozila"),"/cars"],
    [l(lang,"How it works","Kako deluje"),"/#how-it-works"],
    [l(lang,"FAQ","Pogosta vprašanja"),"/faq"],
    [l(lang,"Contact","Kontakt"),"/contact"],
  ];
  const switchLabel = l(lang, "Preklopi v slovenščino", "Switch to English");
  function switchLanguage() {
    language(lang === "en" ? "sl" : "en");
    setMenu(false);
  }
  useEffect(() => {
    if (!menu) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menu]);
  return <header className="public-header">
    <div className="shell header-inner">
      <Brand brand={brand} />
      <nav id="storefront-menu" className={"public-nav" + (menu ? " menu-open" : "")} aria-label={l(lang,"Main navigation","Glavni meni")}>
        {links.map(([label,href]) => <Link key={href} href={href} onClick={() => setMenu(false)}>{label}</Link>)}
        <div className="mobile-menu-footer">
          <button type="button" className="btn secondary" aria-label={switchLabel} onClick={switchLanguage}>{l(lang,"Slovenščina","English")}</button>
          <Link href="/admin" className="text-link" onClick={() => setMenu(false)}>{l(lang,"Owner dashboard","Skrbniška plošča")} <ArrowUpRight size={15} /></Link>
        </div>
      </nav>
      <div className="header-actions">
        <button className="lang-btn desktop-lang" onClick={switchLanguage} aria-label={switchLabel}>{l(lang,"SL","EN")}</button>
        <Link href="/admin" className="btn quiet admin-link">{l(lang,"Owner dashboard","Skrbniška plošča")} <ArrowUpRight size={15} /></Link>
        <button className="icon-btn menu-toggle" aria-controls="storefront-menu" aria-expanded={menu}
          aria-label={menu ? l(lang,"Close menu","Zapri meni") : l(lang,"Open menu","Odpri meni")}
          onClick={() => setMenu(!menu)}>{menu ? <X size={21} /> : <Menu size={21} />}</button>
      </div>
    </div>
  </header>;
}
function Footer({ brand, lang }: Pick<Props,"brand"|"lang">) {
  return <footer className="footer"><div className="shell footer-inner"><div><Brand brand={brand} /><p>{l(lang,"Car rental concept · Koper, Slovenia","Koncept najema vozil · Koper, Slovenija")}</p></div><nav aria-label="Footer"><Link href="/cars">{l(lang,"Fleet","Vozila")}</Link><Link href="/terms">{l(lang,"Terms","Pogoji")}</Link><Link href="/privacy">{l(lang,"Privacy","Zasebnost")}</Link><Link href="/admin">{l(lang,"Owner dashboard","Skrbniška plošča")}</Link></nav></div></footer>;
}
function Home({ state, lang }: Pick<Props,"state"|"lang">) {
  const router = useRouter();
  return <>
    <section className="shell hero">
      <div className="hero-content">
        <h1>{l(lang,"Car rental in Koper","Najem vozil v Kopru")}<span>.</span></h1>
        <p>{l(lang,"Choose when you need a car and see what’s available for your trip.","Izberite termin in preverite, katera vozila so na voljo.")}</p>
      </div>
      <div className="hero-media">
        <img src="/demo/hero.webp" width={1440} height={960} fetchPriority="high"
          alt={l(lang,"Silver car in front of a concrete building","Srebrn avtomobil pred betonsko stavbo")} />
        <span className="media-label">{l(lang,"Illustrative image","Simbolična fotografija")}</span>
      </div>
      <div className="hero-search"><SearchBar state={state} lang={lang} onSearch={(range) => router.push("/cars" + intervalQuery(range))} /></div>
    </section>
    <section className="shell section fleet-section"><div className="section-head spread"><h2>{l(lang,"Our fleet","Vozni park")}</h2><Link className="btn secondary" href="/cars">{l(lang,"All vehicles","Vsa vozila")} <ArrowUpRight size={16} /></Link></div>
      <div className="grid-cars">{state.vehicles.filter(isListed).slice(0,3).map((vehicle) => <CarCard key={vehicle.id} vehicle={vehicle} lang={lang} href={"/cars/" + vehicle.slug} />)}</div>
    </section>
    <section className="how section" id="how-it-works"><div className="shell"><div className="section-head"><h2>{l(lang,"How it works","Kako deluje")}</h2></div><div className="features">{[
      [CalendarDays,"Choose your dates","Izberite datume","Search by pickup and return time.","Iščite po času prevzema in vračila."],
      [Check,"Request your car","Pošljite povpraševanje","Review the price and send a booking request.","Preglejte ceno in pošljite povpraševanje."],
      [KeyRound,"Pick up in Koper","Prevzem v Kopru","Once approved, bring your original documents.","Po potrditvi prinesite izvirnike dokumentov."],
    ].map(([Icon,en,sl,a,b]) => { const Symbol = Icon as typeof CalendarDays; return <div key={String(en)}><Symbol size={24} /><h3>{l(lang,String(en),String(sl))}</h3><p>{l(lang,String(a),String(b))}</p></div>; })}</div></div></section>
    <section className="shell section faq-section"><h2>{l(lang,"Good to know","Dobro je vedeti")}</h2><Faq lang={lang} /></section>
  </>;
}
function Browse({ state, lang, selected }: Pick<Props,"state"|"lang"> & { selected?: LocalRange }) {
  const router = useRouter();
  const params = useSearchParams();
  const category = params.get("class") ?? "";
  const transmission = params.get("gear") ?? "";
  const max = params.get("max") ?? "";
  const fuel = params.get("fuel") ?? "";
  const seats = params.get("seats") ?? "";
  const sort = params.get("sort") ?? "";
  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key,value); else next.delete(key);
    router.replace("/cars?" + next.toString(),{scroll:false});
  }
  let range: Interval | undefined;
  let error = "";
  if (selected) try { range = validateWindow(toInterval(selected.pickup,selected.returnAt),state.settings); } catch (e) { error = rentalMessage(e,state,lang); }
  const rate = (v: Vehicle) => range ? rentalQuote(v,state,range).total : v.dailyRate;
  const vehicles = state.vehicles.filter((v) => isListed(v)
    && (!range || !unavailable(v,state,range)) && (!category || v.category === category) && (!transmission || v.transmission === transmission)
    && (!fuel || v.fuel === fuel) && (!seats || v.seats >= Number(seats)) && (!max || rate(v) <= Number(max) * 100));
  if (sort) vehicles.sort((a,b) => (rate(a)-rate(b)) * (sort === "desc" ? -1 : 1));
  return <main className="shell section subpage">
    <Breadcrumb items={[{label:l(lang,"Home","Domov"),href:"/"},{label:l(lang,"Fleet","Vozila")}]} />
    <div className="section-head"><h1>{l(lang,"The fleet.","Vozni park.")}</h1><p>{l(lang,"Set your dates to see availability and the full rental price.","Izberite datume za prikaz razpoložljivosti in celotne cene najema.")}</p></div>
    <SearchBar key={selected?.pickup + "|" + selected?.returnAt} state={state} lang={lang} initial={selected} onSearch={(local) => {
      const next = new URLSearchParams(params.toString()); next.set("pickup",local.pickup);next.set("return",local.returnAt);router.push("/cars?" + next.toString());
    }} />
    {error && <Notice error>{error}</Notice>}
    <div className="filters">
      <Field label={l(lang,"Class","Razred")}><select value={category} onChange={(e) => update("class",e.target.value)}><option value="">{l(lang,"All","Vse")}</option>{categories.map((v) => <option key={v} value={v}>{txVehicle(v,lang)}</option>)}</select></Field>
      <Field label={l(lang,"Transmission","Menjalnik")}><select value={transmission} onChange={(e) => update("gear",e.target.value)}><option value="">{l(lang,"All","Vse")}</option><option value="Automatic">{txVehicle("Automatic",lang)}</option><option value="Manual">{txVehicle("Manual",lang)}</option></select></Field>
      <Field label={l(lang,"Fuel","Gorivo")}><select value={fuel} onChange={(e) => update("fuel",e.target.value)}><option value="">{l(lang,"All","Vse")}</option>{["Petrol","Diesel","Hybrid","Electric"].map((v) => <option key={v} value={v}>{txVehicle(v,lang)}</option>)}</select></Field>
      <Field label={l(lang,"Seats","Sedeži")}><select value={seats} onChange={(e) => update("seats",e.target.value)}><option value="">{l(lang,"All","Vse")}</option><option value="4">4+</option><option value="5">5+</option><option value="7">7+</option></select></Field>
      <Field label={l(lang,"Max price (€)","Najvišja cena (€)")}><select value={max} onChange={(e) => update("max",e.target.value)}><option value="">{l(lang,"Any","Vse")}</option>{[50,100,200,400,800].map((v) => <option key={v}>{v}</option>)}</select></Field>
      <Field label={l(lang,"Sort by","Razvrsti po")}><select value={sort} onChange={(e) => update("sort",e.target.value)}><option value="">{l(lang,"Featured","Priporočeno")}</option><option value="asc">{l(lang,"Price low to high","Najprej nižja cena")}</option><option value="desc">{l(lang,"Price high to low","Najprej višja cena")}</option></select></Field>
    </div>
    <p className="results">{vehicles.length} {l(lang,"vehicles","vozil")}</p>
    <div className="grid-cars">{vehicles.map((v) => <CarCard key={v.id} vehicle={v} lang={lang} href={"/cars/" + v.slug + (params.size ? "?" + params.toString() : "")} quote={range ? rentalQuote(v,state,range) : undefined} available={!!range} />)}</div>
    {!vehicles.length && <div className="empty"><CarFront /><h3>{l(lang,"No cars match","Ni ustreznih vozil")}</h3><p>{l(lang,"Try a different interval or clear the filters.","Poskusite drug termin ali počistite filtre.")}</p><Link className="btn secondary" href={"/cars" + intervalQuery(selected)}>{l(lang,"Clear filters","Počisti filtre")}</Link></div>}
  </main>;
}
function TripFields({ local, set, lang }: { local: LocalRange; set: (value: LocalRange) => void; lang: Lang }) {
  return <div className="trip-fields">
    <RentalTime label={l(lang,"Pickup","Prevzem")} value={local.pickup} onChange={(pickup) => set({...local,pickup})} lang={lang} />
    <RentalTime label={l(lang,"Return","Vračilo")} value={local.returnAt} onChange={(returnAt) => set({...local,returnAt})} lang={lang} />
  </div>;
}
function tripCheck(vehicle: Vehicle, state: Store, local: LocalRange, lang: Lang) {
  try {
    const range = validateWindow(toInterval(local.pickup,local.returnAt),state.settings);
    return { price: rentalQuote(vehicle,state,range), problem: unavailable(vehicle,state,range,undefined,lang) };
  } catch (e) { return { problem:rentalMessage(e,state,lang) }; }
}
function Detail({ vehicle, state, lang, selected }: Pick<Props,"state"|"lang"> & { vehicle: Vehicle; selected?: LocalRange }) {
  const params = useSearchParams();
  const [local,set] = useState(selected ?? quickInterval("today",state.settings));
  const { price, problem } = tripCheck(vehicle,state,local,lang);
  const [openedAt] = useState(Date.now);
  const [activePhoto,setActivePhoto] = useState(0);
  const photos = [{photo:vehicle.photo,photoSource:vehicle.photoSource,photoCredit:vehicle.photoCredit},...(vehicle.gallery ?? [])];
  const shownPhoto = photos[activePhoto] ?? photos[0];
  const occupied = [...state.blocks, ...state.bookings.filter((b) => ["CONFIRMED","PICKED_UP"].includes(b.status))].filter((item) => item.vehicleId === vehicle.id && Date.parse(item.returnAt) >= openedAt).sort((a,b) => a.pickup.localeCompare(b.pickup));
  const bookingHref = "/booking/" + vehicle.id + intervalQuery(local);
  return <main className="shell section subpage"><Breadcrumb items={[{label:l(lang,"Fleet","Vozila"),href:"/cars"+(params.size ? "?"+params.toString() : "")},{label:vehicleName(vehicle)}]} />
    <div className="detail-layout">
      <div className="detail-main"><span className="eyebrow">{txVehicle(vehicle.category,lang)} · {vehicle.year}</span><h1>{vehicleName(vehicle)}</h1><ImageCar vehicle={{...vehicle,...shownPhoto}} lang={lang} />
        {photos.length>1&&<div className="gallery-picks">{photos.map((item,index)=><button type="button" key={item.photo} className="icon-btn" aria-label={l(lang,"View photo","Prikaži fotografijo")+" "+(index+1)} aria-pressed={activePhoto===index} onClick={()=>setActivePhoto(index)}><img src={item.photo} alt="" /></button>)}</div>}
        {shownPhoto.photoCredit && <p className="credit">{l(lang,"Photo by","Avtor fotografije")} {shownPhoto.photoCredit.author} · <a href={shownPhoto.photoCredit.url} target="_blank" rel="noreferrer">{shownPhoto.photoCredit.license} ↗</a></p>}
        <p className="detail-description">{lang === "sl" ? vehicle.descriptionSl : vehicle.description}</p>
        <div className="spec-grid">{[[l(lang,"Transmission","Menjalnik"),txVehicle(vehicle.transmission,lang)],[l(lang,"Fuel","Gorivo"),txVehicle(vehicle.fuel,lang)],[l(lang,"Seats","Sedeži"),vehicle.seats],[l(lang,"Doors","Vrata"),vehicle.doors],[l(lang,"Luggage","Prtljaga"),vehicle.luggage],[l(lang,"Color","Barva"),txVehicle(vehicle.color,lang)]].filter(([,v]) => v).map(([label,value]) => <div key={label}><small>{label}</small><b>{value}</b></div>)}</div>
        <div className="detail-info"><h3>{l(lang,"Pickup and requirements","Prevzem in pogoji")}</h3><p><MapPin size={17} /> {state.settings.address}</p><p><Clock3 size={17} />{pickupHours(lang)}</p><p><ShieldCheck size={17} />{l(lang,"Original driving licence and ID","Izvirnik vozniškega dovoljenja in osebnega dokumenta")}{vehicle.minAge ? " · " + vehicle.minAge + "+" : ""}{vehicle.minLicenseYears ? l(lang," · Licence "," · Vozniško dovoljenje ") + vehicle.minLicenseYears + l(lang,"+ years","+ let") : ""}</p>{[...vehicle.features,...vehicle.rules].length > 0 && <p>{[...vehicle.features,...vehicle.rules].map((item) => txVehicle(item,lang)).join(" · ")}</p>}</div>
        <div className="detail-info"><h3>{l(lang,"Upcoming unavailable dates","Prihajajoči zasedeni termini")}</h3>{occupied.length ? occupied.slice(0,6).map((item) => <p key={item.pickup+item.returnAt}>{formatDate(item.pickup,lang)} – {formatDate(item.returnAt,lang)}</p>) : <p>{l(lang,"Choose your dates to check availability.","Izberite datume za preverjanje razpoložljivosti.")}</p>}{state.windows.filter((item) => item.vehicleId === vehicle.id).map((item) => <p key={item.id}>{l(lang,"Bookable window","Obdobje najema")} · {formatDate(item.pickup,lang)} – {formatDate(item.returnAt,lang)}</p>)}</div>
      </div>
      <aside className="booking-panel"><h3>{l(lang,"Plan your rental","Načrtujte najem")}</h3><TripFields local={local} set={set} lang={lang} />{price && <QuoteCard quote={price} lang={lang} />}
        {problem ? <><Notice error>{problem}</Notice><div className="inline-actions"><button className="btn secondary" onClick={() => set(quickInterval("weekend",state.settings))}>{l(lang,"Weekend","Vikend")}</button><Link className="btn secondary" href={"/cars" + intervalQuery(local)}>{l(lang,"Other cars","Druga vozila")}</Link></div></>
          : <Link className="btn primary full" href={bookingHref}>{l(lang,"Request this car","Pošlji povpraševanje")} <ArrowRight size={18} /></Link>}
      </aside>
    </div>
    {!problem && price && <div className="mobile-book"><div><b>{formatMoney(price.total,lang)}</b><small>{l(lang,"Rental total","Skupni najem")}</small></div><Link className="btn primary" href={bookingHref}>{l(lang,"Request car","Pošlji povpraševanje")}</Link></div>}
  </main>;
}
function Book({ vehicle, state, lang, perform, selected }: Pick<Props,"state"|"lang"|"perform"> & { vehicle: Vehicle; selected?: LocalRange }) {
  const router = useRouter();
  const [local,set] = useState(selected ?? quickInterval("today",state.settings));
  const [data,setData] = useState({name:"",email:"",phone:"",note:"",accept:false,eligibility:false,trap:""});
  const [review,setReview] = useState(false);
  const [pending,setPending] = useState(false);
  const [requestId,setRequestId] = useState("");
  const [error,setError] = useState("");
  const { price,problem } = tripCheck(vehicle,state,local,lang);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!review) {setReview(true);setError("");return;}
    if (pending || problem || !data.accept || !data.eligibility) return;
    setPending(true);setError("");
    const id = requestId || crypto.randomUUID();setRequestId(id);
    try {
      const receipt = await perform({ type:"request", id, vehicleId:vehicle.id, ...local, ...data, accept:true, eligibility:true });
      if (receipt) router.push("/booking/success?ref=" + encodeURIComponent(receipt.ref));
    } catch (e) {setError(rentalMessage(e,state,lang));} finally {setPending(false);}
  }
  return <main className="shell section subpage"><Breadcrumb items={[{ label:l(lang,"Fleet","Vozila"),href:"/cars" },{label:vehicleName(vehicle),href:"/cars/"+vehicle.slug+intervalQuery(local)},{label:l(lang,"Booking request","Povpraševanje")}]} />
    <div className="section-head"><h1>{l(lang,"Request your car.","Pošljite povpraševanje.")}</h1><p>{l(lang,"The rental owner reviews your request before confirmation.","Skrbnik pregleda vaše povpraševanje pred potrditvijo.")}</p></div>
    <div className="detail-layout"><form className="panel form-stack" onSubmit={submit}>
      <h3>{review ? l(lang,"Review request","Pregled povpraševanja") : l(lang,"Your details","Vaši podatki")}</h3>
      {review ? <div className="review-lines"><b>{data.name}</b><span>{data.email} · {data.phone}</span><span>{formatDate(local.pickup,lang)} – {formatDate(local.returnAt,lang)}</span>{data.note && <p>{data.note}</p>}</div> : <>
        <TripFields local={local} set={set} lang={lang} />
        <Field label={l(lang,"Full name","Ime in priimek")}><input autoComplete="name" value={data.name} minLength={2} maxLength={200} required onChange={(e) => setData({...data,name:e.target.value})} /></Field>
        <div className="fields-two"><Field label={l(lang,"Email","E-pošta")}><input type="email" autoComplete="email" required value={data.email} onChange={(e) => setData({...data,email:e.target.value})} /></Field><Field label={l(lang,"Phone","Telefon")}><input type="tel" autoComplete="tel" required value={data.phone} onChange={(e) => setData({...data,phone:e.target.value})} /></Field></div>
        <Field label={l(lang,"Note (optional)","Opomba (neobvezno)")}><textarea value={data.note} maxLength={1600} onChange={(e) => setData({...data,note:e.target.value})} /></Field>
        <label className="check"><input type="checkbox" required checked={data.accept} onChange={(e) => setData({...data,accept:e.target.checked})} /><span>{l(lang,"I accept the demo terms and read the privacy information.","Sprejemam pogoje in sem prebral/-a obvestilo o zasebnosti.")} <Link href="/terms" target="_blank">{l(lang,"Terms","Pogoji")}</Link> · <Link href="/privacy" target="_blank">{l(lang,"Privacy","Zasebnost")}</Link></span></label>
        <label className="check"><input type="checkbox" required checked={data.eligibility} onChange={(e) => setData({...data,eligibility:e.target.checked})} />{l(lang,"I meet the licence and age requirements.","Izpolnjujem pogoje glede vozniškega dovoljenja in starosti.")}</label>
        <label hidden>Company website<input tabIndex={-1} autoComplete="off" value={data.trap} onChange={(e) => setData({...data,trap:e.target.value})} /></label>
      </>}
      {(error || problem) && <Notice error>{error || problem}</Notice>}
      <div className="inline-actions">{review && <button className="btn secondary" type="button" onClick={() => {setRequestId("");setReview(false);}}>{l(lang,"Edit details","Uredi podatke")}</button>}<button className="btn primary" disabled={!!problem || pending}>{pending ? l(lang,"Sending…","Pošiljanje…") : review ? l(lang,"Send booking request","Pošlji povpraševanje") : l(lang,"Review request","Preglej povpraševanje")} <ArrowRight size={17} /></button></div>
    </form><aside className="booking-panel"><ImageCar vehicle={vehicle} lang={lang} /><h3>{vehicleName(vehicle)}</h3>{price && <QuoteCard quote={price} lang={lang} />}<p className="muted">{l(lang,"Demo requests use sample contact details. No payment is collected.","Za predstavitvena povpraševanja uporabite vzorčne podatke. Plačil ni.")}</p></aside></div>
  </main>;
}
function Success({ lang, refCode, receipt }: {lang: Lang;refCode: string;receipt?: Receipt}) {
  const status = receipt?.status;
  return <main className="shell section"><div className="success panel"><div className="success-icon"><Check size={28} /></div><h1>{status === "REQUESTED" ? l(lang,"Request received.","Povpraševanje prejeto.") : l(lang,"Booking status","Status rezervacije")}</h1>{refCode && <div className="ref"><span>{l(lang,"Reference","Referenca")}</span><b>{refCode}</b></div>}
    <p>{status === "REQUESTED" ? l(lang,"Awaiting owner approval. This request does not reserve the vehicle.","Čaka na potrditev skrbnika. Povpraševanje še ne rezervira vozila.") : status ? txStatus(status,lang) : l(lang,"This reference is unavailable in this demo workspace.","Referenca v tej predstavitvi ni na voljo.")}</p>
    <Link className="btn primary" href="/cars">{l(lang,"Back to the fleet","Nazaj na vozila")} <ArrowRight size={16} /></Link></div></main>;
}
function Info({ name,state, lang }: {name: string;state: Store;lang:Lang}) {
  const copy: Record<string,[string,string,string,string]> = {
    faq:["Frequently asked questions","Pogosta vprašanja","",""],
    contact:["Get in touch","Kontakt","Demo pickup details","Predstavitveni podatki za prevzem"],
    terms:["Demo terms","Pogoji predstavitve","Booking requests await owner approval. Prices and documents are shown for demonstration. Review the vehicle requirements before submitting a request.","Povpraševanja čakajo na potrditev skrbnika. Cene in dokumenti so prikazani za predstavitev."],
    privacy:["Privacy","Zasebnost","Use fictitious details in this demonstration. The request form stores the contact details you enter so the owner view can display the booking. This demo does not collect identity document uploads.","V predstavitvi uporabite izmišljene podatke. Obrazec shrani vnesene kontaktne podatke za prikaz rezervacije v skrbniškem pogledu."],
  };
  const [heading,title,body,translation] = copy[name] ?? copy.faq;
  return <main className="shell section info-page"><h1>{l(lang,heading,title)}</h1>{body && <p>{l(lang,body,translation)}</p>}{name === "faq" && <Faq lang={lang} />}{name === "contact" && <div className="panel detail-info"><p><MapPin size={19} />{state.settings.address}</p><p><Clock3 size={19} />{pickupHours(lang)}</p><p>{state.settings.email}</p></div>}</main>;
}
export default function PublicExperience(props: Props) {
  const { state,brand,lang,language,path,perform,receipt } = props;
  const params = useSearchParams();
  const pickup = params.get("pickup");
  const returnAt = params.get("return");
  const selected = pickup && returnAt ? {pickup,returnAt} : undefined;
  const [page, id] = path;
  const car = state.vehicles.find((v) => isListed(v) && (page === "cars" ? v.slug === id : v.id === id));
  let content;
  if (!page) content = <main><Home state={state} lang={lang} /></main>;
  else if (page === "cars" && !id) content = <Browse state={state} lang={lang} selected={selected} />;
  else if (page === "cars" && car) content = <Detail key={car.id} vehicle={car} state={state} lang={lang} selected={selected} />;
  else if (page === "booking" && id === "success") {
    const refCode = params.get("ref")?.slice(0,40) ?? "";
    const booking = state.bookings.find((item) => item.ref === refCode);
    content = <Success lang={lang} refCode={refCode} receipt={booking ?? (receipt?.ref === refCode ? receipt : undefined)} />;
  } else if (page === "booking" && car) content = <Book key={car.id} vehicle={car} state={state} lang={lang} perform={perform} selected={selected} />;
  else if (["faq","contact","terms","privacy"].includes(page)) content = <Info name={page} state={state} lang={lang} />;
  else content = <main className="shell section empty"><h2>{l(lang,"Vehicle unavailable","Vozilo ni na voljo")}</h2><Link className="btn primary" href="/cars">{l(lang,"Browse the fleet","Ogled vozil")}</Link></main>;
  return <><PublicHeader brand={brand} lang={lang} language={language} />{content}<Footer brand={brand} lang={lang} /></>;
}
