import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import PizZip from "pizzip";
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultTemplatePath = path.resolve(__dirname, "../templates/lesson-plan-template.docx");

const border = {
  top: { style: BorderStyle.SINGLE, size: 1, color: "D9E2EC" },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: "D9E2EC" },
  left: { style: BorderStyle.SINGLE, size: 1, color: "D9E2EC" },
  right: { style: BorderStyle.SINGLE, size: 1, color: "D9E2EC" },
};

function text(value) {
  return String(value || "").trim();
}

function asList(items, fallback = []) {
  return Array.isArray(items) && items.length ? items.map(text).filter(Boolean) : fallback;
}

function cleanObjective(value) {
  return text(value)
    .replace(/^\d+[\).]\s*/, "")
    .replace(/^by the end of (?:the )?(?:\d+[- ]?minute\s*)?lesson,?\s*/i, "")
    .replace(/^(?:pupils|students)\s+(?:should|will)\s+be\s+able\s+to\s*/i, "")
    .replace(/^to\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeListText(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/([.!?])\s+(?=(?:Teacher|Pupils|Pupil|Students|Student|CBA|TS\/HoM\/HOTS|CCE|ICT|T&LM|AIEd|SS|21stCPP|DS|Value|Materials|Assessment|Question|Expected)\s*:)/g, "$1\n")
    .replace(/\s+(?=(?:\d+[\).]|[a-e][\).])\s+)/gi, "\n");
}

function firstText(...values) {
  return values.map(text).find(Boolean) || "";
}

function xmlEscape(value) {
  return text(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function xmlBlocks(xml, tag) {
  return [...xml.matchAll(new RegExp(`<w:${tag}(?:\\s|>)[\\s\\S]*?<\\/w:${tag}>`, "g"))].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
    xml: match[0],
  }));
}

function replaceBlocks(xml, tag, updater) {
  const blocks = xmlBlocks(xml, tag);
  let output = "";
  let cursor = 0;
  blocks.forEach((block, index) => {
    output += xml.slice(cursor, block.start);
    output += updater(block.xml, index);
    cursor = block.end;
  });
  return output + xml.slice(cursor);
}

function cellXml(value, options = {}) {
  return paragraphXml(value, options);
}

function ensureCellProperties(cellProperties = "", options = {}) {
  const vAlign = options.verticalAlign || "center";
  let properties = cellProperties || "<w:tcPr></w:tcPr>";

  if (/<w:tcMar\b/.test(properties)) {
    properties = properties.replace(/<w:tcMar\b[\s\S]*?<\/w:tcMar>/, "");
  }

  const cellMargins = [
    '<w:tcMar>',
    '<w:top w:w="120" w:type="dxa"/>',
    '<w:left w:w="120" w:type="dxa"/>',
    '<w:bottom w:w="120" w:type="dxa"/>',
    '<w:right w:w="120" w:type="dxa"/>',
    '</w:tcMar>',
  ].join("");

  if (/<w:vAlign\b[^>]*\/>/.test(properties)) {
    properties = properties.replace(/<w:vAlign\b[^>]*\/>/, `<w:vAlign w:val="${vAlign}"/>`);
  } else {
    properties = properties.replace("</w:tcPr>", `<w:vAlign w:val="${vAlign}"/>${cellMargins}</w:tcPr>`);
  }

  if (!/<w:tcMar\b/.test(properties)) {
    properties = properties.replace("</w:tcPr>", `${cellMargins}</w:tcPr>`);
  }

  return properties;
}

function replaceCellContent(cell, value, options = {}) {
  const match = cell.match(/^(<w:tc(?:\s[^>]*)?>)(<w:tcPr[\s\S]*?<\/w:tcPr>)?[\s\S]*(<\/w:tc>)$/);
  if (!match) return cell;
  return `${match[1]}${ensureCellProperties(match[2], options)}${cellXml(value, options)}${match[3]}`;
}

function updateTableCell(table, rowIndex, cellIndex, value, options = {}) {
  return replaceBlocks(table, "tr", (row, currentRow) => {
    if (currentRow !== rowIndex) return row;
    return replaceBlocks(row, "tc", (cell, currentCell) => (currentCell === cellIndex ? replaceCellContent(cell, value, options) : cell));
  });
}

function cbaMarks(value) {
  const source = String(value || "").toLowerCase();
  return {
    oral: !source || /oral[^a-z]*(√|yes|true|selected)?/i.test(value),
    observation: !source || /observation[^a-z]*(√|yes|true|selected)?/i.test(value),
    written: /(written|worksheet|exit ticket)[^a-z]*(√|yes|true|selected)?/i.test(value),
  };
}

function stageLabel(stage) {
  const name = String(stage.stage || "Lesson Stage");
  const minutes = stage.minutes || "";
  if (/lesson development stage i/i.test(name)) return `Lesson Development\nStage I\n(${minutes}) Minutes`;
  return `${name}\n(${minutes}) Minutes`;
}

