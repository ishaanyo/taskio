import { sql, id, json, options } from "../../../lib/db";
import { requireUser } from "../../../lib/auth";

export async function OPTIONS() {
  return options();
}

function mapTask(row) {
  return {
    ...row,
    due_date: row.due_date ? String(row.due_date).slice(0, 10) : null,
    due_time: row.due_time ? String(row.due_time).slice(0, 5) : null,
    priority: Number(row.priority),
  };
}

export async function GET(request) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");
  const view = searchParams.get("view");
  const includeCompleted = searchParams.get("completed") === "1";
  const db = sql();
  let rows;
  if (view === "today") {
    rows = await db`
      SELECT * FROM tasks
      WHERE user_id = ${auth.user.id}
        AND due_date = CURRENT_DATE
        AND (${includeCompleted} OR is_completed = false)
      ORDER BY is_completed ASC, priority DESC, due_time ASC NULLS LAST, sort_order ASC`;
  } else if (view === "upcoming") {
    rows = await db`
      SELECT * FROM tasks
      WHERE user_id = ${auth.user.id}
        AND due_date IS NOT NULL
        AND due_date >= CURRENT_DATE
        AND (${includeCompleted} OR is_completed = false)
      ORDER BY due_date ASC, due_time ASC NULLS LAST, priority DESC`;
  } else if (view === "inbox") {
    rows = await db`
      SELECT t.* FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.user_id = ${auth.user.id}
        AND p.is_inbox = true
        AND (${includeCompleted} OR t.is_completed = false)
      ORDER BY t.is_completed ASC, t.priority DESC, t.created_at DESC`;
  } else if (projectId) {
    rows = await db`
      SELECT * FROM tasks
      WHERE user_id = ${auth.user.id}
        AND project_id = ${projectId}
        AND (${includeCompleted} OR is_completed = false)
      ORDER BY is_completed ASC, priority DESC, due_date ASC NULLS LAST, sort_order ASC`;
  } else {
    rows = await db`
      SELECT * FROM tasks
      WHERE user_id = ${auth.user.id}
        AND (${includeCompleted} OR is_completed = false)
      ORDER BY is_completed ASC, priority DESC, due_date ASC NULLS LAST`;
  }
  return json({ tasks: rows.map(mapTask) });
}

export async function POST(request) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;
  const body = await request.json();
  const content = String(body.content || "").trim();
  if (!content) return json({ error: "Task content is required." }, 400);
  const db = sql();
  let projectId = body.project_id || null;
  if (!projectId) {
    const inbox = await db`SELECT id FROM projects WHERE user_id = ${auth.user.id} AND is_inbox = true LIMIT 1`;
    if (!inbox.length) return json({ error: "Inbox missing." }, 500);
    projectId = inbox[0].id;
  } else {
    const owned = await db`SELECT id FROM projects WHERE id = ${projectId} AND user_id = ${auth.user.id}`;
    if (!owned.length) return json({ error: "Project not found." }, 404);
  }
  const priority = Math.min(4, Math.max(1, Number(body.priority || 1)));
  const dueDate = body.due_date || null;
  const dueTime = body.due_time || null;
  const taskId = id();
  const rows = await db`
    INSERT INTO tasks (id, user_id, project_id, parent_id, content, description, priority, due_date, due_time)
    VALUES (
      ${taskId}, ${auth.user.id}, ${projectId}, ${body.parent_id || null}, ${content},
      ${String(body.description || "")}, ${priority}, ${dueDate}, ${dueTime}
    )
    RETURNING *`;
  return json({ task: mapTask(rows[0]) }, 201);
}
