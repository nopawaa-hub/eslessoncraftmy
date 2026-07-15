import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Compass, LogOut, Moon, Save, Sun } from "lucide-react";
import { Card, PageHeader, Metric } from "../components/ui.jsx";
import { apiPut } from "../services/api.js";
import { pageIdToPath } from "../lib/nav.js";
import { useAppStore } from "../state/useAppStore.js";
import { useTheme } from "../hooks/useTheme.js";

export default function SettingsPage() {
  const navigate = useNavigate();
  const [theme, toggleTheme] = useTheme();

  // Store state
  const backendStatus = useAppStore((s) => s.backendStatus);
  const currentUser = useAppStore((s) => s.currentUser);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const logout = useAppStore((s) => s.logout);
  const availableModels = useAppStore((s) => s.availableModels);
  const selectedModel = useAppStore((s) => s.selectedModel);
  const selectModel = useAppStore((s) => s.selectModel);
  const drafts = useAppStore((s) => s.drafts);
  const deleteDraft = useAppStore((s) => s.deleteDraft);
  const setTourStep = useAppStore((s) => s.setTourStep);
  const setTourBranch = useAppStore((s) => s.setTourBranch);
  const setTourOpen = useAppStore((s) => s.setTourOpen);

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

  const startTour = useCallback(() => {
    setTourStep(0);
    setTourBranch(null);
    setTourOpen(true);
  }, [setTourStep, setTourBranch, setTourOpen]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const draftList = Object.values(drafts).sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Settings" title="English workspace." subtitle="School profile, AI model, integration status and display preferences." />
      <section className="dashboard-grid">
        <Card title="Profile" subtitle={currentUser?.email || "Google account"}>
          <label className="field"><span>Name</span><input value={profileDraft.name} onChange={(event) => setProfileDraft((draft) => ({ ...draft, name: event.target.value }))} /></label>
          <label className="field"><span>School</span><input value={profileDraft.school} onChange={(event) => setProfileDraft((draft) => ({ ...draft, school: event.target.value }))} /></label>
          <button className="primary-btn full" onClick={saveProfile}><Save /> Save profile</button>
          {saveState && <p className="body-copy">{saveState}</p>}
        </Card>
        <Card title="AI Model" subtitle="Choose the AI model for lesson generation and evaluation">
          <label className="field">
            <span>Model preference</span>
            <select value={selectedModel} onChange={(e) => selectModel(e.target.value)}>
              <option value="">Backend default (auto)</option>
              {availableModels.map((m) => (
                <option key={m.id || m} value={m.id || m}>{m.label || m.id || m}</option>
              ))}
            </select>
          </label>
          <p className="body-copy" style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
            Your choice is saved automatically and sent to the backend on each AI request. If the selected model is unavailable, the backend falls back to its default provider.
          </p>
        </Card>
        <Card title="System">
          <Metric title="Backend" value={backendStatus} note="ESLessonCraft API" tone={backendStatus.includes("Offline") ? "rose" : "emerald"} />
          <button className="secondary-btn full" onClick={toggleTheme}>{theme === "dark" ? <Sun /> : <Moon />} Change theme</button>
          <button className="secondary-btn full" onClick={startTour}><Compass /> Take a tour</button>
          <button className="secondary-btn full" onClick={handleLogout}><LogOut /> Sign out</button>
        </Card>
      </section>
      {draftList.length > 0 && (
        <Card title="Lesson Plan Drafts" subtitle={`${draftList.length} draft${draftList.length !== 1 ? "s" : ""} saved locally`}>
          <div className="material-grid">
            {draftList.map((d) => (
              <div key={d.id} className="material-tile" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 16px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--card-bg)" }}>
                <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => navigate(`/lesson-planner/${d.id}`)}>
                  <strong style={{ display: "block", fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.title || "Untitled RPH"}</strong>
                  <small style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{d.result ? "Generated" : "Draft"} · {d.form?.topic || "No topic"} · {new Date(d.updatedAt).toLocaleDateString()}</small>
                </div>
                <button type="button" className="icon-btn" title="Delete draft" onClick={(e) => { e.stopPropagation(); deleteDraft(d.id); }} style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", borderRadius: 6, flexShrink: 0 }}>
                  <LogOut size={16} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
