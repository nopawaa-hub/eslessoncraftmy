import { Router } from "express";
import Assessment from "../models/Assessment.js";
import { requireDatabase } from "../services/db.js";

const router = Router();

router.post("/", requireDatabase, async (req, res, next) => {
  try {
    const assessment = await Assessment.create({
      title: req.body.title,
      teacherId: req.user._id,
      questions: Array.isArray(req.body.questions) ? req.body.questions : [],
      year: req.body.year,
      subject: req.body.subject,
      classId: req.body.classId || undefined,
      assessmentType: req.body.assessmentType,
      evidenceType: req.body.evidenceType,
      criteria: Array.isArray(req.body.criteria)
        ? req.body.criteria
        : String(req.body.criteria || "").split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean),
      scaleType: req.body.scaleType || "tp",
      records: Array.isArray(req.body.records) ? req.body.records : [],
    });
    res.status(201).json(assessment);
  } catch (error) {
    next(error);
  }
});

router.get("/", requireDatabase, async (req, res, next) => {
  try {
    const query = { teacherId: req.user._id };
    if (req.query.classId) query.classId = req.query.classId;
    if (req.query.subject) query.subject = new RegExp(String(req.query.subject), "i");
    const assessments = await Assessment.find(query).populate("classId").sort({ createdAt: -1 });
    res.json(assessments);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", requireDatabase, async (req, res, next) => {
  try {
    const updates = {
      title: req.body.title,
      questions: Array.isArray(req.body.questions) ? req.body.questions : undefined,
      year: req.body.year,
      subject: req.body.subject,
      classId: req.body.classId,
      assessmentType: req.body.assessmentType,
      evidenceType: req.body.evidenceType,
      criteria: Array.isArray(req.body.criteria) ? req.body.criteria : undefined,
      scaleType: req.body.scaleType,
      records: Array.isArray(req.body.records) ? req.body.records : undefined,
    };
    Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key]);
    const assessment = await Assessment.findOneAndUpdate({ _id: req.params.id, teacherId: req.user._id }, updates, { new: true, runValidators: true });
    if (!assessment) return res.status(404).json({ error: "Assessment not found." });
    return res.json(assessment);
  } catch (error) {
    next(error);
  }
});

export default router;
