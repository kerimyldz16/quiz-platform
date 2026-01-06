import express from "express";
import { requireAdmin } from "./adminAuth.js";
import {
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from "./questionRepo.js";
import { clearQuestionsCache } from "./questionStore.js";
import { getGameState } from "./gameLifecycle.js";

export const adminQuestionRouter = express.Router();

function validateQuestion(body) {
  const { text, options, correct, orderIndex } = body || {};
  if (!text || typeof text !== "string") return "Invalid text";
  if (!Array.isArray(options) || options.length < 2) return "Invalid options";
  if (typeof correct !== "string" || !correct) return "Invalid correct";
  if (!options.map(String).includes(String(correct)))
    return "Correct must be one of options";
  const oi = Number(orderIndex);
  if (!Number.isInteger(oi) || oi < 1) return "Invalid orderIndex";
  return null;
}

// list
adminQuestionRouter.get("/questions", requireAdmin, async (req, res) => {
  const rows = await listQuestions();
  res.json({ questions: rows });
});

// create
adminQuestionRouter.post("/questions", requireAdmin, async (req, res) => {
  const gs = await getGameState();
  if (gs.state === "RUNNING")
    return res
      .status(400)
      .json({ error: "Cannot edit questions while RUNNING" });

  const err = validateQuestion(req.body);
  if (err) return res.status(400).json({ error: err });

  try {
    const id = await createQuestion({
      text: req.body.text,
      options: req.body.options,
      correct: req.body.correct,
      orderIndex: Number(req.body.orderIndex),
    });
    clearQuestionsCache();
    res.json({ id });
  } catch (e) {
    // order_index unique ihlali
    if (e?.code === "23505")
      return res.status(400).json({ error: "orderIndex must be unique" });
    res.status(500).json({ error: "Create question failed" });
  }
});

// update
adminQuestionRouter.put("/questions/:id", requireAdmin, async (req, res) => {
  const gs = await getGameState();
  if (gs.state === "RUNNING")
    return res
      .status(400)
      .json({ error: "Cannot edit questions while RUNNING" });

  const err = validateQuestion(req.body);
  if (err) return res.status(400).json({ error: err });

  const id = Number(req.params.id);
  if (!Number.isInteger(id))
    return res.status(400).json({ error: "Invalid id" });

  try {
    await updateQuestion(id, {
      text: req.body.text,
      options: req.body.options,
      correct: req.body.correct,
      orderIndex: Number(req.body.orderIndex),
    });
    clearQuestionsCache();
    res.json({ ok: true });
  } catch (e) {
    if (e?.code === "23505")
      return res.status(400).json({ error: "orderIndex must be unique" });
    res.status(500).json({ error: "Update question failed" });
  }
});

// delete
adminQuestionRouter.delete("/questions/:id", requireAdmin, async (req, res) => {
  const gs = await getGameState();
  if (gs.state === "RUNNING")
    return res
      .status(400)
      .json({ error: "Cannot edit questions while RUNNING" });

  const id = Number(req.params.id);
  if (!Number.isInteger(id))
    return res.status(400).json({ error: "Invalid id" });

  await deleteQuestion(id);
  clearQuestionsCache();
  res.json({ ok: true });
});
