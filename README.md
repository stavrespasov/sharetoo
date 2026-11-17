# Sharetoo Concept

An interactive car-rental demo for Koper. It includes an English and Slovenian storefront, date and time search, a booking-request workflow, and an owner workspace for fleet, reservations, availability, offers, customers, and business settings.

## Run locally

Use Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open the displayed address. No environment variables are needed for browser demo mode. Use **Owner dashboard → Enter owner demo** to open the simulated owner workspace. The browser stores its workspace locally. Changes persist across reloads and are shared across tabs in the same browser profile. Access to this mode is simulated. Use fictitious contact details.

Pickup and return are available Monday–Friday from 08:00 to 16:00 (Koper local time). Rentals can span weekends. No deposit is required.

## Walkthrough

1. In the owner dashboard, choose **Describe a car**. Dictate “Add a black VW T-Cross 2023, automatic, €45 per day, available Friday through Monday.” Speech fills the form automatically. If you type or use keyboard dictation, select **Fill fields**.
2. Check the filled details and dates, then select **Save and publish**. Open **More details** to edit specifications, descriptions or photos.
3. In the storefront, search for an eligible pickup and return interval. Open the vehicle, review the quote and submit a request with an example.com email.
4. In **Bookings**, find the request and confirm it. Check the simulation timeline and repeat the storefront search to see the car removed from overlapping results.
5. Open **Preview draft agreement**. Use **Print / save PDF** for the A4 version. Record the original documents checklist, offline signature, pickup, and return.
6. Try **Offers** for a scheduled daily rate or bookable window. Use **Calendar** to add a maintenance block. **Settings** can reset the workspace.

Automatic drafts use structured English and Slovenian phrases and an illustrative model catalog. Dictation depends on browser and language support. Keyboard dictation and typing work through the same field. The application does not store raw voice audio. Online image candidates are optional and require selection. The gallery supports owner uploads and shows attribution for chosen Commons photos.

## Vercel and shared state

Import the Git repository into Vercel as a Next.js project. The build and storefront demo work without credentials. For an owner and renter using separate browsers, provision a dedicated PostgreSQL demo database. Use a connection string supported by the host and apply the included migration before enabling the shared mode.

```sh
npm run db:migrate
```

Set `DATABASE_URL`, `DEMO_ADMIN_PASSWORD`, and `DEMO_SESSION_SECRET` in the Vercel environment. All three are needed for shared mode. Use a long random session secret and a dedicated demo password. Set `NEXT_PUBLIC_BRAND_NAME` optionally. Keep these values outside Git.

Shared mode stores state and uploaded photos in PostgreSQL. Its owner route uses a password and signed cookie. Customer responses omit private registration plates, contacts, and agreements. PostgreSQL serializes updates and enforces an exclusion constraint on active allocations. The status link exposes the booking reference and status. The demo password is for supervised concept testing. Real operations require production user authentication, business-approved policies and agreements, a data-retention policy, and a configured email provider.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

Run the Postgres integration test against an isolated shared demo instance with `DEMO_ADMIN_PASSWORD` and `SHARETOO_TEST_URL` set.

```sh
node tests/e2e/shared-state.mjs
```

The integration test creates overlapping fictitious requests and verifies that exactly one can be confirmed. It also checks that unauthorized owner actions fail, private details stay out of public responses, and cancellation releases the interval.

## Demo content

The supplied Sharetoo sign photo was used to prepare the demonstration wordmark. Sharetoo is an existing third-party mobility brand. Confirm authorization for use of the name and mark before a public business launch. The hero and seed model images are generated illustrations. New image candidates retain the provider's attribution and license metadata.

Booking notifications are simulated. Agreements are A4 draft previews with placeholder sample wording. Payment collection, identity document uploads, and real email delivery are outside this demo.

Project requirements are in [the PRD](SHARETOO_CODEX_PRD.md) and [the implementation plan](docs/SHARETOO_IMPLEMENTATION_PLAN.md).
