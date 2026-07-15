import React, { useState, useEffect } from "react";
import { buildAnnotatedSegments, StringifyRemarks } from "../lib/lesson.js";

// ===========================================================================
// KPM RPH DOCUMENT VIEWER — renders the lesson plan as a structured table
// matching the official Malaysian KPM lesson plan template, with annotation
// highlights and hover comment popovers overlaid on the document.
// ===========================================================================

// A hover popover that shows the annotation comment when the teacher hovers
// over or clicks a highlighted phrase — like Google Docs inline comments.
export function HoverComment({ ann, index, active, onClick, children }) {
  const [hovered, setHovered] = useState(false);
  const show = hovered || active;
  return (
    <span
      style={{ position: "relative", display: "inline" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <mark
        className={`highlight ${ann.severity || "medium"} ${active ? "active" : ""}`}
        onClick={onClick}
      >
        {children}
      </mark>
      {show && (
        <div
          className="comment-popover"
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: 0,
            zIndex: 100,
            width: 320,
            maxWidth: "calc(100vw - 80px)",
            padding: "14px 16px",
            borderRadius: 12,
            background: "color-mix(in srgb, var(--card) 82%, transparent)",
            border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)",
            boxShadow: "0 8px 28px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
            backdropFilter: "blur(14px)",
            fontSize: "0.82rem",
            lineHeight: 1.5,
            color: "var(--foreground)",
            pointerEvents: "none",
          }}
        >
          {ann.severity && (
            <span
              className={`badge ${ann.severity === "high" ? "rose" : "amber"}`}
              style={{ position: "absolute", top: 10, right: 12, textTransform: "uppercase", fontSize: "0.62rem", fontWeight: 800, padding: "2px 7px", borderRadius: 8 }}
            >
              {ann.severity}
            </span>
          )}
          {ann.issue && <strong style={{ display: "block", marginBottom: 4, paddingRight: ann.severity ? 50 : 0, fontSize: "0.85rem" }}>{ann.issue}</strong>}
          {ann.text && <div style={{ padding: "5px 8px", background: "color-mix(in srgb, var(--primary) 8%, transparent)", borderRadius: 6, marginBottom: 6, fontStyle: "italic", color: "var(--muted)" }}>"{ann.text}"</div>}
          {ann.explanation && <p style={{ margin: "0 0 8px" }}>{ann.explanation}</p>}
          {ann.suggestion && (
            <div style={{ padding: "8px 10px", background: "color-mix(in srgb, var(--emerald) 10%, transparent)", borderRadius: 8, border: "1px solid color-mix(in srgb, var(--emerald) 30%, transparent)" }}>
              <strong style={{ fontSize: "0.76rem", color: "var(--emerald)", display: "block", marginBottom: 2 }}>Suggested Remedy</strong>
              <span>{ann.suggestion}</span>
            </div>
          )}
          <div
            style={{
              position: "absolute",
              bottom: -7,
              left: 16,
              width: 12,
              height: 12,
              background: "var(--card)",
              borderRight: "1px solid var(--border)",
              borderBottom: "1px solid var(--border)",
              transform: "rotate(45deg)",
            }}
          />
        </div>
      )}
    </span>
  );
}

// Render a text string with annotation highlights + hover comment popovers interspersed.
export function AnnotatedText({ text, annotations, activeIndex, setActiveIndex }) {
  const segments = buildAnnotatedSegments(text, annotations);

  // Check if the text itself contains a highlight phrase (inline match).
  const hasInlineMatch = segments.some((s) => s.type === "mark");
  if (!hasInlineMatch) {
    // The text doesn't contain any of the annotation phrases — render as plain text.
    return <span>{text}</span>;
  }

  return (
    <span>
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          return <span key={`seg-${i}`}>{seg.content}</span>;
        }

        return (
          <HoverComment
            key={`ann-${i}`}
            ann={seg.ann}
            index={seg.index}
            active={seg.index === activeIndex}
            onClick={() => setActiveIndex(seg.index === activeIndex ? null : seg.index)}
          >
            {seg.content}
          </HoverComment>
        );
      })}
    </span>
  );
}

