# TASKS - Marp Presentation Builder

## TASK 1: Project Foundation & Alignment
**Goal**: Establish shared direction, guardrails, and project hygiene.

### Outcomes:
- Project goals, scope, and priorities are clear.
- Documentation aligns with the current direction.
- Working agreements are explicit and followed.

### Required validation:
- Verify backend health and key APIs respond.
- Check Docker logs for errors/warnings related to this task.
- Use Playwright to load the UI and take screenshots for baseline comparison.
- Update `todo.md` to reflect current in‑progress status.

---

## TASK 2: Backend Core & API Stability
**Goal**: Ensure the API is reliable, consistent, and observable.

### Outcomes:
- APIs are stable and return expected responses.
- Logging is actionable and helps diagnose failures.
- Error handling is predictable and clear.

### Required validation:
- Hit core APIs and confirm correct status/data.
- Inspect Docker logs for runtime issues.
- Use Playwright to confirm UI flows that depend on the APIs.
- Update `todo.md` to reflect current in‑progress status.

---

## TASK 3: Marp Rendering & Export Reliability
**Goal**: Ensure preview and export functionality is dependable.

### Outcomes:
- Preview renders without errors.
- Export formats (PDF/HTML/PPTX) succeed reliably.
- Failures provide actionable messages.

### Required validation:
- Call preview/export APIs and confirm output.
- Inspect Docker logs for rendering errors.
- Use Playwright to export from the UI and capture screenshots.
- Update `todo.md` to reflect current in‑progress status.

---

## TASK 4: Data Integrity & CRUD Workflow
**Goal**: Ensure presentation CRUD flows are correct and safe.

### Outcomes:
- Create, update, list, delete flows behave correctly.
- Data persistence is stable and consistent.

### Required validation:
- Exercise CRUD APIs directly.
- Inspect Docker logs for storage errors.
- Use Playwright to complete CRUD flows in the UI.
- Update `todo.md` to reflect current in‑progress status.

---

## TASK 5: Theme System & Style Consistency
**Goal**: Provide a clear, cohesive theming system.

### Outcomes:
- Themes apply consistently across preview and export.
- Theme selection is predictable and visible.

### Required validation:
- Exercise theme APIs and confirm responses.
- Inspect Docker logs for theme load errors.
- Use Playwright to apply themes and capture screenshots.
- Update `todo.md` to reflect current in‑progress status.

---

## TASK 6: Tailwind + shadcn UI Integration
**Goal**: Use Tailwind + shadcn to deliver a polished UI.

### Outcomes:
- UI uses Tailwind utilities and shadcn components.
- Design is a wide layout with a slick, two‑color palette and shades.
- Icons are used intentionally across the UI.

### Required validation:
- Verify styling loads in dev and prod.
- Inspect Docker logs for frontend build/runtime errors.
- Use Playwright to validate layout and take screenshots for aesthetics.
- Update `todo.md` to reflect current in‑progress status.

---

## TASK 7: Frontend UX & Responsiveness
**Goal**: Create a pleasant, efficient UI across devices.

### Outcomes:
- Responsive layout works on desktop and mobile.
- Core UI flows are smooth and predictable.
- Accessibility basics are respected.

### Required validation:
- Verify UI behavior via Playwright.
- Capture screenshots on desktop and mobile sizes.
- Inspect Docker logs for frontend errors.
- Update `todo.md` to reflect current in‑progress status.

---

## TASK 8: CLI & Tooling Experience
**Goal**: Make CLI and tooling trustworthy and clear.

### Outcomes:
- CLI workflows align with API behavior.
- Output is consistent and easy to understand.

### Required validation:
- Run representative CLI flows.
- Inspect Docker logs for CLI‑triggered errors.
- Use Playwright to confirm UI state after CLI actions.
- Update `todo.md` to reflect current in‑progress status.

---

## TASK 9: Documentation & Operational Readiness
**Goal**: Ensure documentation reflects reality and supports contributors.

### Outcomes:
- Docs are current, concise, and aligned with actual behavior.
- Expectations and validation steps are explicit.

### Required validation:
- Spot check APIs and UI to ensure docs match reality.
- Inspect Docker logs for stability.
- Use Playwright to validate UI and capture screenshots.
- Update `todo.md` to reflect current in‑progress status.

---

## TASK 10: End‑to‑End Quality Gate
**Goal**: Validate the full workflow and UI aesthetics.

### Outcomes:
- End‑to‑end flow works without errors.
- UI is visually cohesive and polished.

### Required validation:
- Exercise APIs, preview, and export end‑to‑end.
- Inspect Docker logs for any warnings/errors.
- Use Playwright to verify UI flows and take final screenshots.
- Update `todo.md` to reflect current in‑progress status.
