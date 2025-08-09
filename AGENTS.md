# Goals & guardrails
- apps/web: Next.js + TypeScript + Tailwind + shadcn/ui.
- apps/api: Laravel 11 + Sanctum + ApiResponses trait.
- Keep edits scoped to the app being worked on.

# DoD
- Web: lint + typecheck clean.
- API: tests pass.

# Priorities
1) Correctness
2) Tests 
3) Maintainability 
4) Perf (if measurable)

# Conventions
- Web: shadcn table pattern; no inline styles.
- API: Form Requests for validation; Resources for responses.
