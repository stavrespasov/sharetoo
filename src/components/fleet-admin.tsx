"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, CarFront, ImagePlus, Plus, Search, Sparkles } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { formatDate, formatMoney, inputDate, quickInterval } from "@/lib/booking/domain";
import { blockReasons, categories, fuels, transmissions, vehicleName, type Interval, type Store, type Vehicle } from "@/lib/booking/types";
import { isListed, type Command } from "@/lib/demo/actions";
import { parseVehicleDescription } from "@/lib/demo/quick-entry";
import { CarCard, Field, ImageCar, l, Notice, type Lang, type Perform } from "./common";
import { VoiceButton } from "./voice";

export type Run = (action: Command, message?: string) => Promise<boolean>;
export type FleetProps = { state: Store; lang: Lang; run: Run; perform: Perform };
const slug = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const list = (value: string) => value.split(",").map((part) => part.trim()).filter(Boolean);
const photoCredit = (value: unknown) => value as NonNullable<Vehicle["photoCredit"]>;

function freshVehicle(): Vehicle {
  const id = crypto.randomUUID();
  return { id,slug:id,make:"",model:"",year:new Date().getFullYear(),category:"Crossover",color:"",trim:"",plate:"",transmission:"Automatic",fuel:"Petrol",seats:0,doors:0,luggage:0,description:"",descriptionSl:"",features:[],rules:[],dailyRate:0,deposit:0,minAge:0,minLicenseYears:0,photo:"",photoSource:"illustrative",published:false,active:true };
}
function descriptionFor(v: Vehicle) {
  return {
    description: `${vehicleName(v)} (${v.year})${v.color ? " in " + v.color.toLowerCase() : ""}. Select your pickup and return times to see available rentals.`,
    descriptionSl: `${vehicleName(v)} (letnik ${v.year}). Izberite čas prevzema in vračila za prikaz razpoložljivosti.`,
  };
}
async function localImage(file: File) {
  if (!["image/jpeg","image/png","image/webp"].includes(file.type)) throw Error("Choose a JPEG, PNG or WebP photo.");
  if (file.size > 15_000_000) throw Error("Choose a photo smaller than 15 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1,1200/Math.max(bitmap.width,bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw Error("The image could not be prepared.");
    context.drawImage(bitmap,0,0,canvas.width,canvas.height);
    return canvas.toDataURL("image/webp",.78);
  } finally {bitmap.close();}
}
export function FleetList({ state, lang, run }: FleetProps) {
  const [query,setQuery]=useState("");
  const [filter,setFilter]=useState("all");
  const router=useRouter();
  const rows=state.vehicles.filter((v) => (filter==="archived" ? v.archived : !v.archived && (filter!=="listed" || isListed(v)) && (filter!=="draft" || !isListed(v))) && (vehicleName(v)+" "+v.plate).toLowerCase().includes(query.toLowerCase()));
  return <>
    <div className="admin-toolbar spread"><div className="inline-actions"><label className="search-field"><Search size={16} /><input aria-label="Search fleet" placeholder={l(lang,"Search fleet","Išči vozila")} value={query} onChange={(e)=>setQuery(e.target.value)} /></label>
      <select aria-label="Fleet status" value={filter} onChange={(e)=>setFilter(e.target.value)}><option value="all">All vehicles</option><option value="listed">Published</option><option value="draft">Offline / draft</option><option value="archived">Archived</option></select></div><Link className="btn primary" href="/admin/vehicles/new"><Plus size={17} />{l(lang,"Add vehicle","Dodaj vozilo")}</Link></div>
    <div className="admin-table"><table><thead><tr><th>Vehicle</th><th>Plate</th><th>Daily rate</th><th>Status</th><th>Actions</th></tr></thead><tbody>{rows.map(v=><tr key={v.id}>
      <td><Link className="vehicle-cell" href={"/admin/vehicles/"+v.id}><ImageCar vehicle={v} label={false} /><span><b>{vehicleName(v)}</b><small>{v.year} · {v.transmission}</small></span></Link></td>
      <td data-label="Plate">{v.plate || "—"}</td><td data-label="Rate">{formatMoney(v.dailyRate,lang)}</td><td data-label="Status"><span className={"pill "+(isListed(v) ? "solid" : "")}>{v.archived?"Archived":isListed(v)?"Published":v.active?"Draft":"Out of service"}</span></td>
      <td className="row-actions"><Link className="btn quiet" href={"/admin/vehicles/"+v.id}>Edit</Link><button className="btn quiet" onClick={async()=>{const base=freshVehicle();if(await run({type:"vehicle",vehicle:{...v,id:base.id,slug:base.slug,plate:"",published:false,active:true,archived:false}},"Draft duplicated."))router.push("/admin/vehicles/"+base.id);}}>Duplicate</button></td>
    </tr>)}</tbody></table>{!rows.length && <div className="empty"><CarFront /><h3>No vehicles found</h3></div>}</div>
  </>;
}

