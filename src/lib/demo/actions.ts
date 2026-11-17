import { z } from "zod";
import { conflict, DomainError, formatDate, overlaps, quote, toInterval, transitions, validateWindow } from "../booking/domain";
import { blockReasons, categories, fuels, statuses, transmissions, vehicleName, type Booking, type Interval, type Store, type Vehicle } from "../booking/types";
import { seedStore } from "./seed";

const short = z.string().trim().max(200);
const text = z.string().trim().max(1600);
const id = z.string().regex(/^[a-z0-9-]{1,80}$/i);
const money = z.number().int().min(0).max(10_000_000);
const count = (max: number) => z.number().int().min(0).max(max);
const times = { pickup: short, returnAt: short };
const photo = z.string().max(4_300_000).refine((value) => !value || /^\/api\/media\?id=[a-f0-9-]{36}$/.test(value) || /^\/demo\/[\w-]+\.webp$/.test(value) || /^data:image\/(?:webp|png|jpeg);base64,[a-zA-Z0-9+/=]+$/.test(value) || /^https:\/\/(?:upload|thumb)\.wikimedia\.org\//.test(value), "Choose an uploaded or catalog image.");
const credit = z.object({ title: short, author: short, license: short, url: z.url().refine((value) => value.startsWith("https://commons.wikimedia.org/")) });
const photoFields = { photo, photoSource: z.enum(["illustrative", "owner"]), photoCredit: credit.optional() };
const clock = z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/);
const car = z.object({
  id, slug: id, make: short.min(1), model: short.min(1), trim: short, color: short, year: z.number().int().min(1900).max(2100),
  category: z.enum(categories), plate: short, transmission: z.enum(transmissions), fuel: z.enum(fuels), seats: count(20), doors: count(12), luggage: count(20),
  description: text, descriptionSl: text, features: z.array(short).max(35), rules: z.array(short).max(35),
  dailyRate: money, deposit: money, minAge: count(99), minLicenseYears: count(50), ...photoFields, gallery: z.array(z.object(photoFields)).max(4).optional(),
  published: z.boolean(), active: z.boolean(), archived: z.boolean().optional(),
});
const ownerSettings = z.object({
  tradingName: short.min(1), legalName: short.min(1), address: short.min(1), email: z.email(), phone: short, open: clock, close: clock,
  minNotice: count(10080), buffer: count(1440), minHours: z.number().min(1).max(336), maxDays: z.number().int().min(1).max(365), fee: money,
  policy: text, policySl: text, templateVersion: short.min(1),
}).refine((value) => value.open < value.close && value.minHours <= value.maxDays * 24, "Review office hours and rental length.");

export const command = z.discriminatedUnion("type", [
  z.object({ type: z.literal("request"), id, vehicleId: id, ...times, name: short.min(2), email: z.email().max(200), phone: short.regex(/^[+\d ()-]{6,30}$/), note: text, accept: z.literal(true), eligibility: z.literal(true), trap: z.string().max(100).optional() }),
  z.object({ type: z.literal("vehicle"), vehicle: car, window: z.object(times).optional() }),
  z.object({ type: z.literal("status"), id, status: z.enum(statuses), originalsChecked: z.boolean().optional(), signedOffline: z.boolean().optional(), mileage: count(2_000_000).optional(), condition: text.optional() }),
  z.object({ type: z.literal("note"), id, note: text }),
  z.object({ type: z.literal("block"), vehicleId: id, ...times, reason: z.enum(blockReasons), note: text }),
  z.object({ type: z.literal("offer"), vehicleId: id, ...times, dailyRate: money.min(1) }),
  z.object({ type: z.literal("window"), vehicleId: id, ...times }),
  z.object({ type: z.literal("remove"), id, collection: z.enum(["offers", "blocks", "windows"]) }),
  z.object({ type: z.literal("settings"), settings: ownerSettings }),
  z.object({ type: z.literal("reset") }),
]);
export type Command = z.input<typeof command>;
export type Receipt = { ref: string; status: Booking["status"] };
export const isListed = (v: Vehicle) => v.active && v.published && !v.archived;
export const demoKey = "sharetoo-demo-v1";
export function upsert<T extends { id: string }>(values: T[], value: T) {
  return values.some((v) => v.id === value.id) ? values.map((v) => v.id === value.id ? value : v) : [...values, value];
}

