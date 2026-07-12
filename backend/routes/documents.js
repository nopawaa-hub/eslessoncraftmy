import { Router } from "express";
import LessonPlan from "../models/LessonPlan.js";
import { requireDatabase } from "../services/db.js";
import { buildLessonDocxBuffer, buildLessonPdfBuffer } from "../services/lessonDocx.js";

const router = Router();

function safeFilename(value) {
  return String(value || "lesson-plan")
    .replace(/[^a-z0-9-_ ]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

router.post("/lesson-plan", async (req, res, next) => {
  try {
    const format = req.query.format === "pdf" || req.body?.format === "pdf" ? "pdf" : "docx";
    const buffer = format === "pdf" ? await buildLessonPdfBuffer(req.body || {}) : await buildLessonDocxBuffer(req.body || {});
    const filename = `${safeFilename(req.body?.title)}.${format}`;
    res.setHeader("Content-Type", format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

router.get("/lesson-plan/:id", requireDatabase, async (req, res, next) => {
  try {
    const lesson = await LessonPlan.findById(req.params.id);
    if (!lesson) return res.status(404).json({ error: "Lesson plan not found." });

    const format = req.query.format === "pdf" ? "pdf" : "docx";
    const buffer = format === "pdf" ? await buildLessonPdfBuffer({ lesson }) : await buildLessonDocxBuffer({ lesson });
    res.setHeader("Content-Type", format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename(lesson.title)}.${format}"`);
    return res.send(buffer);
  } catch (error) {
    return next(error);
  }
});

export default router;
