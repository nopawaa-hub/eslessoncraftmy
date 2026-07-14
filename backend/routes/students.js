import { Router } from "express";
import Student from "../models/Student.js";
import SchoolClass from "../models/Class.js";
import { requireDatabase } from "../services/db.js";
import { ensureDemoDataSeeded } from "../services/demoSeeder.js";

const router = Router();

function studentPayload(body) {
  return {
    classId: body.classId,
    studentName: String(body.studentName || body.name || "").trim(),
    proficiency: String(body.proficiency || "Mixed ability").trim(),
    notes: String(body.notes || "").trim(),
    status: body.status || "active",
  };
}

router.post("/", requireDatabase, async (req, res, next) => {
  try {
    const payload = studentPayload(req.body || {});
    if (!payload.classId) return res.status(400).json({ error: "classId is required." });
    if (!payload.studentName) return res.status(400).json({ error: "Student name is required." });

    const schoolClass = await SchoolClass.findOne({ _id: payload.classId, teacherId: req.user._id });
    if (!schoolClass) return res.status(404).json({ error: "Class not found." });

    const student = await Student.create(payload);
    const count = await Student.countDocuments({ classId: payload.classId, status: "active" });
    await SchoolClass.findByIdAndUpdate(payload.classId, { studentCount: count });

    return res.status(201).json(student);
  } catch (error) {
    next(error);
  }
});

router.get("/", requireDatabase, async (req, res, next) => {
  try {
    await ensureDemoDataSeeded(req.user._id);

    const ownedClassIds = await SchoolClass.find({ teacherId: req.user._id }).distinct("_id");
    const query = { classId: { $in: ownedClassIds } };
    if (req.query.classId) {
      const ownsClass = ownedClassIds.some((id) => String(id) === String(req.query.classId));
      if (!ownsClass) return res.json([]);
      query.classId = req.query.classId;
    }
    if (req.query.status) query.status = req.query.status;

    const students = await Student.find(query).sort({ studentName: 1 });
    return res.json(students);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", requireDatabase, async (req, res, next) => {
  try {
    const updates = studentPayload(req.body || {});
    if (!updates.classId) delete updates.classId;
    if (!updates.studentName) delete updates.studentName;
    Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key]);

    const existing = await Student.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Student not found." });
    const existingClass = await SchoolClass.findOne({ _id: existing.classId, teacherId: req.user._id });
    if (!existingClass) return res.status(404).json({ error: "Student not found." });
    if (updates.classId) {
      const targetClass = await SchoolClass.findOne({ _id: updates.classId, teacherId: req.user._id });
      if (!targetClass) return res.status(404).json({ error: "Class not found." });
    }

    const student = await Student.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!student) return res.status(404).json({ error: "Student not found." });

    const count = await Student.countDocuments({ classId: student.classId, status: "active" });
    await SchoolClass.findByIdAndUpdate(student.classId, { studentCount: count });

    return res.json(student);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireDatabase, async (req, res, next) => {
  try {
    const existing = await Student.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Student not found." });
    const existingClass = await SchoolClass.findOne({ _id: existing.classId, teacherId: req.user._id });
    if (!existingClass) return res.status(404).json({ error: "Student not found." });

    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ error: "Student not found." });

    const count = await Student.countDocuments({ classId: student.classId, status: "active" });
    await SchoolClass.findByIdAndUpdate(student.classId, { studentCount: count });

    return res.json({ ok: true, deletedId: req.params.id });
  } catch (error) {
    next(error);
  }
});

export default router;
