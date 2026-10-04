import { sql, json, options } from "../../../../lib/db";
import { requireUser } from "../../../../lib/auth";

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

export async function PATCH(request, { params }) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;
  const { id } = await params;
  const body = await request.json();
  const db = sql();
  const current = await db`SELECT * FROM tasks WHERE id = ${id} AND user_id = ${auth.user.id}`;
  if (!current.length) return json({ error: "Task not found." }, 404);
  const task = current[0];
  const content = body.content != null ? String(body.content).trim() : task.content;
  const description = body.description != null ? String(body.description) : task.description;
  const priority = body.priority != null ? Math.min(4, Math.max(1, Number(body.priority))) : Number(task.priority);
  const projectId = body.project_id != null ? body.project_id : task.project_id;
  const dueDate = body.due_date !== undefined ? body.due_date || null : task.due_date;
  const dueTime = body.due_time !== undefined ? body.due_time || null : task.due_time;
  let completed = task.is_completed;
  let completedAt = task.completed_at;
  if (body.is_completed != null) {
    completed = Boolean(body.is_completed);
    completedAt = completed ? new Date().toISOString() : null;
  }
  const rows = await db`
    UPDATE tasks SET
      content = ${content},
      description = ${description},
      priority = ${priority},
      project_id = ${projectId},
      due_date = ${dueDate},
      due_time = ${dueTime},
      is_completed = ${completed},
      completed_at = ${completedAt}
    WHERE id = ${id} AND user_id = ${auth.user.id}
    RETURNING *`;
  return json({ task: mapTask(rows[0]) });
}

export async function DELETE(request, { params }) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;
  const { id } = await params;
  const db = sql();
  const rows = await db`DELETE FROM tasks WHERE id = ${id} AND user_id = ${auth.user.id} RETURNING id`;
  if (!rows.length) return json({ error: "Task not found." }, 404);
  return json({ ok: true });
}
