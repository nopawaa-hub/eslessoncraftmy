import React, { lazy, Suspense, useEffect, useRef, useCallback } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  useSearchParams,
  Outlet,
} from "react-router-dom";
import { useAppStore } from "./state/useAppStore.js";
import { AuthLoading, LoginScreen } from "./components/Auth.jsx";
import AppLayout from "./layouts/AppLayout.jsx";

// Lazy-loaded page components — each becomes a separate Vite/Rollup chunk.
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const ClassesPage = lazy(() => import("./pages/ClassesPage.jsx"));
const LessonPlanner = lazy(() => import("./pages/LessonPlanner.jsx"));
const EvaluatePage = lazy(() => import("./pages/EvaluatePage.jsx"));
const PBDPage = lazy(() => import("./pages/PBDPage.jsx"));
const TimetablePage = lazy(() => import("./pages/TimetablePage.jsx"));
const MaterialsPage = lazy(() => import("./pages/MaterialsPage.jsx"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage.jsx"));
const ReportsPage = lazy(() => import("./pages/ReportsPage.jsx"));
const SettingsPage = lazy(() => import("./pages/SettingsPage.jsx"));

/**
 * Root route guard: shows AuthLoading while bootstrapping, LoginScreen if
 * there is no authenticated user, or AppLayout (with <Outlet/>) otherwise.
 * This replaces the old App() if-blocks at App.jsx:833-847.
 */
function RootGuard() {
  const authChecked = useAppStore((s) => s.authChecked);
  const currentUser = useAppStore((s) => s.currentUser);
  const checkAuth = useAppStore((s) => s.checkAuth);
  const checkBackendHealth = useAppStore((s) => s.checkBackendHealth);
  const theme = useAppStore((s) => s.theme);

  // Boot-time effects: check auth token + backend health. Previously these
  // were separate useEffects in App(); consolidated here so they run once.
  // The theme effect lives in useTheme() inside AppLayout/LoginScreen.
  useEffect(() => {
    if (theme) document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    checkAuth();
    checkBackendHealth();
  }, [checkAuth, checkBackendHealth]);

  // Auto-launch tutorial on first visit (per browser). Previously in App().
  const startTour = useCallback(() => {
    useAppStore.getState().setTourStep(0);
    useAppStore.getState().setTourBranch(null);
    useAppStore.getState().setTourOpen(true);
  }, []);

  const tourStartedRef = useRef(false);
  const hydrated = useAppStore((s) => s.hydrated);

  useEffect(() => {
    if (!currentUser || !authChecked || !hydrated) return;
    if (tourStartedRef.current) return;
    if (localStorage.getItem("lessoncraft-tutorial-seen")) return;
    tourStartedRef.current = true;
    const timer = setTimeout(() => startTour(), 600);
    return () => clearTimeout(timer);
  }, [currentUser, authChecked, hydrated, startTour]);

  // Fetch server collections once the user is authenticated.
  const refreshAll = useAppStore((s) => s.refreshAll);
  useEffect(() => {
    if (currentUser) refreshAll();
  }, [currentUser, refreshAll]);

  if (!authChecked || !hydrated) {
    return <AuthLoading />;
  }

  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <AppLayout>
      <Suspense fallback={<div className="page-wrap"><div className="skeleton-list"><div className="ai-loading-head"><span className="ai-orb">⚡</span><strong>Loading…</strong></div></div></div>}>
        <Outlet />
      </Suspense>
    </AppLayout>
  );
}

// Wrapper that makes the selectedModel available to the apiPost injector.
// We wrap the provider so lazy pages can read the selected model from the
// store and pass it to apiPost naturally in their handlers.

/**
 * Lazy route element that wraps a page so Suspense works per-route.
 * The RootGuard already has a Suspense wrapper, so each lazy page just
 * renders inside it.
 */
const lazyPage = (Component) => <Component />;

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootGuard />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "classes", element: <ClassesPage /> },
      { path: "students", element: <Navigate to="/classes" replace /> },
      { path: "lesson-planner", element: <LessonPlanner /> },
      { path: "lesson-planner/:draftId", element: <LessonPlanner /> },
      { path: "evaluate", element: <EvaluatePage /> },
      { path: "pbd", element: <PBDPage /> },
      { path: "timetable", element: <TimetablePage /> },
      { path: "materials", element: <MaterialsPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

export default router;
