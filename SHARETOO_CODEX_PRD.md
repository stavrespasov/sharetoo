# SHARETOO RENTAL — Codex-ready product specification

**Project codename:** `sharetoo-rental`  
**Pitch:** A premium, mobile-first car rental storefront with a fleet-owner control center, approval-based bookings, automated confirmations, and prepared pickup contracts.  
**Target:** A small Slovenian car-rental company with a physical pickup/return location, EUR pricing, and Slovenian + English interfaces.

> **Brand notice:** Sharetoo already exists as a Porsche Finance Group / Porsche Bank mobility brand in Slovenia (sharetoo.si). Use the name publicly only if the operator has the rights/authorization. Keep visible branding configurable; for a speculative demo use “Sharetoo Concept” rather than impersonating the existing company.

## 1. Business outcome

The owner can add a vehicle or block its dates from a phone, accept/reject rental requests, see today's pickups, prepare the rental contract, and handle pickup/return without repeatedly exchanging messages. Customers can find a car for today, tonight, tomorrow, or a week; see the price and terms; request it without an account; receive booking updates by email; and arrive with documents to sign a prepared agreement.

**North-star demo:** Owner creates/publishes a vehicle → customer requests a specific interval → owner approves → availability closes → customer receives a confirmation → owner prints a pre-filled rental agreement.

## 2. Product boundaries

### P0 — pitching demo (build first)
- Elegant responsive landing page with date + time search, vehicle cards, filters, pricing, trust/FAQ/contact sections; English and Slovenian display (translation content can start with a small dictionary).
- Vehicle detail page with hero media, features, rental rules, pickup location and availability calendar.
- Booking request flow with dates/times, price breakdown, renter full name, email, phone, optional note, terms acknowledgement, success page + reference.
- Secure-looking admin UI with KPI cards, table of bookings, calendar, vehicle list, add/edit car form, and booking detail drawer.
- Working demo data/actions with persistence: either Supabase integration if configured, or *explicitly marked* demo/mock mode with deterministic local fixture data and no claims of real emails/payments.
- Demonstrable owner approval/rejection, status changes, and print-ready rental agreement preview. No actual ID uploads needed for the demo.

### P1 — production essentials (before accepting genuine bookings)
- Supabase Auth admin sign-in, role checks, server-side authorization, persistent DB, row-level security where applicable.
- Postgres-level conflict prevention, transactional approval, maintenance/blocked periods, audit log.
- Transactional email to admin and customer, idempotent outbox and retry handling.
- Owner-uploaded/licensed vehicle images, secure asset storage.
- Owner-provided lawyer-reviewed agreement template and configured renter fields; server-side PDF generation, immutable booking snapshot.
- Data retention/privacy policy, clear terms, GDPR-aligned handling, rate limiting, spam protection, form validation, email verification approach.
- Basic monitoring, backups, accessibility and mobile QA.

### P2 — only after launch
- Payments and deposits via Stripe, refunds, dynamic seasonal pricing, coupon codes, extras (child seat, additional driver), multilingual SMS/WhatsApp, driver portal, optional e-signatures, damage check-in/out photography, fleet maintenance reminders, accounting export, multi-location support, revenue analytics.

**Explicit non-goals for MVP:** Native iOS/Android app; AI-generated contracts; digital car-unlocking; KYC document OCR; auto-charge of a customer's card; scraping Google Images.

## 3. Key user journeys

