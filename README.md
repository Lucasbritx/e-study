# E-study

A local personal study workspace with learning goals, nested tasks, books, courses, reading reviews, a weekly calendar, and Codex CLI coaching.

<img width="1416" height="741" alt="image" src="https://github.com/user-attachments/assets/510a4435-ea3b-4347-87fe-c4c569d77256" />


## Run

Requires Node.js 22 or newer. There are no npm dependencies to install.

```sh
npm run dev
```

Open http://localhost:3000.

## Codex CLI

Install Codex CLI and authenticate in your terminal:

```sh
codex login
codex login status
```

Restart e-study after installation or authentication. The app checks CLI authentication on page load. No AI API key is needed. It uses your existing Codex access and its usage limits. If `codex` isn't on PATH, copy `.env.example` to `.env` and set `CODEX_BIN` to its absolute executable path.

Coaching runs through `codex exec` with prompts passed through stdin, an isolated temporary working directory, a read-only sandbox, shell-tool access disabled, ignored user configuration, and ephemeral sessions. Generated output is read from a temporary response file, then removed. Calls time out after two minutes; only one generation runs at a time. Keys and raw CLI diagnostics are not sent to the browser. This integration requires a local Node server; a static-only deployment cannot execute your computer's CLI.

AI questions use supplied chapter notes, not automatically fetched book contents. Coaching receives your subjects, goals, tasks, resources, sessions, and recent chat messages. Only submit material you're comfortable sending to Codex. AI suggestions never silently alter your calendar. Offline reflection prompts remain available if Codex isn't ready.

## Study backlog

- Broad learning goals with specific tasks inside; no sprints.
- Goals and tasks have independent Backlog / In progress / Done statuses.
- Both support optional due dates, descriptions, priorities, subjects, and a linked resource.
- Add, edit, delete, and change task statuses. Existing data migrates with empty goal/task collections.
- Schedule one or several sessions for a task. Session completion does not automatically complete a task.
- Due dates appear separately on the calendar; overdue unfinished items are highlighted in the backlog.
- Removing a task or goal preserves calendar sessions and removes their obsolete task links. Goal deletion includes its tasks and requires an explicit confirmation in the app.

## Other features

- Book chapter and course lesson progress; course URLs.
- Chapter notes, generated questions, saved written reflections, confidence-based follow-up reviews.
- Weekly calendar, session completion/removal, deterministic weekday planning, and .ics calendar export.
- Responsive layout and local browser persistence.

## Data and limitations

Sample resources and sessions appear on first use. Progress stays in this browser's localStorage. No account, database, cross-device sync, calendar sync, or background notifications. Chat remains in memory until page reload. Clearing browser data removes records. Written reflections aren't automatically graded. Calendar export includes study sessions; deadlines are displayed in-app. Use the app on localhost; it is not designed as an internet-facing service.

## Verification

```sh
npm test
node --check public/app.js
node --check server.mjs
node --check codex.mjs
```

Automated tests cover backlog persistence/validation/deletion, independent deadlines, week calculation, completion totals, escaping, empty states, and CLI input/error handling. The execution environment denied binding the preview server (EPERM), so browser layout and live Codex generation have not been verified here.
