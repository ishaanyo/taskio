import { json, options } from "../../../lib/db";

export async function GET() {
  return json({
    ok: true,
    service: "taskio",
    database: Boolean(process.env.DATABASE_URL),
  });
}

export async function OPTIONS() {
  return options();
}