### Customer: search and request
1. Select pickup and return date **and time**, not date only. Quick chips: Today, Tonight, Weekend, 7 Days; map chips to valid intervals given configured minimum lead time and operating hours.
2. Server returns cars available for that interval (minus approved bookings, checkouts, maintenance/manual blocks, and turnaround buffer). Pending requests may coexist; only confirmed reservations secure inventory.
3. See price summary: daily rate, calculated billable days, optional fees, deposit (refundable, not counted as rental income), total rental price, currency EUR. Default billable days = ceil(duration hours / 24), min 1; make it a documented business rule that can be configured later.
4. Enter essentials only: name, email, phone, optional message, terms/privacy acknowledgement. Create `REQUESTED` reservation; show a clear “Awaiting owner confirmation” state and reference.
5. Acknowledge receipt by email, **not confirmation**; email owner a new-request alert.
6. On owner acceptance, transactionally allocate the vehicle, transition to `CONFIRMED`, generate contract draft, send customer the confirmation, pickup address/time, required original documents and contact info.

### Owner: fleet
1. Log into `/admin` securely.
2. Add a vehicle: make, model, model year, trim, transmission, fuel, seats, day price, deposit, images, plate (private), description, features, rules, visibility, status.
3. Save as draft or publish; listing is never auto-published without owner action.
4. Set manually blocked intervals and maintenance dates. Owner can mark car as out-of-service.
5. Open bookings list/calendar; confirm/reject/cancel via server action. Conflict errors explain which dates are already occupied.
6. Before pickup, preview/print contract. At pickup, verify **original** driving licence and identity document, complete any strictly required missing details with the customer, confirm signatures offline and move to `PICKED_UP`.
7. Record return and transition to `RETURNED`; note condition and mileage if enabled.

## 4. Visual direction — APPROVED WHITE / THREE-COLOR SYSTEM (mandatory)

**Owner-approved design update:** The customer website **and especially the admin dashboard** must be bright, minimal, professional, and consistent. **Do not build a dark admin panel, dark mode, multicolor UI, or colorful SaaS dashboard.**

### Strict UI palette (maximum three base colors)
| Role | Color | Hex | Usage |
|---|---|---|---|
| Primary background | Pure white | `#FFFFFF` | Main canvas, cards, menus, modals, forms |
| Primary text and actions | Graphite | `#171717` | Headings, readable body copy, icons, active navigation, primary CTA buttons |
| Subtle surface and dividers | Light gray | `#F3F4F6` | Alternate sections, inactive states, panels, separators, row hover |

- **No additional UI accent colors**: no blue, gold, purple, green, red, gradients, neon, tinted charts or multicolor badges. Vehicle photographs are naturally full color; the three-color rule applies to interface chrome and graphics.
- Use opacity variants of graphite only if needed for secondary text, light borders, hover states and charts; do not introduce new accent hues. Validate text contrast against WCAG standards. Convey booking states using **labels + icons + borders + type weight**, not only hue (e.g. outlined `Requested`, solid graphite `Confirmed`, struck-through `Cancelled`).
- **No theme switch**. Light theme only for admin and public pages. Override default shadcn/Tailwind primary, ring, chart and status-token colors so components cannot accidentally render colored highlights.

### Admin panel layout
- White canvas, restrained light-gray left sidebar, graphite active tab indicator. On desktop use a 240–256px sidebar, quiet top bar, roomy content area. On mobile collapse navigation to a sheet/drawer; tables horizontally scroll only where necessary.
- Dashboard: clear page title with date, 3–4 compact monochrome KPI cards, `Today’s pickups`, `Pending requests`, `Available vehicles`, and a readable reservation table. Cards stay white with subtle neutral separation; no distracting shadows or giant charts.
- Fleet management: high-density but legible list with thumbnail, vehicle, registration (staff-only), rate, availability and quick actions. New-car form grouped into basics, pricing, photos and availability.
- Calendar: monochrome intervals distinguished with labels, hatching/border patterns or varying graphite opacity, with clear textual legends; no rainbow categories.
- Booking detail: customer/contact summary, pickup-return timestamps, price/deposit breakdown, activity log, and one obvious `Confirm booking` primary graphite button.

