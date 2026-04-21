# DoctorForms Web App (`apps/web`)

Next.js 15 frontend for DoctorForms.

## Requirements

- Node.js 20+
- pnpm 9+

## Environment

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_ASSET_BASE_URL=http://localhost:8000/
```

## Run

From repository root:

```bash
pnpm -C apps/web dev
```

## Quality checks

```bash
pnpm -C apps/web lint
pnpm -C apps/web typecheck
```

## Notes

- Report detail view supports `mode=html|pdf|form`.
- API responses are consumed from the Laravel backend under `/api/v1`.
