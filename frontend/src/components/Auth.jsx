import React, { useState, useEffect } from "react";
import { AlertTriangle, Moon, Sparkles, Sun } from "lucide-react";
import { apiPost, GOOGLE_CLIENT_ID } from "../services/api.js";
import { useAppStore } from "../state/useAppStore.js";
import { useTheme } from "../hooks/useTheme.js";

function AuthLoading() {
  const [theme] = useTheme();

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

function LoginScreen({ onDemoLogin }) {
  const [theme, toggleTheme] = useTheme();
  const backendStatus = useAppStore((s) => s.backendStatus);
  const login = useAppStore((s) => s.login);
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

    const onLoginResult = (result) => {
      login(result);
      onDemoLogin?.();
    };

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async ({ credential }) => {
        setBusy(true);
        setError("");
        try {
          const result = await apiPost("/auth/google", { credential });
          onLoginResult(result);
        } catch (loginError) {
          setError(loginError.message || "Google login failed.");
        } finally {
          setBusy(false);
        }
      },
    });
  }, [scriptReady, login, onDemoLogin]);

  const handleDemoLogin = () => {
    login({ token: "demo-token", user: { _id: "000000000000000000000001", name: "Cikgu Nur Aisyah (Demo Teacher)", email: "demo@test.com", role: "teacher", school: "SK Taman Bestari" } });
  };

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <div className="brand auth-brand">
          <div className="brand-mark"><img src="/logo.svg" alt="ESLessonCraft MY" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
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
        <button
          type="button"
          className="secondary-btn"
          style={{ width: "100%", marginTop: "0.75rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }}
          onClick={handleDemoLogin}
        >
          <Sparkles size={16} /> Continue as Demo Teacher (Skip Sign-in)
        </button>
        {busy && <p className="auth-status">Signing you in...</p>}
        {error && <p className="auth-error">{error}</p>}
        <footer className="auth-footer">
          <span>{backendStatus}</span>
          <button type="button" className="secondary-btn" onClick={toggleTheme}>{theme === "dark" ? <Sun /> : <Moon />} Theme</button>
        </footer>
      </section>
    </div>
  );
}

export { AuthLoading, LoginScreen };
export default LoginScreen;
