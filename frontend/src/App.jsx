import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  BrainCircuit,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Download,
  FileCheck,
  FileText,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Moon,
  Paperclip,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  Settings,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  Users,
  Wand2,
  X,
} from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" && window.location.port !== "5173"
    ? window.location.origin
    : "http://localhost:3000");
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const AUTH_TOKEN_KEY = "lessoncraft-auth-token";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "classes", label: "Classes", icon: Users },
  { id: "lesson-planner", label: "Lesson Planner AI", icon: Sparkles, badge: "AI" },
  { id: "evaluate", label: "Evaluation Engine", icon: FileCheck, badge: "AI" },
  { id: "pbd", label: "PBD & Assessment", icon: ClipboardCheck },
  { id: "timetable", label: "Timetable", icon: CalendarDays },
  { id: "materials", label: "Materials Library", icon: FolderOpen },
  { id: "analytics", label: "Analytics", icon: LineChart },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
];

const navGroups = [
  {
    label: "Workspace",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "classes", label: "Classes", icon: Users },
    ],
  },
  {
    label: "Teaching",
    items: [
      { id: "lesson-planner", label: "Lesson Planner AI", icon: Sparkles, badge: "AI" },
      { id: "evaluate", label: "Evaluation Engine", icon: FileCheck, badge: "AI" },
      { id: "timetable", label: "Timetable", icon: CalendarDays },
      { id: "materials", label: "Materials Library", icon: FolderOpen },
    ],
  },
  {
    label: "Assessment",
    items: [
      { id: "pbd", label: "PBD & Assessment", icon: ClipboardCheck },
      { id: "analytics", label: "Analytics", icon: LineChart },
      { id: "reports", label: "Reports", icon: FileText },
    ],
  },
  {
    label: "System",
    items: [{ id: "settings", label: "Settings", icon: Settings }],
  },
];

const todayClasses = [
  { id: "c1", subject: "English", className: "5 Bestari", year: "Year 5", skill: "Reading", time: "08:00 - 09:00", topic: "Main Ideas in Short Texts", tone: "emerald", status: "Ready" },
  { id: "c2", subject: "English", className: "4 Cemerlang", year: "Year 4", skill: "Writing", time: "09:30 - 10:30", topic: "Simple Past Tense", tone: "indigo", status: "Needs RPH" },
  { id: "c3", subject: "English", className: "5 Bestari", year: "Year 5", skill: "Speaking", time: "11:00 - 12:00", topic: "Giving Opinions", tone: "amber", status: "PBD due" },
  { id: "c4", subject: "English", className: "6 Amanah", year: "Year 6", skill: "Writing", time: "13:30 - 14:30", topic: "Email Writing", tone: "rose", status: "Needs support" },
  { id: "c5", subject: "English", className: "3 Jujur", year: "Year 3", skill: "Listening", time: "15:00 - 16:00", topic: "Classroom Instructions", tone: "violet", status: "Ready" },
];

const weekClasses = [
  ...todayClasses.map((c, index) => ({ ...c, day: 0, slot: index })),
  { id: "w1", subject: "English", className: "5 Bestari", year: "Year 5", skill: "Grammar", time: "08:00", topic: "Adjectives for Description", tone: "emerald", day: 1, slot: 0, status: "Ready" },
  { id: "w2", subject: "English", className: "4 Cemerlang", year: "Year 4", skill: "Reading", time: "10:00", topic: "Sequencing Events", tone: "indigo", day: 1, slot: 2, status: "Needs RPH" },
  { id: "w3", subject: "English", className: "5 Bestari", year: "Year 5", skill: "Writing", time: "11:00", topic: "Opinion Sentences", tone: "amber", day: 2, slot: 3, status: "PBD due" },
  { id: "w4", subject: "English", className: "5 Bestari", year: "Year 5", skill: "Listening", time: "09:00", topic: "Information Transfer", tone: "emerald", day: 2, slot: 1, status: "Ready" },
  { id: "w5", subject: "English", className: "6 Amanah", year: "Year 6", skill: "Speaking", time: "13:00", topic: "Role-play: Asking for Help", tone: "rose", day: 3, slot: 5, status: "Needs support" },
  { id: "w6", subject: "English", className: "4 Cemerlang", year: "Year 4", skill: "Grammar", time: "08:00", topic: "Prepositions of Place", tone: "indigo", day: 4, slot: 0, status: "Ready" },
  { id: "w7", subject: "English", className: "3 Jujur", year: "Year 3", skill: "Phonics", time: "14:00", topic: "Long Vowel Sounds", tone: "violet", day: 4, slot: 6, status: "Needs RPH" },
];

const summaryStats = [
  { label: "English classes today", value: "5", hint: "2 completed", tone: "indigo", trend: "+1 vs yesterday" },
  { label: "English RPH pending", value: "3", hint: "Due tomorrow", tone: "amber", trend: "-2 this week" },
  { label: "PBD pending", value: "12", hint: "English speaking + writing evidence", tone: "rose", trend: "Needs attention" },
  { label: "English lessons this week", value: "22h", hint: "Target 24h", tone: "emerald", trend: "92% dicapai" },
];

const aiInsights = [
  { title: "5 pupils need vocabulary support", body: "Aishah, Danish, Iman, Nurul and Zikri are repeating TP1-TP2 in reading comprehension.", action: "Open intervention", tone: "rose" },
  { title: "AI suggests a speaking scaffold", body: "Use sentence frames for Giving Opinions before pupils attempt pair discussion.", action: "Generate RPH", tone: "indigo" },
  { title: "8 English PBD records pending", body: "4 Cemerlang: oral responses from last week still need TP evidence.", action: "Key-in marks", tone: "amber" },
  { title: "Writing gap detected", body: "Year 6 pupils can list ideas but weak pupils need email format chunks and model phrases.", action: "View analytics", tone: "emerald" },
];

const materials = [
  { name: "Reading Main Ideas.pdf", type: "PDF", size: "2.3 MB", subject: "English", updated: "2 jam lalu" },
  { name: "Simple Past Drill.docx", type: "DOCX", size: "412 KB", subject: "English", updated: "Semalam" },
  { name: "Opinion Sentence Frames.pptx", type: "PPT", size: "8.1 MB", subject: "English", updated: "2 hari lalu" },
  { name: "Classroom Instructions Audio.mp3", type: "Audio", size: "18 MB", subject: "English", updated: "3 hari lalu" },
  { name: "Email Writing Checklist.pdf", type: "PDF", size: "1.1 MB", subject: "English", updated: "Minggu lepas" },
  { name: "Phonics Picture Cards.zip", type: "ZIP", size: "22 MB", subject: "English", updated: "Minggu lepas" },
];

const initialStudents = [
  { id: "s1", name: "Aishah binti Rahman", attendance: "Present", score: 78, tp: 4, comment: "Understands main ideas with support." },
  { id: "s2", name: "Danish bin Hakim", attendance: "Present", score: 52, tp: 2, comment: "Needs vocabulary intervention." },
  { id: "s3", name: "Iman bin Zaki", attendance: "MC", score: 0, tp: 1, comment: "Absent for assessment." },
  { id: "s4", name: "Nurul Aina", attendance: "Present", score: 88, tp: 5, comment: "Strong oral explanation." },
  { id: "s5", name: "Zikri bin Azlan", attendance: "Present", score: 45, tp: 2, comment: "Needs decoding support." },
  { id: "s6", name: "Fatimah binti Omar", attendance: "Present", score: 92, tp: 6, comment: "Can mentor peers." },
  { id: "s7", name: "Haziq bin Yusof", attendance: "Present", score: 70, tp: 4, comment: "Consistent comprehension." },
  { id: "s8", name: "Mira binti Lokman", attendance: "Present", score: 65, tp: 3, comment: "Needs sentence frame practice." },
];

const tpDistribution = [
  { label: "TP1", value: 2 },
  { label: "TP2", value: 4 },
  { label: "TP3", value: 6 },
  { label: "TP4", value: 10 },
  { label: "TP5", value: 8 },
  { label: "TP6", value: 3 },
];

const defaultLesson = {
  title: "Year 5 English Reading Lesson: Main Ideas in Short Texts",
  templateType: "KSSR English Lesson Plan",
  lessonDetails: {
    subject: "English",
    year: "Year 5",
    className: "5 Bestari",
    durationMinutes: 60,
    topic: "Main Ideas in Short Texts",
    skill: "Reading",
    materials: "Short text strips, picture prompts, sentence frames, exit ticket",
    assessmentType: "PBD observation, oral response, exit ticket",
  },
  objectives: [
    "identify the main idea in a short text with guidance.",
    "match supporting details to the correct main idea.",
    "explain one answer using a simple sentence frame.",
  ],
  successCriteria: [
    "I can find what the text is mostly about.",
    "I can choose one detail that supports the main idea.",
    "I can say my answer using because.",
  ],
  activities: [
    "Picture talk and keyword prediction.",
    "Teacher models how to underline repeated ideas.",
    "Pairs match text strips to main idea cards.",
    "Groups justify one answer using sentence frames.",
    "Exit ticket: one main idea and one supporting detail.",
  ],
  assessment: [
    "Teacher checklist for identifying main ideas.",
    "Pair discussion sampling.",
    "Exit ticket sorted into reteach, on-track and extension groups.",
  ],
  differentiation: [
    "Low-proficiency pupils receive picture prompts and sentence starters.",
    "On-track pupils work with short paragraph strips.",
    "High-proficiency pupils explain why a distractor is incorrect.",
  ],
  procedure: [
    { stage: "Pre Lesson", minutes: 5, lessonContent: "Activate vocabulary and topic prediction.", teacherActivities: "Show a picture and ask: What do you think this text is about?", pupilActivities: "Pupils share one word or phrase with a partner." },
    { stage: "Lesson Development Stage I", minutes: 10, lessonContent: "Model finding the main idea.", teacherActivities: "Read a short paragraph aloud and underline repeated ideas.", pupilActivities: "Pupils repeat key words and complete one guided example." },
    { stage: "Stage II", minutes: 15, lessonContent: "Pair matching task.", teacherActivities: "Give text strips and main idea cards. Monitor support group first.", pupilActivities: "Pupils match texts to main ideas and use a sentence frame." },
    { stage: "Stage III", minutes: 20, lessonContent: "Group justification and HOTS distractor check.", teacherActivities: "Ask groups to explain why one answer is best.", pupilActivities: "Groups present one answer with one reason." },
    { stage: "Post Lesson", minutes: 10, lessonContent: "Exit evidence and reflection.", teacherActivities: "Collect exit tickets and sort pupils for next lesson.", pupilActivities: "Pupils write one main idea and one supporting detail." },
  ],
  kssrAlignment: {
    contentStandard: "English language comprehension through reading short linear texts.",
    learningStandard: "Pupils identify main ideas and specific details with support.",
    learningOutcomes: "Pupils show understanding through oral explanation and written exit ticket.",
  },
};

const englishSkillPerformance = [
  { label: "Reading", value: 76 },
  { label: "Writing", value: 64 },
  { label: "Speaking", value: 72 },
  { label: "Listening", value: 81 },
  { label: "Grammar", value: 68 },
  { label: "Phonics", value: 74 },
];

const analyticsCards = [
  { title: "Reading Comprehension", value: "76%", note: "+8% after main-idea practice", tone: "emerald" },
  { title: "Writing Accuracy", value: "64%", note: "Past tense and email format need support", tone: "amber" },
  { title: "Speaking Confidence", value: "72%", note: "Sentence frames improved pair talk", tone: "indigo" },
  { title: "Pupils at Risk", value: "5", note: "Vocabulary and decoding support group", tone: "rose" },
];

const scheduleColors = [
  { id: "indigo", label: "Indigo" },
  { id: "emerald", label: "Green" },
  { id: "amber", label: "Yellow" },
  { id: "rose", label: "Red" },
  { id: "violet", label: "Violet" },
];

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || "";
}

function authHeaders(extra = {}) {
  const token = getAuthToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

async function apiRequest(path) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || data.error || "Request failed");
  return data;
}

async function apiPost(path, payload) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || data.error || "Request failed");
  return data;
}

async function apiPut(path, payload) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || data.error || "Request failed");
  return data;
}

async function apiDelete(path) {
  const response = await fetch(`${API_BASE}${path}`, { method: "DELETE", headers: authHeaders() });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || data.error || "Request failed");
  return data;
}

function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadLessonDocx(result) {
  if (!result) throw new Error("Generate a lesson plan first.");
  const response = await fetch(`${API_BASE}/documents/lesson-plan`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(result),
  });
  const contentType = response.headers.get("Content-Type") || "";
  if (!response.ok) {
    const data = contentType.includes("application/json") ? await response.json().catch(() => ({})) : {};
    throw new Error(data.detail || data.error || "Could not export DOCX.");
  }
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
  const filename = filenameMatch?.[1] || `${(result?.title || "english-rph").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.docx`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function lessonToText(result) {
  const lines = [
    result?.title || "English RPH",
    "",
    `Subject: ${result?.lessonDetails?.subject || "English"}`,
    `Year: ${result?.lessonDetails?.year || ""}`,
    `Topic: ${result?.lessonDetails?.topic || ""}`,
    `Skill: ${result?.lessonDetails?.skill || ""}`,
    "",
    "Objectives",
    ...(result?.objectives || []).map((item, index) => `${index + 1}. ${item}`),
    "",
    "Success Criteria",
    ...(result?.successCriteria || []).map((item, index) => `${index + 1}. ${item}`),
    "",
    "Activities",
    ...(result?.activities || []).map((item, index) => `${index + 1}. ${item}`),
    "",
    "Procedure",
    ...(result?.procedure || []).map((stage) => `${stage.stage} (${stage.minutes || "-"} min)\nTeacher: ${stage.teacherActivities}\nPupils: ${stage.pupilActivities}`),
  ];
  return lines.join("\n");
}

function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("lessoncraft-theme") || "light");
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [backendStatus, setBackendStatus] = useState("Checking");
  const [lessons, setLessons] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const isDemoUser = currentUser?.email === "demo@test.com" || currentUser?.role === "demo" || String(currentUser?._id) === "000000000000000000000001";
  const liveMode = typeof window !== "undefined" && (window.location.pathname.startsWith("/testing") || window.location.search.includes("live=1") || (currentUser && !isDemoUser));

  const refreshLessons = async () => {
    try {
      const data = await apiRequest("/lesson-plans?subject=English");
      setLessons(data);
    } catch {
      setLessons([]);
    }
  };

  const refreshClasses = async () => {
    try {
      const data = await apiRequest("/classes");
      setClasses(data);
    } catch {
      setClasses([]);
    }
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("lessoncraft-theme", theme);
  }, [theme]);

  useEffect(() => {
    apiRequest("/health")
      .then((data) => setBackendStatus(data.aiProvider === "gemini" ? "Gemini Online" : "Fallback Ready"))
      .catch(() => setBackendStatus("Backend Offline"));
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setAuthChecked(true);
      return;
    }

    apiRequest("/auth/me")
      .then((user) => setCurrentUser(user))
      .catch(() => localStorage.removeItem(AUTH_TOKEN_KEY))
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    refreshLessons();
    refreshClasses();
  }, [currentUser]);

  const handleLogin = ({ token, user }) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    try {
      await apiPost("/auth/logout", {});
    } catch {
      // Local sign-out should still clear the browser session.
    }
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setCurrentUser(null);
    setLessons([]);
    setClasses([]);
    setActivePage("dashboard");
  };

  const context = {
    activePage,
    setActivePage,
    setCopilotOpen,
    lessons,
    refreshLessons,
    classes,
    refreshClasses,
    selectedClassId,
    setSelectedClassId,
    backendStatus,
    theme,
    setTheme,
    liveMode,
    currentUser,
    setCurrentUser,
    handleLogout,
  };

  if (!authChecked) {
    return <AuthLoading theme={theme} />;
  }

  if (!currentUser) {
    return (
      <LoginScreen
        backendStatus={backendStatus}
        onLogin={handleLogin}
        theme={theme}
        setTheme={setTheme}
        onDemoLogin={() => handleLogin({ token: "demo-token", user: { name: "Demo Teacher", email: "demo@test.com", role: "teacher" } })}
      />
    );
  }

  return (
    <div className="app-root" data-page={activePage}>
      <Sidebar activePage={activePage} setActivePage={setActivePage} collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="main-column">
        <TopBar setMobileOpen={setMobileOpen} setActivePage={setActivePage} backendStatus={backendStatus} theme={theme} setTheme={setTheme} currentUser={currentUser} onLogout={handleLogout} />
        <main className="page-wrap">{renderPage(context)}</main>
      </div>
      <button className="copilot-fab" onClick={() => setCopilotOpen((open) => !open)} aria-label="Toggle AI copilot">
        {copilotOpen ? <X /> : <Sparkles />}
      </button>
      <AICopilot open={copilotOpen} setOpen={setCopilotOpen} setActivePage={setActivePage} />
    </div>
  );
}

