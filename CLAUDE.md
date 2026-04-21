# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

Monorepo with two apps. Keep changes scoped to one app at a time.

- `apps/web` — Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui
- `apps/api` — Laravel 12 + Sanctum-ready + Pest

Root `package.json` only contains wrapper scripts for each app; there is no workspace tool. Install deps per app:

```bash
pnpm install                          # root + web (pnpm)
cd apps/api && composer install       # api
```

## Common commands

Run from repo root:

```bash
pnpm dev:web          # Next.js dev server (port 3000)
pnpm lint:web         # next lint
pnpm typecheck:web    # tsc --noEmit
pnpm test:api         # cd apps/api && php artisan test (Pest)
```

API server (run from `apps/api`):

```bash
php artisan serve --host=127.0.0.1 --port=8000
php artisan migrate --seed            # schema + demo data
php artisan test --filter=SomeTest    # run a single Pest test by name
```

Required web env (`apps/web/.env.local`):

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_ASSET_BASE_URL=http://localhost:8000/
```

## Definition of done

- Web changes: `pnpm lint:web` and `pnpm typecheck:web` both clean.
- API changes: `pnpm test:api` passes. Prefer adding/adjusting Pest tests when changing behavior.

## Architecture

### Template-driven reporting is the core domain

A `Template` has many `TemplateField`s (each with a `type` like `text`, `number`, `select`, `textarea`, `title`, `image`, `date`, `checkbox_group`, `bullseye`). A `Report` is instantiated from a `Template` and stores per-field values in `ReportField`, plus structured `Measurement`s and narrative sections.

Two files you will read when working on reporting UX:
- `apps/web/components/form/TemplateFormRenderer.tsx` — renders fields by type, builds a Zod schema dynamically from field definitions, and contains domain helpers (age from DOB, BSA from height/weight, auto-composed summary textareas by field group).
- `apps/api/app/Http/Controllers/Api/V1/TemplateController.php` + `TemplateResource` — support `filter.hospital_id`, `filter.test_id`, `filter.user_id`, optional `include=fields`, pagination; resource groups fields into sections when loaded.

### Frontend patterns

- API client: `apps/web/lib/api.ts` (built on `ky`). `prefixUrl` comes from `NEXT_PUBLIC_API_BASE_URL`; bearer token is read from `localStorage.auth` when present.
- Data fetching: `useSWR` + `mutate` for refresh after writes. CRUD helpers for templates/patients/hospitals/users/reports live in `lib/api.ts`.
- App shell (`apps/web/app/layout.tsx`) wraps pages with Sidebar/Header/Footer + `SidebarProvider`. Primary routes live under `app/(app)/` (reports, templates, patients, hospitals, users).
- PDF export is client-side via `pdf-lib` in `apps/web/lib/pdf.ts`. Report detail supports `mode=html|pdf|form`.
- UI convention: shadcn table/card/form components. No inline styles.

### Backend patterns

- Routing: `apps/api/routes/api.php` mounts versioned routes from `api_v1.php` under `/api/v1`, plus `GET /api/ping` and hospital logo upload/delete (`POST|DELETE /api/v1/hospitals/{hospital}/logo`).
- v1 uses `Route::apiResource` for templates, template-fields, patients, reports, tests, hospitals, users.
- Controllers live in `app/Http/Controllers/Api/V1/`. They validate, query Eloquent (often with eager loads), and return API Resources. Keep this shape — do not return raw models.
- Seeders (`DatabaseSeeder`) populate users, hospitals, patients, tests, templates, a comprehensive TEE template field set, reports, report fields, and measurements — useful demo data after `migrate --seed`.

## Things that will surprise you

- **Auth is scaffolded but not wired.** The header uses `auth-provider.mock.tsx` (no-op). The real `auth-provider.tsx` exists but is not in the default layout. On the API side, login/logout/user routes are present in code but **commented out** in `apps/api/routes/api.php`. Don't assume an authenticated user; don't wire auth-dependent features without updating both sides.
- **Two README sources are slightly stale.** Root `README.md` and `AGENTS.md` mention Laravel 11; `composer.json` pins `^12.0`. Trust `composer.json`.
- **No root workspace manager.** `pnpm install` at the root only installs `apps/web` because the root `package.json` has no workspaces field — api deps come from Composer.
- **Filter/include query params** follow `filter.<field>=value` and `include=<relation>` conventions (see `TemplateController`). Match this style when adding new list endpoints.

## Git workflow for this session

Active branch: `claude/init-project-setup-cZsmI`. Develop, commit, and push here.
