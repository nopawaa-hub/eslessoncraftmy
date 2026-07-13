import { Router } from "express";
import StudentRecord from "../models/StudentRecord.js";
import { requireDatabase } from "../services/db.js";

const router = Router();

router.post("/", requireDatabase, async (req, res, next) => {
  try {
    const record = await StudentRecord.create({
      studentName: req.body.studentName,
      scores: Array.isArray(req.body.scores) ? req.body.scores.map(Number).filter(Number.isFinite) : [],
      teacherId: req.user._id,
    });
    res.status(201).json(record);
  } catch (error) {
    next(error);
  }
});

router.get("/", requireDatabase, async (req, res, next) => {
  try {
    const records = await StudentRecord.find({ teacherId: req.user._id }).sort({ updatedAt: -1 });
    res.json(records);
  } catch (error) {
    next(error);
  }
});

export default router;
