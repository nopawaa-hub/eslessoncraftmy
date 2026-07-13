import { Router } from "express";
import Schedule from "../models/Schedule.js";
import LessonPlan from "../models/LessonPlan.js";
import Period from "../models/Period.js";
import ScheduleLessonLink from "../models/ScheduleLessonLink.js";
import { requireDatabase } from "../services/db.js";

const router = Router();

async function defaultSchedule(user) {
  let schedule = await Schedule.findOne({ userId: user._id, name: "Default Weekly Schedule" });
  if (!schedule) {
    schedule = await Schedule.create({
      userId: user._id,
      name: "Default Weekly Schedule",
      weekStart: new Date(),
      date: new Date(),
      title: "Default Weekly Schedule",
      className: "General",
      subject: "English",
      year: user.settings?.defaultYear || "Year 4",
      status: "planned",
    });
  }
  return schedule;
}

function scheduledDateFromDay(day) {
  const weekStart = new Date();
  const mondayOffset = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const date = new Date(weekStart);
  date.setDate(weekStart.getDate() + Math.max(0, days.indexOf(day)));
  return date;
}

async function hydrateSchedule(user) {
  const schedule = await defaultSchedule(user);
  const periods = await Period.find({ scheduleId: schedule._id }).sort({ day: 1, startTime: 1 }).lean();
  const links = await ScheduleLessonLink.find({ periodId: { $in: periods.map((period) => period._id) } })
    .populate("lessonPlanId")
    .lean();

  const linksByPeriod = new Map(links.map((link) => [String(link.periodId), link]));
  return {
    schedule,
    periods: periods.map((period) => ({
      ...period,
      link: linksByPeriod.get(String(period._id)) || null,
    })),
    links,
  };
}

router.get("/overview", requireDatabase, async (req, res, next) => {
  try {
    res.json(await hydrateSchedule(req.user));
  } catch (error) {
    next(error);
  }
});

router.post("/periods", requireDatabase, async (req, res, next) => {
  try {
    const schedule = await defaultSchedule(req.user);
    if (req.body.scheduleId) {
      const ownsSchedule = await Schedule.exists({ _id: req.body.scheduleId, userId: req.user._id });
      if (!ownsSchedule) return res.status(404).json({ error: "Schedule not found." });
    }
    const period = await Period.create({
      scheduleId: req.body.scheduleId || schedule._id,
      day: req.body.day || "Monday",
      startTime: req.body.startTime || "08:00",
      endTime: req.body.endTime || "09:00",
      className: req.body.className || "Year 4",
      subject: req.body.subject || "English",
      year: req.body.year || "Year 4",
      recurring: req.body.recurring !== false,
      notes: req.body.notes || "",
      tone: req.body.tone || "",
      skill: req.body.skill || "",
      topic: req.body.topic || "",
      status: req.body.status || "",
      material: req.body.material || "",
      assessment: req.body.assessment || "",
      lessonPlan: req.body.lessonPlan || "",
    });
    res.status(201).json(period);
  } catch (error) {
    next(error);
  }
});

router.put("/periods/:id", requireDatabase, async (req, res, next) => {
  try {
    const period = await Period.findById(req.params.id);
    if (!period) return res.status(404).json({ error: "Period not found." });
    const ownsSchedule = await Schedule.exists({ _id: period.scheduleId, userId: req.user._id });
    if (!ownsSchedule) return res.status(404).json({ error: "Period not found." });

    const updatedPeriod = await Period.findByIdAndUpdate(
      period._id,
      {
        day: req.body.day,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        className: req.body.className,
        subject: req.body.subject,
        year: req.body.year,
        recurring: req.body.recurring,
        notes: req.body.notes,
        tone: req.body.tone,
        skill: req.body.skill,
        topic: req.body.topic,
        status: req.body.status,
        material: req.body.material,
        assessment: req.body.assessment,
        lessonPlan: req.body.lessonPlan,
      },
      { new: true, runValidators: true },
    );
    return res.json(updatedPeriod);
  } catch (error) {
    return next(error);
  }
});

router.delete("/periods/:id", requireDatabase, async (req, res, next) => {
  try {
    const period = await Period.findById(req.params.id);
    if (!period) return res.status(404).json({ error: "Period not found." });
    const ownsSchedule = await Schedule.exists({ _id: period.scheduleId, userId: req.user._id });
    if (!ownsSchedule) return res.status(404).json({ error: "Period not found." });
    await ScheduleLessonLink.deleteMany({ periodId: req.params.id });
    await Period.findByIdAndDelete(req.params.id);
    return res.json({ ok: true, deletedId: req.params.id });
  } catch (error) {
    return next(error);
  }
});

