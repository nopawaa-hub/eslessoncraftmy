import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Download,
  RefreshCw,
  Sparkles,
  Square,
  Wand2,
  X,
} from "lucide-react";
import { Card, PageHeader, FormGrid, LessonPreview, SkeletonList } from "../components/ui.jsx";
import { apiPost } from "../services/api.js";
import { extractLessonFormFromText, downloadLessonDocx } from "../lib/lesson.js";
import { emptyLessonForm } from "../lib/fixtures.js";
import { pageIdToPath } from "../lib/nav.js";
import { useAppStore } from "../state/useAppStore.js";
import { useDraft } from "../hooks/useDraft.js";

export default function LessonPlanner() {
  const navigate = useNavigate();

  // Draft system — loads/creates a draft based on the :draftId URL param.
  // form/result are seeded from the persisted draft, and changes are
  // debounced-autosaved back to localStorage via the store.
  const { draft, draftId, form: draftForm, saveForm, saveResult } = useDraft();

  // Store state
  const classes = useAppStore((s) => s.classes);
  const selectedClassId = useAppStore((s) => s.selectedClassId);
  const setSelectedClassId = useAppStore((s) => s.setSelectedClassId);
  const copilotFormDraft = useAppStore((s) => s.copilotFormDraft);
  const setCopilotFormDraft = useAppStore((s) => s.setCopilotFormDraft);
  const selectedModel = useAppStore((s) => s.selectedModel);
  const refreshLessons = useAppStore((s) => s.refreshLessons);
  const pushHistory = useAppStore((s) => s.pushHistory);

  // Loading/error now live in the store so they survive navigation.
  const loading = useAppStore((s) => s.generateLoading);
  const setLoading = useAppStore((s) => s.setGenerateLoading);
  const error = useAppStore((s) => s.generateError);
  const setError = useAppStore((s) => s.setGenerateError);

  // AbortController ref so we can cancel an in-flight generation.
  const abortRef = useRef(null);

  // Local component state — seeded from the draft, then kept in sync.
  const [difficulty, setDifficulty] = useState(draft?.difficulty || 3);
  const [quickPrompt, setQuickPrompt] = useState(draft?.quickPrompt || "");
  const [quickFilling, setQuickFilling] = useState(false);

  // The working form — initialized from the draft (or empty defaults),
  // kept in component state for responsive keystrokes, and debounced-auto-
  // saved to the draft store.
  const [form, setForm] = useState(draft?.form || emptyLessonForm);

  // The generated result — from the draft if one exists.
  const [result, setResult] = useState(draft?.result || null);

  // When the draft changes (e.g. navigating to a different :draftId URL),
  // re-seed the local state from the new draft.
  useEffect(() => {
    if (draft) {
      setForm(draft.form || emptyLessonForm);
      setResult(draft.result || null);
      setDifficulty(draft.difficulty || 3);
      setQuickPrompt(draft.quickPrompt || "");
    }
  }, [draftId]);  // intentionally only re-seed on draftId change, not draft object

  // Autosave form changes (debounced 500ms via the useDraft hook).
  useEffect(() => {
    if (draftId) saveForm(form);
  }, [form, draftId, saveForm]);

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const applyClassContext = (classId) => {
    const schoolClass = classes.find((item) => item._id === classId);
    setSelectedClassId(classId);
    setForm((current) => ({
      ...current,
      classId,
      ...(schoolClass ? {
        year: schoolClass.year || current.year,
        className: schoolClass.name || current.className,
        numberOfStudents: String(schoolClass.studentCount || current.numberOfStudents || ""),
        studentProficiency: schoolClass.studentProficiency || current.studentProficiency,
        classroomEnvironment: schoolClass.classroomEnvironment || current.classroomEnvironment,
        teachingNotes: schoolClass.teachingNotes || current.teachingNotes,
      } : {}),
    }));
  };

  useEffect(() => {
    if (selectedClassId && selectedClassId !== form.classId) applyClassContext(selectedClassId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId, classes]);

  useEffect(() => {
    if (copilotFormDraft && typeof copilotFormDraft === "object") {
      setForm((current) => ({
        ...current,
        topic: copilotFormDraft.topic || current.topic,
        skill: copilotFormDraft.skill || current.skill,
        year: copilotFormDraft.year || current.year,
        durationMinutes: copilotFormDraft.durationMinutes ? String(copilotFormDraft.durationMinutes) : current.durationMinutes,
        numberOfStudents: copilotFormDraft.numberOfStudents ? String(copilotFormDraft.numberOfStudents) : current.numberOfStudents,
        objectives: copilotFormDraft.objectives || current.objectives,
        stepsOverview: copilotFormDraft.stepsOverview || current.stepsOverview,
        materials: copilotFormDraft.materials || current.materials,
        assessmentType: copilotFormDraft.assessmentType || current.assessmentType,
        priorKnowledge: copilotFormDraft.priorKnowledge || current.priorKnowledge,
        teachingNotes: copilotFormDraft.teachingNotes || current.teachingNotes,
        classId: copilotFormDraft.classId || current.classId,
        className: copilotFormDraft.className || current.className,
      }));
      if (copilotFormDraft.classId) {
        setSelectedClassId(copilotFormDraft.classId);
      }
    }
  }, [copilotFormDraft, setSelectedClassId]);

  const handleQuickFill = async () => {
    if (!quickPrompt.trim() || quickFilling) return;
    setQuickFilling(true);
    try {
      const res = await apiPost("/copilot/ask", { question: `Provide a detailed lesson plan breakdown for: ${quickPrompt}` });
      const text = res.reply || "";
      const extracted = extractLessonFormFromText(text, classes, quickPrompt);
      setForm((current) => ({
        ...current,
        topic: extracted.topic || quickPrompt.slice(0, 40) || current.topic,
        skill: extracted.skill || current.skill,
        year: extracted.year || current.year,
        durationMinutes: extracted.durationMinutes ? String(extracted.durationMinutes) : current.durationMinutes,
        numberOfStudents: extracted.numberOfStudents ? String(extracted.numberOfStudents) : current.numberOfStudents,
        objectives: extracted.objectives || current.objectives,
        stepsOverview: extracted.stepsOverview || text.slice(0, 400) || current.stepsOverview,
        materials: extracted.materials || current.materials,
        assessmentType: extracted.assessmentType || current.assessmentType,
        classId: extracted.classId || current.classId,
        className: extracted.className || current.className,
      }));
      if (extracted.classId) setSelectedClassId(extracted.classId);
      setCopilotFormDraft(extracted);
      setQuickPrompt("");
    } catch (err) {
      const extracted = extractLessonFormFromText(quickPrompt, classes, quickPrompt);
      setForm((current) => ({
        ...current,
        topic: extracted.topic || current.topic,
        skill: extracted.skill || current.skill,
        year: extracted.year || current.year,
        durationMinutes: extracted.durationMinutes ? String(extracted.durationMinutes) : current.durationMinutes,
      }));
      setQuickPrompt("");
    } finally {
      setQuickFilling(false);
    }
  };

  const exportLesson = async () => {
    setError("");
    try {
      await downloadLessonDocx(result);
    } catch (err) {
      setError(err.message || "Could not export DOCX.");
    }
  };

  // Stop an in-flight generation by aborting the fetch.
  const stopGeneration = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setLoading(false);
  };

  const generate = async () => {
    // Abort any previous in-flight request before starting a new one.
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError("");
    try {
      const resolve = (value, fallback) => (value && String(value).trim() ? value : fallback);
      const payload = {
        ...form,
        subject: "English",
        topic: resolve(form.topic, "Main Ideas in Short Texts"),
        objectives: resolve(form.objectives, "identify the main idea; match supporting details; explain one answer using because"),
        materials: resolve(form.materials, "Short text strips, picture prompts, sentence frames, exit tickets"),
        stepsOverview: resolve(form.stepsOverview, "Picture talk, teacher modelling, pair matching, group justification, exit ticket."),
        priorKnowledge: resolve(form.priorKnowledge, "Pupils can read short paragraphs and know common classroom vocabulary."),
        numberOfStudents: resolve(form.numberOfStudents, "32"),
        studentProficiency: resolve(form.studentProficiency, "Mixed ability"),
        classroomEnvironment: resolve(form.classroomEnvironment, "Standard classroom with limited ICT"),
        classroomType: `${resolve(form.studentProficiency, "Mixed ability")} English class, differentiation level ${difficulty}, ${resolve(form.classroomEnvironment, "standard classroom")}`,
        templateType: "KSSR English Lesson Plan",
        durationMinutes: Number(form.durationMinutes || 60),
      };
      // Inject the selected AI model preference (the backend validates/ignores if unsupported).
      if (selectedModel) payload.model = selectedModel;

      const data = await apiPost("/generate", payload, { signal: controller.signal });
      setResult(data);

      // Persist the result to the draft immediately (not debounced — low frequency).
      saveResult(data);

      // Also push to the generation history.
      pushHistory({
        title: data?.title || "English RPH",
        type: "lesson-plan",
        payload: { draftId, serverId: data?.lessonPlanId },
      });

      refreshLessons?.();
    } catch (err) {
      // Don't show an error if the user manually aborted.
      if (err?.name === "AbortError" || controller.signal.aborted) return;
      setError(err.message || "Could not generate lesson plan.");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setLoading(false);
    }
  };

  return (
    <div className="page-stack">
      {/* ANIMATED ORB BACKGROUND */}
      <div className="orb-bg" aria-hidden="true">
        <span className="orb orb-purple" />
        <span className="orb orb-blue" />
        <span className="orb orb-pink" />
        <span className="orb orb-white" />
      </div>
      <PageHeader eyebrow="English Lesson Planner AI" title="Generate English RPH." subtitle="Create your own lesson plan using the most sophisticated AI agent tool on the market." />
      <section className="planner-grid lesson-planner-stack">
        <Card title="Input RPH" className="sticky-card">
          {copilotFormDraft && (
            <div className="ai-fill-banner" style={{ background: "color-mix(in srgb, var(--primary) 15%, transparent)", border: "1px solid var(--primary)", borderRadius: 12, padding: "12px 14px", marginBottom: 16, display: "flex", flexDirection: "column", gap: 10, boxShadow: "0 4px 12px rgba((0,0,0,0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", fontWeight: 700, color: "var(--primary)" }}>
                  <Sparkles size={16} />
                  <span>Form Auto-Filled by AI Copilot!</span>
                </div>
                <button type="button" onClick={() => setCopilotFormDraft(null)} style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", padding: 2 }} title="Dismiss banner">
                  <X size={15} />
                </button>
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--foreground)", margin: 0, lineHeight: 1.4 }}>
                We extracted your topic (<strong>{form.topic || "Lesson"}</strong>), steps, objectives, and materials right from your Copilot conversation. Review or tweak any inputs below, then click <strong>Generate RPH with AI</strong>!
              </p>
            </div>
          )}
          <div className="ai-quick-fill-box" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px", marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", fontWeight: 700, color: "var(--primary)" }}>
              <Wand2 size={15} /> <span>AI Quick Form Fill</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="e.g. 1-hour speaking and reading lesson on giving opinions for Year 5 Bestari..."
                value={quickPrompt}
                onChange={(event) => setQuickPrompt(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleQuickFill()}
                disabled={quickFilling}
                style={{ flex: 1, fontSize: "0.82rem", padding: "8px 11px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--foreground)" }}
              />
              <button type="button" className="primary-btn" onClick={handleQuickFill} disabled={quickFilling || !quickPrompt.trim()} style={{ padding: "8px 14px", fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                {quickFilling ? <RefreshCw className="spin" size={14} /> : <Wand2 size={14} />} {quickFilling ? "Filling..." : "Fill Form"}
              </button>
            </div>
          </div>
          <label className="field">
            <span>Class container</span>
            <select value={form.classId || ""} onChange={(event) => applyClassContext(event.target.value)}>
              <option value="">No class selected</option>
              {classes.map((schoolClass) => (
                <option key={schoolClass._id} value={schoolClass._id}>
                  {schoolClass.name} · {schoolClass.year} · {schoolClass.studentProficiency || "Mixed ability"}
                </option>
              ))}
            </select>
          </label>
          <FormGrid form={form} updateForm={updateForm} classes={classes} applyClassContext={applyClassContext} />
          <label className="field"><span>English topic</span><input value={form.topic} onChange={(event) => updateForm("topic", event.target.value)} placeholder="Main Ideas in Short Texts" /></label>
          <label className="field"><span>Learning objectives</span><textarea rows="3" value={form.objectives} onChange={(event) => updateForm("objectives", event.target.value)} placeholder="identify the main idea; match supporting details; explain one answer using because" /></label>
          <div className="form-row">
            <label className="field"><span>Duration (min)</span><input type="number" value={form.durationMinutes} onChange={(event) => updateForm("durationMinutes", event.target.value)} placeholder="60" /></label>
            <label className="field"><span>Pupils</span><input value={form.numberOfStudents} onChange={(event) => updateForm("numberOfStudents", event.target.value)} placeholder="32" /></label>
          </div>
          <label className="field"><span>Differentiation level: {difficulty}</span><input type="range" min="1" max="5" value={difficulty} onChange={(event) => setDifficulty(event.target.value)} /></label>
          <label className="field"><span>Prior knowledge</span><textarea rows="2" value={form.priorKnowledge} onChange={(event) => updateForm("priorKnowledge", event.target.value)} placeholder="Pupils can read short paragraphs and know common classroom vocabulary." /></label>
          <label className="field"><span>Student proficiency</span><input value={form.studentProficiency} onChange={(event) => updateForm("studentProficiency", event.target.value)} placeholder="Mixed ability" /></label>
          <label className="field"><span>Classroom environment</span><textarea rows="2" value={form.classroomEnvironment} onChange={(event) => updateForm("classroomEnvironment", event.target.value)} placeholder="Standard classroom with limited ICT" /></label>
          <label className="field"><span>Teaching notes</span><textarea rows="2" value={form.teachingNotes} onChange={(event) => updateForm("teachingNotes", event.target.value)} placeholder="Optional notes for this lesson (e.g. differentiation reminders, language focus)" /></label>
          <label className="field"><span>Materials</span><textarea rows="2" value={form.materials} onChange={(event) => updateForm("materials", event.target.value)} placeholder="Short text strips, picture prompts, sentence frames, exit tickets" /></label>
          <label className="field"><span>Tell your lesson steps briefly</span><textarea rows="3" value={form.stepsOverview} onChange={(event) => updateForm("stepsOverview", event.target.value)} placeholder="Picture talk, teacher modelling, pair matching, group justification, exit ticket." /></label>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="primary-btn full" disabled={loading} onClick={generate} style={{ flex: 1 }}>{loading ? <RefreshCw className="spin" /> : <Wand2 />} {loading ? "Generating RPH..." : "Generate RPH with AI"}</button>
            {loading && (
              <button type="button" className="secondary-btn" onClick={stopGeneration} title="Stop generation" style={{ flexShrink: 0, padding: "0 16px" }}>
                <Square size={16} />
              </button>
            )}
          </div>
          {error && <div className="error-note"><AlertTriangle /> {error}</div>}
        </Card>

        <Card title={result?.title || "Generated English RPH"} subtitle={result ? `${result.lessonDetails?.subject || "English"} · ${result.lessonDetails?.year || form.year} · ${result.lessonDetails?.durationMinutes || form.durationMinutes} min · ${result.templateType || "KSSR English Lesson Plan"}` : "Your AI-generated lesson plan will appear here once you click Generate."} className="lesson-preview" action={result ? "Attach material" : undefined} onAction={result ? () => navigate(pageIdToPath("materials")) : undefined}>
          {!loading && !result && (
            <div className="lesson-empty-state">
              <Sparkles />
              <strong>Nothing here yet</strong>
              <span>Fill in the topic and class details, then tap <em>Generate RPH with AI</em> to create your KSSR English lesson plan.</span>
            </div>
          )}
          {!loading && result && (
            <div className="export-callout">
              <div>
                <strong>Template-ready RPH</strong>
                <span>Download the AI-filled Word lesson plan using your uploaded template.</span>
              </div>
              <button className="primary-btn" onClick={exportLesson}><Download /> Download DOCX</button>
            </div>
          )}
          {loading && <SkeletonList />}
          {!loading && result && <LessonPreview result={result} onRegenerate={generate} />}
        </Card>
      </section>
    </div>
  );
}
