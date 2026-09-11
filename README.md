# AetherPM

A desktop project management app for engineering teams — general PM (tasks,
kanban, timeline, risks) plus systems-engineering tooling (requirements,
traceability, SysML-style diagrams). Built with **Tauri 2 + Rust + React/TypeScript**,
with all data stored locally in **SQLite**.

This README assumes you've never set up a Rust/Tauri project before.

---

## 1. What's built so far (Phase 1-7 complete, plus gap closures and real edit forms)

- Full Tauri 2 desktop shell: sidebar, top bar with project switcher,
  a **live-searching** command palette (`Ctrl/Cmd+K`), notification bell,
  dark/light theme toggle, onboarding flow.
- SQLite database with a complete schema (`src-tauri/src/db/migrations/`)
  covering projects, tasks (tags, dependency links), sprints,
  requirements, SysML elements, diagrams, trace links, risks, decisions,
  meeting notes, baselines, project members/roles, comments,
  notifications, activity, attachments, and saved views.
- Working UI:
  - **Command palette** — live search across tasks and requirements,
    deep-linking to an item's inspector drawer
  - **Dashboard** — health widgets plus a recent activity feed
  - **Board** — Kanban with due dates, tags, filter bar with saved
    views. Clicking a task now opens a **full editable form** (title,
    description, status, priority, dates, estimate/actual hours,
    assignee, tags) that **autosaves** — previously a task's fields
    were fixed at creation time with no way to change them afterward.
    Also: dependencies (blocks/relates to/duplicates), attachments,
    comments
  - **Planning** (tabbed) — Timeline/Gantt, Calendar, Sprints, WBS,
    Workload, Baselines
  - **Requirements** — table with orphan warnings, its own filter bar,
    a Traceability panel. Clicking a row now opens a **full editable
    form** (statement, type, status, priority, verification method,
    parent requirement) that **autosaves** — the same gap as tasks had:
    requirements used to be immutable after creation. Also: attachments,
    comments
  - **Model Explorer** — persisted SysML diagrams with element reuse and
    a validation panel
  - **Risks** — severity matrix plus a "Link task" mitigation action
  - **Decisions**, **Meeting Notes** (autosaving), **Settings**
    (theme, members/roles, shortcuts, data location, export/import)
- `docs/COLLABORATION.md` covers local-only collaboration and the plan
  for real cloud sync.

### What's left (all genuinely optional polish at this point)
- Extending the filter bar / saved views pattern to Risks.
- Real-time presence and role enforcement — blocked on a real backend;
  see `docs/COLLABORATION.md`.
- Rich project *templates* that pre-seed sample data by project type —
  the project-type field exists and is used for labeling, but doesn't
  yet seed anything.

Every table these remaining items need already exists in the schema, so
none of them require a redesign.

## 9. About Supabase / a future backend

The cloud layer is now designed and implemented: **Supabase for Auth
+ Postgres metadata, Contabo Object Storage for the actual bytes, tied
together by Supabase Edge Functions acting as a secure broker (no
custom VPS/server needed).** See:

- **`docs/CLOUD_INTEGRATION.md`** — the full architecture, why a
  direct client-to-Contabo connection isn't safe, the data flow for
  sign-in/upload/share/import, and the free-vs-Pro storage math
- **`supabase/`** — the deployable Postgres schema (`schema.sql`) and
  Edge Functions (`functions/`), plus deployment instructions
  (`supabase/README.md`)
- **`src-tauri/src/cloud/`** — the Rust client: Supabase Auth
  (sessions stored in the OS keychain, not SQLite), and the upload/
  share/import flow against the Edge Functions
- **Settings → AetherPM Cloud** in the app — sign in/up, storage usage
  bar, "Share current project to cloud," and importing by share code

This is additive to everything already built: without a cloud account,
AetherPM works exactly as before, fully offline, for free.

---

## 2. Install the tools you need (one-time setup)

You need three things on your machine: **Rust**, **Node.js**, and the
**Tauri CLI**. Follow whichever matches your OS.

### All platforms
1. Install **Rust**: go to https://rustup.rs and follow the one-line
   installer instructions for your OS. Afterward, close and reopen your
   terminal, then check it worked:
   ```
   rustc --version
   ```
