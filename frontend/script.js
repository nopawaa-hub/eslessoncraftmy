const API_BASE_URL = "http://localhost:3000";

const page = document.body.dataset.page;
const apiStatus = document.querySelector("#apiStatus");
const spinner = document.querySelector("#spinner");
const output = document.querySelector("#output");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setLoading(isLoading) {
  spinner?.classList.toggle("hidden", !isLoading);
  document.querySelectorAll("button").forEach((button) => {
    button.disabled = isLoading;
  });
}

function bindModeToggles() {
  document.querySelectorAll("[data-mode-group]").forEach((group) => {
    const scope = group.dataset.modeGroup;
    group.addEventListener("click", (event) => {
      const button = event.target.closest("[data-mode-button]");
      if (!button) return;
      group.querySelectorAll("[data-mode-button]").forEach((item) => item.classList.toggle("active", item === button));
      const form = group.closest("form") || document;
      form.querySelectorAll("[data-mode-panel]").forEach((panel) => {
        panel.classList.toggle("hidden", panel.dataset.modePanel !== button.dataset.modeButton);
      });
    });
    group.dataset.boundScope = scope;
  });
}

function bindFileLabels() {
  document.querySelectorAll('input[type="file"]').forEach((input) => {
    input.addEventListener("change", () => {
      const labelId = input.id === "lessonFile" && page === "analyze" ? "analyzeFileName" : "evaluateFileName";
      const label = document.querySelector(`#${labelId}`);
      if (input.files?.[0] && label) label.textContent = input.files[0].name;
    });
  });
}

function renderList(items) {
  const list = Array.isArray(items) && items.length ? items : ["No item returned."];
  return `<ul>${list.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function section(title, content) {
  return `<section class="result-section"><h3>${escapeHtml(title)}</h3>${content}</section>`;
}

function pill(value) {
  const level = String(value || "Medium").toLowerCase().includes("high")
    ? "high"
    : String(value || "Medium").toLowerCase().includes("low")
      ? "low"
      : "medium";
  return `<span class="pill ${level}">${escapeHtml(value)}</span>`;
}

async function typeHtml(target, html) {
  target.innerHTML = "";
  target.classList.remove("empty");
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  const nodes = [...wrapper.childNodes];

  for (const node of nodes) {
    target.appendChild(node);
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
}

async function postJson(path, body) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || data.error || "Request failed");
  return data;
}

async function getJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || data.error || "Request failed");
  return data;
}

async function deleteJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`, { method: "DELETE" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || data.error || "Request failed");
  return data;
}

async function putJson(path, body) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || data.error || "Request failed");
  return data;
}

async function postForm(path, formData) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || data.error || "Request failed");
  return data;
}

function showError(error) {
  if (output) {
    output.classList.remove("empty");
    output.innerHTML = section("Error", `<p>${escapeHtml(error.message)}</p>`);
  }
}

async function checkBackend() {
  if (!apiStatus) return;
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    apiStatus.textContent = data.aiProvider === "gemini" ? "Online" : "Fallback ready";
  } catch {
    apiStatus.textContent = "Backend offline";
  }
}

function bindGenerate() {
  document.querySelector("#generateForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const data = await postJson("/generate", {
        topic: document.querySelector("#topic").value,
        subject: document.querySelector("#subject")?.value || "English",
        year: document.querySelector("#year").value,
        skill: document.querySelector("#skill").value,
        classroomType: document.querySelector("#classroomType").value,
      });
      await typeHtml(
        output,
        section("Title", `<p>${escapeHtml(data.title)}</p>`) +
          section("Objectives", renderList(data.objectives)) +
          section("Activities", renderList(data.activities)) +
          section("Assessment", renderList(data.assessment)) +
          section(
            "KSSR Alignment",
            `<p><strong>CS:</strong> ${escapeHtml(data.kssrAlignment?.contentStandard)}</p>
             <p><strong>LS:</strong> ${escapeHtml(data.kssrAlignment?.learningStandard)}</p>
             <p><strong>LO:</strong> ${escapeHtml(data.kssrAlignment?.learningOutcomes)}</p>`,
          ) +
          section("Saved", `<p>Stored in MongoDB as lesson ID <strong>${escapeHtml(data.lessonPlanId || "not saved")}</strong>.</p>`),
      );
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  });
}

