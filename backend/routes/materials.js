import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import Material from "../models/Material.js";
import { requireDatabase } from "../services/db.js";
import { ensureDemoDataSeeded } from "../services/demoSeeder.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } }); // 15MB limit

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function cleanTags(tags) {
  if (Array.isArray(tags)) return tags.map((t) => String(t).trim()).filter(Boolean);
  return String(tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function normalizeUrl(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function payloadFromRequest(req) {
  return {
    title: String(req.body?.title || "").trim(),
    type: String(req.body?.type || "PDF").trim(),
    size: String(req.body?.size || "External Link").trim(),
    subject: String(req.body?.subject || "English").trim(),
    year: String(req.body?.year || "Year 4").trim(),
    folder: String(req.body?.folder || "Reading Support").trim(),
    url: normalizeUrl(req.body?.url),
  };
}

function safeFilename(name) {
  return String(name || "material")
    .replace(/[^a-z0-9-_.]/gi, "_")
    .trim()
    .toLowerCase();
}

function getFileType(filename = "") {
  const ext = filename.split(".").pop()?.toUpperCase() || "FILE";
  if (["PDF"].includes(ext)) return "PDF";
  if (["DOC", "DOCX"].includes(ext)) return "DOCX";
  if (["PPT", "PPTX"].includes(ext)) return "PPTX";
  if (["PNG", "JPG", "JPEG", "GIF", "WEBP"].includes(ext)) return "IMAGE";
  return ext;
}

function formatFileSize(bytes = 0) {
  if (!bytes) return "External";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// GET /materials - List all materials for the logged in teacher (or demo seed)
router.get("/", requireDatabase, async (req, res, next) => {
  try {
    await ensureDemoDataSeeded(req.user._id);

    const materials = await Material.find({ teacherId: req.user._id }).sort({ createdAt: -1 });
    res.json(materials);
  } catch (error) {
    next(error);
  }
});

// POST /materials/upload - Upload a physical file (Mode B)
router.post("/upload", requireDatabase, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const title = req.body.title || req.file.originalname || "Uploaded Material";
    const size = formatFileSize(req.file.size);
    const type = getFileType(req.file.originalname);
    const subject = req.body.subject || "English";
    const year = req.body.year || "General";
    const folder = req.body.folder || "General";

    // Hybrid storage: if file <= 1.5MB, store right inside MongoDB fileData so it's 100% cloud-portable and fast
    // If > 1.5MB, store on disk under uploadsDir
    let fileData = "";
    let url = "";

    if (req.file.size <= 1.5 * 1024 * 1024) {
      fileData = `data:${req.file.mimetype || "application/octet-stream"};base64,${req.file.buffer.toString("base64")}`;
    } else {
      const diskFilename = `${Date.now()}_${safeFilename(req.file.originalname)}`;
      await fs.promises.writeFile(path.join(uploadsDir, diskFilename), req.file.buffer);
      url = `/uploads/${diskFilename}`;
    }

    const material = await Material.create({
      teacherId: req.user._id,
      title,
      type,
      size,
      subject,
      year,
      folder,
      fileData,
      url: url || "", // If fileData is stored, we will dynamically update url to /materials/:id/download below
    });

    if (fileData) {
      material.url = `/materials/${material._id}/download`;
      await material.save();
    }

    res.status(201).json(material);
  } catch (error) {
    next(error);
  }
});

// POST /materials/link - Attach Google Drive / Canva / Wordwall / YouTube / external link (Mode A)
router.post("/link", requireDatabase, async (req, res, next) => {
  try {
    const { title, url, type, subject, year, folder, notes } = req.body || {};
    if (!title || !url) {
      return res.status(400).json({ error: "Title and URL are required." });
    }

    let detectedType = type || "LINK";
    const lowerUrl = String(url).toLowerCase();
    if (lowerUrl.includes("drive.google.com") || lowerUrl.includes("docs.google.com")) detectedType = "DRIVE";
    else if (lowerUrl.includes("canva.com")) detectedType = "CANVA";
    else if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) detectedType = "YOUTUBE";
    else if (lowerUrl.includes("wordwall.net")) detectedType = "WORDWALL";

    const material = await Material.create({
      teacherId: req.user._id,
      title: String(title).trim(),
      type: detectedType,
      size: "External Link",
      subject: subject || "English",
      year: year || "General",
      folder: folder || "General",
      url: String(url).trim(),
      notes: notes || "",
    });

    res.status(201).json(material);
  } catch (error) {
    next(error);
  }
});

// GET /materials/:id/download - Download or stream the material
router.get("/:id/download", requireDatabase, async (req, res, next) => {
  try {
    const material = await Material.findOne({ _id: req.params.id, teacherId: req.user._id });
    if (!material) return res.status(404).json({ error: "Material not found." });

    if (material.fileData && material.fileData.startsWith("data:")) {
      const match = material.fileData.match(/^data:([a-zA-Z0-9/+-._]+);base64,(.+)$/);
      if (match) {
        const mime = match[1];
        const buffer = Buffer.from(match[2], "base64");
        res.setHeader("Content-Type", mime);
        res.setHeader("Content-Disposition", `attachment; filename="${safeFilename(material.title)}"`);
        return res.send(buffer);
      }
    }

    if (material.url && material.url.startsWith("/uploads/")) {
      const diskPath = path.join(uploadsDir, path.basename(material.url));
      if (fs.existsSync(diskPath)) {
        return res.download(diskPath, material.title);
      }
    }

    if (material.url && (material.url.startsWith("http://") || material.url.startsWith("https://"))) {
      return res.redirect(material.url);
    }

    res.status(404).json({ error: "File content not found or no longer available." });
  } catch (error) {
    next(error);
  }
});

// DELETE /materials/:id - Delete a material
router.delete("/:id", requireDatabase, async (req, res, next) => {
  try {
    const material = await Material.findOneAndDelete({ _id: req.params.id, teacherId: req.user._id });
    if (!material) return res.status(404).json({ error: "Material not found." });

    if (material.url && material.url.startsWith("/uploads/")) {
      const diskPath = path.join(uploadsDir, path.basename(material.url));
      if (fs.existsSync(diskPath)) {
        fs.unlinkSync(diskPath);
      }
    }

    res.json({ success: true, id: req.params.id });
  } catch (error) {
    next(error);
  }
});

export default router;