function normalizeLesson(payload) {
  const rawLesson = payload.lesson || payload.generatedFields || payload;
  const sourceLesson = rawLesson && typeof rawLesson.toObject === "function" ? rawLesson.toObject() : rawLesson;
  const generated = sourceLesson.generatedFields || payload.generatedFields || {};
  const lesson = { ...sourceLesson, ...generated };
  const details = lesson.lessonDetails || payload.lessonDetails || {};
  const kssr = lesson.kssrAlignment || payload.kssrAlignment || {};
  const activities = asList(lesson.steps || lesson.activities || sourceLesson.steps || payload.steps);
  const defaultProcedure = [
    ["Pre Lesson", 5, "Set induction and prior knowledge activation", activities[0] || "Show a visual prompt or real object. Ask pupils what they notice."],
    ["Lesson Development Stage I", 10, "Teacher modelling and guided input", activities[1] || "Model one example with key vocabulary and simple instructions."],
    ["Stage II", 15, "Guided pair or group practice", activities[2] || "Pupils work in pairs or groups with roles and sentence starters."],
    ["Stage III", 20, "HOTS application task", activities[3] || "Pupils compare, justify, sort, create, or explain their answers."],
    ["Post Lesson", 10, "Closure and PBD evidence", activities[4] || "Pupils complete an exit ticket and share one response."],
  ].map(([stage, minutes, lessonContent, activity]) => ({
    stage,
    minutes,
    lessonContent,
    teacherActivities: activity,
    pupilActivities: "Pupils respond, practise with support, and produce evidence of learning.",
    remarks: "CBA: observation/exit ticket; HOTS: apply/justify; DS: sentence starters and peer support.",
  }));
  const procedure = Array.isArray(lesson.procedure) && lesson.procedure.length ? lesson.procedure : defaultProcedure;
  const objectives = asList(lesson.objectives || payload.objectives, [
    "Pupils can understand the lesson topic.",
    "Pupils can complete a scaffolded task.",
    "Pupils can show learning through oral or written response.",
  ]).map(cleanObjective).filter(Boolean);
  const successCriteria = asList(lesson.successCriteria, objectives.map((item) => `I can ${item.replace(/^Pupils can\s*/i, "").replace(/\.$/, "")}.`));
  const assessment = asList(lesson.assessment || payload.assessment, ["Observation", "Exit ticket", "Written task"]);

  return {
    ...lesson,
    ...details,
    title: text(lesson.title || payload.title) || "KSSR ESL Lesson Plan",
    subject: text(details.subject || lesson.subject || payload.subject) || "English",
    year: text(details.year || lesson.year || payload.year) || "Year 4",
    topic: text(details.topic || lesson.topic || payload.topic || lesson.title) || "English topic",
    skill: text(details.skill || lesson.skill || payload.skill) || "Reading",
    className: text(details.className || lesson.className || payload.className),
    numberOfStudents: text(details.numberOfStudents || lesson.numberOfStudents || payload.numberOfStudents) || "35",
    date: text(details.date || lesson.date || payload.date),
    time: text(details.time || lesson.time || payload.time) || [details.startTime || payload.startTime, details.endTime || payload.endTime].filter(Boolean).join(" - ") || `${details.durationMinutes || payload.durationMinutes || 60} minutes`,
    priorKnowledge: text(details.priorKnowledge || lesson.priorKnowledge || payload.priorKnowledge) || "Pupils have basic vocabulary related to the topic.",
    materials: text(details.materials || lesson.materials || payload.materials) || "Pictures, word cards, worksheet, board, exit ticket",
    assessmentType: text(details.assessmentType || lesson.assessmentType || payload.assessmentType) || "PBD observation and exit ticket",
    templateType: text(lesson.templateType || payload.templateType) || "Default MOE Template",
    contentStandard: text(lesson.contentStandard || payload.contentStandard || kssr.contentStandard) || "Aligned to selected KSSR content standard.",
    learningStandard: text(lesson.learningStandard || payload.learningStandard || kssr.learningStandard) || "Aligned to selected KSSR learning standard.",
    learningOutcomes: text(kssr.learningOutcomes) || "Pupils demonstrate understanding through oral/written response.",
    objectives,
    successCriteria,
    assessment,
    activities,
    procedure,
    differentiation: asList(lesson.differentiation, ["Sentence starters", "Peer support", "Challenge question"]),
  };
}

function paragraphXml(value, options = {}) {
  const lines = Array.isArray(value) ? value : normalizeListText(value).split(/\n/);
  const alignment = options.alignment || "left";
  const fontSize = options.size || 20;
  const bold = options.bold ? "<w:b/>" : "";
  const color = options.color ? `<w:color w:val="${options.color}"/>` : "";
  const spacingAfter = options.after ?? 80;

  return lines
    .map((line) => {
      if (!text(line)) {
        return `<w:p><w:pPr><w:jc w:val="${alignment}"/><w:spacing w:before="0" w:after="${Math.max(spacingAfter, 120)}" w:line="240" w:lineRule="auto"/></w:pPr></w:p>`;
      }
      const run = `<w:r><w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial"/>${bold}${color}<w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr><w:t xml:space="preserve">${xmlEscape(line)}</w:t></w:r>`;
      return `<w:p><w:pPr><w:jc w:val="${alignment}"/><w:spacing w:before="0" w:after="${spacingAfter}" w:line="240" w:lineRule="auto"/></w:pPr>${run}</w:p>`;
    })
    .join("");
}

