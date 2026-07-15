// Pure (non-JSX) lesson/document utilities extracted from the original App.jsx.
// JSX-based helpers (renderMarkdown, TypewriterText, etc.) live in
// components/copilot-ui.jsx since they return React elements.

import { API_BASE, authHeaders } from "../services/api.js";

function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadLessonDocx(result) {
  if (!result) throw new Error("Generate a lesson plan first.");
  const response = await fetch(`${API_BASE}/documents/lesson-plan`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(result),
  });
  const contentType = response.headers.get("Content-Type") || "";
  if (!response.ok) {
    const data = contentType.includes("application/json") ? await response.json().catch(() => ({})) : {};
    throw new Error(data.detail || data.error || "Could not export DOCX.");
  }
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
  const filename = filenameMatch?.[1] || `${(result?.title || "english-rph").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.docx`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function lessonToText(result) {
  const lines = [
    result?.title || "English RPH",
    "",
    `Subject: ${result?.lessonDetails?.subject || "English"}`,
    `Year: ${result?.lessonDetails?.year || ""}`,
    `Topic: ${result?.lessonDetails?.topic || ""}`,
    `Skill: ${result?.lessonDetails?.skill || ""}`,
    "",
    "Objectives",
    ...(result?.objectives || []).map((item, index) => `${index + 1}. ${item}`),
    "",
    "Success Criteria",
    ...(result?.successCriteria || []).map((item, index) => `${index + 1}. ${item}`),
    "",
    "Activities",
    ...(result?.activities || []).map((item, index) => `${index + 1}. ${item}`),
    "",
    "Procedure",
    ...(result?.procedure || []).map((stage) => `${stage.stage} (${stage.minutes || "-"} min)\nTeacher: ${stage.teacherActivities}\nPupils: ${stage.pupilActivities}`),
  ];
  return lines.join("\n");
}

// Split text into segments alternating between annotated ranges and plain text.
function buildAnnotatedSegments(text, annotations) {
  if (!text || !annotations || !annotations.length) return [{ type: "text", content: text }];

  const ranges = [];
  const lowerText = String(text).toLowerCase();
  annotations.forEach((ann, index) => {
    if (!ann.text || typeof ann.text !== "string") return;
    const lowerQuery = ann.text.toLowerCase();
    let pos = 0;
    while ((pos = lowerText.indexOf(lowerQuery, pos)) !== -1) {
      const start = pos;
      const end = pos + ann.text.length;
      const overlaps = ranges.some((r) => !(end <= r.start || start >= r.end));
      if (!overlaps) { ranges.push({ start, end, ann, index }); break; }
      pos = end;
    }
  });
  if (!ranges.length) return [{ type: "text", content: text }];
  ranges.sort((a, b) => a.start - b.start);

  const segments = [];
  let lastIndex = 0;
  ranges.forEach((range) => {
    if (range.start > lastIndex) segments.push({ type: "text", content: text.slice(lastIndex, range.start) });
    segments.push({ type: "mark", content: text.slice(range.start, range.end), ann: range.ann, index: range.index });
    lastIndex = range.end;
  });
  if (lastIndex < text.length) segments.push({ type: "text", content: text.slice(lastIndex) });
  return segments;
}

// Flatten remarks object to a readable string for display.
function StringifyRemarks(remarks) {
  if (!remarks) return "";
  if (typeof remarks === "string") return remarks;
  if (typeof remarks === "object") {
    const entries = Object.entries(remarks).filter(([, v]) => v);
    return entries.map(([k, v]) => `${k.toUpperCase()}: ${v}`).join(" · ");
  }

  return String(remarks);
}