### Customer website layout
- White editorial automotive visual language with high-quality (licensed or owner-supplied) car photos, large type, whitespace and elegant graphite CTAs. Avoid dark hero overlays as a default and avoid unnecessary animation.
- Vehicle cards: crisp image, model and specs, clear euro-per-day rate, simple neutral chips; search/date controls prominent and touch-friendly.
- Do not imply illustrative model photos show the specific rental vehicle; mark them `Illustrative image` until owner's photographs are uploaded.

### Typography and finish
- Modern sans (e.g. Inter or Geist), 8px spacing grid, consistent corner radius (8–12px), minimal borders, accessible keyboard focus and crisp responsive type hierarchy.
- Favor restrained professional quality over trendy decorative effects. Preserve loading, empty/error/success states without new colors.
- **Visual acceptance check:** screenshot `/`, `/cars`, `/admin`, `/admin/bookings`, `/admin/vehicles` at desktop and mobile sizes and verify a white/light-gray/graphite visual system with no extra accent hues.

## 5. Routes

Public:
- `/` landing + date search + featured vehicles
- `/cars` browse and filter
- `/cars/[slug]` detail, availability and CTA
- `/booking/[vehicleId]` booking form and quote
- `/booking/success?ref=...` safe confirmation state (no private data exposed by reference alone)
- `/faq`, `/contact`, `/terms`, `/privacy`

Admin:
- `/admin/login`
- `/admin` today/next 7 days dashboard + KPI
- `/admin/vehicles` inventory
- `/admin/vehicles/new`, `/admin/vehicles/[id]` management
- `/admin/bookings` searchable table
- `/admin/bookings/[id]` reservation, actions, contract
- `/admin/calendar` fleet-wide timeline
- `/admin/customers` minimal customer CRM
- `/admin/settings` business details, office hours, turnaround time, email, policies, contract template settings

## 6. Recommended stack
- Next.js App Router + TypeScript, Tailwind CSS, shadcn/ui, Lucide icons
- PostgreSQL on Supabase, Supabase Auth and Storage
- Drizzle ORM + migrations (or Prisma only if existing repo already uses it)
- Zod input validation; server actions/route handlers; React Hook Form if useful
- date-fns or Luxon with `Europe/Ljubljana` business timezone and UTC storage
- Resend + React Email for transactional emails
- `@react-pdf/renderer` for contract PDF generation (only owner-approved template, no invented legal provisions)
- Vitest/unit tests + Playwright for critical flows
- Vercel deployment, env-based DEMO_MODE, observability/logger with PII redaction

No paid AI API is required. If adding a model-photo search later, integrate an approved/licensed image provider with attribution and a **manual owner approval step**. Primary path is owner-uploaded photos.

## 7. Database model

`profiles`: user_id PK, role (`OWNER`/`STAFF`), created_at. Only administrative staff.

`business_settings`: id, legal_name, trading_name, address, public_contact, locale, timezone, pickup_hours JSON, min_notice_minutes, buffer_minutes, rental_day_policy, contract_template_version.

`vehicles`: id, slug, make, model, trim, year, category, registration_plate_private, transmission, fuel, seats, doors, luggage, description, features JSON, daily_rate_cents, refundable_deposit_cents, minimum_driver_age nullable, minimum_license_years nullable, published, active, created_at, updated_at.

`vehicle_images`: id, vehicle_id FK, storage_path nullable, external_url nullable, source (`OWNER_UPLOAD`/`LICENSED_CATALOG`/`DEMO_PLACEHOLDER`), attribution nullable, is_primary, sort_order. Validate owner rights to images.

`vehicle_blocks`: id, vehicle_id, start_at timestamptz, end_at timestamptz, reason (`MAINTENANCE`/`MANUAL`/`OTHER`), created_by.

`customers`: id, full_name, email, phone, billing_address nullable, created_at; sensitive details only when necessary and legally justified.

