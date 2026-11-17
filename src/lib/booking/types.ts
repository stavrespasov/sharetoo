export const statuses = ["REQUESTED", "CONFIRMED", "REJECTED", "CANCELLED", "PICKED_UP", "RETURNED"] as const;
export type Status = typeof statuses[number];
export const categories = ["Crossover", "Coupé", "Hatchback", "Estate", "Van", "Other"] as const;
export type Category = typeof categories[number];
export const fuels = ["Petrol", "Diesel", "Hybrid", "Electric"] as const;
export const transmissions = ["Automatic", "Manual"] as const;
export const blockReasons = ["Maintenance", "Manual", "Other"] as const;

export interface Vehicle {
  id: string;
  slug: string;
  make: string;
  model: string;
  trim: string;
  color: string;
  year: number;
  category: Category;
  plate: string;
  transmission: typeof transmissions[number];
  fuel: typeof fuels[number];
  seats: number;
  doors: number;
  luggage: number;
  description: string;
  descriptionSl: string;
  features: string[];
  rules: string[];
  dailyRate: number;
  minAge: number;
  minLicenseYears: number;
  photo: string;
  gallery?: VehiclePhoto[];
  photoSource: "illustrative" | "owner";
  photoCredit?: { title: string; author: string; license: string; url: string };
  archived?: boolean;
  published: boolean;
  active: boolean;
}
export type VehiclePhoto = Pick<Vehicle, "photo" | "photoSource" | "photoCredit">;
export type PublicVehicle = Omit<Vehicle, "plate" | "published" | "active" | "archived">;
export interface Interval { pickup: string; returnAt: string }
export interface Block extends Interval {
  id: string;
  vehicleId: string;
  reason: typeof blockReasons[number];
  note: string;
}
export interface Settings {
  tradingName: string;
  legalName: string;
  address: string;
  email: string;
  phone: string;
  open: string;
  close: string;
  minNotice: number;
  buffer: number;
  minHours: number;
  maxDays: number;
  fee: number;
  policy: string;
  policySl: string;
  templateVersion: string;
}
export interface Quote {
  dailyRate: number;
  days: number;
  hours: number;
  subtotal: number;
  fee: number;
  total: number;
  currency: "EUR";
}
export interface Customer {
  name: string;
  email: string;
  phone: string;
}
export interface Activity {
  type: string;
  at: string;
  key: string;
  simulated?: boolean;
}
export interface Contract {
  version: string;
  tradingName: string;
  legalName: string;
  address: string;
  email: string;
  phone: string;
  car: string;
  plate: string;
  generatedAt: string;
}
export interface Booking extends Interval {
  id: string;
  ref: string;
  vehicleId: string;
  vehicleName: string;
  customer: Customer;
  status: Status;
  quote: Quote;
  note: string;
  internalNote: string;
  createdAt: string;
  acceptedAt: string;
  buffer: number;
  contract?: Contract;
  activity: Activity[];
  handover?: { originalsChecked: boolean; signedOffline: boolean; mileage?: number; condition?: string };
  returnRecord?: { mileage?: number; condition?: string };
}
export interface Offer extends Interval { id: string; vehicleId: string; dailyRate: number }
export interface Window extends Interval { id: string; vehicleId: string }
export interface Store {
  vehicles: Vehicle[];
  bookings: Booking[];
  offers: Offer[];
  windows: Window[];
  blocks: Block[];
  settings: Settings;
}
export const vehicleName = (v: Pick<Vehicle, "make" | "model">) => `${v.make} ${v.model}`;
