# Editable Created Date in Task Detail

## Problem

The task detail view (`src/components/TaskDetail.tsx`) lets the user edit most
task fields (title, project, description, duration) but the **Created** date is
read-only. Users want to re-slot a task to a different day of the current week
without recreating it.

## Scope

- In-scope: editing the created date, restricted to MON–SUN of the **currently
  viewed week**.
- Out-of-scope: moving a task to a different ISO week; multi-week date pickers;
  editing `updatedAt`.

## UX

### Field placement

Add `createdAt` as a navigable field in `TaskDetail`'s `FIELDS` array, placed
after `duration`. It participates in the existing j/k navigation and Enter/e
edit-entry pattern.

Remove the existing read-only `Created: <date>` line from the top info bar
(Status remains). This avoids showing the same field twice.

### Display states

- **Navigation (not focused):** `  Created: THU · 2026-04-23`
- **Navigation (focused):** `> Created: THU · 2026-04-23` (cyan, bold label)
- **Edit mode:** `> Created: ◀ THU · 2026-04-23 ▶` with the day+date rendered
  in a highlighted color (`cyan`) so it's obvious the value is being cycled.

### Controls (edit mode)

- `←` / `h` — cycle to previous day of week (wraps MON → SUN)
- `→` / `l` — cycle to next day of week (wraps SUN → MON)
- `Enter` — save
- `Esc` — cancel, restore original value

No text input, no validation surface — the seven bounded choices remove the
need for error messaging.

## Data model

### DB layer — `src/db/tasks.ts`

Extend `updateTask()`'s `data` type from:

```ts
Partial<Pick<Task, "title" | "description" | "status" | "durationMinutes" | "position">>
```

to include `createdAt`:

```ts
Partial<Pick<Task, "title" | "description" | "status" | "durationMinutes" | "position" | "createdAt">>
```

No new function is needed; the existing `updateTask()` already passes all
provided fields through to the `set()` call and bumps `updatedAt`.

### Hook layer — `src/hooks/useTasks.ts`

Update `editTask`'s `data` type the same way. No behavioral change beyond the
expanded union.

### App layer — `src/components/App.tsx`

Update `handleDetailUpdateField`'s `data` type to include `createdAt`. The
optimistic in-place merge (`{ ...prev, ...data }`) already handles arbitrary
`Task` fields correctly.

### Component layer — `src/components/TaskDetail.tsx`

- Add `"createdAt"` to the `DetailField` union and `FIELDS` array (after
  `"duration"`).
- Extend `onUpdateField`'s prop type to include `createdAt`.
- Add a `getFieldValue` branch for `createdAt` returning the formatted
  `"MON · YYYY-MM-DD"` string.
- Replace the generic `TextInput` edit UI with a day-cycler sub-component used
  only when `editing && currentField === 'createdAt'`.

### Day-cycler behavior

State (local to edit session): `pendingDayIndex` (0…6, Monday=0).

Initial value: computed from `task.createdAt` via `getDayOfWeek()`.

Input handling (Ink `useInput`, active when editing this field):

- `leftArrow` or `h` → `pendingDayIndex = (pendingDayIndex + 6) % 7`
- `rightArrow` or `l` → `pendingDayIndex = (pendingDayIndex + 1) % 7`
- `return` → commit
- `escape` → cancel (handled by the existing edit-mode `useInput`)

On commit:

1. Compute new date = `getWeekStart(new Date(task.createdAt))` + `pendingDayIndex` days.
2. **Preserve time-of-day** from the current `task.createdAt` so relative sort
   order within a day is stable (e.g., if the user moves a task from Thursday
   3pm to Monday, it becomes Monday 3pm, not Monday 00:00).
3. Call `onUpdateField(task.id, { createdAt: newDateIso })`.

The existing `setTimeout(() => setEditing(false), 0)` pattern applies so the
navigation-mode `useInput` doesn't swallow the same Enter press.

## Edge cases

- **Task from a different week:** The cycler always operates over the
  **currently viewed week** (derived from `task.createdAt` via `getWeekStart`).
  If the task's stored `createdAt` somehow lies outside its `weekId` window,
  saving aligns it to the viewed week. This matches existing board behavior
  which displays by day-of-week regardless.
- **Board re-slotting:** `Board`/`Column` already sort by
  `getDayOfWeek(createdAt)`; after the optimistic update in `editTask`, the
  detail view closes/reopens with the task visually in its new column.
- **`weekId` unchanged:** By design (requirement: restrict to current week),
  `weekId` is never recalculated.

## Testing (manual)

1. Open detail on a task created on Thursday; cycle Created to Monday; save.
   Confirm the task now appears under the MON column.
2. Cycle past SUN → wraps to MON; cycle before MON → wraps to SUN.
3. Press Esc mid-cycle; confirm date is unchanged.
4. Confirm time-of-day is preserved: create two tasks on Thursday 5 minutes
   apart, move the later one to Monday, move the earlier one to Monday; their
   within-day order should be stable.
5. Confirm the top info bar no longer shows a duplicate Created line.

## Files touched

- `src/db/tasks.ts` — type widen on `updateTask`.
- `src/hooks/useTasks.ts` — type widen on `editTask`.
- `src/components/App.tsx` — type widen on `handleDetailUpdateField`; remove
  read-only Created line is handled inside `TaskDetail`, not here.
- `src/components/TaskDetail.tsx` — main change: new field + cycler UI + input
  handling + remove top-bar Created.
