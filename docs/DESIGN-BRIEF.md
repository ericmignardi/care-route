# CareRoute — Design Brief

This document contains a self-contained prompt to paste into **Claude Design**. Everything the designer needs is inside the prompt block; you should not need to explain the product separately.

**How to use it:** paste the block below in one go. When the canvas comes back, refine individual artboards conversationally rather than re-prompting from scratch. Export the screens you settle on and keep them beside you while building Phases 4–6.

**One note before you paste:** resist the urge to ask for more screens than are listed. Seven artboards you actually build beats fifteen you admire. The follow-up prompts at the bottom are for after the first pass lands.

---

## The prompt

> Design the UI for **CareRoute**, a scheduling and visit-management web app for a home and community care agency in Ontario, Canada. Coordinators schedule caregiver visits to clients' homes; caregivers check in, complete care-plan tasks, and check out from their phones in the field.
>
> ### Who uses it
>
> **Dana, a coordinator.** Desk-based, dual monitors, manages about 40 visits a day across 15 caregivers. She lives in this tool for eight hours at a stretch. Density and scannability matter far more to her than whitespace or delight.
>
> **Marcus, a caregiver.** On his phone, one-handed, standing on a client's porch in February with gloves on. He needs three things — where am I, check in, check out — at a glance and with large targets.
>
> These two need genuinely different interfaces, not the same layout at two widths.
>
> ### Art direction
>
> Avoid the sterile clinical-SaaS default: cold blue, pure white, drop shadows, rounded-everything. This is **care work** — the tone should read as warm, competent, and calm. Think a well-made professional instrument rather than a consumer app or a hospital form.
>
> Specifically:
>
> - **Base palette:** warm neutrals — bone, oatmeal, warm greys — instead of pure white and cool grey. Text in a deep warm ink, not pure black.
> - **Primary accent:** a deep, slightly desaturated pine or forest green. Grounded and Canadian; it reads as health without reading as a hospital.
> - **Status colours** for the five visit states, distinguishable in both light and dark mode and **never carried by hue alone** — pair every status with an icon or a text label, since coordinators scan these hundreds of times a day and some of them are colour-blind:
>   - Scheduled — neutral / slate
>   - In progress — amber, the only status that should feel active on the page
>   - Completed — green, quiet and receded, not celebratory
>   - Cancelled — muted grey, visibly de-emphasised
>   - Missed — terracotta or clay rather than alarm red; this is a serious operational event, not a system error
> - **Typography:** a distinctive but sober display face for page titles and numerals paired with a highly legible UI sans for everything else. **Tabular figures are mandatory** anywhere times or counts appear — a schedule grid where the digits do not align vertically looks broken.
> - **Depth:** hairline borders and subtle tonal shifts rather than drop shadows. Flat, layered, precise.
> - Full **dark mode** for both surfaces. Caregivers work early mornings and late evenings.
>
> ### Screens to design
>
> **1. Coordinator — Schedule board (desktop, 1440px). This is the centrepiece; give it the most attention.**
> A time grid: caregivers as rows down the left, hours across the top, visits as positioned blocks. Date navigation, a today button, filters for status and skill. Unassigned visits sit in a distinct holding area — a top rail or a side tray — visually urgent because they represent someone who may not receive care. Blocks show client name, time range, and required skill, and must stay legible at a 30-minute height. Show the grid populated with about 15 caregivers and 40 visits so the density is real, and include a hover state on a visit block.
>
> **2. Coordinator — Assign caregiver dialog. The signature interaction of the product.**
> Opened from an unassigned visit. It lists **every** caregiver, split into eligible and ineligible — and the ineligible ones are *shown, not hidden*, each with the specific reason it cannot be them:
>
> ```
> Sarah Whitfield      Booked 10:00–11:30
> Marcus Delaney       Not available Tuesdays
> Priya Raman          Missing qualification: NURSING
> Tom Alcott           Eligible
> ```
>
> This transparency is the whole point of the product — a coordinator should understand her constraints, not just be handed a shortened list. Design the reason line so it reads as informative rather than as an error. Eligible entries are clearly selectable; ineligible ones are de-emphasised but fully readable.
>
> **3. Coordinator — Dashboard (desktop).**
> Four KPI tiles (visits today, unassigned, in progress, completion rate), a visits-per-day bar chart for the current week, and an actionable list of unassigned upcoming visits. Unassigned is the number that should draw the eye. Make the tiles feel like instrument readouts, not marketing cards.
>
> **4. Coordinator — Client detail (desktop).**
> Header with name, address, phone, and status. Two columns: an editable care-plan task list on one side, chronological visit history on the other. Calm and reference-like — this screen is read far more often than edited.
>
> **5. Caregiver — My day (mobile, 375px). Design this as a genuinely mobile-first screen, not a squeezed desktop table.**
> A vertical timeline of today's visits. The current or next visit is a prominent card with the client name, address, time window, and a large primary action — Check in or Check out — sized for a gloved thumb. Past visits collapse into quiet completed rows. Include an empty state for a day with no visits.
>
> **6. Caregiver — Visit detail with task checklist (mobile, 375px).**
> Client name and address, a status timeline showing scheduled → checked in → checked out with real timestamps, a care-plan task checklist with large tap targets and satisfying completed states, a notes field, and a check-out button that is clearly the terminal action. Show it mid-visit: checked in, some tasks done, some not.
>
> **7. Component sheet.**
> Buttons (primary, secondary, ghost, destructive; default, hover, active, disabled, loading), text inputs and selects (default, focused, error, disabled, with helper text), the five status badges, a data table row with sort affordances, modal chrome, toast notifications for success and for a rejected action, skeleton loaders, and an empty state. Include visible keyboard focus rings — the build targets WCAG AA, and focus states designed in are worth ten retrofitted later.
>
> ### Rules that apply everywhere
>
> - Every asynchronous view needs three designed states: loading, empty, and error. The empty states should be genuinely helpful, with a next action, not a shrug and an illustration.
> - When the server rejects an action — a double-booking, an out-of-window check-in — the message must be specific and human ("Marcus is already booked 10:00–11:30"), never "An error occurred". Design a toast that can hold a real sentence.
> - Realistic Canadian content throughout: Ancaster, Dundas, and Hamilton street addresses; a plausible mix of names; times on a 24-hour or consistent 12-hour clock. **No lorem ipsum** — placeholder text hides layout problems that real content exposes.
> - WCAG AA contrast in both light and dark mode.
> - The coordinator screens should feel dense and efficient. The caregiver screens should feel large, calm, and unmistakable. Both should feel like the same product.
>
> Deliver each screen as its own artboard on one canvas, desktop and mobile grouped separately, with the component sheet last.

---

## Follow-up prompts

Once the first pass lands, refine one artboard at a time:

- "The schedule board blocks get unreadable below 45 minutes. Show me three alternative treatments for short visits."
- "Make the dashboard tiles feel more like instrument readouts and less like marketing cards."
- "Show the assign dialog with 20 caregivers where only 2 are eligible — does the layout still hold?"
- "Give me the dark mode variant of the schedule board."
- "The Missed status is competing with In progress for attention. Rebalance them."
- "Show the caregiver day view for someone with 7 visits, and for someone with 1."

## Feeding the result back into the build

The design maps onto Phase 4 and 5 in [PLAN.md](./PLAN.md):

| Design output | Where it lands |
|---|---|
| Component sheet | Phase 4 — the `components/ui` primitives |
| Colour and type decisions | Phase 4 — Tailwind theme tokens in `index.css` |
| Screens 1, 2 | Phase 5 — schedule board and assign flow |
| Screens 3, 4 | Phase 5 and 6 — dashboard and client detail |
| Screens 5, 6 | Phase 5 — caregiver mobile surface |

Build the component sheet into Tailwind tokens **first**, before any screen. Extracting the design system up front is what stops the five screens from drifting apart.
