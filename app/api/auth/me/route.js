import { json, options } from "../../../../lib/db";
import { requireUser, publicUser } from "../../../../lib/auth";

export async function OPTIONS() {
  return options();
}

export async function GET(request) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;
  return json({ user: publicUser(auth.user) });
}
