# Editable Created Date — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow the user to change a task's `createdAt` day from the Task Detail view, restricted to MON–SUN of the currently viewed week, using a left/right arrow cycler.

**Architecture:** Add a pure helper (`setDayOfWeekPreservingTime`) in `src/utils/week.ts` that returns a new ISO timestamp with the day swapped and time-of-day preserved. Widen `updateTask`/`editTask`/`handleDetailUpdateField` type signatures to accept `createdAt`. Add a new navigable `"createdAt"` field in `TaskDetail` with a day-cycler UI (left/right arrow keys) instead of `TextInput` when editing that field. Remove the duplicate read-only "Created" line from the detail view's top info bar.

**Tech Stack:** React Ink 6, @inkjs/ui, TypeScript, Drizzle + better-sqlite3, Vitest.

---

## Reference reading (before starting)

- Spec: `docs/superpowers/specs/2026-04-21-editable-created-date-design.md`
- `src/utils/week.ts` — `getWeekStart()`, `getDayOfWeek()`, `DAY_LABELS`
- `src/components/TaskDetail.tsx` — existing field-edit pattern, two `useInput` handlers
- `src/db/tasks.ts` — `updateTask()` accepts a `Partial<Pick<Task, ...>>` and applies it verbatim plus `updatedAt`.

---

## Task 1: Add `setDayOfWeekPreservingTime` helper

**Files:**
- Modify: `src/utils/week.ts`
- Test: `src/utils/__tests__/week.test.ts` (new file)

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/week.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { setDayOfWeekPreservingTime, getDayOfWeek } from "../week.js";

