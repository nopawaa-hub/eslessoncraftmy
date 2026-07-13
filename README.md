# ESLessonCraft MY

> **🤖 AI ASSISTANTS & IDES PROTOCOL (`redeploy` / `update the website` / `commit changes` / `auto push`):**
> When prompted by the user to push updates online or redeploy, you **MUST automatically execute** our automated build and push workflow (without asking for manual intervention):
> ```powershell
> cd frontend && npm run build && cd .. && git add . && git commit -m "chore: update online deployment" && git push origin main
> # OR run our included automation script:
> powershell -ExecutionPolicy Bypass -File .\auto-push.ps1 -CommitMessage "chore: update online deployment"
> ```
> *For detailed rules and guidelines, refer to [`AI_INSTRUCTIONS.md`](./AI_INSTRUCTIONS.md), `.cursorrules`, `.windsurfrules`, and `.clinerules` at the root.*

ESLessonCraft MY is a Malaysian primary school KSSR AI teaching assistant for Year 1-Year 6 teachers.

It supports:

- Generate Lesson
- Analyze Lesson
- Improve Lesson
- Simulate Classroom
- Evaluate Lesson with Google Docs-style highlights and comments
- Saved lesson history
- Teaching schedule
- Assessment and student records
- DOCX lesson plan export based on the provided lesson plan template

## File Structure

```text
lessoncraft-my/
  frontend/
    index.html
    package.json
    tailwind.config.js
    postcss.config.js
    src/
      main.jsx
      App.jsx
      index.css
    generate.html
    analyze.html
    improve.html
    simulate.html
    evaluate.html
    history.html
    schedule.html
    assessment.html
    style.css
    script.js
  backend/
    server.js
    package.json
    models/
      LessonPlan.js
      Evaluation.js
      Schedule.js
      Assessment.js
      StudentRecord.js
    routes/
      analyze.js
      assessment.js
      evaluate.js
      generate.js
      improve.js
      kssrCheck.js
      lessonPlans.js
      schedule.js
      simulate.js
      studentRecord.js
    services/
      aiProvider.js
      db.js
      fileText.js
      kssrAnalyzer.js
      lessonDocx.js
      pedagogyEngine.js
    templates/
      lesson-plan-template.docx
  .env.example
```

## Frontend

The active frontend is now a React + Vite + Tailwind app that follows the LessonCraft MY dashboard framework.

Run it with:

```bash
cd lessoncraft-my/frontend
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

The older HTML/CSS/JS pages are still in the folder for reference, but `index.html` now mounts the React app.

## Navigation

The React app uses an internal sidebar with Dashboard, Lesson Plan AI, Evaluation Engine, Assessment, Schedule, and History Vault views.

It calls the existing backend endpoints:

- `POST /generate`
- `POST /analyze`
- `POST /improve`
- `POST /simulate`
- `POST /evaluate`
- `GET /lesson-plans`
- `DELETE /lesson-plans/:id`
- `POST /schedule`
- `GET /schedule`
- `POST /assessment`
- `GET /assessment`
- `POST /student-record`
- `GET /student-records`
- `POST /documents/lesson-plan`
- `GET /documents/lesson-plan/:id`

## Backend

The backend is Express, uses MongoDB through Mongoose, and uses Gemini only. The AI call is in:

```text
backend/services/aiProvider.js
```

Gemini endpoint:

```text
https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent
```

If Gemini fails or `GEMINI_API_KEY` is missing, each feature returns a realistic fallback mock response.

## Database Models

- `LessonPlan`: title, year, subject, topic, skill, content standard, learning standard, objectives, steps, created date.
- `Evaluation`: lesson plan reference, annotation array, summary, created date.
- `Schedule`: date, lesson plan reference, notes.
- `Assessment`: title, question array, year, subject.
- `StudentRecord`: student name, score array, calculated average, updated date.

## Run Locally

Install backend dependencies:

```bash
cd lessoncraft-my/backend
npm install
```

Create `backend/.env`:

```env
GEMINI_API_KEY=your_key
MONGO_URI=mongodb://127.0.0.1:27017/lessoncraft_my
PORT=3000
GOOGLE_CLIENT_ID=your_google_oauth_web_client_id.apps.googleusercontent.com
SESSION_SECRET=replace_with_a_long_random_string
```

Create `frontend/.env`:

```env
VITE_GOOGLE_CLIENT_ID=your_google_oauth_web_client_id.apps.googleusercontent.com
```

Start MongoDB first. If MongoDB is installed locally:

```bash
mongod --dbpath C:\data\db
```

Or use MongoDB Atlas and replace `MONGO_URI` with your Atlas connection string.

Start backend:

```bash
npm run dev
```

Start frontend in another terminal:

```bash
cd lessoncraft-my/frontend
npm install
npm run dev
```

Open the Vite URL, usually:

```text
http://127.0.0.1:5173
```

## File Upload

Analyze Lesson and Evaluate Lesson accept:

- `.txt`
- `.pdf`

The backend extracts text and sends it to the AI engine.

## KSSR Focus

The AI is instructed to focus on:

- Year 1-Year 6 only
- KSSR pedagogy
- Content Standard (CS)
- Learning Standard (LS)
- Learning Outcomes (LO)
- Measurable objectives
- Student-centered learning
- Simple child-friendly instructions
- Group work
- Visual support
- Scaffolded learning
- PBD evidence