function replaceFirstEmptyParagraphAfter(xml, label, value) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "[\\\\s\\u00A0]*");
  const labelPattern = new RegExp(`(<w:t(?:\\s[^>]*)?>${escapedLabel}<\\/w:t>[\\s\\S]*?)(<w:p[^>]*>[\\s\\S]*?<\\/w:p>)`);
  return xml.replace(labelPattern, (_match, before) => `${before}${paragraphXml(value)}`);
}

function replaceEmptyParagraphsAfter(xml, label, values) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "[\\\\s\\u00A0]*");
  const labelMatch = new RegExp(`<w:t(?:\\s[^>]*)?>${escapedLabel}<\\/w:t>`).exec(xml);
  if (!labelMatch) return xml;

  let output = xml;
  let searchFrom = labelMatch.index + labelMatch[0].length;
  values.forEach((value) => {
    const rest = output.slice(searchFrom);
    const paragraphMatch = /<w:p\b[\s\S]*?<\/w:p>/g;
    let match;
    while ((match = paragraphMatch.exec(rest))) {
      if (!/<w:t\b/.test(match[0])) {
        const start = searchFrom + match.index;
        const end = start + match[0].length;
        const replacement = paragraphXml(value);
        output = `${output.slice(0, start)}${replacement}${output.slice(end)}`;
        searchFrom = start + replacement.length;
        break;
      }
    }
  });

  return output;
}

function replaceRemarksParagraphAfter(xml, label, value) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "[\\\\s\\u00A0]*");
  const labelMatch = new RegExp(`<w:t(?:\\s[^>]*)?>${escapedLabel}<\\/w:t>`).exec(xml);
  if (!labelMatch) return xml;

  const rest = xml.slice(labelMatch.index + labelMatch[0].length);
  const paragraphMatch = /<w:p\b[\s\S]*?<\/w:p>/g;
  let match;
  while ((match = paragraphMatch.exec(rest))) {
    if (/CBA:/.test(match[0]) && /TS\/HoM\/HOTS:/.test(match[0])) {
      const start = labelMatch.index + labelMatch[0].length + match.index;
      const end = start + match[0].length;
      return `${xml.slice(0, start)}${paragraphXml(value)}${xml.slice(end)}`;
    }
  }

  return xml;
}

function procedureCellText(stage) {
  return [
    `Teacher: ${stage.teacherActivities || ""}`,
    `Pupils: ${stage.pupilActivities || ""}`,
  ].filter(Boolean).join("\n");
}

function remarksText(stage, lesson) {
  const remarks = stage.remarks && typeof stage.remarks === "object" ? stage.remarks : {};
  return [
    `CBA: ${firstText(remarks.cba, stage.cba, lesson.cba, "Observation and oral responses")}`,
    `TS/HoM/HOTS: ${firstText(remarks.thinkingSkills, stage.thinkingSkills, lesson.thinkingSkills, "Recall, understand, apply, analyse; questioning with reasons")}`,
    `CCE: ${firstText(remarks.cce, stage.cce, lesson.crossCurricularElements, "Language; values; environmental awareness where relevant")}`,
    `ICT: ${firstText(remarks.ict, stage.ict, lesson.ict, "Projector optional; printed visuals if ICT is limited")}`,
    `T&LM: ${firstText(remarks.tlm, stage.tlm, lesson.materials, "Pictures, word cards, worksheet, board, exit ticket")}`,
    `AIEd: ${firstText(remarks.aied, stage.aied, lesson.artsInEducation, "Drawing, chant, rhythm, or movement where applicable")}`,
    `SS: ${firstText(remarks.softSkills, stage.softSkills, lesson.softSkills, "Communication, collaboration, confidence")}`,
    `21stCPP: ${firstText(remarks.twentyFirstCentury, stage.twentyFirstCentury, lesson.twentyFirstCentury, "Think-Pair-Share and collaborative group roles")}`,
    `DS: ${firstText(remarks.differentiation, stage.differentiation, lesson.differentiation.join("; "), "Sentence starters and peer support")}`,
    `Value: ${firstText(remarks.value, stage.value, lesson.value, "Cooperation, confidence, respect, and responsibility")}`,
  ].join("\n");
}