`bookings`: id, public_ref unique random non-sequential, vehicle_id FK, customer_id FK, pickup_at timestamptz, return_at timestamptz, status (`REQUESTED`, `CONFIRMED`, `REJECTED`, `CANCELLED`, `PICKED_UP`, `RETURNED`), rental_price_cents, deposit_cents, price_snapshot JSON, terms_accepted_at, customer_note, confirmed_at, created_at, updated_at, internal_note nullable.

`vehicle_allocations`: id, vehicle_id, start_at, end_at, booking_id nullable, block_id nullable, active bool. Use Postgres `btree_gist` and an `EXCLUDE USING gist` constraint on vehicle equality and `tstzrange(start_at, end_at, '[)') &&` **WHERE active = true**. Allocations include turnaround buffers, so concurrent approvals cannot double-book. Booking confirmations and allocation inserts run within the **same transaction**. Manual blocks use the same allocation system. Ensure cancellation frees allocation only with authorized, audited action.

`contracts`: id, booking_id, template_version, frozen_data JSON (minimized), pdf_storage_path private, generated_at, signed_at nullable, signed_offline bool.

`notification_outbox`: id, booking_id, event_key unique, recipient_email, template, payload JSON minimized, status, attempts, sent_at. Send only after transaction commit, retry idempotently.

`audit_events`: id, actor_id nullable, booking_id nullable, vehicle_id nullable, action, metadata JSON sanitized, created_at.

Indexes on vehicle/status/dates, booking status/date, emails. Admin-only views of customer data. No secrets in browser bundles. No unrestricted public tables.

## 8. Domain rules and status machine
- Customers create `REQUESTED` only. Requests do not guarantee the car; don't email “confirmed” until server-side owner approval succeeds.
- Owner may approve `REQUESTED` → `CONFIRMED` when no overlapping active allocation; reject → `REJECTED` or cancel → `CANCELLED`.
- `CONFIRMED` → `PICKED_UP` → `RETURNED` under owner control.
- Staff-controlled cancellation frees allocation (while retaining history). Returned bookings remain historically allocated, but past intervals don't affect future availability.
- Validate `pickup_at < return_at`, minimum notice, pickup operating hours, rental minimum/maximum, age/licence requirements where configured, non-negative amounts.
- Store timestamps in UTC; compute/display relative to Europe/Ljubljana, including DST changes. Use half-open ranges `[pickup, return)` and append configurable cleaning/turnaround buffer for resource occupancy.
- Calculate quotes server-side; store immutable pricing snapshot on submission; owner must see exact price before confirmation.
- Never trust a client-supplied price, customer ID, user role or booking status.

## 9. Security, GDPR and legal
- Public users don't need accounts. Anti-abuse rate limiting/honeypot; no public private customer list.
- Session-based admin authentication. Authorize every server action on the server and use RLS; the service-role secret stays server-side.
- For the basic online request collect only name, email, phone, dates and necessary acceptance records. Don't request passport/ID card or driver's licence scans in the pitch MVP; have the owner verify **original** documents in person. If more document information is needed to prefill a real contract, confirm precise requirements, lawful basis, retention, and secure process before enabling it.
- Make contract PDFs and uploads private with signed expiring URLs; log access; support a deletion/retention policy set by the business. Do not include private customer data in public references, analytics logs or email subject lines.
- The business must provide contract wording, terms, cancellation/deposit policies, and required eligibility rules; request local legal review before real-world use.
- Avoid downloading random online car photos. Use owner photos or properly licensed catalog assets; show source attribution where required, and mark stock photos illustrative.

## 10. Transactional email events
1. `BOOKING_REQUESTED_CUSTOMER`: “We received your request #ABC123; awaiting confirmation.”
2. `BOOKING_REQUESTED_OWNER`: summary, interval, contact, dashboard link.
3. `BOOKING_CONFIRMED_CUSTOMER`: dates, car, pickup location, price/deposit, original docs reminder, contact, cancellation rules.
4. `BOOKING_REJECTED_CUSTOMER`: clear explanation, alternate contact path.
5. `BOOKING_CANCELLED_CUSTOMER`: status and next steps.

