import { eq } from "drizzle-orm";
import { getDb } from "./index.js";
import { projects, type Project, type NewProject } from "./schema.js";

const PROJECT_COLORS = [
  "#6366f1", // indigo
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
  "#14b8a6", // teal
  "#84cc16", // lime
];

function nextColor(count: number): string {
  return PROJECT_COLORS[count % PROJECT_COLORS.length];
}

export function getAllProjects(): Project[] {
  const db = getDb();
  return db.select().from(projects).all();
}

export function getProjectById(id: number): Project | undefined {
  const db = getDb();
  return db.select().from(projects).where(eq(projects.id, id)).get();
}

export function getProjectByName(name: string): Project | undefined {
  const db = getDb();
  return db.select().from(projects).where(eq(projects.name, name)).get();
}

/**
 * Get or create a project by name. Auto-assigns a color.
 */
export function ensureProject(name: string): Project {
  const existing = getProjectByName(name);
  if (existing) return existing;

  const db = getDb();
  const count = db.select().from(projects).all().length;
  const result = db
    .insert(projects)
    .values({ name, color: nextColor(count) })
    .returning()
    .get();
  return result;
}

export function updateProject(
  id: number,
  data: Partial<Pick<NewProject, "name" | "color">>
): Project | undefined {
  const db = getDb();
  return db
    .update(projects)
    .set(data)
    .where(eq(projects.id, id))
    .returning()
    .get();
}

export function deleteProject(id: number): void {
  const db = getDb();
  db.delete(projects).where(eq(projects.id, id)).run();
}
