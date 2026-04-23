# DoctorForms Codebase Structure Guide

This guide is intended for newcomers to the DoctorForms monorepo.

## 1) What this codebase is

DoctorForms is a monorepo with two primary applications:

- `apps/web`: Next.js frontend (TypeScript, Tailwind, shadcn/ui)
- `apps/api`: Laravel backend API (JSON resources, Sanctum-ready auth)

The domain centers around structured medical reporting workflows (especially echocardiography), with entities like hospitals, users, patients, templates, reports, report fields, and measurements.

## 2) High-level repository structure

At the root level, the key directories/files are:

- `apps/web` — frontend app
- `apps/api` — backend app
- `docs` — sample/report PDFs and schema references
- `README.md` — repo overview and setup

Root scripts are designed to run each app from the monorepo root:

- `pnpm dev:web`
- `pnpm lint:web`
- `pnpm typecheck:web`
- `pnpm test:api`

## 3) Frontend structure (`apps/web`)

### App shell

The global app layout wraps pages with:

- `Sidebar`
- `Header`
- `Footer`
- `SidebarProvider`

You can find this in `apps/web/app/layout.tsx`.

### Navigation and primary screens

Main app routes are centered around:

- Reports
- Hospitals
- Patients
- Users
- Templates

Sidebar links live in `apps/web/components/sidebar.tsx`.

### Data fetching and API client

The frontend centralizes API calls in `apps/web/lib/api.ts` using `ky`.

Notable behavior:

- `prefixUrl` is read from `NEXT_PUBLIC_API_BASE_URL`
- Bearer token is read from localStorage key `auth` (if present)
- CRUD helpers exist for templates, patients, hospitals, users, reports

### UI and page pattern

A typical page (for example `apps/web/app/(app)/reports/page.tsx`) follows this pattern:

- Fetch lists via `useSWR`
- Normalize/map related resources for display
- Render with shadcn table/card/input/select components
- Trigger API mutations and refresh via SWR `mutate`

### Dynamic template rendering (important)

`apps/web/components/form/TemplateFormRenderer.tsx` is a key component:

- Renders server-defined fields by type (`text`, `number`, `select`, `textarea`, `title`, `image`, `checkbox_group`, `date`, `bullseye`, `patient`, `user`, `measurement`)
- Builds a Zod schema dynamically from field definitions
- Resolves entity bindings (`options.binding`) at render time — `patient`/`user`/`hospital` fields auto-fill from the `contexts` prop and remain editable (an override shows a "revert" link)
- Supports helpers such as:
  - auto age from DOB
  - auto BSA from height/weight
  - auto-composed summary textarea from grouped fields

This is one of the most important files for understanding report authoring UX.

### Render pipeline

Template rendering is a four-stage pipeline:

1. **API** — `TemplateController::show` returns `meta.grouped_sections[]` (each with `kind`) and `attributes.header_config`.
2. **View model** — `apps/web/components/template-renderer/TemplateEngine.ts` normalizes fields into a typed `TemplateViewModel`.
3. **Render plan** — `apps/web/lib/template-renderer/renderPlan.ts` takes the view model plus a contexts bag (hospital/patient/user/report/signatory/test) and emits an ordered `RenderBlock[]`. Header priority: structured `header_config` → legacy hardcoded from hospital context → template "Header" section.
4. **Views** — `HtmlView.tsx` and the pdf-lib renderer in `apps/web/lib/pdf.ts` both iterate the same plan. Shared style tokens in `apps/web/lib/template-renderer/schema/styleTokens.ts` keep HTML and PDF consistent.

The structured header block is admin-editable via `HeaderConfigEditor.tsx` in the template builder. Bindings are whitelisted by `App\Support\EntityBindingCatalog` (PHP) mirrored by `apps/web/lib/template-renderer/schema/bindings.ts` (TS).

### Auth status in current code

API side: all `/api/v1` resources are behind `auth:sanctum`, with `role:admin` gating on `hospitals` and `users`. Web side: the default layout uses `auth-provider.mock.tsx` while a real `auth-provider.tsx` exists. The `ky` client reads the bearer token from `localStorage.auth` when present.

### PDF generation and preview

`apps/web/lib/pdf.ts` builds PDFs with `pdf-lib` and exposes two entry points:

- `renderPlanToPdfBytes(plan)` — returns a `Uint8Array`; consumed by the in-browser viewer.
- `downloadPdfPlan(plan)` — thin "Save as" wrapper.

