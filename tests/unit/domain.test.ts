import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { overlaps, quickInterval, quote, toInterval, validateWindow, zone } from "../../src/lib/booking/domain";
import { mutate, publicStore, rentalQuote, unavailable } from "../../src/lib/demo/actions";
import { commandDates, parseVehicleDescription } from "../../src/lib/demo/quick-entry";
import { demoSettings, seedStore, updateDemoDefaults } from "../../src/lib/demo/seed";

const twoWeeks = DateTime.now().setZone(zone).startOf("day").plus({ weeks: 2 });
const mondayAfterSeed = twoWeeks.plus({ days: (8 - twoWeeks.weekday) % 7 });
const future = (days: number, hour: number) => mondayAfterSeed.plus({ days }).set({hour}).toFormat("yyyy-MM-dd'T'HH:mm");
const range = {pickup:future(0,10),returnAt:future(1,11)};
const carId = "golf";
const request = (id: string) => ({type:"request",id,vehicleId:carId,...range,name:"Ava Example",email:"ava@example.com",phone:"+386 01234567",note:"",accept:true,eligibility:true});

describe("Slovenian rental time rules", () => {
  it("uses elapsed time and rounds up to full billed days", () => {
    const interval=toInterval("2027-03-27T10:00","2027-03-28T10:00");
    expect(quote({dailyRate:4500},interval,500)).toEqual({dailyRate:4500,hours:23,days:1,subtotal:4500,fee:500,total:5000,currency:"EUR"});
    expect(quote({dailyRate:4500},toInterval("2027-10-30T10:00","2027-10-31T10:00"))).toMatchObject({hours:25,days:2,total:9000});
  });
  it("rejects non-existent times, ambiguous times, and out-of-hours pickups", () => {
    expect(()=>toInterval("2027-03-28T02:30","2027-03-28T11:00")).toThrow();
    expect(()=>toInterval("2027-10-31T02:30","2027-10-31T11:00")).toThrow();
    const check = (pickup: string, returnAt: string) => validateWindow(toInterval(pickup, returnAt), demoSettings, Date.parse("2027-03-01"));
    expect(()=>check("2027-03-26T07:59","2027-03-26T12:00")).toThrow("Monday–Friday, 08:00–16:00");
    expect(()=>check("2027-03-26T08:00","2027-03-26T16:01")).toThrow("Monday–Friday, 08:00–16:00");
    expect(()=>check("2027-03-27T09:00","2027-03-29T08:00")).toThrow("Monday–Friday, 08:00–16:00");
    expect(()=>check("2027-03-26T16:00","2027-03-28T12:00")).toThrow("Monday–Friday, 08:00–16:00");
    expect(check("2027-03-26T16:00","2027-03-29T08:00")).toBeDefined();
  });
  it("suggests a Friday-to-Monday rental and advances past closing and weekends", () => {
    const now = DateTime.fromISO("2027-03-26T15:45",{zone});
    expect(quickInterval("today",demoSettings,now)).toEqual({pickup:"2027-03-29T08:00",returnAt:"2027-03-30T08:00"});
    const weekend = quickInterval("weekend",demoSettings,now);
    expect(weekend).toEqual({pickup:"2027-04-02T10:00",returnAt:"2027-04-05T10:00"});
    const short = quickInterval("today",{...demoSettings,maxDays:1},now.minus({hours:2}));
    expect(()=>validateWindow(toInterval(short.pickup,short.returnAt),{...demoSettings,maxDays:1},+now.minus({hours:2}))).not.toThrow();
  });
  it("allows adjacent intervals at the buffer boundary", () => {
    const first=toInterval(future(-1,10),future(0,9));
    const second=toInterval(range.pickup,range.returnAt);
    expect(overlaps(first,second,60)).toBe(false);
    expect(overlaps(first,second,61)).toBe(true);
  });
});
describe("booking state", () => {
  it("updates saved hours and removes legacy charges while preserving the booking and its total", () => {
    const old = seedStore();
    old.settings.address = "Ljubljana, Slovenia · Demo pickup point";
    old.settings.close = "20:00";
    Object.assign(old.bookings[0].quote, { deposit: 20000 });
    Object.assign(old.vehicles[0], { deposit: 20000 });
    const updated = updateDemoDefaults(old);
    expect(updated.settings).toMatchObject({address:"Koper, Slovenija",open:"08:00",close:"16:00"});
    expect(updated.bookings[0]).toMatchObject({id:old.bookings[0].id,quote:{total:old.bookings[0].quote.total}});
    expect(updated.bookings[0].quote).not.toHaveProperty("deposit");
    expect(updated.vehicles[0]).not.toHaveProperty("deposit");
    const custom = {...old, settings:{...old.settings, address:"Pickup at the harbour"}};
    expect(updateDemoDefaults(custom).settings.address).toBe("Pickup at the harbour");
  });

  it("accepts competing requests, prevents double confirmation, and releases a cancellation", () => {
    let state=seedStore();
    state=mutate(state,request("customer-a")).state;
    state=mutate(state,request("customer-b")).state;
    const approval={type:"status",id:"customer-a",status:"CONFIRMED"};
    state=mutate(state,approval).state;
    state=mutate(state,approval).state;
    expect(state.bookings.find((b)=>b.id==="customer-a")?.activity.filter((item)=>item.type==="BOOKING_CONFIRMED_CUSTOMER")).toHaveLength(1);
    expect(()=>mutate(state,{...approval,id:"customer-b"})).toThrow("Unavailable");
    state=mutate(state,{...approval,status:"CANCELLED"}).state;
    expect(mutate(state,{...approval,id:"customer-b"}).state.bookings.find((b)=>b.id==="customer-b")?.status).toBe("CONFIRMED");
    const scrub=JSON.stringify(publicStore(state));
    expect(scrub).not.toContain("ava@example.com");
    expect(scrub).not.toContain("DEMO-3");
  });
  it("freezes prices and applies offers to fully contained intervals", () => {
    const initial=mutate(seedStore(),request("customer-a")).state;
    const state=mutate(initial,{type:"offer",vehicleId:carId,...range,dailyRate:3100}).state;
    const vehicle=state.vehicles.find((v)=>v.id===carId)!;
    expect(state.bookings[0].quote.dailyRate).toBe(3900);
    expect(rentalQuote(vehicle,state,toInterval(range.pickup,range.returnAt)).dailyRate).toBe(3100);
    expect(rentalQuote(vehicle,state,toInterval(range.pickup,future(1,12))).dailyRate).toBe(3900);
    const limited=mutate(state,{type:"window",vehicleId:carId,...range}).state;
    expect(unavailable(vehicle,limited,toInterval(future(1,13),future(2,13)))).toMatch(/outside/);
  });
});
describe("quick vehicle entry", () => {
  const monday=DateTime.fromISO("2026-11-16T13:00",{zone});
  it("extracts the daily rate and exact review dates and ignores legacy deposit wording", () => {
    const draft=parseVehicleDescription("Add a black VW T-Cross 2023, automatic, €45 per day, €200 deposit, available from Friday to Monday.",demoSettings,monday);
    expect(draft).toMatchObject({make:"Volkswagen",model:"T-Cross",year:2023,color:"Black",dailyRate:4500,range:{pickup:"2026-11-20T08:00",returnAt:"2026-11-23T16:00"}});
    expect(draft).not.toHaveProperty("deposit");
    expect(parseVehicleDescription("Golf",demoSettings,monday).dailyRate).toBeUndefined();
    expect(commandDates("from next month to whenever",demoSettings,monday)).toBeUndefined();
  });
  it("recognizes a spoken Slovenian vehicle description and explicit specifications", () => {
    const spoken = "Črn Volkswagen Te kros 2023, samodejni menjalnik, pet vrat, dizel, 5 sedežev, 45 evrov na dan.";
    expect(parseVehicleDescription(spoken,demoSettings,monday)).toMatchObject({
      make:"Volkswagen",model:"T-Cross",year:2023,color:"Black",transmission:"Automatic",fuel:"Diesel",seats:5,dailyRate:4500,
    });
    expect(parseVehicleDescription("Modra Škoda Octavia, letnik 2021, 39 evrov na dan",demoSettings,monday)).toMatchObject({
      make:"Škoda",model:"Octavia",color:"Blue",year:2021,dailyRate:3900,
    });
  });
  it("recognizes Slovenian pricing and relative availability", () => {
    expect(parseVehicleDescription("Dodaj bel VW Golf 2021, 35 evrov na dan, ta vikend",demoSettings,monday)).toMatchObject({model:"Golf",color:"White",dailyRate:3500,range:{pickup:"2026-11-20T08:00",returnAt:"2026-11-23T16:00"}});
  });
});
