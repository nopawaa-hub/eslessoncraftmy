import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config for the ESLessonCraft MY React frontend.
// plugin-react enables Fast Refresh + automatic JSX runtime in dev.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
