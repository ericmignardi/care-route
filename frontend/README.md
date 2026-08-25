# CareRoute — frontend

React 19 + TypeScript + Vite. See the [repository README](../README.md) for the product,
and [docs/PLAN.md](../docs/PLAN.md) for what each phase built.

## Run it

The API must be running first (`docker compose up -d` at the repository root, then
`./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` in `backend/`).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build
npm run lint
```

`VITE_API_URL` points the client at the API; see [.env.example](./.env.example). It can be
left unset locally — the axios client defaults to `http://localhost:8080/api/v1`.

## How it is organised

```
src/
  api/          axios client (withCredentials, 401 interceptor, ProblemDetail helpers)
  components/   ui/ design-system primitives · layout/ shell · routing/ guards
  features/     auth/ clients/ caregivers/ visits/ dashboard/
  hooks/        useDebounce
  stores/       authStore, toastStore (Zustand)
  context/      ThemeContext, ThemeProvider
  lib/          cn(), constants, dates, navigation, theme
  types/        api (ProblemDetail, PageResponse), auth (z.infer'd from the Zod schemas)
  routes.tsx
```

## Three things worth knowing before editing

**The design system lives in `src/index.css`.** Colour, type and spacing are CSS custom
properties transcribed from the [design canvas](../docs/DESIGN-BRIEF.md) under their own
names — `--pine`, `--ink-2`, `--mis-fg` — and `@theme inline` turns them into Tailwind
utilities (`bg-panel`, `text-ink-2`, `border-line`). Dark mode swaps the variables in one
`[data-theme="dark"]` block rather than needing a `dark:` variant on every element. Add a
token there; do not hardcode a hex in a component.

**Auth state has three values, not two.** `unknown | authenticated | anonymous`. The route
guards refuse to decide while the status is `unknown`, which is the frame between first
paint and `GET /auth/me` answering. Treating "not yet known" as "signed out" is what makes
a hard refresh bounce a signed-in user to the login screen.

**Nothing about the session is stored in the browser.** The JWT is in an httpOnly cookie
the frontend cannot read, and the Zustand store is memory-only by design — a persisted
store would let the back button restore a user the server has already signed out.

## Errors

The API returns RFC 7807 `application/problem+json`, and its `detail` is written to be read
by a person: *"Marcus Delaney is already booked 10:00–11:30."* Surface that, never a generic
failure string. `errorMessage(error)` extracts it, `errorRule(error)` gives the business
rule that rejected the request (`CAREGIVER_DOUBLE_BOOKED`, `CAREGIVER_MISSING_SKILL`, …) for
branching, and `fieldErrors(error)` gives the bean-validation map for replaying onto a form.
