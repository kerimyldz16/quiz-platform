import { db } from "./db.js";

export async function createPlayer({ firstName, lastName, phone, nickname }) {
  const result = await db.query(
    `INSERT INTO players (first_name, last_name, phone, nickname)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [firstName, lastName, phone, nickname]
  );

  return result.rows[0].id;
}