function stripMarkdown(value) {
  return text(value)
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function dayName(dateValue) {
  if (!dateValue) return "";
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-MY", { weekday: "long" });
}

function objectiveSentence(lesson) {
  const objectives = lesson.objectives.map((item, index) => `${index + 1}. ${cleanObjective(stripMarkdown(item))}`).join("\n");
  return [
    "By the end of the lesson, pupils will be able to:",
    objectives,
  ].filter(Boolean).join("\n");
}

function activitiesSentence(lesson) {
  const procedure = lesson.procedure.map((stage, index) => {
    const stageName = stripMarkdown(stage.stage || `Step ${index + 1}`);
    const minutes = stage.minutes ? ` (${stage.minutes} min)` : "";
    const content = stripMarkdown(stage.lessonContent || "");
    const teacher = stripMarkdown(stage.teacherActivities || "");
    const pupils = stripMarkdown(stage.pupilActivities || "");
    return [
      `${index + 1}. ${stageName}${minutes}`,
      content && `Focus: ${content}`,
      teacher && `Teacher: ${teacher}`,
      pupils && `Pupils: ${pupils}`,
    ].filter(Boolean).join("\n");
  });

  return procedure.join("\n\n");
}

function simpleRphStandard(lesson) {
  const standard = firstText(lesson.learningStandard, lesson.contentStandard);
  const codeMatch = standard.match(/\b\d+(?:\.\d+){1,3}\b/);
  return {
    code: codeMatch ? codeMatch[0] : "KSSR",
    text: stripMarkdown(standard.replace(codeMatch?.[0] || "", "")) || stripMarkdown(lesson.learningOutcomes),
  };
}

function reflectionText(lesson) {
  return [
    "☐ ___ / ___ pupils achieved the learning objectives and will receive enrichment practice.",
    "☐ ___ / ___ pupils need reinforcement through guided reading, sentence frames, and teacher support.",
    `Teacher reflection: Review pupils' ${lesson.skill.toLowerCase()} evidence and plan reteaching if needed.`,
  ].join("\n");
}

function simpleRphTableText(table) {
  return [...table.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((match) => match[1]).join(" ");
}

function fillBlankSimpleRphTable(table, lesson) {
  const standard = simpleRphStandard(lesson);
  const values = [
    [0, 0, "RANCANGAN PENGAJARAN HARIAN"],
    [1, 0, "MINGGU"],
    [1, 1, lesson.week || ""],
    [1, 2, "MATA PELAJARAN"],
    [1, 3, lesson.subject],
    [2, 0, "MASA"],
    [2, 1, lesson.time],
    [2, 2, "TARIKH"],
    [2, 3, lesson.date || ""],
    [3, 0, "TEMA / BIDANG"],
    [3, 1, lesson.theme || "English Language"],
    [3, 2, "HARI"],
    [3, 3, dayName(lesson.date)],
    [4, 0, "TAJUK"],
    [4, 1, lesson.topic],
    [4, 2, "KELAS"],
    [4, 3, lesson.className || lesson.year],
    [5, 0, "STANDARD PEMBELAJARAN"],
    [6, 0, standard.code],
    [6, 1, standard.text],
    [7, 0, "OBJEKTIF PEMBELAJARAN"],
    [8, 0, objectiveSentence(lesson)],
    [9, 0, "AKTIVITI PENGAJARAN DAN PEMBELAJARAN"],
    [10, 0, activitiesSentence(lesson)],
    [11, 0, "REFLEKSI"],
    [12, 0, reflectionText(lesson)],
  ];

  let output = table;
  values.forEach(([row, cell, content]) => {
    output = updateTableCell(output, row, cell, content, {
      alignment: row === 0 || [5, 7, 9, 11].includes(row) ? "center" : "left",
      verticalAlign: "center",
      bold: row === 0 || [5, 7, 9, 11].includes(row) || [0, 2].includes(cell),
      size: row === 0 ? 24 : 20,
      after: [8, 10, 12].includes(row) ? 90 : 40,
    });
  });
  return output;
}

function fillSampleSimpleRphTable(table, lesson) {
  const standard = simpleRphStandard(lesson);
  const values = [
    [1, 1, lesson.week || ""],
    [1, 3, lesson.subject],
    [2, 1, lesson.time],
    [2, 3, lesson.date || ""],
    [3, 1, lesson.theme || "English Language"],
    [3, 3, dayName(lesson.date)],
    [4, 1, lesson.topic],
    [4, 3, lesson.className || lesson.year],
    [6, 0, standard.code],
    [6, 1, standard.text],
    [8, 0, objectiveSentence(lesson)],
    [10, 0, activitiesSentence(lesson)],
    [12, 0, reflectionText(lesson)],
  ];

  let output = table;
  values.forEach(([row, cell, content]) => {
    output = updateTableCell(output, row, cell, content, {
      alignment: [8, 10, 12].includes(row) ? "left" : "center",
      verticalAlign: "center",
      bold: false,
      size: [8, 10, 12].includes(row) ? 20 : 19,
      after: [8, 10, 12].includes(row) ? 90 : 40,
    });
  });
  return output;
}

function fillSimpleRphTemplateXml(xml, lesson) {
  return replaceBlocks(xml, "tbl", (table) => {
    const tableText = simpleRphTableText(table);
    if (/RANCANGAN PENGAJARAN HARIAN/i.test(tableText)) return fillSampleSimpleRphTable(table, lesson);
    const rows = xmlBlocks(table, "tr").length;
    const cellsWithText = (tableText || "").trim().length;
    if (rows >= 12 && cellsWithText === 0) return "";
    return table;
  });
}

function fullProcedureXml(lesson) {
  const rows = lesson.procedure
    .map((stage) => paragraphXml([
      `${stage.stage} (${stage.minutes || ""} minutes)`,
      `Lesson Content: ${stage.lessonContent || ""}`,
      `Teacher Activities: ${stage.teacherActivities || ""}`,
      `Pupil Activities: ${stage.pupilActivities || ""}`,
      remarksText(stage, lesson),
    ].join("\n")))
    .join("");

  return `
  <w:p><w:pPr><w:spacing w:before="160" w:after="80"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="22"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="22"/></w:rPr><w:t>Generated Full Lesson Procedure</w:t></w:r></w:p>
  ${rows}`;
}

function requiredContentXml(lesson) {
  const objectivesLead = `By the end of the lesson, ${lesson.className || lesson.year} pupils should be able to:`;
  const lines = [
    "Generated MOE Required Content",
    "",
    `Content Standard (CS): ${lesson.contentStandard}`,
    `Learning Standard (LS): ${lesson.learningStandard}`,
    `Learning Outcome (LO): ${lesson.learningOutcomes}`,
    `Knowledge: Vocabulary and language structures related to ${lesson.topic}.`,
    `Skill: ${lesson.skillOutcome || `Use ${lesson.skill.toLowerCase()} skills to complete the lesson task.`}`,
    `Value: ${lesson.value || "Cooperation, confidence, respect, and responsibility."}`,
    "",
    "Learning Objectives",
    objectivesLead,
    ...lesson.objectives.map((item, index) => `${index + 1}. ${item}`),
    "",
    "Success Criteria (SC)",
    "I can:",
    ...lesson.successCriteria.map((item, index) => `${index + 1}. ${item.replace(/^I can\s*/i, "").replace(/^\d+\.\s*/, "")}`),
    "",
    "Classroom Based Assessment (CBA) (√)",
    lesson.classroomBasedAssessment || "Oral: √\nObservation: √\nWritten: As needed",
    `Instruments: ${lesson.instruments || "Observation checklist, pupils' oral responses, worksheet or exit ticket"}`,
    `Thinking Skills (TS): ${lesson.thinkingSkills || "Recall, understand, apply, analyse"}`,
    `Habits of Mind (HoM): ${lesson.habitsOfMind || "Thinking flexibly; striving for accuracy; listening with understanding"}`,
    `Higher-order thinking Skills (HOTS): ${lesson.hots || "Compare, justify, explain why, create response"}`,
    `Cross-Curricular Elements (CCE): ${lesson.crossCurricularElements || "Language; values; environmental awareness where relevant"}`,
    `Information & Communication Technology (ICT): ${lesson.ict || "Projector optional; printed visuals and board can be used."}`,
    `Teaching & Learning Materials (T&LM): ${lesson.materials}`,
    `Arts in Education (AEd): ${lesson.artsInEducation || "Drawing, chant, rhythm, or movement where applicable"}`,
    `Soft Skills (SS): ${lesson.softSkills || "Communication, collaboration, confidence, respect"}`,
    "Teaching Strategies: Think-Pair-Share, group roles, scaffolding, formative feedback",
    `21st Century Pedagogy Practice (21stCPP): ${lesson.twentyFirstCentury || "Collaborative learning, communication, creativity, critical thinking"}`,
    `Differentiation Strategy (DS): ${lesson.differentiation.join("; ")}`,
  ];

  return `<w:p><w:pPr><w:spacing w:before="160" w:after="80"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="22"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="22"/></w:rPr><w:t>Generated MOE Required Content</w:t></w:r></w:p>${paragraphXml(lines.slice(2).join("\n"))}`;
}

function fillTemplateTablesXml(xml, lesson) {
  const objectivesLead = `By the end of the lesson, ${lesson.className || lesson.year} pupils should be able to:`;
  const successCriteria = ["I can:", "", ...lesson.successCriteria.map((item, index) => `${index + 1}. ${cleanObjective(item.replace(/^I can\s*/i, ""))}`)].join("\n");
  const objectiveText = [objectivesLead, "", ...lesson.objectives.map((item, index) => `${index + 1}. ${cleanObjective(item)}`)].join("\n");
  const marks = cbaMarks(lesson.classroomBasedAssessment);
  const value = lesson.value || "Cooperation, confidence, respect, and responsibility.";
  const skillOutcome = lesson.skillOutcome || `Use ${lesson.skill.toLowerCase()} skills to complete the lesson task.`;
  const knowledge = `Vocabulary and language structures related to ${lesson.topic}.`;
  const stageRows = [1, 2, 3, 4, 5];
  const shortCell = { alignment: "center", verticalAlign: "center", after: 40 };
  const narrativeCell = { alignment: "left", verticalAlign: "center", after: 70 };
  const checkCell = { alignment: "center", verticalAlign: "center", bold: true, size: 24, after: 0 };

  return replaceBlocks(xml, "tbl", (table, tableIndex) => {
    let output = table;

    if (tableIndex === 0) {
      const values = [
        [1, 1, lesson.subject],
        [2, 1, lesson.year],
        [2, 3, lesson.numberOfStudents],
        [3, 1, lesson.date],
        [3, 3, lesson.time],
        [4, 1, lesson.topic],
        [4, 2, lesson.title],
        [5, 1, lesson.skill],
        [6, 1, lesson.priorKnowledge],
        [8, 1, lesson.contentStandard],
        [8, 2, lesson.complementaryContentStandard || "Integrated complementary skill support."],
        [9, 1, lesson.learningStandard],
        [9, 2, lesson.complementaryLearningStandard || "Supports the main skill through guided language practice."],
        [11, 0, lesson.learningOutcomes],
        [11, 1, knowledge],
        [11, 2, skillOutcome],
        [11, 3, value],
        [12, 1, objectiveText],
        [13, 1, successCriteria],
        [15, 1, marks.oral ? "√" : ""],
        [15, 2, marks.observation ? "√" : ""],
        [15, 3, marks.written ? "√" : ""],
        [16, 1, lesson.oralInstrument || "Oral questioning"],
        [16, 2, lesson.observationInstrument || "Observation checklist"],
        [16, 3, lesson.writtenInstrument || lesson.instruments || "Worksheet or exit ticket"],
        [
          17,
          1,
          [
            lesson.thinkingSkills || "Recall, understand, apply, analyse",
            lesson.habitsOfMind || "Thinking flexibly; striving for accuracy; listening with understanding",
            lesson.hots || "Compare, justify, explain why, create response",
          ].join("\n"),
        ],
        [18, 1, lesson.crossCurricularElements || "Language; values; environmental awareness where relevant"],
        [19, 1, lesson.ict || "Projector optional; printed visuals and board can be used."],
        [20, 1, lesson.materials],
        [21, 1, lesson.artsInEducation || "Drawing, chant, rhythm, or movement where applicable"],
        [22, 1, lesson.softSkills || "Communication, collaboration, confidence, respect"],
        [23, 0, `Teaching Strategies\n${lesson.teachingStrategies || "Think-Pair-Share, group roles, scaffolding, formative feedback"}`],
        [24, 1, lesson.twentyFirstCentury || "Collaborative learning, communication, creativity, critical thinking"],
        [25, 1, lesson.differentiation.join("\n")],
      ];

      values.forEach(([row, cell, content]) => {
        const isCheckmark = row === 15 && [1, 2, 3].includes(cell);
        const isShort = [1, 2, 3, 4, 5].includes(row) && cell !== 2;
        output = updateTableCell(output, row, cell, content, isCheckmark ? checkCell : isShort ? shortCell : narrativeCell);
      });
    }

    if (tableIndex === 1) {
      lesson.procedure.slice(0, 5).forEach((stage, index) => {
        const row = stageRows[index];
        const lessonContent = index === 4 ? `Value: ${value}\n${stage.lessonContent || ""}` : stage.lessonContent || "";
        output = updateTableCell(output, row, 0, stageLabel(stage), { ...shortCell, bold: true });
        output = updateTableCell(output, row, 1, lessonContent, narrativeCell);
        output = updateTableCell(output, row, 2, procedureCellText(stage), narrativeCell);
        output = updateTableCell(output, row, 3, remarksText(stage, lesson), { ...narrativeCell, size: 18, after: 50 });
      });
    }

    return output;
  });
}

function fillDefaultTemplateXml(xml, lesson) {
  if (/RANCANGAN PENGAJARAN HARIAN/i.test(xml)) return fillSimpleRphTemplateXml(xml, lesson);
  return fillTemplateTablesXml(xml, lesson);
}

async function buildFromDefaultTemplate(payload) {
  const lesson = normalizeLesson(payload);
  const template = await fs.readFile(defaultTemplatePath);
  const zip = new PizZip(template);
  const documentFile = zip.file("word/document.xml");
  if (!documentFile) throw new Error("Default lesson plan template is missing word/document.xml.");
  const xml = documentFile.asText();
  zip.file("word/document.xml", fillDefaultTemplateXml(xml, lesson));
  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
}

function cell(children, options = {}) {
  const content = Array.isArray(children) ? children : [p(children)];
  return new TableCell({
    borders: border,
    shading: options.shading ? { fill: options.shading } : undefined,
    width: options.width ? { size: options.width, type: WidthType.PERCENTAGE } : undefined,
    columnSpan: options.columnSpan,
    verticalAlign: options.verticalAlign || VerticalAlign.CENTER,
    children: content,
    margins: { top: 120, bottom: 120, left: 160, right: 160 },
  });
}

function p(value, options = {}) {
  const lines = String(text(value)).split(/\n/);
  const children = [];
  lines.forEach((line, index) => {
    if (index > 0) children.push(new TextRun({ break: 1 }));
    children.push(new TextRun({ text: line, bold: options.bold, size: options.size || 22, color: options.color || "1E293B" }));
  });

  return new Paragraph({
    alignment: options.alignment || AlignmentType.LEFT,
    heading: options.heading,
    spacing: { after: options.after ?? 120 },
    children,
  });
}

function bullets(items) {
  return asList(items).map((item) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 100 }, children: [new TextRun({ text: item, size: 21, color: "334155" })] }));
}