const covers = (outer: Interval, inner: Interval) => Date.parse(outer.pickup) <= Date.parse(inner.pickup) && Date.parse(outer.returnAt) >= Date.parse(inner.returnAt);

export function rentalQuote(vehicle: Vehicle, state: Store, range: Interval) {
  const offer = state.offers.find((item) => item.vehicleId === vehicle.id && covers(item, range));
  return quote({ ...vehicle, dailyRate: offer?.dailyRate ?? vehicle.dailyRate }, range, state.settings.fee);
}
export function unavailable(vehicle: Vehicle, state: Store, range: Interval, ignore?: string) {
  if (!isListed(vehicle)) return "This vehicle is currently offline.";
  const windows = state.windows.filter((window) => window.vehicleId === vehicle.id);
  if (windows.length && !windows.some((window) => covers(window, range))) return "This rental falls outside the bookable dates.";
  const clash = conflict(vehicle.id, range, state.bookings, state.blocks, state.settings.buffer, ignore);
  return clash ? `Unavailable from ${formatDate(clash.pickup)} to ${formatDate(clash.returnAt)}. A turnaround buffer may apply.` : "";
}
export function publicStore(state: Store): Store {
  return { ...state, vehicles: state.vehicles.filter(isListed).map((v) => ({ ...v, plate: "" })), bookings: state.bookings.filter((b) => ["CONFIRMED", "PICKED_UP", "RETURNED"].includes(b.status)).map((b) => ({
    id: "", ref: "", pickup: b.pickup, returnAt: b.returnAt, status: b.status, vehicleId: b.vehicleId, buffer: b.buffer, vehicleName: "",
    customer: { name: "", email: "", phone: "" }, quote: { dailyRate: 0, days: 0, hours: 0, subtotal: 0, fee: 0, deposit: 0, total: 0, currency: "EUR" },
    note: "", internalNote: "", createdAt: "", acceptedAt: "", activity: [],
  })), blocks: state.blocks.map((b) => ({ ...b, note: "" })), settings: { ...state.settings, legalName: "" } };
}
export function mutate(previous: Store, incoming: unknown): { state: Store; receipt?: Receipt } {
  const result = command.safeParse(incoming);
  if (!result.success) throw new DomainError("input", result.error.issues[0]?.message ?? "Check the entered values.");
  const action = result.data;
  const state = structuredClone(previous);
  const { settings } = state;
  const now = new Date().toISOString();
  const findVehicle = (vehicleId: string) => {
    const vehicle = state.vehicles.find((item) => item.id === vehicleId);
    if (!vehicle) throw new DomainError("car", "Vehicle not found.", 404);
    return vehicle;
  };
  const record = (booking: Booking, type: string, simulated = false) => {
    const key = booking.id + ":" + type;
    if (!booking.activity.some((event) => event.key === key)) booking.activity.push({ at: now, type, key, simulated });
  };
  if (action.type === "request") {
    if (action.trap) throw new DomainError("request", "Unable to submit this request.");
    const existing = state.bookings.find((item) => item.id === action.id);
    if (existing) {
      if (existing.vehicleId !== action.vehicleId || existing.customer.email !== action.email.toLowerCase()) throw new DomainError("request", "Start a new request.", 409);
      return { state, receipt: { ref: existing.ref, status: existing.status } };
    }
    const vehicle = findVehicle(action.vehicleId);
    const range = validateWindow(toInterval(action.pickup, action.returnAt), settings);
    const problem = unavailable(vehicle, state, range);
    if (problem) throw new DomainError("availability", problem, 409);
    const ref = "ST-" + crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
    const booking: Booking = { ...range, id: action.id, ref, vehicleId: vehicle.id, vehicleName: vehicleName(vehicle),
      customer: { name: action.name, email: action.email.toLowerCase(), phone: action.phone }, status: "REQUESTED", quote: rentalQuote(vehicle, state, range),
      note: action.note, internalNote: "", createdAt: now, acceptedAt: now, buffer: settings.buffer, activity: [] };
    record(booking, "REQUESTED"); record(booking, "BOOKING_REQUESTED_CUSTOMER", true); record(booking, "BOOKING_REQUESTED_OWNER", true);
    state.bookings.unshift(booking);
    return { state, receipt: { ref, status: booking.status } };
  }
  if (action.type === "vehicle") {
    const vehicle = action.vehicle;
    if (vehicle.published && (!vehicle.active || vehicle.archived || !vehicle.dailyRate || !vehicle.color || !vehicle.seats || !vehicle.description || !vehicle.descriptionSl)) {
      throw new DomainError("vehicle", "Complete the main specifications, daily rate, and both descriptions before publishing.");
    }
    if (state.vehicles.some((item) => item.slug === vehicle.slug && item.id !== vehicle.id)) throw new DomainError("slug", "This vehicle URL is already used.");
    state.vehicles = upsert(state.vehicles, vehicle);
    if (action.window) {
      const range = toInterval(action.window.pickup, action.window.returnAt);
      if (!state.windows.some((window) => window.vehicleId === vehicle.id && window.pickup === range.pickup && window.returnAt === range.returnAt)) {
        state.windows.push({ ...range, vehicleId: vehicle.id, id: crypto.randomUUID() });
      }
    }
  }
  if (action.type === "status" || action.type === "note") {
    const booking = state.bookings.find((item) => item.id === action.id);
    if (!booking) throw new DomainError("booking", "Booking not found.", 404);
    if (action.type === "note") booking.internalNote = action.note;
    else {
      if (booking.status === action.status) return { state };
      if (!transitions[booking.status].includes(action.status)) throw new DomainError("status", "This booking can no longer make that change.", 409);
      if (action.status === "CONFIRMED") {
        const vehicle = findVehicle(booking.vehicleId);
        const problem = unavailable(vehicle, state, booking, booking.id);
        if (problem) throw new DomainError("availability", problem, 409);
        booking.buffer = settings.buffer;
        booking.contract = { version: settings.templateVersion, tradingName: settings.tradingName, legalName: settings.legalName, address: settings.address,
          email: settings.email, phone: settings.phone, car: vehicleName(vehicle), plate: vehicle.plate, generatedAt: now };
      }
      if (action.status === "PICKED_UP") {
        if (!action.originalsChecked || !action.signedOffline) throw new DomainError("handover", "Check the original documents and record the offline signatures.");
        booking.handover = { originalsChecked: true, signedOffline: true, mileage: action.mileage, condition: action.condition };
      }
      if (action.status === "RETURNED") booking.returnRecord = { mileage: action.mileage, condition: action.condition };
      booking.status = action.status;
      record(booking, action.status);
      if (["CONFIRMED", "REJECTED", "CANCELLED"].includes(action.status)) record(booking, "BOOKING_" + action.status + "_CUSTOMER", true);
    }
  }
  if (action.type === "block" || action.type === "window" || action.type === "offer") {
    const vehicle = findVehicle(action.vehicleId);
    const range = toInterval(action.pickup, action.returnAt);
    const values = { ...range, vehicleId: vehicle.id, id: crypto.randomUUID() };
    if (action.type === "block") {
      if (conflict(vehicle.id, range, state.bookings, state.blocks, 0)) throw new DomainError("overlap", "This block overlaps an existing allocation or turnaround.", 409);
      state.blocks.push({ ...values, reason: action.reason, note: action.note });
    }
    if (action.type === "offer") {
      if (state.offers.some((item) => item.vehicleId === vehicle.id && overlaps(item, range))) throw new DomainError("overlap", "Resolve the existing price offer for these dates.", 409);
      state.offers.push({ ...values, dailyRate: action.dailyRate });
    }
    if (action.type === "window") state.windows.push(values);
  }
  if (action.type === "remove") {
    if (action.collection === "blocks") state.blocks = state.blocks.filter((item) => item.id !== action.id);
    if (action.collection === "offers") state.offers = state.offers.filter((item) => item.id !== action.id);
    if (action.collection === "windows") state.windows = state.windows.filter((item) => item.id !== action.id);
  }
  if (action.type === "settings") state.settings = action.settings;
  return { state: action.type === "reset" ? seedStore() : state };
}
