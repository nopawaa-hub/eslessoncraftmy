import React from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Clock,
  ClipboardCheck,
  FileText,
  Mic,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { API_BASE } from "../services/api.js";
import { cleanAiDisplayText } from "../lib/lesson.js";

function PageHeader({ eyebrow, title, subtitle, children }) {
  return <div className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{subtitle}</p></div>{children && <div className="header-actions">{children}</div>}</div>;
}

function Card({ title, subtitle, action, onAction, className = "", children }) {
  return <section className={`card ${className}`}><header>{<div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>}{action && <button onClick={onAction}>{action} <ArrowRight /></button>}</header>{children}</section>;
}

function StatCard({ stat }) {
  const icons = { indigo: BookOpen, amber: FileText, rose: ClipboardCheck, emerald: Clock };
  const Icon = icons[stat.tone] || BookOpen;
  // Mini decorative graphic: a stepping-arrow-up SVG for the emerald (lessons this week) card,
  // a document SVG for the amber (RPH pending) card, bars for the others.
  const Spark = stat.tone === "emerald" ? (
    <svg className="sparkline-stairs" width="48" height="48" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <path d="M4 30h8v-6h8v-6h8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.35" />
      <path d="M4 30 L12 24 L20 18 L28 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 8h8v8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : stat.tone === "amber" ? (
    <svg className="sparkline-doc" width="48" height="48" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <path d="M10 4h12l6 6v20a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" opacity="0.4" />
      <path d="M22 4v6h6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" opacity="0.4" />
      <path d="M13 18h10M13 22h10M13 26h6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ) : (
    <div className="sparkline">
      <span style={{ height: "16px" }} />
      <span style={{ height: "24px" }} />
      <span style={{ height: "32px" }} />
      <span style={{ height: "20px" }} />
    </div>
  );
  return (
    <div className={`stat-card tone-${stat.tone}`}>
      <div>
        <span className={`tone-icon ${stat.tone}`}><Icon /></span>
        <small>{stat.trend}</small>
      </div>
      <p>{stat.label}</p>
      <div className="stat-body">
        <strong>{stat.value}</strong>
        {Spark}
      </div>
      <span>{stat.hint}</span>
    </div>
  );
}

function ClassRow({ item, onClick }) {
  return <button className={`class-row ${item.tone}`} onClick={onClick}><span>{item.time.split(" ")[0]}<small>60 min</small></span><div><strong>{item.subject} · {item.className}</strong><small>Topic: {item.topic}</small></div><ArrowRight /></button>;
}

function Insight({ item, onClick }) {
  return <button className="insight" onClick={onClick}><i className={item.tone} /><div><strong>{item.title}</strong><span>{item.body}</span><em>{item.action} <ArrowRight /></em></div></button>;
}

function Goal({ label, value, hint }) {
  return <div className="goal"><div><span>{label}</span><strong>{hint}</strong></div><Progress value={value} /></div>;
}

function Progress({ value }) {
  return <div className="progress"><span style={{ width: `${value}%` }} /></div>;
}

