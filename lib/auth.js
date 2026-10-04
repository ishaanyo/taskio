import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { sql, ensureSchema, json } from "./db";

function secret() {
  const value = process.env.AUTH_SECRET || "taskio-dev-secret-change-me";
  return new TextEncoder().encode(value);
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function checkPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export async function signToken(user) {
  return new SignJWT({ email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

export async function requireUser(request) {
  await ensureSchema();
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return { error: json({ error: "Unauthorized" }, 401) };
  try {
    const { payload } = await jwtVerify(token, secret());
    const db = sql();
    const rows = await db`SELECT id, email, name, created_at FROM users WHERE id = ${payload.sub}`;
    if (!rows.length) return { error: json({ error: "Unauthorized" }, 401) };
    return { user: rows[0] };
  } catch {
    return { error: json({ error: "Unauthorized" }, 401) };
  }
}

export function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name, created_at: user.created_at };
}
