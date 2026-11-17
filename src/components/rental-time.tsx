"use client";

import { CalendarDays, Clock3 } from "lucide-react";
import { l, type Lang } from "./common";

const dateFormat = {
  sl: new Intl.DateTimeFormat("sl-SI", { day: "numeric", month: "numeric", year: "numeric", timeZone: "UTC" }),
  en: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }),
};

function displayDate(value: string, lang: Lang) {
  const date = new Date(value + "T12:00:00Z");
  return Number.isFinite(+date) ? dateFormat[lang].format(date) : l(lang, "Choose date", "Izberite datum");
}

export function RentalTime({ label, value, onChange, lang, required = true }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  lang: Lang;
  required?: boolean;
}) {
  const [date = "", time = ""] = value.split("T");
  return <fieldset className="rental-time">
    <legend>{label}</legend>
    <div className="rental-time-controls">
      <label className="rental-time-part">
        <CalendarDays size={16} aria-hidden="true" />
        <span aria-hidden="true">{displayDate(date, lang)}</span>
        <input type="date" aria-label={label + " · " + l(lang, "Date", "Datum")} lang={lang} required={required}
          value={date} onChange={(event) => onChange(event.target.value + "T" + time)} />
      </label>
      <label className="rental-time-part">
        <Clock3 size={16} aria-hidden="true" />
        <span aria-hidden="true">{time || l(lang, "Time", "Ura")}</span>
        <input type="time" aria-label={label + " · " + l(lang, "Time", "Ura")} lang={lang} required={required}
          value={time} onChange={(event) => onChange(date + "T" + event.target.value)} />
      </label>
    </div>
  </fieldset>;
}
