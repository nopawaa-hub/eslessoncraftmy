import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config for the ESLessonCraft MY React frontend.
// plugin-react enables Fast Refresh + automatic JSX runtime in dev.
//
// In dev, API/auth/upload requests are proxied to the Express backend so the
// frontend can be served from a single origin (no CORS or API_BASE juggling).
// The backend must be running (default http://localhost:3000); adjust BACKEND_URL
// below if it runs elsewhere. Vite stays on its default port 5173.
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";

// Every path Express mounts as a router (see backend/server.js), plus
// /health and /uploads, is forwarded to the backend. Anything not listed
// here (the React app routes) is served by Vite.
const apiRoutes = [
  "/health",
  "/auth",
  "/uploads",
  "/analyze",
  "/simulate",
  "/improve",
  "/kssr-check",
  "/generate",
  "/evaluate",
  "/evaluations",
  "/lesson-plans",
  "/schedule",
  "/assessment",
  "/student-record",
  "/student-records",
  "/documents",
  "/schemes-of-work",
  "/users",
  "/classes",
  "/students",
  "/materials",
  "/copilot",
];

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: Object.fromEntries(
      apiRoutes.map((path) => [
        path,
        {
          target: BACKEND_URL,
          changeOrigin: true,
          // Secure: false allows self-signed certs if the backend uses HTTPS locally.
          secure: false,
        },
      ]),
    ),
  },
});
