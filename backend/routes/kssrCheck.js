import { Router } from "express";
import { checkKssrAlignment, validateLessonPlan } from "../services/pedagogyEngine.js";

const router = Router();

router.post("/", validateLessonPlan, async (req, res, next) => {
  try {
    const result = await checkKssrAlignment(req.lessonPlan);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