router.post("/links", requireDatabase, async (req, res, next) => {
  try {
    const period = await Period.findById(req.body.periodId);
    if (!period) return res.status(404).json({ error: "Period not found." });
    const ownsSchedule = await Schedule.exists({ _id: period.scheduleId, userId: req.user._id });
    if (!ownsSchedule) return res.status(404).json({ error: "Period not found." });
    const lesson = await LessonPlan.findOne({ _id: req.body.lessonPlanId, userId: req.user._id });
    if (!lesson) return res.status(404).json({ error: "Lesson plan not found." });

    const link = await ScheduleLessonLink.findOneAndUpdate(
      { periodId: period._id, scheduledDate: req.body.scheduledDate || scheduledDateFromDay(period.day) },
      {
        lessonPlanId: lesson._id,
        periodId: period._id,
        scheduledDate: req.body.scheduledDate || scheduledDateFromDay(period.day),
        notes: req.body.notes || "",
        status: "planned",
      },
      { new: true, upsert: true, runValidators: true },
    ).populate("lessonPlanId");

    lesson.scheduleId = period.scheduleId;
    lesson.status = "completed";
    await lesson.save();
    return res.status(201).json(link);
  } catch (error) {
    return next(error);
  }
});

router.delete("/links/:id", requireDatabase, async (req, res, next) => {
  try {
    const link = await ScheduleLessonLink.findById(req.params.id);
    if (!link) return res.status(404).json({ error: "Schedule lesson link not found." });
    const period = await Period.findById(link.periodId);
    const ownsSchedule = period && await Schedule.exists({ _id: period.scheduleId, userId: req.user._id });
    if (!ownsSchedule) return res.status(404).json({ error: "Schedule lesson link not found." });
    await ScheduleLessonLink.findByIdAndDelete(req.params.id);
    return res.json({ ok: true, deletedId: req.params.id });
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireDatabase, async (req, res, next) => {
  try {
    const item = await Schedule.create({
      date: req.body.date,
      userId: req.user._id,
      title: req.body.title || "Class period",
      className: req.body.className || "",
      subject: req.body.subject || "English",
      year: req.body.year || "Year 4",
      startTime: req.body.startTime || "",
      endTime: req.body.endTime || "",
      durationMinutes: Number(req.body.durationMinutes || 60),
      lessonPlanId: req.body.lessonPlanId || undefined,
      notes: req.body.notes || "",
      status: req.body.lessonPlanId ? "linked" : "planned",
    });
    res.status(201).json(await item.populate("lessonPlanId"));
  } catch (error) {
    next(error);
  }
});

router.get("/", requireDatabase, async (req, res, next) => {
  try {
    const items = await Schedule.find({ userId: req.user._id }).populate("lessonPlanId").sort({ date: 1 });
    res.json(items);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", requireDatabase, async (req, res, next) => {
  try {
    const item = await Schedule.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        date: req.body.date,
        title: req.body.title || "Class period",
        className: req.body.className || "",
        subject: req.body.subject || "English",
        year: req.body.year || "Year 4",
        startTime: req.body.startTime || "",
        endTime: req.body.endTime || "",
        durationMinutes: Number(req.body.durationMinutes || 60),
        lessonPlanId: req.body.lessonPlanId || undefined,
        notes: req.body.notes || "",
        status: req.body.lessonPlanId ? "linked" : req.body.status || "planned",
      },
      { new: true, runValidators: true },
    ).populate("lessonPlanId");
    if (!item) return res.status(404).json({ error: "Schedule item not found." });
    return res.json(item);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id/lesson", requireDatabase, async (req, res, next) => {
  try {
    const item = await Schedule.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Schedule item not found." });
    if (String(item.userId) !== String(req.user._id)) return res.status(404).json({ error: "Schedule item not found." });
    if (item.lessonPlanId) await LessonPlan.findOneAndDelete({ _id: item.lessonPlanId, userId: req.user._id });
    item.lessonPlanId = undefined;
    item.status = "planned";
    await item.save();
    return res.json(await item.populate("lessonPlanId"));
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireDatabase, async (req, res, next) => {
  try {
    const item = await Schedule.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!item) return res.status(404).json({ error: "Schedule item not found." });
    return res.json({ ok: true, deletedId: req.params.id });
  } catch (error) {
    next(error);
  }
});

export default router;
