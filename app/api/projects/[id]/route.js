import { sql, json, options } from "../../../../lib/db";
import { requireUser } from "../../../../lib/auth";

export async function OPTIONS() {
  return options();
}

export async function PATCH(request, { params }) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;
  const { id } = await params;
  const body = await request.json();
  const db = sql();
  const current = await db`SELECT * FROM projects WHERE id = ${id} AND user_id = ${auth.user.id}`;
  if (!current.length) return json({ error: "Project not found." }, 404);
  if (current[0].is_inbox && body.name && body.name !== "Inbox") {
    return json({ error: "Inbox cannot be renamed." }, 400);
  }
  const name = body.name != null ? String(body.name).trim() : current[0].name;
  const color = body.color != null ? String(body.color) : current[0].color;
  const favorite = body.is_favorite != null ? Boolean(body.is_favorite) : current[0].is_favorite;
  const rows = await db`
    UPDATE projects SET name = ${name}, color = ${color}, is_favorite = ${favorite}
    WHERE id = ${id} AND user_id = ${auth.user.id}
    RETURNING *`;
  return json({ project: rows[0] });
}

export async function DELETE(request, { params }) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;
  const { id } = await params;
  const db = sql();
  const current = await db`SELECT * FROM projects WHERE id = ${id} AND user_id = ${auth.user.id}`;
  if (!current.length) return json({ error: "Project not found." }, 404);
  if (current[0].is_inbox) return json({ error: "Inbox cannot be deleted." }, 400);
  await db`DELETE FROM projects WHERE id = ${id} AND user_id = ${auth.user.id}`;
  return json({ ok: true });
}
