import { sql, id, json, options } from "../../../lib/db";
import { requireUser } from "../../../lib/auth";

export async function OPTIONS() {
  return options();
}

export async function GET(request) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;
  const db = sql();
  const projects = await db`
    SELECT p.*, (
      SELECT COUNT(*)::int FROM tasks t
      WHERE t.project_id = p.id AND t.is_completed = false AND t.parent_id IS NULL
    ) AS open_count
    FROM projects p
    WHERE p.user_id = ${auth.user.id}
    ORDER BY p.is_inbox DESC, p.sort_order ASC, p.created_at ASC`;
  return json({ projects });
}

export async function POST(request) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;
  const body = await request.json();
  const name = String(body.name || "").trim();
  if (!name) return json({ error: "Project name is required." }, 400);
  const color = String(body.color || "#246fe0");
  const projectId = id();
  const db = sql();
  const rows = await db`
    INSERT INTO projects (id, user_id, name, color, is_favorite)
    VALUES (${projectId}, ${auth.user.id}, ${name}, ${color}, ${Boolean(body.is_favorite)})
    RETURNING *`;
  return json({ project: { ...rows[0], open_count: 0 } }, 201);
}
