# DoctorForms Monorepo

DoctorForms is a full-stack medical reporting platform for structured echocardiography workflows.  
This repository contains:

- **`apps/web`**: Next.js 15 frontend (TypeScript + Tailwind + shadcn/ui)
- **`apps/api`**: Laravel API backend (JSON resources + Sanctum-ready auth)

---

## What the platform does

DoctorForms helps clinicians and staff:

- Manage **hospitals**, **users**, **patients**, **templates**, and **reports**.
- Build and maintain **structured reporting templates** with grouped form fields.
- Create reports from templates and store:
  - narrative sections (findings/conclusion)
  - dynamic template answers
  - measurements (name/value/unit/category)
- Upload and manage **hospital logos** for branding.
- Preview the report PDF in-browser (page navigation / zoom / text search) and download when ready.
- Structured hospital **header block** (`header_config`) so admins configure letterhead once per template; entity bindings (`options.binding`) auto-fill patient/user/hospital fields at render time.

---

## Monorepo structure

```text
.
├── apps/
│   ├── web/    # Next.js frontend
│   └── api/    # Laravel backend API
├── docs/       # sample report docs/pdf references
└── README.md
```

---

## Core feature map

### Frontend (`apps/web`)

- Dashboard shell with shared **header / sidebar / footer**.
- CRUD screens for:
  - **Reports** (`/reports`, `/reports/new`, `/reports/[id]`, `/reports/[id]/edit`)
  - **Templates** (`/templates`, `/templates/new`, `/templates/[id]`, `/templates/[id]/edit`)
  - **Patients** (`/patients`, `/patients/new`, `/patients/[id]`)
  - **Hospitals** (`/hospitals`, `/hospitals/new`, `/hospitals/[id]`)
  - **Users** (`/users`, `/users/new`, `/users/[id]`)
- Reusable table/card UI with shadcn components.
- Data fetching via **SWR** and API client built with **ky**.
- Dynamic form renderer supporting multiple field types:
  - `text`, `number`, `select`, `textarea`, `title`, `image`, `date`, `checkbox_group`, `bullseye`, `patient`, `user`, `measurement`
- Entity-bound fields (`options.binding`) auto-resolve against hospital / patient / user / report / signatory contexts; doctors can still override in the form.
- Structured header block editor for templates (logos, lines, font / weight / alignment / margin tokens).
- Form helpers in report entry flow:
  - age auto-calc from DOB
  - BSA auto-calc from height/weight
  - auto-composed textarea summaries by field group
- Client-side PDF generation (`pdf-lib`) + in-browser PDF viewer (`pdfjs-dist`) with page nav, zoom, and text search.
- Hospital logo upload component integrated to API endpoint.
- Auth context scaffolding exists; current header uses mock auth provider by default.

### Backend (`apps/api`)

- REST API under `/api/v1` for:
  - templates
  - template fields
  - patients
  - reports
  - tests
  - hospitals
  - users
- Dedicated hospital logo endpoints:
  - `POST /api/v1/hospitals/{hospital}/logo`
  - `DELETE /api/v1/hospitals/{hospital}/logo`
- JSON API-style responses using Laravel API Resources.
- Validation for all write endpoints.
- Pagination support on list endpoints.
- Filtering support on selected resources (e.g., templates, patients, template fields).
- Data model links across user/hospital/patient/test/template/report domains.
- Seeder set for baseline/demo data (including TEE/TTE tests and a large default TEE template field set).
- Pest feature tests covering controllers and important behaviors.

---

## Data entities (high level)

- **User**: application users/staff.
- **Hospital**: healthcare organization; supports logo path/url.
- **Patient**: demographics and clinical context.
- **Test**: modality (seeded examples include TEE and TTE).
- **Template**: report blueprint owned by user/test/hospital.
- **TemplateField**: dynamic field definitions within templates.
- **Report**: generated report bound to patient/template/test/hospital/user.
- **ReportField**: value entries per template field for a report.
- **Measurement**: structured numeric/text measurements attached to report.

---

## API overview

Base URL (local default): `http://localhost:8000/api`

### Health

- `GET /ping` → simple `{ ok: true }` response.

### Versioned resources (`/v1`)

- `GET|POST /templates`
- `GET|PATCH|DELETE /templates/{id}`
- `GET|POST /template-fields`
- `GET|PATCH|DELETE /template-fields/{id}`
- `GET|POST /patients`
- `GET|PUT|PATCH|DELETE /patients/{id}`
- `GET|POST /reports`
- `GET|PUT|PATCH|DELETE /reports/{id}`
- `GET /tests`
- `GET|POST /hospitals`
- `GET|PUT|PATCH|DELETE /hospitals/{id}`
- `GET|POST /users`
- `GET|PUT|PATCH|DELETE /users/{id}`
- `POST /hospitals/{hospital}/logo`
- `DELETE /hospitals/{hospital}/logo`

> Note: Login/logout routes are scaffolded in frontend and controller code, but auth API routes are currently commented out in `apps/api/routes/api.php`.

---

## Local development

## 1) Prerequisites

- Node.js 20+
- pnpm 9+
- PHP 8.2+
- Composer
- SQLite/MySQL (SQLite easiest for local)

## 2) Install dependencies

From repo root:

```bash
pnpm install
```

Backend dependencies:

```bash
cd apps/api
composer install
```

## 3) Environment setup

### Web (`apps/web/.env.local`)

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

If your API serves from a different host/port/path, update accordingly.

### API (`apps/api/.env`)

Create from example and set app/database values:

```bash
cd apps/api
cp env.example .env
php artisan key:generate
```

Recommended local SQLite config:

```env
DB_CONNECTION=sqlite
DB_DATABASE=/absolute/path/to/apps/api/database/database.sqlite
```

Then run migrations + seeds:

```bash
php artisan migrate --seed
```

## 4) Run the apps

From repo root:

```bash
pnpm dev:web
```

In another terminal:

```bash
cd apps/api
php artisan serve --host=127.0.0.1 --port=8000
```

Open:

- Web: `http://localhost:3000`
- API: `http://localhost:8000/api/ping`

---

## Quality checks

From the repository root:

- Web lint:

```bash
pnpm lint:web
```

- Web typecheck:

```bash
pnpm typecheck:web
```

- API tests:

```bash
pnpm test:api
```

---

## Seeded/demo data

Running API seeders populates example records for:

- users
- hospitals + user-hospital links
- patients
- tests (including TEE, TTE)
- templates
- template fields (includes a comprehensive TEE structured report template)
- reports + report fields + measurements

This gives you immediately usable data for exercising list/detail workflows in the web app.

---

## Notes and current limitations

- Frontend auth UI currently uses a mock auth provider in the header; real auth provider remains available but not wired into layout by default.
- API side all `/api/v1` resources are gated by `auth:sanctum`, with `role:admin` on hospitals and users.
- Reports detail `?mode=pdf` is an in-browser preview (`pdfjs-dist` over `pdf-lib` bytes) with page nav, zoom, and text search; "Download PDF" is still one click.

---

## Tech stack summary

### Web

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui + Radix UI
- SWR
- react-hook-form + zod
- pdf-lib
- pdfjs-dist

### API

- Laravel 12
- Sanctum package installed (auth-ready)
- Pest testing framework
- Eloquent + API Resources

---

## Contributing tips

- Keep changes scoped to the app you are modifying (`apps/web` or `apps/api`).
- For frontend changes: keep lint and typecheck passing.
- For backend changes: keep tests passing.
- Prefer adding/adjusting tests when changing backend behavior.