// The official KPM RPH table structured document viewer.
// Renders the lesson plan result as a two-column table form that mirrors the
// DOCX template, with annotation highlights overlaid on matching text.
export function KpmLessonDocument({ result, annotations = [], activeIndex, setActiveIndex }) {
  // The fields from the lesson result, matching the KPM template structure.
  const d = result?.lessonDetails || {};
  const objectives = result?.objectives || [];
  const successCriteria = result?.successCriteria || [];
  const procedure = result?.procedure || [];
  const steps = result?.steps || [];
  const assessment = result?.assessment || [];
  const differentiation = result?.differentiation || [];

  const anns = annotations;
  // Helper: find annotations whose text appears in a given value.
  const findAnns = (value) => {
    if (!value || !anns.length) return [];
    const matches = anns.filter((a) => a.text && String(value).toLowerCase().includes(a.text.toLowerCase()));
    return matches;
  };

  // Check if any annotation text appears in a given string field.
  const hasAnns = (value) => findAnns(value).length > 0;

  // Determine the big RPH fields to render.
  const fullText = [
    d.subject, d.year, d.topic, d.skill, result?.title,
    ...objectives, ...successCriteria, ...steps, ...assessment, ...differentiation,
    ...(procedure.map(p => [p.teacherActivities, p.pupilActivities, p.lessonContent]).flat()),
  ].filter(Boolean).join(" ");

  const tableCellStyle = { padding: "8px 12px", borderBottom: "1px solid #e2e8f0", fontSize: "0.86rem", lineHeight: 1.5 };
  const labelStyle = { ...tableCellStyle, fontWeight: 700, color: "var(--foreground)", background: "rgba(0,0,0,0.02)", whiteSpace: "nowrap", verticalAlign: "top" };
  const headerStyle = { ...tableCellStyle, fontWeight: 800, textTransform: "uppercase", fontSize: "0.72rem", letterSpacing: "0.05em", background: "rgba(0,0,0,0.04)", textAlign: "center" };
  const stageHeaderStyle = { ...tableCellStyle, fontWeight: 700, background: "color-mix(in srgb, var(--primary) 6%, transparent)", color: "var(--primary)", textTransform: "uppercase", fontSize: "0.76rem", letterSpacing: "0.04em" };

  return (
    <div className="rph-document">
      {/* Document header */}
      <div className="rph-doc-header" style={{ textAlign: "center", marginBottom: 20, paddingBottom: 16, borderBottom: "2px solid #2d2d34" }}>
        <h1 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>{result?.title || "English RPH"}</h1>
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 4 }}>{d.subject || "English"} · {d.year || ""} · {d.className || ""}</p>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {/* === LESSON DETAILS SECTION === */}
          <tr><td colSpan={2} style={headerStyle}>Lesson Details</td></tr>
          <tr><td style={labelStyle}>Subject</td><td style={tableCellStyle}><AnnotatedText text={d.subject || "English"} annotations={anns} activeIndex={activeIndex} setActiveIndex={setActiveIndex} /></td></tr>
          <tr><td style={labelStyle}>Year</td><td style={tableCellStyle}>{d.year || "—"}</td></tr>
          <tr><td style={labelStyle}>Num. of Students</td><td style={tableCellStyle}>{d.numberOfStudents || "—"}</td></tr>
          <tr><td style={labelStyle}>Date</td><td style={tableCellStyle}>{d.date || "—"}</td></tr>
          <tr><td style={labelStyle}>Time</td><td style={tableCellStyle}>{d.startTime || "—"} {d.endTime ? `- ${d.endTime}` : ""}</td></tr>
          <tr><td style={labelStyle}>Theme & Topic</td><td style={tableCellStyle}><AnnotatedText text={d.topic || "—"} annotations={anns} activeIndex={activeIndex} setActiveIndex={setActiveIndex} /></td></tr>
          <tr><td style={labelStyle}>Skill / Focus</td><td style={tableCellStyle}>{d.skill || "—"}</td></tr>
          <tr><td style={labelStyle}>Prior Knowledge</td><td style={tableCellStyle}>{d.priorKnowledge || "—"}</td></tr>

          {/* === STANDARDS SECTION === */}
          <tr><td colSpan={2} style={headerStyle}>Content Standard (CS) · Learning Standard (LS) · Learning Outcome (LO)</td></tr>
          <tr>
            <td style={labelStyle}>Content Standard</td>
            <td style={tableCellStyle}><AnnotatedText text={result?.kssrAlignment?.contentStandard || "—"} annotations={anns} activeIndex={activeIndex} setActiveIndex={setActiveIndex} /></td>
          </tr>
          <tr>
            <td style={labelStyle}>Learning Standard</td>
            <td style={tableCellStyle}><AnnotatedText text={result?.kssrAlignment?.learningStandard || "—"} annotations={anns} activeIndex={activeIndex} setActiveIndex={setActiveIndex} /></td>
          </tr>
          <tr>
            <td style={labelStyle}>Learning Outcome</td>
            <td style={tableCellStyle}><AnnotatedText text={result?.kssrAlignment?.learningOutcomes || result?.skillOutcome || "—"} annotations={anns} activeIndex={activeIndex} setActiveIndex={setActiveIndex} /></td>
          </tr>

          {/* === LEARNING OBJECTIVES === */}
          <tr><td colSpan={2} style={headerStyle}>Learning Objectives</td></tr>
          <tr><td colSpan={2} style={tableCellStyle}>
            <p style={{ marginBottom: 6, fontStyle: "italic", color: "var(--muted)", fontSize: "0.8rem" }}>By the end of the lesson, pupils should be able to:</p>
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              {objectives.map((obj, i) => <li key={i} style={{ marginBottom: 4 }}><AnnotatedText text={obj} annotations={anns} activeIndex={activeIndex} setActiveIndex={setActiveIndex} /></li>)}
            </ol>
          </td></tr>

          {/* === SUCCESS CRITERIA === */}
          {successCriteria.length > 0 && (
            <>
              <tr><td colSpan={2} style={headerStyle}>Success Criteria (SC)</td></tr>
              <tr><td colSpan={2} style={tableCellStyle}>
                <p style={{ marginBottom: 6, fontStyle: "italic", color: "var(--muted)", fontSize: "0.8rem" }}>I can:</p>
                <ol style={{ margin: 0, paddingLeft: 18 }}>
                  {successCriteria.map((sc, i) => <li key={i} style={{ marginBottom: 4 }}><AnnotatedText text={sc} annotations={anns} activeIndex={activeIndex} setActiveIndex={setActiveIndex} /></li>)}
                </ol>
              </td></tr>
            </>
          )}

          {/* === CBA & PEDAGOGY ELEMENTS === */}
          <tr><td colSpan={2} style={headerStyle}>Classroom Based Assessment & Pedagogy Elements</td></tr>
          <tr><td style={labelStyle}>CBA</td><td style={tableCellStyle}><AnnotatedText text={result?.classroomBasedAssessment || (assessment.join ? assessment.join("; ") : "—")} annotations={anns} activeIndex={activeIndex} setActiveIndex={setActiveIndex} /></td></tr>
          <tr><td style={labelStyle}>Instruments</td><td style={tableCellStyle}>{result?.instruments || "—"}</td></tr>
          <tr><td style={labelStyle}>Thinking Skills (TS)</td><td style={tableCellStyle}>{result?.thinkingSkills || "—"}</td></tr>
          <tr><td style={labelStyle}>Habits of Mind</td><td style={tableCellStyle}>{result?.habitsOfMind || "—"}</td></tr>
          <tr><td style={labelStyle}>HOTS</td><td style={tableCellStyle}>{result?.hots || "—"}</td></tr>
          <tr><td style={labelStyle}>Cross-Curricular (CCE)</td><td style={tableCellStyle}>{result?.crossCurricularElements || "—"}</td></tr>
          <tr><td style={labelStyle}>ICT</td><td style={tableCellStyle}>{result?.ict || "—"}</td></tr>
          <tr><td style={labelStyle}>T&LM</td><td style={tableCellStyle}>{d.materials || result?.instruments || "—"}</td></tr>
          <tr><td style={labelStyle}>Soft Skills (SS)</td><td style={tableCellStyle}>{result?.softSkills || "—"}</td></tr>
          <tr><td style={labelStyle}>21stCPP</td><td style={tableCellStyle}>{result?.twentyFirstCentury || "—"}</td></tr>
          <tr><td style={labelStyle}>Differentiation (DS)</td><td style={tableCellStyle}><AnnotatedText text={(differentiation.join ? differentiation.join("; ") : differentiation) || "—"} annotations={anns} activeIndex={activeIndex} setActiveIndex={setActiveIndex} /></td></tr>

          {/* === LESSON PROCEDURE TABLE === */}
          <tr><td colSpan={2} style={headerStyle}>Teaching & Learning Activities</td></tr>
          <tr>
            <td colSpan={2} style={{ padding: 0 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...stageHeaderStyle, width: "18%", textAlign: "left" }}>Steps & Minutes</th>
                    <th style={{ ...stageHeaderStyle, width: "30%", textAlign: "left" }}>Lesson Content</th>
                    <th style={{ ...stageHeaderStyle, width: "52%", textAlign: "left" }}>Teaching & Learning Activities</th>
                  </tr>
                </thead>
                <tbody>
                  {procedure.map((stage, i) => (
                    <tr key={i}>
                      <td style={{ ...tableCellStyle, verticalAlign: "top", fontWeight: 700 }}>
                        {stage.stage}<br /><span style={{ fontSize: "0.76rem", fontWeight: 400, color: "var(--muted)" }}>({stage.minutes || "—"} min)</span>
                      </td>
                      <td style={{ ...tableCellStyle, verticalAlign: "top" }}>
                        <AnnotatedText text={stage.lessonContent || "—"} annotations={anns} activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
                        {stage.remarks && <div style={{ marginTop: 6, padding: "6px 8px", background: "rgba(0,0,0,0.02)", borderRadius: 6, fontSize: "0.76rem", color: "var(--muted)" }}>{StringifyRemarks(stage.remarks)}</div>}
                      </td>
                      <td style={{ ...tableCellStyle, verticalAlign: "top" }}>
                        <div style={{ marginBottom: 4 }}><strong style={{ fontSize: "0.76rem", color: "var(--primary)" }}>Teacher:</strong> <AnnotatedText text={stage.teacherActivities || "—"} annotations={anns} activeIndex={activeIndex} setActiveIndex={setActiveIndex} /></div>
                        <div><strong style={{ fontSize: "0.76rem", color: "var(--emerald)" }}>Pupils:</strong> <AnnotatedText text={stage.pupilActivities || "—"} annotations={anns} activeIndex={activeIndex} setActiveIndex={setActiveIndex} /></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Reflection section (always present in the template) */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
        <tbody>
          <tr><td colSpan={2} style={headerStyle}>Teacher's Reflection</td></tr>
          <tr><td style={labelStyle}>Strength</td><td style={{ ...tableCellStyle, minHeight: 40 }}></td></tr>
          <tr><td style={labelStyle}>Weakness</td><td style={{ ...tableCellStyle, minHeight: 40 }}></td></tr>
          <tr><td style={labelStyle}>Suggestion</td><td style={{ ...tableCellStyle, minHeight: 40 }}></td></tr>
        </tbody>
      </table>
    </div>
  );
}

// Renders the lesson plan text as a structured document with proper headings,
// labels, and paragraphs — while preserving annotation highlight marks at the
// correct character positions. This makes the evaluation engine's "Document
// View" look like a real formatted RPH rather than a flat text blob.
export function formatDocumentSegment(segment, keyPrefix) {
  if (typeof segment === "string") {
    // Section header keywords — matched case-insensitively with or without a colon.
    // This handles both "Subject: English" and "SUBJECT English" (DOCX extraction format).
    const headerKeywords = "Subject|Class|Time|Topic|Skill Focus|Skill|Objectives|Procedure|Assessment|Materials|Success Criteria|Differentiation|Reflection|Theme|Date|Year|Content Standard|Learning Standard|Learning Outcome|Prior Knowledge|Pre Lesson|Stage I|Stage II|Stage III|Post Lesson|Closure|Set Induction|Presentation|Practice|Production";
    const headerRegex = new RegExp(`^(${headerKeywords})\\s*:?[\\s]+(.+)`, "i");
    // Also match a header line that is ONLY the keyword (e.g. "OBJECTIVES" alone on a line).
    const headerOnlyRegex = new RegExp(`^(${headerKeywords})\\s*:?$`, "i");

    const lines = segment.split("\n");
    return lines.map((line, lineIndex) => {
      if (!line.trim()) return <br key={`${keyPrefix}-br-${lineIndex}`} />;

      // Check if the line is a section header with a value (e.g. "Subject: English" or "SUBJECT English")
      const headerMatch = line.match(headerRegex);
      // Skip false positives like "1. Set Induction..." which start with a number
      if (headerMatch && !line.match(/^\d+\./)) {
        const label = headerMatch[1];
        const rest = headerMatch[2];
        return (
          <div key={`${keyPrefix}-h-${lineIndex}`} className="doc-section-header" style={{ marginTop: lineIndex > 0 ? 14 : 0, marginBottom: 4 }}>
            <strong style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</strong>
            <span style={{ fontWeight: 400, marginLeft: 8 }}>{rest.trim()}</span>
          </div>
        );
      }

      // Check if the line is a section header only (e.g. "OBJECTIVES" on its own line)
      if (headerOnlyRegex.test(line.trim()) && !line.match(/^\d+\./)) {
        const label = line.trim().replace(/:$/, "");
        return (
          <div key={`${keyPrefix}-ho-${lineIndex}`} className="doc-section-header" style={{ marginTop: lineIndex > 0 ? 14 : 0, marginBottom: 4 }}>
            <strong style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</strong>
          </div>
        );
      }

      // Check if the line is a numbered step (e.g. "1. Set Induction (5 mins): ...")
      const stepMatch = line.match(/^(\d+)\.\s+(.+)/);
      if (stepMatch) {
        return (
          <div key={`${keyPrefix}-step-${lineIndex}`} className="doc-step" style={{ marginLeft: 8, marginBottom: 8, paddingLeft: 0 }}>
            <span style={{ fontWeight: 800, color: "var(--primary)" }}>{stepMatch[1]}.</span> {stepMatch[2]}
          </div>
        );
      }
      // Check if the line is a bullet point
      const bulletMatch = line.match(/^[•\-\*]\s+(.+)/);
      if (bulletMatch) {
        return (
          <div key={`${keyPrefix}-bullet-${lineIndex}`} style={{ marginLeft: 12, marginBottom: 4, display: "flex", gap: 6 }}>
            <span style={{ color: "var(--primary)", flexShrink: 0 }}>•</span>
            <span>{bulletMatch[1]}</span>
          </div>
        );
      }
      // Regular paragraph line
      return <p key={`${keyPrefix}-p-${lineIndex}`} style={{ margin: "0 0 6px", lineHeight: 1.6 }}>{line}</p>;
    });
  }
  // If it's already a React element (a <mark> highlight), just return it.
  return segment;
}

export function renderAnnotatedContent(text, annotations, activeIndex, setActiveIndex) {
  if (!text) return null;

  // If no annotations, just format the document.
  if (!annotations || !annotations.length) {
    return formatDocumentSegment(text, "doc");
  }

  // First, compute the annotation highlight ranges as before.
  const ranges = [];
  const lowerText = text.toLowerCase();

  annotations.forEach((ann, index) => {
    if (!ann.text || typeof ann.text !== "string") return;
    const lowerQuery = ann.text.toLowerCase();
    let pos = 0;
    while ((pos = lowerText.indexOf(lowerQuery, pos)) !== -1) {
      const start = pos;
      const end = pos + ann.text.length;
      const overlaps = ranges.some((r) => !(end <= r.start || start >= r.end));
      if (!overlaps) {
        ranges.push({ start, end, ann, index });
        break;
      }
      pos = end;
    }
  });

  if (!ranges.length) {
    return formatDocumentSegment(text, "doc");
  }

  ranges.sort((a, b) => a.start - b.start);

  // Build a mixed array of text segments (strings) and highlight marks (React
  // elements). Each segment preserves its position in the original text so we
  // can format the text portions while keeping highlights inline.
  const parts = [];
  let lastIndex = 0;

  ranges.forEach((range, i) => {
    if (range.start > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, range.start) });
    }
    parts.push({
      type: "mark",
      content: text.slice(range.start, range.end),
      ann: range.ann,
      index: range.index,
    });
    lastIndex = range.end;
  });

  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.slice(lastIndex) });
  }

  // Now render: format text segments as document structure, keep marks inline.
  // We join adjacent formatted segments and marks so they flow together.
  const rendered = [];
  let textBuffer = "";

  parts.forEach((part, i) => {
    if (part.type === "text") {
      textBuffer += part.content;
    } else {
      // Flush the accumulated text buffer as formatted document content.
      if (textBuffer) {
        rendered.push(...formatDocumentSegment(textBuffer, `seg-${rendered.length}`));
        textBuffer = "";
      }
      // Render the highlight with a hover popover showing the annotation.
      rendered.push(
        <HoverComment
          key={`ann-${part.index}-${i}`}
          ann={part.ann}
          index={part.index}
          active={part.index === activeIndex}
          onClick={() => setActiveIndex(part.index === activeIndex ? null : part.index)}
        >
          {part.content}
        </HoverComment>
      );
    }
  });

  // Flush any remaining text.
  if (textBuffer) {
    rendered.push(...formatDocumentSegment(textBuffer, `seg-${rendered.length}`));
  }

  return rendered;
}