function buildLessonFormData() {
  const formData = new FormData();
  formData.append("lessonPlan", document.querySelector("#lessonPlan")?.value || "");
  const file = document.querySelector("#lessonFile")?.files?.[0];
  if (file) formData.append("file", file);
  return formData;
}

function bindAnalyze() {
  document.querySelector("#analyzeForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const file = document.querySelector("#lessonFile")?.files?.[0];
      const preview = document.querySelector("#analyzePreview");
      if (preview) {
        preview.classList.add("hidden");
        preview.innerHTML = "";
        if (file?.type === "application/pdf") {
          preview.classList.remove("hidden");
          preview.innerHTML = `<iframe src="${URL.createObjectURL(file)}" title="Uploaded lesson preview"></iframe>`;
        }
      }
      const data = await postForm("/analyze", buildLessonFormData());
      await typeHtml(
        output,
        `<div class="score-grid">
          <article class="score-card violet"><small>Engagement</small><strong>${escapeHtml(data.engagementLevel)}</strong></article>
          <article class="score-card green"><small>HOTS</small><strong>${escapeHtml(data.hotsLevel)}</strong></article>
        </div>` +
          section(
            "KSSR Alignment",
            `<p><strong>Communication:</strong> ${escapeHtml(data.kssrAlignment?.communication)}</p>
             <p><strong>Values:</strong> ${escapeHtml(data.kssrAlignment?.spiritualValues)}</p>
             <p><strong>Humanities:</strong> ${escapeHtml(data.kssrAlignment?.humanities)}</p>
             <p><strong>Science & Technology:</strong> ${escapeHtml(data.kssrAlignment?.scienceTechnology)}</p>
             <p><strong>Personal Skills:</strong> ${escapeHtml(data.kssrAlignment?.personalSkills)}</p>
             <p><strong>Physical & Aesthetic:</strong> ${escapeHtml(data.kssrAlignment?.physicalAesthetic)}</p>`,
          ) +
          section("PBD Assessment", `<p>${escapeHtml(data.pbdAssessment?.assessmentType)}</p><p>${escapeHtml(data.pbdAssessment?.evidence)}</p><p>${escapeHtml(data.pbdAssessment?.improvement)}</p>`) +
          section("Weaknesses", renderList(data.weaknesses)) +
          section("Improvements", renderList(data.improvements)),
      );
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  });
}

function bindImprove() {
  document.querySelector("#improveForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const data = await postJson("/improve", { lessonPlan: document.querySelector("#lessonPlan").value });
      await typeHtml(
        output,
        section("Improved Lesson", `<div class="lesson-text">${escapeHtml(data.improvedLesson)}</div>`) +
          section("Pedagogical Changes", renderList(data.pedagogicalMoves)) +
          section("Differentiation", renderList(data.differentiation)),
      );
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  });
}

function bindSimulate() {
  document.querySelector("#simulateForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const data = await postJson("/simulate", { lessonPlan: document.querySelector("#lessonPlan").value });
      await typeHtml(
        output,
        section("Engagement", `<span class="pill ${data.engagementPercent >= 70 ? "high" : data.engagementPercent >= 45 ? "medium" : "low"}">${escapeHtml(data.engagementPercent)}%</span>`) +
          section("Student Reactions", renderList(data.studentReactions)) +
          section("Teaching Issues", renderList(data.teachingIssues)),
      );
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  });
}

function highlightDocument(text, annotations) {
  let html = escapeHtml(text);
  annotations.forEach((annotation, index) => {
    const phrase = escapeHtml(annotation.text);
    if (!phrase) return;
    const marked = `<mark class="highlight ${annotation.severity === "high" ? "high" : "medium"}" data-comment="${index}" id="highlight-${index}">${phrase}</mark>`;
    html = html.replace(phrase, marked);
  });
  return html;
}

function selectComment(index) {
  document.querySelectorAll(".highlight, .comment-card").forEach((item) => item.classList.remove("active"));
  document.querySelector(`#highlight-${index}`)?.classList.add("active");
  document.querySelector(`#comment-${index}`)?.classList.add("active");
}

