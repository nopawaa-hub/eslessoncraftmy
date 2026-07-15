import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ChevronLeft, ChevronRight, LayoutDashboard, Users, Wand2 } from "lucide-react";
import { pageIdToPath } from "../lib/nav.js";

const TUTORIAL_KEY = "lessoncraft-tutorial-seen";

const TOUR_INTRO = [
  {
    id: "welcome",
    title: "Welcome to LessonCraft MY 👋",
    body: "Your all-in-one ESL teaching workspace for the Malaysia classroom — lessons, PBD assessment, materials, analytics and an AI copilot.",
  },
  {
    id: "choice",
    title: "How would you like to get started?",
    body: "Pick a path and I'll walk you through the most effective way to begin. You can restart this tour any time from Settings → Take a tour.",
  },
];

const TOUR_DONE = {
  id: "done",
  title: "You're all set! 🎉",
  body: "That's the core flow. Open the AI Copilot anytime to draft lessons, extract forms, or ask anything. Happy teaching!",
};

const TUTORIAL_FLOWS = {
  class: [
    {
      id: "nav-classes",
      selector: '[data-tour="nav-classes"]',
      title: "Open Classes",
      body: "First, let's set up a class. Click Classes in the sidebar — your AI lesson-planning and PBD tracking flow from a roster.",
    },
    {
      id: "add-class",
      selector: ".page-toolbar .secondary-btn, .classes-toolbar .secondary-btn, .toolbar .secondary-btn",
      page: "classes",
      title: "Add a class",
      body: "Click Add class to open the roster form.",
    },
    {
      id: "class-form",
      selector: ".class-form, form .field",
      page: "classes",
      title: "Fill in the details",
      body: "Enter the class name, year, subject and pupil proficiency. This context powers your AI planning and analytics.",
    },
    {
      id: "save-class",
      selector: "button.primary-btn.full",
      page: "classes",
      title: "Save the roster",
      body: "Save to create the class. You can come back here any time to add pupils and edit details.",
    },
    {
      id: "plan-for-class",
      selector: ".page-toolbar .primary-btn",
      page: "classes",
      title: "Now plan a lesson",
      body: "With a class selected, Plan for class jumps straight into the Lesson Planner with context applied.",
    },
  ],
  planning: [
    {
      id: "open-planner",
      selector: '[data-tour="nav-lesson-planner"]',
      title: "Open the Lesson Planner",
      body: "Jump straight into lesson planning — Lesson Planner AI in the sidebar.",
    },
    {
      id: "planner-form",
      selector: ".lesson-form, form .field",
      page: "lesson-planner",
      title: "Describe your lesson",
      body: "Enter the topic and class details. Use the AI Quick Form Fill box if you want the Copilot to draft the fields for you.",
    },
    {
      id: "generate",
      selector: "button.primary-btn.full",
      page: "lesson-planner",
      title: "Generate with AI",
      body: "Tap Generate RPH with AI to produce your KSSR English lesson plan. Review and edit the result, then refine with the Copilot.",
    },
  ],
  full: [
    {
      id: "sidebar",
      selector: '[data-tour="sidebar"]',
      title: "Navigate anywhere",
      body: "Use this sidebar to jump between Dashboard, Classes, Lesson Planner, Evaluation Engine, PBD, Timetable, Materials, Analytics and Reports.",
    },
    {
      id: "hero",
      selector: ".hero-panel",
      page: "dashboard",
      title: "Your command center",
      body: "The Dashboard surfaces today's lessons, class alerts and quick actions. Visit it first each morning.",
    },
    {
      id: "quick-actions",
      selector: ".quick-action",
      page: "dashboard",
      title: "One-tap shortcuts",
      body: "These quick-action buttons launch common tasks instantly — generate a lesson plan, open the timetable, record a pupil.",
    },
    {
      id: "search",
      selector: '[data-tour="search"]',
      title: "Find anything fast",
      body: "Search pupils, RPH, materials and classes with Ctrl+K (or Cmd+K on Mac). Results update as you type.",
    },
    {
      id: "theme",
      selector: '[data-tour="theme-toggle"]',
      title: "Light or dark",
      body: "Toggle the theme any time — your choice is remembered for next visit.",
    },
    {
      id: "copilot",
      selector: ".copilot-fab",
      title: "Meet your AI Copilot",
      body: "Click this button to open the AI Copilot. Ask it to draft lessons, extract form data, suggest interventions — anything.",
    },
  ],
};

function currentTourSteps(branch) {
  if (!branch) return TOUR_INTRO;
  return [...TUTORIAL_FLOWS[branch], TOUR_DONE];
}

