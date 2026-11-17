# e-study

A local personal study workspace built with **React 19, Vite, and TypeScript**, plus a Node.js server for Codex CLI coaching and SQLite persistence.

<img width="1416" height="741" alt="image" src="https://github.com/user-attachments/assets/510a4435-ea3b-4347-87fe-c4c569d77256" />

## Development

Requires **Node.js 22.14 or newer** and npm.

```sh
npm ci
npm run dev
```

Open **http://localhost:3000**. The Node server runs Vite in middleware mode, so the UI, hot reload, and `/api/*` endpoints share one origin and port. On the first load after this upgrade, use the same browser profile and origin as before (`localhost:3000`, not `127.0.0.1:3000`) so your old records can be migrated into SQLite.

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
server.mjs                 Node HTTP server, study API, and Vite integration
database.mjs               SQLite storage, validation, and revision checks
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

The primary store is now **SQLite at `data/e-study.sqlite`**, on the machine running the Node server. It is created automatically on server startup, using Node's built-in `node:sqlite` module; no database package or separate service is required. Node 22.14 supports this module but prints an experimental-feature warning.

The `workspace` table stores the complete study state as an atomic JSON snapshot with a revision and update timestamp. This preserves the existing data model while preventing partially saved workspaces. SQLite uses WAL mode, full synchronous writes, and schema version 1. Data files and SQLite sidecar files are ignored by Git. Set `STUDY_DB_PATH` in `.env` to change the database location.

### First-load migration

1. The app loads SQLite before showing editable screens.
2. If the database already has a workspace, it is authoritative; another browser's data will not replace it.
3. If the database is empty, the app validates the old `e-study-v1` browser records, saves their original JSON in `e-study-v1-migration-backup`, and imports them into SQLite. Old records without goals/tasks get empty collections.
4. If both stores are empty, sample data is initialized. Malformed browser data blocks import rather than silently replacing it with samples.

This migration runs when you open the updated app in your existing browser; it cannot read another browser's localStorage directly. Original browser records and the migration backup are retained. Later edits keep a browser copy in `e-study-v1` as additional protection for pending changes; SQLite remains the primary store.

### Saving and recovery

Saves are serialized and use optimistic revision checks. If another tab has saved newer data, an older tab shows a conflict instead of overwriting it. Reload to view the latest database state; unsaved changes remain in the old tab's browser copy. Network or database failures show a visible warning and a Retry save button. The page warns before leaving while writes are pending or have failed. A lost save response may produce a conflict on retry, which is handled without automatically overwriting server data.

The app does not automatically reconcile simultaneous edits or import another browser's backlog into a populated database. It does not auto-restore pending browser changes over SQLite. Keep the failing tab open until you have copied any pending changes you need.

To back up your records, stop the Node server and copy the `data/` directory (or your configured database and sidecar files). Clearing browser data no longer deletes your saved SQLite records. Losing or deleting the server's database still loses those records unless you have a backup.

There is no account, cloud sync, background notification system, or external calendar sync. Browsers connected to this local server use the same workspace. Chat remains in memory until page reload. Reflections aren't automatically graded; calendar export includes study sessions, with deadlines shown in-app.

## Checks

```sh
npm run typecheck
npm test
npm run build
```

Tests cover SQLite reopen persistence, study API writes/validation/conflicts, idempotent browser migration, queued saves and recovery, React backlog and reading workflows, legacy data, study logic, calendar export, and CLI input/error handling. React interactions run in jsdom; they do not verify visual browser layout. Live browser preview was previously blocked by the execution environment's port-binding restrictions, and live Codex generation is not verified.
