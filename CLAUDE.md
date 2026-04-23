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

A `Template` has many `TemplateField`s (each with a `type` like `text`, `number`, `select`, `textarea`, `title`, `image`, `date`, `checkbox_group`, `bullseye`, `patient`, `user`, `measurement`). A `Report` is instantiated from a `Template` and stores per-field values in `ReportField`, plus structured `Measurement`s and narrative sections.

Templates also carry an optional structured `header_config` (JSON) — the new primary source for the report header — and an optional `department_id`. When `header_config` is null, renderers fall back to a hardcoded hospital letterhead (derived from the hospital context) and then to the template's "Header" section, so pre-existing templates keep working.

Three files you will read when working on reporting UX:
- `apps/web/components/form/TemplateFormRenderer.tsx` — renders fields by type, builds a Zod schema dynamically from field definitions, and contains domain helpers (age from DOB, BSA from height/weight, auto-composed summary textareas by field group). Accepts a `contexts` prop so `patient`/`user`/`hospital` fields can resolve their `options.binding` against live entity data.
- `apps/web/lib/template-renderer/renderPlan.ts` — converts a template + contexts bag into an ordered `RenderBlock[]`. The HTML and PDF renderers both consume this plan. Header source priority: `header_config` → legacy hardcoded → template "Header" section.
- `apps/api/app/Http/Controllers/Api/V1/TemplateController.php` + `TemplateResource` — support `filter.hospital_id`, `filter.test_id`, `filter.user_id`, optional `include=fields`, pagination; resource groups fields into sections (each with a `kind` label) when loaded, and surfaces `header_config` in attributes.

### Entity-driven template fields and the binding catalog

Template field `options` can carry an optional `binding`:

```jsonc
{
  "source": "hospital" | "patient" | "user" | "report" | "signatory" | "test" | "literal",
  "path":   "dob",             // required unless source=literal
  "value":  "Laporan Echo"     // required only when source=literal
}
```

Allowed `{source, path}` combinations are enforced by `App\Support\EntityBindingCatalog` (PHP) and mirrored by `apps/web/lib/template-renderer/schema/bindings.ts` (TS). Adding a new path requires editing both — `tests/Unit/EntityBindingCatalogTest.php` covers the server side and `TemplateFieldControllerTest` exercises the validator.

For `patient` / `user` field types, binding is required and `binding.source` must match the field type. For other field types, binding is optional; when present, the field becomes a read-only auto-filled display that the doctor can override in the form renderer.

### Render pipeline

```
TemplateController (API)
  └── grouped_sections[] { section, kind, items[] }, attributes.header_config
        │
        ▼
createTemplateViewModel  (apps/web/components/template-renderer/TemplateEngine.ts)
        │
        ▼
buildReportRenderPlan    (apps/web/lib/template-renderer/renderPlan.ts)
  ├── structured header from templates.header_config          (primary)
  ├── legacy hardcoded header from hospital context           (fallback)
  └── template-declared "Header" section                      (last resort)
        │
        ▼
HtmlView.tsx     (JSX)  ─ shared style tokens
PdfPreview.tsx   (pdfjs-dist over pdf-lib bytes)  ─ page nav / zoom / search
```

Both HTML and PDF consume the exact same `ReportRenderPlan`. Style tokens (`FONT_SIZE_HTML_CLASS` / `FONT_SIZE_PT`, `ALIGN_*`, `SPACING_*`, `IMAGE_SIZE_*`) live in `apps/web/lib/template-renderer/schema/styleTokens.ts` so the two views stay visually in sync.

### Hospital identity (report header source)

`hospitals` carries the fields a letterhead needs, separated into:
- must-have: `name`, `short_name`, `parent_org_line`, `address` / `address_line_1`+`_2`, `city`, `province`, `postal_code`, `country`, `phone`, `fax`, `whatsapp_phone`, `email`, `website`, `logo_url`, `secondary_logo_url`.
- repeatable (separate tables): `hospital_departments`, `hospital_installations`, `hospital_signatories`.

`reports.signatory_id` is the signature block source of truth. The template's signature section carries layout hints only — the name / position / SIP number come from `hospital_signatories`.

### Frontend patterns

- API client: `apps/web/lib/api.ts` (built on `ky`). `prefixUrl` comes from `NEXT_PUBLIC_API_BASE_URL`; bearer token is read from `localStorage.auth` when present.
- Data fetching: `useSWR` + `mutate` for refresh after writes. CRUD helpers for templates/patients/hospitals/users/reports live in `lib/api.ts`.
- App shell (`apps/web/app/layout.tsx`) wraps pages with Sidebar/Header/Footer + `SidebarProvider`. Primary routes live under `app/(app)/` (reports, templates, patients, hospitals, users).
- PDF generation is client-side via `pdf-lib` in `apps/web/lib/pdf.ts` (`renderPlanToPdfBytes` returns a `Uint8Array`; `downloadPdfPlan` is the thin "Save as" wrapper). The `?mode=pdf` view uses `PdfPreview.tsx` which decodes those bytes with `pdfjs-dist` and renders a viewer with page navigation, zoom, and text search.
- UI convention: shadcn table/card/form components. No inline styles.

### Backend patterns

- Routing: `apps/api/routes/api.php` mounts versioned routes from `api_v1.php` under `/api/v1`, plus `GET /api/ping` and hospital logo upload/delete (`POST|DELETE /api/v1/hospitals/{hospital}/logo`).
- v1 uses `Route::apiResource` for templates, template-fields, patients, reports, tests, hospitals, users.
- Controllers live in `app/Http/Controllers/Api/V1/`. They validate, query Eloquent (often with eager loads), and return API Resources. Keep this shape — do not return raw models.
- Seeders (`DatabaseSeeder`) populate users, hospitals, patients, tests, templates, a comprehensive TEE template field set, reports, report fields, and measurements — useful demo data after `migrate --seed`.

## Things that will surprise you

- **Auth is partially wired.** The API side is live: `routes/api.php` wraps all `/api/v1` resources in `auth:sanctum`, and admin-only resources (`hospitals`, `users`) additionally require `role:admin`. The web side still uses `auth-provider.mock.tsx` in the default layout (the real `auth-provider.tsx` exists). So on the backend you *do* need a token; the web client reads it from `localStorage.auth`. Don't wire auth-dependent features without unifying both sides.
- **Two README sources are slightly stale.** Root `README.md` and `AGENTS.md` mention Laravel 11; `composer.json` pins `^12.0`. Trust `composer.json`.
- **No root workspace manager.** `pnpm install` at the root only installs `apps/web` because the root `package.json` has no workspaces field — api deps come from Composer.
- **Filter/include query params** follow `filter.<field>=value` and `include=<relation>` conventions (see `TemplateController`). Match this style when adding new list endpoints.

## Git workflow for this session

Active branch: `claude/doctorforms-fullstack-AOq9q`. Develop, commit, and push here.
