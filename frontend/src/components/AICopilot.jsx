import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  FileCheck,
  FolderOpen,
  RefreshCw,
  Send,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { apiPost } from "../services/api.js";
import { useAppStore } from "../state/useAppStore.js";
import { pageIdToPath } from "../lib/nav.js";
import { extractLessonFormFromText } from "../lib/lesson.js";
import { TypewriterText, CopilotThinking, renderMarkdown } from "./copilot-ui.jsx";

function AICopilot({ open }) {
  const navigate = useNavigate();

  // Pull state + actions from the global store so the chat survives navigation.
  const setOpen = useAppStore((s) => s.setCopilotOpen);
  const setCopilotFormDraft = useAppStore((s) => s.setCopilotFormDraft);
  const classes = useAppStore((s) => s.classes);

  // Copilot messages now live in the persisted store (survives refresh + nav).
  const messages = useAppStore((s) => s.copilotMessages);
  const setCopilotMessages = useAppStore((s) => s.setCopilotMessages);

  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [fallbackNoticed, setFallbackNoticed] = useState(false);
  const [typingDone, setTypingDone] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const scrollRef = useRef(null);

  // Auto-scroll to the latest message when the transcript changes or while typing.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy, typingDone]);

  // Keep scrolling during the typewriter animation so the latest text stays in view.
  useEffect(() => {
    if (typingDone) return;
    const timer = setInterval(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 50);
    return () => clearInterval(timer);
  }, [typingDone]);

  const ask = async () => {
    const text = prompt.trim();
    if (!text || busy) return;
    setBusy(true);
    setTypingDone(false);
    setCurrentQuestion(text);
    setPrompt("");
    setCopilotMessages((prev) => [...prev, { role: "user", text }]);
    try {
      const result = await apiPost("/copilot/ask", { question: text });
      setCopilotMessages((prev) => [...prev, { role: "assistant", text: result.reply || "I couldn't generate a response.", actions: result.actions || [], question: text }]);
      setFallbackNoticed(Boolean(result.aiSource?.fallbackTriggered));
    } catch (err) {
      setCopilotMessages((prev) => [...prev, { role: "assistant", text: `Sorry, I couldn't reach the AI service: ${err.message || "unknown error"}. Please try again.`, actions: [] }]);
      setTypingDone(true);
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      ask();
    }
  };

  const suggestions = [
    "Explain present continuous tense with examples",
    "Fun 5-minute English icebreaker game",
    "What should I teach next for Year 5?",
  ];

  // Navigate via the router instead of setActivePage(pageId).
  const goToPage = (pageId) => {
    navigate(pageIdToPath(pageId));
    setOpen(false);
  };

  return (
    <aside className={`copilot ${open ? "open" : ""}`}>
      <div className="copilot-head">
        <div><p className="eyebrow">ESLessonCraft AI</p><h2>Copilot</h2></div>
        <button className="icon-btn" onClick={() => setOpen(false)}><X /></button>
      </div>
      <div className="copilot-body">
        <div className="copilot-transcript" ref={scrollRef} style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", maxHeight: "calc(100vh - 320px)", minHeight: 120, paddingRight: 4 }}>
          {messages.map((message, index) => {
            const actionIcons = { Sparkles, Users, ClipboardCheck, CalendarDays, BarChart3, FileCheck, FolderOpen };
            const isLatestAssistant = message.role === "assistant" && index === messages.length - 1 && !typingDone;
            const hasExistingLessonAction = message.actions && message.actions.some((a) => a.pageId === "lesson-planner");
            const showActions = message.role === "assistant" && ((message.actions && message.actions.length > 0) || (message.text && (message.text.toLowerCase().includes("step ") || message.text.toLowerCase().includes("stage ") || message.text.toLowerCase().includes("lesson") || message.text.toLowerCase().includes("rph") || message.text.toLowerCase().includes("pbd")) && !hasExistingLessonAction)) && !isLatestAssistant;
            return (
              <div key={index} style={{ alignSelf: message.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%", display: "flex", flexDirection: "column", gap: 6 }}>
                <div className={`copilot-msg ${message.role}`} style={{
                  padding: "10px 14px",
                  borderRadius: message.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: message.role === "user" ? "var(--primary)" : "var(--bg-subtle)",
                  color: message.role === "user" ? "#ffffff" : "var(--foreground)",
                  fontSize: "0.875rem",
                  lineHeight: 1.5,
                  whiteSpace: message.role === "assistant" ? "pre-line" : "pre-wrap",
                  wordBreak: "break-word",
                }}>
                  {isLatestAssistant
                    ? <TypewriterText text={message.text} onDone={() => setTypingDone(true)} />
                    : renderMarkdown(message.text)}
                </div>
                {showActions && (
                  <div className="copilot-actions" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {message.actions && message.actions.map((action) => {
                      const Icon = actionIcons[action.icon] || Sparkles;
                      return (
                        <button key={action.pageId} type="button" className="copilot-action-btn" onClick={() => {
                          if (action.pageId === "lesson-planner" && setCopilotFormDraft) {
                            const fillData = (action.formData && Object.keys(action.formData).length > 0)
                              ? action.formData
                              : extractLessonFormFromText(message.text, classes, message.question || currentQuestion);
                            setCopilotFormDraft(fillData);
                          }
                          goToPage(action.pageId);
                        }} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.75rem", fontWeight: 700, padding: "5px 11px", borderRadius: 16, border: "1px solid var(--primary)", background: "var(--primary)", color: "#ffffff", cursor: "pointer", whiteSpace: "nowrap" }}>
                          <Icon width={13} height={13} /> {action.label}
                        </button>
                      );
                    })}
                    {!hasExistingLessonAction && message.text && (message.text.toLowerCase().includes("step ") || message.text.toLowerCase().includes("stage ") || message.text.toLowerCase().includes("lesson") || message.text.toLowerCase().includes("rph") || message.text.toLowerCase().includes("pbd")) && (
                      <button type="button" className="copilot-action-btn" onClick={() => {
                        if (setCopilotFormDraft) {
                          const fillData = extractLessonFormFromText(message.text, classes, message.question || currentQuestion);
                          setCopilotFormDraft(fillData);
                        }
                        goToPage("lesson-planner");
                      }} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.75rem", fontWeight: 700, padding: "5px 11px", borderRadius: 16, border: "1px solid var(--primary)", background: "var(--primary)", color: "#ffffff", cursor: "pointer", whiteSpace: "nowrap" }}>
                        <Sparkles width={13} height={13} /> Fill Lesson Form with AI
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {busy && <CopilotThinking question={currentQuestion} />}
        </div>
        {fallbackNoticed && !busy && (
          <p className="copilot-fallback-note" style={{ fontSize: "0.72rem", color: "var(--muted)", margin: "4px 0", display: "flex", gap: 6, alignItems: "center" }}>
            <AlertTriangle width={12} height={12} /> AI was unavailable — showing a workspace-based answer.
          </p>
        )}
        {messages.length <= 1 && !busy && (
          <div className="copilot-suggestions" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {suggestions.map((suggestion) => (
              <button key={suggestion} type="button" className="copilot-chip" onClick={() => { setPrompt(suggestion); }} style={{ fontSize: "0.75rem", padding: "5px 10px", borderRadius: 16, border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--foreground)", cursor: "pointer", fontWeight: 600 }}>
                {suggestion}
              </button>
            ))}
          </div>
        )}
        <div className="copilot-input-row" style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea rows="2" value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={handleKeyDown} placeholder="Ask about your classes, lessons, pupils…" disabled={busy} style={{ flex: 1, resize: "none", fontSize: "0.875rem", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--foreground)" }} />
          <button className="primary-btn" onClick={ask} disabled={busy || !prompt.trim()} style={{ flexShrink: 0, padding: "10px 16px", gap: 6 }}>{busy ? <RefreshCw /> : <Send />} <span>{busy ? "Sending…" : "Send"}</span></button>
        </div>
      </div>
    </aside>
  );
}

export default AICopilot;