function MaterialTile({ item, onDelete }) {
  const handleOpen = () => {
    if (item.url && item.url !== "#") {
      if (item.url.startsWith("http://") || item.url.startsWith("https://")) {
        window.open(item.url, "_blank");
      } else if (item.url.startsWith("/")) {
        const fullUrl = item.url.startsWith("/api/") ? item.url : `${API_BASE}${item.url}`;
        window.open(fullUrl, "_blank");
      }
    }
  };

  return (
    <div
      className="material-tile"
      onClick={handleOpen}
      style={{ cursor: item.url ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%", textAlign: "left", background: "var(--card-bg)", padding: "14px 16px", borderRadius: 12, border: "1px solid var(--border)", position: "relative" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 10, background: "var(--bg-subtle)", color: "var(--primary)" }}><FileText /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ display: "block", fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title || item.name}</strong>
          <small style={{ color: "var(--muted)", fontSize: "0.8rem", display: "block" }}>{item.subject || "English"} · {item.size || item.year || "RPH"} · {item.type || item.updated || item.status || "Ready"}</small>
        </div>
      </div>
      {onDelete && (
        <button
          type="button"
          className="icon-btn delete-icon"
          title="Delete material"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item);
          }}
          style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", borderRadius: 6, flexShrink: 0 }}
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}

function FormGrid({ form, updateForm, classes = [], applyClassContext }) {
  return (
    <div className="form-row">
      <label className="field"><span>English skill</span><select value={form.skill} onChange={(event) => updateForm("skill", event.target.value)}><option>Reading</option><option>Writing</option><option>Speaking</option><option>Listening</option><option>Grammar</option><option>Phonics</option></select></label>
      <label className="field"><span>Year</span><select value={form.year} onChange={(event) => updateForm("year", event.target.value)}><option>Year 1</option><option>Year 2</option><option>Year 3</option><option>Year 4</option><option>Year 5</option><option>Year 6</option></select></label>
      <label className="field">
        <span>Class</span>
        <select value={form.classId || ""} onChange={(event) => applyClassContext?.(event.target.value)}>
          <option value="">Select from class database</option>
          {classes.map((schoolClass) => <option key={schoolClass._id} value={schoolClass._id}>{schoolClass.name} · {schoolClass.year}</option>)}
        </select>
      </label>
      <label className="field"><span>Assessment</span><select value={form.assessmentType} onChange={(event) => updateForm("assessmentType", event.target.value)}><option>PBD observation, oral response and exit ticket</option><option>Reading response checklist</option><option>Speaking rubric and peer feedback</option><option>Writing sample and teacher conference</option><option>Listening task evidence</option></select></label>
    </div>
  );
}

function LessonPreview({ result, onRegenerate }) {
  const sections = [
    ["Objectives", result.objectives],
    ["Success Criteria", result.successCriteria],
    ["Activities", result.activities],
    ["Assessment", result.assessment],
    ["Differentiation", result.differentiation],
  ];

  const formatLessonItem = (item) => {
    const text = cleanAiDisplayText(item).replace(/\s+/g, " ").trim();
    const labelPattern = /(\b(?:Content|Teacher|Pupils|Assessment|Observation|CBA|TS\/HoM\/HOTS|CCE|ICT|T&LM|AIEd|SS|21stCPP|DS|Value)\s*:)/g;
    if (text.length < 180 || !labelPattern.test(text)) return text;

    labelPattern.lastIndex = 0;
    const parts = text.split(labelPattern).filter(Boolean);
    const intro = parts[0] && !parts[0].endsWith(":") ? parts.shift() : "";
    const rows = [];
    for (let index = 0; index < parts.length; index += 2) {
      rows.push({
        label: (parts[index] || "").replace(":", "").trim(),
        value: cleanAiDisplayText(parts[index + 1] || "").trim(),
      });
    }

    return (
      <div className="structured-lesson-item">
        {intro && <strong>{intro}</strong>}
        {rows.map((row, index) => row.value && (
          <p key={`${row.label}-${index}`}>
            <b>{row.label}</b>
            <span>{row.value}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="ai-review-note">
        <AlertTriangle />
        <div>
          <strong>AI-generated content. Please check before using.</strong>
          <span>Gemini can make mistakes in standards, timing, assessment evidence, and classroom details. Review and edit the RPH before printing or downloading.</span>
        </div>
      </div>
      <div className="alignment-grid">
        <div><span>Content Standard</span><strong>{cleanAiDisplayText(result.kssrAlignment?.contentStandard || "English KSSR alignment generated.")}</strong></div>
        <div><span>Learning Standard</span><strong>{cleanAiDisplayText(result.kssrAlignment?.learningStandard || "Skill-aligned learning standard generated.")}</strong></div>
        <div><span>Learning Outcomes</span><strong>{cleanAiDisplayText(result.kssrAlignment?.learningOutcomes || result.skillOutcome || "Measurable English learning outcomes generated.")}</strong></div>
      </div>
      {sections.map(([title, items]) => (
        <div className="lesson-section" key={title}>
          <div><h3>{title}</h3><button onClick={onRegenerate}><RefreshCw /> Regenerate</button></div>
          <ul>{(items || []).map((item, index) => <li key={`${title}-${index}`}>{formatLessonItem(item)}</li>)}</ul>
        </div>
      ))}
      <div className="lesson-section">
        <div><h3>Lesson Procedure</h3><button onClick={onRegenerate}><RefreshCw /> Regenerate</button></div>
        <div className="procedure-list">
          {(result.procedure || []).map((stage, index) => (
            <article key={`${stage.stage}-${index}`}>
              <header><strong>{cleanAiDisplayText(stage.stage)}</strong><span>{stage.minutes || "-"} min</span></header>
              <p>{cleanAiDisplayText(stage.lessonContent)}</p>
              <small><b>Teacher:</b> {cleanAiDisplayText(stage.teacherActivities)}</small>
              <small><b>Pupils:</b> {cleanAiDisplayText(stage.pupilActivities)}</small>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}

function SkeletonList() {
  return (
    <div className="skeleton-list" aria-label="AI is generating lesson plan">
      <div className="ai-loading-head">
        <span className="ai-orb"><Sparkles /></span>
        <div>
          <strong>Gemini is crafting your RPH</strong>
          <small>Aligning KSSR standards, activities and PBD evidence</small>
        </div>
        <span className="typing-dots"><i /><i /><i /></span>
      </div>
      {["Objectives", "KSSR alignment", "Activities", "Assessment", "Differentiation"].map((label, index) => (
        <div className="skeleton-block" key={label} style={{ "--delay": `${index * 120}ms` }}>
          <b>{label}</b>
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

function Tabs({ tabs, active, setActive }) {
  return <div className="tabs">{tabs.map((tab) => <button key={tab} className={active === tab ? "active" : ""} onClick={() => setActive(tab)}>{tab}</button>)}</div>;
}

function Metric({ title, value, note, tone, icon, onAction, actionLabel }) {
  const isZero = String(value) === "0%" || String(value) === "0" || Number(value) === 0;
  const barValue = isZero ? 0 : (typeof value === "number" ? Math.min(100, Math.max(0, value)) : (parseInt(String(value), 10) || (tone === "rose" ? 35 : 76)));
  const ICONS = { book: BookOpen, pencil: Pencil, mic: Mic, users: Users, alert: AlertTriangle };
  const Icon = ICONS[icon] || BarChart3;
  return (
    <div className={`metric tone-${tone}`}>
      <div className="metric-head">
        <span className={`tone-icon ${tone}`}><Icon /></span>
        <strong>{value}</strong>
      </div>
      <p>{title}</p>
      <small>{note}</small>
      <Progress value={barValue} />
      {onAction && actionLabel && (
        <button type="button" className="secondary-btn" onClick={onAction} style={{ marginTop: 12, width: "100%", justifyContent: "center", padding: "6px 12px", fontSize: "0.8rem" }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function BarSet({ data }) {
  const max = Math.max(...data.map((item) => item.value));
  return <div className="bar-set">{data.map((item) => <div key={item.label}><span>{item.label}</span><div><i style={{ width: `${(item.value / max) * 100}%` }} /></div><strong>{item.value}</strong></div>)}</div>;
}

function Badge({ tone = "indigo", children }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function TemplateGrid() {
  const templates = ["Oral Response", "Reading Comprehension", "Short Writing", "Group Presentation"];
  return <section className="report-grid"><button className="create-card"><Plus /> Create new template<span>Or generate with AI</span></button>{templates.map((name) => <Card key={name} title={name} subtitle="Reusable English PBD template"><button className="secondary-btn">Use</button></Card>)}</section>;
}

function UASAPanel() {
  return <section className="dashboard-grid"><Card className="span-2" title="AI Forecast · English UASA"><BarSet data={[{ label: "Reading", value: 82 }, { label: "Writing", value: 70 }, { label: "Grammar", value: 74 }, { label: "Speaking", value: 80 }]} /></Card><Card title="Forecast Summary"><p className="body-copy">78% of pupils are expected to reach grade B or above. Writing format and vocabulary precision remain the main risks.</p></Card></section>;
}

// Lightweight page-level skeleton used as the Suspense fallback for
// lazy-loaded route pages.
function PageSkeleton() {
  return (
    <div className="page-stack" style={{ padding: "24px" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ height: 12, width: 120, borderRadius: 6, background: "var(--bg-subtle)", marginBottom: 12 }} />
        <div style={{ height: 24, width: 280, borderRadius: 6, background: "var(--bg-subtle)", marginBottom: 8 }} />
        <div style={{ height: 14, width: 340, borderRadius: 6, background: "var(--bg-subtle)" }} />
      </div>
      <div className="planner-grid">
        <div style={{ height: 420, borderRadius: 16, background: "var(--bg-subtle)", animation: "copilotShimmer 1.6s infinite" }} />
        <div style={{ height: 420, borderRadius: 16, background: "var(--bg-subtle)", animation: "copilotShimmer 1.6s infinite 0.2s" }} />
      </div>
    </div>
  );
}

export {
  PageHeader,
  Card,
  StatCard,
  ClassRow,
  Insight,
  Goal,
  Progress,
  MaterialTile,
  FormGrid,
  LessonPreview,
  SkeletonList,
  Tabs,
  Metric,
  BarSet,
  Badge,
  TemplateGrid,
  UASAPanel,
  PageSkeleton,
};
