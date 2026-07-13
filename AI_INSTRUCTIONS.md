# 🤖 AI Assistant & IDE Auto-Deployment Protocol (`LessonCraft MY`)

> **ATTENTION ALL AI ASSISTANTS, IDES (Cursor, Windsurf, Cline, VS Code Copilot, Antigravity, etc.), AND DEVELOPERS:**
> When the user prompts you to **`redeploy`**, **`update the website`**, **`push online`**, **`sync to online`**, **`auto push`**, or **`commit changes`**, you **MUST follow the exact automated build and deployment workflow outlined below without asking the user for manual steps.**

---

## ⚡ Quick-Start: Auto-Push Command (One-Line Execution)

Whenever the user asks you to update the website online or redeploy, open a terminal in the root workspace directory (`c:\Users\neofa\Downloads\product-concept-pedagogy-os-malaysia-edition\lessoncraft-my`) and execute the following commands synchronously:

### Option A: Using PowerShell (Windows Default)
```powershell
cd c:\Users\neofa\Downloads\product-concept-pedagogy-os-malaysia-edition\lessoncraft-my\frontend
npm run build
cd ..
git add .
git commit -m "feat: automated update and online sync"
git push origin main
```

### Option B: Using the Automated PowerShell Script
We have provided a ready-to-run automation script at the root (`auto-push.ps1`). Run it directly:
```powershell
powershell -ExecutionPolicy Bypass -File .\auto-push.ps1 -CommitMessage "feat: automated website update"
```

---

## 📋 Mandatory Rules for AI Agents & IDEs

1. **Always Verify & Rebuild the Frontend First**:
   - The frontend is built using **React + Vite** located in `./frontend`.
   - Before running `git commit` or `git push`, you **MUST** ensure the production bundle inside `frontend/dist/` is up-to-date by running `npm run build` inside `./frontend`.
   - Never skip the build step; otherwise, the online Render/Vercel deployment or static serving might use outdated asset bundles (`dist/assets/index-*.js`).

2. **Commit Message Standards**:
   - Write clear, professional, concise Git commit messages summarizing all modified files or user requests (e.g., `feat: update analytics charts and pedagogical metrics`).
   - If the user simply says "redeploy" without specifying details, use: `chore: automated build and online redeployment`.

3. **Push to `main` Branch (`origin main`)**:
   - The production website automatically deploys via webhook from the `main` branch of `origin`.
   - Always push directly to `origin main` unless explicitly instructed to use a branch (`git push origin main`).

4. **Malaysian KSSR Pedagogy & Design Guidelines**:
   - **Target Audience**: Primary school English teachers in Malaysia (Year 1 to Year 6).
   - **Curriculum**: Keep all metrics, rubrics, and templates 100% aligned with **KSSR (Kurikulum Standard Sekolah Rendah)** and **PBD (Pentaksiran Bilik Darjah)**.
   - **No Placeholders**: Never insert Latin placeholder text (`Lorem ipsum`, `FERRILAT`, etc.) or generic random numbers. Always use realistic Malaysian classroom data (`TP1` to `TP6`, `SJKC / SK`, Malaysian pupil names like `Aishah`, `Zikri`, `Danish`).
   - **UI/UX**: Maintain vibrant, modern, high-contrast aesthetics (Glassmorphism, curated HSL tokens, smooth micro-animations, clear axes and descriptive chart headers).

---

## 📁 Repository Directory Reference

```text
lessoncraft-my/
├── AI_INSTRUCTIONS.md       <-- THIS FILE (Global IDE/AI Instructions)
├── auto-push.ps1            <-- PowerShell 1-Click Automated Build & Push Script
├── auto-push.bat            <-- Windows Batch 1-Click Automated Build & Push Script
├── .cursorrules             <-- Auto-loaded by Cursor IDE
├── .windsurfrules           <-- Auto-loaded by Windsurf IDE
├── .clinerules              <-- Auto-loaded by Cline/Roo Code IDE
├── frontend/                <-- React + Vite + Tailwind Frontend
│   ├── package.json
│   ├── src/
│   │   ├── App.jsx          <-- Main application code & UI components
│   │   ├── index.css        <-- Design tokens, themes & layout CSS
│   │   └── main.jsx
│   └── dist/                <-- Production build bundle (MUST be built before push)
└── backend/                 <-- Express + MongoDB + Gemini AI Backend
    ├── server.js
    ├── services/aiProvider.js
    └── models/
```

---

## 🔄 Verification Protocol After Auto-Push

Once `git push origin main` finishes successfully:
1. Inform the user that the production build was compiled cleanly (`dist/assets/index-*.js`).
2. Confirm that the changes have been pushed to `origin/main` (`git push origin main`).
3. Remind the user that the live hosting server (Render/Vercel) will automatically trigger a production build, which takes approximately **1–2 minutes**.
4. Advise the user to perform a hard refresh (`Ctrl + F5` or `Cmd + Shift + R`) on their live website URL once the deployment completes.