function scoreFromAnnotations(annotations, base = 88) {
  const penalty = annotations.reduce((total, item) => total + (item.severity === "high" ? 12 : 6), 0);
  return Math.max(35, Math.min(98, base - penalty));
}

function renderRubrics(annotations) {
  const highCount = annotations.filter((item) => item.severity === "high").length;
  const mediumCount = annotations.length - highCount;
  const rubrics = [
    ["KSSR Alignment", scoreFromAnnotations(annotations, 94), "#10b981"],
    ["HOTS (KBAT) Integration", Math.max(40, 82 - highCount * 14 - mediumCount * 4), "#f43f5e"],
    ["Pedagogical Flow", scoreFromAnnotations(annotations, 86), "#f59e0b"],
    ["Student Engagement", Math.max(42, 84 - highCount * 10 - mediumCount * 5), "#f59e0b"],
    ["Clarity & Structure", scoreFromAnnotations(annotations, 90), "#8b5cf6"],
  ];
  const overall = Math.round(rubrics.reduce((total, item) => total + item[1], 0) / rubrics.length);
  return `
    <section class="rubric-score-card">
      <small>Overall Score</small>
      <strong>${overall}</strong>
      <span>/100</span>
      <p>${overall >= 80 ? "Strong KSSR draft with minor refinement needed." : "Good start, but needs clearer HOTS and student-centered moves."}</p>
    </section>
    <div class="rubric-list">
      ${rubrics
        .map(
          ([name, score, color]) => `
            <article class="rubric-item">
              <div><span>${escapeHtml(name)}</span><b>${score}%</b></div>
              <div class="rubric-bar"><span style="width:${score}%;background:${color}"></span></div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function bindEvaluate() {
  document.querySelector("#evaluateForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const lessonText = document.querySelector("#lessonPlan").value;
      const file = document.querySelector("#lessonFile")?.files?.[0];
      const data = await postForm("/evaluate", buildLessonFormData());
      const doc = document.querySelector("#docOutput");
      const comments = document.querySelector("#commentsOutput");
      const rubrics = document.querySelector("#rubricsOutput");
      doc.classList.remove("empty");
      if (file?.type === "application/pdf") {
        doc.innerHTML = `<iframe class="pdf-frame" src="${URL.createObjectURL(file)}" title="Uploaded PDF preview"></iframe>`;
      } else {
        doc.innerHTML = highlightDocument(lessonText, data.annotations);
      }
      if (rubrics) {
        rubrics.classList.remove("comments-empty");
        rubrics.innerHTML = renderRubrics(data.annotations);
      }
      comments.classList.remove("comments-empty");
      comments.innerHTML = data.annotations
        .map(
          (annotation, index) => `
            <button class="comment-card ${annotation.severity === "high" ? "high" : "medium"}" id="comment-${index}" data-comment="${index}">
              <strong>${escapeHtml(annotation.issue)}</strong>
              <span><b>Text:</b> ${escapeHtml(annotation.text)}</span>
              <span><b>Why:</b> ${escapeHtml(annotation.explanation)}</span>
              <span><b>Suggestion:</b> ${escapeHtml(annotation.suggestion)}</span>
            </button>
          `,
        )
        .join("");
      selectComment(0);
    } catch (error) {
      document.querySelector("#docOutput").textContent = error.message;
    } finally {
      setLoading(false);
    }
  });

  document.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-feedback-tab]");
    if (tab) {
      document.querySelectorAll("[data-feedback-tab]").forEach((item) => item.classList.toggle("active", item === tab));
      document.querySelector("#rubricsOutput")?.classList.toggle("hidden", tab.dataset.feedbackTab !== "rubrics");
      document.querySelector("#commentsOutput")?.classList.toggle("hidden", tab.dataset.feedbackTab !== "comments");
      return;
    }
    const target = event.target.closest("[data-comment]");
    if (!target) return;
    const index = target.dataset.comment;
    selectComment(index);
    if (target.classList.contains("comment-card")) {
      document.querySelector(`#highlight-${index}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
}

function lessonSummary(lesson) {
  return `${escapeHtml(lesson.subject)} · ${escapeHtml(lesson.year)} · ${escapeHtml(lesson.skill)}`;
}

function renderLessonDetail(lesson) {
  return `
    <h3>${escapeHtml(lesson.title)}</h3>
    <p><strong>Topic:</strong> ${escapeHtml(lesson.topic)}</p>
    <p><strong>Subject:</strong> ${escapeHtml(lesson.subject)} | <strong>Year:</strong> ${escapeHtml(lesson.year)}</p>
    <p><strong>CS:</strong> ${escapeHtml(lesson.contentStandard || "Not specified")}</p>
    <p><strong>LS:</strong> ${escapeHtml(lesson.learningStandard || "Not specified")}</p>
    <h4>Objectives</h4>${renderList(lesson.objectives)}
    <h4>Steps</h4>${renderList(lesson.steps)}
  `;
}

async function loadHistory() {
  const list = document.querySelector("#historyList");
  if (!list) return;
  try {
    const lessons = await getJson("/lesson-plans");
    if (!lessons.length) {
      list.innerHTML = `<p class="muted">No saved lessons yet. Generate a lesson first.</p>`;
      return;
    }
    list.innerHTML = lessons
      .map(
        (lesson) => `
          <article class="data-row">
            <div>
              <strong>${escapeHtml(lesson.title)}</strong>
              <span>${lessonSummary(lesson)}</span>
            </div>
            <div class="mini-actions">
              <button data-view-lesson="${lesson._id}">View</button>
              <button data-edit-lesson="${lesson._id}">Edit</button>
              <a href="evaluate.html">Evaluate</a>
              <button class="danger-btn" data-delete-lesson="${lesson._id}">Delete</button>
            </div>
          </article>
        `,
      )
      .join("");
  } catch (error) {
    list.innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`;
  }
}