`apps/web/components/template-renderer/PdfPreview.tsx` decodes those bytes with `pdfjs-dist` (worker loaded locally via `new Worker(new URL(..., import.meta.url))`, no CDN) and renders a viewer with prev/next page, zoom -/+/reset, text search with match counter, and a Download button.

## 4) Backend structure (`apps/api`)

### Routing and versioning

`apps/api/routes/api.php` defines:

- `GET /api/ping` health endpoint
- login / forgot-password / reset-password under `/api/v1`
- everything else in `/api/v1` is wrapped in `auth:sanctum`, including the `me` / `logout` endpoints and the `api_v1.php` resource group

`apps/api/routes/api_v1.php` groups `Route::apiResource(...)` endpoints under `/api/v1` for:

- templates
- template-fields
- patients
- reports
- tests
- hospitals (admin-only)
- users (admin-only)

Hospital sub-resources expanded via `?include=departments,installations,signatories` on the hospital show/index endpoints.

### Controller + resource response pattern

Controllers in `app/Http/Controllers/Api/V1` generally:

- validate request data
- query Eloquent models (often with relationships)
- return API resources

Example:

- `TemplateController` supports filtering (`filter.hospital_id`, `filter.test_id`, `filter.user_id`), optional includes (`include=fields`), and pagination.
- `TemplateResource` shapes JSON:API-like payloads and computes grouped sections when fields are loaded.

### Models and relationships

Core Eloquent models are in `apps/api/app/Models`.

Examples:

- `Report` belongs to user/hospital/patient/template/test/signatory; has many fields and measurements. `signatory_id` is the signature block source of truth.
- `Template` has many template fields; carries optional `header_config` (JSON) and `department_id`. Can instantiate a report with default field values.
- `Hospital` holds the identity fields used by the report header (`short_name`, `parent_org_line`, `address_line_1/2`, `postal_code`, `country`, `fax`, `whatsapp_phone`, `secondary_logo_url`, `accreditation_text`, `report_footer_line`) and has many `HospitalDepartment`, `HospitalInstallation`, `HospitalSignatory`.

### Database and seeders

Migrations in `apps/api/database/migrations` define schema, including report/report_fields tables and foreign keys.

`DatabaseSeeder` wires baseline seeders for users, hospitals, patients, tests, templates, template fields, reports, report fields, and measurements.

This makes local demo/testing flows easier after `migrate --seed`.

### Tests

Pest tests live under `apps/api/tests`.

Feature tests cover resource controllers (e.g., reports/templates CRUD and response structure).

## 5) Important things to know before contributing

1. **Template-driven reporting is central**
   - Templates + template fields drive report form behavior and stored report field values.
2. **Frontend favors reusable patterns**
   - `lib/api.ts` + SWR + shadcn table/forms are the standard pattern.
3. **Backend favors resource responses and validation**
   - Keep API responses consistent with Resources and existing controller style.
4. **Auth is scaffolded but not fully activated by default**
   - Be careful when adding auth-dependent features.
5. **Monorepo guardrail**
   - Keep edits scoped to `apps/web` or `apps/api` as appropriate.

## 6) Suggested learning path for newcomers

1. Follow one vertical feature end-to-end (recommended: Reports):
   - web page (`apps/web/app/(app)/reports/page.tsx`)
   - web API client (`apps/web/lib/api.ts`)
   - API controller (`apps/api/app/Http/Controllers/Api/V1/ReportController.php`)
   - model/resource/tests

2. Deep dive into template rendering:
   - `TemplateController` + `TemplateResource`
   - `TemplateFormRenderer.tsx`

3. Run quality checks early:
   - Web: lint + typecheck
   - API: tests

4. Then explore auth wiring:
   - `auth-provider.mock.tsx` vs `auth-provider.tsx`
   - commented auth routes in `apps/api/routes/api.php`

## 7) Useful reference files

- Root overview: `README.md`
- Frontend shell: `apps/web/app/layout.tsx`
- Frontend API client: `apps/web/lib/api.ts`
- Dynamic form engine: `apps/web/components/form/TemplateFormRenderer.tsx`
- Backend route entry: `apps/api/routes/api.php`
- Backend v1 resources: `apps/api/routes/api_v1.php`
- Example controller: `apps/api/app/Http/Controllers/Api/V1/ReportController.php`
- Example resource: `apps/api/app/Http/Resources/Api/V1/TemplateResource.php`
- Seed orchestration: `apps/api/database/seeders/DatabaseSeeder.php`
