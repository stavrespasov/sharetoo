"use client";

import Link from "next/link";
import { Activity, ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, CarFront, ClipboardList, Clock3, KeyRound, LayoutGrid, LogOut, Menu, Plus, Printer, Settings2, Tag, UsersRound, X } from "lucide-react";
import { DateTime } from "luxon";
import { useState, type FormEvent } from "react";
import { formatDate, formatMoney, overlaps, zone } from "@/lib/booking/domain";
import { statuses, vehicleName, type Booking, type Status, type Store } from "@/lib/booking/types";
import { isListed, unavailable } from "@/lib/demo/actions";
import { Brand, Field, l, Notice, QuoteCard, txStatus, type Lang, type Perform } from "./common";
import { FleetList, ScheduleEditor, VehicleEditor, type FleetProps, type Run } from "./fleet-admin";

const nav = [
  ["/admin",LayoutGrid,"Overview","Pregled"],["/admin/bookings",ClipboardList,"Bookings","Rezervacije"],["/admin/vehicles",CarFront,"Fleet","Vozila"],
  ["/admin/calendar",CalendarDays,"Calendar","Koledar"],["/admin/offers",Tag,"Offers","Ponudbe"],["/admin/customers",UsersRound,"Customers","Stranke"],["/admin/settings",Settings2,"Settings","Nastavitve"],
] as const;
const windowLabel = (b: Booking, lang: Lang) => formatDate(b.pickup,lang) + " → " + formatDate(b.returnAt,lang);
function StatusPill({status,lang}:{status:Status;lang:Lang}){
  return <span className={"pill status-"+status.toLowerCase()}><span className="dot"/>{txStatus(status,lang)}</span>;
}

