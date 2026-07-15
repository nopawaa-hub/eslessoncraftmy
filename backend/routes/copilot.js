import { Router } from "express";
import Class from "../models/Class.js";
import Student from "../models/Student.js";
import LessonPlan from "../models/LessonPlan.js";
import Assessment from "../models/Assessment.js";
import Period from "../models/Period.js";
import Schedule from "../models/Schedule.js";
import { requireDatabase } from "../services/db.js";
import { askCopilot } from "../services/pedagogyEngine.js";

const router = Router();

// Gather the teacher's real workspace data so the copilot can answer with
// context-aware, specific replies rather than generic advice.
async function gatherTeacherContext(user) {
  const [classes, students, lessons, assessments, schedules] = await Promise.all([
    Class.find({ teacherId: user._id }).sort({ createdAt: -1 }).limit(20).lean(),
    Student.find({}).populate({ path: "classId", match: { teacherId: user._id } }).sort({ studentName: 1 }).limit(40).lean().then((items) => items.filter((s) => s.classId)),
    LessonPlan.find({ userId: user._id }).sort({ createdAt: -1 }).limit(15).lean(),
    Assessment.find({ teacherId: user._id }).sort({ createdAt: -1 }).limit(10).lean(),
    Schedule.find({ userId: user._id }).sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  // Gather periods for the teacher's schedules (these hold the actual timetable data).
  const scheduleIds = schedules.map((s) => s._id);
  const periods = scheduleIds.length ? await Period.find({ scheduleId: { $in: scheduleIds } }).sort({ day: 1, startTime: 1 }).limit(20).lean() : [];

  return { teacher: user, classes, students, lessons, assessments, schedule: periods };
}

router.post("/ask", requireDatabase, async (req, res, next) => {
  try {
    const question = String(req.body?.question || "").trim();
    if (!question) return res.status(400).json({ error: "A question is required." });
    if (question.length > 2000) return res.status(400).json({ error: "Question is too long (max 2000 characters)." });

    const context = await gatherTeacherContext(req.user);
    const modelHint = String(req.body?.model || "").trim() || undefined;
    const result = await askCopilot(question, context, modelHint);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
