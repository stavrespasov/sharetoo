# Codex kickoff prompt — Sharetoo Rental

Read and follow `SHARETOO_CODEX_PRD.md` in the repo root. Implement **Slice A (pitch demo)** first as a complete vertical slice; do not start Slice B until Slice A works end to end.

**MANDATORY DESIGN APPROVAL — read before any styling:**
- The owner wants a **WHITE, LIGHT-ONLY admin panel** and matching professional, predominantly white public website. **Do not create a dark dashboard or a dark/light toggle.**
- Enforce a **maximum three-color UI palette**: white `#FFFFFF`, graphite `#171717`, and light gray `#F3F4F6`. Colored vehicle photography is fine; buttons, navigation, charts, status chips, shadows, dividers and components must not add colored accents. Use graphite opacity if needed.
- Primary actions: solid graphite background with white text. Secondary actions: white with graphite border/text. Background: white. Sidebar/alternate surfaces: light gray. Statuses: text/icon/outline variations rather than red, green or orange badges. Accessible contrast and clear focus styles.
- Make admin pages calm, spacious, precise and premium: white layout, light-gray sidebar, neat tables, small monochrome KPIs, simple calendar, no neon, no gradients, no decorative oversized dashboard charts.
- This directive supersedes any older dark, carbon/gold or colorful UI instructions in existing project code or notes. Implement the approved palette consistently in shared tokens/theme files and test the final rendered screens.

**Working agreement:**
- If this is an existing repo, inspect its structure, dependencies and git status first. Preserve working code and follow established conventions.
- If the repo is empty, scaffold Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui and Lucide icons. Write clean, production-minded code and meaningful fixtures; no dead buttons.
- Create a `DEMO_MODE` implementation that requires no API keys and clearly labels any mock data, simulated email and illustrative car images. Admin authentication is a simulated restricted demo only in demo mode; never suggest it is real security.
- Public-facing project title should be configurable with `NEXT_PUBLIC_BRAND_NAME`; default to “Sharetoo Concept” and include a README reminder that Sharetoo is an existing third-party mobility brand and rights must be confirmed before public launch.
- Build premium automotive UI, not a generic template. Customer site should be mobile-first with an exceptional homepage, vehicle detail pages, date-and-time rental search, quote breakdown and short booking request form.
- Build a real interactive admin demo with dashboard KPIs, vehicles CRUD, availability blocking, request inbox, booking status actions, calendar and print-ready draft contract preview.
- Implement a reusable booking domain and pricing utilities with unit tests and clear upgrade path to persistent transactional Postgres allocations. Simulated data must **never** be represented as truly booked inventory.
- Create realistic fictitious vehicle data for VW T-Cross, BMW 4 Series Coupe and VW Golf (clearly label illustrative model photos; do not scrape copyrighted images).
- For the booking demo, show a request as `REQUESTED`, then on owner approval mark `CONFIRMED`, adjust displayed availability and show a mock queued confirmation email event. The real version will use an atomic database transaction.
- PDF should be labeled `DRAFT — NOT SIGNED` and contain **placeholder sample agreement text only** until legal wording is supplied by the owner. Do not invent a binding rental contract.
- Use Slovenian and English content, EUR prices, and Europe/Ljubljana business timezone.
- Build accessible, responsive, polished states: loading, empty, errors, success and mobile; use no fake metric claims in UI.
- Deliver a useful README with setup, architecture, what's demo-only, test commands, limitations and production next steps.

**Execution order:**
1. Inspect/scaffold and define the **approved three-color light-only** tokens, components and shared booking types.
2. Implement public journey, then admin journey, then connect their common demo state.
3. Add booking calculation and date-overlap tests. Include concurrency as a production risk in README until DB-backed locking exists.
4. Add print-friendly agreement preview and simulated email timeline.
5. Run lint, typecheck, tests and build; fix reported errors; summarize what is working and what still needs credentials or production work.

**Acceptance demo:** Create a car → publish → select dates on public site → request booking → approve in admin → see availability change → preview agreement. Ensure this works in a single running app without external services. When done, stop and report setup/run instructions plus the list of verified flows.
