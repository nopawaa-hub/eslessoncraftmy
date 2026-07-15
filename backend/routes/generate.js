import { Router } from "express";
import { generateLesson, serializeProcedureSteps } from "../services/pedagogyEngine.js";
import LessonPlan from "../models/LessonPlan.js";
import Schedule from "../models/Schedule.js";
import SchemeOfWork from "../models/SchemeOfWork.js";
import SchoolClass from "../models/Class.js";
import { requireDatabase } from "../services/db.js";
import { KPM_DEFAULT_SOW } from "../services/sowLibrary.js";

const router = Router();

router.post("/", requireDatabase, async (req, res, next) => {
  try {
    const topic = String(req.body?.topic || "").trim();
    const year = String(req.body?.year || "Year 4").trim();
    const skill = String(req.body?.skill || "Reading").trim();
    const subject = String(req.body?.subject || "English").trim();
    const classroomType = String(req.body?.classroomType || "Mixed ability").trim();
    const objectives = String(req.body?.objectives || "").trim();
    const template = String(req.body?.template || "KSSR lesson plan template").trim();
    const templateType = String(req.body?.templateType || template || "Default MOE Template").trim();
    const sowSourceType = req.body?.sowSourceType === "custom" ? "custom" : "kpm";
    const sowSourceId = req.body?.sowSourceId || "";
    const date = String(req.body?.date || "").trim();
    const startTime = String(req.body?.startTime || "").trim();
    const endTime = String(req.body?.endTime || "").trim();
    const durationMinutes = Number(req.body?.durationMinutes || 60);
    const className = String(req.body?.className || "").trim();
    const numberOfStudents = String(req.body?.numberOfStudents || "").trim();
    const priorKnowledge = String(req.body?.priorKnowledge || "").trim();
    const materials = String(req.body?.materials || "").trim();
    const assessmentType = String(req.body?.assessmentType || "").trim();
    const stepsOverview = String(req.body?.stepsOverview || "").trim();
    const classId = req.body?.classId || undefined;
    let studentProficiency = String(req.body?.studentProficiency || "").trim();
    let classroomEnvironment = String(req.body?.classroomEnvironment || "").trim();
    let teachingNotes = String(req.body?.teachingNotes || "").trim();
    let scheduleId = req.body?.scheduleId || undefined;

    if (!topic || topic.length < 2) {
      return res.status(400).json({ error: "Topic is required." });
    }

    let schoolClass = null;
    if (classId) {
      schoolClass = await SchoolClass.findOne({ _id: classId, teacherId: req.user._id });
      if (!schoolClass) return res.status(404).json({ error: "Selected class not found." });
    }

    const effectiveYear = schoolClass?.year || year;
    const effectiveSubject = schoolClass?.subject || subject;
    const effectiveClassName = schoolClass?.name || className;
    const effectiveStudentCount = String(req.body?.numberOfStudents || schoolClass?.studentCount || "").trim();
    studentProficiency = studentProficiency || schoolClass?.studentProficiency || "Mixed ability";
    classroomEnvironment = classroomEnvironment || schoolClass?.classroomEnvironment || "Standard classroom with limited ICT";
    teachingNotes = teachingNotes || schoolClass?.teachingNotes || "";
    const effectiveClassroomType = [
      classroomType,
      studentProficiency && `Student proficiency: ${studentProficiency}`,
      classroomEnvironment && `Environment: ${classroomEnvironment}`,
      teachingNotes && `Teacher notes: ${teachingNotes}`,
    ].filter(Boolean).join(" | ");

    let sowSource = KPM_DEFAULT_SOW;
    if (sowSourceType === "custom" && sowSourceId) {
      const customSow = await SchemeOfWork.findById(sowSourceId);
      if (customSow) sowSource = { ...customSow.toObject(), sourceType: "custom" };
    }

    const modelHint = String(req.body?.model || "").trim() || undefined;
    const result = await generateLesson({
      topic,
      year: effectiveYear,
      subject: effectiveSubject,
      skill,
      classroomType: effectiveClassroomType,
      objectives,
      template,
      templateType,
      date,
      startTime,
      endTime,
      durationMinutes,
      className: effectiveClassName,
      numberOfStudents: effectiveStudentCount,
      priorKnowledge,
      materials,
      assessmentType,
      stepsOverview,
      studentProficiency,
      classroomEnvironment,
      teachingNotes,
      sowSource,
    }, modelHint);

    const classContext = schoolClass ? {
      classId: schoolClass._id,
      name: schoolClass.name,
      year: schoolClass.year,
      subject: schoolClass.subject,
      studentCount: schoolClass.studentCount,
      studentProficiency,
      classroomEnvironment,
      teachingNotes,
      tags: schoolClass.tags || [],
    } : undefined;

    const lessonPlan = await LessonPlan.create({
      title: result.title,
      userId: req.user._id,
      year: effectiveYear,
      subject: effectiveSubject,
      topic,
      classId: schoolClass?._id,
      skill,
      contentStandard: result.kssrAlignment?.contentStandard || "",
      learningStandard: result.kssrAlignment?.learningStandard || "",
      objectives: result.objectives || [],
      steps: result.steps || serializeProcedureSteps(result.procedure) || result.activities || [],
      templateType,
      lessonDetails: { ...(result.lessonDetails || {}), classContext },
      generatedFields: result,
      tags: [effectiveSubject, effectiveYear, skill, topic, effectiveClassName].filter(Boolean),
      status: "draft",
      className: effectiveClassName,
      activities: result.activities || [],
      assessments: result.assessment || [],
      aiGeneratedContent: result,
      sowSource: {
        type: sowSource.sourceType === "custom" ? "custom" : "kpm",
        id: sowSource.sourceType === "custom" ? sowSource._id : undefined,
        name: sowSource.name || KPM_DEFAULT_SOW.name,
      },
      scheduleId,
    });

    if (scheduleId) {
      await Schedule.findOneAndUpdate({ _id: scheduleId, userId: req.user._id }, {
        lessonPlanId: lessonPlan._id,
        status: "linked",
        title: result.title,
      });
    } else if (date && effectiveClassName) {
      const schedule = await Schedule.create({
        userId: req.user._id,
        date,
        title: result.title,
        className: effectiveClassName,
        subject: effectiveSubject,
        year: effectiveYear,
        startTime,
        endTime,
        durationMinutes,
        lessonPlanId: lessonPlan._id,
        notes: "Created from Lesson Plan AI.",
        status: "linked",
      });
      scheduleId = schedule._id;
      lessonPlan.scheduleId = schedule._id;
      await lessonPlan.save();
    }

    res.status(201).json({ ...result, lessonPlanId: lessonPlan._id, savedLessonPlan: lessonPlan });
  } catch (error) {
    next(error);
  }
});

export default router;
