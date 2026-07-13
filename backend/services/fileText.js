import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pdfParseModule = require("pdf-parse");
const mammoth = require("mammoth");

async function parsePdfBuffer(buffer) {
  if (typeof pdfParseModule === "function") {
    const parsed = await pdfParseModule(buffer);
    return parsed.text || "";
  }

  if (typeof pdfParseModule.PDFParse === "function") {
    const parser = new pdfParseModule.PDFParse({ data: buffer });
    try {
      const parsed = await parser.getText();
      return parsed.text || "";
    } finally {
      await parser.destroy();
    }
  }

  throw new Error("PDF parser is not available in this installation.");
}

export async function extractTextFromUpload(file) {
  if (!file) return "";

  const originalName = file.originalname || "";
  const mimeType = file.mimetype || "";
  const isText = mimeType.includes("text") || originalName.toLowerCase().endsWith(".txt");
  const isPdf = mimeType === "application/pdf" || originalName.toLowerCase().endsWith(".pdf");
  const isDocx =
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    originalName.toLowerCase().endsWith(".docx");

  if (isText) {
    return file.buffer.toString("utf8");
  }

  if (isPdf) {
    return parsePdfBuffer(file.buffer);
  }

  if (isDocx) {
    const parsed = await mammoth.extractRawText({ buffer: file.buffer });
    return parsed.value || "";
  }

  throw new Error("Unsupported file type. Please upload .txt, .pdf, or .docx only.");
}

// Convert an uploaded DOCX to HTML so the frontend can render the ACTUAL
// document formatting (tables, styles, paragraphs) instead of flat text.
// Returns null for non-DOCX files so the frontend falls back to text.
export async function extractHtmlFromUpload(file) {
  if (!file) return null;

  const originalName = file.originalname || "";
  const isDocx =
    (file.mimetype || "") === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    originalName.toLowerCase().endsWith(".docx");

  if (!isDocx) return null;

  const result = await mammoth.convertToHtml({ buffer: file.buffer });
  return result.value || null;
}

export async function resolveLessonText(req) {
  const uploadedText = await extractTextFromUpload(req.file);
  const bodyText = req.body?.lessonPlan || req.body?.text || "";
  return `${bodyText}\n\n${uploadedText}`.trim();
}

export function requireLessonText(text) {
  if (!text || typeof text !== "string" || text.trim().length < 20) {
    const error = new Error("Lesson text is required and must contain at least 20 characters.");
    error.statusCode = 400;
    throw error;
  }

  return text.trim();
}
