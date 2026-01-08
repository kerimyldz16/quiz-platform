import { db } from "./db.js";

export async function createPlayer({ firstName, lastName, nickName, phone }) {
  const q = `
    INSERT INTO players (first_name, last_name, nick_name, phone)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `;

  const values = [firstName, lastName, nickName, phone];
  const result = await db.query(q, values);
  return result.rows[0].id;
}
export async function getPlayersByIds(playerIds) {
  if (!playerIds.length) return [];
  const placeholders = playerIds.map((_, i) => `$${i + 1}`).join(",");
  const q = `
    SELECT id, first_name, last_name, nick_name, phone
    FROM players
    WHERE id IN (${placeholders})
  `;
  const result = await db.query(q, playerIds);
  return result.rows;
}

export async function updatePlayerResult({
  playerId,
  correctCount,
  wrongCount,
  finishedAt,
  durationMs,
}) {
  const q = `
    UPDATE players
    SET
      correct_count = $2,
      wrong_count = $3,
      finished_at = $4,
      duration_ms = $5
    WHERE id = $1
  `;

  await db.query(q, [
    playerId,
    correctCount,
    wrongCount,
    finishedAt,
    durationMs,
  ]);
}
