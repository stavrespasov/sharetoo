# Sharetoo implementation plan

Prepared 16 November 2026. Proposed scope for approval.

This plan combines the supplied PRD and start prompt with the requested redesign, quick vehicle entry, optional voice input, temporary availability and pricing, incremental GitHub commits, and Vercel hosting. Implementation resumes after the owner approves this plan. The existing PRD remains the baseline for requirements that this plan does not revise.

## 1. Verified starting point

- GitHub repository `stavrespasov/sharetoo` exists, is public, and grants write access. Its default branch is `main`. The repository currently contains a README.
- The connected Vercel team is `stavrespasov's projects`. Project discovery returned no projects in that team. Create and connect the Sharetoo project during the approved implementation.
- The local workspace contains a preliminary Next.js/TypeScript scaffold, dependencies, booking types, date handling, pricing utilities, and the supplied specification. Public pages, the admin application, and completed tests remain to be built.
- Supabase is connected. Its Free organization currently has two active projects and no Sharetoo project. Current Free pricing limits active projects to two. A new free Sharetoo database therefore needs another eligible option or an available slot.
- The supplied photograph establishes the curved road symbol and italic Sharetoo wordmark. Prepare a clean digital brand asset from that reference during implementation. Use configurable `Sharetoo Concept` branding for the speculative demo, as specified in the start prompt.

## 2. Product target

Deliver one coherent, working rental demo with a polished public storefront and complete owner dashboard. An owner can prepare and publish a car from a short description, a customer can request its available dates, and the owner can approve, prepare a draft agreement, record pickup, and record return.

All three surfaces use the same vehicle, pricing, and availability rules. Public listings, owner calendar, and booking forms must agree after every relevant action. The demo uses fictitious renters, illustrative photography, simulated email events, and explicit demo status.

## 3. Visual system

| Element | Design decision |
| --- | --- |
| Palette | White `#FFFFFF`, graphite `#171717`, light gray `#F3F4F6`, with graphite opacity for borders and secondary text |
| Typography | Archivo Narrow for selected large automotive headlines, Geist for interface labels, body copy, forms, and tables |
| Brand | Clean road emblem and wordmark based on the supplied photograph, with configurable project title |
| Layout | Spacious editorial storefront, compact task-focused admin, consistent 8px spacing grid |
| Shapes | Restrained 8–12px corners, simple separators, consistent icon sizes |
| Actions | Solid graphite primary buttons, outlined secondary buttons, clear keyboard focus |
| Motion | Short 160–240ms transitions for navigation, drawers, cards, and feedback, with reduced-motion support |
| Status | Explicit labels and icons, outlined or filled graphite treatments |
| Photography | Large, sharp vehicle media with consistent crop and illustrative labels where applicable |

The design is light-only. Palette checks cover menus, date inputs, focus rings, charts, errors, browser autofill, dialogs, and disabled states. No fabricated testimonials, inflated business metrics, or invented rental policies are added.

## 4. Public website

### Home and navigation

- Desktop uses a clear editorial headline, prominent vehicle photograph, and immediately visible pickup/return search.
- Mobile uses a compact logo header, a simple menu sheet, large touch targets, and a short route to date selection.
- The search accepts pickup and return date and time, displays the Ljubljana timezone, and includes Today, Tonight, Weekend, and 7 Days shortcuts that obey office hours and lead time.
- The rest of the page presents available vehicles, a concise explanation of requesting and collecting a car, factual pickup information, FAQ, and contact details.
- Slovenian and English cover navigation, search, vehicle details, booking, validation, confirmations, and essential owner actions.

### Browse and details

- Filter by class, transmission, seats, fuel, and price. Sort by total rental price for the selected interval.
- Show the relevant trip total alongside the daily rate. Keep refundable deposit separate.
- Preserve dates and filters when navigating between results, vehicle details, and booking.
- Vehicle pages include gallery, verified specifications, features, rental requirements, pickup details, availability, and an editable quote.
- Mobile vehicle pages use a compact sticky price/action area with safe-area spacing and room above the keyboard.
- If unavailable, show the blocking dates and offer valid nearby dates or suitable other cars.
- Useful empty, loading, validation, offline, and retry states belong to every interactive screen.

### Booking

1. Choose car and interval, then inspect the quote.
2. Enter name, email, phone, optional note, and required acknowledgement.
3. Review and submit once, then see a reference and an explicit awaiting-approval state.