function labelValueRows(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([label, value]) => new TableRow({ children: [cell(label, { width: 28, shading: "F8FAFC" }), cell(value, { width: 72 })] })),
  });
}

function templateTheme(templateType) {
  const value = templateType.toLowerCase();
  if (value.includes("detailed")) return { color: "7C2D12", light: "FFEDD5", accent: "EA580C", label: "Detailed Lesson Plan Script" };
  if (value.includes("semi")) return { color: "14532D", light: "DCFCE7", accent: "16A34A", label: "Semi-Detailed Lesson Outline" };
  if (value.includes("ubd") || value.includes("understanding")) return { color: "1E3A8A", light: "DBEAFE", accent: "2563EB", label: "Understanding by Design Backward Plan" };
  if (value.includes("daily") || value.includes("dll")) return { color: "713F12", light: "FEF3C7", accent: "D97706", label: "Daily Lesson Log" };
  if (value.includes("flipped") || value.includes("blended")) return { color: "0F766E", light: "CCFBF1", accent: "14B8A6", label: "Flipped / Blended Learning Plan" };
  if (value.includes("project")) return { color: "831843", light: "FCE7F3", accent: "DB2777", label: "Project-Based Learning Plan" };
  return { color: "4F46E5", light: "EDE9FE", accent: "7C3AED", label: templateType };
}

