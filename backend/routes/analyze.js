import { Router } from "express";
import multer from "multer";
import { analyzeLesson } from "../services/pedagogyEngine.js";
import { requireLessonText, resolveLessonText } from "../services/fileText.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

router.post("/", upload.single("file"), async (req, res, next) => {
  try {
    const lessonText = requireLessonText(await resolveLessonText(req));
    const result = await analyzeLesson(lessonText);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