Retain entered details when the user goes back or a request fails. A repeated submit uses an idempotency key. The server recalculates hosted quotes from current authoritative rules and stores a pricing snapshot. A protected status link can show later updates without exposing renter information through a guessable reference.

## 5. Owner dashboard

| Area | Required working behavior |
| --- | --- |
| Overview | Today/week selector, pickups, returns, pending requests, available cars, clear next actions, and metrics calculated from demo records |
| Quick entry | Describe or dictate a car, availability, or temporary price, review extracted fields and listing preview, save draft or publish |
| Fleet | Add, edit, duplicate as draft, publish/unpublish, upload and order photos, set active status, archive while preserving booking history |
| Requests and bookings | Search, filter, inspect quote and renter, confirm/reject/cancel, record pickup and return, internal notes, activity history |
| Calendar | Desktop fleet timeline and mobile agenda, date navigation, bookings and maintenance, clear conflict explanations |
| Availability and offers | Bookable windows, maintenance/manual blocks, temporary rate offers, start/end dates, automatic expiry based on current time |
| Customers | Minimal contact directory and booking history with staff-only access |
| Agreements | Pre-filled A4 draft, print/save-to-PDF action, original-document and offline-signature checklist |
| Settings | Business identity, contact, pickup location, office hours, lead time, buffer, rental limits, language, voice preferences, template version |
| Demo controls | Seed/reset a demonstration workspace and inspect simulated email events |

Desktop uses a light-gray sidebar and quiet toolbar. Mobile uses a small bottom navigation for Overview, Bookings, Fleet, and More, with calendar and settings in More. Tables become readable stacked records when appropriate. Details open in drawers on desktop and full-height sheets on mobile. Dirty forms warn before discarding edits. Successful actions show concise confirmation, and failures preserve the entered data.

## 6. Describe a car, with optional voice

The same text field supports typing, pasting, phone keyboard dictation, and a microphone button where supported.

Example input for the demo dated 16 November 2026

> Add a black VW T-Cross 2023, automatic, 45 euros a day, 200 euro deposit, available from Friday to Monday.

The application produces an editable card immediately below the field.

| Field | Proposed result |
| --- | --- |
| Make and model | Volkswagen T-Cross |
| Year | 2023 |
| Color | Black |
| Transmission | Automatic |
| Daily rate | EUR 45 |
| Refundable deposit | EUR 200 |
| Availability | Friday 20 November through Monday 23 November 2026, with exact times shown for review |
| Description | Short Slovenian and English copy composed from confirmed facts |
| Image | Best available catalog suggestion, with its source and illustrative status |
| Missing details | Fuel, trim, luggage, seats, and any other unconfirmed specifications highlighted for completion |

### Interpretation rules

- Use a deterministic parser for supported English and Slovenian commands, common model aliases, colors, euro amounts, relative dates, and year formats. Show examples next to the entry field.
- Assign extracted values an origin such as spoken, typed, catalog suggestion, or business default. Unknown facts stay visibly incomplete.
- Suggestions from a verified model catalog are editable. Trim-dependent equipment, eligibility, deposits, and prices require an explicit source or configured owner default.
- Show unresolved fragments and ambiguous dates next to the relevant field. Convert relative language to exact Ljubljana dates before applying it.
- Distinguish creating a new vehicle from editing an existing one. If several vehicles match, present the matching vehicles for selection.
- Repeated submission uses the same draft identifier. A model/year match is only a duplicate warning because a fleet may contain several identical cars.
- Create the draft and public-card preview automatically. The owner explicitly chooses Save draft or Publish, consistent with the original PRD.
- Commands that affect existing records show the proposed changes first. Existing bookings and maintenance remain authoritative.

### Voice behavior and cost

- Start with browser speech recognition where available and ordinary text entry everywhere.
- Provide language selection, microphone permission handling, visible recording state, stop/cancel, transcript editing, and recovery from silence or recognition failure.
- Browser and language support varies. Some implementations send audio to a browser-provider service. Explain that when activating the microphone and avoid retaining raw audio in the app.
- Phone keyboard dictation remains available through the standard text field, depending on device settings.
- Parsing and templated copy require no paid AI API. Runtime generative writing and paid transcription can be considered later with a separately agreed budget.
- Physical iPhone/Brave microphone behavior requires a real-device check. Desktop emulation can verify layout and fallback, and mocked speech events can verify application handling.

