import { neon } from "@neondatabase/serverless";

let ready = false;

export function databaseUrl() {
  return (
    process.env.taskio_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.taskio_POSTGRES_URL ||
    process.env.POSTGRES_URL ||
    process.env.taskio_DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL_UNPOOLED ||
    ""
  );
}

export function sql() {
  const url = databaseUrl();
  if (!url) {
    throw new Error("Database URL is not set. Expected taskio_DATABASE_URL or DATABASE_URL.");
  }
  return neon(url);
}

export async function ensureSchema() {
  if (ready) return;
  const db = sql();
  await db`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await db`CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#db4c3f',
    is_inbox BOOLEAN NOT NULL DEFAULT false,
    is_favorite BOOLEAN NOT NULL DEFAULT false,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await db`CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_id TEXT,
    content TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    priority INT NOT NULL DEFAULT 1,
    due_date DATE,
    due_time TIME,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await db`CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)`;
  ready = true;
}

export function id() {
  return crypto.randomUUID();
}

export function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    },
  });
}

export function options() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    },
  });
}
