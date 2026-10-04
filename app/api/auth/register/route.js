import { sql, ensureSchema, id, json, options } from "../../../../lib/db";
import { hashPassword, signToken, publicUser } from "../../../../lib/auth";

export async function OPTIONS() {
  return options();
}

export async function POST(request) {
  try {
    await ensureSchema();
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const password = String(body.password || "");
    if (!email || !name || password.length < 6) {
      return json({ error: "Name, email, and a password of at least 6 characters are required." }, 400);
    }
    const db = sql();
    const existing = await db`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length) return json({ error: "Email already registered." }, 409);
    const userId = id();
    const passwordHash = await hashPassword(password);
    await db`INSERT INTO users (id, email, name, password_hash) VALUES (${userId}, ${email}, ${name}, ${passwordHash})`;
    const inboxId = id();
    await db`INSERT INTO projects (id, user_id, name, color, is_inbox, sort_order)
      VALUES (${inboxId}, ${userId}, 'Inbox', '#db4c3f', true, 0)`;
    const user = { id: userId, email, name };
    const token = await signToken(user);
    return json({ token, user: publicUser(user) }, 201);
  } catch (error) {
    return json({ error: error.message || "Register failed" }, 500);
  }
}
