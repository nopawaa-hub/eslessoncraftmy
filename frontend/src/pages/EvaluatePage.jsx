import React, { useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  RefreshCw,
  Sparkles,
  Square,
  Upload,
  Wand2,
} from "lucide-react";
import { DocxViewer, PdfViewer, TextViewer } from "../DocViewer.jsx";
import { Card } from "../components/ui.jsx";
import { SvgLineConnector, SAMPLE_EVAL_LESSON } from "../components/lesson-doc.jsx";
import { API_BASE, authHeaders } from "../services/api.js";
import { lessonToText } from "../lib/lesson.js";
import { pageIdToPath } from "../lib/nav.js";
import { useAppStore } from "../state/useAppStore.js";

export default function EvaluatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // State from the store
  const lessons = useAppStore((s) => s.lessons);
  const currentUser = useAppStore((s) => s.currentUser);

  // EvaluatePage state now lives in the store (survives navigation + refresh).
  const evState = useAppStore((s) => s.evaluateState);
  const setEvState = useAppStore((s) => s.setEvaluateState);
  const resetEvState = useAppStore((s) => s.resetEvaluateState);
  const loading = useAppStore((s) => s.evaluateLoading);
  const setLoading = useAppStore((s) => s.setEvaluateLoading);
  const error = useAppStore((s) => s.evaluateError);
  const setError = useAppStore((s) => s.setEvaluateError);

  // AbortController ref so we can cancel an in-flight evaluation.
  const abortRef = useRef(null);

  // Compute liveMode from store + URL
  const isDemoUser = currentUser?.email === "demo@test.com" || currentUser?.role === "demo" || String(currentUser?._id) === "000000000000000000000001";
  const liveMode = typeof window !== "undefined" && (window.location.pathname.startsWith("/testing") || searchParams.get("live") === "1" || (currentUser && !isDemoUser));

  // Persisted evaluation fields come from the store; local UI fields that
  // don't need to survive navigation stay in useState.
  const mode = evState.mode || "text";
  const textInput = evState.textInput || (liveMode && !lessons.length ? "" : SAMPLE_EVAL_LESSON);
  const evaluatedText = evState.evaluatedText || "";
  const annotations = evState.annotations || [];
  const overallScore = evState.overallScore ?? 78;
  const rubric = evState.rubric || null;
  const summary = evState.summary || "";
  const activeTab = evState.activeTab || "comments";
  const lessonResult = evState.lessonResult || null;
  const fileDataUrl = evState.fileDataUrl || null;
  const fileType = evState.fileType || null;

  const setMode = (v) => setEvState({ mode: v });
  const setTextInput = (v) => setEvState({ textInput: v });
  const setEvaluatedText = (v) => setEvState({ evaluatedText: v });
  const setAnnotations = (v) => setEvState({ annotations: v });
  const setOverallScore = (v) => setEvState({ overallScore: v });
  const setRubric = (v) => setEvState({ rubric: v });
  const setSummary = (v) => setEvState({ summary: v });
  const setActiveTab = (v) => setEvState({ activeTab: v });
  const setLessonResult = (v) => setEvState({ lessonResult: v });
  const setFileDataUrl = (v) => setEvState({ fileDataUrl: v });
  const setFileType = (v) => setEvState({ fileType: v });

  // Ephemeral UI state (no need to persist across navigation).
  const [fileInput, setFileInput] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState(lessons[0]?._id || "");
  const [activeIndex, setActiveIndex] = useState(null);
  const [docView, setDocView] = useState("document");
  const [searchQuery, setSearchQuery] = useState("");
  const [zoomLevel, setZoomLevel] = useState(100);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const commentScrollRef = useRef(null);
  const pagesAreaRef = useRef(null);

  const scrollToHighlight = (idx) => {
    setTimeout(() => {
      const mark = document.querySelector(`mark[data-ann-idx="${idx}"], .pdf-highlight[data-ann-idx="${idx}"]`);
      if (mark) {
        mark.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        mark.classList.add("blipping");
        setTimeout(() => mark.classList.remove("blipping"), 1200);
      }
      const card = document.getElementById(`comment-card-${idx}`);
      if (card) {
        card.classList.add("blipping");
        setTimeout(() => card.classList.remove("blipping"), 1200);
      }
    }, 50);
  };

  const scrollToComment = (idx) => {
    setTimeout(() => {
      const card = document.getElementById(`comment-card-${idx}`);
      if (card && card.scrollIntoView) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        card.classList.add("blipping");
        setTimeout(() => card.classList.remove("blipping"), 1200);
      }
      const mark = document.querySelector(`mark[data-ann-idx="${idx}"], .pdf-highlight[data-ann-idx="${idx}"]`);
      if (mark) {
        mark.classList.add("blipping");
        setTimeout(() => mark.classList.remove("blipping"), 1200);
      }
    }, 50);
  };

  const searchMatchCount = searchQuery
    ? annotations.filter((a) => (a.text || "").toLowerCase().includes(searchQuery.toLowerCase()) || (a.issue || "").toLowerCase().includes(searchQuery.toLowerCase())).length
    : 0;
  const effectiveAnnotations = searchQuery
    ? annotations.filter((a) => (a.text || "").toLowerCase().includes(searchQuery.toLowerCase()) || (a.issue || "").toLowerCase().includes(searchQuery.toLowerCase()))
    : annotations;

  // Stop an in-flight evaluation by aborting the fetch.
  const stopEvaluation = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setLoading(false);
  };

  async function handleEvaluate(e) {
    if (e && e.preventDefault) e.preventDefault();

    // Abort any previous in-flight request before starting a new one.
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError("");
    setLoading(true);
    setActiveIndex(null);
    setLessonResult(null);
    setFileDataUrl(null);
    setFileType(null);
    setSearchQuery("");
    setZoomLevel(100);
    setDocView("document");

    if (mode === "file" && fileInput) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFileDataUrl(e.target.result);
        setFileType(fileInput.type);
      };
      reader.readAsDataURL(fileInput);
    }

    try {
      const formData = new FormData();
      let textToUse = "";
      let structuredResult = null;

      if (mode === "file" && fileInput) {
        formData.append("file", fileInput);
      } else if (mode === "saved" && selectedLessonId) {
        const found = lessons.find((l) => l._id === selectedLessonId);
        if (found) {
          textToUse = typeof found.content === "string" && found.content.trim() ? found.content : lessonToText(found);
          structuredResult = found.aiGeneratedContent || found.generatedFields || found;
        }
        if (!textToUse.trim()) {
          throw new Error("Selected saved lesson has no text content.");
        }
        formData.append("lessonPlan", textToUse);
      } else {
        textToUse = textInput.trim();
        if (!textToUse || textToUse.length < 20) {
          throw new Error("Please enter at least 20 characters of lesson text.");
        }
        formData.append("lessonPlan", textToUse);
      }

      const res = await fetch(`${API_BASE}/evaluate`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || data.error || "Evaluation request failed.");
      }

      const returnedAnnotations = Array.isArray(data.annotations) ? data.annotations : [];
      setAnnotations(returnedAnnotations);
      setSummary(data.summary || `${returnedAnnotations.length} annotation(s) found for KSSR improvement.`);
      setOverallScore(data.overallScore || data.rubric?.overallScore || Math.max(50, 95 - returnedAnnotations.length * 7));
      setRubric(data.rubric || null);

      const displayText = data.lessonText || textToUse || textInput;
      setEvaluatedText(displayText);

      if (structuredResult && (structuredResult.procedure || structuredResult.objectives)) {
        setLessonResult(structuredResult);
      }

      setActiveTab("comments");
    } catch (err) {
      // Don't show an error if the user manually aborted.
      if (err?.name === "AbortError" || controller.signal.aborted) return;
      setError(err.message || "Something went wrong during evaluation.");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setLoading(false);
    }
  }

  const currentDisplayLength = evaluatedText ? evaluatedText.length : textInput.length;

  return (
    <div className="page-stack">
      <div className="welcome-banner">
        <div>
          <span className="ai-orb">
            <Wand2 />
          </span>
          <h1>Evaluation Engine · Google Docs Reviewer</h1>
          <p className="body-copy">
            AI highlights weak pedagogy, teacher-centered habits, and low HOTS directly on your lesson plan text. Click any highlighted phrase to view the diagnosis and remedy.
          </p>
        </div>
        <div className="actions-row">
          {evaluatedText && (
            <button className="secondary-btn" onClick={() => { resetEvState(); setSearchQuery(""); setActiveIndex(null); }}>
              <RefreshCw /> Edit & Re-Evaluate
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="auth-warning" style={{ margin: "0 auto", width: "100%", maxWidth: 1180 }}>
          <AlertTriangle />
          <div>
            <strong>Evaluation Error</strong>
            <p className="muted">{error}</p>
          </div>
        </div>
      )}

      {!evaluatedText ? (
        <Card title="Input Lesson Plan for Evaluation" subtitle="Choose how you want to provide your KSSR lesson plan">
          <form onSubmit={handleEvaluate} className="form-card" style={{ gap: 20 }}>
            <div className="segmented-control" style={{ width: "fit-content" }}>
              <button type="button" className={mode === "text" ? "active" : ""} onClick={() => setMode("text")}>
                Text / Paste
              </button>
              <button type="button" className={mode === "file" ? "active" : ""} onClick={() => setMode("file")}>
                Upload File (.docx, .pdf, .txt)
              </button>
              <button type="button" className={mode === "saved" ? "active" : ""} onClick={() => setMode("saved")}>
                Saved Lesson Plans
              </button>
            </div>

            {mode === "text" && (
              <label className="field">
                <span>Lesson Plan Text</span>
                <textarea
                  rows={12}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Paste your KSSR lesson plan text here..."
                  style={{ fontSize: "0.95rem" }}
                />
              </label>
            )}

            {mode === "file" && (
              <div className="upload-dropzone">
                <span className="ai-orb" style={{ width: 54, height: 54 }}>
                  <Upload style={{ width: 26, height: 26 }} />
                </span>
                <strong>{fileInput ? fileInput.name : "Click or drop a lesson plan file here"}</strong>
                <small>{fileInput ? `${(fileInput.size / 1024).toFixed(1)} KB` : "Supports .txt, .pdf, and .docx format up to 8 MB"}</small>
                <input
                  type="file"
                  accept=".txt,.pdf,.docx"
                  onChange={(e) => setFileInput(e.target.files?.[0] || null)}
                />
              </div>
            )}

            {mode === "saved" && (
              <label className="field">
                <span>Select from your Saved Lessons</span>
                {lessons.length > 0 ? (
                  <select value={selectedLessonId} onChange={(e) => setSelectedLessonId(e.target.value)}>
                    {lessons.map((l) => (
                      <option key={l._id} value={l._id}>
                        {l.title || "Untitled Lesson"} · {l.lessonDetails?.subject || "English"} ({l.lessonDetails?.year || "Year"})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="empty-state-box" style={{ padding: "16px", textAlign: "center", border: "1px dashed var(--border)", borderRadius: 10 }}>
                    <p className="muted" style={{ marginBottom: 12 }}>Nothing to show, you can start create your lesson plan in the Lesson Planner.</p>
                    <button type="button" className="primary-btn" onClick={() => navigate(pageIdToPath("lesson-planner"))} style={{ margin: "0 auto" }}><Sparkles /> + Open Lesson Planner</button>
                  </div>
                )}
              </label>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button type="submit" className="primary-btn" disabled={loading} style={{ minWidth: 180 }}>
                {loading ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                    <RefreshCw className="spin" style={{ width: 18, height: 18 }} /> Evaluating...
                  </span>
                ) : (
                  <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                    <Wand2 style={{ width: 18, height: 18 }} /> Evaluate with AI
                  </span>
                )}
              </button>
              {loading && (
                <button type="button" className="secondary-btn" onClick={stopEvaluation} title="Stop evaluation">
                  <Square size={16} />
                </button>
              )}
            </div>
          </form>
        </Card>
      ) : (
        <div className="DV-docViewer DV-viewDocument">
          <div className="DV-pagesArea" ref={pagesAreaRef} style={{ position: "relative" }}>
            <SvgLineConnector targetIdx={hoveredIndex !== null ? hoveredIndex : activeIndex} containerRef={pagesAreaRef} />
            {/* === LEFT: COMMENT CARDS === */}
            <div className="DV-sidebar">
              <div className="DV-sidebar-header">
                <FileCheck style={{ width: 16, height: 16 }} />
                <strong>{activeTab === "rubrics" ? "AI Scoring Breakdown" : "Comments & Feedback"}</strong>
                <span className="DV-header-count">{activeTab === "rubrics" ? (rubric && Object.keys(rubric).filter(k => !["overallScore", "overallGrade"].includes(k)).length) || 0 : annotations.length}</span>
              </div>
              <div className="DV-topScoreStrip">
                <div className="DV-rubricScore">
                  <small>AI Score</small>
                  <strong>{rubric?.overallScore ?? overallScore}{rubric ? "" : "%"}</strong>
                  <span>{(rubric?.overallScore ?? overallScore) >= 85 ? "Excellent" : (rubric?.overallScore ?? overallScore) >= 70 ? "Good" : (rubric?.overallScore ?? overallScore) >= 50 ? "Could Improve" : "Needs Work"}</span>
                </div>
                <button type="button" className="DV-supplementalLink" onClick={() => setActiveTab(activeTab === "rubrics" ? "comments" : "rubrics")}>
                  {activeTab === "rubrics" ? "← Back to comment" : "View AI Scoring →"}
                </button>
              </div>
              <div className="DV-navigation" ref={commentScrollRef}>
                {summary && (
                  <div className="DV-description">
                    <strong>AI Review Summary</strong>
                    <p>{summary}</p>
                  </div>
                )}
                {annotations.length === 0 ? (
                  <div className="DV-noAnnotations">
                    <CheckCircle2 style={{ width: 28, height: 28, color: "var(--emerald)", margin: "0 auto 6px" }} />
                    <strong>No issues found!</strong>
                    <p>Strong KSSR alignment detected.</p>
                  </div>
                ) : (
                  annotations.map((ann, idx) => (
                    <div
                      key={idx}
                      id={`comment-card-${idx}`}
                      className={`comment-card ${ann.severity || "medium"} ${idx === activeIndex ? "active" : ""} ${idx === hoveredIndex ? "hovered" : ""}`}
                      onClick={() => {
                        const next = idx === activeIndex ? null : idx;
                        setActiveIndex(next);
                        if (next !== null) scrollToHighlight(next);
                      }}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <strong style={{ color: "var(--foreground)", fontSize: "0.86rem" }}>{ann.issue || ann.category || "Pedagogy Note"}</strong>
                        <span className={`badge ${ann.severity === "high" ? "rose" : "amber"}`} style={{ textTransform: "uppercase", fontSize: "0.64rem", flexShrink: 0 }}>{ann.severity || "medium"}</span>
                      </div>
                      {ann.text && <div style={{ padding: "5px 8px", background: "color-mix(in srgb, var(--primary) 8%, transparent)", borderRadius: 6, fontSize: "0.8rem", fontStyle: "italic", color: "var(--muted)", margin: "6px 0" }}>"{ann.text}"</div>}
                      {ann.explanation && <p style={{ fontSize: "0.82rem", color: "var(--muted)", margin: "4px 0", lineHeight: 1.5 }}>{ann.explanation}</p>}
                      {ann.suggestion && (
                        <div style={{ marginTop: 6, padding: "8px 10px", background: "color-mix(in srgb, var(--emerald) 8%, transparent)", borderRadius: 8, border: "1px solid color-mix(in srgb, var(--emerald) 25%, transparent)" }}>
                          <strong style={{ fontSize: "0.74rem", color: "var(--emerald)", display: "block", marginBottom: 2 }}>Suggested Remedy</strong>
                          <span style={{ fontSize: "0.8rem", color: "var(--foreground)" }}>{ann.suggestion}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* === RIGHT: DOCUMENT === */}
            <div className="DV-pageCollection">
              {activeTab === "rubrics" ? (
                <div className="DV-rubricPanel">
                  <h2>Evaluation Rubric</h2>
                  <div className="rubric-score-card">
                    <small>Overall Score</small>
                    <strong>{rubric?.overallScore ?? overallScore}{rubric ? "/100" : "%"}</strong>
                    <span style={{ fontSize: "0.82rem", opacity: 0.8 }}>{(() => { const s = rubric?.overallScore ?? overallScore; if (s >= 85) return "Excellent"; if (s >= 70) return "Good"; if (s >= 50) return "Could Improve"; return "Needs Work"; })()}</span>
                  </div>
                  <div className="rubric-list">
                    {rubric && Object.entries(rubric).filter(([k]) => !["overallScore", "overallGrade"].includes(k)).map(([key, val]) => {
                      const pct = Math.round((val.score / val.maxScore) * 100);
                      const statusColors = { excellent: "var(--emerald)", good: "var(--primary)", could_improve: "var(--amber)", needs_work: "var(--rose)" };
                      const labels = { curriculumAlignment: "Curriculum Alignment", learningObjectives: "Learning Objectives (SMART)", lessonFlow: "Lesson Flow", activities: "Activity Quality", pak21: "PAK-21 (21st Century)", kbatHots: "KBAT / HOTS", assessment: "Assessment Alignment", differentiation: "Differentiation", teachingAids: "Teaching Aids (BBM)", language: "Language Quality", reflection: "Reflection Quality", classroomManagement: "Classroom Management", inclusivity: "Inclusivity", timing: "Timing" };
                      return (
                        <div className="rubric-item" key={key}>
                          <div><span>{labels[key] || key}</span><span style={{ color: statusColors[val.status] || "var(--muted)" }}>{val.score}/{val.maxScore}</span></div>
                          <div className="rubric-bar"><span style={{ width: `${pct}%`, background: statusColors[val.status] || "var(--primary)" }} /></div>
                          {val.note && <small style={{ fontSize: "0.72rem", color: "var(--muted)", display: "block", marginTop: 2 }}>{val.note}</small>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="DV-documentContainer" style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
                  {docView === "text"
                    ? <TextViewer text={evaluatedText} annotations={effectiveAnnotations} activeIndex={activeIndex} setActiveIndex={(idx) => { setActiveIndex(idx); scrollToComment(idx); }} hoveredIndex={hoveredIndex} setHoveredIndex={setHoveredIndex} />
                    : fileDataUrl && fileType === "application/pdf"
                      ? <PdfViewer dataUrl={fileDataUrl} annotations={effectiveAnnotations} activeIndex={activeIndex} setActiveIndex={(idx) => { setActiveIndex(idx); scrollToComment(idx); }} hoveredIndex={hoveredIndex} setHoveredIndex={setHoveredIndex} />
                      : fileDataUrl && fileType && fileType.startsWith("image/")
                        ? <div className="document-page"><img src={fileDataUrl} alt="Document" style={{ width: "100%", height: "auto" }} /></div>
                        : fileDataUrl
                          ? <DocxViewer dataUrl={fileDataUrl} annotations={effectiveAnnotations} activeIndex={activeIndex} setActiveIndex={(idx) => { setActiveIndex(idx); scrollToComment(idx); }} hoveredIndex={hoveredIndex} setHoveredIndex={setHoveredIndex} zoom={zoomLevel / 100} />
                          : <TextViewer text={evaluatedText} annotations={effectiveAnnotations} activeIndex={activeIndex} setActiveIndex={(idx) => { setActiveIndex(idx); scrollToComment(idx); }} hoveredIndex={hoveredIndex} setHoveredIndex={setHoveredIndex} />}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
