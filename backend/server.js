import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import analyzeRouter from "./routes/analyze.js";
import simulateRouter from "./routes/simulate.js";
import improveRouter from "./routes/improve.js";
import kssrCheckRouter from "./routes/kssrCheck.js";
import generateRouter from "./routes/generate.js";
import evaluateRouter from "./routes/evaluate.js";
import lessonPlansRouter from "./routes/lessonPlans.js";
import scheduleRouter from "./routes/schedule.js";
import assessmentRouter from "./routes/assessment.js";
import studentRecordRouter from "./routes/studentRecord.js";
import documentsRouter from "./routes/documents.js";
import schemesOfWorkRouter from "./routes/schemesOfWork.js";
import usersRouter from "./routes/users.js";
import authRouter from "./routes/auth.js";
import classesRouter from "./routes/classes.js";
import studentsRouter from "./routes/students.js";
import materialsRouter from "./routes/materials.js";
import copilotRouter from "./routes/copilot.js";
import { getConfiguredProvider, getAvailableModels } from "./services/aiProvider.js";
import { requireAuth } from "./services/auth.js";
import { connectDatabase } from "./services/db.js";

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, "../frontend/dist");
const uploadsPath = path.resolve(__dirname, "uploads");

app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));
if (fs.existsSync(uploadsPath)) {
  app.use("/uploads", express.static(uploadsPath));
}

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get("*", (req, res, next) => {
    if (
      req.method === "GET" &&
      req.headers.accept?.includes("text/html") &&
      !req.headers.authorization &&
      !req.path.startsWith("/api/") &&
      !["/health", "/auth"].some((p) => req.path.startsWith(p))
    ) {
      return res.sendFile(path.join(frontendDistPath, "index.html"));
    }
    next();
  });
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    app: "ESLessonCraft MY",
    aiProvider: getConfiguredProvider(),
    aiMode: getConfiguredProvider(),
    availableModels: getAvailableModels(),
    database: "mongodb",
  });
});

app.use("/auth", authRouter);
app.use(requireAuth);
app.use("/analyze", analyzeRouter);
app.use("/simulate", simulateRouter);
app.use("/improve", improveRouter);
app.use("/kssr-check", kssrCheckRouter);
app.use("/generate", generateRouter);
app.use("/evaluate", evaluateRouter);
app.use("/evaluations", evaluateRouter);
app.use("/lesson-plans", lessonPlansRouter);
app.use("/schedule", scheduleRouter);
app.use("/assessment", assessmentRouter);
app.use("/student-record", studentRecordRouter);
app.use("/student-records", studentRecordRouter);
app.use("/documents", documentsRouter);
app.use("/schemes-of-work", schemesOfWorkRouter);
app.use("/users", usersRouter);
app.use("/classes", classesRouter);
app.use("/students", studentsRouter);
app.use("/materials", materialsRouter);
app.use("/copilot", copilotRouter);

if (fs.existsSync(frontendDistPath)) {
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/") || req.headers.authorization) return next();
    return res.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

app.use((req, res) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.statusCode || 500).json({
    error: error.message || "Server error. Please try again or check the backend logs.",
    detail: process.env.NODE_ENV === "production" ? undefined : error.message,
  });
});

connectDatabase()
  .catch(() => {
    console.warn("Backend started without MongoDB. Persistent endpoints will return JSON errors until MongoDB is available.");
  })
  .finally(() => {
    const server = app.listen(PORT, () => {
      console.log(`ESLessonCraft MY backend running on http://localhost:${PORT}`);
      console.log(`AI provider: ${getConfiguredProvider()}`);
    });
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use. Retrying in 1s...`);
        setTimeout(() => {
          server.close();
          server.listen(PORT);
        }, 1000);
      } else {
        console.error("Server listen error:", err);
      }
    });
  });
