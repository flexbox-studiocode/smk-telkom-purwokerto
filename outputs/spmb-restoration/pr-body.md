The existing `/spmb` information page was still in the repository, but the admissions redirect guard intercepted it before routing and information links pointed to the external enrollment portal. This restores the original information page selectively while keeping enrollment on the official portal.

Source history: `d801fef` (original page), `9de3d41` / `a6f5a64` (management), `e2161a6` (current MySQL backend). The hiding changes were `9578b7e` and `a89a6f2`. No repository rollback or replacement page was needed.

Changes
- Restore information navigation, footer/quick access/carousel destinations, prefetch and SEO; keep legacy registration redirects token-safe.
- Normalize Prisma ISO dates for existing forms/schedules, preserve Published filtering in public reads with admin sessions, and forward cancellation signals.
- Restore settings field mapping so the existing Admin Panel can manage the academic year and admission status.
- Complete English translations for all original seed content, including safe rich text translation. Keep the current shared hero, original artwork/gradient and decorations; no global CSS changes.
- No new endpoint/schema/authentication system or dummy runtime data.

Validation
- Real local MySQL/API integration: admin login/CSRF, CRUD, anonymous mutation rejection, publication filtering, dates and aggregate statistics.
- Real Admin UI: create/edit/publish/draft/delete, date edits, public synchronization, and public draft isolation within an admin session. Settings changes reached the public hero/status and original values were restored.
- ID/EN at 1920, 1440, 1280, 1024, 820, 390 and 320 px, compared with Jurusan. Matching desktop hero heights/type scale, no horizontal overflow; minimum desktop CTA clearance approximately 78 px.
- Official portal regression: 68 route/language/viewport cases and 11 safe legacy redirects.
- ESLint, hero structure, language suite (81 rendered views), SPMB validation/adapter/translation tests, rich text sanitization, CI build and offline SEO checks for 101 routes.
- Independent review completed; entity escaping finding fixed and regression-tested.

Limits
- Production database/deployment and physical devices were not tested. Local DB initially had no SPMB content or admin; browser QA used temporary records from original migration 012 and a temporary admin, all cleaned afterward. Offline CI output must not be deployed.
- Existing WhatsApp contact remains source-backed in `spmbInfo.js`; the original model has no dedicated admin WhatsApp field.
- Original dynamic seed text is translated. New arbitrary admin text without a dictionary entry retains its source language; no automatic translation/schema extension was introduced.

Base: `fix/hero-consistency-audit`, which contains merged PR #133. Current main does not yet contain the full preceding hero stack; this keeps this PR scoped to restoration. Do not merge automatically.

Detailed sources, file mapping, evidence and limits: `frontend/docs/spmb-restoration-2026-11-08.md`.
