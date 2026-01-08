import { db } from "./db.js";

export async function listUsersCount() {
  const q = `SELECT COUNT(*)::int AS count FROM players`;
  const r = await db.query(q);
  return r.rows[0].count;
}

export async function deleteAllUsers() {
  await db.query(`DELETE FROM players`);
}
