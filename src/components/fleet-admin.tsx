"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, CarFront, ImagePlus, Plus, Search, Sparkles } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { formatDate, formatMoney, inputDate, quickInterval } from "@/lib/booking/domain";
import { blockReasons, categories, fuels, transmissions, vehicleName, type Interval, type Store, type Vehicle, type VehiclePhoto } from "@/lib/booking/types";
import { isListed, type Command } from "@/lib/demo/actions";
import { parseVehicleDescription } from "@/lib/demo/quick-entry";
import { CarCard, Field, ImageCar, l, Notice, txVehicle, type Lang, type Perform } from "./common";
import { RentalTime } from "./rental-time";
import { blockReasonName } from "./admin-copy";
import { VoiceButton } from "./voice";

export type Run = (action: Command, message?: string) => Promise<boolean>;
export type FleetProps = { state: Store; lang: Lang; run: Run; perform: Perform };
const slug = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const list = (value: string) => value.split(",").map((part) => part.trim()).filter(Boolean);
const photoCredit = (value: unknown) => value as NonNullable<Vehicle["photoCredit"]>;

function freshVehicle(): Vehicle {
  const id = crypto.randomUUID();
  return { id,slug:id,make:"",model:"",year:0,category:"Crossover",color:"",trim:"",plate:"",transmission:"Automatic",fuel:"Petrol",seats:0,doors:0,luggage:0,description:"",descriptionSl:"",features:[],rules:[],dailyRate:0,minAge:0,minLicenseYears:0,photo:"",photoSource:"illustrative",published:false,active:true };
}
function descriptionFor(v: Vehicle) {
  return {
    description: `${vehicleName(v)} (${v.year})${v.color ? " in " + v.color.toLowerCase() : ""}. Select your pickup and return times to see available rentals.`,
    descriptionSl: `${vehicleName(v)} (letnik ${v.year}). Izberite čas prevzema in vračila za prikaz razpoložljivosti.`,
  };
}
async function localImage(file: File, lang: Lang) {
  if (!["image/jpeg","image/png","image/webp"].includes(file.type)) throw Error(l(lang,"Choose a JPEG, PNG or WebP photo.","Izberite fotografijo JPEG, PNG ali WebP."));
  if (file.size > 15_000_000) throw Error(l(lang,"Choose a photo smaller than 15 MB.","Izberite fotografijo, manjšo od 15 MB."));
  const bitmap = await createImageBitmap(file).catch(() => { throw Error(l(lang,"The image could not be opened.","Fotografije ni bilo mogoče odpreti.")); });
  try {
    const scale = Math.min(1,1200/Math.max(bitmap.width,bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw Error(l(lang,"The image could not be prepared.","Fotografije ni bilo mogoče pripraviti."));
    context.drawImage(bitmap,0,0,canvas.width,canvas.height);
    return canvas.toDataURL("image/webp",.78);
  } finally {bitmap.close();}
}
export function FleetList({ state, lang, run }: FleetProps) {
  const t = (en: string, sl: string) => l(lang, en, sl);
  const [query,setQuery]=useState("");
  const [filter,setFilter]=useState("all");
  const router=useRouter();
  const rows=state.vehicles.filter((v) => (filter==="archived" ? v.archived : !v.archived && (filter!=="listed" || isListed(v)) && (filter!=="draft" || !isListed(v))) && (vehicleName(v)+" "+v.plate).toLowerCase().includes(query.toLowerCase()));
  return <>
    <div className="admin-toolbar spread"><div className="inline-actions"><label className="search-field"><Search size={16} /><input aria-label={t("Search fleet","Išči vozila")} placeholder={l(lang,"Search fleet","Išči vozila")} value={query} onChange={(e)=>setQuery(e.target.value)} /></label>
      <select aria-label={t("Fleet status","Status vozil")} value={filter} onChange={(e)=>setFilter(e.target.value)}><option value="all">{t("All vehicles","Vsa vozila")}</option><option value="listed">{t("Published","Objavljeno")}</option><option value="draft">{t("Offline / draft","Neobjavljeno / osnutek")}</option><option value="archived">{t("Archived","Arhivirano")}</option></select></div><Link className="btn primary" href="/admin/vehicles/new"><Plus size={17} />{l(lang,"Add vehicle","Dodaj vozilo")}</Link></div>
    <div className="admin-table"><table><thead><tr><th>{t("Vehicle","Vozilo")}</th><th>{t("Plate","Registrska oznaka")}</th><th>{t("Daily rate","Dnevna cena")}</th><th>{t("Status",t("Status","Status"))}</th><th>{t("Actions","Dejanja")}</th></tr></thead><tbody>{rows.map(v=><tr key={v.id}>
      <td><Link className="vehicle-cell" href={"/admin/vehicles/"+v.id}><ImageCar vehicle={v} label={false} /><span><b>{vehicleName(v)}</b><small>{v.year} · {txVehicle(v.transmission,lang)}</small></span></Link></td>
      <td data-label={t("Plate","Registrska oznaka")}>{v.plate || "—"}</td><td data-label={t("Rate","Cena")}>{formatMoney(v.dailyRate,lang)}</td><td data-label={t("Status",t("Status","Status"))}><span className={"pill "+(isListed(v) ? "solid" : "")}>{v.archived?t("Archived","Arhivirano"):isListed(v)?t("Published","Objavljeno"):v.active?t("Draft","Osnutek"):t("Out of service","Izven uporabe")}</span></td>
      <td className="row-actions"><Link className="btn quiet" href={"/admin/vehicles/"+v.id}>{t("Edit","Uredi")}</Link><button className="btn quiet" onClick={async()=>{const base=freshVehicle();if(await run({type:"vehicle",vehicle:{...v,id:base.id,slug:base.slug,plate:"",published:false,active:true,archived:false}},t("Draft duplicated.","Osnutek je podvojen.")))router.push("/admin/vehicles/"+base.id);}}>{t("Duplicate","Podvoji")}</button></td>
    </tr>)}</tbody></table>{!rows.length && <div className="empty"><CarFront /><h3>{t("No vehicles found","Ni najdenih vozil")}</h3></div>}</div>
  </>;
}

type Candidate = { src: string; credit: NonNullable<Vehicle["photoCredit"]> };
type DraftRange = { kind: "window" | "offer"; range: Interval; existing?: boolean; vehicleId?: string; dailyRate?: number };
export function VehicleEditor({ initial, state, lang, run }: FleetProps & { initial?: Vehicle }) {
  const router = useRouter();
  const t = (en: string, sl: string) => l(lang, en, sl);
  const [v, setV] = useState<Vehicle>(() => initial ?? freshVehicle());
  const [source, setSource] = useState("");
  const [draft, setDraft] = useState<DraftRange>();
  const [note, setNote] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [advanced, setAdvanced] = useState(Boolean(initial));

  function set<K extends keyof Vehicle>(key: K, value: Vehicle[K]) {
    setDirty(true);
    setV((old) => ({ ...old, [key]: value }));
  }

  function prepare(text: string) {
    setSource(text);
    const result = parseVehicleDescription(text, state.settings);
    const targets = state.vehicles.filter((car) => !car.archived && car.id !== initial?.id && result.model && car.model.toLowerCase() === result.model.toLowerCase());
    if (result.intent !== "vehicle") {
      if (!result.range || (result.intent === "offer" && !result.dailyRate)) {
        setNote(t("Add dates and a daily rate for a price offer.", "Vnesite datume in pri cenovni ponudbi tudi dnevno ceno."));
        return;
      }
      setDraft({ kind: result.intent === "offer" ? "offer" : "window", range: result.range, existing: true, vehicleId: initial?.id ?? (targets.length === 1 ? targets[0].id : undefined), dailyRate: result.dailyRate });
      setNote(t("Check the dates and save the schedule.", "Preverite datume in shranite termin."));
      return;
    }
    if (!result.make && !result.model && (!v.make || !v.model)) {
      setNote(t("Say or enter the make, model, year and daily rate.", "Povejte ali vnesite znamko, model, letnik in dnevno ceno."));
      return;
    }

    const example = initial ? undefined : result.example;
    const usePhoto = example && (!v.photo || (v.photoSource === "illustrative" && !v.photoCredit));
    const entry: Vehicle = {
      ...v,
      make: result.make ?? v.make, model: result.model ?? v.model, year: result.year ?? v.year, color: result.color ?? v.color,
      transmission: result.transmission ?? example?.transmission ?? v.transmission,
      category: example?.category ?? v.category, fuel: result.fuel ?? example?.fuel ?? v.fuel,
      seats: result.seats ?? example?.seats ?? v.seats, doors: example?.doors ?? v.doors, luggage: example?.luggage ?? v.luggage,
      dailyRate: result.dailyRate ?? v.dailyRate,
      photo: usePhoto ? "/demo/" + example.id + ".webp" : v.photo,
      photoCredit: usePhoto ? undefined : v.photoCredit,
    };
    setV(entry);
    setDirty(true);
    setDraft(result.range ? { kind: "window", range: result.range } : undefined);
    const message = targets.length
      ? t("This model is already in your fleet. Check that this is another vehicle.", "Ta model je že med vozili. Preverite, ali dodajate drugo vozilo.")
      : t("Fields filled. Check the details, then save.", "Polja so izpolnjena. Preverite podatke in shranite.");
    setNote(message);
  }

  async function lookup() {
    if (!v.make || !v.model) { setNote(t("Enter a make and model first.", "Najprej vnesite znamko in model.")); return; }
    setBusy(true); setNote(""); setCandidates([]);
    try {
      const response = await fetch("/api/photos?q=" + encodeURIComponent([v.make, v.model, v.year || "", v.color].filter(Boolean).join(" ")));
      if (!response.ok) throw Error();
      const data = await response.json();
      setCandidates(data.items);
      if (!data.items.length) setNote(t("No reusable photo matched. You can upload one.", "Ni primerne fotografije za ponovno uporabo. Lahko naložite svojo."));
    } catch {
      setNote(t("Photo suggestions are unavailable. You can upload a photo.", "Predlogi fotografij niso na voljo. Lahko naložite svojo fotografijo."));
    } finally { setBusy(false); }
  }

  async function save(publish: boolean) {
    if (!v.make.trim() || !v.model.trim() || v.year < 1900 || v.year > 2100) {
      setNote(t("Enter a make, model and valid year.", "Vnesite znamko, model in veljaven letnik."));
      return;
    }
    if (publish && (!v.dailyRate || !v.color.trim())) {
      setNote(t("Enter the color and daily rate to publish.", "Za objavo vnesite barvo in dnevno ceno."));
      return;
    }
    if (publish && !v.seats) {
      setAdvanced(true);
      setNote(t("Enter the number of seats under More details to publish.", "Za objavo v razdelku Več podatkov vnesite število sedežev."));
      return;
    }
    setSaving(true);
    const copy = descriptionFor(v);
    const next = {
      ...v, description: v.description.trim() || copy.description, descriptionSl: v.descriptionSl.trim() || copy.descriptionSl,
      published: publish, slug: initial?.slug ?? (slug(vehicleName(v)).slice(0, 65) + "-" + v.id.slice(0, 8)),
    };
    const window = draft?.kind === "window" && !draft.existing ? draft.range : undefined;
    if (await run({ type: "vehicle", vehicle: next, window }, publish ? t("Vehicle saved and published.", "Vozilo je shranjeno in objavljeno.") : t("Draft saved.", "Osnutek je shranjen."))) {
      setDirty(false);
      setV(next);
      router.push("/admin/vehicles");
    }
    setSaving(false);
  }

  function selectPhoto(image: VehiclePhoto) {
    setV((current) => {
      const previous = { photo: current.photo, photoSource: current.photoSource, photoCredit: current.photoCredit };
      const other = (current.gallery ?? []).filter((item) => item.photo !== image.photo);
      return { ...current, ...image, gallery: [...(previous.photo && previous.photo !== image.photo ? [previous] : []), ...other].slice(0, 4) };
    });
    setDirty(true);
  }

  function numberField(key: "year" | "seats" | "doors" | "luggage" | "minAge" | "minLicenseYears" | "dailyRate", label: string) {
    const price = key === "dailyRate";
    return <Field label={label}><input type="number" min={key === "year" ? 1900 : 0} max={key === "year" ? 2100 : undefined} step={price ? ".01" : "1"}
      value={v[key] === 0 ? "" : v[key] / (price ? 100 : 1)} onChange={(e) => set(key, Math.round(Number(e.target.value) * (price ? 100 : 1)))} /></Field>;
  }

  const applyToExisting = draft?.existing;
  return <>
    <section className="panel quick-entry">
      <div className="section-mini"><Sparkles size={20} /><h3>{t("Describe a car or offer", "Opišite vozilo ali ponudbo")}</h3></div>
      <form className="form-stack" onSubmit={(event) => { event.preventDefault(); prepare(source); }}>
        <Field label={t("Describe it in your own words", "Opišite s svojimi besedami")}>
          <textarea rows={2} placeholder={t("Black VW T-Cross 2023, automatic, €45 per day", "Črn VW T-Cross 2023, samodejni menjalnik, 45 € na dan")} value={source} onChange={(e) => setSource(e.target.value)} />
        </Field>
        <div className="spread quick-bottom">
          <VoiceButton lang={lang} onText={prepare} />
          <button className="btn secondary" disabled={!source.trim()}>{t("Fill fields", "Izpolni polja")}</button>
        </div>
      </form>
      {draft && <div className="form-stack draft-range">
        <h3>{draft.kind === "offer" ? t("Proposed price offer", "Predlagana cenovna ponudba") : t("Proposed availability", "Predlagana razpoložljivost")}</h3>
        <div className="trip-fields">
          <RentalTime label={t("From", "Od")} value={draft.range.pickup} onChange={(pickup) => setDraft({ ...draft, range: { ...draft.range, pickup } })} lang={lang} required={false} />
          <RentalTime label={t("Until", "Do")} value={draft.range.returnAt} onChange={(returnAt) => setDraft({ ...draft, range: { ...draft.range, returnAt } })} lang={lang} required={false} />
        </div>
        {applyToExisting && <div className="inline-actions">
          <select aria-label={t("Apply to vehicle", "Izbira vozila")} value={draft.vehicleId ?? ""} onChange={(e) => setDraft({ ...draft, vehicleId: e.target.value || undefined })}>
            <option value="">{t("Select vehicle", "Izberite vozilo")}</option>
            {state.vehicles.filter((car) => !car.archived).map((car) => <option key={car.id} value={car.id}>{vehicleName(car)} · {car.plate || car.year}</option>)}
          </select>
          {draft.kind === "offer" && <Field label={t("Daily rate (€)", "Dnevna cena (€)")}><input type="number" min="1" step=".01" value={(draft.dailyRate ?? 0) / 100} onChange={(e) => setDraft({ ...draft, dailyRate: Math.round(+e.target.value * 100) })} /></Field>}
          <button type="button" className="btn primary" disabled={!draft.vehicleId || saving} onClick={async () => {
            if (!draft.vehicleId) return;
            setSaving(true);
            const command = draft.kind === "offer" ? { type: "offer" as const, dailyRate: draft.dailyRate ?? 0 } : { type: "window" as const };
            if (await run({ ...command, vehicleId: draft.vehicleId, ...draft.range }, t("Schedule saved.", "Termin je shranjen."))) setDraft(undefined);
            setSaving(false);
          }}>{t("Save schedule", "Shrani termin")}</button>
        </div>}
        <button type="button" className="btn quiet" onClick={() => setDraft(undefined)}>{t("Remove proposed dates", "Odstrani predlagane datume")}</button>
      </div>}
    </section>

    <section className="panel form-stack">
      <h3>{t("Vehicle details", "Podatki o vozilu")}</h3>
      <div className="fields-two">
        <Field label={t("Make", "Znamka")}><input value={v.make} onChange={(e) => set("make", e.target.value)} /></Field>
        <Field label={t("Model", "Model")}><input value={v.model} onChange={(e) => set("model", e.target.value)} /></Field>
        {numberField("year", t("Model year", "Letnik"))}
        <Field label={t("Color", "Barva")}><input value={txVehicle(v.color, lang)} onChange={(e) => set("color", e.target.value)} /></Field>
        {numberField("dailyRate", t("Daily rate (€)", "Dnevna cena (€)"))}
      </div>
      {!!v.seats && <div className="vehicle-summary">
        {v.photo && <img src={v.photo} alt="" />}
        <div>
          <p>{txVehicle(v.transmission, lang)} · {txVehicle(v.fuel, lang)} · {v.seats} {t("seats", "sedežev")}</p>
          {v.photo && v.photoSource === "illustrative" && <small className="muted">{t("Illustrative image", "Simbolična fotografija")}</small>}
        </div>
      </div>}
      {note && <Notice>{note}</Notice>}
      <div className="inline-actions">
        <button className="btn primary" type="button" disabled={saving || !v.active || !!v.archived || !!applyToExisting} onClick={() => save(true)}>
          {v.published ? t("Save changes", "Shrani spremembe") : t("Save and publish", "Shrani in objavi")}
        </button>
        <button className="btn secondary" type="button" disabled={saving || !!applyToExisting} onClick={() => save(false)}>{v.published ? t("Unpublish and save draft", "Umakni objavo in shrani osnutek") : t("Save draft", "Shrani osnutek")}</button>
        <button className="btn quiet" type="button" aria-expanded={advanced} aria-controls="vehicle-more-details" onClick={() => setAdvanced(!advanced)}>{advanced ? t("Hide more details", "Skrij dodatne podatke") : t("More details", "Več podatkov")}</button>
      </div>
    </section>

    {advanced && <div className="editor-layout" id="vehicle-more-details">
      <div className="editor-body">
        <section className="panel form-stack">
          <h3>{t("Specifications", "Tehnični podatki")}</h3>
          <div className="fields-two">
            <Field label={t("Trim", "Paket opreme")}><input value={v.trim} onChange={(e) => set("trim", e.target.value)} /></Field>
            <Field label={t("Registration plate (private)", "Registrska oznaka (zasebno)")}><input value={v.plate} onChange={(e) => set("plate", e.target.value)} /></Field>
            <Field label={t("Category", "Kategorija")}><select value={v.category} onChange={(e) => set("category", e.target.value as Vehicle["category"])}>{categories.map((x) => <option key={x} value={x}>{txVehicle(x, lang)}</option>)}</select></Field>
            <Field label={t("Transmission", "Menjalnik")}><select value={v.transmission} onChange={(e) => set("transmission", e.target.value as Vehicle["transmission"])}>{transmissions.map((x) => <option key={x} value={x}>{txVehicle(x, lang)}</option>)}</select></Field>
            <Field label={t("Fuel", "Gorivo")}><select value={v.fuel} onChange={(e) => set("fuel", e.target.value as Vehicle["fuel"])}>{fuels.map((x) => <option key={x} value={x}>{txVehicle(x, lang)}</option>)}</select></Field>
            {numberField("seats", t("Seats", "Sedeži"))}{numberField("doors", t("Doors", "Vrata"))}{numberField("luggage", t("Luggage", "Prtljaga"))}
            {numberField("minAge", t("Minimum age", "Najnižja starost"))}{numberField("minLicenseYears", t("Years with licence", "Leta z vozniškim dovoljenjem"))}
          </div>
          <Field label={t("Features (comma separated)", "Oprema (ločena z vejicami)")}><input defaultValue={v.features.join(", ")} onChange={(e) => set("features", list(e.target.value))} /></Field>
          <Field label={t("Rules (comma separated)", "Pravila (ločena z vejicami)")}><input defaultValue={v.rules.join(", ")} onChange={(e) => set("rules", list(e.target.value))} /></Field>
          <Field label={t("Description · English", "Opis v angleščini")}><textarea value={v.description} onChange={(e) => set("description", e.target.value)} /></Field>
          <Field label={t("Description · Slovenian", "Opis v slovenščini")}><textarea value={v.descriptionSl} onChange={(e) => set("descriptionSl", e.target.value)} /></Field>
          <button className="btn secondary" type="button" disabled={!v.make || !v.model} onClick={() => { setV({ ...v, ...descriptionFor(v) }); setDirty(true); }}>{t("Generate description", "Ustvari opis")}</button>
          <label className="check"><input type="checkbox" checked={v.active} onChange={(e) => set("active", e.target.checked)} />{t("Vehicle in service", "Vozilo je v uporabi")}</label>
        </section>
        <section className="panel form-stack"><h3>{t("Listing photo", "Fotografija oglasa")}</h3><div className="inline-actions">
          <label className="btn secondary file-btn"><Camera size={16} />{t("Upload photo", "Naloži fotografijo")}<input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={async (e) => {
            const files = Array.from(e.target.files ?? []).slice(0, 5);
            if (!files.length) return;
            try { const images = await Promise.all(files.map((file) => localImage(file, lang))); for (const photo of images.reverse()) selectPhoto({ photo, photoSource: "owner", photoCredit: undefined }); }
            catch (error) { setNote((error as Error).message); }
          }} /></label>
          <button className="btn secondary" type="button" disabled={busy} onClick={lookup}><ImagePlus size={16} />{busy ? t("Searching…", "Iščem…") : t("Find model photo", "Poišči fotografijo modela")}</button>
        </div>
          {candidates.length > 0 && <div className="photo-options">{candidates.map((item) => <button key={item.src} type="button" onClick={() => { selectPhoto({ photo: item.src, photoSource: "illustrative", photoCredit: photoCredit(item.credit) }); setCandidates([]); }}><img src={item.src} alt={item.credit.title} /><b>{item.credit.title}</b><small>{item.credit.author} · {item.credit.license}</small></button>)}</div>}
          {!!v.gallery?.length && <div className="photo-options">{v.gallery.map((item, index) => <div key={item.photo}><button type="button" onClick={() => selectPhoto(item)}><img src={item.photo} alt={t("Vehicle photo", "Fotografija vozila") + " " + (index + 2)} /><b>{t("Set as cover", "Nastavi kot naslovno")}</b></button><button type="button" onClick={() => set("gallery", (v.gallery ?? []).filter((candidate) => candidate.photo !== item.photo))}>{t("Remove", "Odstrani")}</button></div>)}</div>}
          {v.photoCredit && <p className="muted">{v.photoCredit.author} · <a href={v.photoCredit.url} target="_blank" rel="noreferrer">{v.photoCredit.license} ↗</a></p>}
        </section>
      </div>
      <aside className="editor-preview">
        <div className="spread"><h3>{t("Listing preview", "Predogled oglasa")}</h3><span className="pill">{v.published ? t("Published", "Objavljeno") : t("Draft", "Osnutek")}</span></div>
        <CarCard vehicle={{ ...v, make: v.make || t("Vehicle", "Vozilo"), model: v.model || t("draft", "osnutek") }} lang={lang} href="#vehicle-more-details" />
        {initial && <button className="btn quiet" type="button" onClick={async () => {
          if (await run({ type: "vehicle", vehicle: { ...v, published: false, archived: !v.archived } }, v.archived ? t("Vehicle restored.", "Vozilo je obnovljeno.") : t("Vehicle archived.", "Vozilo je arhivirano."))) router.push("/admin/vehicles");
        }}>{v.archived ? t("Restore", "Obnovi") : t("Archive vehicle", "Arhiviraj vozilo")}</button>}
      </aside>
    </div>}
    <button type="button" className="btn quiet editor-back" onClick={() => { if (!dirty || window.confirm(t("Discard unsaved vehicle changes?", "Zavržete neshranjene spremembe vozila?"))) router.push("/admin/vehicles"); }}>{t("Back to fleet", "Nazaj na vozila")}</button>
  </>;
}
export function ScheduleEditor({state,run,lang,blocks=false}:FleetProps & {blocks?:boolean}) {
  const t = (en: string, sl: string) => l(lang, en, sl);
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
    await run(command,t("Schedule saved.","Termin je shranjen."));
    setBusy(false);
  }
  const entry=(item:{id:string;vehicleId:string;pickup:string;returnAt:string},collection:"blocks"|"windows"|"offers",label:ReactNode)=><div className="schedule-row spread" key={item.id}><div><b>{state.vehicles.find((v)=>v.id===item.vehicleId) ? vehicleName(state.vehicles.find((v)=>v.id===item.vehicleId)!) : item.vehicleId}</b><p>{label} · {formatDate(item.pickup,lang)} – {formatDate(item.returnAt,lang)}</p></div><div className="inline-actions"><button className="btn quiet" onClick={()=>{setVehicle(item.vehicleId);setRange({pickup:inputDate(item.pickup),returnAt:inputDate(item.returnAt)});}}>{t("Use dates","Uporabi datume")}</button><button className="btn secondary" onClick={()=>run({type:"remove",id:item.id,collection},t("Schedule removed.","Termin je odstranjen."))}>{t("Remove","Odstrani")}</button></div></div>;
  return <div className="schedule-layout"><form className="panel form-stack" onSubmit={change}><h3>{blocks?t("Block a vehicle","Blokiraj vozilo"):t("Add a schedule","Dodaj termin")}</h3>
    <Field label={t("Vehicle","Vozilo")}><select value={vehicleId} onChange={(e)=>setVehicle(e.target.value)}>{state.vehicles.filter((v)=>!v.archived).map((v)=><option value={v.id} key={v.id}>{vehicleName(v)}</option>)}</select></Field>
    {!blocks&&<Field label={t("Schedule type","Vrsta termina")}><select value={mode} onChange={(e)=>setMode(e.target.value as "offer"|"window")}><option value="offer">{t("Temporary daily rate","Začasna dnevna cena")}</option><option value="window">{t("Bookable window","Obdobje za najem")}</option></select></Field>}
    <div className="trip-fields">
      <RentalTime label={l(lang,"From","Od")} value={range.pickup} onChange={(pickup)=>setRange({...range,pickup})} lang={lang} />
      <RentalTime label={l(lang,"Until","Do")} value={range.returnAt} onChange={(returnAt)=>setRange({...range,returnAt})} lang={lang} />
    </div>
    {mode==="offer"&&<Field label={t("Daily rate (€)","Dnevna cena (€)")}><input type="number" min="1" step=".01" value={rate} onChange={(e)=>setRate(+e.target.value)}/></Field>}
    {mode==="block"&&<><Field label={t("Reason","Razlog")}><select value={reason} onChange={(e)=>setReason(e.target.value as typeof blockReasons[number])}>{blockReasons.map((x)=><option key={x} value={x}>{blockReasonName(x,lang)}</option>)}</select></Field><Field label={t("Internal note","Interna opomba")}><input value={note} onChange={(e)=>setNote(e.target.value)}/></Field></>}
    {mode==="window"&&<p className="muted">{t("After adding a bookable window, requests must fit inside one of the vehicle’s windows.","Po dodajanju obdobja morajo biti povpraševanja znotraj enega od obdobij najema.")}</p>}
    <button className="btn primary" disabled={busy||!vehicleId}>{t("Save schedule","Shrani termin")}</button>
  </form><section className="panel form-stack"><h3>{blocks?t("Scheduled blocks","Načrtovane blokade"):t("Current schedules","Trenutni termini")}</h3>{blocks?state.blocks.map((x)=>entry(x,"blocks",blockReasonName(x.reason,lang))):<>{state.offers.map((x)=>entry(x,"offers",formatMoney(x.dailyRate,lang)+t(" per day"," na dan")+(Date.parse(x.returnAt)<openedAt?t(" · Expired"," · Poteklo"):"")))}{state.windows.map((x)=>entry(x,"windows",t("Bookable window","Obdobje za najem")+(Date.parse(x.returnAt)<openedAt?t(" · Ended"," · Končano"):"")))}</>}
    {!(blocks?state.blocks.length:state.offers.length+state.windows.length)&&<p className="muted">{t("No schedules yet.","Terminov še ni.")}</p>}</section></div>;
}
