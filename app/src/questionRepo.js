import { db } from "./db.js";

export async function listQuestions() {
  const q = `
    SELECT id, text, options, correct, order_index
    FROM questions
    ORDER BY order_index ASC
  `;
  const r = await db.query(q);
  return r.rows;
}

export async function createQuestion({ text, options, correct, orderIndex }) {
  const q = `
    INSERT INTO questions (text, options, correct, order_index)
    VALUES ($1, $2::jsonb, $3, $4)
    RETURNING id
  `;
  const r = await db.query(q, [
    text,
    JSON.stringify(options),
    correct,
    orderIndex,
  ]);
  return r.rows[0].id;
}

export async function updateQuestion(
  id,
  { text, options, correct, orderIndex }
) {
  const q = `
    UPDATE questions
    SET text=$2, options=$3::jsonb, correct=$4, order_index=$5
    WHERE id=$1
  `;
  await db.query(q, [id, text, JSON.stringify(options), correct, orderIndex]);
}

export async function deleteQuestion(id) {
  await db.query(`DELETE FROM questions WHERE id=$1`, [id]);
}

export async function deleteAllQuestions() {
  await db.query(`DELETE FROM questions`);
}
