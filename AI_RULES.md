# AI_RULES.md

## Tech stack

- **React 19 + TypeScript:** Build the UI with functional React components and keep domain models, props, hooks, and service boundaries strongly typed.
- **Vite 6:** Use Vite for the frontend development server and production client build; keep the existing `@` alias mapped to `src`.
- **Express + tsx:** `server.ts` provides the lightweight Node/Express server, Vite middleware in development, the production static-file handler, and server-side API routes.
- **React Router 7:** Use `BrowserRouter`, `Routes`, `Route`, `Navigate`, `Link`, and router hooks for all client-side navigation. Keep route definitions in `src/App.tsx`.
- **Tailwind CSS 4:** Use Tailwind utility classes for layout, spacing, colors, typography, responsive behavior, dark mode, and visual states; keep global rules in `src/index.css`.
- **TanStack Query 5:** Manage server or service-backed data fetching, caching, mutations, loading states, and invalidation through query hooks.
- **Zustand 5:** Store small, cross-page client UI state such as sidebar, theme, selection, and transient interaction state in focused stores under `src/store/`.
- **Lucide React + existing UI primitives:** Use Lucide for icons and reuse the components in `src/components/` (`Button`, `Card`, `Modal`, `Table`, `Input`, `Select`, and related primitives) for consistent UI.
- **Motion, reporting, and AI integrations:** Use `motion` for purposeful UI transitions, `html2canvas` and `jspdf` for client-side report export, `react-markdown` for rendering trusted Markdown reports, and `@google/genai` only from the server-side API route with `GEMINI_API_KEY` kept private.

## Library rules

### UI and styling

- Prefer existing components in `src/components/` before creating a new primitive. If a new primitive is needed, keep it focused and place it in `src/components/`.
- Use shadcn/ui patterns and primitives for new standard interface elements when the required component is available in the project. Do not edit generated or shared UI primitives to solve a page-specific problem; compose them in a new component instead.
- Use Tailwind classes extensively. Do not add a separate CSS-in-JS system or inline style objects unless a browser API, print rule, or truly dynamic value requires it.
- Use `lucide-react` icons instead of hand-drawn SVGs or text glyphs. Keep icon sizes and visual weight consistent with neighboring controls.
- Use `motion` only for meaningful state changes and transitions. Respect reduced-motion preferences and avoid decorative animation that makes data-heavy screens harder to use.

### Routing and application structure

- Keep all routes in `src/App.tsx`; use `AppLayout` and nested routes for the shared shell.
- Put top-level screens in `src/pages/`. Put page-specific components, hooks, and utilities in that page's subdirectory when they are not reusable elsewhere.
- Put reusable UI in `src/components/`, reusable data hooks in `src/hooks/`, domain API/service adapters in `src/services/`, shared types in `src/types/`, and client UI stores in `src/store/`.
- Use the `@/` alias for imports from `src` when it improves clarity. Avoid deep relative imports that cross unrelated feature boundaries.

### Data, state, and services

- Keep domain data access in the relevant `src/services/*Service.ts` file. Pages and components should consume typed hooks rather than duplicating service calls.
- Use TanStack Query for asynchronous/domain data. Give queries stable, descriptive keys, invalidate or update affected queries after mutations, and expose loading and error states in the UI.
- Use Zustand only for client-side UI state. Do not duplicate query data in Zustand or use Zustand as a replacement for TanStack Query caching.
- Keep domain types in `src/types/database.ts` (or a focused type module when appropriate). Avoid `any`; define types for API payloads, form data, and server responses.
- Keep mock data in `src/mocks/` and make the service boundary explicit when a feature is using mocks. Do not scatter hardcoded domain records through JSX.

### Server, API, and security

- Keep server-only code in `server.ts` or server-side modules. Never expose `GEMINI_API_KEY` or other secrets in `src/` or client bundles.
- Use Express routes for server-side operations and return JSON with clear HTTP status codes. Validate request data at the API boundary before using it.
- Use `@google/genai` only on the server. Client code must call the server endpoint instead of importing the SDK or sending secrets to the browser.
- Treat user-provided text as untrusted. Render Markdown with `react-markdown` only through its normal safe rendering path; do not inject raw HTML with `dangerouslySetInnerHTML`.
- Do not add a new backend, database, authentication provider, or dependency unless the feature requires it and the change is explicitly scoped.

### Reports and exports

- Use `html2canvas` and `jspdf` only for the existing report/export flows. Keep export logic in `src/utils/` or a focused feature utility, not inside reusable presentational components.
- Preserve the print-specific selectors and rules in `src/index.css` when changing report modals or printable layouts.

## Change discipline

- Make the smallest complete change that satisfies the request. Do not add speculative abstractions, unrelated refactors, or TODO placeholders.
- Preserve the existing Portuguese (Brazil) product language and FarmNexus visual language unless a request says otherwise.
- After TypeScript or application-code changes, run the project's type check (`npm run lint`) and keep the build working.
