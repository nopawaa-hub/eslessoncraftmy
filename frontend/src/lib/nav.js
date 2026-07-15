import {
  FaDashboard,
  FaClasses,
  FaLessonPlanner,
  FaEvaluate,
  FaPBD,
  FaTimetable,
  FaMaterials,
  FaAnalytics,
  FaReports,
  FaSettings,
  FaRecordStudent,
} from "../icons/FaIcons.jsx";

// Legacy page id -> SPA route path. Used by the navTo() shim so existing
// setActivePage(id) call sites can be migrated mechanically without each
// call site needing to know the new path scheme.
export const PAGE_PATHS = {
  dashboard: "/",
  classes: "/classes",
  // "students" is rendered by ClassesPage; keep it as a path that the
  // component can branch on (ClassesPage reads useParams / location internally).
  students: "/students",
  "lesson-planner": "/lesson-planner",
  evaluate: "/evaluate",
  pbd: "/pbd",
  timetable: "/timetable",
  materials: "/materials",
  analytics: "/analytics",
  reports: "/reports",
  settings: "/settings",
};

// Reverse map: path -> page id (used to highlight the active nav item).
export const PATH_PAGES = Object.fromEntries(
  Object.entries(PAGE_PATHS).map(([id, path]) => [path, id]),
);

// Map a legacy page id (or current path) to its route path.
export function pageIdToPath(pageId) {
  return PAGE_PATHS[pageId] || "/";
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: FaDashboard },
  { id: "classes", label: "Classes", icon: FaClasses },
  { id: "lesson-planner", label: "Lesson Planner AI", icon: FaLessonPlanner, badge: "AI" },
  { id: "evaluate", label: "Evaluation Engine", icon: FaEvaluate, badge: "AI" },
  { id: "pbd", label: "PBD & Assessment", icon: FaPBD },
  { id: "timetable", label: "Timetable", icon: FaTimetable },
  { id: "materials", label: "Materials Library", icon: FaMaterials },
  { id: "analytics", label: "Analytics", icon: FaAnalytics },
  { id: "reports", label: "Reports", icon: FaReports },
  { id: "settings", label: "Settings", icon: FaSettings },
];

const navGroups = [
  {
    label: "Workspace",
    items: [
      { id: "dashboard", label: "Dashboard", icon: FaDashboard },
      { id: "classes", label: "Classes", icon: FaClasses },
    ],
  },
  {
    label: "Teaching",
    items: [
      { id: "lesson-planner", label: "Lesson Planner AI", icon: FaLessonPlanner, badge: "AI" },
      { id: "evaluate", label: "Evaluation Engine", icon: FaEvaluate, badge: "AI" },
      { id: "timetable", label: "Timetable", icon: FaTimetable },
      { id: "materials", label: "Materials Library", icon: FaMaterials },
    ],
  },
  {
    label: "Assessment",
    items: [
      { id: "pbd", label: "PBD & Assessment", icon: FaPBD },
      { id: "analytics", label: "Analytics", icon: FaAnalytics },
      { id: "reports", label: "Reports", icon: FaReports },
    ],
  },
  {
    label: "System",
    items: [{ id: "settings", label: "Settings", icon: FaSettings }],
  },
];

export { navItems, navGroups, FaRecordStudent };