## 7. Availability and temporary prices

Support an additional command such as “Offer this Golf for 35 euros per day this weekend.” The owner chooses the vehicle, reviews exact dates and rate, and publishes the offer.

- Store availability windows and temporary pricing as separate records from the permanent vehicle.
- A window explicitly limits when that listing is bookable. A rate offer changes pricing for its eligible interval. The editor explains and previews the selected effect.
- Reject overlapping price offers for the same vehicle until the owner resolves them.
- Apply the temporary daily rate only when the entire requested rental fits inside its offer window. Show the applicable rate and conditions before submission. Use the normal rate for other eligible intervals.
- Keep the existing ceil-duration/24-hour billing rule and deposit separation.
- Freeze the submitted quote. Later price changes affect new requests.
- Availability checks combine listing windows, active status, approved rentals, manual blocks, maintenance, and turnaround time.
- “Available” commands cannot override confirmed rentals or maintenance. Show the conflict and offer editing of the requested window.
- Calculate offer activity from dates when reading data, so expiry works without a background timer.

## 8. Vehicle image workflow

1. Prefer photos uploaded by the owner, including direct phone-camera upload.
2. For the three seed models, prepare a small consistent illustrative catalog and reuse it immediately in previews.
3. Add an optional Find model photo action that retrieves candidate images from a provider with clear reuse metadata, starting with Wikimedia Commons where suitable.
4. Show source, author, license, model match, and any visible year/color mismatch. The owner selects a candidate before it becomes the published photo.
5. Preserve credit and license information with the asset and expose required attribution on the website.
6. If no suitable candidate exists or retrieval fails, keep the draft usable with its catalog image or an honest placeholder and an upload action.

Exact make, year, trim, and color matches are subject to image availability. Illustrative images remain labeled. The initial implementation can match the controlled catalog without paid image search or runtime image generation.

## 9. Booking correctness and demo boundaries

- Preserve REQUESTED, CONFIRMED, REJECTED, CANCELLED, PICKED_UP, and RETURNED transitions.
- Pending requests can coexist. Confirmation allocates inventory and queues a single simulated confirmation event.
- For a shared Postgres deployment, use database exclusion constraints and transactional approval so competing overlapping approvals cannot both succeed. Manual blocks use the same allocation mechanism.
- Cancellations release future allocation while retaining the audit history. Returns preserve the historical rental interval.
- Test minimum notice, office hours, turnaround gaps, leap dates, daylight-saving changes, and round-up billing.
- Private registration plates, renter contacts, internal notes, and contract documents stay behind owner access in hosted mode.
- Demo emails appear in a clearly labeled event timeline. The contract is marked DRAFT — NOT SIGNED and uses placeholder agreement text.
- Public demo visitors use isolated fictitious workspaces. A demo login is explicitly described as simulated. Real customer operations require production authentication and approved business documents.

## 10. Architecture and hosting

- Retain Next.js App Router, TypeScript, Tailwind, shadcn/ui conventions, Lucide, Zod, and Ljubljana-aware date handling.
- Keep pricing, availability, command parsing, and booking transitions in shared domain modules with meaningful tests.
- Use one repository interface with an isolated persisted browser demo adapter and a shared Postgres adapter. Browser demo data survives reload in the same browser profile. It does not synchronize between devices.
- The target hosted walkthrough uses shared Postgres when provisioning is available, enabling customer/owner testing across separate sessions and devices.
- Given the current Supabase project limit, evaluate Neon Free through Vercel Marketplace for a dedicated Sharetoo database. Neon is available there with plans starting at zero. Verify account eligibility, resource plan, and any consent requirements before provisioning. An available Supabase project slot is another supported option.
- Provider connection or free-capacity issues do not prevent finishing the interactive browser demo. Report its exact scope if it is the delivered fallback. Shared persistence remains an explicitly pending acceptance item until verified.
- Use durable object storage for uploaded photos in shared mode. Browser demo uploads remain in the local demo store. Confirm storage eligibility with the selected provider during setup.
- Vercel Functions use a read-only filesystem with temporary scratch space. Persist hosted application records in the database and uploaded media in durable storage.
- Use environment configuration for brand and demo mode. Keep private configuration outside Git history. Verify the Vercel team, project, branch, and deployed commit before release.
- Voice and template-based entry have no application AI subscription. Database and hosting costs depend on eligible plans and usage. Vercel's Hobby terms limit use to personal or non-commercial purposes, so verify the appropriate hosting plan for a commercial rental launch.

