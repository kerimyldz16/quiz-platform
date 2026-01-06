import { db } from "./db.js";

export async function listUsers() {
  const q = `
    SELECT id, first_name, last_name, phone, created_at,
           correct_count, wrong_count, finished_at, duration_ms
    FROM players
    ORDER BY created_at DESC
  `;
  const r = await db.query(q);
  return r.rows;
}

export async function deleteAllUsers() {
  await db.query(`DELETE FROM players`);
}
