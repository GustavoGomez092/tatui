# TATUI

A weekly terminal Kanban board. Manage your tasks in 4 columns — **To Do**, **In Progress**, **Done**, and **Archived** — with a fresh board every Monday.

Built with React Ink, SQLite, and TypeScript. Runs entirely in your terminal, stores everything locally.

```
 TATUI   2026-W07                              2/5/8  ○  1.5h/6h
┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐
│ ○ To Do  (3) ││ ◐ Active (2) ││ ● Done   (2) ││ ◌ Archive(1) │
│              ││              ││              ││              │
│ [WRK] Auth   ││ [WRK] API    ││ [PER] Grocr  ││ [WRK] Setup  │
│ [PER] Taxes  ││ [WRK] Tests  ││ [WRK] Deploy ││              │
│ [WRK] Docs   ││              ││              ││              │
└──────────────┘└──────────────┘└──────────────┘└──────────────┘
 h/l:columns  j/k:rows  Enter:advance  b:back  n:new  p:filter  q:quit
```

---

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Interactive TUI](#interactive-tui)
  - [Board Layout](#board-layout)
  - [Keyboard Shortcuts](#keyboard-shortcuts)
  - [Creating Tasks](#creating-tasks)
  - [Shorthand Syntax](#shorthand-syntax)
  - [Project Autocomplete](#project-autocomplete)
  - [Project Filtering](#project-filtering)
  - [Moving Tasks](#moving-tasks)
  - [Duration Tracking](#duration-tracking)
- [Weekly Cycle](#weekly-cycle)
  - [Fresh Board Every Monday](#fresh-board-every-monday)
  - [Automatic Rollover](#automatic-rollover)
  - [Week Summaries](#week-summaries)
- [CLI Commands](#cli-commands)
- [Projects](#projects)
- [Data Storage](#data-storage)
- [Architecture](#architecture)
- [Development](#development)

---

## Features

- **4-column Kanban board** — To Do, In Progress, Done, Archived
- **Weekly cycle** — fresh board every Monday, incomplete tasks auto-rollover
- **Project system** — tasks belong to projects, filter the board by project
- **Shorthand syntax** — create tasks fast: `work::Fix bug::Auth broken::2h`
- **Autocomplete** — Tab-to-accept project names with ghost text
- **Duration tracking** — forecast time per task, see totals in the header
- **Vim-style navigation** — `h/j/k/l` keys, `Enter` to advance, `b` to move back
- **Week summaries** — stats and per-project breakdowns, exportable
- **Single-command install** — `curl ... | bash` or `npm install -g tatui`
- **Local-first** — all data in a local SQLite database, never leaves your machine
- **Zero configuration** — just run `tatui` and start adding tasks

---

## Requirements

- **Node.js >= 20** (LTS recommended)
- A terminal that supports ANSI colors (virtually all modern terminals)

---

## Installation

**One-command install (recommended):**

```bash
curl -fsSL https://raw.githubusercontent.com/GustavoGomez092/tatui/main/install.sh | bash
```

This clones the repo, installs dependencies, builds, and links the `tatui` command to your PATH. Then run from anywhere:

```bash
tatui
```

**Update to latest:**

```bash
curl -fsSL https://raw.githubusercontent.com/GustavoGomez092/tatui/main/install.sh | bash -s -- --update
```

**Uninstall:**

```bash
curl -fsSL https://raw.githubusercontent.com/GustavoGomez092/tatui/main/uninstall.sh | bash
```

**Alternative — npm global install:**

```bash
npm install -g tatui
```

**From source:**

```bash
git clone https://github.com/GustavoGomez092/tatui.git
cd tatui
npm install
npm run build
npm start
```

---

## Quick Start

```bash
# Launch the interactive board
tatui

# Quick-add a task from the command line
tatui add 'work::Set up CI pipeline::Configure GitHub Actions::2h'

# Add a task with explicit project flag
tatui add --project personal 'Buy groceries'

# See your week summary
tatui summary

# List all projects
tatui projects
```

---

## Interactive TUI

### Board Layout

The board has 4 columns, each representing a task status:

| Column | Icon | Color | Description |
|--------|------|-------|-------------|
| **To Do** | `○` | Blue | Tasks waiting to be started |
| **In Progress** | `◐` | Yellow | Tasks currently being worked on |
| **Done** | `●` | Green | Completed tasks |
| **Archived** | `◌` | Gray | Tasks moved out of active view |

The **header** displays:
- App name and current ISO week (e.g., `2026-W07`)
- Active project filter (if any)
- Task count summary: `todo/in-progress/done of total`
- Duration summary: `completed-time/total-time` (when tasks have durations)

The **help bar** at the bottom shows available keyboard shortcuts for the current mode.

### Keyboard Shortcuts

#### Navigate Mode (default)

| Key | Action |
|-----|--------|
| `h` or `Left Arrow` | Move focus to the previous column |
| `l` or `Right Arrow` | Move focus to the next column |
| `k` or `Up Arrow` | Move selection up within the current column |
| `j` or `Down Arrow` | Move selection down within the current column |
| `Enter` | Advance the selected task to the next column |
| `b` | Move the selected task back to the previous column |
| `n` | Create a new task (opens input form) |
| `d` | Delete the selected task |
| `p` | Cycle through project filters |
| `r` | Refresh tasks from the database |
| `q` | Quit TATUI |

#### Input Mode (creating a task)

**Step 1 — Title entry:**

| Key | Action |
|-----|--------|
| Type characters | Enter task text (shorthand or plain title) |
| `Tab` | Accept the autocomplete suggestion |
| `Backspace` | Delete the last character |
| `Enter` | Submit shorthand directly, or advance to project selection |
| `Escape` | Cancel and return to the board |

**Step 2 — Project selection (plain titles only):**

| Key | Action |
|-----|--------|
| Type characters | Filter/type a project name |
| `Tab` | Accept autocomplete suggestion |
| `j` or `Down Arrow` | Move highlight down in the project list |
| `k` or `Up Arrow` | Move highlight up in the project list |
| `Enter` (empty input) | Select the highlighted project |
| `Enter` (with text) | Use the typed project name (auto-creates if new) |
| `Escape` | Go back to step 1 |

### Creating Tasks

Press `n` to open the task creation form. There are two ways to create a task:

**Method 1 — Shorthand syntax (fast):**

Type using the `::` delimiter format and press `Enter`:

```
work::Fix login bug::Auth module returning 401::1h
```

This creates the task immediately without any additional prompts.

**Method 2 — Guided input (step by step):**

Type a plain title (no `::`) and press `Enter`. You'll be prompted to select or type a project name in a second step.

### Shorthand Syntax

The `::` delimiter separates task fields in a fixed order:

```
project::title::description::duration
```

| Segments | Format | Example |
|----------|--------|---------|
| 2 (minimum) | `project::title` | `work::Fix login bug` |
| 3 | `project::title::description` | `work::Fix login bug::Auth 401 error` |
| 3 (with duration) | `project::title::duration` | `work::Fix login bug::2h` |
| 4 (full) | `project::title::description::duration` | `work::Fix login bug::Auth 401 error::2h` |

**Duration formats:**

| Format | Meaning | Example |
|--------|---------|---------|
| `Nm` | Minutes | `30m` = 30 minutes |
| `Nh` | Hours | `2h` = 120 minutes |
| `N.Nh` | Fractional hours | `1.5h` = 90 minutes |
| `Nd` | Days (1 day = 8 hours) | `1d` = 480 minutes |
| `N.Nd` | Fractional days | `0.5d` = 240 minutes |

When using 3 segments, TATUI automatically detects whether the third segment is a duration or a description based on format matching.

### Project Autocomplete

When creating a task, project names autocomplete as you type:

```
Input:   wo                    → ghost text shows: rk
Display: wo|rk::               (dimmed "rk::" is the suggestion)
Press Tab: work::              (accepted, cursor ready for title)
```

- Suggestions are case-insensitive prefix matches
- Press `Tab` to accept the suggestion
- If no match exists, you're creating a new project

### Project Filtering

Press `p` to cycle through project filters:

```
All Projects → work → personal → side-project → All Projects → ...
```

When a filter is active:
- All 4 columns show only tasks from that project
- The header displays `Filter: work` in yellow
- Press `p` again to cycle to the next project or back to "All"

### Moving Tasks

Tasks flow through the Kanban columns:

```
To Do → In Progress → Done → Archived
```

- Press `Enter` on a selected task to advance it one column to the right
- Press `b` to move it one column back to the left
- Tasks at the rightmost column (Archived) cannot advance further
- Tasks at the leftmost column (To Do) cannot move back further

### Duration Tracking

Tasks can have optional time forecasts:

- Set during creation via shorthand: `work::Fix bug::2h`
- Displayed on task cards as dimmed text (e.g., `2h`)
- The **header** shows aggregated durations: `completed-time / total-time`
  - Completed time = sum of durations for "Done" tasks
  - Total time = sum of durations for all tasks (excluding "Archived")

---

## Weekly Cycle

### Fresh Board Every Monday

TATUI organizes tasks by **ISO week** (Monday through Sunday). Each week has its own board identified by a week ID like `2026-W07`.

When you launch TATUI on a new week, you start with a clean board. The current week is calculated automatically using the ISO 8601 standard (the Thursday of the week determines the year assignment).

### Automatic Rollover

When TATUI starts, it checks for **incomplete tasks from previous weeks**. Any task that is not "Done" or "Archived" is automatically moved to the current week with its status reset to "To Do".

This means:
- Unfinished work carries forward automatically
- You never lose track of incomplete tasks
- The previous week's board reflects what was actually completed

### Week Summaries

View a summary of any week's work:

```bash
# Current week summary
tatui summary

# Specific week summary
tatui summary 2026-W06
```

The summary includes:
- Total tasks and completion count
- Total forecasted time and completed time
- Per-project breakdown with task counts and durations

Example output:

```
# Week 2026-W07 Summary

Tasks: 5/8 completed
Time: 3.5h/6h

## By Project
- work: 3/5 tasks (4h)
- personal: 2/3 tasks (2h)
```

---

## CLI Commands

TATUI can be used both as an interactive TUI and as a command-line tool.

### `tatui` or `tatui board`

Launches the interactive Kanban board in your terminal.

```bash
tatui
```

### `tatui add`

Quick-add a task without opening the interactive board.

**Using shorthand syntax:**

```bash
tatui add 'work::Deploy to staging::Push latest build::1h'
tatui add 'personal::Buy groceries'
tatui add 'work::Code review::30m'
```

**Using explicit project flag:**

```bash
tatui add --project work 'Write unit tests'
tatui add --project personal 'Call dentist'
```

### `tatui projects`

List all projects with their assigned colors.

```bash
tatui projects
```

### `tatui summary`

Print a formatted summary for a given week.

```bash
# Current week
tatui summary

# Specific week
tatui summary 2026-W05
```

### `tatui help`

Show usage information.

```bash
tatui help
tatui --help
tatui -h
```

---

## Projects

Every task in TATUI belongs to a **project**. Projects are created automatically the first time they are referenced by name.

- Project names are **case-sensitive** as stored but matched for display purposes
- Each project is automatically assigned a **color** from a rotating palette of 10 colors
- Colors are used for the `[TAG]` badges on task cards (first 3 characters, uppercased)
- Projects persist across weeks

**Color palette (auto-assigned in order):**

| # | Color | Hex |
|---|-------|-----|
| 1 | Indigo | `#6366f1` |
| 2 | Amber | `#f59e0b` |
| 3 | Emerald | `#10b981` |
| 4 | Red | `#ef4444` |
| 5 | Violet | `#8b5cf6` |
| 6 | Cyan | `#06b6d4` |
| 7 | Orange | `#f97316` |
| 8 | Pink | `#ec4899` |
| 9 | Teal | `#14b8a6` |
| 10 | Lime | `#84cc16` |

---

## Data Storage

TATUI stores all data in a local SQLite database. No data is ever transmitted externally.

**Database location (determined by your OS):**

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/tatui/tatui.db` |
| Linux | `~/.local/share/tatui/tatui.db` |
| Windows | `%APPDATA%\tatui\tatui.db` |

The directory is created automatically on first launch.

**Database configuration:**
- **WAL mode** enabled for performance
- **Foreign keys** enforced
- Indexed on `week_id`, `project_id`, and `status` for fast queries

### Schema

**projects**

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER (PK) | Auto-incrementing ID |
| name | TEXT | Unique project name |
| color | TEXT | Hex color code |
| created_at | TEXT | ISO timestamp |

**tasks**

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER (PK) | Auto-incrementing ID |
| title | TEXT | Task title |
| description | TEXT | Optional description |
| status | TEXT | `todo`, `in-progress`, `done`, or `archived` |
| project_id | INTEGER (FK) | References projects.id |
| week_id | TEXT | ISO week identifier (e.g., `2026-W07`) |
| duration_minutes | INTEGER | Optional forecasted duration in minutes |
| position | INTEGER | Sort order within a column |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  tatui (single Node.js process)                         │
│                                                         │
│  ┌────────────┐   ┌───────────┐   ┌──────────────────┐ │
│  │  React Ink  │──▶│   Hooks   │──▶│   Data Layer     │ │
│  │  Components │   │ useTasks  │   │ db/tasks.ts      │ │
│  │  (TUI)     │◀──│ useProjects│◀──│ db/projects.ts   │ │
│  └────────────┘   │ useFilter │   │ db/weeks.ts      │ │
│                    └───────────┘   └────────┬─────────┘ │
│                                             │           │
│  ┌────────────┐                   ┌─────────┴─────────┐ │
│  │  Parser    │                   │  Drizzle ORM      │ │
│  │  utils/    │                   │  + better-sqlite3  │ │
│  └────────────┘                   └─────────┬─────────┘ │
└─────────────────────────────────────────────┼───────────┘
                                              │
                                    ┌─────────┴─────────┐
                                    │  ~/.local/share/   │
                                    │  tatui/tatui.db    │
                                    └───────────────────┘
```

**No API server.** The TUI communicates directly with the SQLite database in-process using synchronous calls via `better-sqlite3`. This means zero startup latency and zero network overhead.

**Stack:**

| Layer | Technology |
|-------|------------|
| Terminal UI | React Ink v6.7 |
| State management | React hooks (useState, useMemo, useEffect) |
| ORM | Drizzle ORM |
| Database driver | better-sqlite3 |
| Data directory | env-paths |
| Language | TypeScript (ESM) |

**Source structure:**

```
src/
├── cli.tsx                  # CLI entry point, argument parsing
├── components/
│   ├── App.tsx              # Root component, keyboard handling, state
│   ├── AutocompleteInput.tsx # Text input with ghost text autocomplete
│   ├── Board.tsx            # 4-column Kanban layout
│   ├── Column.tsx           # Single column with header and task list
│   ├── Header.tsx           # Top bar: week, stats, filter indicator
│   ├── HelpBar.tsx          # Bottom bar: context-sensitive shortcuts
│   ├── TaskCard.tsx         # Individual task card with project badge
│   └── TaskInput.tsx        # Two-step task creation form
├── db/
│   ├── index.ts             # Database connection, initialization
│   ├── schema.ts            # Drizzle table definitions and types
│   ├── projects.ts          # Project CRUD operations
│   ├── tasks.ts             # Task CRUD operations
│   └── weeks.ts             # Week management, rollover, summaries
├── hooks/
│   ├── useProjectFilter.ts  # Project filter cycling and application
│   ├── useProjects.ts       # React state wrapper for project operations
│   └── useTasks.ts          # React state wrapper for task operations
└── utils/
    ├── parser.ts            # Shorthand syntax parser (project::title::desc::dur)
    └── week.ts              # ISO week calculations and duration formatting
```

---

## Development

**Prerequisites:** Node.js >= 20, npm

```bash
# Install dependencies
npm install

# Build the TypeScript source
npm run build

# Run the built app
npm start

# Watch mode (rebuild on changes)
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

**Scripts:**

| Script | Command | Description |
|--------|---------|-------------|
| `build` | `tsc` | Compile TypeScript to `dist/` |
| `dev` | `tsc --watch` | Recompile on file changes |
| `start` | `node dist/cli.js` | Run the compiled app |
| `test` | `vitest run` | Run tests once |
| `test:watch` | `vitest` | Run tests in watch mode |

---

## License

MIT