function procedureRows(lesson, theme, labels = ["Stage", "Lesson Content", "Teacher & Pupil Activities", "Remarks"]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          cell(labels[0], { width: 18, shading: theme.light }),
          cell(labels[1], { width: 25, shading: theme.light }),
          cell(labels[2], { width: 37, shading: theme.light }),
          cell(labels[3], { width: 20, shading: theme.light }),
        ],
      }),
      ...lesson.procedure.map((stage) => new TableRow({
        children: [
          cell(`${stage.stage}\n${stage.minutes || ""} min`),
          cell(stage.lessonContent || ""),
          cell(`Teacher: ${stage.teacherActivities || ""}\n\nPupils: ${stage.pupilActivities || ""}`),
          cell(stage.remarks || ""),
        ],
      })),
    ],
  });
}

function templateSpecificBlocks(lesson, theme) {
  const value = lesson.templateType.toLowerCase();
  if (value.includes("detailed")) {
    return [
      p("Teacher Script & Expected Responses", { heading: HeadingLevel.HEADING_1, bold: true, size: 26, color: theme.color }),
      procedureRows(lesson, theme, ["Timing", "Teaching Point", "Exact Questions / Actions", "Expected Answers / Notes"]),
      p("Observer Notes", { heading: HeadingLevel.HEADING_1, bold: true, size: 24, color: theme.color }),
      ...bullets(["Exact teacher questions are included in each stage.", "Expected pupil responses and support prompts are visible.", "PBD evidence is collected during guided practice and closure."]),
    ];
  }
  if (value.includes("semi")) {
    return [
      p("Lesson Outline", { heading: HeadingLevel.HEADING_1, bold: true, size: 26, color: theme.color }),
      procedureRows(lesson, theme, ["Phase", "Main Point", "Procedure Outline", "Assessment / Resources"]),
    ];
  }
  if (value.includes("ubd") || value.includes("understanding")) {
    return [
      p("Stage 1: Desired Results", { heading: HeadingLevel.HEADING_1, bold: true, size: 26, color: theme.color }),
      labelValueRows([["Transfer Goal", lesson.learningOutcomes], ["Essential Question", `How can pupils use ${lesson.topic} language meaningfully?`], ["Success Criteria", lesson.successCriteria.join("\n")]]),
      p("Stage 2: Assessment Evidence", { heading: HeadingLevel.HEADING_1, bold: true, size: 26, color: theme.color }),
      ...bullets(lesson.assessment),
      p("Stage 3: Learning Plan", { heading: HeadingLevel.HEADING_1, bold: true, size: 26, color: theme.color }),
      procedureRows(lesson, theme),
    ];
  }
  if (value.includes("daily") || value.includes("dll")) {
    return [
      p("Daily Log", { heading: HeadingLevel.HEADING_1, bold: true, size: 26, color: theme.color }),
      labelValueRows([["Daily Focus", lesson.topic], ["Resources", lesson.materials], ["PBD Evidence", lesson.assessment.join("\n")], ["Reflection", "To be completed after teaching."]]),
      procedureRows(lesson, theme, ["Time", "Routine", "Teacher/Pupil Work", "Log Notes"]),
    ];
  }
  if (value.includes("flipped") || value.includes("blended")) {
    return [
      p("Before Class", { heading: HeadingLevel.HEADING_1, bold: true, size: 26, color: theme.color }),
      ...bullets([`Pupils preview vocabulary or a short text about ${lesson.topic}.`, "Teacher prepares a low-bandwidth alternative: printed prompt or board task."]),
      p("In Class Active Learning", { heading: HeadingLevel.HEADING_1, bold: true, size: 26, color: theme.color }),
      procedureRows(lesson, theme, ["Phase", "Content", "Active Classroom Work", "Blended Notes"]),
      p("After Class", { heading: HeadingLevel.HEADING_1, bold: true, size: 26, color: theme.color }),
      ...bullets(["Pupils complete a short reflection or extension task.", "Teacher groups pupils for reteaching or enrichment based on PBD evidence."]),
    ];
  }
  if (value.includes("project")) {
    return [
      p("Driving Question", { heading: HeadingLevel.HEADING_1, bold: true, size: 26, color: theme.color }),
      p(`How can pupils use English to explore or solve a real-life problem related to ${lesson.topic}?`),
      p("Project Milestones", { heading: HeadingLevel.HEADING_1, bold: true, size: 26, color: theme.color }),
      procedureRows(lesson, theme, ["Milestone", "Learning Target", "Project Work", "Evidence / Checkpoint"]),
      p("Final Product & Rubric", { heading: HeadingLevel.HEADING_1, bold: true, size: 26, color: theme.color }),
      ...bullets(["Final product: mini-poster, oral presentation, role-play, or class display.", "Rubric: language accuracy, teamwork, creativity, explanation, and reflection."]),
    ];
  }
  return [procedureRows(lesson, theme)];
}

