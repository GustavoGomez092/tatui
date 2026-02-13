import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import envPaths from "env-paths";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import * as schema from "./schema.js";

const paths = envPaths("tatui", { suffix: "" });

export function getDbPath(): string {
  mkdirSync(paths.data, { recursive: true });
  return join(paths.data, "tatui.db");
}

let _db: ReturnType<typeof createDb> | null = null;

function createDb() {
  const sqlite = new Database(getDbPath());
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

export function getDb() {
  if (!_db) {
    _db = createDb();
    initializeDb(_db);
  }
  return _db;
}

function initializeDb(db: ReturnType<typeof createDb>) {
  const sqlite = (db as any).session?.client as Database.Database | undefined;
  if (!sqlite) return;

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#6366f1',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      project_id INTEGER NOT NULL REFERENCES projects(id),
      week_id TEXT NOT NULL,
      duration_minutes INTEGER,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_week ON tasks(week_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  `);
}

export { schema };