## 11. Execution sequence and commits

Each milestone ends with focused checks, a meaningful commit, and an updated progress record in the repository. Approval of this plan authorizes implementation of the proposed scope. Any new paid subscription requires a separate cost decision.

| Milestone | Deliverable | Exit condition |
| --- | --- | --- |
| 1. Establish source and design | Bring the existing repository into the workspace, reconcile the starter, commit approved plan, define typography/tokens/logo, create Vercel preview wiring | Clean install, initial build, desktop/mobile shell renders |
| 2. Shared domain and demo state | Seed fleet, bookings, settings, quote rules, availability, persistence adapter, isolated demo workspace | Unit tests cover prices, timezones, overlap, and transitions |
| 3. Customer journey | Home, browse, details, booking wizard, success/status, FAQ/contact/policies | Customer request appears in the same workspace's owner queue |
| 4. Owner operations | All admin pages, vehicle editor, blocks, approval/rejection, calendar, pickup/return, draft agreement, simulated messages | Create → publish → request → approve → unavailable → agreement → pickup → return passes |
| 5. Quick entry | Parser, draft preview, completeness checks, microphone support, catalog selection, availability windows, temporary offers | Supported commands generate correct editable drafts and typed fallback works |
| 6. Shared hosting adapter | Eligible database and image storage, migrations, server validation, owner access, atomic allocations | Separate customer/owner sessions share state and concurrent approval tests pass |
| 7. Finish and release | Responsive refinements, keyboard testing, bilingual errors, source credits, documentation, verified Vercel build | Required checks pass and the deployed revision completes the acceptance flow |

If hosted resource setup requires an account decision, continue independent milestones and document the exact decision required. Keep tested milestones runnable. Use a working branch with regular pushes and Vercel previews, then release the verified revision through the repository's main branch after the agreed scope passes.

## 12. Acceptance checklist

- [ ] Typed car description produces correct editable fields and a preview.
- [ ] Speech success, permission refusal, unsupported browser, and missing language recover cleanly.
- [ ] Missing facts and ambiguous dates are visible before publication.
- [ ] Drafts stay off the public listing until published.
- [ ] Owner uploads and illustrative catalog selection work, with image provenance retained.
- [ ] Date-specific offers display accurate eligibility and totals.
- [ ] Customer date/filter selections survive the complete journey.
- [ ] A valid request appears once with a stable reference and immutable quote.
- [ ] Approval reserves the vehicle and changes search results and calendar consistently.
- [ ] Concurrent shared-database approvals allow exactly one conflicting reservation.
- [ ] Maintenance, buffers, cancellation, pickup, and return behave correctly.
- [ ] The same shared data appears in separate sessions when the hosted adapter is enabled.
- [ ] Demo persistence survives reload, with visitor isolation and a working reset.
- [ ] Agreement print preview contains the correct renter, car, dates, price, deposit, and draft label.
- [ ] Each notification event is recorded once and clearly marked simulated.
- [ ] Admin changes and private booking fields are protected in shared owner mode.
- [ ] All admin pages perform their advertised actions and handle failures.
- [ ] Key routes render at 390px, 768px, and 1440px widths without accidental horizontal overflow.
- [ ] Keyboard navigation, modal focus, labels, contrast, and reduced motion work.
- [ ] English and Slovenian essential flows are checked.
- [ ] Lint, typecheck, unit tests, end-to-end checks, and production build pass.
- [ ] Deployed Vercel URL and GitHub commit are recorded, with any remaining limitations stated.

## 13. Sources checked for planning

- Browser speech recognition availability and server-based behavior. https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
- Reuse and attribution of Commons images. https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/licenses
- Supabase Free limits and inactivity policy. https://supabase.com/pricing
- Neon through Vercel Marketplace and plans starting at zero. https://vercel.com/marketplace/neon/neon
- Vercel Functions filesystem behavior. https://vercel.com/docs/functions/runtimes
- Vercel Hobby use restrictions. https://vercel.com/legal/terms

Pricing and platform support were checked on 16 November 2026 and require confirmation at resource setup. Repository, Vercel project discovery, and Supabase organization status were checked through the connected accounts. Approval is pending.
