import { Router } from "express";
import SchoolClass from "../models/Class.js";
import Student from "../models/Student.js";
import { requireDatabase } from "../services/db.js";

const router = Router();

const cleanTags = (tags) => {
  if (Array.isArray(tags)) return tags.map((tag) => String(tag).trim()).filter(Boolean);
  return String(tags || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
};

function classPayload(body) {
  return {
    name: String(body.name || "").trim(),
    year: String(body.year || "Year 5").trim(),
    subject: String(body.subject || "English").trim(),
    studentCount: Number(body.studentCount || 0),
    studentProficiency: String(body.studentProficiency || "Mixed ability").trim(),
    classroomEnvironment: String(body.classroomEnvironment || "Standard classroom with limited ICT").trim(),
    teachingNotes: String(body.teachingNotes || "").trim(),
    tags: cleanTags(body.tags),
    status: body.status || "active",
  };
}

router.post("/", requireDatabase, async (req, res, next) => {
  try {
    const payload = classPayload(req.body || {});
    if (!payload.name) return res.status(400).json({ error: "Class name is required." });

    const schoolClass = await SchoolClass.create({ ...payload, teacherId: req.user._id });
    return res.status(201).json(schoolClass);
  } catch (error) {
    next(error);
  }
});

router.get("/", requireDatabase, async (req, res, next) => {
  try {
    const isDemoTeacher = String(req.user._id) === "000000000000000000000001" || req.user.email === "demo@test.com";
    if (isDemoTeacher) {
      const existing = await SchoolClass.countDocuments({ teacherId: req.user._id });
      if (existing === 0) {
        await SchoolClass.create([
          {
            teacherId: req.user._id,
            name: "5 Bestari",
            year: "Year 5",
            subject: "English",
            studentCount: 32,
            studentProficiency: "Mixed ability",
            classroomEnvironment: "Standard classroom with limited ICT",
            teachingNotes: "Active participants during group work, reading comprehension needs support.",
            tags: ["High energy", "Group work"],
            status: "active"
          },
          {
            teacherId: req.user._id,
            name: "3 Mawar",
            year: "Year 3",
            subject: "English",
            studentCount: 28,
            studentProficiency: "Low-to-mid proficiency",
            classroomEnvironment: "Standard classroom with projector",
            teachingNotes: "Focus heavily on phonics and guided vocabulary practice.",
            tags: ["Phonics focus", "Visual learners"],
            status: "active"
          }
        ]);
      }
    }

    const query = { teacherId: req.user._id };
    if (req.query.status) query.status = req.query.status;
    if (req.query.year) query.year = req.query.year;
    if (req.query.subject) query.subject = new RegExp(String(req.query.subject), "i");

    const classes = await SchoolClass.find(query).sort({ status: 1, year: 1, name: 1 });
    return res.json(classes);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", requireDatabase, async (req, res, next) => {
  try {
    const schoolClass = await SchoolClass.findOne({ _id: req.params.id, teacherId: req.user._id });
    if (!schoolClass) return res.status(404).json({ error: "Class not found." });

    const students = await Student.find({ classId: schoolClass._id }).sort({ studentName: 1 });
    return res.json({ ...schoolClass.toObject(), students });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", requireDatabase, async (req, res, next) => {
  try {
    const updates = classPayload(req.body || {});
    if (!updates.name) delete updates.name;
    Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key]);

    const schoolClass = await SchoolClass.findOneAndUpdate({ _id: req.params.id, teacherId: req.user._id }, updates, {
      new: true,
      runValidators: true,
    });
    if (!schoolClass) return res.status(404).json({ error: "Class not found." });
    return res.json(schoolClass);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireDatabase, async (req, res, next) => {
  try {
    const schoolClass = await SchoolClass.findOneAndDelete({ _id: req.params.id, teacherId: req.user._id });
    if (!schoolClass) return res.status(404).json({ error: "Class not found." });
    return res.json({ ok: true, deletedId: req.params.id, cascade: false });
  } catch (error) {
    next(error);
  }
});

export default router;
