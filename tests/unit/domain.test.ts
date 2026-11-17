import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { overlaps, quote, toInterval, validateWindow, zone } from "../../src/lib/booking/domain";
import { mutate, publicStore, rentalQuote, unavailable } from "../../src/lib/demo/actions";
import { commandDates, parseVehicleDescription } from "../../src/lib/demo/quick-entry";
import { demoSettings, seedStore } from "../../src/lib/demo/seed";

const future = (days: number, hour: number) => DateTime.now().setZone(zone).startOf("day").plus({ days }).set({hour}).toFormat("yyyy-MM-dd'T'HH:mm");
const range = {pickup:future(13,10),returnAt:future(14,11)};
const carId = "golf";
const request = (id: string) => ({type:"request",id,vehicleId:carId,...range,name:"Ava Example",email:"ava@example.com",phone:"+386 01234567",note:"",accept:true,eligibility:true});

describe("Ljubljana rental rules", () => {
  it("uses elapsed time and rounds up without adding the deposit", () => {
    const interval=toInterval("2027-03-27T10:00","2027-03-28T10:00");
    expect(quote({dailyRate:4500,deposit:20000},interval,500)).toMatchObject({hours:23,days:1,total:5000,deposit:20000});
    expect(quote({dailyRate:4500,deposit:20000},toInterval("2027-10-30T10:00","2027-10-31T10:00"))).toMatchObject({hours:25,days:2,total:9000});
  });
  it("rejects non-existent times, ambiguous times, and out-of-hours pickups", () => {
    expect(()=>toInterval("2027-03-28T02:30","2027-03-28T11:00")).toThrow();
    expect(()=>toInterval("2027-10-31T02:30","2027-10-31T11:00")).toThrow();
    expect(()=>validateWindow(toInterval("2027-03-28T07:00","2027-03-28T11:00"),demoSettings,Date.parse("2027-03-01"))).toThrow("between 08:00 and 20:00");
  });
  it("allows adjacent intervals at the buffer boundary", () => {
    const first=toInterval(future(12,10),future(13,9));
    const second=toInterval(range.pickup,range.returnAt);
    expect(overlaps(first,second,60)).toBe(false);
    expect(overlaps(first,second,61)).toBe(true);
  });
});
describe("booking state", () => {
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
    expect(rentalQuote(vehicle,state,toInterval(range.pickup,future(14,12))).dailyRate).toBe(3900);
    const limited=mutate(state,{type:"window",vehicleId:carId,...range}).state;
    expect(unavailable(vehicle,limited,toInterval(future(14,13),future(15,13)))).toMatch(/outside/);
  });
});
describe("quick vehicle entry", () => {
  const monday=DateTime.fromISO("2026-11-16T13:00",{zone});
  it("extracts fields, deposit and exact review dates without inventing missing facts", () => {
    const draft=parseVehicleDescription("Add a black VW T-Cross 2023, automatic, €45 per day, €200 deposit, available from Friday to Monday.",demoSettings,monday);
    expect(draft).toMatchObject({make:"Volkswagen",model:"T-Cross",year:2023,color:"Black",dailyRate:4500,deposit:20000,range:{pickup:"2026-11-20T08:00",returnAt:"2026-11-23T20:00"}});
    expect(parseVehicleDescription("Golf",demoSettings,monday).dailyRate).toBeUndefined();
    expect(commandDates("from next month to whenever",demoSettings,monday)).toBeUndefined();
  });
  it("recognizes Slovenian pricing and relative availability", () => {
    expect(parseVehicleDescription("Dodaj bel VW Golf 2021, 35 evrov na dan, 200 evrov varščina, ta vikend",demoSettings,monday)).toMatchObject({model:"Golf",color:"White",dailyRate:3500,deposit:20000,range:{pickup:"2026-11-21T08:00",returnAt:"2026-11-22T20:00"}});
  });
});
