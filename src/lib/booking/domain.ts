import { DateTime } from "luxon";
import type { Block, Booking, Interval, Quote, Settings, Status, Vehicle } from "./types";

export const zone = "Europe/Ljubljana";
export const hour = 3_600_000;
export const day = 24 * hour;
export const allocated = new Set<Status>(["CONFIRMED", "PICKED_UP", "RETURNED"]);
export const transitions: Record<Status, Status[]> = {
  REQUESTED: ["CONFIRMED", "REJECTED", "CANCELLED"],
  CONFIRMED: ["PICKED_UP", "CANCELLED"], PICKED_UP: ["RETURNED"],
  RETURNED: [], REJECTED: [], CANCELLED: [],
};
export type Quick = "today" | "tonight" | "weekend" | "week";

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
  const inside = (time: DateTime) => localMinutes(time) >= minutes(settings.open) && localMinutes(time) <= minutes(settings.close);
  if (!inside(start) || !inside(end)) {
    throw new DomainError("hours", `Pickup and return must be between ${settings.open} and ${settings.close} local time.`);
  }
  return interval;
}

export function quickInterval(type: Quick, settings: Pick<Settings, "open" | "close" | "minNotice" | "minHours" | "maxDays">, now = DateTime.now()): Interval {
  const current = now.setZone(zone);
  const at = (date: DateTime, time: string) => date.startOf("day").plus({ minutes: minutes(time) });
  const advance = (date: DateTime) => {
    const open = at(date, settings.open);
    const close = at(date, settings.close);
    if (date < open) return open;
    if (date > close) return at(date.plus({ days: 1 }), settings.open);
    return date;
  };
  const earliest = current.plus({ minutes: settings.minNotice + 1 }).startOf("hour").plus({ hours: 1 });
  let pickup = advance(earliest);
  if (type === "tonight") {
    const evening = at(pickup, minutes(settings.close) >= 18 * 60 && minutes(settings.open) <= 18 * 60 ? "18:00" : settings.close);
    if (evening > pickup) pickup = evening;
  }
  if (type === "weekend") {
    const saturday = current.startOf("day").plus({ days: (6 - current.weekday + 7) % 7 });
    const preferred = advance(at(saturday, "10:00"));
    if (preferred >= earliest) pickup = preferred;
    else if (current.weekday >= 6 && pickup.weekday < 6) pickup = advance(at(saturday.plus({ days: 7 }), "10:00"));
  }
  let returnAt = pickup.plus({ days: type === "week" ? Math.min(7, settings.maxDays) : Math.min(type === "weekend" ? 2 : 1, settings.maxDays) });
  if ((+returnAt - +pickup) / hour > settings.maxDays * 24) returnAt = pickup.plus({ days: Math.max(settings.maxDays - 1, 0) });
  if ((+returnAt - +pickup) / hour < settings.minHours) returnAt = advance(pickup.plus({ hours: settings.minHours }));
  return { pickup: inputDate(pickup), returnAt: inputDate(returnAt) };
}

export function quote(vehicle: Pick<Vehicle, "dailyRate" | "deposit">, interval: Interval, fee = 0): Quote {
  const duration = (Date.parse(interval.returnAt) - Date.parse(interval.pickup)) / hour;
  if (!Number.isFinite(duration) || duration <= 0) throw new DomainError("dates", "Choose a valid rental interval.");
  const days = Math.max(1, Math.ceil(duration / 24));
  const subtotal = days * vehicle.dailyRate;
  return { dailyRate: vehicle.dailyRate, days, hours: duration, subtotal, fee, total: subtotal + fee, deposit: vehicle.deposit, currency: "EUR" };
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
