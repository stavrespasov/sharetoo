import { DateTime } from "luxon";
import { inputDate, zone } from "../booking/domain";
import { catalog } from "./seed";
import type { Interval, Settings } from "../booking/types";

const models = [
  [/\b(?:vw|volkswagen)?\s*t[ -]?cross\b/i, catalog[0]],
  [/\b(?:bmw\s*)?(?:4 series|serija 4|420[di]|430[di])\b/i, catalog[1]],
  [/\b(?:vw|volkswagen)?\s*golf\b/i, catalog[2]],
] as const;
const colors = [
  [/\b(?:black|črn[ao]?)\b/i,"Black"],[/\b(?:white|bel[ao]?)\b/i,"White"],
  [/\b(?:gray|grey|siv[ao]?)\b/i,"Gray"],[/\b(?:silver|srebrn[ao]?)\b/i,"Silver"],
  [/\b(?:blue|mod[er][ra]{0,2})\b/i,"Blue"],[/\b(?:red|rdeč[ao]?)\b/i,"Red"],
] as const;
const weekdays = [
  /\b(?:monday|ponedeljek|ponedeljka)\b/i, /\b(?:tuesday|torek)\b/i, /\b(?:wednesday|sreda|srede)\b/i,
  /\b(?:thursday|četrtek)\b/i, /\b(?:friday|petek|petka)\b/i, /\b(?:saturday|sobota|sobote)\b/i, /\b(?:sunday|nedelj[aeo])\b/i,
];
const euros = "(?:€\\s*)?(\\d+(?:[.,]\\d{1,2})?)\\s*(?:€|(?:eur(?:os?|ov)?|evr(?:o|ov|a)?))?";
const daily = new RegExp(euros + "\\s*(?:per day|a day|/\\s*day|na dan|dnevno)", "i");
const toCents = (value?: string) => value ? Math.round(Number(value.replace(",", ".")) * 100) : undefined;
const wordDay = (value: string) => weekdays.findIndex((pattern) => pattern.test(value)) + 1;

export function commandDates(source: string, settings: Settings, now: DateTime = DateTime.now()): Interval | undefined {
  const today = now.setZone(zone).startOf("day");
  const explicit = [...source.matchAll(/\b(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/g)];
  if (explicit.length >= 2) return { pickup: explicit[0][1]+"T"+(explicit[0][2] ?? settings.open), returnAt: explicit[1][1]+"T"+(explicit[1][2] ?? settings.close) };
  const weekdaysRange = source.match(/(?:from|od)\s+(.+?)\s+(?:to|through|until|do)\s+([^,.]+)/i) ?? source.match(/(?:^|[,;])\s*([^,;]+?)\s+(?:to|through|until|do)\s+([^,.]+)/i);
  let start = today;
  let end = today;
  let open = settings.open;
  if (weekdaysRange) {
    const a = wordDay(weekdaysRange[1]);
    const b = wordDay(weekdaysRange[2]);
    if (!a || !b) return undefined;
    start = today.plus({days: (a - today.weekday + 7) % 7});
    end = start.plus({days: (b - a + 7) % 7});
  } else if (/weekend|vikend/i.test(source)) {
    start = today.plus({days: (5 - today.weekday + 7) % 7});
    end = start.plus({days: 3});
  } else if (/this week|ta teden/i.test(source)) {
    end = today.plus({days: 7 - today.weekday});
  } else if (/tomorrow|jutri/i.test(source)) {
    start = end = today.plus({days: 1});
  } else if (!/\btoday\b|danes/i.test(source)) return undefined;
  if (+start === +today) {
    const earliest = now.setZone(zone).plus({ minutes:settings.minNotice + 1 }).startOf("minute");
    open = earliest.toFormat("HH:mm") > settings.open ? earliest.toFormat("HH:mm") : settings.open;
  }
  if (start.equals(end) && open >= settings.close) return undefined;
  return { pickup: start.toISODate() + "T" + open, returnAt: end.toISODate() + "T" + settings.close };
}
export function parseVehicleDescription(source: string, settings: Settings, now?: DateTime) {
  const example = models.find(([pattern]) => pattern.test(source))?.[1];
  const makeModel = source.match(/\b(Volkswagen|VW|BMW|Audi|Toyota|Škoda|Skoda|Renault|Ford|Hyundai|Kia|Peugeot|Opel|Mercedes(?:-Benz)?|Seat|Fiat|Dacia|Tesla)\s+([\w-]+(?:\s+[\w-]+)?)/i);
  const make = example?.make ?? (makeModel?.[1].toLowerCase() === "vw" ? "Volkswagen" : makeModel?.[1]);
  const model = example?.model ?? makeModel?.[2].replace(/\s+(?:19|20)\d{2}$/, "");
  const dayRate = source.match(daily)?.[1];
  const color = colors.find(([pattern]) => pattern.test(source))?.[1];
  return {
    example, make, model, color, year: Number(source.match(/\b(?:19|20)\d{2}\b/)?.[0]) || undefined,
    transmission: /automatic|avtomat|samodej/i.test(source) ? "Automatic" as const : /manual|ročn/i.test(source) ? "Manual" as const : undefined,
    dailyRate: toCents(dayRate),
    range: commandDates(source,settings,now), intent: /\b(?:offer|ponud)\w*/i.test(source) ? "offer" : /\b(?:set|update|nastavi|spremeni)\b/i.test(source) ? "update" : "vehicle",
  } as const;
}
export const suggestionDateLabel = (range: Interval) => inputDate(range.pickup).replace("T"," ") + " → " + inputDate(range.returnAt).replace("T"," ");
