# TODO

## In Progress
None - All tasks completed.

## Next Up
Ready for additional features or improvements.

## Completed (2026-01-14)
- [x] Refactored App.tsx into smaller focused components (PresentationSidebar, EditorPanel, PreviewPanel).
- [x] Reduced App.tsx from 266 lines to 155 lines for better maintainability.
- [x] Added gray color palette to Tailwind config for UI consistency.
- [x] Validated system end-to-end - all components healthy.
- [x] Confirmed 86/86 backend tests passing.
- [x] Verified all API endpoints functional (CRUD, preview, export, themes).
- [x] Validated Docker containers running without errors.
- [x] Confirmed CLI workflows match API behavior - created test script validating all commands.
- [x] Addressed SQLAlchemy deprecation warning - migrated from declarative_base to DeclarativeBase.
- [x] Integrated Tailwind + shadcn with a wide, slick, two‑color UI (sky blue + purple) and icons:
  - Configured Tailwind with custom primary/secondary color palettes.
  - Created shadcn-style UI components (Button, Input, Select).
  - Added lucide-react icons throughout the interface.
  - Rebuilt App.tsx with clean Tailwind classes and gradient backgrounds.
  - Wide layout with sidebar, main editor, and preview panel.
  - Created validation scripts for testing and screenshots.
- [x] Validated system health and Docker logs - both containers running correctly.
- [x] Tested core API endpoints - all CRUD, preview, export, and theme APIs functional.
- [x] Verified frontend running on port 3000 with correct static assets.
- [x] Confirmed Marp preview/export functionality - HTML and PDF exports working.
- [x] Fixed 6 failing backend tests:
  - Unicode filename sanitization test (expected length correction).
  - Integration test for invalid format (422 vs 400 status code).
  - Marp service HTML rendering tests (proper mocking of file operations).
  - Cache rendering test (proper mocking of file operations).
  - Batch export exception handling (patching render_export instead of render_to_pdf).
  - Export error test (patching render_export instead of render_to_pdf).
- [x] All 86 backend tests now passing.
- [x] Stabilized backend APIs and logging.
- [x] Verified Marp preview/export reliability end‑to‑end.
- [x] Ensured CRUD workflows are consistent and safe.
- [x] Theme application and consistency verified.
- [x] Restore historical `tasks.md` and `todo.md` files.

## Required Updates (Always)
- [x] Before each change: read `README.md`, `PRD.md`, `ARCHITECTURE.md`, `tasks.md`, and `todo.md`.
- [x] For every task: validate via APIs, Docker logs, and Playwright UI checks with screenshots.
- [x] After each change: update `todo.md` to reflect progress and realign with current goals.
- [x] `tasks.md` and `todo.md` must never be deleted—only corrected and updated.
