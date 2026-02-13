import { eq, and, desc, asc } from "drizzle-orm";
import { getDb } from "./index.js";
import {
  tasks,
  projects,
  type Task,
  type NewTask,
  type TaskStatus,
} from "./schema.js";
import { getWeekId } from "../utils/week.js";
import { ensureProject } from "./projects.js";
import { parseShorthand, isShorthand } from "../utils/parser.js";

export interface TaskWithProject extends Task {
  projectName: string;
  projectColor: string;
  warnings?: string[];
}

export function getTasksByWeek(
  weekId: string = getWeekId()
): TaskWithProject[] {
  const db = getDb();
  const rows = db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      projectId: tasks.projectId,
      weekId: tasks.weekId,
      durationMinutes: tasks.durationMinutes,
      position: tasks.position,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      projectName: projects.name,
      projectColor: projects.color,
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(eq(tasks.weekId, weekId))
    .orderBy(asc(tasks.position), asc(tasks.id))
    .all();
  return rows;
}

export function getTasksByProject(
  projectId: number,
  weekId: string = getWeekId()
): TaskWithProject[] {
  const db = getDb();
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      projectId: tasks.projectId,
      weekId: tasks.weekId,
      durationMinutes: tasks.durationMinutes,
      position: tasks.position,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      projectName: projects.name,
      projectColor: projects.color,
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(eq(tasks.projectId, projectId), eq(tasks.weekId, weekId)))
    .orderBy(asc(tasks.position), asc(tasks.id))
    .all();
}

export function getTaskById(id: number): TaskWithProject | undefined {
  const db = getDb();
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      projectId: tasks.projectId,
      weekId: tasks.weekId,
      durationMinutes: tasks.durationMinutes,
      position: tasks.position,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      projectName: projects.name,
      projectColor: projects.color,
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(eq(tasks.id, id))
    .get();
}

/**
 * Create a task from structured input or shorthand string.
 */
export function createTask(
  input: string | Omit<NewTask, "weekId"> & { project?: string }
): TaskWithProject {
  const db = getDb();

  if (typeof input === "string") {
    if (!isShorthand(input)) {
      throw new Error("String input must use shorthand syntax (project::title)");
    }
    const parsed = parseShorthand(input);
    if (!parsed) {
      throw new Error("Invalid shorthand syntax");
    }
    const project = ensureProject(parsed.project);
    const maxPos =
      db
        .select({ position: tasks.position })
        .from(tasks)
        .where(eq(tasks.weekId, getWeekId()))
        .orderBy(desc(tasks.position))
        .get()?.position ?? -1;

    const result = db
      .insert(tasks)
      .values({
        title: parsed.title,
        description: parsed.description ?? null,
        projectId: project.id,
        weekId: getWeekId(),
        durationMinutes: parsed.durationMinutes ?? null,
        position: maxPos + 1,
      })
      .returning()
      .get();

    return { ...result, projectName: project.name, projectColor: project.color, warnings: parsed.warnings };
  }

  const { project: projectName, ...taskData } = input;
  let projectId = taskData.projectId;

  if (projectName) {
    const proj = ensureProject(projectName);
    projectId = proj.id;
  }

  const maxPos =
    db
      .select({ position: tasks.position })
      .from(tasks)
      .where(eq(tasks.weekId, getWeekId()))
      .orderBy(desc(tasks.position))
      .get()?.position ?? -1;

  const result = db
    .insert(tasks)
    .values({
      ...taskData,
      projectId,
      weekId: getWeekId(),
      position: taskData.position ?? maxPos + 1,
    })
    .returning()
    .get();

  const proj = db
    .select()
    .from(projects)
    .where(eq(projects.id, result.projectId))
    .get()!;

  return { ...result, projectName: proj.name, projectColor: proj.color };
}

export function updateTask(
  id: number,
  data: Partial<Pick<Task, "title" | "description" | "status" | "durationMinutes" | "position">>
): TaskWithProject | undefined {
  const db = getDb();
  const result = db
    .update(tasks)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(tasks.id, id))
    .returning()
    .get();

  if (!result) return undefined;

  const proj = db
    .select()
    .from(projects)
    .where(eq(projects.id, result.projectId))
    .get()!;

  return { ...result, projectName: proj.name, projectColor: proj.color };
}

export function changeTaskProject(id: number, projectName: string): TaskWithProject | undefined {
  const db = getDb();
  const project = ensureProject(projectName);
  const result = db
    .update(tasks)
    .set({ projectId: project.id, updatedAt: new Date().toISOString() })
    .where(eq(tasks.id, id))
    .returning()
    .get();

  if (!result) return undefined;
  return { ...result, projectName: project.name, projectColor: project.color };
}

export function moveTask(id: number, newStatus: TaskStatus): TaskWithProject | undefined {
  return updateTask(id, { status: newStatus });
}

export function deleteTask(id: number): void {
  const db = getDb();
  db.delete(tasks).where(eq(tasks.id, id)).run();
}

export function getTasksByStatus(
  weekId: string = getWeekId()
): Record<TaskStatus, TaskWithProject[]> {
  const allTasks = getTasksByWeek(weekId);
  return {
    todo: allTasks.filter((t) => t.status === "todo"),
    "in-progress": allTasks.filter((t) => t.status === "in-progress"),
    done: allTasks.filter((t) => t.status === "done"),
    archived: allTasks.filter((t) => t.status === "archived"),
  };
}
