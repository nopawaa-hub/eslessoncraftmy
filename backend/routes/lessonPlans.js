import { Router } from "express";
import LessonPlan from "../models/LessonPlan.js";
import { requireDatabase } from "../services/db.js";

const router = Router();

router.get("/", requireDatabase, async (req, res, next) => {
  try {
    const isDemoTeacher = String(req.user._id) === "000000000000000000000001" || req.user.email === "demo@test.com";
    if (isDemoTeacher) {
      const existingCount = await LessonPlan.countDocuments({ userId: req.user._id });
      if (existingCount === 0) {
        await LessonPlan.create({
          userId: req.user._id,
          title: "Year 5 English Reading Lesson: Main Ideas in Short Texts",
          year: "Year 5",
          subject: "English",
          topic: "Main Ideas in Short Texts",
          className: "5 Bestari",
          skill: "Reading",
          contentStandard: "2.1 Communicate simple information intelligibly",
          learningStandard: "2.1.1 Explain simple content and main ideas from short texts",
          objectives: [
            "identify the main idea in a short text with guidance.",
            "match supporting details to the correct main idea.",
            "explain one answer using a simple sentence frame."
          ],
          activities: [
            "Picture talk and keyword prediction.",
            "Teacher models how to underline repeated ideas.",
            "Pairs match text strips to main idea cards.",
            "Groups justify one answer using sentence frames.",
            "Exit ticket: one main idea and one supporting detail."
          ],
          assessments: [
            "Teacher checklist for identifying main ideas.",
            "Pair discussion sampling.",
            "Exit ticket sorted into reteach, on-track and extension groups."
          ],
          reflection: "Pupils responded well to the picture talk prediction. Support group needed extra time with vocabulary strips.",
          status: "completed",
          templateType: "KSSR English Lesson Plan",
          lessonDetails: {
            subject: "English",
            year: "Year 5",
            className: "5 Bestari",
            durationMinutes: 60,
            topic: "Main Ideas in Short Texts",
            skill: "Reading",
            materials: "Short text strips, picture prompts, sentence frames, exit ticket",
            assessmentType: "PBD observation, oral response, exit ticket"
          }
        });
      }
    }

    const query = { userId: req.user._id };
    if (req.query.year) query.year = req.query.year;
    if (req.query.subject) query.subject = new RegExp(String(req.query.subject), "i");
    if (req.query.status) query.status = req.query.status;
    if (req.query.classId && req.query.classId !== "all") query.classId = req.query.classId;
    if (req.query.search) {
      const search = new RegExp(String(req.query.search), "i");
      query.$or = [{ title: search }, { topic: search }, { subject: search }, { className: search }, { tags: search }];
    }
    const lessons = await LessonPlan.find(query).populate("classId").sort({ updatedAt: -1, createdAt: -1 });
    res.json(lessons);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", requireDatabase, async (req, res, next) => {
  try {
    const lesson = await LessonPlan.findOne({ _id: req.params.id, userId: req.user._id }).populate("classId");
    if (!lesson) return res.status(404).json({ error: "Lesson plan not found." });
    return res.json(lesson);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", requireDatabase, async (req, res, next) => {
  try {
    const updates = {
      title: req.body.title,
      year: req.body.year,
      subject: req.body.subject,
      topic: req.body.topic,
      classId: req.body.classId,
      className: req.body.className,
      skill: req.body.skill,
      contentStandard: req.body.contentStandard,
      learningStandard: req.body.learningStandard,
      objectives: Array.isArray(req.body.objectives) ? req.body.objectives : undefined,
      activities: Array.isArray(req.body.activities) ? req.body.activities : undefined,
      assessments: Array.isArray(req.body.assessments) ? req.body.assessments : undefined,
      reflection: req.body.reflection,
      aiGeneratedContent: req.body.aiGeneratedContent,
      tags: Array.isArray(req.body.tags) ? req.body.tags : undefined,
      status: req.body.status,
      steps: Array.isArray(req.body.steps) ? req.body.steps : undefined,
      templateType: req.body.templateType,
      lessonDetails: req.body.lessonDetails,
      generatedFields: req.body.generatedFields,
      scheduleId: req.body.scheduleId,
    };
    Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key]);

    const lesson = await LessonPlan.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, updates, { new: true, runValidators: true });
    if (!lesson) return res.status(404).json({ error: "Lesson plan not found." });
    return res.json(lesson);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireDatabase, async (req, res, next) => {
  try {
    const lesson = await LessonPlan.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!lesson) return res.status(404).json({ error: "Lesson plan not found." });
    return res.json({ ok: true, deletedId: req.params.id });
  } catch (error) {
    next(error);
  }
});

export default router;