type Candidate = { src: string; credit: NonNullable<Vehicle["photoCredit"]> };
type DraftRange = { kind: "window" | "offer"; range: Interval; vehicleId?: string; dailyRate?: number };
export function VehicleEditor({ initial, state, lang, run }: FleetProps & { initial?: Vehicle }) {
  const router=useRouter();
  const [v,setV]=useState<Vehicle>(()=>initial ?? freshVehicle());
  const [source,setSource]=useState("");
  const [draft,setDraft]=useState<DraftRange>();
  const [note,setNote]=useState("");
  const [candidates,setCandidates]=useState<Candidate[]>([]);
  const [busy,setBusy]=useState(false);
  const [saving,setSaving]=useState(false);
  const [dirty,setDirty]=useState(false);
  const [untouched,setUntouched]=useState<string[]>([]);
  function set<K extends keyof Vehicle>(key:K,value:Vehicle[K]) {setDirty(true);setV((old)=>({...old,[key]:value}));setUntouched((old)=>old.filter((name)=>name!==key));}
  function describe(event: FormEvent) {
    event.preventDefault();
    const result=parseVehicleDescription(source,state.settings);
    const targets=state.vehicles.filter((car)=>!car.archived && result.model && car.model.toLowerCase()===result.model.toLowerCase());
    if (result.intent !== "vehicle") {
      if (!result.range || (result.intent==="offer" && !result.dailyRate)) {setNote("Add an exact date range and, for an offer, a daily rate.");return;}
      setDraft({kind:result.intent==="offer" ? "offer" : "window",range:result.range,vehicleId:targets.length===1 ? targets[0].id : initial?.id,dailyRate:result.dailyRate});
      setNote("Review the date range and select the vehicle to apply the change.");return;
    }
    const entry:Vehicle={...v,make:result.make ?? v.make,model:result.model ?? v.model,color:result.color ?? v.color,year:result.year ?? v.year,
      transmission:result.transmission ?? result.example?.transmission ?? v.transmission,category:result.example?.category ?? v.category,
      fuel:result.example?.fuel ?? v.fuel,seats:result.example?.seats ?? v.seats, doors:result.example?.doors ?? v.doors,luggage:result.example?.luggage ?? v.luggage,
      dailyRate:result.dailyRate ?? v.dailyRate,deposit:result.deposit ?? v.deposit,
      photo:result.example ? "/demo/"+result.example.id+".webp" : v.photo,photoSource:result.example ? "illustrative" : v.photoSource,
      photoCredit:result.example ? undefined : v.photoCredit };
    if (!entry.make || !entry.model) {setNote("Enter a make and model, or fill in the form below.");return;}
    setV({...entry,...descriptionFor(entry)});setDirty(true);
    const suggested = [!result.year && "year",!result.transmission && "transmission","fuel","seats","doors","luggage",!result.deposit && "deposit"].filter(Boolean) as string[];
    setUntouched(suggested);
    setDraft(result.range ? {kind:"window",range:result.range} : undefined);
    setNote((targets.length ? "Similar vehicle already exists. Review before creating another. " : "") + (result.range ? "Review the availability dates and suggested specifications." : "Review the suggested specifications. Set dates below if needed."));
  }
  async function lookup() {
    if (!v.make || !v.model) {setNote("Enter a make and model first.");return;}
    setBusy(true);setNote("");setCandidates([]);
    try {
      const response=await fetch("/api/photos?q="+encodeURIComponent([v.make,v.model,v.year,v.color].filter(Boolean).join(" ")));
      const data=await response.json();
      if(!response.ok) throw Error(data.error);
      setCandidates(data.items);
      if(!data.items.length) setNote("No reusable photo matched. Choose an upload or keep the illustrative image.");
    } catch(e) {setNote((e as Error).message);}
    finally {setBusy(false);}
  }
  async function save(publish:boolean) {
    if (!v.make || !v.model) {setNote("Enter make and model.");return;}
    if (publish && untouched.length) {setNote("Review and confirm the suggested specifications before publishing.");return;}
    setSaving(true);
    const next={...v,published:publish,slug:initial?.slug ?? (slug(vehicleName(v)).slice(0,65)+"-"+v.id.slice(0,8))};
    if(await run({type:"vehicle",vehicle:next,window:draft && !draft.vehicleId && draft.kind==="window"?draft.range:undefined},publish?"Vehicle published.":"Vehicle draft saved.")){
      setDirty(false);setV(next);router.push("/admin/vehicles");
    }
    setSaving(false);
  }
  const numberField=(key:"year"|"seats"|"doors"|"luggage"|"minAge"|"minLicenseYears"|"dailyRate"|"deposit",label:string,price=false)=><Field label={label+(untouched.includes(key)?" · review":"")}><input type="number" min={key==="year"?1900:0} step={price?".01":"1"} value={price?v[key]/100:v[key]} onChange={(e)=>set(key,Math.round(Number(e.target.value)*(price?100:1)))} /></Field>;
  return <>
    <section className="panel quick-entry"><div className="section-mini"><Sparkles size={20} /><h3>{l(lang,"Describe a car or offer","Opišite vozilo ali ponudbo")}</h3></div>
      <form className="form-stack" onSubmit={describe}><Field label={l(lang,"Describe it in your own words","Opišite s svojimi besedami")}><textarea rows={2} placeholder="Black VW T-Cross 2023, automatic, €45 per day, €200 deposit, Friday to Monday" value={source} onChange={(e)=>setSource(e.target.value)} /></Field>
        <div className="spread quick-bottom"><VoiceButton lang={lang} onText={setSource} /><button className="btn primary" disabled={!source.trim()}>{l(lang,"Build draft","Pripravi osnutek")}</button></div>
      </form>{note && <Notice>{note}</Notice>}
      {draft && <div className="form-stack draft-range"><h3>{draft.kind==="offer"?"Proposed price offer":"Proposed availability window"}</h3>
        <div className="fields-two"><Field label="From"><input type="datetime-local" value={draft.range.pickup} onChange={(e)=>setDraft({...draft,range:{...draft.range,pickup:e.target.value}})} /></Field><Field label="Until"><input type="datetime-local" value={draft.range.returnAt} onChange={(e)=>setDraft({...draft,range:{...draft.range,returnAt:e.target.value}})} /></Field></div>
        {(draft.kind==="offer" || draft.vehicleId || /\b(set|update|nastavi|spremeni)\b/i.test(source)) && <div className="inline-actions"><select aria-label="Apply to vehicle" value={draft.vehicleId ?? ""} onChange={(e)=>setDraft({...draft,vehicleId:e.target.value || undefined})}><option value="">Select vehicle</option>{state.vehicles.filter((car)=>!car.archived).map((car)=><option key={car.id} value={car.id}>{vehicleName(car)} · {car.plate || car.year}</option>)}</select>
          {draft.kind==="offer" && <Field label="Daily rate (€)"><input type="number" min="1" value={(draft.dailyRate ?? 0)/100} onChange={(e)=>setDraft({...draft,dailyRate:Math.round(+e.target.value*100)})} /></Field>}
          <button type="button" className="btn primary" disabled={!draft.vehicleId} onClick={async()=>{if(!draft.vehicleId)return;const command=draft.kind==="offer"?{type:"offer" as const,dailyRate:draft.dailyRate ?? 0}:{type:"window" as const};if(await run({...command,vehicleId:draft.vehicleId,...draft.range},"Schedule saved."))setDraft(undefined);}}>Apply schedule</button></div>}
        <button type="button" className="btn quiet" onClick={()=>setDraft(undefined)}>Remove proposed dates</button>
      </div>}
    </section>
    <div className="editor-layout">
      <div className="editor-body">
        <section className="panel form-stack"><h3>{l(lang,"Vehicle details","Podatki o vozilu")}</h3>
          <div className="fields-two"><Field label="Make"><input value={v.make} onChange={(e)=>set("make",e.target.value)} /></Field><Field label="Model"><input value={v.model} onChange={(e)=>set("model",e.target.value)} /></Field></div>
          <div className="fields-two">{numberField("year","Model year")}<Field label="Color"><input value={v.color} onChange={(e)=>set("color",e.target.value)} /></Field><Field label="Trim"><input value={v.trim} onChange={(e)=>set("trim",e.target.value)} /></Field><Field label="Registration plate (private)"><input value={v.plate} onChange={(e)=>set("plate",e.target.value)} /></Field></div>
          <div className="fields-two"><Field label="Category"><select value={v.category} onChange={(e)=>set("category",e.target.value as Vehicle["category"])}>{categories.map((x)=><option key={x}>{x}</option>)}</select></Field>
            <Field label={"Transmission"+(untouched.includes("transmission")?" · review":"")}><select value={v.transmission} onChange={(e)=>set("transmission",e.target.value as Vehicle["transmission"])}>{transmissions.map((x)=><option key={x}>{x}</option>)}</select></Field>
            <Field label={"Fuel"+(untouched.includes("fuel")?" · review":"")}><select value={v.fuel} onChange={(e)=>set("fuel",e.target.value as Vehicle["fuel"])}>{fuels.map((x)=><option key={x}>{x}</option>)}</select></Field>{numberField("seats","Seats")}{numberField("doors","Doors")}{numberField("luggage","Luggage")}</div>
          <div className="fields-two"><Field label="Features (comma separated)"><input defaultValue={v.features.join(", ")} onChange={(e)=>set("features",list(e.target.value))} /></Field><Field label="Rules (comma separated)"><input defaultValue={v.rules.join(", ")} onChange={(e)=>set("rules",list(e.target.value))} /></Field></div>
          <Field label="Description · English"><textarea value={v.description} onChange={(e)=>set("description",e.target.value)} /></Field><Field label="Description · Slovenian"><textarea value={v.descriptionSl} onChange={(e)=>set("descriptionSl",e.target.value)} /></Field>
          <button className="btn secondary" type="button" disabled={!v.make || !v.model} onClick={()=>{setV({...v,...descriptionFor(v)});setDirty(true);}}>Write from vehicle details</button>
        </section>
        <section className="panel form-stack"><h3>Pricing and requirements</h3><div className="fields-two">{numberField("dailyRate","Daily rate (€)",true)}{numberField("deposit","Refundable deposit (€)",true)}{numberField("minAge","Minimum age")}{numberField("minLicenseYears","Years with licence")}</div>
          <label className="check"><input type="checkbox" checked={v.active} onChange={(e)=>set("active",e.target.checked)} /> Vehicle in service</label>
          {untouched.length > 0 && <button className="btn secondary" type="button" onClick={()=>setUntouched([])}>Confirm reviewed specifications</button>}
        </section>
        <section className="panel form-stack"><h3>Listing photo</h3><div className="inline-actions"><label className="btn secondary file-btn"><Camera size={16} /> Upload photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={async (e)=>{const file=e.target.files?.[0];if(!file)return;try{const image=await localImage(file);setV((prev)=>({...prev,photo:image,photoSource:"owner",photoCredit:undefined}));setDirty(true);}catch(error){setNote((error as Error).message);}}} /></label><button className="btn secondary" type="button" disabled={busy} onClick={lookup}><ImagePlus size={16} /> {busy?"Searching…":"Find model photo"}</button></div>
          {candidates.length > 0 && <div className="photo-options">{candidates.map((item)=><button key={item.src} type="button" onClick={()=>{setV({...v,photo:item.src,photoSource:"illustrative",photoCredit:photoCredit(item.credit)});setDirty(true);setCandidates([]);}}><img src={item.src} alt={item.credit.title} /><b>{item.credit.author}</b><small>{item.credit.license}</small></button>)}</div>}
          {v.photoCredit && <p className="muted">{v.photoCredit.author} · <a href={v.photoCredit.url} target="_blank" rel="noreferrer">{v.photoCredit.license} ↗</a></p>}
        </section>
      </div>
      <aside className="editor-preview"><div className="spread"><h3>Listing preview</h3><span className="pill">{v.published?"Published":"Draft"}</span></div>
        <CarCard vehicle={{...v, make:v.make || "Vehicle", model:v.model || "draft"}} lang={lang} href="#details" />
        <button className="btn primary full" type="button" disabled={saving || !v.active || !!v.archived} onClick={()=>save(true)}>Publish vehicle</button>
        <button className="btn secondary full" type="button" disabled={saving} onClick={()=>save(false)}>{v.published?"Unpublish and save draft":"Save draft"}</button>
        {initial && <button className="btn quiet" type="button" onClick={async()=>{if(await run({type:"vehicle",vehicle:{...v,published:false,archived:!v.archived}},v.archived?"Vehicle restored.":"Vehicle archived."))router.push("/admin/vehicles");}}>{v.archived?"Restore":"Archive vehicle"}</button>}
        <button type="button" className="btn quiet" onClick={()=>{if(!dirty||window.confirm("Discard unsaved vehicle changes?"))router.push("/admin/vehicles");}}>Back to fleet</button>
      </aside>
    </div>
  </>;
}
export function ScheduleEditor({state,run,lang,blocks=false}:FleetProps & {blocks?:boolean}) {
  const [vehicleId,setVehicle]=useState(state.vehicles.find((v)=>!v.archived)?.id ?? "");
  const [range,setRange]=useState(()=>quickInterval("weekend",state.settings));
  const [mode,setMode]=useState<"offer"|"window"|"block">(blocks?"block":"offer");
  const [rate,setRate]=useState(35);
  const [openedAt]=useState(Date.now);
  const [reason,setReason]=useState<typeof blockReasons[number]>("Maintenance");
  const [note,setNote]=useState("");
  const [busy,setBusy]=useState(false);
  async function change(e:FormEvent) {
    e.preventDefault();setBusy(true);
    const values={vehicleId,...range};
    const command:Command=mode==="offer"?{type:mode,...values,dailyRate:Math.round(rate*100)}:mode==="window"?{type:mode,...values}:{type:mode,...values,reason,note};
    await run(command,"Schedule saved.");
    setBusy(false);
  }
  const entry=(item:{id:string;vehicleId:string;pickup:string;returnAt:string},collection:"blocks"|"windows"|"offers",label:ReactNode)=><div className="schedule-row spread" key={item.id}><div><b>{state.vehicles.find((v)=>v.id===item.vehicleId) ? vehicleName(state.vehicles.find((v)=>v.id===item.vehicleId)!) : item.vehicleId}</b><p>{label} · {formatDate(item.pickup,lang)} – {formatDate(item.returnAt,lang)}</p></div><div className="inline-actions"><button className="btn quiet" onClick={()=>{setVehicle(item.vehicleId);setRange({pickup:inputDate(item.pickup),returnAt:inputDate(item.returnAt)});}}>Use dates</button><button className="btn secondary" onClick={()=>run({type:"remove",id:item.id,collection},"Schedule removed.")}>Remove</button></div></div>;
  return <div className="schedule-layout"><form className="panel form-stack" onSubmit={change}><h3>{blocks?"Block a vehicle":"Add a schedule"}</h3>
    <Field label="Vehicle"><select value={vehicleId} onChange={(e)=>setVehicle(e.target.value)}>{state.vehicles.filter((v)=>!v.archived).map((v)=><option value={v.id} key={v.id}>{vehicleName(v)}</option>)}</select></Field>
    {!blocks&&<Field label="Schedule type"><select value={mode} onChange={(e)=>setMode(e.target.value as "offer"|"window")}><option value="offer">Temporary daily rate</option><option value="window">Bookable window</option></select></Field>}
    <div className="fields-two"><Field label="From"><input type="datetime-local" required value={range.pickup} onChange={(e)=>setRange({...range,pickup:e.target.value})}/></Field><Field label="Until"><input type="datetime-local" required value={range.returnAt} onChange={(e)=>setRange({...range,returnAt:e.target.value})}/></Field></div>
    {mode==="offer"&&<Field label="Daily rate (€)"><input type="number" min="1" step=".01" value={rate} onChange={(e)=>setRate(+e.target.value)}/></Field>}
    {mode==="block"&&<><Field label="Reason"><select value={reason} onChange={(e)=>setReason(e.target.value as typeof blockReasons[number])}>{blockReasons.map((x)=><option key={x}>{x}</option>)}</select></Field><Field label="Internal note"><input value={note} onChange={(e)=>setNote(e.target.value)}/></Field></>}
    {mode==="window"&&<p className="muted">After adding a bookable window, requests must fit inside one of the vehicle’s windows.</p>}
    <button className="btn primary" disabled={busy||!vehicleId}>Save schedule</button>
  </form><section className="panel form-stack"><h3>{blocks?"Scheduled blocks":"Current schedules"}</h3>{blocks?state.blocks.map((x)=>entry(x,"blocks",x.reason)):<>{state.offers.map((x)=>entry(x,"offers",formatMoney(x.dailyRate,lang)+" per day"+(Date.parse(x.returnAt)<openedAt?" · Expired":"")))}{state.windows.map((x)=>entry(x,"windows","Bookable window"+(Date.parse(x.returnAt)<openedAt?" · Ended":"")))}</>}
    {!(blocks?state.blocks.length:state.offers.length+state.windows.length)&&<p className="muted">No schedules yet.</p>}</section></div>;
}