Never email sensitive ID numbers or scans. Use an outbox with idempotency keys; do not send approval emails until database confirmation is committed.

## 11. Contract PDF requirements
- Business legal identity, contact and location, rental agreement number/reference.
- Driver/renter name and required address fields (if legally required), car make/model and registration, pickup/return timestamps and location, price, deposit, optional extra fees, policies and signature blocks.
- Template must be approved by the business; no fabricated legal terms. Include a clear `DRAFT — NOT SIGNED` watermark until signed in person.
- Support print in A4. Only owner/staff can download it. Auto-fill from booking/vehicle/business data, permit completion of missing permitted fields at pickup.

## 12. User interface components
- `BookingSearch`: two date/time inputs, quick chips, location, search CTA.
- `VehicleCard`: image, title, important specs, daily price, “Available for selected dates” indicator, details button.
- `AvailabilityCalendar`: disabled unavailable intervals, mobile-friendly.
- `QuoteSummary`: rental duration, billable days, line items, deposit separately, total price.
- `BookingWizard`: 2-3 steps max; persistent steps; review before send.
- `AdminSidebar`, `KpiCard`, `FleetCalendar`, `VehicleEditor`, `BookingQueue`, `BookingStatusPill`, `ContractPreview`.
- Accessible loading, error, optimistic state only for reversible actions. Confirmations must reflect authoritative server status.

## 13. Seed data for pitch
- VW T-Cross, 2023, automatic, EUR 45/day, refundable deposit EUR 200; label image illustrative.
- BMW 4 Series Coupe, 2022, automatic, EUR 90/day, deposit EUR 400; illustrative.
- VW Golf, 2021, manual, EUR 39/day, deposit EUR 200; illustrative.
- A mix of 7 realistic bookings with `REQUESTED`, `CONFIRMED`, `PICKED_UP`, `RETURNED`; all test customer names/emails must be unmistakably fictitious and should not trigger real messages.
- Two maintenance blocks, one weekend booking, one same-day request. Demo business address/contact must be explicit placeholder, not a real business impersonation.

## 14. Acceptance criteria
1. A published vehicle displays on the public site and can be unpublished instantly by owner.
2. Searching a date/hour range shows availability consistent with bookings and maintenance blocks.
3. A customer can submit a valid request without creating an account; owner sees it and customer sees “Pending approval.”
4. Admin confirmation reserves the vehicle atomically. Two competing approvals for overlapping ranges cannot both succeed, even when triggered simultaneously.
5. An approved vehicle disappears from availability for overlapping intervals; an adjacent non-overlapping rental is allowed subject to buffer rules.
6. A customer email notification is queued exactly once per event and sent only when configured; demo mode never sends emails.
7. Admin can open a booking and generate a **draft** A4 contract with correct vehicle, renter and dates.
8. Customer cannot access `/admin` or any private documents, price updates cannot be manipulated from the browser, and unauthorized actions fail.
9. Forms work on iPhone-sized mobile screens. Basic Playwright tests cover core user journeys.
10. No pretend actual vehicle photos, no false booking success, no real payments, and no personal ID/driver licence scan in MVP.

## 15. Repository structure
```
src/
  app/
    (public)/page.tsx
    (public)/cars/page.tsx
    (public)/cars/[slug]/page.tsx
    (public)/booking/[vehicleId]/page.tsx
    (public)/booking/success/page.tsx
    (admin)/admin/login/page.tsx
    (admin)/admin/page.tsx
    (admin)/admin/vehicles/page.tsx
    (admin)/admin/bookings/page.tsx
    (admin)/admin/calendar/page.tsx
    api/health/route.ts
  components/
    public/{booking-search,vehicle-card,quote-summary}.tsx
    admin/{booking-queue,vehicle-editor,fleet-calendar}.tsx
    ui/
  lib/
    auth/   db/   booking/   pricing/   availability/
    contracts/   email/   validation/   demo/
  emails/
  styles/
  types/
drizzle/
tests/{unit,e2e}/
public/demo/
.env.example
README.md
```

