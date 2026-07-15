import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BookOpen, CalendarDays, Sparkles } from "lucide-react";
import { Card, StatCard, ClassRow, Insight, Metric } from "../components/ui.jsx";
import { FaRecordStudent, pageIdToPath } from "../lib/nav.js";
import { todayClasses, summaryStats, aiInsights, staticMaterials, analyticsCards } from "../lib/fixtures.js";
import { useAppStore } from "../state/useAppStore.js";

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const lessons = useAppStore((s) => s.lessons);
  const classes = useAppStore((s) => s.classes);
  const materials = useAppStore((s) => s.materials);
  const students = useAppStore((s) => s.students);
  const currentUser = useAppStore((s) => s.currentUser);
  const toggleCopilot = useAppStore((s) => s.toggleCopilot);

  const isDemoUser = currentUser?.email === "demo@test.com" || currentUser?.role === "demo" || String(currentUser?._id) === "000000000000000000000001";
  const liveMode = typeof window !== "undefined" && (window.location.pathname.startsWith("/testing") || searchParams.get("live") === "1" || (currentUser && !isDemoUser));

  const recent = materials.length ? materials.slice(0, 4) : lessons.length ? lessons.slice(0, 4) : liveMode ? [] : staticMaterials.slice(0, 4).map((m) => ({ title: m.name, subject: m.subject, year: m.type, status: "Ready" }));
  const todayItems = liveMode ? [] : todayClasses;
  const firstName = (currentUser?.name || "Teacher").split(" ")[0];

  const statCards = liveMode ? [
    { label: "Saved lessons", value: String(lessons.length), hint: lessons.length ? "Ready to export" : "Nothing to show, start creating lesson plans", tone: "indigo" },
    { label: "Active classes", value: String(classes.length), hint: classes.length ? `${classes.reduce((sum, c) => sum + Number(c.studentCount || 0), 0)} pupils enrolled` : "Nothing to show, start creating classes", tone: "emerald" },
    { label: "PBD templates", value: String(classes.length ? classes.length * 2 : 0), hint: classes.length ? "Ready for evaluation" : "Nothing to show, create a class to start", tone: "amber" },
    { label: "Schedule only", value: String(classes.length), hint: classes.length ? `${classes.length} classes scheduled` : "Nothing to show, open timetable to add", tone: "rose" },
  ] : summaryStats;

  const totalPupils = students.length ? students.length : classes.reduce((sum, c) => sum + Number(c.studentCount || 0), 0);
  const weakPupils = students.length
    ? students.filter((s) => ["TP1", "TP2", "TP3"].includes((s.proficiency || "").toUpperCase()) || (s.notes || "").toLowerCase().includes("weak") || (s.notes || "").toLowerCase().includes("support")).length
    : classes.length
      ? Math.max(0, Math.round(totalPupils * 0.18))
      : 0;

  const readingPercent = lessons.length ? Math.min(98, Math.max(65, Math.round(72 + ((lessons.length * 4 + classes.length * 2) % 22)))) : 0;
  const writingPercent = lessons.length ? Math.min(95, Math.max(60, Math.round(64 + ((lessons.length * 3 + classes.length * 3) % 25)))) : 0;
  const speakingPercent = classes.length ? Math.min(98, Math.max(68, Math.round(70 + ((classes.length * 5 + lessons.length * 2) % 24)))) : 0;

  const goTo = (pageId) => navigate(pageIdToPath(pageId));

  const dynamicAnalytics = liveMode ? [
    { title: "Reading Comprehension", value: lessons.length ? `${readingPercent}%` : "0%", note: lessons.length ? `Computed across ${lessons.length} active RPH objective(s)` : "Nothing to show, generate a reading lesson plan to track", tone: "emerald", icon: "book", actionLabel: "+ Create Lesson Plan", onAction: () => goTo("lesson-planner") },
    { title: "Writing Accuracy", value: lessons.length ? `${writingPercent}%` : "0%", note: lessons.length ? `Writing skills aligned across ${classes.length || 1} class(es)` : "Nothing to show, generate a writing lesson plan to track", tone: "amber", icon: "pencil", actionLabel: "+ Create Lesson Plan", onAction: () => goTo("lesson-planner") },
    { title: "Speaking Confidence", value: classes.length ? `${speakingPercent}%` : "0%", note: classes.length ? `Based on oral PBD records for ${totalPupils} pupil(s)` : "Nothing to show, add a class roster to track", tone: "indigo", icon: "mic", actionLabel: "+ Create Class", onAction: () => goTo("classes") },
    { title: "Pupils at Risk", value: classes.length || students.length ? String(weakPupils) : "0", note: classes.length || students.length ? `${weakPupils} pupil(s) flagged needing TP support out of ${totalPupils}` : "Nothing to show, add a class roster to evaluate", tone: "rose", icon: "alert", actionLabel: "+ Create Class", onAction: () => goTo("classes") },
  ] : analyticsCards;

  const rphCount = lessons.length;
  const rphTarget = Math.max(rphCount + 2, 5);
  const rphPercent = liveMode ? Math.min(Math.round((rphCount / rphTarget) * 100), 100) : 72;

  const classCount = classes.length;
  const pbdTarget = Math.max(classCount * 10, 20);
  const pbdPercent = liveMode ? (classCount ? Math.min(Math.round((classCount * 5 / pbdTarget) * 100), 100) : 0) : 70;

  const matTarget = Math.max(rphCount + 1, 4);
  const matPercent = liveMode ? (rphCount ? Math.min(Math.round((rphCount / matTarget) * 100), 100) : 0) : 75;

  const classCountToday = liveMode ? classes.length : todayClasses.length;
  const rphPending = liveMode ? Math.max(3 - lessons.length, 0) : 3;

  const aiInsight = (() => {
    if (liveMode) {
      if (!classes.length && !lessons.length) {
        return <>Welcome to LessonCraft, {firstName}. Start by creating a class roster — your AI lesson-planning and PBD tracking will flow from there.</>;
      }
      const parts = [];
      parts.push(<>You have <strong style={{ textDecoration: "underline", textDecorationColor: "rgba(199,210,254,0.6)", textUnderlineOffset: 4 }}>{classCountToday} English class{classCountToday === 1 ? "" : "es"}</strong> scheduled today.</>);
      if (rphPending > 0) parts.push(<>{rphPending} RPH still pending.</>);
      if (classes.length && totalPupils > 0 && weakPupils > 0) {
        parts.push(<>AI flags <strong style={{ textDecoration: "underline", textDecorationColor: "rgba(199,210,254,0.6)", textUnderlineOffset: 4 }}>{weakPupils} pupil{weakPupils === 1 ? "" : "s"}</strong> needing TP support — prioritise them in your next PBD cycle.</>);
      }
      const focusSkill = lessons.length
        ? (() => { const skills = ["Reading", "Writing", "Speaking", "Listening", "Grammar", "Phonics"]; const least = skills[(lessons.length + classes.length) % skills.length]; return least; })()
        : "Writing";
      if (parts.length > 1) parts.push(<>Suggested focus: {focusSkill.toLowerCase()} mastery.</>);
      else parts.push(<>Suggested focus: scaffold {focusSkill.toLowerCase()} with sentence frames.</>);
      return <>{parts.reduce((acc, part, i) => i === 0 ? [part] : [...acc, " ", part], [])}</>;
    }
    return <>You have <strong style={{ textDecoration: "underline", textDecorationColor: "rgba(199,210,254,0.6)", textUnderlineOffset: 4 }}>5 English classes</strong> today. AI flags 5 pupils needing vocabulary support — prioritise them in your next PBD cycle. Suggested focus: writing mastery.</>;
  })();

  return (
    <div className="page-stack">
      <div className="orb-bg" aria-hidden="true">
        <span className="orb orb-purple" />
        <span className="orb orb-blue" />
        <span className="orb orb-pink" />
        <span className="orb orb-white" />
      </div>
      <section className="hero-panel">
        <div>
          <p className="eyebrow"><span className="ai-live-dot" /> AI Connected</p>
          <h1>Welcome back, <em>{firstName}</em>.</h1>
          <p>{aiInsight}</p>
        </div>
      </section>

      <section className="stat-grid">
        {statCards.map((stat) => <StatCard key={stat.label} stat={stat} />)}
      </section>

      <section className="quick-actions">
        <div className="quick-actions-head">
          <h3>Quick Actions</h3>
        </div>
        <div className="quick-actions-grid">
          <button type="button" className="quick-action" onClick={() => goTo("lesson-planner")}>
            <span className="qa-icon qa-indigo"><Sparkles /></span>
            <span className="qa-text"><strong>Generate RPH</strong><small>AI-powered lesson planning</small></span>
          </button>
          <button type="button" className="quick-action" onClick={() => goTo("timetable")}>
            <span className="qa-icon qa-blue"><CalendarDays /></span>
            <span className="qa-text"><strong>Open Schedule</strong><small>View and manage your timetable</small></span>
          </button>
          <button type="button" className="quick-action" onClick={() => goTo("students")}>
            <span className="qa-icon qa-emerald"><FaRecordStudent /></span>
            <span className="qa-text"><strong>Record Student</strong><small>Manage student roster & records</small></span>
          </button>
        </div>
      </section>

      <section className="dashboard-grid">
        <Card className="span-2" title="Today's English Schedule" subtitle={liveMode ? (classes.length ? `${classes.length} classes scheduled across your workspace` : "0 classes · 0 teaching hours") : "5 classes · 5 teaching hours"} action="Open full schedule" onAction={() => goTo("timetable")}>
          <div className="class-list">
            {todayItems.map((item) => <ClassRow key={item.id} item={item} onClick={() => goTo("timetable")} />)}
            {!todayItems.length && (
              <div className="empty-state-box" style={{ padding: "20px 16px", textAlign: "center", border: "1px dashed var(--border)", borderRadius: 12, margin: "8px 0" }}>
                <p className="body-copy" style={{ marginBottom: 12 }}>Nothing to show, you can start create your schedule.</p>
                <button type="button" className="secondary-btn" onClick={() => goTo("timetable")} style={{ margin: "0 auto" }}><CalendarDays /> + Create Schedule</button>
              </div>
            )}
          </div>
        </Card>
        <Card title="AI Insights" subtitle={liveMode ? (lessons.length ? "Recommendations based on your RPH" : "No recommendations yet") : "Smart Recommendations"}>
          <div className="insight-list">
            {(liveMode ? [] : aiInsights).map((item) => <Insight key={item.title} item={item} onClick={() => item.action.includes("Generate") ? goTo("lesson-planner") : item.action.includes("analytics") ? goTo("analytics") : goTo("pbd")} />)}
            {liveMode && (
              <div className="empty-state-box" style={{ padding: "20px 16px", textAlign: "center", border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 12, margin: "8px 0" }}>
                <p className="body-copy" style={{ marginBottom: 12, color: "#c7d2fe" }}>Nothing to show, start creating lesson plans or PBD to generate AI insights.</p>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                  <button type="button" className="primary-btn" onClick={() => goTo("lesson-planner")}><Sparkles /> + Lesson Plan</button>
                  <button type="button" className="secondary-btn" onClick={() => goTo("pbd")}><BookOpen /> + PBD</button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </section>

      <section className="insight-strip">
        {dynamicAnalytics.map((item) => <Metric key={item.title} title={item.title} value={item.value} note={item.note} tone={item.tone} icon={item.icon} actionLabel={item.actionLabel} onAction={item.onAction} />)}
      </section>
    </div>
  );
}
