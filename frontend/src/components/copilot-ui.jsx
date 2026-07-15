import React, { useState, useEffect } from "react";
import { cleanAiDisplayText } from "../lib/lesson.js";

function renderInlineTokens(line) {
  if (!line) return line;
  const tokens = [];
  let remaining = String(line);
  let key = 0;
  const patterns = [
    { regex: /^\*\*(.+?)\*\*/, render: (m) => <strong key={`b-${key++}`} style={{ fontWeight: 800, color: "var(--primary)" }}>{m[1]}</strong> },
    { regex: /^\*(.+?)\*/, render: (m) => <em key={`i-${key++}`} style={{ color: "var(--foreground)" }}>{m[1]}</em> },
    { regex: /^`(.+?)`/, render: (m) => <code key={`c-${key++}`} className="copilot-inline-code">{m[1]}</code> },
  ];
  while (remaining.length > 0) {
    let matched = false;
    for (const { regex, render } of patterns) {
      const m = remaining.match(regex);
      if (m) {
        tokens.push(render(m));
        remaining = remaining.slice(m[0].length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      const next = remaining.search(/(\*\*|\*|`)/);
      if (next === -1) {
        tokens.push(<span key={`t-${key++}`}>{remaining}</span>);
        remaining = "";
      } else if (next === 0) {
        tokens.push(<span key={`t-${key++}`}>{remaining[0]}</span>);
        remaining = remaining.slice(1);
      } else {
        tokens.push(<span key={`t-${key++}`}>{remaining.slice(0, next)}</span>);
        remaining = remaining.slice(next);
      }
    }
  }
  return tokens;
}

function renderMarkdown(text) {
  if (!text) return text;
  const lines = String(text).split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Markdown Tables: starts with '|' and has another '|'
    if (trimmed.startsWith("|") && trimmed.includes("|", 1)) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      // Filter out separator lines (|---|---|)
      const dataRows = tableLines
        .filter((r) => !/^\|[:\-\s|]+\|$/.test(r) && r.replace(/[\s|:\-]/g, "").length > 0)
        .map((r) => r.split("|").slice(1, -1).map((cell) => cell.trim()));

      if (dataRows.length > 0) {
        const headers = dataRows[0];
        const bodyRows = dataRows.slice(1);
        blocks.push(
          <div key={`tbl-${i}`} className="copilot-ui-table-card">
            <table className="copilot-ui-table">
              <thead>
                <tr>{headers.map((h, cIdx) => <th key={cIdx}>{renderInlineTokens(h)}</th>)}</tr>
              </thead>
              {bodyRows.length > 0 && (
                <tbody>
                  {bodyRows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cell, cIdx) => <td key={cIdx}>{renderInlineTokens(cell)}</td>)}
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        );
        continue;
      }
    }

    // 2. Headings (#, ##, ###)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      if (level === 1) {
        blocks.push(<h2 key={`h-${i}`} className="copilot-ui-h2">{renderInlineTokens(content)}</h2>);
      } else if (level === 2) {
        blocks.push(<h3 key={`h-${i}`} className="copilot-ui-h3">{renderInlineTokens(content)}</h3>);
      } else {
        blocks.push(<h4 key={`h-${i}`} className="copilot-ui-h4">{renderInlineTokens(content)}</h4>);
      }
      i++;
      continue;
    }

    // 3. Horizontal Rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      blocks.push(<hr key={`hr-${i}`} className="copilot-ui-hr" />);
      i++;
      continue;
    }

    // 4. Bullet list items
    const bulletMatch = trimmed.match(/^[-*+]\s+(.+)/);
    if (bulletMatch) {
      blocks.push(
        <div key={`li-${i}`} className="copilot-ui-list-item">
          <span className="copilot-ui-bullet">✦</span>
          <span className="copilot-ui-list-text">{renderInlineTokens(bulletMatch[1])}</span>
        </div>
      );
      i++;
      continue;
    }

    // 5. Numbered list items
    const numMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (numMatch) {
      blocks.push(
        <div key={`nli-${i}`} className="copilot-ui-list-item">
          <span className="copilot-ui-num">{numMatch[1]}.</span>
          <span className="copilot-ui-list-text">{renderInlineTokens(numMatch[2])}</span>
        </div>
      );
      i++;
      continue;
    }

    // 6. Empty line
    if (trimmed === "") {
      blocks.push(<div key={`sp-${i}`} style={{ height: "6px" }} />);
      i++;
      continue;
    }

    blocks.push(<div key={`p-${i}`} className="copilot-ui-p">{renderInlineTokens(line)}</div>);
    i++;
  }

  return <div className="copilot-ui-blocks">{blocks}</div>;
}


// Reveals text progressively like ChatGPT. Reveals a few characters per tick
// (faster than one-char-at-a-time so long replies don't feel sluggish), and
// calls onDone when the full text is shown so action buttons can appear after.
function TypewriterText({ text, onDone }) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    setShown("");
    if (!text) {
      onDone?.();
      return;
    }
    let i = 0;
    // Reveal ~2-3 chars per tick at ~18ms intervals — fast enough for long
    // replies to finish in a few seconds, slow enough to feel like streaming.
    const tick = () => {
      const chunk = Math.random() < 0.7 ? 2 : 3;
      i = Math.min(i + chunk, text.length);
      setShown(text.slice(0, i));
      if (i < text.length) {
        timer = setTimeout(tick, 18);
      } else {
        onDone?.();
      }
    };
    let timer = setTimeout(tick, 18);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  // If the partial text has an unclosed ** or *, close it so renderMarkdown
  // doesn't leave literal asterisks visible mid-stream.
  let safeShown = shown;
  const boldOpens = (safeShown.match(/\*\*/g) || []).length;
  if (boldOpens % 2 !== 0) safeShown += "**";
  const italicOpens = (safeShown.match(/(?<!\*)\*(?!\*)/g) || []).length;
  if (italicOpens % 2 !== 0) safeShown += "*";
  return <>{renderMarkdown(safeShown)}<span className="copilot-cursor" style={{ display: shown.length < (text || "").length ? "inline" : "none", opacity: 0.5, animation: "copilotBlink 0.8s infinite" }}>▋</span></>;
}

// Skeleton loading state shown while the copilot is "thinking". The status
// lines are chosen based on what the teacher actually asked, so each question
// shows contextually relevant "thinking" steps — not the same sequence every time.
function CopilotThinking({ question = "" }) {
  const q = question.toLowerCase();

  // Build a context-specific step sequence based on keywords in the question.
  const has = (...kws) => kws.some((kw) => q.includes(kw));
  const plans = has("plan", "lesson", "rph", "teach", "topic", "skill");
  const pupils = has("pupil", "student", "support", "intervention", "help", "weak", "struggl");
  const pbd = has("pbd", "assess", "tp", "evidence", "record", "score", "progress");
  const timetable = has("schedule", "timetable", "period", "time slot", "weekly");
  const classes = has("class", "roster", "year");
  const materials = has("material", "resource", "upload", "worksheet");

  const steps = [];
  // Always start with acknowledging the question itself.
  if (has("what can", "help", "how", "suggest", "recommend")) {
    steps.push("Understanding what you need…");
  } else {
    steps.push("Reading your question…");
  }

  // Add the relevant context-reading steps in a topic-driven order.
  if (pupils) steps.push("Checking pupil rosters and proficiency…");
  if (pbd) steps.push("Reviewing PBD assessment records…");
  if (plans) steps.push("Looking at your lesson plans…");
  if (classes) steps.push("Checking your class profiles…");
  if (timetable) steps.push("Reading your weekly timetable…");
  if (materials) steps.push("Scanning uploaded materials…");
  if (has("analytic", "insight", "mastery", "average", "data")) steps.push("Crunching your analytics data…");

  // If nothing topic-specific matched, fall back to a short general sequence.
  if (steps.length <= 1) {
    steps.push("Scanning your workspace data…", "Gathering context…");
  }

  // Always end with composing.
  steps.push("Composing your answer…");

  // Cap at 6 steps so the cycling doesn't drag on long AI responses.
  const finalSteps = steps.slice(0, 6);
  const [stepIndex, setStepIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, finalSteps.length - 1));
    }, 1200);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question]);
  return (
    <div style={{ alignSelf: "flex-start", maxWidth: "88%", display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="copilot-msg assistant" style={{ padding: "10px 14px", borderRadius: "14px 14px 14px 4px", background: "var(--bg-subtle)", fontSize: "0.875rem", lineHeight: 1.5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span className="copilot-typing" style={{ display: "inline-flex", gap: 3, flexShrink: 0 }}>
            <i style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary)", animation: "copilotBlink 1.2s infinite", opacity: 0.4 }} />
            <i style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary)", animation: "copilotBlink 1.2s infinite 0.2s", opacity: 0.4 }} />
            <i style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary)", animation: "copilotBlink 1.2s infinite 0.4s", opacity: 0.4 }} />
          </span>
          <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted)" }}>{finalSteps[stepIndex]}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <div className="copilot-skeleton-bar" style={{ height: 9, width: "92%", borderRadius: 4, background: "color-mix(in srgb, var(--muted) 18%, transparent)", animation: "copilotShimmer 1.6s infinite" }} />
          <div className="copilot-skeleton-bar" style={{ height: 9, width: "78%", borderRadius: 4, background: "color-mix(in srgb, var(--muted) 18%, transparent)", animation: "copilotShimmer 1.6s infinite 0.15s" }} />
          <div className="copilot-skeleton-bar" style={{ height: 9, width: "85%", borderRadius: 4, background: "color-mix(in srgb, var(--muted) 18%, transparent)", animation: "copilotShimmer 1.6s infinite 0.3s" }} />
        </div>
      </div>
    </div>
  );
}

export { renderInlineTokens, renderMarkdown, TypewriterText, CopilotThinking, cleanAiDisplayText };