function bindHistory() {
  if (page !== "history") return;
  loadHistory();
  document.querySelector("#refreshHistory")?.addEventListener("click", loadHistory);
  document.addEventListener("click", async (event) => {
    const viewButton = event.target.closest("[data-view-lesson]");
    const editButton = event.target.closest("[data-edit-lesson]");
    const deleteButton = event.target.closest("[data-delete-lesson]");
    if (viewButton) {
      const detail = document.querySelector("#historyDetail");
      const lessonId = viewButton.dataset.viewLesson;
      const [lesson, evaluations] = await Promise.all([
        getJson(`/lesson-plans/${lessonId}`),
        getJson(`/evaluations/${lessonId}`).catch(() => []),
      ]);
      const latestEvaluation = evaluations[0];
      detail.classList.remove("hidden");
      detail.innerHTML =
        renderLessonDetail(lesson) +
        `<h4>Stored Evaluation Feedback</h4>` +
        (latestEvaluation
          ? renderList(latestEvaluation.annotations.map((item) => `${item.issue}: ${item.suggestion}`))
          : `<p class="muted">No saved evaluation yet. Open Evaluate Lesson to create highlighted feedback.</p>`);
    }
    if (editButton) {
      const lesson = await getJson(`/lesson-plans/${editButton.dataset.editLesson}`);
      const title = prompt("Update lesson title", lesson.title);
      if (title === null) return;
      const topic = prompt("Update topic", lesson.topic);
      if (topic === null) return;
      await putJson(`/lesson-plans/${lesson._id}`, { title, topic });
      await loadHistory();
    }
    if (deleteButton) {
      await deleteJson(`/lesson-plans/${deleteButton.dataset.deleteLesson}`);
      document.querySelector("#historyDetail")?.classList.add("hidden");
      await loadHistory();
    }
  });
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

async function loadScheduleData() {
  const lessonSelect = document.querySelector("#scheduleLesson");
  const scheduleList = document.querySelector("#scheduleList");
  const calendar = document.querySelector("#scheduleCalendar");
  if (!lessonSelect || !scheduleList || !calendar) return;
  try {
    const [lessons, schedule] = await Promise.all([getJson("/lesson-plans"), getJson("/schedule")]);
    lessonSelect.innerHTML = lessons.length
      ? lessons.map((lesson) => `<option value="${lesson._id}">${escapeHtml(lesson.title)} (${lessonSummary(lesson)})</option>`).join("")
      : `<option value="">Generate a lesson first</option>`;
    calendar.innerHTML = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() + index);
      const iso = date.toISOString().slice(0, 10);
      const count = schedule.filter((item) => String(item.date).slice(0, 10) === iso).length;
      return `<div class="calendar-day"><strong>${date.toLocaleDateString("en-MY", { weekday: "short" })}</strong><span>${date.getDate()}</span><small>${count} lesson${count === 1 ? "" : "s"}</small></div>`;
    }).join("");
    scheduleList.innerHTML = schedule.length
      ? schedule.map((item) => `
          <article class="data-row">
            <div><strong>${formatDate(item.date)}</strong><span>${escapeHtml(item.lessonPlanId?.title || "Deleted lesson")} · ${escapeHtml(item.notes || "No notes")}</span></div>
            <div class="mini-actions"><button class="danger-btn" data-delete-schedule="${item._id}">Delete</button></div>
          </article>
        `).join("")
      : `<p class="muted">No scheduled lessons yet.</p>`;
  } catch (error) {
    scheduleList.innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`;
  }
}

function bindSchedule() {
  if (page !== "schedule") return;
  document.querySelector("#scheduleDate").value = new Date().toISOString().slice(0, 10);
  loadScheduleData();
  document.querySelector("#refreshSchedule")?.addEventListener("click", loadScheduleData);
  document.querySelector("#scheduleForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await postJson("/schedule", {
        date: document.querySelector("#scheduleDate").value,
        lessonPlanId: document.querySelector("#scheduleLesson").value,
        notes: document.querySelector("#scheduleNotes").value,
      });
      event.target.reset();
      document.querySelector("#scheduleDate").value = new Date().toISOString().slice(0, 10);
      await loadScheduleData();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  });
  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-delete-schedule]");
    if (!button) return;
    await deleteJson(`/schedule/${button.dataset.deleteSchedule}`);
    await loadScheduleData();
  });
}

async function loadAssessmentData() {
  const assessmentList = document.querySelector("#assessmentList");
  const studentList = document.querySelector("#studentRecordList");
  if (!assessmentList || !studentList) return;
  try {
    const [assessments, records] = await Promise.all([getJson("/assessment"), getJson("/student-records")]);
    assessmentList.innerHTML = assessments.length
      ? assessments.map((item) => `
          <article class="data-row"><div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.subject)} · ${escapeHtml(item.year)} · ${item.questions.length} questions</span></div></article>
        `).join("")
      : `<p class="muted">No assessments saved yet.</p>`;
    studentList.innerHTML = records.length
      ? records.map((item) => `
          <article class="data-row"><div><strong>${escapeHtml(item.studentName)}</strong><span>Scores: ${escapeHtml(item.scores.join(", "))}</span></div><b>${escapeHtml(item.average)}%</b></article>
        `).join("")
      : `<p class="muted">No student records saved yet.</p>`;
  } catch (error) {
    assessmentList.innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`;
    studentList.innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`;
  }
}

function bindAssessment() {
  if (page !== "assessment") return;
  loadAssessmentData();
  document.querySelector("#assessmentForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await postJson("/assessment", {
        title: document.querySelector("#assessmentTitle").value,
        year: document.querySelector("#assessmentYear").value,
        subject: document.querySelector("#assessmentSubject").value,
        questions: document.querySelector("#assessmentQuestions").value.split(/\n+/).map((line) => line.trim()).filter(Boolean),
      });
      event.target.reset();
      await loadAssessmentData();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  });
  document.querySelector("#studentRecordForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await postJson("/student-record", {
        studentName: document.querySelector("#studentName").value,
        scores: document.querySelector("#studentScores").value.split(/[,\n]+/).map((score) => Number(score.trim())).filter(Number.isFinite),
      });
      event.target.reset();
      await loadAssessmentData();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  });
}

checkBackend();
bindModeToggles();
bindFileLabels();
bindGenerate();
bindAnalyze();
bindImprove();
bindSimulate();
bindEvaluate();
bindHistory();
bindSchedule();
bindAssessment();