function renderPage(context) {
  switch (context.activePage) {
    case "classes":
      return <ClassesPage {...context} />;
    case "lesson-planner":
      return <LessonPlanner {...context} />;
    case "evaluate":
      return <EvaluatePage {...context} />;
    case "pbd":
      return <PBDPage {...context} />;
    case "timetable":
      return <TimetablePage {...context} />;
    case "materials":
      return <MaterialsPage liveMode={context.liveMode} />;
    case "analytics":
      return <AnalyticsPage />;
    case "reports":
      return <ReportsPage lessons={context.lessons} classes={context.classes} liveMode={context.liveMode} />;
    case "settings":
      return <SettingsPage {...context} />;
    default:
      return <Dashboard {...context} />;
  }
}

function AuthLoading({ theme }) {
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <div className="auth-shell">
      <div className="auth-card compact">
        <span className="ai-orb"><Sparkles /></span>
        <strong>Opening your teacher workspace</strong>
        <small>Checking your session...</small>
      </div>
    </div>
  );
}

function LoginScreen({ backendStatus, onLogin, theme, setTheme, onDemoLogin }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    if (window.google?.accounts?.id) {
      setScriptReady(true);
      return;
    }

    const existing = document.querySelector("script[data-google-identity]");
    if (existing) {
      existing.addEventListener("load", () => setScriptReady(true), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";
    script.onload = () => setScriptReady(true);
    script.onerror = () => setError("Google sign-in script could not load. Check your internet connection.");
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!scriptReady || !window.google?.accounts?.id) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async ({ credential }) => {
        setBusy(true);
        setError("");
        try {
          const result = await apiPost("/auth/google", { credential });
          onLogin(result);
        } catch (loginError) {
          setError(loginError.message || "Google login failed.");
        } finally {
          setBusy(false);
        }
      },
    });
  }, [scriptReady, onLogin]);

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <div className="brand auth-brand">
          <div className="brand-mark"><GraduationCap /></div>
          <div><p className="brand-title">ESLessonCraft MY</p><p className="brand-subtitle">Teacher OS</p></div>
        </div>
        <div className="auth-copy">
          <p className="eyebrow">Secure account</p>
          <h1>Sign in to your teaching workspace.</h1>
          <p>Login to create lesson plans, record your class performance and many more</p>
        </div>
        {!GOOGLE_CLIENT_ID ? (
          <div className="auth-warning">
            <AlertTriangle />
            <div>
              <strong>Google Client ID is not configured.</strong>
              <span>Add <code>VITE_GOOGLE_CLIENT_ID</code> in <code>frontend/.env</code> and <code>GOOGLE_CLIENT_ID</code> in <code>backend/.env</code>, then restart both servers.</span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="google-signin-btn"
            disabled={busy || !scriptReady}
            onClick={() => {
              if (window.google?.accounts?.id) {
                window.google.accounts.id.prompt((notification) => {
                  if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                    setError("Google sign-in prompt failed. Try clicking again or refreshing the page.");
                  }
                 });
              }
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>{busy ? "Signing in…" : "Sign in with Google"}</span>
          </button>
        )}
        {onDemoLogin && (
          <button
            type="button"
            className="secondary-btn"
            style={{ width: "100%", marginTop: "0.75rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }}
            onClick={onDemoLogin}
          >
            <Sparkles size={16} /> Continue as Demo Teacher (Skip Sign-in)
          </button>
        )}
        {busy && <p className="auth-status">Signing you in...</p>}
        {error && <p className="auth-error">{error}</p>}
        <footer className="auth-footer">
          <span>{backendStatus}</span>
          <button type="button" className="secondary-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun /> : <Moon />} Theme</button>
        </footer>
      </section>
    </div>
  );
}

function Sidebar({ activePage, setActivePage, collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  return (
    <>
      {mobileOpen && <button className="mobile-backdrop" onClick={() => setMobileOpen(false)} aria-label="Close menu" />}
      <aside className={`sidebar ${collapsed ? "is-collapsed" : ""} ${mobileOpen ? "is-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><GraduationCap /></div>
          {!collapsed && <div><p className="brand-title">ESLessonCraft MY</p><p className="brand-subtitle">Teacher OS</p></div>}
        </div>
        <nav className="nav-list">
          {collapsed ? navGroups.flatMap((group) => group.items).map((item) => <NavButton key={item.id} item={item} activePage={activePage} setActivePage={setActivePage} setMobileOpen={setMobileOpen} collapsed={collapsed} />) : navGroups.map((group) => {
            const groupActive = group.items.some((item) => item.id === activePage);
            return (
              <details className="nav-group" key={group.label} open={groupActive || group.label === "Workspace"}>
                <summary>{group.label}</summary>
                {group.items.map((item) => <NavButton key={item.id} item={item} activePage={activePage} setActivePage={setActivePage} setMobileOpen={setMobileOpen} collapsed={collapsed} />)}
              </details>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <button className="collapse-btn" onClick={() => setCollapsed((value) => !value)}><ChevronLeft className={collapsed ? "rotate" : ""} /></button>
        </div>
      </aside>
    </>
  );
}

function NavButton({ item, activePage, setActivePage, setMobileOpen, collapsed }) {
  const Icon = item.icon;
  const active = activePage === item.id;
  return (
    <button className={`nav-item ${active ? "active" : ""}`} onClick={() => { setActivePage(item.id); setMobileOpen(false); }}>
      <Icon />
      {!collapsed && <span>{item.label}</span>}
      {!collapsed && item.badge && <b>{item.badge}</b>}
    </button>
  );
}

function TopBar({ setMobileOpen, setActivePage, backendStatus, theme, setTheme, currentUser, onLogout }) {
  const initials = (currentUser?.name || currentUser?.email || "Teacher")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <header className="topbar">
      <button type="button" className="icon-btn mobile-only" onClick={() => setMobileOpen(true)}><Menu /></button>
      <div className="search-box"><Search /><input placeholder="Search English pupils, RPH, materials, classes..." /><kbd>Ctrl K</kbd></div>
      <button type="button" className="create-btn" onClick={() => setActivePage("lesson-planner")}><Plus /> Create</button>
      <button type="button" className="icon-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun /> : <Moon />}</button>
      <button type="button" className="icon-btn notification" aria-label="Notifications" onMouseDown={(event) => event.preventDefault()}><Bell /><span /></button>
      <div className="profile">
        {currentUser?.picture ? <img src={currentUser.picture} alt="" /> : <div>{initials}</div>}
        <p><strong>{currentUser?.name || "Teacher"}</strong><span>{backendStatus}</span></p>
      </div>
      <button type="button" className="icon-btn" onClick={onLogout} aria-label="Sign out"><LogOut /></button>
    </header>
  );
}

function Dashboard({ setActivePage, setCopilotOpen, lessons, liveMode, currentUser }) {
  const recent = lessons.length ? lessons.slice(0, 4) : liveMode ? [] : materials.slice(0, 4).map((m) => ({ title: m.name, subject: m.subject, year: m.type, status: "Ready" }));
  const todayItems = liveMode ? [] : todayClasses;
  const firstName = (currentUser?.name || "Teacher").split(" ")[0];
  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Good morning, Thursday · 14 March</p>
          <h1>Welcome back, <em>{firstName}</em>.</h1>
          <p>{liveMode ? "Testing mode is using only live database records. Add classes, students and lesson plans to populate this workspace." : "You have 5 English classes today and 3 RPH pending. AI insights now focus on reading, writing, speaking and PBD evidence only."}</p>
        </div>
        <div className="hero-actions">
          <button className="primary-btn" onClick={() => setActivePage("lesson-planner")}><Sparkles /> Generate English RPH</button>
          <button className="secondary-btn" onClick={() => setActivePage("timetable")}><CalendarDays /> Open schedule</button>
        </div>
      </section>

      <section className="stat-grid">
        {(liveMode ? [
          { label: "Saved lessons", value: String(lessons.length), hint: "From database", tone: "indigo", trend: "Live" },
          { label: "Demo data", value: "Off", hint: "Clean testing mode", tone: "emerald", trend: "Testing" },
          { label: "PBD templates", value: "0", hint: "Create in PBD", tone: "amber", trend: "Live" },
          { label: "Schedule blocks", value: "0", hint: "Create manually", tone: "rose", trend: "Live" },
        ] : summaryStats).map((stat) => <StatCard key={stat.label} stat={stat} />)}
      </section>

      <section className="dashboard-grid">
        <Card className="span-2" title="Today’s English schedule" subtitle="5 classes · 5 teaching hours" action="Open full schedule" onAction={() => setActivePage("timetable")}>
          <div className="class-list">
            {todayItems.map((item) => <ClassRow key={item.id} item={item} onClick={() => setActivePage("timetable")} />)}
            {!todayItems.length && <p className="body-copy">No live schedule blocks yet. Open Timetable to create your first block.</p>}
          </div>
        </Card>
        <Card title="AI Insights" subtitle="English-only recommendations · 4 baru">
          <div className="insight-list">
            {(liveMode ? [] : aiInsights).map((item) => <Insight key={item.title} item={item} onClick={() => item.action.includes("Generate") ? setActivePage("lesson-planner") : item.action.includes("analytics") ? setActivePage("analytics") : setActivePage("pbd")} />)}
            {liveMode && <p className="body-copy">AI suggestions will appear after you create live class, lesson and PBD data.</p>}
          </div>
        </Card>
      </section>

      <section className="insight-strip">
        {analyticsCards.map((item) => <Metric key={item.title} title={item.title} value={item.value} note={item.note} tone={item.tone} />)}
      </section>

      <section className="dashboard-grid">
        <Card className="span-2" title="Recent English materials and RPH" subtitle="Upload, reuse and generate follow-up tasks with AI" action="Upload" onAction={() => setActivePage("materials")}>
          <div className="material-grid">
            {recent.map((item) => <MaterialTile key={item.title || item.name} item={item} />)}
            {!recent.length && <p className="body-copy">No live lessons yet. Generate and save one from Lesson Planner AI.</p>}
          </div>
        </Card>
        <Card title="This week’s English goals">
          <Goal label="RPH completed" value={72} hint="8 / 11" />
          <Goal label="PBD recorded" value={70} hint="28 / 40" />
          <Goal label="Materials prepared" value={75} hint="6 / 8" />
          <button className="ai-note" onClick={() => setCopilotOpen(true)}><Sparkles /> Follow-up: complete 5 Bestari English PBD evidence before Friday.</button>
        </Card>
      </section>
    </div>
  );
}

function LessonPlanner({ refreshLessons, setActivePage, classes = [], selectedClassId, setSelectedClassId }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(defaultLesson);
  const [error, setError] = useState("");
  const [difficulty, setDifficulty] = useState(3);
  const [form, setForm] = useState({
    classId: selectedClassId || "",
    year: "Year 5",
    className: "5 Bestari",
    topic: "Main Ideas in Short Texts",
    skill: "Reading",
    durationMinutes: 60,
    numberOfStudents: "32",
    priorKnowledge: "Pupils can read short paragraphs and know common classroom vocabulary.",
    materials: "Short text strips, picture prompts, sentence frames, exit tickets",
    assessmentType: "PBD observation, oral response and exit ticket",
    objectives: "identify the main idea; match supporting details; explain one answer using because",
    stepsOverview: "Picture talk, teacher modelling, pair matching, group justification, exit ticket.",
    studentProficiency: "Mixed ability",
    classroomEnvironment: "Standard classroom with limited ICT",
    teachingNotes: "",
  });

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const applyClassContext = (classId) => {
    const schoolClass = classes.find((item) => item._id === classId);
    setSelectedClassId?.(classId);
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
  }, [selectedClassId, classes]);
  const saveTemplate = () => {
    localStorage.setItem("english-rph-template", JSON.stringify(form));
    setError("Template saved locally.");
  };
  const printLesson = () => window.print();
  const exportLesson = async () => {
    setError("");
    try {
      await downloadLessonDocx(result);
    } catch (err) {
      setError(err.message || "Could not export DOCX.");
    }
  };

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiPost("/generate", {
        ...form,
        subject: "English",
        classroomType: `${form.studentProficiency || "Mixed ability"} English class, differentiation level ${difficulty}, ${form.classroomEnvironment || "standard classroom"}`,
        templateType: "KSSR English Lesson Plan",
        durationMinutes: Number(form.durationMinutes || 60),
      });
      setResult(data);
      refreshLessons?.();
    } catch (err) {
      setError(err.message || "Could not generate lesson plan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader eyebrow="English Lesson Planner AI" title="Generate English RPH." subtitle="Focused only on KSSR English: Reading, Writing, Speaking, Listening, Grammar and Phonics with PBD evidence.">
        <button className="secondary-btn" onClick={saveTemplate}><Save /> Save template</button>
        <button className="secondary-btn" onClick={printLesson}><Printer /> Print</button>
        <button className="primary-btn" onClick={exportLesson} disabled={loading || !result}><Download /> Download DOCX</button>
      </PageHeader>
      <section className="planner-grid lesson-planner-stack">
        <Card title="Input RPH" className="sticky-card">
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
          <div className="locked-subject"><BookOpen /><div><strong>Subject locked to English</strong><span>Other subjects are hidden to keep the workflow focused.</span></div></div>
          <FormGrid form={form} updateForm={updateForm} classes={classes} applyClassContext={applyClassContext} />
          <label className="field"><span>English topic</span><input value={form.topic} onChange={(event) => updateForm("topic", event.target.value)} /></label>
          <label className="field"><span>Learning objectives</span><textarea rows="3" value={form.objectives} onChange={(event) => updateForm("objectives", event.target.value)} /></label>
          <div className="form-row">
            <label className="field"><span>Duration (min)</span><input type="number" value={form.durationMinutes} onChange={(event) => updateForm("durationMinutes", event.target.value)} /></label>
            <label className="field"><span>Pupils</span><input value={form.numberOfStudents} onChange={(event) => updateForm("numberOfStudents", event.target.value)} /></label>
          </div>
          <label className="field"><span>Differentiation level: {difficulty}</span><input type="range" min="1" max="5" value={difficulty} onChange={(event) => setDifficulty(event.target.value)} /></label>
          <label className="field"><span>Prior knowledge</span><textarea rows="2" value={form.priorKnowledge} onChange={(event) => updateForm("priorKnowledge", event.target.value)} /></label>
          <label className="field"><span>Student proficiency</span><input value={form.studentProficiency} onChange={(event) => updateForm("studentProficiency", event.target.value)} /></label>
          <label className="field"><span>Classroom environment</span><textarea rows="2" value={form.classroomEnvironment} onChange={(event) => updateForm("classroomEnvironment", event.target.value)} /></label>
          <label className="field"><span>Teaching notes</span><textarea rows="2" value={form.teachingNotes} onChange={(event) => updateForm("teachingNotes", event.target.value)} /></label>
          <label className="field"><span>Materials</span><textarea rows="2" value={form.materials} onChange={(event) => updateForm("materials", event.target.value)} /></label>
          <label className="field"><span>Lesson flow</span><textarea rows="3" value={form.stepsOverview} onChange={(event) => updateForm("stepsOverview", event.target.value)} /></label>
          <button className="primary-btn full" disabled={loading} onClick={generate}>{loading ? <RefreshCw className="spin" /> : <Wand2 />} {loading ? "Generating RPH..." : "Generate RPH with AI"}</button>
          {error && <div className="error-note"><AlertTriangle /> {error}</div>}
        </Card>

        <Card title={result?.title || "Generated English RPH"} subtitle={`${result?.lessonDetails?.subject || "English"} · ${result?.lessonDetails?.year || form.year} · ${result?.lessonDetails?.durationMinutes || form.durationMinutes} min · ${result?.templateType || "KSSR English Lesson Plan"}`} className="lesson-preview" action="Attach material" onAction={() => setActivePage("materials")}>
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
          {!loading && result && <LessonPreview result={result} />}
        </Card>
      </section>
    </div>
  );
}

const emptyClassForm = {
  name: "",
  year: "Year 5",
  subject: "English",
  studentCount: 0,
  studentProficiency: "Mixed ability",
  classroomEnvironment: "Standard classroom with limited ICT",
  teachingNotes: "",
  tags: "",
  status: "active",
};

function ClassesPage({ classes = [], refreshClasses, setSelectedClassId, setActivePage, lessons = [], refreshLessons }) {
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState(emptyClassForm);
  const [editingId, setEditingId] = useState("");
  const [students, setStudents] = useState([]);
  const [studentDrafts, setStudentDrafts] = useState([]);
  const [showClassForm, setShowClassForm] = useState(!classes.length);
  const [openClassPanel, setOpenClassPanel] = useState("");
  const [notice, setNotice] = useState("");

  const selectedClass = classes.find((item) => item._id === selectedId);
  const classLessons = lessons.filter((lesson) => String(lesson.classId?._id || lesson.classId || "") === String(selectedClass?._id || ""));

  useEffect(() => {
    if (selectedId && !classes.some((schoolClass) => schoolClass._id === selectedId)) setSelectedId("");
  }, [classes, selectedId]);

  useEffect(() => {
    if (!selectedClass?._id) {
      setStudents([]);
      return;
    }
    apiRequest(`/students?classId=${selectedClass._id}`)
      .then((data) => {
        setStudents(data);
        const count = Math.max(Number(selectedClass.studentCount || 0), data.length, 1);
        const rows = Array.from({ length: count }, (_, index) => data[index] || {
          studentName: "",
          proficiency: selectedClass.studentProficiency || "Mixed ability",
          notes: "",
          status: "active",
        });
        setStudentDrafts(rows);
      })
      .catch(() => {
        setStudents([]);
        setStudentDrafts([]);
      });
  }, [selectedClass?._id]);

  const updateClassForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const resetClassForm = () => {
    setEditingId("");
    setForm(emptyClassForm);
    setShowClassForm(false);
  };
  const startEdit = (schoolClass) => {
    setEditingId(schoolClass._id);
    setShowClassForm(true);
    setForm({
      name: schoolClass.name || "",
      year: schoolClass.year || "Year 5",
      subject: schoolClass.subject || "English",
      studentCount: schoolClass.studentCount || 0,
      studentProficiency: schoolClass.studentProficiency || "Mixed ability",
      classroomEnvironment: schoolClass.classroomEnvironment || "Standard classroom with limited ICT",
      teachingNotes: schoolClass.teachingNotes || "",
      tags: (schoolClass.tags || []).join(", "),
      status: schoolClass.status || "active",
    });
  };
  const saveClass = async () => {
    try {
      const payload = { ...form, studentCount: Number(form.studentCount || 0) };
      const saved = editingId ? await apiPut(`/classes/${editingId}`, payload) : await apiPost("/classes", payload);
      setNotice(editingId ? "Class updated." : "Class created.");
      setSelectedId(saved._id);
      setSelectedClassId?.(saved._id);
      setShowClassForm(false);
      setStudentDrafts(Array.from({ length: Math.max(Number(saved.studentCount || 0), 1) }, () => ({
        studentName: "",
        proficiency: saved.studentProficiency || "Mixed ability",
        notes: "",
        status: "active",
      })));
      resetClassForm();
      refreshClasses?.();
      refreshLessons?.();
    } catch (err) {
      setNotice(err.message || "Could not save class.");
    }
  };
  const deleteClass = async (id) => {
    if (!window.confirm("Delete this class? Existing lesson plans will not be deleted.")) return;
    await apiDelete(`/classes/${id}`);
    setNotice("Class deleted. Linked lessons were kept.");
    if (selectedId === id) setSelectedId("");
    refreshClasses?.();
  };
  const updateStudentDraft = (index, key, value) => {
    setStudentDrafts((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  };
  const addRosterRow = () => {
    setStudentDrafts((rows) => [...rows, { studentName: "", proficiency: selectedClass?.studentProficiency || "Mixed ability", notes: "", status: "active" }]);
  };
  const saveRoster = async () => {
    if (!selectedClass?._id) return;
    const savedRows = [];
    for (const draft of studentDrafts) {
      const studentName = draft.studentName?.trim();
      if (!studentName && draft._id) {
        await apiDelete(`/students/${draft._id}`);
        continue;
      }
      if (!studentName) continue;
      const payload = {
        classId: selectedClass._id,
        studentName,
        proficiency: draft.proficiency || selectedClass.studentProficiency || "Mixed ability",
        notes: draft.notes || "",
        status: draft.status || "active",
      };
      const saved = draft._id ? await apiPut(`/students/${draft._id}`, payload) : await apiPost("/students", payload);
      savedRows.push(saved);
    }
    const latest = await apiRequest(`/students?classId=${selectedClass._id}`);
    setStudents(latest);
    setStudentDrafts(Array.from({ length: Math.max(Number(selectedClass.studentCount || 0), latest.length, 1) }, (_, index) => latest[index] || {
      studentName: "",
      proficiency: selectedClass.studentProficiency || "Mixed ability",
      notes: "",
      status: "active",
    }));
    setNotice(`${savedRows.length} student record${savedRows.length === 1 ? "" : "s"} saved.`);
    refreshClasses?.();
  };
  const planForClass = () => {
    if (selectedClass?._id) setSelectedClassId?.(selectedClass._id);
    setActivePage("lesson-planner");
  };

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Class Management" title="Classes are the core container." subtitle="Create English classes, manage pupils, and generate class-owned KSSR lesson plans." />

      <section className="page-toolbar">
        <button className="secondary-btn" onClick={refreshClasses}><RefreshCw /> Refresh</button>
        <button className="secondary-btn" onClick={() => { setForm(emptyClassForm); setEditingId(""); setShowClassForm(true); }}><Plus /> Add class</button>
        <button className="primary-btn" onClick={planForClass} disabled={!selectedClass}><Sparkles /> Plan for class</button>
      </section>

      <section className="dashboard-grid">
        {showClassForm && <Card title={editingId ? "Edit Class" : "Add Class"} subtitle="Enter the class first. The student database form appears after the class is saved.">
          <div className="form-row">
            <label className="field"><span>Class name</span><input value={form.name} onChange={(event) => updateClassForm("name", event.target.value)} placeholder="5 Bestari" /></label>
            <label className="field"><span>Year</span><select value={form.year} onChange={(event) => updateClassForm("year", event.target.value)}><option>Year 1</option><option>Year 2</option><option>Year 3</option><option>Year 4</option><option>Year 5</option><option>Year 6</option></select></label>
          </div>
          <div className="form-row">
            <label className="field"><span>Subject</span><input value={form.subject} onChange={(event) => updateClassForm("subject", event.target.value)} /></label>
            <label className="field"><span>Pupil count</span><input type="number" min="1" value={form.studentCount} onChange={(event) => updateClassForm("studentCount", event.target.value)} /></label>
          </div>
          <label className="field"><span>Student proficiency</span><input value={form.studentProficiency} onChange={(event) => updateClassForm("studentProficiency", event.target.value)} /></label>
          <label className="field"><span>Classroom environment</span><textarea rows="2" value={form.classroomEnvironment} onChange={(event) => updateClassForm("classroomEnvironment", event.target.value)} /></label>
          <label className="field"><span>Teaching notes</span><textarea rows="2" value={form.teachingNotes} onChange={(event) => updateClassForm("teachingNotes", event.target.value)} /></label>
          <label className="field"><span>Tags</span><input value={form.tags} onChange={(event) => updateClassForm("tags", event.target.value)} placeholder="support, vocabulary, no projector" /></label>
          <div className="form-row">
            <button className="primary-btn full" onClick={saveClass}><Save /> {editingId ? "Update class" : "Create class"}</button>
            <button className="secondary-btn full" onClick={resetClassForm}><X /> Cancel</button>
          </div>
          {notice && <div className="success-note"><CheckCircle2 /> {notice}</div>}
        </Card>}

        <Card title="Class List" subtitle={`${classes.length} saved class${classes.length === 1 ? "" : "es"}`} className="span-3">
          <div className="material-grid wide">
            {classes.map((schoolClass) => (
              <button key={schoolClass._id} className={`student-card ${selectedId === schoolClass._id ? "selected-card" : ""}`} onClick={() => { setSelectedId(schoolClass._id); setOpenClassPanel(""); }}>
                <div>{schoolClass.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div>
                <strong>{schoolClass.name}</strong>
                <span>{schoolClass.year} · {schoolClass.subject} · {schoolClass.studentCount || 0} pupils</span>
                <small>{schoolClass.studentProficiency}</small>
                <em>Open class database</em>
              </button>
            ))}
            {!classes.length && <p className="body-copy">No classes yet. Create your first class to unlock class-owned lesson planning.</p>}
          </div>
        </Card>
        {!showClassForm && notice && <div className="success-note span-2"><CheckCircle2 /> {notice}</div>}
      </section>

      {selectedClass && (
        <div className="fullscreen-modal-backdrop" role="dialog" aria-modal="true">
          <section className="fullscreen-modal">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Class Database</p>
                <h2>{selectedClass.name}</h2>
                <p className="body-copy">{selectedClass.year} · {selectedClass.subject} · {selectedClass.studentProficiency}</p>
              </div>
              <button className="icon-btn" onClick={() => { setSelectedId(""); setOpenClassPanel(""); }}><X /></button>
            </div>
            <Card title={selectedClass.name} subtitle={`${selectedClass.year} · ${selectedClass.subject} · ${selectedClass.studentProficiency}`}>
            <p className="body-copy">{selectedClass.classroomEnvironment}</p>
            {selectedClass.teachingNotes && <p className="body-copy">{selectedClass.teachingNotes}</p>}
            <div className="form-row">
              <button className="secondary-btn" onClick={() => startEdit(selectedClass)}><Save /> Edit class</button>
              <button className="secondary-btn" onClick={() => deleteClass(selectedClass._id)}><X /> Delete class</button>
              <button className="primary-btn" onClick={planForClass}><Sparkles /> Generate RPH</button>
            </div>
            <div className="class-panel-actions">
              <button className={`student-card compact ${openClassPanel === "students" ? "selected-card" : ""}`} onClick={() => setOpenClassPanel("students")}>
                <div><Users /></div>
                <strong>Student database</strong>
                <span>{students.length} saved pupils · {selectedClass.studentCount || 0} expected</span>
                <em>Open form</em>
              </button>
              <button className={`student-card compact ${openClassPanel === "lessons" ? "selected-card" : ""}`} onClick={() => setOpenClassPanel("lessons")}>
                <div><BookOpen /></div>
                <strong>Lesson library</strong>
                <span>{classLessons.length} class-owned RPH</span>
                <em>Open library</em>
              </button>
            </div>
          </Card>

          {openClassPanel === "students" && <Card title="Student Database Form" subtitle={`Fill the ${Math.max(Number(selectedClass.studentCount || 0), studentDrafts.length)} pupil rows for ${selectedClass.name}. Blank saved rows are removed.`}>
            <div className="form-row">
              <button className="secondary-btn" onClick={() => setOpenClassPanel("")}><X /> Close form</button>
              <button className="secondary-btn" onClick={addRosterRow}><Plus /> Add row</button>
              <button className="primary-btn" onClick={saveRoster}><Save /> Save student database</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>#</th><th>Student name</th><th>Proficiency</th><th>Notes</th><th>Status</th></tr></thead>
                <tbody>
                  {studentDrafts.map((student, index) => (
                    <tr key={student._id || `draft-${index}`}>
                      <td>{index + 1}</td>
                      <td><input className="comment-input" value={student.studentName || ""} onChange={(event) => updateStudentDraft(index, "studentName", event.target.value)} placeholder="Student name" /></td>
                      <td><input className="comment-input" value={student.proficiency || ""} onChange={(event) => updateStudentDraft(index, "proficiency", event.target.value)} placeholder="Mixed ability" /></td>
                      <td><input className="comment-input" value={student.notes || ""} onChange={(event) => updateStudentDraft(index, "notes", event.target.value)} placeholder="Notes, support needs, language profile" /></td>
                      <td><Badge tone={student._id ? "emerald" : "amber"}>{student._id ? "saved" : "new"}</Badge></td>
                    </tr>
                  ))}
                  {!studentDrafts.length && <tr><td colSpan="5">Save a class with a pupil count to create empty student rows.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>}

          {openClassPanel === "lessons" && <Card title="Class Lesson Library" subtitle={`${classLessons.length} lesson plans saved for ${selectedClass.name}`}>
            <div className="form-row">
              <button className="secondary-btn" onClick={() => setOpenClassPanel("")}><X /> Close library</button>
              <button className="primary-btn" onClick={planForClass}><Sparkles /> Generate RPH for this class</button>
            </div>
            <div className="material-grid">
              {classLessons.slice(0, 4).map((lesson) => <MaterialTile key={lesson._id} item={{ name: lesson.title, subject: lesson.className || selectedClass.name, size: lesson.year, updated: String(lesson.updatedAt || lesson.createdAt || "").slice(0, 10) }} />)}
              {!classLessons.length && <p className="body-copy">No lessons linked yet. Generate one from this class to save it here.</p>}
            </div>
          </Card>}
          </section>
        </div>
      )}
    </div>
  );
}

function PBDPage({ classes = [], liveMode }) {
  const [tab, setTab] = useState("templates");
  const [templates, setTemplates] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?._id || "");
  const [activeTemplateId, setActiveTemplateId] = useState("");
  const [classStudents, setClassStudents] = useState(liveMode ? [] : initialStudents.map((student) => ({
    _id: student.id,
    studentName: student.name,
    proficiency: `TP${student.tp}`,
    notes: student.comment,
  })));
  const [records, setRecords] = useState([]);
  const [notice, setNotice] = useState("");
  const [templateForm, setTemplateForm] = useState({
    title: "Reading observation checklist",
    year: "Year 5",
    subject: "English",
    assessmentType: "PBD observation",
    evidenceType: "Teacher observation and pupil response",
    scaleType: "tp",
    criteria: "Can identify main idea; Can support answer with detail; Can respond using simple English.",
  });
  const selectedClass = classes.find((item) => item._id === selectedClassId);
  const activeTemplate = templates.find((item) => item._id === activeTemplateId) || templates[0];

  const refreshTemplates = async () => {
    try {
      const query = selectedClassId ? `?classId=${selectedClassId}` : "";
      const data = await apiRequest(`/assessment${query}`);
      setTemplates(data);
      if (!activeTemplateId && data[0]?._id) setActiveTemplateId(data[0]._id);
    } catch {
      setTemplates([]);
    }
  };

  useEffect(() => {
    if (!selectedClassId && classes[0]?._id) setSelectedClassId(classes[0]._id);
  }, [classes, selectedClassId]);

  useEffect(() => {
    refreshTemplates();
  }, [selectedClassId]);

  useEffect(() => {
    if (!selectedClassId) {
      setClassStudents(liveMode ? [] : classStudents);
      return;
    }
    apiRequest(`/students?classId=${selectedClassId}`)
      .then(setClassStudents)
      .catch(() => setClassStudents([]));
  }, [selectedClassId]);

  useEffect(() => {
    const saved = activeTemplate?.records || [];
    const rows = classStudents.map((student) => {
      const existing = saved.find((record) => String(record.studentId || "") === String(student._id || ""));
      return existing || {
        studentId: student._id,
        studentName: student.studentName || student.name,
        value: "",
        tp: "TP3",
        remarks: "",
      };
    });
    setRecords(rows);
  }, [classStudents, activeTemplateId, templates.length]);

  const updateTemplateForm = (key, value) => setTemplateForm((current) => ({ ...current, [key]: value }));
  const createTemplate = async () => {
    if (!templateForm.title.trim()) return;
    try {
      const payload = {
        ...templateForm,
        classId: selectedClassId || undefined,
        questions: templateForm.criteria.split(";").map((criterion) => criterion.trim()).filter(Boolean),
      };
      const saved = await apiPost("/assessment", payload);
      setTemplates((items) => [saved, ...items]);
      setActiveTemplateId(saved._id);
      setTab("assess");
      setNotice("PBD template created. You can now assess pupils with it.");
    } catch (err) {
      setNotice(err.message || "Could not create PBD template.");
    }
  };
  const updateRecord = (index, key, value) => {
    setRecords((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  };
  const saveAssessmentRecords = async () => {
    if (!activeTemplate?._id) {
      setNotice("Create or select a PBD template first.");
      return;
    }
    try {
      const saved = await apiPut(`/assessment/${activeTemplate._id}`, { records });
      setTemplates((items) => items.map((item) => item._id === saved._id ? saved : item));
      setNotice("PBD records saved to the selected template.");
    } catch (err) {
      setNotice(err.message || "Could not save PBD records.");
    }
  };
  const exportCsv = () => {
    const rows = [["Template", activeTemplate?.title || ""], ["Student", "Evidence", "TP", "Remarks"], ...records.map((record) => [record.studentName, record.value, record.tp, record.remarks])];
    downloadTextFile("pbd-records.csv", rows.map((row) => row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(",")).join("\n"));
  };

  return (
    <div className="page-stack">
      <PageHeader eyebrow="PBD & Assessment" title="Template-first classroom assessment." subtitle="Create the assessment form first, then assess pupils from the selected class using that template." />
      <section className="page-toolbar">
        <button className="secondary-btn" onClick={refreshTemplates}><RefreshCw /> Refresh</button>
        <button className="secondary-btn" onClick={exportCsv}><Download /> Export</button>
        <button className="primary-btn" onClick={() => setTab("templates")}><Plus /> New template</button>
      </section>
      {notice && <div className="success-note"><CheckCircle2 /> {notice}</div>}
      <Tabs tabs={["templates", "assess", "analytics"]} active={tab} setActive={setTab} />

      {tab === "templates" && (
        <section className="dashboard-grid">
          <Card title="Create PBD Template" subtitle="Design how pupils will be assessed before recording evidence." className="span-2">
            <div className="form-row">
              <label className="field"><span>Class</span><select value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)}><option value="">No class selected</option>{classes.map((schoolClass) => <option key={schoolClass._id} value={schoolClass._id}>{schoolClass.name} · {schoolClass.year}</option>)}</select></label>
              <label className="field"><span>Template title</span><input value={templateForm.title} onChange={(event) => updateTemplateForm("title", event.target.value)} /></label>
            </div>
            <div className="form-row">
              <label className="field"><span>Assessment type</span><select value={templateForm.assessmentType} onChange={(event) => updateTemplateForm("assessmentType", event.target.value)}><option>PBD observation</option><option>Oral presentation rubric</option><option>Reading checklist</option><option>Writing sample review</option><option>Exit ticket</option></select></label>
              <label className="field"><span>Scale</span><select value={templateForm.scaleType} onChange={(event) => updateTemplateForm("scaleType", event.target.value)}><option value="tp">TP selector</option><option value="score">Score selector</option><option value="checkbox">Checklist</option><option value="remarks">Remarks only</option></select></label>
            </div>
            <label className="field"><span>Evidence type</span><input value={templateForm.evidenceType} onChange={(event) => updateTemplateForm("evidenceType", event.target.value)} /></label>
            <label className="field"><span>Criteria, separated with semicolons</span><textarea rows="4" value={templateForm.criteria} onChange={(event) => updateTemplateForm("criteria", event.target.value)} /></label>
            <button className="primary-btn full" onClick={createTemplate}><Save /> Save template</button>
          </Card>
          <Card title="Saved Templates" subtitle={`${templates.length} template${templates.length === 1 ? "" : "s"}`}>
            <div className="class-list">
              {templates.map((template) => (
                <button key={template._id} className={`class-row indigo ${template._id === activeTemplateId ? "active-row" : ""}`} onClick={() => { setActiveTemplateId(template._id); setTab("assess"); }}>
                  <span>{template.scaleType || "tp"}<small>{template.assessmentType}</small></span>
                  <div><strong>{template.title}</strong><small>{template.evidenceType || "Evidence collection"}</small></div>
                  <ArrowRight />
                </button>
              ))}
              {!templates.length && <p className="body-copy">No live templates yet. Create one to begin PBD recording.</p>}
            </div>
          </Card>
        </section>
      )}

      {tab === "assess" && (
        <Card title="Assess Students" subtitle={activeTemplate ? `${activeTemplate.title} · ${selectedClass?.name || "No class"}` : "Select a template first"}>
          <div className="form-row">
            <label className="field"><span>Class</span><select value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)}><option value="">Choose class</option>{classes.map((schoolClass) => <option key={schoolClass._id} value={schoolClass._id}>{schoolClass.name} · {schoolClass.year}</option>)}</select></label>
            <label className="field"><span>PBD template</span><select value={activeTemplateId} onChange={(event) => setActiveTemplateId(event.target.value)}><option value="">Choose template</option>{templates.map((template) => <option key={template._id} value={template._id}>{template.title}</option>)}</select></label>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Student</th><th>Evidence / value</th><th>TP</th><th>Remarks</th></tr></thead>
              <tbody>
                {records.map((record, index) => (
                  <tr key={record.studentId || index}>
                    <td>{index + 1}</td>
                    <td>{record.studentName}</td>
                    <td><input className="comment-input" value={record.value || ""} onChange={(event) => updateRecord(index, "value", event.target.value)} placeholder={activeTemplate?.scaleType === "checkbox" ? "Done / not yet" : "Evidence or score"} /></td>
                    <td><select className="score-input" value={record.tp || "TP3"} onChange={(event) => updateRecord(index, "tp", event.target.value)}><option>TP1</option><option>TP2</option><option>TP3</option><option>TP4</option><option>TP5</option><option>TP6</option></select></td>
                    <td><input className="comment-input" value={record.remarks || ""} onChange={(event) => updateRecord(index, "remarks", event.target.value)} /></td>
                  </tr>
                ))}
                {!records.length && <tr><td colSpan="5">Select a class with students and a saved template.</td></tr>}
              </tbody>
            </table>
          </div>
          <button className="primary-btn" onClick={saveAssessmentRecords}><Save /> Save PBD assessment</button>
        </Card>
      )}

      {tab === "analytics" && <PBDOverview />}
    </div>
  );
}

function PBDOverview() {
  return (
    <div className="page-stack">
      <section className="stat-grid three">
        <Metric title="Avg English TP" value="3.8" note="+0.4 from last assessment" tone="indigo" />
        <Metric title="Evidence Completion" value="87%" note="28 / 32 pupils assessed" tone="emerald" />
        <Metric title="Vocabulary Risk" value="5" note="TP1-TP2, needs intervention" tone="rose" />
      </section>
      <section className="dashboard-grid">
        <Card className="span-2" title="English TP Distribution"><BarSet data={tpDistribution} /></Card>
        <Card title="AI Insight"><p className="body-copy">5 Bestari improved in reading main ideas, but five pupils still need vocabulary pre-teaching and sentence frames before independent comprehension tasks.</p></Card>
      </section>
    </div>
  );
}

function KeyInTable({ students, updateScore }) {
  const [saved, setSaved] = useState(false);
  return (
    <Card title="Key-in English Marks" subtitle="Autosave active · TP updates automatically" action="Save" onAction={() => setSaved(true)}>
      {saved && <div className="success-note"><CheckCircle2 /> English PBD marks saved locally.</div>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Pupil Name</th><th>Attendance</th><th>Score</th><th>TP</th><th>Comment</th><th>Evidence</th></tr></thead>
          <tbody>
            {students.map((student, index) => (
              <tr key={student.id}>
                <td>{index + 1}</td><td>{student.name}</td><td><Badge tone={student.attendance === "Present" ? "emerald" : "amber"}>{student.attendance}</Badge></td>
                <td><input className="score-input" type="number" value={student.score} onChange={(event) => updateScore(student.id, Number(event.target.value))} /></td>
                <td><Badge tone={student.tp >= 5 ? "emerald" : student.tp >= 3 ? "indigo" : "rose"}>TP{student.tp}</Badge></td>
                <td><input className="comment-input" defaultValue={student.comment} /></td><td><button className="icon-btn"><Paperclip /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function TimetablePage({ setActivePage, liveMode, classes: savedClasses = [], lessons = [] }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const [tableSettings, setTableSettings] = useState({
    startTime: "08:00",
    endTime: "15:00",
    snapMinutes: 15,
    rowHeight: 110,
    dayWidth: 130,
  });
  const [tableSettingsOpen, setTableSettingsOpen] = useState(false);
  const buildSlots = (startTime, endTime) => {
    const toMinutes = (time) => {
      const [hour = "0", minute = "0"] = String(time || "08:00").split(":");
      return Number(hour) * 60 + Number(minute);
    };
    const start = toMinutes(startTime);
    const end = Math.max(start + 60, toMinutes(endTime));
    const built = [];
    for (let minute = start; minute <= end; minute += 60) {
      built.push(`${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`);
    }
    return built;
  };
  const slots = buildSlots(tableSettings.startTime, tableSettings.endTime);
  const hourRowHeight = Number(tableSettings.rowHeight || 110);
  const resizeStepMinutes = Number(tableSettings.snapMinutes || 15);
  const resizeStepPixels = hourRowHeight / (60 / resizeStepMinutes);
  const [classes, setClasses] = useState(liveMode ? [] : weekClasses);
  const [notice, setNotice] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [periodForm, setPeriodForm] = useState(null);
  const [resizeModeId, setResizeModeId] = useState("");
  const [resizePrompt, setResizePrompt] = useState("");
  const [resizePreview, setResizePreview] = useState(null);
  const [dragPreview, setDragPreview] = useState(null);
  const [draggingId, setDraggingId] = useState("");
  const [scheduleView, setScheduleView] = useState("week");
  const [calendarDate, setCalendarDate] = useState(() => new Date(2026, 4, 5));
  const [deletedOccurrences, setDeletedOccurrences] = useState([]);
  const [pendingDelete, setPendingDelete] = useState(null);
  const materialImageRef = useRef(null);
  const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const formatDateLabel = (date) => date.toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const startOfWeek = (date) => {
    const copy = new Date(date);
    const diff = (copy.getDay() + 6) % 7;
    copy.setDate(copy.getDate() - diff);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };
  const addDays = (date, daysToAdd) => {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + daysToAdd);
    return copy;
  };
  const weekStart = startOfWeek(calendarDate);
  const weekDates = days.map((_, index) => addDays(weekStart, index));
  const monthYear = calendarDate.getFullYear();
  const monthIndex = calendarDate.getMonth();
  const monthLabel = calendarDate.toLocaleDateString("en-MY", { month: "long", year: "numeric" });
  const weekLabel = `${weekDates[0].toLocaleDateString("en-MY", { day: "numeric", month: "short" })} - ${weekDates[4].toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}`;
  const occurrenceKey = (item, date) => `${item.id}:${dateKey(date)}`;
  const isOccurrenceDeleted = (item, date) => date ? deletedOccurrences.includes(occurrenceKey(item, date)) : false;
  const moveCalendar = (direction) => {
    setCalendarDate((current) => {
      const next = new Date(current);
      if (scheduleView === "month") {
        next.setMonth(next.getMonth() + direction);
      } else {
        next.setDate(next.getDate() + direction * 7);
      }
      return next;
    });
  };
  const addMinutesToTime = (time, minutes) => {
    const [hour = "0", minute = "0"] = String(time || "08:00").split(":");
    const date = new Date(2026, 0, 1, Number(hour), Number(minute) + minutes);
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };
  const timeToMinutes = (time) => {
    const [hour = "0", minute = "0"] = String(time || "08:00").split(":");
    return Number(hour) * 60 + Number(minute);
  };
  const minutesToTime = (totalMinutes) => {
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  };
  const slotForMinutes = (totalMinutes) => {
    let found = 0;
    slots.forEach((slot, index) => {
      if (timeToMinutes(slot) <= totalMinutes) found = index;
    });
    return found;
  };
  const timeRange = (item) => `${item.time || slots[item.slot] || "08:00"} - ${addMinutesToTime(item.time || slots[item.slot] || "08:00", Number(item.durationMinutes || 60))}`;
  const minutesIntoHour = (time) => {
    const minute = Number(String(time || "08:00").split(":")[1] || 0);
    return Number.isFinite(minute) ? minute : 0;
  };
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const updateTableSetting = (key, value) => {
    setTableSettings((current) => ({ ...current, [key]: value }));
  };
  const periodStyle = (item) => {
    const duration = Number(item.durationMinutes || 60);
    const start = timeToMinutes(item.time || slots[item.slot]);
    const base = timeToMinutes(slots[item.slot] || tableSettings.startTime);
    const topOffset = Math.max(0, ((start - base) / 60) * hourRowHeight);
    const visualHeight = Math.max(28, (duration / 60) * hourRowHeight);
    return {
      minHeight: `${visualHeight}px`,
      top: `${topOffset}px`,
      height: `${visualHeight}px`,
    };
  };
  const buildMonthCells = () => {
    const firstDay = new Date(monthYear, monthIndex, 1);
    const leadingBlanks = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(monthYear, monthIndex + 1, 0).getDate();
    return Array.from({ length: 42 }, (_, index) => {
      const dateNumber = index - leadingBlanks + 1;
      if (dateNumber < 1 || dateNumber > daysInMonth) return null;
      return new Date(monthYear, monthIndex, dateNumber);
    });
  };
  const monthCells = buildMonthCells();
  const lessonsForCalendarDate = (date) => {
    if (!date) return [];
    const weekdayIndex = (date.getDay() + 6) % 7;
    if (weekdayIndex > 4) return [];
    return classes
      .filter((item) => Number(item.day) === weekdayIndex && !isOccurrenceDeleted(item, date))
      .sort((a, b) => timeToMinutes(a.time || slots[a.slot]) - timeToMinutes(b.time || slots[b.slot]));
  };
  const getSnapFromPointer = (clientX, clientY) => {
    const grid = document.querySelector(".timetable-grid");
    if (!grid) return null;
    const rect = grid.getBoundingClientRect();
    const timeColumnWidth = 72;
    const headerHeight = hourRowHeight;
    const dayWidth = (rect.width - timeColumnWidth) / days.length;
    const x = clientX - rect.left - timeColumnWidth;
    const y = clientY - rect.top - headerHeight;
    const day = clamp(Math.floor(x / dayWidth), 0, days.length - 1);
    let row = clamp(Math.floor(y / hourRowHeight), 0, slots.length - 1);
    const yInRow = y - row * hourRowHeight;
    const stepsPerHour = Math.max(1, 60 / resizeStepMinutes);
    let step = Math.round(yInRow / resizeStepPixels);
    if (step >= stepsPerHour && row < slots.length - 1) {
      row += 1;
      step = 0;
    }
    step = clamp(step, 0, stepsPerHour - 1);
    const startMinutes = timeToMinutes(slots[row]) + step * resizeStepMinutes;
    return {
      day,
      slot: slotForMinutes(startMinutes),
      time: minutesToTime(startMinutes),
      startMinutes,
    };
  };
  const hasScheduleOverlap = (items, candidate, movingId) => {
    const start = timeToMinutes(candidate.time);
    const end = start + Number(candidate.durationMinutes || 60);
    return items.some((item) => {
      if (item.id === movingId || Number(item.day) !== Number(candidate.day)) return false;
      const itemStart = timeToMinutes(item.time || slots[item.slot]);
      const itemEnd = itemStart + Number(item.durationMinutes || 60);
      return start < itemEnd && end > itemStart;
    });
  };
  const openPeriod = (item, occurrenceDate = null) => {
    const matchedClass = savedClasses.find((schoolClass) => schoolClass._id === item.classId || schoolClass.name === item.className);
    setSelectedPeriod({
      ...item,
      occurrenceDateKey: occurrenceDate ? dateKey(occurrenceDate) : "",
      occurrenceDateLabel: occurrenceDate ? formatDateLabel(occurrenceDate) : "",
    });
    setPeriodForm({
      ...item,
      classId: item.classId || matchedClass?._id || "",
      className: item.className || matchedClass?.name || "",
      year: item.year || matchedClass?.year || "Year 5",
      tone: item.tone || "indigo",
      lessonPlan: item.lessonPlan || "",
      material: item.material || "",
      assessment: item.assessment || "",
      notes: item.notes || "",
    });
  };
  const updatePeriodForm = (key, value) => setPeriodForm((current) => ({ ...current, [key]: value }));
  const availableLessons = lessons.filter((lesson) => {
    if (!periodForm?.classId) return true;
    const lessonClassId = String(lesson.classId?._id || lesson.classId || "");
    return !lessonClassId || lessonClassId === String(periodForm.classId);
  });
  const applyScheduleClass = (classId) => {
    const schoolClass = savedClasses.find((item) => item._id === classId);
    setPeriodForm((current) => ({
      ...current,
      classId,
      className: schoolClass?.name || "",
      year: schoolClass?.year || current.year || "Year 5",
      subject: schoolClass?.subject || current.subject || "English",
    }));
  };
  const attachLessonPlan = (lessonId) => {
    const lesson = lessons.find((item) => item._id === lessonId);
    setPeriodForm((current) => ({
      ...current,
      lessonPlanId: lessonId,
      lessonPlan: lesson?.title || "",
      topic: lesson?.topic || lesson?.lessonDetails?.topic || current.topic,
      skill: lesson?.skill || lesson?.lessonDetails?.skill || current.skill,
      year: lesson?.year || lesson?.lessonDetails?.year || current.year,
      status: lessonId ? "Ready" : current.status,
    }));
  };
  const attachMaterialImage = (file) => {
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      setNotice("Material attachment must be an image file.");
      if (materialImageRef.current) materialImageRef.current.value = "";
      return;
    }
    setPeriodForm((current) => ({
      ...current,
      materialImageName: file.name,
      materialImageUrl: URL.createObjectURL(file),
      material: file.name,
    }));
    if (materialImageRef.current) materialImageRef.current.value = "";
  };
  const savePeriod = () => {
    setClasses((items) => items.map((item) => item.id === selectedPeriod.id ? { ...item, ...periodForm } : item));
    setNotice("Schedule block updated.");
    setSelectedPeriod(null);
  };
  const duplicatePeriod = () => {
    const copy = { ...periodForm, id: `copy-${Date.now()}`, slot: Math.min((Number(periodForm.slot) || 0) + 1, slots.length - 1), status: "Needs RPH" };
    setClasses((items) => [...items, copy]);
    setNotice("Schedule block duplicated.");
    setSelectedPeriod(null);
  };
  const deletePeriod = () => {
    setPendingDelete(selectedPeriod);
  };
  const requestDelete = (item, occurrenceDate = null) => {
    setPendingDelete({
      ...item,
      occurrenceDateKey: occurrenceDate ? dateKey(occurrenceDate) : "",
      occurrenceDateLabel: occurrenceDate ? formatDateLabel(occurrenceDate) : "",
    });
  };
  const deleteSeries = () => {
    const id = pendingDelete?.id;
    if (!id) return;
    setClasses((items) => items.filter((item) => item.id !== id));
    setDeletedOccurrences((items) => items.filter((key) => !key.startsWith(`${id}:`)));
    setNotice("All recurring schedule blocks deleted.");
    setPendingDelete(null);
    if (selectedPeriod?.id === id) setSelectedPeriod(null);
  };
  const deleteSingleOccurrence = () => {
    if (!pendingDelete?.id || !pendingDelete.occurrenceDateKey) return;
    const key = `${pendingDelete.id}:${pendingDelete.occurrenceDateKey}`;
    setDeletedOccurrences((items) => items.includes(key) ? items : [...items, key]);
    setNotice(`Only the ${pendingDelete.occurrenceDateLabel} occurrence was deleted.`);
    setPendingDelete(null);
    if (selectedPeriod?.id === pendingDelete.id) setSelectedPeriod(null);
  };
  const addSlot = () => {
    const occupied = new Set(classes.map((item) => `${item.day}-${item.slot}`));
    let day = 0;
    let slot = 0;
    for (let d = 0; d < days.length; d += 1) {
      const found = slots.findIndex((_, s) => !occupied.has(`${d}-${s}`));
      if (found >= 0) {
        day = d;
        slot = found;
        break;
      }
    }
    const newItem = {
      id: `new-${Date.now()}`,
      subject: "English",
      className: "",
      year: "Year 5",
      skill: "Reading",
      time: slots[slot],
      durationMinutes: 60,
      topic: "New English RPH",
      tone: "indigo",
      day,
      slot,
      status: "Needs RPH",
      lessonPlan: "",
      material: "",
      assessment: "",
      notes: "",
    };
    setClasses((items) => [...items, newItem]);
    openPeriod(newItem);
    setNotice("New English slot added. Complete the block details in the modal.");
  };
  const startResize = (item, event) => {
    event.preventDefault();
    event.stopPropagation();
    const startY = event.clientY;
    const startDuration = Number(item.durationMinutes || 60);
    setResizeModeId(item.id);
    setResizePrompt("Hold the clock and drag down to extend time, or drag up to shorten it. Time changes in 15-minute steps.");
    setResizePreview({ id: item.id, text: timeRange(item) });
    const onMove = (moveEvent) => {
      const delta = moveEvent.clientY - startY;
      const steps = Math.round(delta / resizeStepPixels);
      const durationMinutes = Math.min(240, Math.max(resizeStepMinutes, startDuration + steps * resizeStepMinutes));
      setClasses((items) => items.map((current) => current.id === item.id ? { ...current, durationMinutes } : current));
      setResizePreview({ id: item.id, text: `${item.time || slots[item.slot]} - ${addMinutesToTime(item.time || slots[item.slot], durationMinutes)}` });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setNotice("Schedule block time adjusted.");
      setResizeModeId("");
      setTimeout(() => setResizePrompt(""), 2600);
      setTimeout(() => setResizePreview(null), 1000);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };
  const startTopResize = (item, event) => {
    event.preventDefault();
    event.stopPropagation();
    const startY = event.clientY;
    const originalStart = timeToMinutes(item.time || slots[item.slot]);
    const originalEnd = originalStart + Number(item.durationMinutes || 60);
    setResizeModeId(item.id);
    setResizePrompt("Top resize: drag down to start later, or up to start earlier. End time stays fixed.");
    setResizePreview({ id: item.id, text: timeRange(item) });
    const onMove = (moveEvent) => {
      const delta = moveEvent.clientY - startY;
      const steps = Math.round(delta / resizeStepPixels);
      const earliestStart = timeToMinutes(slots[0]);
      const latestStart = originalEnd - resizeStepMinutes;
      const newStart = Math.min(latestStart, Math.max(earliestStart, originalStart + steps * resizeStepMinutes));
      const durationMinutes = originalEnd - newStart;
      const time = minutesToTime(newStart);
      setClasses((items) => items.map((current) => current.id === item.id ? { ...current, time, slot: slotForMinutes(newStart), durationMinutes } : current));
      setResizePreview({ id: item.id, text: `${time} - ${minutesToTime(originalEnd)}` });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setNotice("Schedule block start time adjusted.");
      setResizeModeId("");
      setTimeout(() => setResizePrompt(""), 2600);
      setTimeout(() => setResizePreview(null), 1000);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };
  const armResizeMode = (item, event) => {
    event.preventDefault();
    event.stopPropagation();
    setResizeModeId(item.id);
    setResizePrompt("Resize mode on: drag the lesson block down to extend time, or up to shorten it. Time changes in 15-minute steps.");
    setResizePreview({ id: item.id, text: timeRange(item) });
  };
  const startMovePeriod = (item, event) => {
    event.preventDefault();
    event.stopPropagation();
    const durationMinutes = Number(item.durationMinutes || 60);
    let lastSnap = {
      day: item.day,
      slot: item.slot,
      time: item.time || slots[item.slot],
      startMinutes: timeToMinutes(item.time || slots[item.slot]),
      invalid: false,
    };
    setResizeModeId("");
    setResizePrompt("");
    setResizePreview(null);
    setDraggingId(item.id);
    setDragPreview({ id: item.id, text: `${days[item.day]} ${timeRange(item)}`, invalid: false });
    const onMove = (moveEvent) => {
      const snap = getSnapFromPointer(moveEvent.clientX, moveEvent.clientY);
      if (!snap) return;
      const candidate = { ...item, ...snap, durationMinutes };
      const blocked = hasScheduleOverlap(classes, candidate, item.id);
      if (!blocked) {
        setClasses((items) => items.map((current) => current.id === item.id ? { ...current, day: snap.day, slot: snap.slot, time: snap.time } : current));
      }
      lastSnap = { ...snap, invalid: blocked };
      setDragPreview({
        id: item.id,
        text: blocked ? "Time overlaps another block" : `${days[snap.day]} ${snap.time} - ${addMinutesToTime(snap.time, durationMinutes)}`,
        invalid: blocked,
      });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDraggingId("");
      setDragPreview(null);
      if (lastSnap.invalid) {
        setNotice("That time overlaps another schedule block, so the move was not applied.");
        return;
      }
      setNotice(`Schedule block moved to ${days[lastSnap.day]} ${lastSnap.time}.`);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };
  const handlePeriodPointerDown = (item, event) => {
    if (event.target.closest?.(".period-actions") || event.target.closest?.(".period-top-resize-zone")) return;
    if (resizeModeId === item.id) {
      startResize(item, event);
      return;
    }
    startMovePeriod(item, event);
  };
  return (
    <div className="page-stack">
      <PageHeader eyebrow="English Timetable" title={scheduleView === "week" ? "Weekly English Schedule" : "Monthly English Calendar"} subtitle="Click any period to edit links, notes and lesson details without leaving the timetable." />
      <div className="schedule-toolbar">
        <div className="view-toggle" aria-label="Timetable view">
          <button className={scheduleView === "week" ? "active" : ""} onClick={() => setScheduleView("week")} type="button">Week</button>
          <button className={scheduleView === "month" ? "active" : ""} onClick={() => setScheduleView("month")} type="button">Month</button>
        </div>
        <div className="calendar-nav" aria-label="Calendar navigation">
          <button type="button" onClick={() => moveCalendar(-1)}><ChevronLeft /></button>
          <strong>{scheduleView === "week" ? weekLabel : monthLabel}</strong>
          <button type="button" onClick={() => moveCalendar(1)}><ChevronRight /></button>
        </div>
        <button className="primary-btn" onClick={addSlot}><Plus /> New slot</button>
      </div>
      {notice && <div className="success-note"><CheckCircle2 /> {notice}</div>}
      {resizePrompt && <div className="resize-instruction"><Clock /> {resizePrompt}</div>}
      <section className="schedule-layout">
        <Card title={scheduleView === "week" ? "This week" : monthLabel} subtitle={scheduleView === "week" ? `English periods · ${weekLabel}` : "Recurring English lessons from the weekly timetable"} className="span-3">
          {scheduleView === "week" ? (
            <div className="timetable-shell">
              <div className="timetable-grid" style={{ "--hour-row-height": `${hourRowHeight}px`, "--day-min-width": `${Number(tableSettings.dayWidth || 130)}px` }}>
                <div className="time-head" />
                {days.map((day, index) => <div className="day-head" key={day}>{day}<small>{weekDates[index].toLocaleDateString("en-MY", { day: "numeric", month: "short" })}</small></div>)}
                {slots.map((slot, row) => (
                  <React.Fragment key={slot}>
                    <div className="time-cell">{slot}</div>
                    {days.map((day, column) => {
                      const cellDate = weekDates[column];
                      const cellItems = classes.filter((c) => c.day === column && c.slot === row && !isOccurrenceDeleted(c, cellDate));
                      return (
                        <div className="period-cell" key={`${day}-${slot}`}>
                          {cellItems.map((item) => (
                            <div key={item.id} className={`period ${item.tone} duration-${Number(item.durationMinutes || 60) <= 30 ? "short" : Number(item.durationMinutes || 60) <= 60 ? "medium" : "long"} ${resizeModeId === item.id ? "is-resizing" : ""} ${draggingId === item.id ? "is-dragging" : ""}`} style={periodStyle(item)} onPointerDown={(event) => handlePeriodPointerDown(item, event)}>
                              {resizeModeId === item.id && <button type="button" className="period-top-resize-zone" aria-label="Adjust start time" onPointerDown={(event) => startTopResize(item, event)} />}
                              <div className="period-main">
                                <strong>{item.className || "Unassigned class"}</strong>
                                <span className="period-topic">{item.topic}</span>
                                <small className="period-meta">{item.skill} · {item.year}</small>
                                <em>{item.status}</em>
                                <i className="period-time">{timeRange(item)}</i>
                              </div>
                              <div className="period-actions" aria-label="Schedule block actions">
                                <button type="button" title="Edit block" onClick={() => openPeriod(item, cellDate)}><Pencil /></button>
                                <button type="button" title="Delete block" onClick={() => requestDelete(item, cellDate)}><Trash2 /></button>
                                <button type="button" title="Resize time" className="resize-btn" onClick={(event) => armResizeMode(item, event)}><Clock /></button>
                              </div>
                              {resizePreview?.id === item.id && <div className="resize-tooltip">{resizePreview.text}</div>}
                              {dragPreview?.id === item.id && <div className={`resize-tooltip ${dragPreview.invalid ? "invalid" : ""}`}>{dragPreview.text}</div>}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
              <div className="timetable-footer">
                <button className="table-settings-fab" type="button" onClick={() => setTableSettingsOpen(true)} aria-label="Open timetable settings"><Settings /> Table settings</button>
              </div>
            </div>
          ) : (
            <div className="month-calendar">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div className="month-day-head" key={day}>{day}</div>)}
              {monthCells.map((date, index) => {
                const dayLessons = lessonsForCalendarDate(date);
                return (
                  <div className={`month-cell ${date ? "" : "empty"} ${dayLessons.length ? "has-lessons" : ""}`} key={`${date?.toISOString() || "empty"}-${index}`}>
                    {date && <strong>{date.getDate()}</strong>}
                    <div className="month-lessons">
                      {dayLessons.slice(0, 4).map((item) => (
                        <button key={`${date?.getDate()}-${item.id}`} className={`month-lesson ${item.tone}`} onClick={() => openPeriod(item, date)} type="button">
                          <span>{item.time || slots[item.slot]}</span>
                          <b>{item.className || "Unassigned class"}</b>
                          <small>{item.topic}</small>
                        </button>
                      ))}
                      {dayLessons.length > 4 && <em>+{dayLessons.length - 4} more</em>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </section>
      {selectedPeriod && periodForm && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-header">
              <div><p className="eyebrow">Schedule Block</p><h2>{periodForm.topic || "Untitled period"}</h2></div>
              <button className="icon-btn" onClick={() => setSelectedPeriod(null)}><X /></button>
            </div>
            <div className="modal-color-picker" aria-label="Schedule block color">
              <span>Color</span>
              {scheduleColors.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  className={`color-pill ${color.id} ${periodForm.tone === color.id ? "selected" : ""}`}
                  onClick={() => updatePeriodForm("tone", color.id)}
                >
                  <i /> {color.label}
                </button>
              ))}
            </div>
            <div className="form-row">
              <label className="field"><span>Day</span><select value={periodForm.day} onChange={(event) => updatePeriodForm("day", Number(event.target.value))}>{days.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
              <label className="field"><span>Time</span><select value={periodForm.slot} onChange={(event) => { const slot = Number(event.target.value); updatePeriodForm("slot", slot); updatePeriodForm("time", slots[slot]); }}>{slots.map((slot, index) => <option key={slot} value={index}>{slot}</option>)}</select></label>
            </div>
            <div className="form-row">
              <label className="field">
                <span>Class</span>
                <select value={periodForm.classId || ""} onChange={(event) => applyScheduleClass(event.target.value)}>
                  <option value="">Select from class database</option>
                  {savedClasses.map((schoolClass) => <option key={schoolClass._id} value={schoolClass._id}>{schoolClass.name} · {schoolClass.year}</option>)}
                </select>
              </label>
              <label className="field"><span>Year</span><select value={periodForm.year || "Year 5"} onChange={(event) => updatePeriodForm("year", event.target.value)}><option>Year 1</option><option>Year 2</option><option>Year 3</option><option>Year 4</option><option>Year 5</option><option>Year 6</option></select></label>
            </div>
            <div className="form-row">
              <label className="field"><span>Skill</span><select value={periodForm.skill || "Reading"} onChange={(event) => updatePeriodForm("skill", event.target.value)}><option>Reading</option><option>Writing</option><option>Speaking</option><option>Listening</option><option>Grammar</option><option>Phonics</option></select></label>
              <label className="field"><span>Status</span><select value={periodForm.status || "Needs RPH"} onChange={(event) => updatePeriodForm("status", event.target.value)}><option>Needs RPH</option><option>Draft</option><option>Ready</option><option>PBD due</option><option>Completed</option></select></label>
            </div>
            <label className="field"><span>Topic</span><input value={periodForm.topic || ""} onChange={(event) => updatePeriodForm("topic", event.target.value)} /></label>
            <label className="field">
              <span>Attach RPH from library</span>
              <select value={periodForm.lessonPlanId || ""} onChange={(event) => attachLessonPlan(event.target.value)}>
                <option value="">No RPH attached</option>
                {availableLessons.map((lesson) => (
                  <option key={lesson._id} value={lesson._id}>
                    {lesson.title || "Untitled RPH"} · {lesson.className || lesson.classId?.name || "General"}
                  </option>
                ))}
              </select>
            </label>
            {!availableLessons.length && <p className="body-copy">No saved RPH found for this class yet. Generate one first, then attach it here.</p>}
            <div className="form-row">
              <label className="field">
                <span>Material image</span>
                <input ref={materialImageRef} type="file" accept="image/*" onChange={(event) => attachMaterialImage(event.target.files?.[0])} />
              </label>
              <label className="field"><span>Assessment</span><input value={periodForm.assessment || ""} onChange={(event) => updatePeriodForm("assessment", event.target.value)} placeholder="PBD checklist, exit ticket..." /></label>
            </div>
            {periodForm.materialImageName && (
              <div className="image-attachment-preview">
                {periodForm.materialImageUrl && <img src={periodForm.materialImageUrl} alt={periodForm.materialImageName} />}
                <div><strong>{periodForm.materialImageName}</strong><span>Image attached to this schedule block</span></div>
                <button className="icon-btn" onClick={() => updatePeriodForm("materialImageName", "")}><X /></button>
              </div>
            )}
            <label className="field"><span>Notes</span><textarea rows="3" value={periodForm.notes || ""} onChange={(event) => updatePeriodForm("notes", event.target.value)} placeholder="Teacher notes, class constraints, intervention reminders" /></label>
            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => { setSelectedPeriod(null); setActivePage("lesson-planner"); }}><Sparkles /> Create lesson plan</button>
              <button className="secondary-btn" onClick={duplicatePeriod}><Plus /> Duplicate</button>
              <button className="secondary-btn" onClick={deletePeriod}><X /> Delete</button>
              <button className="primary-btn" onClick={savePeriod}><Save /> Save block</button>
            </div>
          </div>
        </div>
      )}
      {pendingDelete && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card delete-choice-modal">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Delete Schedule Block</p>
                <h2>{pendingDelete.topic || "Untitled period"}</h2>
              </div>
              <button className="icon-btn" onClick={() => setPendingDelete(null)}><X /></button>
            </div>
            <p className="body-copy">
              This lesson repeats across the calendar. Choose whether to remove only this occurrence or the whole recurring class block.
            </p>
            {pendingDelete.occurrenceDateLabel && (
              <div className="delete-date-note"><CalendarDays /> Selected occurrence: <strong>{pendingDelete.occurrenceDateLabel}</strong></div>
            )}
            <div className="delete-choice-grid">
              <button className="secondary-btn" disabled={!pendingDelete.occurrenceDateKey} onClick={deleteSingleOccurrence}><CalendarDays /> Delete this one only</button>
              <button className="danger-btn" onClick={deleteSeries}><Trash2 /> Delete all classes</button>
            </div>
          </div>
        </div>
      )}
      {tableSettingsOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card table-settings-modal">
            <div className="modal-header">
              <div><p className="eyebrow">Timetable Settings</p><h2>Adjust table layout</h2></div>
              <button className="icon-btn" onClick={() => setTableSettingsOpen(false)}><X /></button>
            </div>
            <div className="form-row">
              <label className="field"><span>School starts</span><input type="time" value={tableSettings.startTime} onChange={(event) => updateTableSetting("startTime", event.target.value)} /></label>
              <label className="field"><span>School ends</span><input type="time" value={tableSettings.endTime} onChange={(event) => updateTableSetting("endTime", event.target.value)} /></label>
            </div>
            <label className="field">
              <span>Time adjustment interval: {tableSettings.snapMinutes} min</span>
              <input type="range" min="1" max="60" step="1" value={tableSettings.snapMinutes} onChange={(event) => updateTableSetting("snapMinutes", Number(event.target.value))} />
            </label>
            <div className="quick-intervals">
              {[1, 5, 10, 15, 30, 60].map((minutes) => (
                <button key={minutes} type="button" className={tableSettings.snapMinutes === minutes ? "active" : ""} onClick={() => updateTableSetting("snapMinutes", minutes)}>{minutes} min</button>
              ))}
            </div>
            <label className="field">
              <span>Table row height: {tableSettings.rowHeight}px</span>
              <input type="range" min="72" max="150" step="2" value={tableSettings.rowHeight} onChange={(event) => updateTableSetting("rowHeight", Number(event.target.value))} />
            </label>
            <label className="field">
              <span>Day column width: {tableSettings.dayWidth}px</span>
              <input type="range" min="110" max="240" step="5" value={tableSettings.dayWidth} onChange={(event) => updateTableSetting("dayWidth", Number(event.target.value))} />
            </label>
            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => setTableSettings({ startTime: "08:00", endTime: "15:00", snapMinutes: 15, rowHeight: 110, dayWidth: 130 })}><RefreshCw /> Reset</button>
              <button className="primary-btn" onClick={() => setTableSettingsOpen(false)}><Save /> Apply settings</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MaterialsPage({ liveMode }) {
  const [items, setItems] = useState(liveMode ? [] : materials);
  const [notice, setNotice] = useState("");
  const uploadRef = useRef(null);
  const uploadMaterial = (file) => {
    if (!file) return;
    setItems((current) => [{
      name: file.name,
      type: file.name.split(".").pop()?.toUpperCase() || "FILE",
      size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      subject: "English",
      updated: "Just now",
    }, ...current]);
    setNotice(`${file.name} added to English materials.`);
    uploadRef.current.value = "";
  };
  return (
    <div className="page-stack">
      <PageHeader eyebrow="Materials Library" title="English teaching materials." subtitle="Store files, link them to English RPH and generate follow-up activities." />
      <section className="page-toolbar">
        <input ref={uploadRef} className="hidden-file" type="file" onChange={(event) => uploadMaterial(event.target.files?.[0])} />
        <button className="secondary-btn" onClick={() => setNotice("New English folder created: Reading Support.")}><FolderOpen /> New folder</button>
        <button className="primary-btn" onClick={() => uploadRef.current?.click()}><Upload /> Upload</button>
      </section>
      {notice && <div className="success-note"><CheckCircle2 /> {notice}</div>}
      <section className="material-grid wide">{items.map((item) => <MaterialTile key={item.name} item={item} />)}{!items.length && <p className="body-copy">No live materials yet. Upload a file to start the library.</p>}</section>
    </div>
  );
}

function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState("Overview");
  const analyticsTabs = ["Overview", "Students", "Classes", "Topics", "Assessments", "Predictions", "AI Insights"];
  const tpTrend = [4.2, 4.35, 4.5, 4.6, 4.8];
  const weakTrend = [9, 8, 7, 5, 5];
  const studentProgress = [{ label: "Aishah", values: [2, 3, 3, 4, 4] }, { label: "Danish", values: [1, 2, 2, 2, 3] }, { label: "Nurul", values: [4, 4, 5, 5, 5] }];
  const radar = [{ label: "Grammar", value: 62 }, { label: "Writing", value: 58 }, { label: "Reading", value: 82 }, { label: "Communication", value: 74 }, { label: "Listening", value: 81 }, { label: "Critical", value: 66 }];
  const classCompare = [{ label: "2 Cemerlang", value: 76 }, { label: "5 Maju", value: 68 }, { label: "6 Amanah", value: 72 }, { label: "4 Bestari", value: 81 }];
  const topicMastery = [{ label: "Main idea", value: 86 }, { label: "Past tense", value: 58 }, { label: "Email writing", value: 55 }, { label: "Phonics", value: 74 }, { label: "Opinion", value: 69 }];
  const assessments = [{ label: "Quiz", value: 40 }, { label: "Observation", value: 24 }, { label: "Project", value: 22 }, { label: "Oral", value: 14 }];
  const scores = [{ label: "Quiz 1", value: 72 }, { label: "Speaking", value: 68 }, { label: "Writing", value: 61 }, { label: "Project", value: 78 }];
  const scatter = [{ x: 96, y: 5.2 }, { x: 88, y: 4.4 }, { x: 74, y: 3.3 }, { x: 66, y: 2.7 }, { x: 92, y: 4.8 }, { x: 81, y: 3.9 }];

  const overview = (
    <>
      <section className="analytics-kpi-row">
        <MiniChartCard title="Average TP Trend" value="TP 4.8" note="Rising for 5 checks"><MiniLineChart values={tpTrend} max={6} /></MiniChartCard>
        <MiniChartCard title="Evidence Completion" value="87%" note="PBD records captured"><RadialGauge value={87} /></MiniChartCard>
        <MiniChartCard title="Pupils Needing Support" value="5" note="Down from 9"><AreaChart values={weakTrend} max={10} /></MiniChartCard>
      </section>
      <section className="analytics-tab-grid">
        <AnalysisCard
          className="wide"
          title="Mastery Distribution"
          question="How balanced is the class across TP1 to TP6?"
          insight="The class peak sits around TP4, which means most pupils can complete guided tasks but still need support to justify open-ended answers."
          action="Use a 15-minute KBAT justification routine twice this week: claim, because, evidence."
        >
          <StandardDistribution />
        </AnalysisCard>
        <AnalysisCard
          title="Weak Students Trend"
          question="Are interventions reducing the support group?"
          insight="The number of weak pupils has dropped steadily, but the final group is persistent and likely needs targeted vocabulary scaffolds."
          action="Create a small-group vocabulary station for Danish, Iman, Zikri, Mira and Haziq."
        >
          <AreaChart values={weakTrend} max={10} />
        </AnalysisCard>
        <AnalysisCard
          title="Workspace Readiness"
          question="Is the teacher evidence base reliable?"
          insight="PBD completion is strong enough for meaningful decisions, but missing evidence may still hide weaker speaking performance."
          action="Add one oral observation checkpoint before the next writing task."
        >
          <RadialGauge value={87} />
        </AnalysisCard>
      </section>
    </>
  );

  const students = (
    <section className="analytics-tab-grid">
      <AnalysisCard
        className="wide"
        title="Individual Student Progress"
        question="Who is improving, stuck, or declining?"
        insight="Aishah and Nurul are stable or improving. Danish is moving slowly and needs a narrower objective for the next English lesson."
        action="Assign Danish a sentence-frame task and check one oral response before independent work."
      >
        <StudentProgressTracker series={studentProgress} />
      </AnalysisCard>
      <AnalysisCard
        title="Student Skill Radar"
        question="Which skill imbalance explains performance?"
        insight="Writing and grammar are the weakest points while reading and listening are relatively stronger."
        action="Pair reading comprehension with short guided writing, not a separate worksheet."
      >
        <RadarChart data={radar} />
      </AnalysisCard>
      <AnalysisCard
        title="Risk Prediction"
        question="Who needs intervention first?"
        insight="Five pupils form a high-risk group, mainly because vocabulary and written evidence are below class expectations."
        action="Start with low-cognitive-load vocabulary rehearsal, then sentence starters."
      >
        <RiskBreakdown />
      </AnalysisCard>
      <AnalysisCard
        className="wide"
        title="Student Topic Heatmap"
        question="Which exact topics need support?"
        insight="Email writing and past tense are the clearest blockers for lower-performing pupils."
        action="Reteach email format using a model, colour-coded parts and a shared class example."
      >
        <Heatmap />
      </AnalysisCard>
    </section>
  );

  const classes = (
    <section className="analytics-tab-grid">
      <AnalysisCard
        title="Class Comparison"
        question="Which class needs attention first?"
        insight="5 Maju is behind the other classes and should receive earlier scaffolding in upcoming English lessons."
        action="Schedule an additional guided practice block for 5 Maju before the next assessment."
      >
        <BarSet data={classCompare} />
      </AnalysisCard>
      <AnalysisCard
        title="TP Distribution Heatmap"
        question="Where are pupils concentrated?"
        insight="2 Cemerlang has a healthy TP4 cluster, while 5 Maju has more pupils sitting around TP2 and TP3."
        action="Use differentiated success criteria by class, not the same output target for all groups."
      >
        <TPHeatmap />
      </AnalysisCard>
      <AnalysisCard
        title="Class Spread"
        question="Is the class stable or uneven?"
        insight="The spread shows several outliers, so whole-class reteaching alone will not be efficient."
        action="Split pupils into quick support groups for vocabulary, sentence accuracy and extension."
      >
        <BoxPlot />
      </AnalysisCard>
      <AnalysisCard
        title="Attendance vs Performance"
        question="Does attendance explain TP?"
        insight="Lower attendance appears connected to lower TP for several pupils, but it does not explain all writing weakness."
        action="Combine catch-up notes with explicit writing practice for irregular attendance pupils."
      >
        <ScatterPlot points={scatter} />
      </AnalysisCard>
    </section>
  );

  const topics = (
    <section className="analytics-tab-grid">
      <AnalysisCard
        title="Topic Mastery"
        question="Which syllabus area is weakest?"
        insight="Email writing and past tense are dragging down the class average more than reading comprehension."
        action="Plan one integrated lesson: identify tense, build sentence, place it in an email."
      >
        <BarSet data={topicMastery} />
      </AnalysisCard>
      <AnalysisCard
        title="Topic Difficulty Trend"
        question="Are hard topics improving?"
        insight="Reading is improving faster than writing. Pupils can understand ideas but struggle to express them clearly."
        action="Add oral rehearsal before writing so pupils test their sentence verbally first."
      >
        <MultiLineChart series={[{ label: "Writing", values: [42, 48, 55, 58, 63] }, { label: "Reading", values: [68, 72, 76, 80, 86] }]} max={100} xLabels={["W1", "W2", "W3", "W4", "W5"]} />
      </AnalysisCard>
      <AnalysisCard
        className="wide"
        title="Failure Distribution"
        question="What causes the most breakdowns?"
        insight="Email format and past tense create most failed evidence because pupils lose structure before they can show meaning."
        action="Use a visual email template and sentence substitution table for the next writing cycle."
      >
        <Treemap data={[{ label: "Email format", value: 34 }, { label: "Past tense", value: 26 }, { label: "Vocabulary", value: 22 }, { label: "Main idea", value: 18 }]} />
      </AnalysisCard>
    </section>
  );

  const assessmentsView = (
    <section className="analytics-tab-grid">
      <AnalysisCard
        title="Assessment Type Distribution"
        question="Are evidence methods balanced?"
        insight="Quiz evidence is overrepresented. Oral and observation evidence should increase to reflect primary ESL learning."
        action="Add one speaking checklist and one observation rubric this week."
      >
        <DonutChart data={assessments} />
      </AnalysisCard>
      <AnalysisCard
        title="Assessment Score Summary"
        question="Which assessment was hardest?"
        insight="Writing has the lowest average score, which matches the topic and student-level risk signals."
        action="Review the writing rubric and add a guided draft before the marked task."
      >
        <AssessmentScoreSummary data={scores} />
      </AnalysisCard>
      <AnalysisCard
        className="wide"
        title="Completion Timeline"
        question="What is overdue?"
        insight="The writing assessment is overdue, so analytics may understate current writing progress."
        action="Complete the writing evidence collection before generating parent reports."
      >
        <TimelineChart />
      </AnalysisCard>
    </section>
  );

  const predictions = (
    <section className="analytics-tab-grid">
      <AnalysisCard
        title="Predicted TP Progression"
        question="Where will pupils be next month?"
        insight="The forecast is positive if current interventions continue, but writing progress remains slower."
        action="Keep the reading routine and add one structured writing conference per week."
      >
        <ProjectionChart />
      </AnalysisCard>
      <AnalysisCard
        title="Intervention Priority Matrix"
        question="Who should receive support first?"
        insight="Danish and Zikri are high-risk and high-importance because they are close to moving up a TP band."
        action="Prioritise them for teacher conferencing before assigning independent tasks."
      >
        <PriorityMatrix />
      </AnalysisCard>
      <AnalysisCard
        className="wide"
        title="Learning Decline Detection"
        question="Where is performance dropping?"
        insight="Writing performance shows three consecutive drops. This is an anomaly worth acting on immediately."
        action="Pause new writing content and reteach sentence construction with shared examples."
      >
        <AnomalyChart />
      </AnalysisCard>
    </section>
  );

  const insights = (
    <section className="ai-analysis-grid">
      <AIAnalysisBlock
        title="Writing is the main intervention point"
        context="Across topic, assessment and student risk data, writing appears as the common weakness."
        evidence="Lowest assessment average: Writing 61%. Weak topics: email writing, past tense and vocabulary."
        action="Run a 20-minute writing repair lesson with model text, sentence frames and peer checking."
      />
      <AIAnalysisBlock
        title="Reading comprehension is ready for extension"
        context="Reading comprehension is improving and now supports higher-order questions."
        evidence="Topic mastery for main idea is 86%, and reading trend is rising faster than writing."
        action="Add one KBAT oral question before the written response to bridge understanding into expression."
      />
      <AIAnalysisBlock
        title="Evidence collection needs more speaking data"
        context="The current evidence balance leans too heavily on quizzes and written outputs."
        evidence="Oral evidence is only 14% of recorded assessment methods."
        action="Use a simple speaking rubric during pair work and record TP evidence immediately."
      />
    </section>
  );

  const tabViews = { Overview: overview, Students: students, Classes: classes, Topics: topics, Assessments: assessmentsView, Predictions: predictions, "AI Insights": insights };

  return (
    <div className="page-stack">
      <PageHeader eyebrow="English Analytics" title="Analytics workspace." subtitle="Move from overview to comparison, diagnosis and intervention decisions." />
      <section className="analytics-control-panel">
        <div className="analytics-tabs" role="tablist" aria-label="Analytics sections">
          {analyticsTabs.map((tab) => (
            <button key={tab} role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </div>
        <div className="analytics-filter-row">
          <label><span>Class</span><select><option>All English classes</option><option>2 Cemerlang</option><option>5 Maju</option></select></label>
          <label><span>Date range</span><select><option>This term</option><option>This month</option><option>Last 4 weeks</option></select></label>
          <label><span>Topic focus</span><select><option>All topics</option><option>Writing</option><option>Reading</option><option>Vocabulary</option></select></label>
        </div>
      </section>

      <AnalyticsSection title={activeTab} subtitle="Each view connects data to diagnosis and a practical classroom move.">
        {tabViews[activeTab]}
      </AnalyticsSection>
    </div>
  );
}

function AnalysisCard({ title, question, insight, action, className = "", children }) {
  return (
    <article className={`analysis-card ${className}`}>
      <header className="analysis-card-head">
        <div>
          <h3>{title}</h3>
          <p>{question}</p>
        </div>
        <span className="risk-pill low">AI interpreted</span>
      </header>
      <div className="analysis-visual">{children}</div>
      <div className="analysis-narrative">
        <div>
          <strong>What this means</strong>
          <p>{insight}</p>
        </div>
        <div>
          <strong>Suggested intervention</strong>
          <p>{action}</p>
        </div>
      </div>
    </article>
  );
}

function AIAnalysisBlock({ title, context, evidence, action }) {
  return (
    <article className="ai-analysis-block">
      <span><BrainCircuit /> AI teaching analysis</span>
      <h3>{title}</h3>
      <p>{context}</p>
      <div><strong>Evidence</strong><p>{evidence}</p></div>
      <div><strong>Recommended action</strong><p>{action}</p></div>
    </article>
  );
}

function AnalyticsSection({ title, subtitle, children }) {
  return <section className="analytics-layer"><div className="analytics-layer-head"><div><h2>{title}</h2><p>{subtitle}</p></div></div><div className="analytics-grid">{children}</div></section>;
}

function MiniChartCard({ title, value, note, className = "", children }) {
  return <article className={`mini-chart-card ${className}`}><div><span>{title}</span><strong>{value}</strong><small>{note}</small></div>{children}</article>;
}

function buildChartPoints(values, max, width = 280, height = 120, padX = 16, padY = 14) {
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  return values.map((value, index) => ({
    x: padX + (index / Math.max(1, values.length - 1)) * innerW,
    y: padY + innerH - (value / max) * innerH,
    value,
  }));
}

function ChartGrid({ width, height, padX = 16, padY = 14, rows = 3 }) {
  const innerH = height - padY * 2;
  return (
    <>
      {Array.from({ length: rows }, (_, index) => {
        const y = padY + (innerH / rows) * index;
        return <line key={index} x1={padX} y1={y} x2={width - padX} y2={y} className="chart-grid-line" />;
      })}
    </>
  );
}

function MiniLineChart({ values, max = 100, tone = "primary" }) {
  const width = 280;
  const height = 100;
  const points = buildChartPoints(values, max, width, height);
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  return (
    <div className={`chart-frame mini tone-${tone}`}>
      <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <ChartGrid width={width} height={height} />
        <polyline points={polyline} className="chart-line" />
        {points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="2.5" className="chart-dot" />)}
      </svg>
    </div>
  );
}

function AreaChart({ values, max = 100, tone = "primary" }) {
  const width = 280;
  const height = 120;
  const points = buildChartPoints(values, max, width, height);
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const baseline = height - 14;
  const area = `${points[0].x},${baseline} ${polyline} ${points[points.length - 1].x},${baseline}`;
  return (
    <div className={`chart-frame area tone-${tone}`}>
      <svg className="chart-svg area" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <ChartGrid width={width} height={height} />
        <polygon points={area} className="chart-area-fill" />
        <polyline points={polyline} className="chart-line" />
        {points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="2.5" className="chart-dot" />)}
      </svg>
    </div>
  );
}

function MultiLineChart({ series, max = 100, xLabels = [] }) {
  const width = 320;
  const height = 180;
  const padX = 28;
  const padY = 18;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2 - 18;
  const labels = xLabels.length ? xLabels : series[0]?.values.map((_, index) => `W${index + 1}`) || [];
  return (
    <div className="chart-panel">
      <svg className="multi-line-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <ChartGrid width={width} height={height - 18} padX={padX} padY={padY} />
        {series.map((item, seriesIndex) => {
          const points = item.values.map((value, index) => {
            const x = padX + (index / Math.max(1, item.values.length - 1)) * innerW;
            const y = padY + innerH - (value / max) * innerH;
            return { x, y, value };
          });
          const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
          return (
            <g key={item.label}>
              <polyline points={polyline} className={`line-${seriesIndex}`} />
              {points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="3" className={`chart-dot line-${seriesIndex}`} />)}
            </g>
          );
        })}
        {labels.map((label, index) => {
          const x = padX + (index / Math.max(1, labels.length - 1)) * innerW;
          return <text key={label} x={x} y={height - 4} className="chart-axis-label">{label}</text>;
        })}
      </svg>
      <div className="chart-legend">{series.map((item, index) => <span key={item.label}><i className={`line-${index}`} />{item.label}</span>)}</div>
    </div>
  );
}

function StudentProgressTracker({ series }) {
  const labels = ["Baseline", "Quiz 1", "Oral", "Writing", "Latest"];
  return (
    <div className="student-progress-tracker">
      <div className="progress-head"><span>Pupil</span>{labels.map((label) => <span key={label}>{label}</span>)}<span>Change</span><span>Action</span></div>
      {series.map((student) => {
        const first = student.values[0];
        const latest = student.values[student.values.length - 1];
        const change = latest - first;
        const action = latest <= 3 ? "Intervention" : change === 0 ? "Monitor" : "On track";
        return (
          <div className="progress-row" key={student.label}>
            <strong>{student.label}</strong>
            {student.values.map((value, index) => <i key={index} className={value <= 2 ? "low" : value <= 4 ? "mid" : "high"}>TP{value}</i>)}
            <b className={change > 0 ? "up" : "flat"}>{change > 0 ? `+${change}` : change}</b>
            <em className={action === "Intervention" ? "urgent" : ""}>{action}</em>
          </div>
        );
      })}
    </div>
  );
}

function RadialGauge({ value }) {
  return <div className="radial-gauge" style={{ "--value": value }}><strong>{value}%</strong></div>;
}

function StackedBar({ segments }) {
  const colors = ["#df5a72", "#d89414", "#8b5cf6", "#6d4fd7", "#13a579", "#0ea5a5"];
  return <div className="stacked-bar-wrap"><div className="stacked-bar">{segments.map((value, index) => <span key={index} style={{ width: `${value}%`, background: colors[index] }} title={`TP${index + 1}: ${value}%`} />)}</div><div className="stacked-labels">{segments.map((value, index) => <small key={index}>TP{index + 1} {value}%</small>)}</div></div>;
}

function StandardDistribution() {
  const curve = "M18,88 C42,84 58,72 78,48 C96,24 118,18 138,34 C154,48 168,58 182,52";
  const bands = [
    { label: "TP1", width: 12, tone: "rose" },
    { label: "TP2", width: 16, tone: "amber" },
    { label: "TP3", width: 18, tone: "violet" },
    { label: "TP4", width: 24, tone: "primary" },
    { label: "TP5", width: 18, tone: "emerald" },
    { label: "TP6", width: 12, tone: "indigo" },
  ];
  return (
    <div className="standard-distribution">
      <div className="distribution-curve">
        <svg viewBox="0 0 200 110" preserveAspectRatio="xMidYMid meet">
          <ChartGrid width={200} height={96} padX={12} padY={10} rows={3} />
          <path className="curve-fill" d={`${curve} L182,96 L18,96 Z`} />
          <path className="curve-line" d={curve} />
          <line x1="128" y1="12" x2="128" y2="96" className="mean-line" />
          <circle cx="128" cy="34" r="4.5" className="mean-dot" />
        </svg>
        <i className="mean-marker"><em>Mean TP 4.1</em></i>
      </div>
      <div className="distribution-bands">
        {bands.map((band) => <span key={band.label} className={band.tone} style={{ flex: band.width }}><b>{band.label}</b></span>)}
      </div>
    </div>
  );
}

function RadarChart({ data }) {
  const size = 340;
  const center = size / 2;
  const radius = 92;
  const labelRadius = radius + 42;
  const levels = [25, 50, 75, 100];

  const getPoint = (index, value) => {
    const angle = (-90 + (360 / data.length) * index) * Math.PI / 180;
    const r = radius * (value / 100);
    return {
      x: center + Math.cos(angle) * r,
      y: center + Math.sin(angle) * r,
      lx: center + Math.cos(angle) * labelRadius,
      ly: center + Math.sin(angle) * labelRadius,
      ax: center + Math.cos(angle) * radius,
      ay: center + Math.sin(angle) * radius,
    };
  };

  const vertices = data.map((item, index) => ({ ...getPoint(index, item.value), ...item }));
  const polygonPoints = vertices.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="radar-chart-wrap">
      <svg className="radar-chart" viewBox={`0 0 ${size} ${size}`} preserveAspectRatio="xMidYMid meet">
        {levels.map((level) => <circle key={level} cx={center} cy={center} r={radius * (level / 100)} className="radar-grid" />)}
        {levels.map((level) => (
          <text key={`level-${level}`} x={center + 4} y={center - radius * (level / 100) + 4} className="radar-level">{level}</text>
        ))}
        {data.map((item, index) => {
          const point = getPoint(index, 100);
          return <line key={item.label} x1={center} y1={center} x2={point.ax} y2={point.ay} className="radar-spoke" />;
        })}
        <polygon points={polygonPoints} className="radar-area" />
        {vertices.map((point) => <circle key={point.label} cx={point.x} cy={point.y} r="5" className="radar-dot" />)}
        {vertices.map((point) => (
          <text key={`label-${point.label}`} x={point.lx} y={point.ly} className="radar-label">{point.label}</text>
        ))}
      </svg>
      <div className="radar-legend">
        {vertices.map((item) => (
          <span key={item.label} className={item.value < 65 ? "weak" : item.value < 80 ? "mid" : "strong"}>
            <b>{item.value}%</b>
            <small>{item.label}</small>
          </span>
        ))}
      </div>
    </div>
  );
}

function RiskBreakdown() {
  const groups = [
    { label: "High", count: 5, pupils: "Danish, Iman, Zikri, Mira, Haziq", tone: "high" },
    { label: "Medium", count: 9, pupils: "Needs monitoring after next writing task", tone: "medium" },
    { label: "Low", count: 18, pupils: "On track for current topic", tone: "low" },
  ];
  return (
    <div className="risk-breakdown">
      <div className="risk-summary">
        <strong>5</strong>
        <span>pupils need immediate support</span>
      </div>
      <div className="risk-bars">
        {groups.map((group) => (
          <div key={group.label} className={group.tone}>
            <label><b>{group.label} risk</b><span>{group.count} pupils</span></label>
            <i style={{ width: `${(group.count / 18) * 100}%` }} />
            <small>{group.pupils}</small>
          </div>
        ))}
      </div>
      <div className="risk-action"><AlertTriangle /> Start with vocabulary pre-teaching and sentence frames for the high-risk group.</div>
    </div>
  );
}

function TPHeatmap() {
  const rows = [["2 Cem", [1, 3, 7, 10, 4, 1]], ["5 Maju", [2, 5, 8, 7, 3, 0]], ["6 Amanah", [0, 2, 5, 9, 8, 4]]];
  return <div className="tp-heatmap"><span />{["TP1", "TP2", "TP3", "TP4", "TP5", "TP6"].map((tp) => <b key={tp}>{tp}</b>)}{rows.map(([label, values]) => <React.Fragment key={label}><strong>{label}</strong>{values.map((value, index) => <i key={`${label}-${index}`} style={{ "--heat": value / 12 }}>{value}</i>)}</React.Fragment>)}</div>;
}

function BoxPlot() {
  return <div className="box-plot"><span>TP2</span><div><i className="whisker" /><i className="box" /><i className="median" /><i className="outlier" /></div><span>TP6</span></div>;
}

function ScatterPlot({ points }) {
  return <div className="scatter-plot">{points.map((point, index) => <i key={index} style={{ left: `${point.x}%`, bottom: `${(point.y / 6) * 100}%` }} />)}<span>Attendance</span><b>TP</b></div>;
}

function Treemap({ data }) {
  return <div className="treemap">{data.map((item, index) => <div key={item.label} className={`tile-${index}`} style={{ flexGrow: item.value }}><strong>{item.label}</strong><span>{item.value}%</span></div>)}</div>;
}

function DonutChart({ data }) {
  const colors = ["#6d4fd7", "#13a579", "#d89414", "#df5a72"];
  let current = 0;
  const gradient = data.map((item, index) => {
    const start = current;
    current += item.value;
    return `${colors[index]} ${start}% ${current}%`;
  }).join(", ");
  return <div className="donut-wrap"><div className="donut-chart" style={{ background: `conic-gradient(${gradient})` }}><strong>100%</strong></div><div>{data.map((item, index) => <span key={item.label}><i style={{ background: colors[index] }} />{item.label} {item.value}%</span>)}</div></div>;
}

function VerticalBars({ data }) {
  return <div className="vertical-bars">{data.map((item) => <div key={item.label}><span style={{ height: `${item.value}%` }} /><small>{item.label}</small><b>{item.value}</b></div>)}</div>;
}

function AssessmentScoreSummary({ data }) {
  return (
    <div className="assessment-score-list">
      {data.map((item) => {
        const difficulty = item.value < 65 ? "Hard" : item.value < 75 ? "Moderate" : "Good";
        return (
          <div key={item.label}>
            <header><strong>{item.label}</strong><span>{item.value}% avg</span></header>
            <i><b style={{ width: `${item.value}%` }} /></i>
            <footer><small>Difficulty: {difficulty}</small><em>{item.value < 65 ? "Needs reteach" : item.value < 75 ? "Monitor" : "On track"}</em></footer>
          </div>
        );
      })}
    </div>
  );
}

function TimelineChart() {
  return <div className="timeline-chart">{["Quiz", "Observe", "Writing", "Project"].map((item, index) => <div key={item} className={index === 2 ? "late" : ""}><i /><strong>{item}</strong><span>{index === 2 ? "Overdue" : "Done"}</span></div>)}</div>;
}

function ProjectionChart() {
  return <MultiLineChart series={[{ label: "Actual", values: [3.6, 3.8, 4.1, 4.3] }, { label: "Forecast", values: [4.3, 4.5, 4.7, 4.9] }]} max={6} />;
}

function PriorityMatrix() {
  return <div className="priority-matrix"><span>High importance</span><span>High risk</span><i style={{ left: "72%", bottom: "78%" }}>Danish</i><i style={{ left: "60%", bottom: "64%" }}>Zikri</i><i style={{ left: "32%", bottom: "42%" }}>Mira</i></div>;
}

function AnomalyChart() {
  const values = [72, 74, 71, 62, 60, 58];
  return (
    <div className="anomaly-chart">
      <MiniLineChart values={values} max={100} tone="rose" />
      <div className="anomaly-copy">
        <strong>Writing decline detected</strong>
        <span>3 consecutive drops · latest 58%</span>
        <div className="anomaly-tags">
          {values.map((value, index) => (
            <em key={index} className={index >= 3 ? "drop" : ""}>{value}%</em>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReportsPage({ lessons = [], classes = [], compact = false, liveMode = false }) {
  const [classFilter, setClassFilter] = useState("all");
  const reports = ["Individual English PBD Report", "Full Class English Report", "TP Distribution Report", "Parent-Friendly English Progress Report"];
  const visibleLessons = classFilter === "all"
    ? lessons
    : lessons.filter((lesson) => {
      const lessonClassId = String(lesson.classId?._id || lesson.classId || "");
      if (classFilter === "legacy") return !lessonClassId;
      return lessonClassId === classFilter;
    });
  return (
    <div className="page-stack">
      {!compact && <PageHeader eyebrow="Reports" title="Generate English reports." subtitle="Clean formats for panel review, parents and administrators." />}
      <section className="report-grid">
        {reports.map((report) => <Card key={report} title={report} subtitle="PDF · print-friendly"><button className="secondary-btn"><Download /> Generate</button></Card>)}
      </section>
      {!compact && <Card title="RPH terkini" subtitle={`${visibleLessons.length || 4} rekod tersedia`}>
        <label className="field">
          <span>Filter by class</span>
          <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
            <option value="all">All lessons</option>
            <option value="legacy">Legacy lessons without class</option>
            {classes.map((schoolClass) => <option key={schoolClass._id} value={schoolClass._id}>{schoolClass.name} · {schoolClass.year}</option>)}
          </select>
        </label>
        <div className="material-grid">{(visibleLessons.length ? visibleLessons : liveMode ? [] : materials.slice(0, 4)).map((item) => <MaterialTile key={item._id || item.name} item={{ name: item.title || item.name, subject: item.classId?.name || item.className || item.subject || "RPH", size: item.year || item.type, updated: String(item.createdAt || item.updated || "Ready").slice(0, 10) }} />)}{!visibleLessons.length && liveMode && <p className="body-copy">No live lesson reports yet.</p>}</div>
      </Card>}
    </div>
  );
}

function renderAnnotatedContent(text, annotations, activeIndex, setActiveIndex) {
  if (!text || !annotations || !annotations.length) return text;

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

  if (!ranges.length) return text;

  ranges.sort((a, b) => a.start - b.start);

  const parts = [];
  let lastIndex = 0;

  ranges.forEach((range, i) => {
    if (range.start > lastIndex) {
      parts.push(text.slice(lastIndex, range.start));
    }
    const snippet = text.slice(range.start, range.end);
    parts.push(
      <mark
        key={`ann-${range.index}-${i}`}
        className={`highlight ${range.ann.severity || "medium"} ${range.index === activeIndex ? "active" : ""}`}
        onClick={() => setActiveIndex(range.index === activeIndex ? null : range.index)}
        title={range.ann.issue}
      >
        {snippet}
      </mark>
    );
    lastIndex = range.end;
  });

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

const SAMPLE_EVAL_LESSON = `Subject: English Language
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

function EvaluatePage({ lessons = [] }) {
  const [mode, setMode] = useState("text");
  const [textInput, setTextInput] = useState(SAMPLE_EVAL_LESSON);
  const [fileInput, setFileInput] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState(lessons[0]?._id || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [evaluatedText, setEvaluatedText] = useState("");
  const [annotations, setAnnotations] = useState([]);
  const [overallScore, setOverallScore] = useState(78);
  const [summary, setSummary] = useState("");
  const [activeIndex, setActiveIndex] = useState(null);
  const [activeTab, setActiveTab] = useState("comments");

  async function handleEvaluate(e) {
    if (e && e.preventDefault) e.preventDefault();
    setError("");
    setLoading(true);
    setActiveIndex(null);

    try {
      const formData = new FormData();
      let textToUse = "";

      if (mode === "file" && fileInput) {
        formData.append("file", fileInput);
      } else if (mode === "saved" && selectedLessonId) {
        const found = lessons.find((l) => l._id === selectedLessonId);
        if (found) {
          textToUse = typeof found.content === "string" && found.content.trim() ? found.content : lessonToText(found);
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
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || data.error || "Evaluation request failed.");
      }

      const returnedAnnotations = Array.isArray(data.annotations) ? data.annotations : [];
      setAnnotations(returnedAnnotations);
      setSummary(data.summary || `${returnedAnnotations.length} annotation(s) found for KSSR improvement.`);
      setOverallScore(data.overallScore || Math.max(50, 95 - returnedAnnotations.length * 7));
      
      if (mode === "file" && fileInput && !textToUse) {
        setEvaluatedText(`[Uploaded File: ${fileInput.name}]\n\n${data.lessonText || textInput}`);
      } else {
        setEvaluatedText(textToUse || textInput);
      }

      setActiveTab("comments");
    } catch (err) {
      setError(err.message || "Something went wrong during evaluation.");
    } finally {
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
            <button className="secondary-btn" onClick={() => { setEvaluatedText(""); setAnnotations([]); }}>
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
              <label>
                <span>Lesson Plan Text</span>
                <textarea
                  rows={12}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Paste your KSSR lesson plan text here..."
                  style={{ fontFamily: "monospace", fontSize: "0.95rem" }}
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
              <label>
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
                  <p className="muted" style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 10 }}>
                    No saved lessons found. Switch to Text or Upload tab to evaluate right away.
                  </p>
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
            </div>
          </form>
        </Card>
      ) : (
        <div className="docs-layout">
          <div className="document-panel">
            <div className="card-title-row" style={{ marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: "1.1rem", margin: 0 }}>Document View</h2>
                <small className="muted">{currentDisplayLength} characters · Click any highlighted phrase to jump to its comment</small>
              </div>
            </div>
            <div className="document-page">
              {renderAnnotatedContent(evaluatedText, annotations, activeIndex, setActiveIndex)}
            </div>
          </div>

          <div className="comments-panel">
            <div className="feedback-tabs">
              <button
                type="button"
                className={activeTab === "comments" ? "active" : ""}
                onClick={() => setActiveTab("comments")}
              >
                Comments ({annotations.length})
              </button>
              <button
                type="button"
                className={activeTab === "rubrics" ? "active" : ""}
                onClick={() => setActiveTab("rubrics")}
              >
                Rubric Score
              </button>
            </div>

            {activeTab === "comments" && (
              <div>
                {summary && (
                  <div style={{ marginBottom: 14, padding: 12, borderRadius: 12, background: "var(--soft)", border: "1px solid var(--border)", fontSize: "0.88rem" }}>
                    <strong>AI Review Summary:</strong>
                    <p className="muted" style={{ margin: "4px 0 0" }}>{summary}</p>
                  </div>
                )}

                {annotations.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>
                    <CheckCircle2 style={{ width: 36, height: 36, margin: "0 auto 8px", color: "var(--emerald)" }} />
                    <strong>No pedagogy issues found!</strong>
                    <p style={{ fontSize: "0.85rem", marginTop: 4 }}>This lesson plan demonstrates strong KSSR alignment and active student learning.</p>
                  </div>
                ) : (
                  annotations.map((ann, idx) => (
                    <div
                      key={idx}
                      className={`comment-card ${ann.severity || "medium"} ${idx === activeIndex ? "active" : ""}`}
                      onClick={() => setActiveIndex(idx === activeIndex ? null : idx)}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <strong style={{ color: "var(--foreground)" }}>{ann.issue || ann.category || "Pedagogy Note"}</strong>
                        <span className={`badge ${ann.severity === "high" ? "rose" : "amber"}`} style={{ textTransform: "uppercase", fontSize: "0.68rem" }}>
                          {ann.severity || "medium"}
                        </span>
                      </div>
                      
                      {ann.text && (
                        <div style={{ padding: "4px 8px", background: "color-mix(in srgb, var(--accent) 60%, transparent)", borderRadius: 6, fontSize: "0.82rem", fontFamily: "monospace", color: "var(--primary)" }}>
                          "{ann.text}"
                        </div>
                      )}

                      <span>{ann.explanation}</span>

                      {ann.suggestion && (
                        <div style={{ marginTop: 6, padding: 10, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}>
                          <strong style={{ fontSize: "0.82rem", color: "var(--primary)", display: "block", marginBottom: 2 }}>
                            Suggested Remedy:
                          </strong>
                          <span style={{ fontSize: "0.84rem", color: "var(--foreground)" }}>{ann.suggestion}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "rubrics" && (
              <div>
                <div className="rubric-score-card">
                  <small>AI Pedagogy Score</small>
                  <strong>{overallScore}%</strong>
                  <span style={{ fontSize: "0.82rem", opacity: 0.8 }}>
                    {overallScore >= 80 ? "High KSSR & PBD Readiness" : "Needs Scaffolding & Differentiation"}
                  </span>
                </div>

                <div className="rubric-list">
                  <div className="rubric-item">
                    <div>
                      <span>Student-Centered Active Learning</span>
                      <span>{Math.min(100, Math.max(40, overallScore - 4))}%</span>
                    </div>
                    <div className="rubric-bar">
                      <span style={{ width: `${Math.min(100, Math.max(40, overallScore - 4))}%` }} />
                    </div>
                  </div>

                  <div className="rubric-item">
                    <div>
                      <span>HOTS & Thinking Skills (KBAT)</span>
                      <span>{Math.min(100, Math.max(35, overallScore - 8))}%</span>
                    </div>
                    <div className="rubric-bar">
                      <span style={{ width: `${Math.min(100, Math.max(35, overallScore - 8))}%` }} />
                    </div>
                  </div>

                  <div className="rubric-item">
                    <div>
                      <span>PBD Formative Assessment Alignment</span>
                      <span>{Math.min(100, Math.max(45, overallScore + 2))}%</span>
                    </div>
                    <div className="rubric-bar">
                      <span style={{ width: `${Math.min(100, Math.max(45, overallScore + 2))}%` }} />
                    </div>
                  </div>

                  <div className="rubric-item">
                    <div>
                      <span>Differentiation & Support (TP1-TP6)</span>
                      <span>{Math.min(100, Math.max(30, overallScore - 12))}%</span>
                    </div>
                    <div className="rubric-bar">
                      <span style={{ width: `${Math.min(100, Math.max(30, overallScore - 12))}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsPage({ backendStatus, theme, setTheme, currentUser, setCurrentUser, handleLogout }) {
  const [profileDraft, setProfileDraft] = useState({
    name: currentUser?.name || "",
    school: currentUser?.school || "",
  });
  const [saveState, setSaveState] = useState("");

  useEffect(() => {
    setProfileDraft({
      name: currentUser?.name || "",
      school: currentUser?.school || "",
    });
  }, [currentUser]);

  const saveProfile = async () => {
    setSaveState("Saving...");
    try {
      const updated = await apiPut("/users/me", profileDraft);
      setCurrentUser(updated);
      setSaveState("Saved");
    } catch (error) {
      setSaveState(error.message || "Could not save profile");
    }
  };

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Settings" title="English workspace." subtitle="School profile, integration status and display preferences." />
      <section className="dashboard-grid">
        <Card title="Profile" subtitle={currentUser?.email || "Google account"}>
          <label className="field"><span>Name</span><input value={profileDraft.name} onChange={(event) => setProfileDraft((draft) => ({ ...draft, name: event.target.value }))} /></label>
          <label className="field"><span>School</span><input value={profileDraft.school} onChange={(event) => setProfileDraft((draft) => ({ ...draft, school: event.target.value }))} /></label>
          <button className="primary-btn full" onClick={saveProfile}><Save /> Save profile</button>
          {saveState && <p className="body-copy">{saveState}</p>}
        </Card>
        <Card title="System"><Metric title="Backend" value={backendStatus} note="ESLessonCraft API" tone={backendStatus.includes("Offline") ? "rose" : "emerald"} /><button className="secondary-btn full" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun /> : <Moon />} Change theme</button><button className="secondary-btn full" onClick={handleLogout}><LogOut /> Sign out</button></Card>
      </section>
    </div>
  );
}

function AICopilot({ open, setOpen, setActivePage }) {
  return <aside className={`copilot ${open ? "open" : ""}`}><div className="copilot-head"><div><p className="eyebrow">ESLessonCraft AI</p><h2>Copilot</h2></div><button className="icon-btn" onClick={() => setOpen(false)}><X /></button></div><div className="copilot-body"><Insight item={aiInsights[0]} onClick={() => setActivePage("pbd")} /><Insight item={aiInsights[1]} onClick={() => setActivePage("lesson-planner")} /><label className="field"><span>Ask AI</span><textarea rows="4" placeholder="Example: build a 15-minute English vocabulary intervention for TP2 pupils..." /></label><button className="primary-btn full"><Sparkles /> Generate suggestion</button></div></aside>;
}

function PageHeader({ eyebrow, title, subtitle, children }) {
  return <div className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{subtitle}</p></div>{children && <div className="header-actions">{children}</div>}</div>;
}

function Card({ title, subtitle, action, onAction, className = "", children }) {
  return <section className={`card ${className}`}><header>{<div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>}{action && <button onClick={onAction}>{action} <ArrowRight /></button>}</header>{children}</section>;
}

function StatCard({ stat }) {
  const icons = { indigo: BookOpen, amber: FileText, rose: ClipboardCheck, emerald: Clock };
  const Icon = icons[stat.tone] || BookOpen;
  return <div className="stat-card"><div><span className={`tone-icon ${stat.tone}`}><Icon /></span><small>{stat.trend}</small></div><strong>{stat.value}</strong><p>{stat.label}</p><span>{stat.hint}</span></div>;
}

function ClassRow({ item, onClick }) {
  return <button className={`class-row ${item.tone}`} onClick={onClick}><span>{item.time.split(" ")[0]}<small>60 min</small></span><div><strong>{item.subject} · {item.className}</strong><small>Topic: {item.topic}</small></div><ArrowRight /></button>;
}

function Insight({ item, onClick }) {
  return <button className="insight" onClick={onClick}><i className={item.tone} /><div><strong>{item.title}</strong><span>{item.body}</span><em>{item.action} <ArrowRight /></em></div></button>;
}

function Goal({ label, value, hint }) {
  return <div className="goal"><div><span>{label}</span><strong>{hint}</strong></div><Progress value={value} /></div>;
}

function Progress({ value }) {
  return <div className="progress"><span style={{ width: `${value}%` }} /></div>;
}

function MaterialTile({ item }) {
  return <button className="material-tile"><span><FileText /></span><div><strong>{item.name || item.title}</strong><small>{item.subject} · {item.size || item.year || "RPH"} · {item.updated || item.status || "Ready"}</small></div></button>;
}

function cleanAiDisplayText(value) {
  return String(value || "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function FormGrid({ form, updateForm, classes = [], applyClassContext }) {
  return (
    <div className="form-row">
      <label className="field"><span>English skill</span><select value={form.skill} onChange={(event) => updateForm("skill", event.target.value)}><option>Reading</option><option>Writing</option><option>Speaking</option><option>Listening</option><option>Grammar</option><option>Phonics</option></select></label>
      <label className="field"><span>Year</span><select value={form.year} onChange={(event) => updateForm("year", event.target.value)}><option>Year 1</option><option>Year 2</option><option>Year 3</option><option>Year 4</option><option>Year 5</option><option>Year 6</option></select></label>
      <label className="field">
        <span>Class</span>
        <select value={form.classId || ""} onChange={(event) => applyClassContext?.(event.target.value)}>
          <option value="">Select from class database</option>
          {classes.map((schoolClass) => <option key={schoolClass._id} value={schoolClass._id}>{schoolClass.name} · {schoolClass.year}</option>)}
        </select>
      </label>
      <label className="field"><span>Assessment</span><select value={form.assessmentType} onChange={(event) => updateForm("assessmentType", event.target.value)}><option>PBD observation, oral response and exit ticket</option><option>Reading response checklist</option><option>Speaking rubric and peer feedback</option><option>Writing sample and teacher conference</option><option>Listening task evidence</option></select></label>
    </div>
  );
}

function LessonPreview({ result }) {
  const sections = [
    ["Objectives", result.objectives],
    ["Success Criteria", result.successCriteria],
    ["Activities", result.activities],
    ["Assessment", result.assessment],
    ["Differentiation", result.differentiation],
  ];

  const formatLessonItem = (item) => {
    const text = cleanAiDisplayText(item).replace(/\s+/g, " ").trim();
    const labelPattern = /(\b(?:Content|Teacher|Pupils|Assessment|Observation|CBA|TS\/HoM\/HOTS|CCE|ICT|T&LM|AIEd|SS|21stCPP|DS|Value)\s*:)/g;
    if (text.length < 180 || !labelPattern.test(text)) return text;

    labelPattern.lastIndex = 0;
    const parts = text.split(labelPattern).filter(Boolean);
    const intro = parts[0] && !parts[0].endsWith(":") ? parts.shift() : "";
    const rows = [];
    for (let index = 0; index < parts.length; index += 2) {
      rows.push({
        label: (parts[index] || "").replace(":", "").trim(),
        value: cleanAiDisplayText(parts[index + 1] || "").trim(),
      });
    }

    return (
      <div className="structured-lesson-item">
        {intro && <strong>{intro}</strong>}
        {rows.map((row, index) => row.value && (
          <p key={`${row.label}-${index}`}>
            <b>{row.label}</b>
            <span>{row.value}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="ai-review-note">
        <AlertTriangle />
        <div>
          <strong>AI-generated content. Please check before using.</strong>
          <span>Gemini can make mistakes in standards, timing, assessment evidence, and classroom details. Review and edit the RPH before printing or downloading.</span>
        </div>
      </div>
      <div className="alignment-grid">
        <div><span>Content Standard</span><strong>{cleanAiDisplayText(result.kssrAlignment?.contentStandard || "English KSSR alignment generated.")}</strong></div>
        <div><span>Learning Standard</span><strong>{cleanAiDisplayText(result.kssrAlignment?.learningStandard || "Skill-aligned learning standard generated.")}</strong></div>
        <div><span>Learning Outcomes</span><strong>{cleanAiDisplayText(result.kssrAlignment?.learningOutcomes || result.skillOutcome || "Measurable English learning outcomes generated.")}</strong></div>
      </div>
      {sections.map(([title, items]) => (
        <div className="lesson-section" key={title}>
          <div><h3>{title}</h3><button><RefreshCw /> Regenerate</button></div>
          <ul>{(items || []).map((item, index) => <li key={`${title}-${index}`}>{formatLessonItem(item)}</li>)}</ul>
        </div>
      ))}
      <div className="lesson-section">
        <div><h3>Lesson Procedure</h3><button><RefreshCw /> Regenerate</button></div>
        <div className="procedure-list">
          {(result.procedure || []).map((stage, index) => (
            <article key={`${stage.stage}-${index}`}>
              <header><strong>{cleanAiDisplayText(stage.stage)}</strong><span>{stage.minutes || "-"} min</span></header>
              <p>{cleanAiDisplayText(stage.lessonContent)}</p>
              <small><b>Teacher:</b> {cleanAiDisplayText(stage.teacherActivities)}</small>
              <small><b>Pupils:</b> {cleanAiDisplayText(stage.pupilActivities)}</small>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}

function SkeletonList() {
  return (
    <div className="skeleton-list" aria-label="AI is generating lesson plan">
      <div className="ai-loading-head">
        <span className="ai-orb"><Sparkles /></span>
        <div>
          <strong>Gemini is crafting your RPH</strong>
          <small>Aligning KSSR standards, activities and PBD evidence</small>
        </div>
        <span className="typing-dots"><i /><i /><i /></span>
      </div>
      {["Objectives", "KSSR alignment", "Activities", "Assessment", "Differentiation"].map((label, index) => (
        <div className="skeleton-block" key={label} style={{ "--delay": `${index * 120}ms` }}>
          <b>{label}</b>
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

function Tabs({ tabs, active, setActive }) {
  return <div className="tabs">{tabs.map((tab) => <button key={tab} className={active === tab ? "active" : ""} onClick={() => setActive(tab)}>{tab}</button>)}</div>;
}

function Metric({ title, value, note, tone }) {
  return <div className="metric"><span className={`tone-icon ${tone}`}><BarChart3 /></span><p>{title}</p><strong>{value}</strong><small>{note}</small><Progress value={tone === "rose" ? 35 : 76} /></div>;
}

function BarSet({ data }) {
  const max = Math.max(...data.map((item) => item.value));
  return <div className="bar-set">{data.map((item) => <div key={item.label}><span>{item.label}</span><div><i style={{ width: `${(item.value / max) * 100}%` }} /></div><strong>{item.value}</strong></div>)}</div>;
}

function Badge({ tone = "indigo", children }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function TemplateGrid() {
  const templates = ["Oral Response", "Reading Comprehension", "Short Writing", "Group Presentation"];
  return <section className="report-grid"><button className="create-card"><Plus /> Create new template<span>Or generate with AI</span></button>{templates.map((name) => <Card key={name} title={name} subtitle="Reusable English PBD template"><button className="secondary-btn">Use</button></Card>)}</section>;
}

function RubricsPanel() {
  return <Card title="Rubrik PBD" subtitle="Kriteria boleh laras untuk TP1 hingga TP6"><BarSet data={[{ label: "Kefahaman", value: 80 }, { label: "Aplikasi", value: 68 }, { label: "Komunikasi", value: 74 }, { label: "Kolaborasi", value: 86 }]} /></Card>;
}

function PortfolioGrid({ students }) {
  return <section className="material-grid wide">{students.map((student) => <button className="student-card" key={student.id}><div>{student.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}</div><strong>{student.name}</strong><span>5 Bestari · TP{student.tp}</span><Progress value={student.score} /></button>)}</section>;
}

function UASAPanel() {
  return <section className="dashboard-grid"><Card className="span-2" title="AI Forecast · English UASA"><BarSet data={[{ label: "Reading", value: 82 }, { label: "Writing", value: 70 }, { label: "Grammar", value: 74 }, { label: "Speaking", value: 80 }]} /></Card><Card title="Forecast Summary"><p className="body-copy">78% of pupils are expected to reach grade B or above. Writing format and vocabulary precision remain the main risks.</p></Card></section>;
}

function AIAnalysis() {
  return <section className="dashboard-grid"><Card className="span-2" title="English Topic Mastery Heatmap"><Heatmap /></Card><Card title="Intervention Suggestion"><p className="body-copy">Use a 15-minute mini lesson, 3-4 pupil groups, picture cards, sentence frames and short oral checks.</p></Card></section>;
}

function Heatmap() {
  const students = ["Aishah", "Danish", "Iman", "Nurul", "Zikri", "Fatimah", "Haziq", "Mira"];
  const topics = ["Main Idea", "Past Tense", "Opinion", "Listening", "Email", "Phonics"];
  return <div className="heatmap"><div />{topics.map((topic) => <strong key={topic}>{topic}</strong>)}{students.map((student, row) => <React.Fragment key={student}><span>{student}</span>{topics.map((topic, col) => { const value = [82,65,78,70,60,75,45,38,52,48,35,50,40,35,48,42,32,45,92,85,90,88,82,90,48,42,55,50,38,52,95,90,92,94,88,93,72,68,75,70,65,72,62,58,65,60,55,63][row * 6 + col]; return <i key={topic} className={value > 80 ? "high" : value > 60 ? "mid" : "low"}>{value}</i>; })}</React.Fragment>)}</div>;
}

export default App;
