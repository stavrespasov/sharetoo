import { expect, test, type Page } from "@playwright/test";
import { DateTime } from "luxon";

const at = (days:number,hour:number) => DateTime.now().setZone("Europe/Ljubljana").startOf("day").plus({days}).set({hour}).toFormat("yyyy-MM-dd'T'HH:mm");
const bookingQuery = () => new URLSearchParams({pickup:at(12,10),return:at(13,10)}).toString();
async function openOwner(page:Page) {
  await page.goto("/admin");
  await page.getByRole("button",{name:"Enter owner demo"}).click();
  await expect(page.getByRole("heading",{name:"Overview",exact:true})).toBeVisible();
}
test("owner publishes, customer requests, owner approves and records handover",async ({page})=>{
  await openOwner(page);
  await page.getByRole("link",{name:"Describe a car"}).click();
  await page.getByLabel("Describe it in your own words").fill("Add a black VW T-Cross 2023, automatic, €45 per day, €200 deposit");
  await page.getByRole("button",{name:"Build draft"}).click();
  await expect(page.getByLabel("Model year")).toHaveValue("2023");
  await expect(page.getByLabel("Color",{exact:true})).toHaveValue("Black");
  await page.getByLabel("Model",{exact:true}).fill("T-Cross Weekend Test");
  await page.getByRole("button",{name:"Confirm reviewed specifications"}).click();
  await page.getByRole("button",{name:"Publish vehicle"}).click();
  await expect(page.getByRole("heading",{name:"Fleet",exact:true})).toBeVisible();
  await page.goto("/cars?"+bookingQuery());
  const car=page.getByRole("link",{name:"Volkswagen T-Cross Weekend Test",exact:true});
  await expect(car.first()).toBeVisible();
  await car.first().click();
  await expect(page.getByText("Rental total").first()).toBeVisible();
  await page.getByRole("link",{name:/Request this car|Request car/}).first().click();
  await page.getByLabel("Full name").fill("Jordan Example");
  await page.getByLabel("Email",{exact:true}).fill("jordan@example.com");
  await page.getByLabel("Phone",{exact:true}).fill("+386 01 234 56 78");
  await page.getByRole("checkbox",{name:/I accept/}).check();
  await page.getByRole("checkbox",{name:/I meet/}).check();
  await page.getByRole("button",{name:"Review request"}).click();
  await page.getByRole("button",{name:"Send booking request"}).click();
  await expect(page.getByRole("heading",{name:"Request received."})).toBeVisible();
  const success=page.url();
  const ref=new URL(success).searchParams.get("ref")!;
  await page.goto("/admin/bookings");
  await page.getByRole("link",{name:ref,exact:true}).click();
  await expect(page.getByRole("heading",{name:ref,exact:true})).toBeVisible();
  const booking=page.url();
  await page.getByRole("button",{name:"Confirm booking"}).click();
  await expect(page.getByText("BOOKING CONFIRMED CUSTOMER",{exact:true})).toHaveCount(1);
  await page.getByRole("link",{name:"Preview draft agreement"}).click();
  await expect(page.getByText("DRAFT — NOT SIGNED")).toBeVisible();
  await expect(page.getByText("Jordan Example",{exact:true})).toBeVisible();
  await page.goto("/cars?"+bookingQuery());
  await expect(page.getByRole("heading",{name:"The fleet."})).toBeVisible();
  await expect(page.getByRole("link",{name:"Volkswagen T-Cross Weekend Test",exact:true})).toHaveCount(0);
  await page.goto(success);
  await expect(page.getByText("Confirmed",{exact:true})).toBeVisible();
  await page.goto(booking);
  await page.getByRole("checkbox",{name:"Original documents checked"}).check();
  await page.getByRole("checkbox",{name:"Signed offline"}).check();
  await page.getByRole("button",{name:"Record pickup"}).click();
  await page.getByRole("button",{name:"Record return"}).click();
  await expect(page.getByText("Returned",{exact:true}).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText("Returned",{exact:true}).first()).toBeVisible();
});
test("voice draft and denial support text entry",async ({page})=>{
  await page.addInitScript(() => {
    let attempts=0;
    class Speech {
      onresult?: (event:unknown)=>void;
      onerror?: (event:unknown)=>void;
      onend?: ()=>void;
      start(){attempts++;setTimeout(()=>{if(attempts===1)this.onresult?.({results:[[{transcript:"White VW Golf 2021, 39 euros per day"}]]});else this.onerror?.({error:"not-allowed"});this.onend?.();},40);}
      stop(){this.onend?.();}
      abort(){this.onend?.();}
    }
    Object.assign(window,{SpeechRecognition:Speech});
  });
  await openOwner(page);
  await page.getByRole("link",{name:"Describe a car"}).click();
  await page.getByRole("button",{name:"Dictate"}).click();
  await expect(page.getByLabel("Describe it in your own words")).toHaveValue(/White VW Golf/);
  await page.getByRole("button",{name:"Dictate"}).click();
  await expect(page.getByText("Microphone unavailable",{exact:false})).toBeVisible();
  await page.getByRole("button",{name:"Build draft"}).click();
  await expect(page.getByLabel("Make",{exact:true})).toHaveValue("Volkswagen");
});
test("key pages fit viewport and load with English and Slovenian controls",async ({page})=>{
  await openOwner(page);
  for(const [path,heading] of [["/","The road is yours."],["/cars","The fleet."],["/admin","Overview"],["/admin/vehicles","Fleet"],["/admin/bookings","Bookings"],["/admin/calendar","Calendar"],["/admin/offers","Offers"],["/admin/customers","Customers"],["/admin/settings","Settings"]]){
    await page.goto(path);
    await expect(page.getByRole("heading",{name:heading,exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.goto("/");
  await page.getByRole("button",{name:"Preklopi v slovenščino"}).click();
  await expect(page.getByRole("button",{name:"Poišči vozilo"})).toBeVisible();
});
