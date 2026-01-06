import { getRedis } from "./redis.js";
import { listQuestions } from "./questionRepo.js";

let cache = null; // [{id,text,options,correct,order_index}]

export async function refreshQuestionsFromDbToSnapshot() {
  const redis = getRedis();
  const rows = await listQuestions();

  // options jsonb -> JS array olarak gelir; garantiye al
  const normalized = rows.map((q) => ({
    id: q.id,
    text: q.text,
    options: Array.isArray(q.options) ? q.options : [],
    correct: q.correct,
    orderIndex: q.order_index,
  }));

  await redis.set("game:questions", JSON.stringify(normalized));
  await redis.set("game:totalQuestions", String(normalized.length));

  cache = normalized;
  return normalized.length;
}

export async function getQuestionsSnapshot() {
  if (cache) return cache;

  const redis = getRedis();
  const raw = await redis.get("game:questions");
  if (!raw) {
    cache = [];
    return cache;
  }

  try {
    cache = JSON.parse(raw);
  } catch {
    cache = [];
  }
  return cache;
}

export function clearQuestionsCache() {
  cache = null;
}
