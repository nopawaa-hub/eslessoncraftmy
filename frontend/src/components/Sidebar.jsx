import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { navGroups, pageIdToPath, PAGE_PATHS } from "../lib/nav.js";
import { useAppStore } from "../state/useAppStore.js";

function Sidebar() {
  // Read sidebar UI state + setters from the global store.
  const mobileOpen = useAppStore((s) => s.mobileOpen);
  const setMobileOpen = useAppStore((s) => s.setMobileOpen);

  const location = useLocation();
  const navigate = useNavigate();

  const [activeHighlightStyle, setActiveHighlightStyle] = useState({ top: 0, height: 44, opacity: 0 });
  const navRef = useRef(null);
  const itemRefs = useRef({});
  const allItems = navGroups.flatMap((g) => g.items);

  // Derive the active page id from the current URL path instead of a
  // useState("dashboard"). This keeps the sidebar highlight in sync with
  // browser Back/Forward navigation automatically.
  const pathToPageId = (path) => {
    for (const [id, p] of Object.entries(PAGE_PATHS)) {
      if (path === p) return id;
    }
    // Match nested paths like /lesson-planner/:draftId
    if (path.startsWith("/lesson-planner")) return "lesson-planner";
    return "dashboard";
  };
  const activePage = pathToPageId(location.pathname);
  const effectiveActivePage = activePage === "students" ? "classes" : activePage;

  useEffect(() => {
    const updateHighlight = () => {
      const activeEl = itemRefs.current[effectiveActivePage];
      if (activeEl) {
        setActiveHighlightStyle({
          top: activeEl.offsetTop,
          height: activeEl.offsetHeight || 44,
          opacity: 1,
        });
      }
    };
    updateHighlight();
    const timer1 = setTimeout(updateHighlight, 30);
    const timer2 = setTimeout(updateHighlight, 150);
    const timer3 = setTimeout(updateHighlight, 400);
    window.addEventListener("resize", updateHighlight);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      window.removeEventListener("resize", updateHighlight);
    };
  }, [effectiveActivePage, allItems.length, mobileOpen]);

  // Navigate via the router instead of setActivePage(id).
  const goTo = (pageId) => {
    navigate(pageIdToPath(pageId));
    setMobileOpen(false);
  };

  return (
    <>
      {mobileOpen && <button className="mobile-backdrop" onClick={() => setMobileOpen(false)} aria-label="Close menu" />}
      <aside className={`sidebar sidebar-dock ${mobileOpen ? "is-open" : ""}`} data-tour="sidebar">
        <div className="dock-logo">
          <img src="/logo.svg" alt="ESLessonCraft MY" />
        </div>
        <nav className="dock-nav" ref={navRef} onMouseEnter={() => {
          const activeEl = itemRefs.current[effectiveActivePage];
          if (activeEl) setActiveHighlightStyle({ top: activeEl.offsetTop, height: activeEl.offsetHeight || 44, opacity: 1 });
        }}>
          <div
            className="dock-active-highlight"
            style={{
              top: activeHighlightStyle.top,
              height: activeHighlightStyle.height,
              opacity: activeHighlightStyle.opacity,
            }}
          />
          {allItems.map((item) => {
            const Icon = item.icon;
            const active = effectiveActivePage === item.id;
            return (
              <button
                key={item.id}
                ref={(el) => (itemRefs.current[item.id] = el)}
                className={`dock-item ${active ? "active" : ""}`}
                data-tour={`nav-${item.id}`}
                onClick={() => goTo(item.id)}
                onMouseEnter={() => {
                  const activeEl = itemRefs.current[effectiveActivePage];
                  if (activeEl && activeEl.offsetParent !== null) {
                    setActiveHighlightStyle({
                      top: activeEl.offsetTop,
                      height: activeEl.offsetHeight || 44,
                      opacity: 1,
                    });
                  }
                }}
              >
                <div className="dock-item-icon-box">
                  <Icon />
                </div>
                <span className="dock-item-label">{item.label}</span>
                {item.badge && <b className="dock-badge">{item.badge}</b>}
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
