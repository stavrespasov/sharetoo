import { DateTime } from "luxon";
import { quote, zone } from "../booking/domain";
import { vehicleName, type Booking, type Settings, type Store, type Vehicle } from "../booking/types";

export const catalog = [
  { id: "t-cross", make: "Volkswagen", model: "T-Cross", year: 2023, category: "Crossover", color: "Graphite", transmission: "Automatic", fuel: "Petrol", seats: 5, doors: 5, luggage: 2, dailyRate: 4500, deposit: 20000, description: "A compact crossover with an elevated driving position and flexible space for a day in town or a weekend away.", descriptionSl: "Kompakten križanec z višjim položajem sedenja in prilagodljivim prostorom za mestne vožnje ali vikend izlete." },
  { id: "four-series", make: "BMW", model: "4 Series Coupé", year: 2022, category: "Coupé", color: "Graphite", transmission: "Automatic", fuel: "Petrol", seats: 4, doors: 2, luggage: 2, dailyRate: 9000, deposit: 40000, description: "A refined two-door coupé for long drives, special occasions and roads worth taking.", descriptionSl: "Prefinjen dvovratni kupe za daljše vožnje, posebne priložnosti in slikovite poti." },
  { id: "golf", make: "Volkswagen", model: "Golf", year: 2021, category: "Hatchback", color: "White", transmission: "Manual", fuel: "Petrol", seats: 5, doors: 5, luggage: 2, dailyRate: 3900, deposit: 20000, description: "An easy-to-drive hatchback with room for five and a footprint that suits city streets.", descriptionSl: "Okretna kombilimuzina s prostorom za pet potnikov, primerna za mestne ulice." },
] as const;
export const demoSettings: Settings = {
  tradingName: "Sharetoo Concept", legalName: "Sharetoo Concept — fictitious sample", address: "Koper, Slovenija",
  email: "rental@example.com", phone: "", open: "08:00", close: "20:00",
  minNotice: 30, buffer: 60, minHours: 2, maxDays: 30, fee: 0,
  policy: "Bring the original driver's licence and identity document to the sample pickup. Contact the owner about changes to a request.",
  policySl: "Ob prevzemu prinesite izvirnik vozniškega dovoljenja in osebnega dokumenta. Za spremembo povpraševanja se obrnite na skrbnika.",
  templateVersion: "demo-1",
};

export function updateDefaultPickup(state: Store): Store {
  const previousAddress = "Ljubljana, Slovenia · Demo pickup point";
  if (state.settings.address !== previousAddress) return state;
  return {
    ...state,
    settings: { ...state.settings, address: demoSettings.address },
  };
}

export function seedStore(now = DateTime.now()): Store {
  const today = now.setZone(zone).startOf("day");
  const at = (offset: number, hour: number) => today.plus({ days: offset }).set({ hour }).toUTC().toISO()!;
  const vehicles: Vehicle[] = catalog.map((car, i) => ({
    ...car, slug: car.id, plate: "DEMO-" + (i + 1), trim: "", features: ["Air conditioning", "Bluetooth"], rules: [],
    minAge: 21, minLicenseYears: 1, photo: "/demo/" + car.id + ".webp", photoSource: "illustrative", published: true, active: true,
  }));
  const schedule = [
    [0, -5, -4, "RETURNED"], [2, -2, -1, "RETURNED"], [1, -1, 0, "PICKED_UP"],
    [0, 0, 1, "CONFIRMED"], [1, 5, 7, "CONFIRMED"], [2, 0, 1, "REQUESTED"], [0, 3, 4, "REQUESTED"],
  ] as const;
  const bookings: Booking[] = schedule.map(([car, start, end, status], i) => {
    const vehicle = vehicles[car];
    const range = { pickup: at(start, 10), returnAt: at(end, 12) };
    return {
      ...range, id: "sample-" + i, ref: "ST-DEMO0" + (i + 1), status, vehicleId: vehicle.id,
      vehicleName: vehicleName(vehicle), customer: { name: ["Alex Sample", "Mia Example", "Luka Demo", "Eva Sample", "Noah Example", "Nika Demo", "Ava Sample"][i], email: "demo+" + i + "@example.com", phone: "+386 00 000 00" + i },
      quote: quote(vehicle, range), note: "", internalNote: "", createdAt: at(start - 1, 11), acceptedAt: at(start - 1, 11), buffer: demoSettings.buffer,
      contract: status === "REQUESTED" ? undefined : { version: demoSettings.templateVersion, tradingName: demoSettings.tradingName, legalName: demoSettings.legalName, address: demoSettings.address, email: demoSettings.email, phone: demoSettings.phone, car: vehicleName(vehicle), plate: vehicle.plate, generatedAt: at(start - 1, 12) },
      activity: [{ key: "seed-" + i, type: status, at: at(start - 1, 11) }],
    };
  });
  return { vehicles, bookings, blocks: [
    { id: "service-1", vehicleId: "golf", pickup: at(2, 9), returnAt: at(2, 17), reason: "Maintenance", note: "Sample service" },
    { id: "service-2", vehicleId: "t-cross", pickup: at(7, 9), returnAt: at(7, 17), reason: "Maintenance", note: "Sample service" },
  ], offers: [], windows: [], settings: { ...demoSettings } };
}
