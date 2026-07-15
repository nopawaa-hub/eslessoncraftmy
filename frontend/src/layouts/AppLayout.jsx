import React, { useCallback } from "react";
import { Sparkles, X } from "lucide-react";
import { useAppStore } from "../state/useAppStore.js";
import { useTheme } from "../hooks/useTheme.js";
import Sidebar from "../components/Sidebar.jsx";
import TopBar from "../components/TopBar.jsx";
import ErrorBoundary from "../components/ErrorBoundary.jsx";
import AICopilot from "../components/AICopilot.jsx";
import { Tour, TUTORIAL_KEY } from "../components/TutorialTour.jsx";

/**
 * The persistent app shell: sidebar, topbar, main content area (<Outlet/>
 * is passed as children), floating copilot, and the tutorial tour overlay.
 *
 * This replaces the old App() return JSX (App.jsx:849-875). Key difference:
 * instead of renderPage(context), the page is now supplied by React Router
 * via <Outlet/> wrapped in <Suspense> (see router.jsx RootGuard).
 */
function AppLayout({ children }) {
  // Keep the <html> dark class in sync (replaces the App() useEffect).
  useTheme();

  const copilotOpen = useAppStore((s) => s.copilotOpen);
  const toggleCopilot = useAppStore((s) => s.toggleCopilot);
  const setCopilotOpen = useAppStore((s) => s.setCopilotOpen);

  const tourOpen = useAppStore((s) => s.tourOpen);
  const tourStep = useAppStore((s) => s.tourStep);
  const tourBranch = useAppStore((s) => s.tourBranch);
  const setTourStep = useAppStore((s) => s.setTourStep);
  const setTourBranch = useAppStore((s) => s.setTourBranch);
  const setTourOpen = useAppStore((s) => s.setTourOpen);

  const startTour = useCallback(() => {
    setTourStep(0);
    setTourBranch(null);
    setTourOpen(true);
  }, [setTourStep, setTourBranch, setTourOpen]);

  const closeTour = useCallback(() => {
    localStorage.setItem(TUTORIAL_KEY, "1");
    setTourOpen(false);
  }, [setTourOpen]);

  const nextStep = useCallback(() => {
    setTourStep((s) => s + 1);
    // If we're at the last step, mark seen + close.
    // The Tour component knows the steps length; it calls onClose on "Done".
  }, [setTourStep]);

  const prevStep = useCallback(() => {
    setTourStep((s) => Math.max(0, s - 1));
  }, [setTourStep]);

  return (
    <div className="app-root">
      <Sidebar />
      <div className="main-column">
        <TopBar />
        <main className="page-wrap">
          <ErrorBoundary onGoHome={() => window.location.assign("/")}>
            {children}
          </ErrorBoundary>
        </main>
      </div>
      <button
        className={`copilot-fab ${copilotOpen ? "hidden" : ""}`}
        onClick={toggleCopilot}
        aria-label="Toggle AI copilot"
      >
        {copilotOpen ? <X /> : <Sparkles />}
      </button>
      <AICopilot open={copilotOpen} setOpen={setCopilotOpen} />
      {tourOpen && (
        <Tour
          step={tourStep}
          branch={tourBranch}
          onChooseBranch={(b) => { setTourBranch(b); setTourStep(0); }}
          onNext={nextStep}
          onPrev={prevStep}
          onClose={closeTour}
        />
      )}
    </div>
  );
}

export default AppLayout;