// =========================================================================
// SVG LINE CONNECTOR — draws a glowing line between hovered/active card & highlight
// =========================================================================
export function SvgLineConnector({ targetIdx, containerRef }) {
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    if (targetIdx === null || targetIdx === undefined || !containerRef?.current) {
      setCoords(null);
      return;
    }

    const updateCoords = () => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const cardEl = document.getElementById(`comment-card-${targetIdx}`);
      const markEl = document.querySelector(`mark[data-ann-idx="${targetIdx}"], .pdf-highlight[data-ann-idx="${targetIdx}"]`);

      if (!cardEl || !markEl) {
        setCoords(null);
        return;
      }

      const cardRect = cardEl.getBoundingClientRect();
      const markRect = markEl.getBoundingClientRect();

      if (markRect.bottom < containerRect.top - 24 || markRect.top > containerRect.bottom + 24) {
        setCoords(null);
        return;
      }

      const x1 = cardRect.right - containerRect.left;
      const y1 = cardRect.top + cardRect.height / 2 - containerRect.top;
      const rawX2 = markRect.left - containerRect.left;
      const x2 = Math.max(x1 + 24, rawX2);
      const y2 = markRect.top + markRect.height / 2 - containerRect.top;

      setCoords({ x1, y1, x2, y2 });
    };

    updateCoords();
    const interval = setInterval(updateCoords, 60);
    window.addEventListener("resize", updateCoords);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", updateCoords);
    };
  }, [targetIdx, containerRef]);

  if (!coords) return null;

  const { x1, y1, x2, y2 } = coords;
  const distX = Math.abs(x2 - x1);
  const dx = Math.max(20, Math.min(distX * 0.5, 120));
  const pathData = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 150,
        overflow: "visible",
      }}
    >
      <defs>
        <filter id="connector-glow-app" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <path
        d={pathData}
        stroke="var(--primary)"
        strokeWidth="4"
        strokeOpacity="0.3"
        fill="none"
        filter="url(#connector-glow-app)"
      />
      <path
        d={pathData}
        stroke="var(--primary)"
        strokeWidth="2.4"
        strokeDasharray="6,4"
        fill="none"
        style={{ animation: "dashFlow 1s linear infinite" }}
      />
      <circle cx={x1} cy={y1} r="4.5" fill="var(--primary)" />
      <circle cx={x2} cy={y2} r="4.5" fill="var(--primary)" />
    </svg>
  );
}

// Sample lesson text used as the default in EvaluatePage.
export const SAMPLE_EVAL_LESSON = `Subject: English Language
Class: 4 Bestari
Time: 8:00 AM - 9:00 AM
Topic: Unit 3 - In the Past
Skill Focus: Reading and Writing

Objectives:
By the end of the lesson, pupils will be able to:
1. Read the text about ancient Egypt and answer 4 recall questions accurately.
2. Write 3 sentences in simple past tense about what people did in the past.

Procedure:
1. Set Induction (5 mins): Teacher shows pictures of ancient pyramids and asks recall questions about where they are located. Teacher explains what pyramids are used for.
2. Presentation (15 mins): Teacher reads the text aloud to the class while pupils listen. Teacher explains the meanings of difficult vocabulary on the whiteboard.
3. Practice (20 mins): Teacher distributes a worksheet with comprehension questions. Pupils complete the worksheet individually at their desks.
4. Production (15 mins): Pupils write 3 past tense sentences based on the worksheet prompt. Teacher walks around to check answers.
5. Closure (5 mins): Teacher sums up the lesson and asks pupils if they enjoyed learning about Egypt.

Assessment:
Teacher checks the completed worksheet for accuracy.`;