// Overlay annotation highlight <mark> elements on raw DOCX HTML.
// Takes the mammoth HTML string, finds annotation phrases in the text, and
// wraps them in <mark> tags with the severity class + title attribute.
// Returns the modified HTML string for dangerouslySetInnerHTML.
function overlayAnnotationsOnHtml(html, annotations, activeIndex, setActiveIndex) {
  if (!html) return html;
  if (!annotations || !annotations.length) return html;

  let result = html;
  const used = new Set();

  // Process each annotation — find its text in the HTML and wrap it.
  // We operate on text between > and < (text nodes) to avoid breaking tags.
  annotations.forEach((ann, idx) => {
    if (!ann.text || typeof ann.text !== "string") return;
    const phrase = ann.text;
    const phraseLower = phrase.toLowerCase();
    const severity = ann.severity || "medium";
    const isActive = idx === activeIndex;
    const title = ann.issue || "Pedagogy Note";

    // Split HTML into text-node segments (between > and <) and tag segments.
    // Only replace in text nodes, never inside HTML tags.
    const parts = result.split(/(<[^>]+>)/);
    for (let i = 0; i < parts.length; i += 1) {
      // Odd indices are tags, even are text nodes.
      if (i % 2 === 1) continue;
      const textNode = parts[i];
      if (!textNode) continue;
      const lowerNode = textNode.toLowerCase();
      const pos = lowerNode.indexOf(phraseLower);
      if (pos === -1) continue;
      if (used.has(phraseLower + pos)) continue;

      // Wrap the phrase in a <mark> with a data-attribute for click handling.
      const before = textNode.slice(0, pos);
      const match = textNode.slice(pos, pos + phrase.length);
      const after = textNode.slice(pos + phrase.length);
      const mark = `<mark class="highlight ${severity} ${isActive ? "active" : ""}" data-ann-idx="${idx}" title="${title.replace(/"/g, "&quot;")}">${match}</mark>`;
      parts[i] = before + mark + after;
      used.add(phraseLower + pos);
      break; // Only replace the first occurrence of each annotation.
    }
    result = parts.join("");
  });

  return result;
}

