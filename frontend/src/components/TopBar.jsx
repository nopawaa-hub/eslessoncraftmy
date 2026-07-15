import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Bell, LogOut, Menu, Moon, Search, Sun } from "lucide-react";
import { useAppStore } from "../state/useAppStore.js";
import { pageIdToPath } from "../lib/nav.js";

function TopBar() {
  const navigate = useNavigate();

  // Subscribe to store slices needed by the topbar.
  const setMobileOpen = useAppStore((s) => s.setMobileOpen);
  const backendStatus = useAppStore((s) => s.backendStatus);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const currentUser = useAppStore((s) => s.currentUser);
  const logout = useAppStore((s) => s.logout);
  const lessons = useAppStore((s) => s.lessons);
  const classes = useAppStore((s) => s.classes);
  const materials = useAppStore((s) => s.materials);
  const students = useAppStore((s) => s.students);

  const initials = (currentUser?.name || currentUser?.email || "Teacher")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);

  // Ctrl/Cmd+K focuses the search
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.querySelector("input")?.focus();
        setShowResults(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Build a flat searchable index across all entities
  const results = (() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const match = (text) => String(text || "").toLowerCase().includes(q);
    const out = [];
    classes.forEach((c) => { if (match(c.name) || match(c.year) || match(c.subject) || match(c.studentProficiency)) out.push({ type: "Class", title: c.name, sub: `${c.year} · ${c.subject} · ${c.studentCount || 0} pupils`, page: "classes", id: c._id }); });
    students.forEach((s) => { if (match(s.studentName) || match(s.proficiency) || match(s.notes)) out.push({ type: "Pupil", title: s.studentName, sub: `${s.proficiency || "Mixed ability"}${s.notes ? " · " + s.notes : ""}`, page: "students" }); });
    lessons.forEach((l) => { if (match(l.title) || match(l.topic) || match(l.skill) || match(l.lessonDetails?.topic)) out.push({ type: "RPH", title: l.title || l.lessonDetails?.topic || "Untitled RPH", sub: `${l.lessonDetails?.year || l.year || ""} · ${l.skill || l.lessonDetails?.skill || "English"}`, page: "lesson-planner" }); });
    materials.forEach((m) => { if (match(m.title || m.name) || match(m.subject) || match(m.type)) out.push({ type: "Material", title: m.title || m.name, sub: `${m.subject || "English"} · ${m.type || "File"}`, page: "materials" }); });
    return out.slice(0, 8);
  })();

  const pickResult = (r) => {
    navigate(pageIdToPath(r.page));
    setQuery("");
    setShowResults(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="topbar">
      <button type="button" className="icon-btn mobile-only" onClick={() => setMobileOpen(true)}><Menu /></button>
      <div className={`search-box ${showResults && results.length ? "has-results" : ""}`} ref={searchRef} data-tour="search">
        <Search />
        <input
          placeholder="Search pupils, RPH, materials, classes…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
          onFocus={() => setShowResults(true)}
          onKeyDown={(e) => { if (e.key === "Escape") { setShowResults(false); e.target.blur(); } if (e.key === "Enter" && results[0]) pickResult(results[0]); }}
        />
        <kbd>Ctrl K</kbd>
        {showResults && results.length > 0 && (
          <div className="search-results">
            {results.map((r, i) => (
              <button key={i} className="search-result" onClick={() => pickResult(r)}>
                <span className={`search-result-type ${r.type.toLowerCase()}`}>{r.type}</span>
                <span className="search-result-text">
                  <strong>{r.title}</strong>
                  <small>{r.sub}</small>
                </span>
                <ArrowRight size={14} />
              </button>
            ))}
          </div>
        )}
        {showResults && query.trim() && !results.length && (
          <div className="search-results"><p className="search-empty">No matches for "{query}".</p></div>
        )}
      </div>
      <button type="button" className="icon-btn create-btn" aria-label="Search" title="Search pupils, RPH, materials, classes…" onClick={() => searchRef.current?.querySelector("input")?.focus()}><Search /></button>
      <button type="button" className="icon-btn" data-tour="theme-toggle" onClick={toggleTheme}>{theme === "dark" ? <Sun /> : <Moon />}</button>
      <button type="button" className="icon-btn notification" aria-label="Notifications" onMouseDown={(event) => event.preventDefault()}><Bell /><span /></button>
      <div className="profile">
        {currentUser?.picture ? <img src={currentUser.picture} alt="" /> : <div>{initials}</div>}
        <p><strong>{currentUser?.name || "Teacher"}</strong><span>{backendStatus}</span></p>
      </div>
      <button type="button" className="icon-btn" onClick={handleLogout} aria-label="Sign out"><LogOut /></button>
    </header>
  );
}

export default TopBar;