// The purple guide cursor — a pointer arrow that glides to each target's
// top-left corner (tip resting on the element, like a real cursor hovering it).
function GuideCursor({ x, y }) {
  return (
    <svg
      className="guide-cursor"
      width="30" height="30" viewBox="0 0 24 24" fill="none"
      aria-hidden="true"
      style={{ transform: `translate3d(${x - 6}px, ${y - 4}px, 0)` }}
    >
      <path d="M4 2.5 L4 20 L9 15.5 L12.2 22 L15 20.7 L11.8 14.2 L18.5 14 Z"
        fill="var(--primary, #7c3aed)" stroke="white" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function CenteredCallout({ step, total, current, onNext, onPrev, onClose, nextBtnRef }) {
  return (
    <div className="tour-centered-card">
      <span className="tour-counter">Step {step + 1} of {total}</span>
      <h3 className="tour-title">{current.title}</h3>
      <p className="tour-body">{current.body}</p>
      <div className="tour-actions">
        <button type="button" className="tour-skip" onClick={onClose}>{step === 0 ? "Skip tour" : "Skip"}</button>
        <span className="tour-spacer" />
        {step > 0 && <button type="button" className="secondary-btn" onClick={onPrev}><ChevronLeft /> Back</button>}
        <button type="button" className="primary-btn" ref={nextBtnRef} onClick={onNext}>
          {step < total - 1 ? (<><ChevronRight /> Next</>) : (<><CheckCircle2 /> Done</>)}
        </button>
      </div>
    </div>
  );
}

function Tour({ step, branch, onChooseBranch, onNext, onPrev, onClose }) {
  const navigate = useNavigate();
  const steps = currentTourSteps(branch);
  const current = steps[step] || steps[0];
  const isCentered = !current.selector;
  const isChoice = current.id === "choice";
  const nextBtnRef = useRef(null);
  const [rect, setRect] = useState({ top: 0, left: 0, w: 0, h: 0, ready: false });
  const [tipPos, setTipPos] = useState({ top: 0, left: 0 });

  // Navigate to the step's target page via the router (was setActivePage).
  const navigateToPage = useCallback((pageId) => {
    if (pageId) navigate(pageIdToPath(pageId));
  }, [navigate]);

  const measure = useCallback(() => {
    if (isCentered) { setRect((s) => ({ ...s, ready: true })); return; }
    if (current.page) navigateToPage(current.page);
    const el = document.querySelector(current.selector);
    if (!el) { setRect((s) => ({ ...s, ready: true })); return; }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      const pad = 6;
      setRect({ top: r.top - pad, left: r.left - pad, w: r.width + pad * 2, h: r.height + pad * 2, ready: true });
      const below = r.top < window.innerHeight / 2;
      requestAnimationFrame(() => {
        const tip = document.querySelector(".tour-callout");
        const tipH = tip?.offsetHeight || 190;
        const tipW = tip?.offsetWidth || 360;
        const top = below ? r.bottom + pad + 16 : Math.max(16, r.top - pad - tipH - 16);
        const left = Math.max(16, Math.min(window.innerWidth - tipW - 16, r.left + r.width / 2 - tipW / 2));
        setTipPos({ top, left });
      });
    });
  }, [current, isCentered, navigateToPage]);

  useEffect(() => {
    setRect({ top: 0, left: 0, w: 0, h: 0, ready: false });
    measure();
    const t1 = setTimeout(measure, 30);
    const t2 = setTimeout(measure, 150);
    const t3 = setTimeout(measure, 400);
    const onResize = () => measure();
    const onScroll = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [step, branch, measure]);

  useEffect(() => {
    if (isChoice) return;
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); onNext(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); onPrev(); }
    };
    window.addEventListener("keydown", onKey);
    nextBtnRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [step, isChoice, onNext, onPrev, onClose]);

  return (
    <div className={`tour-overlay ${isCentered ? "is-centered" : ""}`} role="dialog" aria-modal="true" aria-label={current.title}>
      <div className="tour-blocker" onClick={onClose} />
      {!isCentered && rect.ready && (
        <>
          <div className="tour-highlight" style={{ top: rect.top, left: rect.left, width: rect.w, height: rect.h }} />
          <GuideCursor x={rect.left} y={rect.top} />
        </>
      )}
      {isCentered && !isChoice && (
        <CenteredCallout step={step} total={steps.length} current={current} onNext={onNext} onPrev={onPrev} onClose={onClose} nextBtnRef={nextBtnRef} />
      )}
      {isChoice && (
        <div className="tour-choice">
          <div className="tour-choice-card">
            <span className="tour-counter">Step {step + 1} of {steps.length}</span>
            <h3 className="tour-title">{current.title}</h3>
            <p className="tour-body">{current.body}</p>
            <div className="tour-choice-grid">
              <button type="button" className="tour-choice-btn recommended" onClick={() => onChooseBranch("class")}>
                <Users /> Set up a class first
                <small>Recommended — your planning &amp; PBD flow from a roster</small>
              </button>
              <button type="button" className="tour-choice-btn" onClick={() => onChooseBranch("planning")}>
                <Wand2 /> Jump into lesson planning
                <small>Generate an RPH with AI right now</small>
              </button>
              <button type="button" className="tour-choice-btn" onClick={() => onChooseBranch("full")}>
                <LayoutDashboard /> Full tour
                <small>See the whole workspace — sidebar, dashboard, copilot</small>
              </button>
            </div>
            <div className="tour-actions tour-choice-foot">
              <button type="button" className="tour-skip" onClick={onClose}>Skip tour</button>
            </div>
          </div>
        </div>
      )}
      {!isCentered && rect.ready && (
        <div className="tour-callout" style={{ top: tipPos.top, left: tipPos.left }}>
          <span className="tour-counter">Step {step + 1} of {steps.length}</span>
          <h3 className="tour-title">{current.title}</h3>
          <p className="tour-body">{current.body}</p>
          <div className="tour-actions">
            <button type="button" className="tour-skip" onClick={onClose}>Skip tour</button>
            <span className="tour-spacer" />
            {step > 0 && <button type="button" className="secondary-btn" onClick={onPrev}><ChevronLeft /> Back</button>}
            <button type="button" className="primary-btn" ref={nextBtnRef} onClick={onNext}>
              {step < steps.length - 1 ? (<><ChevronRight /> Next</>) : (<><CheckCircle2 /> Done</>)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { Tour, TUTORIAL_KEY, currentTourSteps };
export default Tour;
