import { DateTime } from "luxon";
import type { Block, Booking, Interval, Quote, Settings, Status, Vehicle } from "./types";

export const zone = "Europe/Ljubljana";
export const hour = 3_600_000;
export const day = 24 * hour;
export const handoverHours = { open: "08:00", close: "16:00" } as const;
export const allocated = new Set<Status>(["CONFIRMED", "PICKED_UP", "RETURNED"]);
export const transitions: Record<Status, Status[]> = {
  REQUESTED: ["CONFIRMED", "REJECTED", "CANCELLED"],
  CONFIRMED: ["PICKED_UP", "CANCELLED"], PICKED_UP: ["RETURNED"],
  RETURNED: [], REJECTED: [], CANCELLED: [],
};
export type Quick = "today" | "weekend" | "week";

export class DomainError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}

export function localDate(value: string) {
  const date = DateTime.fromISO(value, { zone });
  if (date.toFormat("yyyy-MM-dd'T'HH:mm") !== value) {
    return DateTime.invalid("invalid local time");
  }
  if (date.getPossibleOffsets().length > 1) return DateTime.invalid("ambiguous local time");
  return date;
}

export function inputDate(value: string | DateTime) {
  return (typeof value === "string" ? DateTime.fromISO(value, { zone }) : value.setZone(zone))
    .toFormat("yyyy-MM-dd'T'HH:mm");
}

export function toInterval(pickup: string, returnAt: string): Interval {
  const start = localDate(pickup);
  const end = localDate(returnAt);
  if (!start.isValid || !end.isValid || end <= start) {
    throw new DomainError("dates", "Choose valid local times and a return after pickup.");
  }
  return { pickup: start.toUTC().toISO()!, returnAt: end.toUTC().toISO()! };
}

function minutes(value: string) {
  const [hours, mins] = value.split(":").map(Number);
  return hours * 60 + mins;
}
const localMinutes = (value: DateTime) => value.hour * 60 + value.minute;
const isWeekday = (date: DateTime) => date.weekday <= 5;

export function validateWindow(interval: Interval, settings: Settings, now = Date.now()) {
  const start = DateTime.fromISO(interval.pickup, { zone });
  const end = DateTime.fromISO(interval.returnAt, { zone });
  if (!start.isValid || !end.isValid || end <= start) throw new DomainError("dates", "Choose a return time after pickup.");
  if (+start < now + settings.minNotice * 60_000) {
    throw new DomainError("notice", `Choose a pickup at least ${settings.minNotice} minutes from now.`);
  }
  const length = (+end - +start) / hour;
  if (length < settings.minHours || length > 24 * settings.maxDays) {
    throw new DomainError("duration", `Choose a rental from ${settings.minHours} hours to ${settings.maxDays} days.`);
  }
  const { open, close } = handoverHours;
  const inside = (time: DateTime) => isWeekday(time) && localMinutes(time) >= minutes(open) && localMinutes(time) <= minutes(close);
  if (!inside(start) || !inside(end)) {
    throw new DomainError("hours", `Pickup and return are available Monday–Friday, ${open}–${close} local time.`);
  }
  return interval;
}

export function quickInterval(type: Quick, { minNotice, minHours, maxDays }: Pick<Settings, "minNotice" | "minHours" | "maxDays">, now: DateTime = DateTime.now()): Interval {
  const current = now.setZone(zone);
  const { open, close } = handoverHours;
  const at = (date: DateTime, time: string) => date.set({ hour: Math.floor(minutes(time) / 60), minute: minutes(time) % 60, second: 0, millisecond: 0 });
  const advance = (date: DateTime) => {
    if (isWeekday(date) && date <= at(date, close)) return date < at(date, open) ? at(date, open) : date;
    const next = isWeekday(date) ? date.plus({ days: 1 }) : date;
    return at(isWeekday(next) ? next : next.plus({ days: 8 - next.weekday }), open);
  };
  const earliest = advance(current.plus({ minutes: minNotice }).startOf("minute").plus({ minutes: 1 }));
  let pickup = earliest;
  if (type === "weekend") {
    const friday = earliest.plus({ days: (5 - earliest.weekday + 7) % 7 });
    pickup = friday.hasSame(earliest, "day") && earliest > at(friday, "10:00") ? earliest : at(friday, "10:00");
  }
  const days = Math.min(maxDays, type === "week" ? 7 : type === "weekend" ? 3 : 1);
  const earliestReturn = (start: DateTime) => advance(start.plus({ hours: minHours }));
  if (earliestReturn(pickup) > pickup.plus({ hours: maxDays * 24 })) pickup = earliest;
  for (let remaining = 5; remaining > 0 && earliestReturn(pickup) > pickup.plus({ hours: maxDays * 24 }); remaining--) {
    pickup = advance(at(pickup.plus({ days: 1 }), open));
  }
  const preferred = advance(pickup.plus({ days }));
  const minimum = earliestReturn(pickup);
  const returnAt = preferred >= minimum && preferred <= pickup.plus({ hours: maxDays * 24 }) ? preferred : minimum;
  return { pickup: inputDate(pickup), returnAt: inputDate(returnAt) };
}

export function quote(vehicle: Pick<Vehicle, "dailyRate">, interval: Interval, fee = 0): Quote {
  const duration = (Date.parse(interval.returnAt) - Date.parse(interval.pickup)) / hour;
  if (!Number.isFinite(duration) || duration <= 0) throw new DomainError("dates", "Choose a valid rental interval.");
  const days = Math.max(1, Math.ceil(duration / 24));
  const subtotal = days * vehicle.dailyRate;
  return { dailyRate: vehicle.dailyRate, days, hours: duration, subtotal, fee, total: subtotal + fee, currency: "EUR" };
}

export function overlaps(a: Interval, b: Interval, aBuffer = 0, bBuffer = 0) {
  return Date.parse(a.pickup) < Date.parse(b.returnAt) + bBuffer * 60_000 &&
    Date.parse(b.pickup) < Date.parse(a.returnAt) + aBuffer * 60_000;
}

export function conflict(vehicleId: string, range: Interval, bookings: Booking[], blocks: Block[], buffer: number, ignore?: string) {
  return bookings.find((booking) => booking.vehicleId === vehicleId && booking.id !== ignore &&
    allocated.has(booking.status) && overlaps(range, booking, buffer, booking.buffer)) ??
    blocks.find((block) => block.vehicleId === vehicleId && overlaps(range, block, buffer));
}

export function formatMoney(cents: number, locale = "en") {
  return new Intl.NumberFormat(locale === "sl" ? "sl-SI" : "en-IE", {
    style: "currency", currency: "EUR", minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function formatDate(value: string, locale = "en", time = true) {
  return DateTime.fromISO(value, { zone }).setLocale(locale === "sl" ? "sl-SI" : "en-GB").toLocaleString(
    time ? { ...DateTime.DATE_MED, hour: "2-digit", minute: "2-digit", hourCycle: "h23" } : DateTime.DATE_MED,
  );
}