describe("setDayOfWeekPreservingTime", () => {
  it("moves a Thursday timestamp to Monday of the same week, preserving time", () => {
    // 2026-04-23 is a Thursday. Monday of that week is 2026-04-20.
    const reference = new Date(2026, 3, 23, 15, 30, 45, 123).toISOString();
    const result = setDayOfWeekPreservingTime(reference, 0);
    const d = new Date(result);

    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(3); // April (0-indexed)
    expect(d.getDate()).toBe(20);
    expect(d.getHours()).toBe(15);
    expect(d.getMinutes()).toBe(30);
    expect(d.getSeconds()).toBe(45);
    expect(d.getMilliseconds()).toBe(123);
    expect(getDayOfWeek(result)).toBe(0); // Monday
  });

  it("moves a Monday to Sunday of the same week", () => {
    // 2026-04-20 is a Monday. Sunday of that week is 2026-04-26.
    const reference = new Date(2026, 3, 20, 9, 0, 0, 0).toISOString();
    const result = setDayOfWeekPreservingTime(reference, 6);
    const d = new Date(result);

    expect(d.getDate()).toBe(26);
    expect(d.getHours()).toBe(9);
    expect(getDayOfWeek(result)).toBe(6); // Sunday
  });

  it("is a no-op when the target day equals the current day-of-week", () => {
    const reference = new Date(2026, 3, 23, 12, 0, 0, 0).toISOString();
    const result = setDayOfWeekPreservingTime(reference, 3); // Thursday
    expect(new Date(result).getDate()).toBe(23);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/week.test.ts`
Expected: FAIL with `setDayOfWeekPreservingTime is not a function` (or import error).

- [ ] **Step 3: Implement the helper**

Append to `src/utils/week.ts`:

```ts
/**
 * Return a new ISO timestamp whose date is the given day-of-week
 * (0 = Monday … 6 = Sunday) of the same ISO week as `referenceIso`,
 * preserving the hour/minute/second/ms of `referenceIso` in local time.
 */
export function setDayOfWeekPreservingTime(
  referenceIso: string,
  targetDayIndex: number
): string {
  const reference = new Date(referenceIso);
  const target = getWeekStart(reference); // zeros time to 00:00 local
  target.setDate(target.getDate() + targetDayIndex);
  target.setHours(
    reference.getHours(),
    reference.getMinutes(),
    reference.getSeconds(),
    reference.getMilliseconds()
  );
  return target.toISOString();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/__tests__/week.test.ts`
Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/week.ts src/utils/__tests__/week.test.ts
git commit -m "feat(utils): add setDayOfWeekPreservingTime helper"
```

---

## Task 2: Widen type signatures to accept `createdAt`

**Files:**
- Modify: `src/db/tasks.ts`
- Modify: `src/hooks/useTasks.ts`
- Modify: `src/components/App.tsx`

- [ ] **Step 1: Widen `updateTask` in `src/db/tasks.ts`**

Change the `data` parameter type of `updateTask` (around line 174-177) from:

```ts
export function updateTask(
  id: number,
  data: Partial<Pick<Task, "title" | "description" | "status" | "durationMinutes" | "position">>
): TaskWithProject | undefined {
```

to:

```ts
export function updateTask(
  id: number,
  data: Partial<Pick<Task, "title" | "description" | "status" | "durationMinutes" | "position" | "createdAt">>
): TaskWithProject | undefined {
```

No body changes — the existing `.set({ ...data, updatedAt: ... })` already forwards all provided fields.

- [ ] **Step 2: Widen `editTask` and `UseTasksResult` in `src/hooks/useTasks.ts`**

In the `UseTasksResult` interface (around line 21-24), change:

```ts
editTask: (
  id: number,
  data: Partial<Pick<TaskWithProject, "title" | "description" | "status" | "durationMinutes" | "position">>
) => void;
```

to:

```ts
editTask: (
  id: number,
  data: Partial<Pick<TaskWithProject, "title" | "description" | "status" | "durationMinutes" | "position" | "createdAt">>
) => void;
```

Then apply the same change to the `editTask` `useCallback` parameter type (around line 60-64):

```ts
const editTask = useCallback(
  (
    id: number,
    data: Partial<Pick<TaskWithProject, "title" | "description" | "status" | "durationMinutes" | "position" | "createdAt">>
  ) => {
    const updated = updateTask(id, data);
    if (updated) {
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    }
  },
  []
);
```

- [ ] **Step 3: Widen `handleDetailUpdateField` in `src/components/App.tsx`**

Change the callback at `src/components/App.tsx:282-294` from:

```ts
const handleDetailUpdateField = useCallback(
  (
    id: number,
    data: Partial<Pick<TaskWithProject, "title" | "description" | "durationMinutes">>
  ) => {
    editTask(id, data);
    setDetailTask((prev) =>
      prev && prev.id === id ? { ...prev, ...data } : prev
    );
  },
  [editTask]
);
```

to:

```ts
const handleDetailUpdateField = useCallback(
  (
    id: number,
    data: Partial<Pick<TaskWithProject, "title" | "description" | "durationMinutes" | "createdAt">>
  ) => {
    editTask(id, data);
    setDetailTask((prev) =>
      prev && prev.id === id ? { ...prev, ...data } : prev
    );
  },
  [editTask]
);
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/db/tasks.ts src/hooks/useTasks.ts src/components/App.tsx
git commit -m "feat(tasks): allow createdAt in update/edit paths"
```

---

## Task 3: Add `createdAt` field + day-cycler UI to `TaskDetail`

**Files:**
- Modify: `src/components/TaskDetail.tsx`

This task is the main UI change. It edits multiple regions in a single file; apply all edits then verify together.

- [ ] **Step 1: Update imports**

At the top of `src/components/TaskDetail.tsx`, change:

```ts
import { formatDuration } from "../utils/week.js";
```

to:

```ts
import {
  formatDuration,
  getDayOfWeek,
  setDayOfWeekPreservingTime,
  DAY_LABELS,
} from "../utils/week.js";
```

- [ ] **Step 2: Update `DetailField` type and `FIELDS` array**

Change:

```ts
type DetailField = "title" | "project" | "description" | "duration";
const FIELDS: DetailField[] = ["title", "project", "description", "duration"];
```

to:

```ts
type DetailField = "title" | "project" | "description" | "duration" | "createdAt";
const FIELDS: DetailField[] = ["title", "project", "description", "duration", "createdAt"];
```

- [ ] **Step 3: Widen the `onUpdateField` prop type**

Change:

```ts
onUpdateField: (
  id: number,
  data: Partial<Pick<TaskWithProject, "title" | "description" | "durationMinutes">>
) => void;
```

to:

```ts
onUpdateField: (
  id: number,
  data: Partial<Pick<TaskWithProject, "title" | "description" | "durationMinutes" | "createdAt">>
) => void;
```

- [ ] **Step 4: Add a `formatCreatedLabel` helper at module scope**

Add just below the `STATUS_DISPLAY` constant (outside the component):

```ts
function formatCreatedLabel(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const dayIdx = getDayOfWeek(iso);
  return `${DAY_LABELS[dayIdx]} · ${y}-${m}-${day}`;
}
```

- [ ] **Step 5: Add `pendingDayIndex` state and initialize it on edit-entry**

Inside the `TaskDetail` component, next to the other `useState` calls (near `const [editing, setEditing] = useState(false);`), add:

```ts
const [pendingDayIndex, setPendingDayIndex] = useState<number | null>(null);
```

Then modify `startEditing` from:

```ts
const startEditing = useCallback(() => {
  setEditing(true);
  setEditKey((k) => k + 1);
  setErrorMsg(null);
}, []);
```

to:

```ts
const startEditing = useCallback(() => {
  if (currentField === "createdAt") {
    setPendingDayIndex(getDayOfWeek(task.createdAt));
  } else {
    setPendingDayIndex(null);
  }
  setEditing(true);
  setEditKey((k) => k + 1);
  setErrorMsg(null);
}, [currentField, task.createdAt]);
```

- [ ] **Step 6: Handle `createdAt` in `getFieldValue`**

Inside the `getFieldValue` `useCallback`, add a case. Change:

```ts
case "duration":
  return task.durationMinutes
    ? formatDuration(task.durationMinutes)
    : "";
```

to:

```ts
case "duration":
  return task.durationMinutes
    ? formatDuration(task.durationMinutes)
    : "";
case "createdAt":
  return formatCreatedLabel(task.createdAt);
```

- [ ] **Step 7: Add a third `useInput` for the day-cycler**

After the existing edit-mode `useInput` block (the one that handles `key.escape`), add a new `useInput` that handles the cycler. Append this block:

```ts
useInput(
  (input, key) => {
    if (!isActive || !editing || currentField !== "createdAt") return;
    if (pendingDayIndex === null) return;

    if (key.leftArrow || input === "h") {
      setPendingDayIndex((i) => ((i ?? 0) + 6) % 7);
      return;
    }
    if (key.rightArrow || input === "l") {
      setPendingDayIndex((i) => ((i ?? 0) + 1) % 7);
      return;
    }
    if (key.return) {
      const newIso = setDayOfWeekPreservingTime(task.createdAt, pendingDayIndex);
      onUpdateField(task.id, { createdAt: newIso });
      setTimeout(() => setEditing(false), 0);
    }
  },
  { isActive: isActive && editing && currentField === "createdAt" }
);
```

- [ ] **Step 8: Render the cycler UI in `renderField` for the `createdAt` field**

Inside `renderField`, the current `isEditing` branch always renders `<TextInput>`. Change it to branch on the field. Replace:

```tsx
{isEditing ? (
  <TextInput
    key={`${field}-${editKey}`}
    defaultValue={displayValue}
    onSubmit={saveEdit}
    suggestions={suggestions}
    placeholder={
      field === "duration"
        ? "e.g. 15m, 1h, 1.5h, 2h, 1d"
        : `Enter ${label.toLowerCase()}`
    }
  />
) : (
  <Text
    color={
      field === "project" ? task.projectColor : isFocused ? "white" : undefined
    }
    dimColor={!displayValue && !isFocused}
  >
    {displayValue || (field === "description" ? "No description" : field === "duration" ? "Not set" : "")}
  </Text>
)}
```

with:

```tsx
{isEditing && field === "createdAt" ? (
  <Text color="cyan">
    ◀ {pendingDayIndex !== null
      ? formatCreatedLabel(
          setDayOfWeekPreservingTime(task.createdAt, pendingDayIndex)
        )
      : displayValue} ▶
  </Text>
) : isEditing ? (
  <TextInput
    key={`${field}-${editKey}`}
    defaultValue={displayValue}
    onSubmit={saveEdit}
    suggestions={suggestions}
    placeholder={
      field === "duration"
        ? "e.g. 15m, 1h, 1.5h, 2h, 1d"
        : `Enter ${label.toLowerCase()}`
    }
  />
) : (
  <Text
    color={
      field === "project" ? task.projectColor : isFocused ? "white" : undefined
    }
    dimColor={!displayValue && !isFocused}
  >
    {displayValue || (field === "description" ? "No description" : field === "duration" ? "Not set" : "")}
  </Text>
)}
```

- [ ] **Step 9: Update the `label` lookup to include `Created`**

Change:

```ts
const label =
  field === "title"
    ? "Title"
    : field === "project"
      ? "Project"
      : field === "description"
        ? "Description"
        : "Duration";
```

to:

```ts
const label =
  field === "title"
    ? "Title"
    : field === "project"
      ? "Project"
      : field === "description"
        ? "Description"
        : field === "duration"
          ? "Duration"
          : "Created";
```

- [ ] **Step 10: Remove the read-only "Created" line from the top info bar**

Change the top info bar from:

```tsx
<Box gap={3} marginBottom={1}>
  <Box>
    <Text dimColor>Status: </Text>
    <Badge color={status.color}>{status.label}</Badge>
  </Box>
  <Box>
    <Text dimColor>Created: </Text>
    <Text>{new Date(task.createdAt).toLocaleDateString()}</Text>
  </Box>
</Box>
```

to:

```tsx
<Box gap={3} marginBottom={1}>
  <Box>
    <Text dimColor>Status: </Text>
    <Badge color={status.color}>{status.label}</Badge>
  </Box>
</Box>
```

- [ ] **Step 11: Verify build**

Run: `npm run build`
Expected: no TypeScript errors.

- [ ] **Step 12: Run existing tests**

Run: `npm test`
Expected: all tests PASS (parser tests + new `week.test.ts` tests).

- [ ] **Step 13: Commit**

```bash
git add src/components/TaskDetail.tsx
git commit -m "feat(task-detail): editable created date with day-of-week cycler"
```

---

## Task 4: Update help bar hints (if applicable)

**Files:**
- Read first: `src/components/HelpBar.tsx`
- Possibly modify: `src/components/HelpBar.tsx`

The help bar shows keyboard hints. Check whether it surfaces per-mode hints for the detail view, and add `←/→` cycle hints only if the existing pattern does so.

- [ ] **Step 1: Read the help bar file**

Run: open `src/components/HelpBar.tsx` and determine whether it shows different hints per mode/field. If it does not conditionally render detail-view hints at all, skip this entire task.

- [ ] **Step 2: If hints exist for the detail view, add cycler hint**

If the help bar shows detail-view hints, add an entry for the cycler when the focused field is `createdAt` and `editing` is true: e.g. `←/→ cycle day · Enter save · Esc cancel`. Otherwise make no changes.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: no TypeScript errors.

- [ ] **Step 4: Commit (only if changes were made)**

```bash
git add src/components/HelpBar.tsx
git commit -m "docs(help): add created-date cycler hint"
```

---

## Task 5: Manual verification

This task has no tests — it's a manual TTY walkthrough. Do not skip.

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: clean build.

- [ ] **Step 2: Launch the app**

Run: `npm start`

- [ ] **Step 3: Golden path**

  1. Open any task's detail view.
  2. Press `j` until "> Created:" is focused. Confirm the displayed value is `<DAY> · YYYY-MM-DD` matching the task's creation date.
  3. Press `Enter` to enter edit mode. Confirm the value renders with `◀ … ▶` in cyan.
  4. Press `→` until you reach a different day. Confirm the date advances by one calendar day per press.
  5. Press `Enter` to save.
  6. Close the detail (`Esc` or `q`). Confirm the task card has re-slotted under the new day column in the board.

- [ ] **Step 4: Wrap-around**

  1. Re-open the same task's detail.
  2. Enter edit mode on Created.
  3. From MON press `←`: confirm it wraps to SUN.
  4. From SUN press `→`: confirm it wraps to MON.
  5. Press `Esc`: confirm the card's day column is unchanged after exit.

- [ ] **Step 5: Time-of-day preservation**

  1. Create two tasks in quick succession on the same day (same project).
  2. Move the later one to another day, then move the earlier one to the same day.
  3. Open the new column and confirm the earlier-created task still appears above the later-created task in position order.

- [ ] **Step 6: Top info bar no longer duplicates Created**

In the detail view, confirm the top info bar only shows `Status:` (no `Created:` line).

- [ ] **Step 7: No regressions in other fields**

Edit title, project, description, duration the same way they worked before. All must still save/cancel as before.

---

## Risks and notes

- **Timezone:** `getWeekStart` and `getDayOfWeek` both work in local time. The new helper intentionally follows the same convention so day-of-week semantics stay consistent across the app.
- **Ink `useInput`:** the three `useInput` handlers in `TaskDetail` are all gated by `isActive` plus a mode check. They must be mutually exclusive — the new one is gated on `editing && currentField === "createdAt"`, the existing edit-mode one only listens for `key.escape` so both can be active simultaneously without conflict (Esc cancel still works during cycling).
- **`setTimeout(…, 0)` pattern:** keep this for the cycler commit path as well; without it, the same `Enter` keypress would be received by the navigation-mode `useInput` on the next tick and re-enter edit mode.
