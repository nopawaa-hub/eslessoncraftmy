import { Router } from "express";
import multer from "multer";
import SchemeOfWork from "../models/SchemeOfWork.js";
import { requireDatabase } from "../services/db.js";
import { extractTextFromUpload } from "../services/fileText.js";
import { KPM_DEFAULT_SOW } from "../services/sowLibrary.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });

router.get("/", requireDatabase, async (req, res, next) => {
  try {
    const custom = await SchemeOfWork.find({ teacherId: req.user._id }).sort({ createdAt: -1 }).select("-text");
    res.json([{ ...KPM_DEFAULT_SOW, text: undefined }, ...custom.map((item) => item.toObject())]);
  } catch (error) {
    next(error);
  }
});

router.post("/", requireDatabase, upload.single("file"), async (req, res, next) => {
  try {
    const text = (await extractTextFromUpload(req.file)).trim();
    if (text.length < 40) return res.status(400).json({ error: "Scheme of Work file needs readable text." });

    const item = await SchemeOfWork.create({
      name: req.body?.name || req.file?.originalname || "Custom school Scheme of Work",
      originalFilename: req.file?.originalname || "",
      mimeType: req.file?.mimetype || "",
      text,
      year: req.body?.year || "",
      subject: req.body?.subject || "English",
      teacherId: req.user._id,
    });
    res.status(201).json({ ...item.toObject(), text: undefined });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireDatabase, async (req, res, next) => {
  try {
    const item = await SchemeOfWork.findOneAndDelete({ _id: req.params.id, teacherId: req.user._id });
    if (!item) return res.status(404).json({ error: "Scheme of Work not found." });
    return res.json({ ok: true, deletedId: req.params.id });
  } catch (error) {
    next(error);
  }
});

export default router;
