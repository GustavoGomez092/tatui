import { eq, ne, and, sql } from "drizzle-orm";
import { getDb } from "./index.js";
import { tasks, projects } from "./schema.js";
import { getWeekId } from "../utils/week.js";
import { formatDuration } from "../utils/week.js";

/**
 * Get all distinct week IDs in the database
 */
export function getAllWeekIds(): string[] {
  const db = getDb();
  const rows = db
    .selectDistinct({ weekId: tasks.weekId })
    .from(tasks)
    .orderBy(tasks.weekId)
    .all();
  return rows.map((r) => r.weekId);
}

/**
 * Archive all non-done tasks from previous weeks into current week.
 * Called automatically when the app starts on a new week.
 */
export function rolloverTasks(): number {
  const db = getDb();
  const currentWeek = getWeekId();
  const previousWeeks = getAllWeekIds().filter((w) => w < currentWeek);

  let rolledOver = 0;

  for (const weekId of previousWeeks) {
    // Find unfinished tasks from previous weeks
    const unfinished = db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.weekId, weekId),
          ne(tasks.status, "done"),
          ne(tasks.status, "archived")
        )
      )
      .all();

    for (const task of unfinished) {
      // Move to current week, reset status to todo
      db.update(tasks)
        .set({
          weekId: currentWeek,
          status: "todo",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(tasks.id, task.id))
        .run();
      rolledOver++;
    }
  }

  return rolledOver;
}

export interface WeekSummary {
  weekId: string;
  totalTasks: number;
  completed: number;
  totalMinutes: number;
  completedMinutes: number;
  byProject: {
    projectName: string;
    projectColor: string;
    total: number;
    completed: number;
    minutes: number;
  }[];
}

/**
 * Generate a summary for a given week
 */
export function getWeekSummary(weekId: string = getWeekId()): WeekSummary {
  const db = getDb();
  const allTasks = db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      durationMinutes: tasks.durationMinutes,
      projectId: tasks.projectId,
      projectName: projects.name,
      projectColor: projects.color,
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(eq(tasks.weekId, weekId))
    .all();

  const byProjectMap = new Map<
    number,
    { projectName: string; projectColor: string; total: number; completed: number; minutes: number }
  >();

  for (const t of allTasks) {
    const entry = byProjectMap.get(t.projectId) ?? {
      projectName: t.projectName,
      projectColor: t.projectColor,
      total: 0,
      completed: 0,
      minutes: 0,
    };
    entry.total++;
    if (t.status === "done") entry.completed++;
    entry.minutes += t.durationMinutes ?? 0;
    byProjectMap.set(t.projectId, entry);
  }

  return {
    weekId,
    totalTasks: allTasks.length,
    completed: allTasks.filter((t) => t.status === "done").length,
    totalMinutes: allTasks.reduce((s, t) => s + (t.durationMinutes ?? 0), 0),
    completedMinutes: allTasks
      .filter((t) => t.status === "done")
      .reduce((s, t) => s + (t.durationMinutes ?? 0), 0),
    byProject: Array.from(byProjectMap.values()),
  };
}

/**
 * Export week summary as formatted text
 */
export function exportWeekSummary(weekId: string = getWeekId()): string {
  const summary = getWeekSummary(weekId);
  const lines: string[] = [];

  lines.push(`# Week ${summary.weekId} Summary`);
  lines.push("");
  lines.push(
    `Tasks: ${summary.completed}/${summary.totalTasks} completed`
  );

  if (summary.totalMinutes > 0) {
    lines.push(
      `Time: ${formatDuration(summary.completedMinutes)}/${formatDuration(summary.totalMinutes)}`
    );
  }

  if (summary.byProject.length > 0) {
    lines.push("");
    lines.push("## By Project");
    for (const p of summary.byProject) {
      lines.push(
        `- ${p.projectName}: ${p.completed}/${p.total} tasks${p.minutes > 0 ? ` (${formatDuration(p.minutes)})` : ""}`
      );
    }
  }

  return lines.join("\n");
}
