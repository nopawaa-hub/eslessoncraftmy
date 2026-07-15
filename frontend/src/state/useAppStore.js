import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  apiRequest,
  apiPost,
  AUTH_TOKEN_KEY,
} from "../services/api.js";

// Generate a draft ID. Uses crypto.randomUUID when available (modern browsers),
// falling back to a timestamp+random string for older environments.
function generateDraftId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

const TUTORIAL_KEY = "lessoncraft-tutorial-seen";

// ---------------------------------------------------------------------------
// Persisted slice — survives page refresh and navigation.
// Contains: theme, sidebar, preferences, drafts, history, copilot messages.
// Versioned so corrupt or old data is migrated/dropped instead of crashing.
// ---------------------------------------------------------------------------
// Non-persisted slice — re-fetched from the server on login.
// Contains: auth state, backend status, server collections.

export const useAppStore = create()(
  persist(
    (set, get) => ({
      // --- Persisted preferences ---
      theme: "light",
      sidebarCollapsed: false,
      selectedClassId: "",
      selectedModel: "",         // AI model preference (empty = backend default)
      promptSettings: {},         // reserved for future prompt-level settings

      // --- Drafts (lesson planner) ---
      // { [id]: { id, form, result, difficulty, quickPrompt, title, serverId, createdAt, updatedAt } }
      drafts: {},
      activeDraftId: null,

      // --- Generation history ---
      // [ { id, title, type, createdAt, payload } ]
      history: [],

      // --- Copilot chat (persisted so a conversation survives navigation) ---
      copilotMessages: [
        { role: "assistant", text: "Hi! I'm your versatile ESLessonCraft AI Copilot powered by general LLM capabilities. You can ask me anything — whether it's explaining general topics from the internet, English grammar rules, lesson ideas, or questions about your specific classes!" },
      ],

      // --- Non-persisted (in-memory only) ---
      hydrated: false,
      authChecked: false,
      currentUser: null,
      backendStatus: "Checking",
      availableModels: [],  // populated from /health

      // Server collections (re-fetched on login, never persisted)
      lessons: [],
      classes: [],
      materials: [],
      students: [],
      assessments: [],

      // UI state (in-memory)
      mobileOpen: false,
      copilotOpen: false,
      tourOpen: false,
      tourStep: 0,
      tourBranch: null,  // "class" | "planning" | "full"
      copilotFormDraft: null,

      // --- Generation/evaluation state (survives navigation, in-memory) ---
      // LessonPlanner: loading + error so a running generation is visible
      // even after navigating away and coming back.
      generateLoading: false,
      generateError: "",

      // EvaluatePage: the full evaluation result set so switching pages
      // doesn't lose the AI annotations, text, rubric, etc.
      evaluateState: {
        mode: "text",
        textInput: "",
        evaluatedText: "",
        annotations: [],
        overallScore: 78,
        rubric: null,
        summary: "",
        activeTab: "comments",
        lessonResult: null,
        fileDataUrl: null,
        fileType: null,
      },
      evaluateLoading: false,
      evaluateError: "",

      // -----------------------------------------------------------------
      // Actions — preferences
      // -----------------------------------------------------------------
      setTheme: (theme) => {
        if (typeof document !== "undefined") {
          document.documentElement.classList.toggle("dark", theme === "dark");
        }
        set({ theme });
      },
      toggleTheme: () => {
        const next = get().theme === "dark" ? "light" : "dark";
        get().setTheme(next);
      },
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setMobileOpen: (mobileOpen) => set({ mobileOpen }),
      setCopilotOpen: (copilotOpen) => set({ copilotOpen }),
      toggleCopilot: () => set((s) => ({ copilotOpen: !s.copilotOpen })),
      setSelectedClassId: (selectedClassId) => set({ selectedClassId }),
      setCopilotFormDraft: (copilotFormDraft) => set({ copilotFormDraft }),
      setTourOpen: (tourOpen) => set({ tourOpen }),
      setTourStep: (tourStep) => set({ tourStep }),
      setTourBranch: (tourBranch) => set({ tourBranch }),
      setBackendStatus: (backendStatus) => set({ backendStatus }),
      setAvailableModels: (availableModels) => set({ availableModels }),
      selectModel: (selectedModel) => set({ selectedModel }),
      setPromptSettings: (promptSettings) => set({ promptSettings }),

      // -----------------------------------------------------------------
      // Auth
      // -----------------------------------------------------------------
      setAuthChecked: (authChecked) => set({ authChecked }),
      setCurrentUser: (currentUser) => set({ currentUser }),

      login: ({ token, user }) => {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        set({ currentUser: user });
      },

      logout: async () => {
        try {
          await apiPost("/auth/logout", {});
        } catch {
          // Local sign-out should still clear the browser session.
        }
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(TUTORIAL_KEY);
        set({
          currentUser: null,
          lessons: [],
          classes: [],
          materials: [],
          students: [],
          assessments: [],
          activeDraftId: null,
          copilotFormDraft: null,
        });
      },

      // -----------------------------------------------------------------
      // Server collection refreshers (re-fetch from backend)
      // -----------------------------------------------------------------
      refreshLessons: async () => {
        try {
          const data = await apiRequest("/lesson-plans?subject=English");
          set({ lessons: data });
        } catch {
          set({ lessons: [] });
        }
      },
      refreshClasses: async () => {
        try {
          const data = await apiRequest("/classes");
          set({ classes: data });
        } catch {
          set({ classes: [] });
        }
      },
      refreshMaterials: async () => {
        try {
          const data = await apiRequest("/materials");
          set({ materials: data });
        } catch {
          set({ materials: [] });
        }
      },
      refreshStudents: async () => {
        try {
          const data = await apiRequest("/students");
          set({ students: data });
        } catch {
          set({ students: [] });
        }
      },
      refreshAssessments: async () => {
        try {
          const data = await apiRequest("/assessment");
          set({ assessments: data });
        } catch {
          set({ assessments: [] });
        }
      },
      refreshAll: async () => {
        const { refreshLessons, refreshClasses, refreshMaterials, refreshStudents, refreshAssessments } = get();
        await Promise.all([refreshLessons(), refreshClasses(), refreshMaterials(), refreshStudents(), refreshAssessments()]);
      },

      // Fetch /health to determine AI provider status + available models.
      checkBackendHealth: async () => {
        try {
          const data = await apiRequest("/health");
          if (data && data.ok) {
            const provider = data.aiProvider || "AI";
            let status;
            if (provider.includes("round-robin")) status = "AI Online (Gemini+GLM)";
            else if (provider.includes("gemini")) status = "Gemini Online";
            else status = `AI Online (${provider})`;
            set({ backendStatus: status, availableModels: data.availableModels || [] });
          } else {
            set({ backendStatus: "Backend Ready" });
          }
        } catch {
          set({ backendStatus: "Backend Offline" });
        }
      },

      // Check existing auth token on boot.
      checkAuth: async () => {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (!token) {
          set({ authChecked: true });
          return;
        }
        try {
          const user = await apiRequest("/auth/me");
          set({ currentUser: user, authChecked: true });
        } catch {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          set({ authChecked: true });
        }
      },

      // -----------------------------------------------------------------
      // Draft system — lesson planner drafts persisted to localStorage
      // -----------------------------------------------------------------
      createDraft: (overrides = {}) => {
        const id = generateDraftId();
        const now = Date.now();
        const draft = {
          id,
          form: null,        // null = use default empty form
          result: null,
          difficulty: 3,
          quickPrompt: "",
          title: "Untitled RPH",
          serverId: null,
          createdAt: now,
          updatedAt: now,
          ...overrides,
        };
        set((state) => ({
          drafts: { ...state.drafts, [id]: draft },
          activeDraftId: id,
        }));
        return id;
      },

      // Load a draft by ID. Returns the draft object or null.
      loadDraft: (id) => {
        const { drafts } = get();
        if (!id || !drafts[id]) return null;
        set({ activeDraftId: id });
        return drafts[id];
      },

      // Save (merge) changes into a draft. Called by the debounced autosave
      // and by the generate() success handler.
      saveDraft: (id, patch) => {
        if (!id) return;
        set((state) => {
          const existing = state.drafts[id];
          if (!existing) return state;
          const updated = { ...existing, ...patch, updatedAt: Date.now() };
          return { drafts: { ...state.drafts, [id]: updated } };
        });
      },

      // Delete a draft by ID.
      deleteDraft: (id) => {
        if (!id) return;
        set((state) => {
          const nextDrafts = { ...state.drafts };
          delete nextDrafts[id];
          const nextActive = state.activeDraftId === id ? null : state.activeDraftId;
          return { drafts: nextDrafts, activeDraftId: nextActive };
        });
      },

      // List all drafts sorted by most recently updated.
      listDrafts: () => {
        const { drafts } = get();
        return Object.values(drafts).sort((a, b) => b.updatedAt - a.updatedAt);
      },

      // -----------------------------------------------------------------
      // Generation history
      // -----------------------------------------------------------------
      pushHistory: (entry) => {
        const record = {
          id: generateDraftId(),
          createdAt: Date.now(),
          ...entry,
        };
        set((state) => ({ history: [record, ...state.history].slice(0, 100) }));
        return record;
      },

      // -----------------------------------------------------------------
      // Copilot chat
      // -----------------------------------------------------------------
      setCopilotMessages: (updater) => {
        set((state) => ({
          copilotMessages: typeof updater === "function" ? updater(state.copilotMessages) : updater,
        }));
      },

      // -----------------------------------------------------------------
      // Generation / Evaluation state (survives navigation)
      // -----------------------------------------------------------------
      setGenerateLoading: (generateLoading) => set({ generateLoading }),
      setGenerateError: (generateError) => set({ generateError }),

      setEvaluateLoading: (evaluateLoading) => set({ evaluateLoading }),
      setEvaluateError: (evaluateError) => set({ evaluateError }),

      // Merge a partial patch into the evaluateState object.
      setEvaluateState: (patch) => {
        set((state) => ({
          evaluateState: typeof patch === "function"
            ? patch(state.evaluateState)
            : { ...state.evaluateState, ...patch },
        }));
      },

      // Reset evaluation state back to defaults (e.g. on "Edit & Re-Evaluate").
      resetEvaluateState: () => {
        set({
          evaluateState: {
            mode: "text",
            textInput: "",
            evaluatedText: "",
            annotations: [],
            overallScore: 78,
            rubric: null,
            summary: "",
            activeTab: "comments",
            lessonResult: null,
            fileDataUrl: null,
            fileType: null,
          },
          evaluateLoading: false,
          evaluateError: "",
        });
      },
    }),
    {
      name: "lessoncraft-app-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),

      // Only persist these keys — server collections and auth are NOT persisted.
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        selectedClassId: state.selectedClassId,
        selectedModel: state.selectedModel,
        promptSettings: state.promptSettings,
        drafts: state.drafts,
        activeDraftId: state.activeDraftId,
        history: state.history,
        copilotMessages: state.copilotMessages,
        // Persist the evaluation text + mode so a pasted lesson + annotations
        // survive a page refresh. We persist a trimmed subset (not fileDataUrl
        // which can be very large for DOCX/PDF).
        evaluateState: state.evaluateState ? {
          mode: state.evaluateState.mode,
          textInput: state.evaluateState.textInput,
          evaluatedText: state.evaluateState.evaluatedText,
          annotations: state.evaluateState.annotations,
          overallScore: state.evaluateState.overallScore,
          rubric: state.evaluateState.rubric,
          summary: state.evaluateState.summary,
          activeTab: state.evaluateState.activeTab,
          lessonResult: state.evaluateState.lessonResult,
        } : {},
      }),

      // Drop incompatible persisted data instead of crashing.
      migrate: (persisted, version) => {
        if (!persisted || typeof persisted !== "object") return {};
        if (version < 1) return {};
        return persisted;
      },

      // Set the hydrated flag once storage is rehydrated on boot.
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);
