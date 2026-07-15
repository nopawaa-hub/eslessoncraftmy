import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Download, RefreshCw, Sparkles } from "lucide-react";
import { pageIdToPath } from "../lib/nav.js";
import { useAppStore } from "../state/useAppStore.js";
import { Card, PageHeader, MaterialTile } from "../components/ui.jsx";
import { downloadTextFile } from "../lib/lesson.js";
import { staticMaterials } from "../lib/fixtures.js";

export default function ReportsPage({ compact = false }) {
  const navigate = useNavigate();
  const lessons = useAppStore((s) => s.lessons);
  const classes = useAppStore((s) => s.classes);
  const currentUser = useAppStore((s) => s.currentUser);
  const isDemoUser = currentUser?.email === "demo@test.com" || currentUser?.role === "demo" || String(currentUser?._id) === "000000000000000000000001";
  const liveMode = typeof window !== "undefined" && (window.location.pathname.startsWith("/testing") || window.location.search.includes("live=1") || (currentUser && !isDemoUser));

  const [classFilter, setClassFilter] = useState("all");
  const [generating, setGenerating] = useState("");
  const [reportNotice, setReportNotice] = useState("");
  const reports = [
    { id: "individual", label: "Individual English PBD Report" },
    { id: "class", label: "Full Class English Report" },
    { id: "tp", label: "TP Distribution Report" },
    { id: "parent", label: "Parent-Friendly English Progress Report" },
  ];
  const visibleLessons = classFilter === "all"
    ? lessons
    : lessons.filter((lesson) => {
      const lessonClassId = String(lesson.classId?._id || lesson.classId || "");
      if (classFilter === "legacy") return !lessonClassId;
      return lessonClassId === classFilter;
    });
  const lessonLines = (items) => items.map((lesson, idx) => `${idx + 1}. ${lesson.title || "Untitled RPH"} | ${lesson.className || lesson.classId?.name || "General"} | ${lesson.year || ""} | ${lesson.subject || "English"} | ${(lesson.objectives || []).length} objectives`).join("\n");
  const buildReport = (type) => {
    const header = "ESLessonCraft MY — English Report\nGenerated: " + new Date().toLocaleString("en-MY") + "\n" + "=".repeat(48) + "\n\n";
    const pool = visibleLessons.length ? visibleLessons : lessons;
    if (!pool.length) return null;
    if (type === "individual") {
      return header + "INDIVIDUAL ENGLISH PBD REPORT\n\n" + pool.map((l) => {
        const objs = (l.objectives || []).map((o, i) => `  ${i + 1}. ${o}`).join("\n");
        return `Pupil RPH: ${l.title}\nClass: ${l.className || l.classId?.name || "General"} (${l.year || "Year 4"})\nObjectives:\n${objs || "  -"}\nPBD evidence: ${(l.assessment || l.assessments || ["Observation"]).join ? (l.assessment || l.assessments || []).join("; ") : (l.assessment || l.assessments || "Observation")}\nStatus: ${l.status || "planned"}\n`;
      }).join("\n---\n");
    }
    if (type === "class") {
      return header + "FULL CLASS ENGLISH REPORT\n\nClasses:\n" + classes.map((c, i) => `${i + 1}. ${c.name} · ${c.year} (${c.studentCount || 0} pupils)`).join("\n") + "\n\nLessons:\n" + lessonLines(pool);
    }
    if (type === "tp") {
      return header + "TP DISTRIBUTION REPORT\n\nBased on " + pool.length + " lesson(s):\n\n" + pool.map((l) => `- ${l.title}: ${(l.objectives || []).length} objectives, skill ${l.skill || "Reading"}`).join("\n");
    }
    if (type === "parent") {
      return header + "PARENT-FRIENDLY ENGLISH PROGRESS REPORT\n\nDear parents and guardians,\n\nThis term your child is working on the following English lessons:\n\n" + pool.map((l, i) => `${i + 1}. ${l.title} (${l.year || "Year 4"})\n   What pupils are learning: ${(l.objectives || ["English skills for daily use"])[0]}`).join("\n\n") + "\n\nThank you for supporting your child's English learning at home.\n\nESLessonCraft MY Teacher OS";
    }
    return null;
  };
  const generateReport = (type) => {
    setGenerating(type);
    setReportNotice("");
    const text = buildReport(type);
    if (!text) {
      setReportNotice("No lessons to report yet. Generate a lesson plan first.");
      setGenerating("");
      return;
    }
    const filename = `${type}-report-${new Date().toISOString().slice(0, 10)}.txt`;
    setTimeout(() => {
      downloadTextFile(filename, text);
      setReportNotice("Report downloaded. Open the .txt file to print or share.");
      setGenerating("");
    }, 300);
  };
  return (
    <div className="page-stack">
      {!compact && <PageHeader eyebrow="Reports" title="Generate English reports." subtitle="Clean formats for panel review, parents and administrators." />}
      {reportNotice && <div className="success-note"><CheckCircle2 /> {reportNotice}</div>}
      <section className="report-grid">
        {reports.map((report) => (
          <Card key={report.id} title={report.label} subtitle="Print-friendly · .txt download">
            <button className="secondary-btn" disabled={!!generating} onClick={() => generateReport(report.id)}>
              {generating === report.id ? <RefreshCw /> : <Download />} {generating === report.id ? "Generating…" : "Generate"}
            </button>
          </Card>
        ))}
      </section>
      {!compact && <Card title="RPH terkini" subtitle={`${visibleLessons.length || 4} rekod tersedia`}>
        <label className="field">
          <span>Filter by class</span>
          <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
            <option value="all">All lessons</option>
            <option value="legacy">Legacy lessons without class</option>
            {classes.map((schoolClass) => <option key={schoolClass._id} value={schoolClass._id}>{schoolClass.name} · {schoolClass.year}</option>)}
          </select>
        </label>
        <div className="material-grid">
          {(visibleLessons.length ? visibleLessons : liveMode ? [] : staticMaterials.slice(0, 4)).map((item) => <MaterialTile key={item._id || item.name} item={{ name: item.title || item.name, subject: item.classId?.name || item.className || item.subject || "RPH", size: item.year || item.type, updated: String(item.createdAt || item.updated || "Ready").slice(0, 10) }} />)}
          {!visibleLessons.length && liveMode && (
            <div className="empty-state-box span-2" style={{ padding: "24px 16px", textAlign: "center", border: "1px dashed var(--border)", borderRadius: 12, width: "100%" }}>
              <p className="body-copy" style={{ marginBottom: 14 }}>Nothing to show, you can start create your lesson plan to generate reports.</p>
              <button type="button" className="primary-btn" onClick={() => navigate(pageIdToPath("lesson-planner"))} style={{ margin: "0 auto" }}><Sparkles /> + Create Lesson Plan</button>
            </div>
          )}
        </div>
      </Card>}
    </div>
  );
}