## 16. Build order

### Slice A — pitch experience
- Scaffold Next.js, tokens, typography, navigation, mobile layout.
- Public landing, listing, details and booking request wizard.
- Admin dashboard, vehicle editor, bookings queue and calendar, meaningful seeded data.
- Demo request → admin approval → contract preview; demo state clearly marked.
- Clean README, screenshots, one-command run and clear demo walkthrough.

### Slice B — make it real
- PostgreSQL migrations, Supabase auth/storage, server-side role restrictions.
- Atomic inventory allocations and availability query, transactional booking states.
- Email outbox + Resend, A4 PDF, owner settings, image uploads.
- Integration tests, RLS, rate limits, data privacy pages, deployment.

### Slice C — additional business capabilities
- Deposits/payments, multilingual templates, pickup checks, revenue insights, extras.

**Progress rule for Codex:** Implement small complete vertical slices and run lint/typecheck/tests after each. Never fabricate a complete integration: surface missing credentials and keep demo mode functional. Prioritize a cohesive, working walkthrough over the breadth of a dashboard with dead buttons.

## 17. Pitch script (~60 seconds)

“Right now, every rental costs you messages, calls and paperwork. This would be your website and your business control center. You add a car, mark when it's available and publish. Customers see what's free for exactly the hours they want and submit a request. You approve with one click; the system blocks the car from being booked twice, emails the customer and prepares the rental agreement from their details. At pickup you verify the originals, sign the paperwork and hand over the keys. You can do all of it from your phone. We start with the website, dashboard and contract workflow, then add online deposits if you want them.”

## 18. Demo walkthrough checklist
- Owner logs into the demo dashboard. KPI cards and today's pickups visible.
- Owner adds a test VW T-Cross or toggles it published and blocks tomorrow morning.
- Switch to public site, filter dates, view this car and its price/specs.
- Submit a mock booking and watch its `REQUESTED` status in admin.
- Owner approves, sees `CONFIRMED`, the calendar updates.
- Open the contract PDF preview, show pre-filled fields and signature line.
- Close by showing phone-sized viewport and what can be customized (brand, pickup address, fleet, policies).

## 19. Commercial framing — illustrative offer, not a published market rate
- **Phase 1 concept/demo:** show prototype, refine based on the owner's workflow.
- **Setup / production launch:** discuss a fixed scope and quote only after learning fleet size, contract requirements, whether existing reservations must be imported, and whether payments are needed. A small-business initial proposal might be in the EUR 2,000–5,000 range for a defined MVP, depending on integrations and legal content readiness; this is a sales positioning idea, not a guaranteed market rate.
- **Ongoing care:** propose optional monthly hosting/maintenance and transactional email costs separately, based on actual usage and SLA.

## 20. Questions to resolve with owner before production
- Exact business/legal name and right to use “Sharetoo” branding?
- Number of cars, pickup locations, rental hours, turnaround gap, same-day minimum notice?
- Price policy: 24-hour day, calendar day or hourly? Minimum rental period? Seasonal surcharges?
- Deposits: cash/card, amount per model, refunds and cancellations?
- What legal fields must appear on existing contract template? Who provides approved text?
- Documents the owner currently checks at pickup, eligibility/minimum age, whether additional driver information is needed?
- Does the business need to import existing reservations and which contact email should receive requests?

## 21. Reference materials to verify before public launch
- Existing Slovenian Sharetoo brand: https://www.sharetoo.si/ and https://www.porscheleasing.si/fleetmanagement/sharetoo/
- Slovenian Information Commissioner on driver's licence copying and purpose/minimization: https://www.ip-rs.si/mnenja-gdpr/60489fb8dbfc6
- GDPR Article 5 data minimization principle: https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng/
