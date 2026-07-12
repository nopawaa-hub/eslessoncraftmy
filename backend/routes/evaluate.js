import { Router } from "express";
import multer from "multer";
import { evaluateLesson } from "../services/pedagogyEngine.js";
import { requireLessonText, resolveLessonText } from "../services/fileText.js";
import Evaluation from "../models/Evaluation.js";
import LessonPlan from "../models/LessonPlan.js";
import StudentRecord from "../models/StudentRecord.js";
import { requireDatabase } from "../services/db.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

function summarizeClassData(records = []) {
  if (!records.length) return "";
  const averages = records.map((record) => Number(record.average)).filter(Number.isFinite);
  const classAverage = averages.length
    ? Number((averages.reduce((total, score) => total + score, 0) / averages.length).toFixed(1))
    : 0;
  const needsSupport = records.filter((record) => Number(record.average) > 0 && Number(record.average) < 50).length;
  const highPerformers = records.filter((record) => Number(record.average) >= 80).length;

  return [
    `${records.length} student record(s) available`,
    classAverage ? `class average ${classAverage}` : "",
    `${needsSupport} pupil(s) below 50`,
    `${highPerformers} high performer(s) at 80+`,
  ]
    .filter(Boolean)
    .join("; ");
}

router.post("/", requireDatabase, upload.single("file"), async (req, res, next) => {
  try {
    const lessonText = requireLessonText(await resolveLessonText(req));
    const studentRecords = await StudentRecord.find().sort({ updatedAt: -1 }).limit(50);
    const classData = String(req.body?.classData || "").trim() || summarizeClassData(studentRecords);
    const result = await evaluateLesson(lessonText, classData);
    let lessonPlanId = req.body?.lessonPlanId;

    if (!lessonPlanId) {
      const lessonPlan = await LessonPlan.create({
        title: req.body?.title || "Evaluated Lesson Draft",
        year: req.body?.year || "Year 4",
        subject: req.body?.subject || "General",
        topic: req.body?.topic || "Uploaded lesson",
        skill: req.body?.skill || "Reading",
        contentStandard: "",
        learningStandard: "",
        objectives: [],
        steps: lessonText.split(/\n+/).filter(Boolean).slice(0, 12),
      });
      lessonPlanId = lessonPlan._id;
    }

    const evaluation = await Evaluation.create({
      lessonPlanId,
      annotations: result.annotations,
      summary: `${result.annotations.length} annotation(s) found for KSSR improvement.`,
    });

    res.status(201).json({ ...result, lessonPlanId, evaluationId: evaluation._id, summary: evaluation.summary });
  } catch (error) {
    next(error);
  }
});

router.get("/:lessonPlanId", requireDatabase, async (req, res, next) => {
  try {
    const evaluations = await Evaluation.find({ lessonPlanId: req.params.lessonPlanId }).sort({ createdAt: -1 });
    res.json(evaluations);
  } catch (error) {
    next(error);
  }
});

export default router;