function cleanAiDisplayText(value) {
  return String(value || "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function extractLessonFormFromText(text, classes = [], question = "") {
  const full = `${question}\n${text}`;
  const out = {};

  const topicMatch = full.match(/(?:Topic|Title|Lesson on|Lesson Plan for|Focus)\s*[:—]\s*([^\n\r.]+)/i) ||
                     question.match(/(?:about|on|topic of)\s+([A-Z][a-z0-9\s'-]+(?:\s+[A-Z][a-z0-9\s'-]+)*)/i);
  if (topicMatch && topicMatch[1]) {
    out.topic = topicMatch[1].replace(/^(?:the\s+|a\s+)/i, "").trim();
  } else {
    const headMatch = text.match(/^#+\s*([^\n\r]+)/m) || text.match(/^\*\*([^\n\r]+)\*\*/m);
    if (headMatch && headMatch[1]) {
      out.topic = headMatch[1].replace(/^(?:Lesson Plan:|RPH:|Topic:)\s*/i, "").trim();
    }
  }

  const skills = ["Reading", "Writing", "Speaking", "Listening", "Grammar", "Phonics", "Language Arts"];
  for (const sk of skills) {
    if (new RegExp(`\\b${sk}\\b`, "i").test(full)) {
      out.skill = sk;
      break;
    }
  }

  let foundClass = null;
  if (Array.isArray(classes)) {
    for (const c of classes) {
      if (c.name && full.toLowerCase().includes(c.name.toLowerCase())) {
        foundClass = c;
        break;
      }
    }
  }
  if (foundClass) {
    out.classId = foundClass._id;
    out.className = foundClass.name;
    out.year = foundClass.year;
    if (foundClass.studentCount) out.numberOfStudents = String(foundClass.studentCount);
  } else {
    const yearMatch = full.match(/\b(Year\s+[1-6])\b/i);
    if (yearMatch) out.year = yearMatch[1].replace(/year/i, "Year");
  }

  const durMatch = full.match(/(\d+)\s*(?:-| )(?:hour|hr)/i) || full.match(/(\d+)\s*(?:-| )(?:mins?|minutes?)/i);
  if (durMatch) {
    const val = Number(durMatch[1]);
    out.durationMinutes = full.toLowerCase().includes("hour") || full.toLowerCase().includes("hr") ? val * 60 : val;
  } else {
    const minMatches = [...full.matchAll(/\((\d+)\s*(?:mins?|minutes?)\)/gi)];
    if (minMatches.length > 0) {
      const sum = minMatches.reduce((acc, m) => acc + Number(m[1]), 0);
      if (sum >= 15 && sum <= 180) out.durationMinutes = sum;
    }
  }

  if (!out.numberOfStudents) {
    const stuMatch = full.match(/(\d+)\s*(?:pupils?|students?)/i);
    if (stuMatch) out.numberOfStudents = String(stuMatch[1]);
  }

  const objSection = full.match(/(?:Objectives?|Learning Objectives?|Outcomes?)\s*[:—]\s*([\s\S]*?)(?=\n\s*(?:Step|Stage|Procedure|Activities|Materials|Assessment|Wrap-Up|Note|\n\n[A-Z]|$))/i);
  if (objSection && objSection[1].trim()) {
    const bullets = objSection[1].split(/\n/).map((l) => l.replace(/^[-*•✦\d.)\s]+/, "").trim()).filter((l) => l.length > 8);
    if (bullets.length > 0) out.objectives = bullets.join("\n");
    else out.objectives = objSection[1].trim();
  } else if (out.topic && out.skill) {
    out.objectives = `Pupils can understand and identify key concepts related to ${out.topic}.\nPupils can apply ${out.skill.toLowerCase()} skills clearly in pair or group tasks.\nPupils can demonstrate learning through PBD observation and responses.`;
  }

  const stepsMatch = text.match(/(?:(?:Step|Stage|Phase)\s*\d+[:.]?|1\.\s*Set Induction|Set Induction)[:—\s][\s\S]*/i);
  if (stepsMatch) {
    const cleanSteps = stepsMatch[0].replace(/\n\s*(?:Would you like|Do you want|Let me know if|Feel free to ask)[\s\S]*$/i, "").trim();
    if (cleanSteps.length > 20) out.stepsOverview = cleanSteps;
  } else if (text.length > 30) {
    out.stepsOverview = text.replace(/\n\s*(?:Would you like|Do you want|Let me know if|Feel free to ask)[\s\S]*$/i, "").trim();
  }

  const matSection = full.match(/(?:Materials|Teaching Aids|Resources|T&LM)\s*[:—]\s*([^\n]+(?:\n\s*[-*•✦]\s*[^\n]+)*)/i);
  if (matSection && matSection[1].trim()) {
    out.materials = matSection[1].replace(/^[-*•✦\d.)\s]+/, "").trim().replace(/\n/g, ", ");
  } else {
    const items = [];
    if (full.toLowerCase().includes("poster")) items.push("Mini-posters / chart paper");
    if (full.toLowerCase().includes("sticker") || full.toLowerCase().includes("stamp")) items.push("Stickers / stamps");
    if (full.toLowerCase().includes("worksheet")) items.push("Worksheets");
    if (full.toLowerCase().includes("word card") || full.toLowerCase().includes("flashcard")) items.push("Word cards / flashcards");
    if (full.toLowerCase().includes("projector") || full.toLowerCase().includes("slide")) items.push("Projector / slides");
    if (items.length > 0) out.materials = items.join(", ");
  }

  if (full.toLowerCase().includes("exit ticket")) {
    out.assessmentType = "Formative PBD observation, oral response and exit ticket";
  } else if (full.toLowerCase().includes("pbd") || full.toLowerCase().includes("observation")) {
    out.assessmentType = "Formative PBD observation and checklist";
  }

  if (!out.topic && text.length > 15) {
    const firstSentence = text.split(/[\n.!]/)[0].replace(/[^a-zA-Z0-9\s-]/g, "").trim();
    if (firstSentence && firstSentence.length <= 40) out.topic = firstSentence;
    else out.topic = `English ${out.skill || "Language"} Lesson`;
  }
  if (!out.skill) out.skill = "Speaking";
  if (!out.durationMinutes) out.durationMinutes = 60;

  return out;
}

// The known section headers used when splitting an evaluation document into
// annotated segments. Kept here so evaluate logic and the document viewer
// share a single source of truth.
const DOCUMENT_SECTION_HEADERS = /^(Subject|Class|Time|Topic|Skill Focus|Objectives|Procedure|Assessment|Materials|Success Criteria|Differentiation|Reflection|Closure|Pre Lesson|Lesson Development|Stage I|Stage II|Stage III|Post Lesson|Activities|Homework)\s*:/gmi;

export {
  downloadTextFile,
  downloadLessonDocx,
  lessonToText,
  buildAnnotatedSegments,
  StringifyRemarks,
  overlayAnnotationsOnHtml,
  cleanAiDisplayText,
  extractLessonFormFromText,
  DOCUMENT_SECTION_HEADERS,
};
