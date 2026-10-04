import { sql, ensureSchema, json, options } from "../../../../lib/db";
import { checkPassword, signToken, publicUser } from "../../../../lib/auth";

export async function OPTIONS() {
  return options();
}

export async function POST(request) {
  try {
    await ensureSchema();
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const db = sql();
    const rows = await db`SELECT id, email, name, password_hash, created_at FROM users WHERE email = ${email}`;
    if (!rows.length || !(await checkPassword(password, rows[0].password_hash))) {
      return json({ error: "Invalid email or password." }, 401);
    }
    const user = rows[0];
    const token = await signToken(user);
    return json({ token, user: publicUser(user) });
  } catch (error) {
    return json({ error: error.message || "Login failed" }, 500);
  }
}