type Props = { state: Store; brand: string; lang: Lang; language: (lang: Lang) => void; path: string[]; perform: Perform; owner: boolean; hosted: boolean; signIn: (password: string)=>Promise<void>; signOut: ()=>Promise<void> };
function Gate({brand,lang,hosted,signIn}:Pick<Props,"brand"|"lang"|"hosted"|"signIn">){
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  async function submit(event: FormEvent){event.preventDefault();setBusy(true);setError("");try{await signIn(password);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <main className="login-shell"><Brand brand={brand}/><form className="panel form-stack login-panel" onSubmit={submit}><div className="success-icon"><KeyRound size={23}/></div><h1>{l(lang,"Owner dashboard","Skrbniška plošča")}</h1><p className="muted">{hosted?l(lang,"Sign in to the shared demo workspace.","Prijavite se v skupno predstavitev."):l(lang,"Explore the simulated owner workspace in this browser.","Raziščite predstavitveni skrbniški pogled v tem brskalniku.")}</p>{hosted&&<Field label="Demo owner password"><input type="password" autoComplete="current-password" value={password} onChange={(e)=>setPassword(e.target.value)} required /></Field>}{error&&<Notice error>{error}</Notice>}<button className="btn primary full" disabled={busy}>{busy?"Opening…":hosted?"Sign in":l(lang,"Enter owner demo","Vstopi v predstavitev")} <ArrowRight size={17}/></button><Link className="text-link" href="/"><ArrowLeft size={15}/> {l(lang,"Back to storefront","Nazaj na spletno stran")}</Link></form></main>;
}
function BookingTable({rows,lang}:{rows:Booking[];lang:Lang}){
  return <div className="admin-table"><table><thead><tr><th>{l(lang,"Reference","Referenca")}</th><th>{l(lang,"Vehicle / customer","Vozilo / stranka")}</th><th>{l(lang,"Pickup","Prevzem")}</th><th>{l(lang,"Status","Status")}</th><th>{l(lang,"Total","Skupaj")}</th><th /></tr></thead><tbody>{rows.map(b=><tr key={b.id}>
    <td><Link className="text-link" href={"/admin/bookings/"+b.id}>{b.ref}</Link></td><td data-label="Vehicle"><b>{b.vehicleName}</b><small>{b.customer.name}</small></td>
    <td data-label="Pickup">{formatDate(b.pickup,lang)}</td><td data-label="Status"><StatusPill status={b.status} lang={lang}/></td><td data-label="Total">{formatMoney(b.quote.total,lang)}</td>
    <td className="row-actions"><Link href={"/admin/bookings/"+b.id} className="icon-btn" aria-label={"Open booking "+b.ref}><ArrowUpRight size={16}/></Link></td>
  </tr>)}</tbody></table>{!rows.length&&<div className="empty"><ClipboardList/><h3>{l(lang,"No bookings found","Ni rezervacij")}</h3></div>}</div>;
}
function Bookings({state,lang}:Pick<Props,"state"|"lang">){
  const [status,setStatus]=useState("");
  const [q,setQ]=useState("");
  const rows=state.bookings.filter((b)=>(!status||b.status===status)&&[b.ref,b.vehicleName,b.customer.name,b.customer.email].some((item)=>item.toLowerCase().includes(q.toLowerCase())));
  return <><div className="admin-toolbar inline-actions"><Field label={l(lang,"Search bookings","Išči rezervacije")}><input placeholder="Reference, vehicle or customer" value={q} onChange={(e)=>setQ(e.target.value)}/></Field><Field label={l(lang,"Status","Status")}><select value={status} onChange={(e)=>setStatus(e.target.value)}><option value="">All statuses</option>{statuses.map((x)=><option value={x} key={x}>{txStatus(x,lang)}</option>)}</select></Field></div><BookingTable rows={rows} lang={lang}/></>;
}
function Overview({state,lang}:Pick<Props,"state"|"lang">){
  const [week,setWeek]=useState(false);
  const now=DateTime.now().setZone(zone);
  const start=now.startOf("day");
  const end=start.plus({days:week?7:1});
  const interval={pickup:start.toUTC().toISO()!,returnAt:end.toUTC().toISO()!};
  const live=state.bookings.filter((b)=>b.status==="CONFIRMED"||b.status==="PICKED_UP");
  const pickups=live.filter((b)=>b.status==="CONFIRMED"&&Date.parse(b.pickup)>=+start&&Date.parse(b.pickup)<+end);
  const returns=live.filter((b)=>Date.parse(b.returnAt)>=+start&&Date.parse(b.returnAt)<+end);
  const requests=state.bookings.filter((b)=>b.status==="REQUESTED");
  const free=state.vehicles.filter((v)=>isListed(v)&&!unavailable(v,state,interval));
  const kpis=[[ArrowUpRight,week?"Week’s pickups":"Today’s pickups",pickups.length],[ArrowDownLeft,week?"Week’s returns":"Today’s returns",returns.length],[ClipboardList,"Pending requests",requests.length],[CarFront,week?"Free all week":"Free all day",free.length]] as const;
  return <>
    <div className="admin-toolbar spread"><p className="muted"><Clock3 size={16}/> {now.setLocale(lang).toLocaleString(DateTime.DATE_HUGE)} · Ljubljana</p><div className="segmented"><button className={!week?"selected":""} onClick={()=>setWeek(false)}>{l(lang,"Today","Danes")}</button><button className={week?"selected":""} onClick={()=>setWeek(true)}>{l(lang,"Next 7 days","Naslednjih 7 dni")}</button></div></div>
    <div className="kpis">{kpis.map(([Icon,label,n])=><div key={label} className="kpi"><div className="spread"><small>{label}</small><Icon size={17}/></div><strong>{n}</strong></div>)}</div>
    <div className="overview-quick spread"><div><h3>{l(lang,"Add a car in one sentence","Dodajte vozilo z enim stavkom")}</h3><p>{l(lang,"Type or dictate the model, rate and availability.","Vnesite ali narekujte model, ceno in razpoložljivost.")}</p></div><Link href="/admin/vehicles/new" className="btn primary"><Plus size={17}/>{l(lang,"Describe a car","Opiši vozilo")}</Link></div>
    <div className="overview-grid">{[[l(lang,"Pickups","Prevzemi"),pickups],[l(lang,"Returns","Vračila"),returns]] .map(([title,items])=><section className="panel form-stack" key={String(title)}><h3>{String(title)}</h3>{(items as Booking[]).map((b)=><Link className="schedule-row spread" key={b.id} href={"/admin/bookings/"+b.id}><div><b>{b.vehicleName}</b><p>{b.customer.name}</p></div><span>{formatDate(title===l(lang,"Pickups","Prevzemi")?b.pickup:b.returnAt,lang)}</span></Link>)}{!(items as Booking[]).length&&<p className="muted">No scheduled events.</p>}</section>)}</div>
    <section className="panel form-stack overview-available"><div className="spread"><h3>{l(lang,"Available vehicles","Razpoložljiva vozila")}</h3><Link href="/admin/calendar" className="text-link">{l(lang,"Calendar","Koledar")} <ArrowUpRight size={15}/></Link></div><div className="inline-actions">{free.map((car)=><Link className="pill" key={car.id} href={"/admin/vehicles/"+car.id}>{vehicleName(car)} · {formatMoney(car.dailyRate,lang)} <ArrowUpRight size={13}/></Link>)}</div>{!free.length&&<p className="muted">{l(lang,"No car is free for this entire period. Check the calendar for shorter windows.","V tem celotnem obdobju ni prostega vozila. Preverite krajše termine v koledarju.")}</p>}</section>
    <div className="spread section-mini"><h3>{l(lang,"Requests to review","Povpraševanja za pregled")}</h3><Link className="btn secondary" href="/admin/bookings">All bookings <ArrowUpRight size={16}/></Link></div><BookingTable rows={requests} lang={lang}/>
  </>;
}
function BookingDetail({booking,lang,run}:{booking:Booking;lang:Lang;run:Run}) {
  const [internal,setInternal]=useState(booking.internalNote);
  const [original,setOriginal]=useState(false);
  const [signed,setSigned]=useState(false);
  const [mileage,setMileage]=useState("");
  const [condition,setCondition]=useState("");
  const [busy,setBusy]=useState(false);
  async function move(status:Status){setBusy(true);await run({type:"status",id:booking.id,status,originalsChecked:original,signedOffline:signed,mileage:mileage?+mileage:undefined,condition},txStatus(status,lang)+".");setBusy(false);}
  return <div className="detail-admin"><div className="form-stack">
    <section className="panel form-stack"><div className="spread"><h3>{booking.vehicleName}</h3><StatusPill status={booking.status} lang={lang}/></div><p>{windowLabel(booking,lang)}</p><div className="review-lines"><b>{booking.customer.name}</b><span>{booking.customer.email}</span><span>{booking.customer.phone}</span>{booking.note&&<p>{booking.note}</p>}</div><QuoteCard quote={booking.quote} lang={lang}/></section>
    <section className="panel form-stack"><h3>Actions</h3>
      {booking.status==="REQUESTED"&&<div className="inline-actions"><button className="btn primary" disabled={busy} onClick={()=>move("CONFIRMED")}>{l(lang,"Confirm booking","Potrdi rezervacijo")}</button><button className="btn secondary" disabled={busy} onClick={()=>move("REJECTED")}>{l(lang,"Reject request","Zavrni povpraševanje")}</button><button className="btn quiet" disabled={busy} onClick={()=>move("CANCELLED")}>Cancel request</button></div>}
      {booking.status==="CONFIRMED"&&<><label className="check"><input type="checkbox" checked={original} onChange={(e)=>setOriginal(e.target.checked)}/>Original documents checked</label><label className="check"><input type="checkbox" checked={signed} onChange={(e)=>setSigned(e.target.checked)}/>Signed offline</label></>}
      {["CONFIRMED","PICKED_UP"].includes(booking.status)&&<><div className="fields-two"><Field label="Mileage (optional)"><input type="number" min="0" value={mileage} onChange={(e)=>setMileage(e.target.value)}/></Field><Field label="Condition (optional)"><input value={condition} onChange={(e)=>setCondition(e.target.value)}/></Field></div><div className="inline-actions">{booking.status==="CONFIRMED"?<><button className="btn primary" disabled={busy||!original||!signed} onClick={()=>move("PICKED_UP")}>Record pickup</button><button className="btn secondary" disabled={busy} onClick={()=>move("CANCELLED")}>Cancel booking</button></>:<button className="btn primary" disabled={busy} onClick={()=>move("RETURNED")}>Record return</button>}</div></>}
      {booking.contract&&<Link href={"/admin/bookings/"+booking.id+"/contract"} className="btn secondary"><Printer size={17}/> {l(lang,"Preview draft agreement","Predogled osnutka pogodbe")}</Link>}
      {booking.handover&&<p className="muted">Pickup recorded{booking.handover.mileage!==undefined?" · "+booking.handover.mileage+" km":""}{booking.handover.condition?" · "+booking.handover.condition:""}</p>}
      {booking.returnRecord&&<p className="muted">Return recorded{booking.returnRecord.mileage!==undefined?" · "+booking.returnRecord.mileage+" km":""}{booking.returnRecord.condition?" · "+booking.returnRecord.condition:""}</p>}
    </section>
  </div><aside className="form-stack"><form className="panel form-stack" onSubmit={(e)=>{e.preventDefault();void run({type:"note",id:booking.id,note:internal},"Note saved.");}}><h3>Internal note</h3><Field label="Staff only"><textarea value={internal} onChange={(e)=>setInternal(e.target.value)} maxLength={1600}/></Field><button className="btn secondary">Save note</button></form>
    <section className="panel form-stack"><div className="section-mini"><Activity size={17}/><h3>Activity</h3></div><ol className="activity-list">{[...booking.activity].reverse().map((item)=><li key={item.key}><span className="dot"/><div><b>{item.type.replaceAll("_"," ")}</b><small>{formatDate(item.at,lang)}{item.simulated&&" · Simulated email"}</small></div></li>)}</ol></section></aside>
  </div>;
}
function Contract({booking,lang}:{booking:Booking;lang:Lang}) {
  const contract=booking.contract;
  if(!contract)return <Notice error>The draft agreement becomes available after approval.</Notice>;
  return <><div className="print-actions spread"><Link href={"/admin/bookings/"+booking.id} className="btn secondary"><ArrowLeft size={16}/> Back to booking</Link><button onClick={()=>window.print()} className="btn primary"><Printer size={16}/> Print / save PDF</button></div><article className="agreement panel"><div className="spread"><b>{contract.tradingName}</b><span className="pill">DRAFT — NOT SIGNED</span></div><h1>Rental agreement draft</h1><p>Reference {booking.ref} · Template {contract.version}</p>
  <dl>{[["Sample operator",contract.legalName],["Pickup / return location",contract.address],["Operator contact",[contract.email,contract.phone].filter(Boolean).join(" · ")],["Renter",booking.customer.name],["Renter contact",booking.customer.email+" · "+booking.customer.phone],["Vehicle / plate",contract.car+" · "+(contract.plate||"To be completed")],["Pickup",formatDate(booking.pickup,lang)],["Return",formatDate(booking.returnAt,lang)],["Rental total",formatMoney(booking.quote.total,lang)],["Refundable deposit",formatMoney(booking.quote.deposit,lang)]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
  <p>Sample agreement text. The operator would supply the approved rental terms and complete any required fields at pickup.</p><div className="signature"><span>Operator signature</span><span>Renter signature</span></div></article></>;
}
function Calendar({state,lang,run,perform}:FleetProps){
  const [offset,setOffset]=useState(0);
  const start=DateTime.now().setZone(zone).startOf("day").plus({days:offset});
  const days=Array.from({length:7},(_,i)=>start.plus({days:i}));
  const active=state.vehicles.filter((v)=>!v.archived);
  const events=[
    ...state.bookings.filter((b)=>["REQUESTED","CONFIRMED","PICKED_UP"].includes(b.status)).map((b)=>({...b,label:txStatus(b.status,lang),href:"/admin/bookings/"+b.id,kind:b.status.toLowerCase()})),
    ...state.blocks.map((b)=>({...b,label:b.reason,href:"",kind:"block"})),
  ];
  const daysRange={pickup:start.toUTC().toISO()!,returnAt:start.plus({days:7}).toUTC().toISO()!};
  return <div className="form-stack"><div className="spread admin-toolbar"><b>{start.setLocale(lang).toLocaleString(DateTime.DATE_MED)} – {days[6].setLocale(lang).toLocaleString(DateTime.DATE_MED)}</b><div className="inline-actions"><button className="icon-btn" aria-label="Previous week" onClick={()=>setOffset(offset-7)}><ArrowLeft size={16}/></button><button className="btn quiet" onClick={()=>setOffset(0)}>Today</button><button className="icon-btn" aria-label="Next week" onClick={()=>setOffset(offset+7)}><ArrowRight size={16}/></button></div></div>
    <div className="calendar-scroll"><div className="calendar-grid"><div className="calendar-heading">Vehicle</div>{days.map((day)=><div className="calendar-heading" key={+day}>{day.setLocale(lang).toFormat("ccc dd")}</div>)}{active.map((v)=><div className="calendar-row" key={v.id}><b>{vehicleName(v)}</b>{days.map((day)=>{const range={pickup:day.toUTC().toISO()!,returnAt:day.plus({days:1}).toUTC().toISO()!};return <div key={+day}>{events.filter((e)=>e.vehicleId===v.id&&overlaps(e,range)).map((e)=>e.href?<Link key={e.id} href={e.href} className={"calendar-event "+e.kind}>{e.label}</Link>:<span key={e.id} className={"calendar-event "+e.kind}>{e.label}</span>)}</div>;})}</div>)}</div></div>
    <div className="calendar-agenda panel form-stack"><h3>Week agenda</h3>{events.filter((e)=>overlaps(e,daysRange)).sort((a,b)=>a.pickup.localeCompare(b.pickup)).map((e)=><div key={e.id} className="schedule-row"><b>{state.vehicles.find((v)=>v.id===e.vehicleId)?.model ?? e.vehicleId}</b><p>{formatDate(e.pickup,lang)} – {formatDate(e.returnAt,lang)}</p>{e.href?<Link className="text-link" href={e.href}>{e.label}</Link>:<span className="pill">{e.label}</span>}</div>)}</div>
    <ScheduleEditor state={state} run={run} lang={lang} perform={perform} blocks/>
  </div>;
}
function Customers({state}:Pick<Props,"state">){
  const [query,setQuery]=useState("");
  const customers=Array.from(new Map(state.bookings.map((b)=>[b.customer.email,b.customer])).values()).filter((c)=>(c.name+" "+c.email).toLowerCase().includes(query.toLowerCase()));
  return <div className="form-stack"><Field label="Search customers"><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Name or email"/></Field><div className="grid-customers">{customers.map((c)=><section className="panel form-stack" key={c.email}><h3>{c.name}</h3><p>{c.email} · {c.phone}</p><div className="inline-actions">{state.bookings.filter((b)=>b.customer.email===c.email).map((b)=><Link href={"/admin/bookings/"+b.id} className="pill" key={b.id}>{b.ref} <ArrowUpRight size={15}/></Link>)}</div></section>)}</div>{!customers.length&&<p className="muted">No matching customers.</p>}</div>;
}
function Settings({state,run,hosted}:{state:Store;run:Run;hosted:boolean}){
  const [prefs,setPrefs]=useState(state.settings);
  const [busy,setBusy]=useState(false);
  const words=[["tradingName","Trading name"],["legalName","Legal name"],["address","Pickup location"],["email","Contact email"],["phone","Contact phone"],["open","Opens"],["close","Closes"],["templateVersion","Agreement template version"]] as const;
  const numbers=[["minNotice","Minimum notice (min)"],["buffer","Turnaround (min)"],["minHours","Minimum rental (hours)"],["maxDays","Maximum rental (days)"],["fee","Rental fee (€)"]] as const;
  return <div className="form-stack"><form className="panel form-stack" onSubmit={async(e)=>{e.preventDefault();setBusy(true);await run({type:"settings",settings:prefs},"Settings saved.");setBusy(false);}}><h3>Business and rental rules</h3><div className="fields-two">
    {words.map(([key,label])=><Field key={key} label={label}><input type={key==="email"?"email":key==="open"||key==="close"?"time":"text"} value={prefs[key]} onChange={(e)=>setPrefs({...prefs,[key]:e.target.value})}/></Field>)}
    {numbers.map(([key,label])=><Field key={key} label={label}><input type="number" min="0" step={key==="fee"?".01":"1"} value={prefs[key]/(key==="fee"?100:1)} onChange={(e)=>setPrefs({...prefs,[key]:Math.round(+e.target.value*(key==="fee"?100:1))})}/></Field>)}</div>
    <Field label="Policies · English"><textarea value={prefs.policy} onChange={(e)=>setPrefs({...prefs,policy:e.target.value})}/></Field><Field label="Policies · Slovenian"><textarea value={prefs.policySl} onChange={(e)=>setPrefs({...prefs,policySl:e.target.value})}/></Field><button className="btn primary" disabled={busy}>Save settings</button></form>
    <section className="panel form-stack"><h3>Demo workspace</h3><p className="muted">{hosted?"Shared demonstration data.":"Data is stored in this browser. Owner access in this mode is simulated."}</p><button className="btn secondary" onClick={async()=>{if(window.confirm("Replace this demo workspace with its original sample data?")&&await run({type:"reset"},"Demo reset."))location.reload();}}>Reset sample data</button>
    <h3>Simulated email activity</h3><ol className="activity-list">{state.bookings.flatMap((b)=>b.activity.filter((e)=>e.simulated).map((e)=><li key={e.key}><span className="dot"/><div><b>{e.type.replaceAll("_"," ")}</b><small>{b.ref} · {formatDate(e.at)}</small></div></li>))}</ol></section>
  </div>;
}
export default function AdminExperience(props: Props){
  const {owner,hosted,brand,state,lang,path,perform,language,signOut}=props;
  const [menu,setMenu]=useState(false);
  const [feedback,setFeedback]=useState<{message:string;error:boolean}>();
  if(!owner)return <Gate {...props}/>;
  const [,page,id,detail]=path;
  const href=page?"/admin/"+page:"/admin";
  const booking=state.bookings.find((b)=>b.id===id);
  const vehicle=state.vehicles.find((v)=>v.id===id);
  const pane=nav.find((item)=>item[0]===href);
  const title=page==="vehicles"&&id? (vehicle?vehicleName(vehicle):l(lang,"Add vehicle","Dodaj vozilo")):page==="bookings"&&id?booking?.ref??"Booking":pane?l(lang,pane[2],pane[3]):"Overview";
  const run:Run=async (action,message)=>{
    setFeedback(undefined);
    try{await perform(action);if(message)setFeedback({message,error:false});return true;}
    catch(e){setFeedback({message:(e as Error).message,error:true});return false;}
  };
  const shared={state,lang,run,perform};
  let content;
  if(page==="vehicles"&&id==="new")content=<VehicleEditor {...shared}/>;
  else if(page==="vehicles"&&vehicle)content=<VehicleEditor {...shared} initial={vehicle}/>;
  else if(page==="vehicles"&&id)content=<Notice error>Vehicle not found.</Notice>;
  else if(page==="vehicles")content=<FleetList {...shared}/>;
  else if(page==="bookings"&&booking&&detail==="contract")content=<Contract booking={booking} lang={lang}/>;
  else if(page==="bookings"&&booking)content=<BookingDetail key={booking.id} booking={booking} lang={lang} run={run}/>;
  else if(page==="bookings"&&id)content=<Notice error>Booking not found.</Notice>;
  else if(page==="bookings")content=<Bookings state={state} lang={lang}/>;
  else if(page==="calendar")content=<Calendar {...shared}/>;
  else if(page==="offers")content=<ScheduleEditor {...shared}/>;
  else if(page==="customers")content=<Customers state={state}/>;
  else if(page==="settings")content=<Settings state={state} run={run} hosted={hosted}/>;
  else content=<Overview state={state} lang={lang}/>;
  return <div className="admin-shell"><aside className={"sidebar "+(menu?"sidebar-open":"")}><div className="sidebar-brand"><Brand brand={brand} small/><button className="icon-btn mobile-only" aria-label="Close admin menu" onClick={()=>setMenu(false)}><X size={18}/></button></div>
    <div className="workspace-label"><span className="dot"/> {l(lang,"Rental operations","Upravljanje najema")}</div><nav aria-label="Owner navigation">{nav.map(([url,Icon,en,sl])=><Link href={url} aria-current={href===url?"page":undefined} key={url}><Icon size={18}/>{l(lang,en,sl)}</Link>)}</nav>
    <div className="sidebar-bottom"><Link href="/" className="btn quiet">View storefront <ArrowUpRight size={16}/></Link><button className="btn quiet" onClick={()=>{void signOut().catch((e:Error)=>setFeedback({message:e.message,error:true}));}}><LogOut size={16}/>{l(lang,"Sign out","Odjava")}</button></div></aside>
    <div className="admin-main"><header className="admin-top"><button className="icon-btn mobile-only" aria-label="Open admin menu" aria-expanded={menu} onClick={()=>setMenu(!menu)}><Menu size={20}/></button><span>{brand} / {l(lang,"Owner workspace","Skrbniški prostor")}</span><span className="admin-top-right"><button className="lang-btn" onClick={()=>language(lang==="en"?"sl":"en")}>{lang==="en"?"SL":"EN"}</button><span className="pill">{hosted?"Shared demo":"Browser demo"}</span></span></header>
    <main className="admin-content"><div className="admin-heading"><div><div className="eyebrow">{l(lang,"WORKSPACE","DELOVNI PROSTOR")}</div><h1>{title}</h1></div>{!page&&<Link className="btn secondary" href="/admin/vehicles/new"><Plus size={16}/>{l(lang,"Add vehicle","Dodaj vozilo")}</Link>}</div>
    {feedback&&<Notice error={feedback.error}>{feedback.message}</Notice>}{content}</main></div>
    <nav className="admin-mobile-nav" aria-label="Quick owner navigation">{nav.slice(0,3).map(([url,Icon,en,sl])=><Link key={url} href={url} aria-current={href===url?"page":undefined}><Icon size={20}/>{l(lang,en,sl)}</Link>)}<button onClick={()=>setMenu(!menu)}><Menu size={20}/>{l(lang,"More","Več")}</button></nav>
  </div>;
}