async function buildStructuredDocx(payload) {
  const lesson = normalizeLesson(payload);
  const theme = templateTheme(lesson.templateType);
  const doc = new Document({
    styles: { paragraphStyles: [{ id: "Normal", name: "Normal", run: { font: "Arial", size: 22 }, paragraph: { spacing: { after: 120 } } }] },
    sections: [
      {
        properties: { page: { margin: { top: 900, right: 900, bottom: 900, left: 900 } } },
        children: [
          p(theme.label, { alignment: AlignmentType.CENTER, bold: true, size: 32, color: theme.color }),
          p(lesson.title, { alignment: AlignmentType.CENTER, bold: true, size: 28, color: "111827" }),
          p("ESLessonCraft MY KSSR Primary ESL Lesson Plan", { alignment: AlignmentType.CENTER, color: "64748B" }),
          p("Lesson Details", { heading: HeadingLevel.HEADING_1, bold: true, size: 26, color: theme.color }),
          labelValueRows([
            ["Subject", lesson.subject],
            ["Year", lesson.year],
            ["Date / Time", `${lesson.date || "TBC"} ${lesson.time}`],
            ["Class / Pupils", `${lesson.className || "Not linked"} / ${lesson.numberOfStudents}`],
            ["Theme & Topic", lesson.topic],
            ["Skill / Focus", lesson.skill],
            ["Prior Knowledge", lesson.priorKnowledge],
          ]),
          p("KSSR / DSKP Alignment", { heading: HeadingLevel.HEADING_1, bold: true, size: 26, color: theme.color }),
          labelValueRows([
            ["Content Standard", lesson.contentStandard],
            ["Learning Standard", lesson.learningStandard],
            ["Learning Outcome", lesson.learningOutcomes],
            ["Assessment", lesson.assessmentType],
          ]),
          p("Learning Objectives", { heading: HeadingLevel.HEADING_1, bold: true, size: 26, color: theme.color }),
          ...bullets(lesson.objectives),
          p("Success Criteria", { heading: HeadingLevel.HEADING_1, bold: true, size: 26, color: theme.color }),
          ...bullets(lesson.successCriteria),
          ...templateSpecificBlocks(lesson, theme),
          p("Differentiation / PBD", { heading: HeadingLevel.HEADING_1, bold: true, size: 26, color: theme.color }),
          ...bullets([...lesson.differentiation, ...lesson.assessment]),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}

export async function buildLessonDocxBuffer(payload) {
  return buildFromDefaultTemplate(payload);
}

export async function buildLessonPdfBuffer(payload) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "eslessoncraft-"));
  const docxPath = path.join(tmpDir, "lesson-plan.docx");
  await fs.writeFile(docxPath, await buildLessonDocxBuffer(payload));

  const candidates = [
    process.env.SOFFICE_PATH,
    "soffice",
    "libreoffice",
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
  ].filter(Boolean);

  let lastError;
  for (const command of candidates) {
    try {
      await execFileAsync(command, ["--headless", "--convert-to", "pdf", "--outdir", tmpDir, docxPath], { timeout: 60000 });
      const pdfPath = path.join(tmpDir, "lesson-plan.pdf");
      return await fs.readFile(pdfPath);
    } catch (error) {
      lastError = error;
    }
  }

  const error = new Error("PDF export requires LibreOffice/soffice. DOCX export is still available.");
  error.cause = lastError;
  error.statusCode = 501;
  throw error;
}
