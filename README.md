# e-study

A local personal study workspace built with **React 19, Vite, and TypeScript**, plus a Node.js server for Codex CLI coaching.

<img width="1416" height="741" alt="image" src="https://github.com/user-attachments/assets/510a4435-ea3b-4347-87fe-c4c569d77256" />

## Development

Requires **Node.js 22.14 or newer** and npm.

```sh
npm ci
npm run dev
```

Open **http://localhost:3000**. The Node server runs Vite in middleware mode, so the UI, hot reload, and `/api/*` endpoints share one origin and port. Existing browser data remains available when using the same browser profile and the same origin as before (`localhost:3000`, not `127.0.0.1:3000`).

## Production build

```sh
npm run build
npm start
```

The build type-checks the frontend and emits static assets to `dist/`. The Node server serves those assets and handles AI requests. Vite is used only in development and at build time. This is a local app: a static-only host cannot execute your computer's Codex CLI.

## Structure

```text
src/
  App.tsx                  Workspace navigation and AI conversation state
  main.tsx                 React entry point
  types.ts                 Study domain types
  store.tsx                Shared state, persistence, legacy-data migration
  components/              Reusable UI, dialogs, forms, reading review
  pages/                   Overview, backlog, resources, subjects, calendar, coach
  lib/                     Study operations, calendar export, AI client, seed data
  style.css                Responsive styles
server.mjs                 Node HTTP server and Vite integration
codex.mjs                  Server-only Codex CLI adapter
vite.config.mjs            React plugin and production build settings
```

The interface uses React components and event handlers throughout. There is no legacy HTML-string rendering or manual DOM event binding. State updates are immutable; pure study operations can be tested separately from React.

## Codex CLI

Install Codex CLI and authenticate:

```sh
codex login
codex login status
```

The app checks CLI authentication on page load. No AI API key is needed. It uses your existing Codex access and usage limits. If `codex` isn't on PATH, copy `.env.example` to `.env`, set `CODEX_BIN` to its absolute path, then restart the server.

Coaching uses `codex exec`, passing prompts through stdin with a temporary workspace, a read-only sandbox, disabled shell-tool access, ignored user configuration, and ephemeral sessions. The temporary output is removed afterward. Requests time out after two minutes; only one generation runs at a time. Raw CLI diagnostics aren't sent to the browser.

Reading questions use supplied chapter notes, not automatically fetched book contents. Coaching receives your subjects, goals, tasks, resource details, sessions, and recent chat messages. Only submit material you're comfortable sending to Codex. AI suggestions never silently alter your calendar. Labeled offline prompts remain available without Codex.

## Features

- Broad learning goals with nested tasks; no sprints.
- Independent Backlog / In progress / Done statuses for goals and tasks.
- Optional due dates, priorities, descriptions, subjects, and linked resources.
- Add, edit, delete, and schedule tasks across multiple study sessions.
- Deadlines shown separately on the weekly calendar; overdue unfinished items highlighted in the backlog.
- Session completion stays independent from task completion.
- Removing a goal deletes its tasks after confirmation while keeping calendar sessions with obsolete task links removed.
- Books and courses with chapter/lesson progress and course URLs.
- Chapter notes, open-ended questions, saved written reflections, confidence-based follow-up reviews, and access to past reflections.
- Manual sessions, weekday planning that skips overlapping slots, completion/removal, and `.ics` export.
- Dashboard with weekly activity, resource progress, and subject summaries.

## Saved data

The migration keeps the original **`e-study-v1` localStorage key** and data shape, including notes, reflections, subjects, progress, goals, tasks, and sessions. Older records without goals/tasks are initialized with empty collections. Malformed records aren't automatically overwritten; the app displays a warning. Storage write failures also display a warning.

There is no account, database, cross-device sync, background notification system, or external calendar sync. Chat stays in memory until page reload. Clearing browser data removes study records. Sample resources/sessions appear on first use. Reflections aren't automatically graded. Calendar export includes study sessions; deadlines appear in-app.

## Checks

```sh
npm run typecheck
npm test
npm run build
```

Tests cover React backlog creation/editing/scheduling/deletion, workspace navigation, legacy-data migration, unsafe text rendering, malformed storage preservation, study logic, calendar export, and CLI input/error handling. React interactions run in jsdom; they do not verify visual browser layout. Live browser preview was previously blocked by the execution environment's port-binding restrictions, and live Codex generation is not verified.