2. Install **Node.js** (v18 or newer): https://nodejs.org — download the
   "LTS" installer and run it. Check it worked:
   ```
   node --version
   ```

### Windows only
Install the "Desktop development with C++" workload from the
[Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/),
and [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/)
(pre-installed on most Windows 10/11 machines already).

### macOS only
Install Xcode Command Line Tools:
```
xcode-select --install
```

### Linux only
Install the WebKitGTK dependencies. On Ubuntu/Debian:
```
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

---

## 3. Running AetherPM in development mode

From the project root (the `aetherpm` folder):

```bash
npm install
npm run tauri dev
```

The first run will take a few minutes — Rust is compiling all the
dependencies. A window titled "AetherPM" will open when it's ready. Every
time you edit a React file, the window auto-reloads. Rust changes require
stopping (`Ctrl+C`) and re-running the command.

The SQLite database is created automatically on first launch at:
- **Linux**: `~/.local/share/aetherpm/aetherpm.db`
- **macOS**: `~/Library/Application Support/aetherpm/aetherpm.db`
- **Windows**: `%APPDATA%\aetherpm\aetherpm.db`

---

## 4. Building an installer (later, when ready to distribute)

```bash
npm run tauri build
```

This produces a native installer in `src-tauri/target/release/bundle/`
(`.msi`/`.exe` on Windows, `.dmg`/`.app` on macOS, `.deb`/`.AppImage` on Linux).

You'll also want real app icons before shipping — generate a full icon set
from one PNG with:
```bash
npm run tauri icon path/to/your-logo.png
```

---

## 5. Project structure

```
aetherpm/
  src-tauri/              Rust backend
    src/
      main.rs             App entrypoint, registers all commands
      db/
        mod.rs            SQLite connection + migration runner
        migrations/        SQL schema files, applied in order
      commands/            One file per feature area (projects, tasks, requirements, search, export)
      models.rs            Shared Rust structs (serde) matching the schema
    Cargo.toml             Rust dependencies
    tauri.conf.json        App window, bundle, and build settings
  src/                     React + TypeScript frontend
    features/
      dashboard/            Dashboard + onboarding
      tasks/                 Kanban board
      requirements/          Requirements table
      sysml/                 Model Explorer / diagram canvas
    components/             Sidebar, TopBar, CommandPalette, InspectorDrawer, NewProjectModal
    lib/api.ts              Typed wrapper around every Rust command
    stores/appStore.ts       Global app state (zustand)
  package.json
  vite.config.ts
```

## 6. Files to put on GitHub

Everything in this folder **except** what's already in `.gitignore`
(`node_modules/`, `dist/`, `src-tauri/target/`) — those are generated and
shouldn't be committed. To push this to a fresh repo:

```bash
cd aetherpm
git init
git add .
git commit -m "AetherPM: initial scaffold (Phase 1-4 partial)"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

> Never paste a personal access token into a chat or commit it to a file.
> If you need to push over HTTPS with a token, Git will prompt for it
> interactively, or store it once via `git credential-manager` / your OS
> keychain — not in a script or README.

## 7. Roadmap notes for cloud sync & mobile

The schema already uses UUID `TEXT` ids (not auto-increment integers) and
a `project_members`/roles table, specifically so a future cloud backend
(e.g. Postgres + a sync service) can adopt the same ids without a data
migration. The plan for later phases:
- Add a `sync_log`/`sync_cursor` table for offline-first conflict resolution.
- Introduce a thin sync service that mirrors local SQLite writes to the
  cloud when online, and pulls remote changes into the same tables.
- The mobile app would reuse this same schema and the same Rust
  validation logic (traceability, orphan checks) compiled to a shared
  core, with a native or React Native UI on top.

## 8. Known follow-ups worth knowing about

- Fonts (Inter, JetBrains Mono) currently load from Google Fonts over the
  network in `index.html`. For a fully offline-first build, bundle the
  font files locally instead before shipping.
- `search_all` does a simple `LIKE` scan; fine for local use, but swap for
  SQLite FTS5 once project data grows large.
