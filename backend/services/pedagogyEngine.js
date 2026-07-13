import { callAI, callAIText } from "./aiProvider.js";
import { analyzeKssrAlignment, buildKssrPromptRequirement, calculateKssrCheck } from "./kssrAnalyzer.js";
import { buildSowInstruction } from "./sowLibrary.js";

const MALAYSIAN_CONTEXT =
  "Use Malaysian primary school KSSR context only: Year 1 to Year 6, child-friendly simple language, activity-based learning, group work, visual support, scaffolded learning, mixed ability pupils, BM/BI support where useful, large classes, limited ICT access, and PBD evidence needs. Do not use Form 1 to Form 5 unless the user text already contains it; convert secondary references into Year 1-Year 6 primary school language.";

export function validateLessonPlan(req, res, next) {
  const lessonPlan = req.body?.lessonPlan;

  if (!lessonPlan || typeof lessonPlan !== "string" || lessonPlan.trim().length < 20) {
    return res.status(400).json({
      error: "lessonPlan is required and must contain at least 20 characters.",
    });
  }

  req.lessonPlan = lessonPlan.trim();
  return next();
}

// Stamp the AI provenance (real vs fallback) onto every engine result so the
// client can show a "demo content" notice when the model could not be reached.
export function buildAiSource(ai) {
  return {
    fallbackTriggered: Boolean(ai?.fallbackTriggered),
    provider: ai?.provider || "gemini",
    model: ai?.model || null,
    error: ai?.error || null,
  };
}

function hasAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function ensureThree(items, fallbackItems) {
  const validItems = Array.isArray(items)
    ? items.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim())
    : [];

  return [...validItems, ...fallbackItems].slice(0, 3);
}

function ensureArray(items, fallbackItems, limit = 6) {
  const validItems = Array.isArray(items)
    ? items.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim())
    : [];

  return [...validItems, ...fallbackItems].slice(0, limit);
}

function cleanObjective(value) {
  return String(value || "")
    .trim()
    .replace(/^\d+[\).]\s*/, "")
    .replace(/^by the end of (?:the )?(?:\d+[- ]?minute\s*)?lesson,?\s*/i, "")
    .replace(/^(?:pupils|students)\s+(?:should|will)\s+be\s+able\s+to\s*/i, "")
    .replace(/^to\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanObjectives(items, fallbackItems, limit = 5) {
  return ensureArray(items, fallbackItems, limit).map(cleanObjective).filter(Boolean).slice(0, limit);
}

function stripMarkdownMarkers(value) {
  if (Array.isArray(value)) return value.map(stripMarkdownMarkers);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, stripMarkdownMarkers(item)]));
  }
  if (typeof value !== "string") return value;

  return value
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function mergeIfThin(value, fallback, minimumLength = 120) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  const fallbackText = String(fallback || "").replace(/\s+/g, " ").trim();

  if (!text) return fallbackText;
  if (!fallbackText || text.length >= minimumLength) return text;
  if (fallbackText.toLowerCase().includes(text.toLowerCase())) return fallbackText;
  return `${text} ${fallbackText}`;
}

function normalizeProcedureStage(stage, fallbackStage = {}) {
  const source = stage && typeof stage === "object" ? stage : {};
  const fallback = fallbackStage && typeof fallbackStage === "object" ? fallbackStage : {};
  const teacherActivities = source.teacherActivities || source.teacherActivity || source.teacherActions || source.teacher || source.steps;
  const pupilActivities = source.pupilActivities || source.pupilActivity || source.studentActivities || source.pupils || source.students;
  const remarks = source.remarks && typeof source.remarks === "object" ? source.remarks : String(source.remarks || source.notes || source.assessment || fallback.remarks || "").trim();

  return {
    stage: String(source.stage || source.phase || fallback.stage || "Lesson Stage").trim(),
    minutes: Number.isFinite(Number(source.minutes || source.duration || source.time))
      ? Number(source.minutes || source.duration || source.time)
      : fallback.minutes || "",
    lessonContent: mergeIfThin(source.lessonContent || source.content || source.teachingPoint, fallback.lessonContent, 70),
    teacherActivities: mergeIfThin(teacherActivities, fallback.teacherActivities, 150),
    pupilActivities: mergeIfThin(pupilActivities, fallback.pupilActivities, 120),
    remarks,
  };
}

function stringifyRemarks(remarks) {
  if (remarks && typeof remarks === "object") {
    return [
      remarks.cba ? `CBA: ${remarks.cba}` : "",
      remarks.thinkingSkills ? `TS/HoM/HOTS: ${remarks.thinkingSkills}` : "",
      remarks.cce ? `CCE: ${remarks.cce}` : "",
      remarks.ict ? `ICT: ${remarks.ict}` : "",
      remarks.tlm ? `T&LM: ${remarks.tlm}` : "",
      remarks.aied ? `AIEd: ${remarks.aied}` : "",
      remarks.softSkills ? `SS: ${remarks.softSkills}` : "",
      remarks.twentyFirstCentury ? `21stCPP: ${remarks.twentyFirstCentury}` : "",
      remarks.differentiation ? `DS: ${remarks.differentiation}` : "",
      remarks.value ? `Value: ${remarks.value}` : "",
    ].filter(Boolean).join("; ");
  }
  return String(remarks || "");
}

function normalizeProcedure(items, fallbackProcedure) {
  const rawStages = Array.isArray(items) ? items : [];
  const stages = rawStages
    .map((stage, index) => normalizeProcedureStage(stage, fallbackProcedure[index]))
    .filter((stage) => stage.stage || stage.lessonContent || stage.teacherActivities || stage.pupilActivities);

  const merged = fallbackProcedure.map((fallbackStage, index) => normalizeProcedureStage(stages[index] || fallbackStage, fallbackStage));
  return merged.map((stage) => {
    const fallback = fallbackProcedure.find((item) => item.stage === stage.stage) || {};
    return {
      ...stage,
      lessonContent: stage.lessonContent || fallback.lessonContent,
      teacherActivities: stage.teacherActivities || fallback.teacherActivities,
      pupilActivities: stage.pupilActivities || fallback.pupilActivities,
      remarks: stage.remarks || fallback.remarks,
    };
  });
}

export function serializeProcedureSteps(procedure = []) {
  return procedure
    .map((stage) => {
      const minutes = stage.minutes ? ` (${stage.minutes} min)` : "";
      return [
        `${stage.stage || "Lesson Stage"}${minutes}`,
        stage.lessonContent ? `Content: ${stage.lessonContent}` : "",
        stage.teacherActivities ? `Teacher: ${stage.teacherActivities}` : "",
        stage.pupilActivities ? `Pupils: ${stage.pupilActivities}` : "",
        stage.remarks ? `Remarks: ${stringifyRemarks(stage.remarks)}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .filter(Boolean);
}

function normalizeLevel(value, fallback = "Medium") {
  const text = String(value || fallback).toLowerCase();
  if (text.includes("high")) return "High";
  if (text.includes("low")) return "Low";
  return "Medium";
}

function normalizeKssrAlignment(value, lessonPlan) {
  const heuristic = analyzeKssrAlignment(lessonPlan);
  const source = value && typeof value === "object" ? value : {};

  return {
    communication: normalizeLevel(source.communication, heuristic.communication),
    spiritualValues: normalizeLevel(source.spiritualValues, heuristic.spiritualValues),
    humanities: normalizeLevel(source.humanities, heuristic.humanities),
    scienceTechnology: normalizeLevel(source.scienceTechnology, heuristic.scienceTechnology),
    personalSkills: normalizeLevel(source.personalSkills, heuristic.personalSkills),
    physicalAesthetic: normalizeLevel(source.physicalAesthetic, heuristic.physicalAesthetic),
  };
}

function normalizePbdAssessment(value) {
  const source = value && typeof value === "object" ? value : {};

  return {
    assessmentType: String(source.assessmentType || "Formative PBD observation and exit ticket"),
    evidence: String(source.evidence || "Collect pupil responses, pair discussion notes, and a short written exit ticket."),
    improvement: String(
      source.improvement ||
        "Use a simple rubric for oral response quality and separate support for low-proficiency pupils.",
    ),
  };
}

function mockGenerate({
  topic = "Plants",
  year = "Year 4",
  subject = "English",
  skill = "Reading",
  classroomType = "Mixed ability",
  templateType = "Default MOE Template",
  date = "",
  startTime = "",
  endTime = "",
  durationMinutes = 60,
  className = "",
  numberOfStudents = "",
  studentProficiency = "",
  classroomEnvironment = "",
  teachingNotes = "",
  priorKnowledge = "",
  materials = "",
  assessmentType = "",
  sowSource,
} = {}) {
  const procedure = [
    {
      stage: "Pre Lesson",
      minutes: 5,
      lessonContent: `Activate prior knowledge about ${topic}.`,
      teacherActivities: "Show a picture or real object. Ask two quick questions and model one child-friendly response.",
      pupilActivities: "Pupils name what they see, repeat key words, and share one idea with a partner.",
      remarks: {
        cba: "Oral responses and observation",
        thinkingSkills: "Recall prior knowledge; notice and name examples",
        cce: "Language and values",
        ict: "Optional projector; printed picture/object if ICT is limited",
        tlm: "Picture or real object, board",
        aied: "Picture talk or simple mime",
        softSkills: "Confidence and communication",
        twentyFirstCentury: "Think-Pair-Share",
        differentiation: "Accept BM keywords then recast in English",
        value: "Confidence and respect",
      },
    },
    {
      stage: "Lesson Development Stage I",
      minutes: 10,
      lessonContent: `Introduce target vocabulary and language pattern for ${skill}.`,
      teacherActivities: "Model the target language, write sentence frames on the board, and check meaning with simple examples.",
      pupilActivities: "Pupils repeat, match words to pictures, and practise the sentence frame chorally and individually.",
      remarks: {
        cba: "Observation checklist",
        thinkingSkills: "Understand, classify examples, ask why",
        cce: "Language",
        ict: "Board or projector optional",
        tlm: "Word cards, pictures, sentence frames",
        aied: "Chant or rhythm for vocabulary",
        softSkills: "Participation and listening",
        twentyFirstCentury: "Active participation",
        differentiation: "Word bank and sentence starters",
        value: "Cooperation",
      },
    },
    {
      stage: "Stage II",
      minutes: 15,
      lessonContent: "Guided pair/group practice.",
      teacherActivities: "Set roles, distribute task cards, monitor low-proficiency pupils first, and prompt pupils to explain answers.",
      pupilActivities: "Pupils complete a matching, sorting, reading, speaking, or writing task in pairs/groups.",
      remarks: {
        cba: "Teacher observes pair/group practice",
        thinkingSkills: "Apply and sort information",
        cce: "Language and values",
        ict: "Not required",
        tlm: "Task cards and worksheet",
        aied: "Drawing or movement where suitable",
        softSkills: "Collaboration",
        twentyFirstCentury: "Group roles",
        differentiation: "Sentence starters, peer support, challenge cards",
        value: "Responsibility",
      },
    },
    {
      stage: "Stage III",
      minutes: 20,
      lessonContent: "Application and HOTS task.",
      teacherActivities: "Give a problem or scenario. Ask pupils to compare, justify, create, or improve an answer.",
      pupilActivities: "Pupils produce a short response, mini-poster, role-play, or group answer and explain their choice.",
      remarks: {
        cba: "Group product and oral explanation",
        thinkingSkills: "Compare, justify, create",
        cce: "Values and communication",
        ict: "Optional camera/projector for sharing",
        tlm: "Mini-poster materials or response cards",
        aied: "Mini-poster or role-play",
        softSkills: "Creativity and confidence",
        twentyFirstCentury: "Critical thinking and collaboration",
        differentiation: "Challenge prompt for confident pupils; guided frame for support group",
        value: "Confidence",
      },
    },
    {
      stage: "Post Lesson",
      minutes: 10,
      lessonContent: "Closure, PBD evidence, and next step.",
      teacherActivities: "Review success criteria, collect exit tickets, and name reteach/extension groups.",
      pupilActivities: "Pupils complete an exit ticket and share one thing they can now do.",
      remarks: {
        cba: "Exit ticket and teacher notes",
        thinkingSkills: "Reflect and explain learning",
        cce: "Values",
        ict: "Not required",
        tlm: "Exit ticket",
        aied: "Not applicable",
        softSkills: "Self-awareness",
        twentyFirstCentury: "Reflection",
        differentiation: "Reteach, on-track, and extension grouping",
        value: "Responsibility",
      },
    },
  ];

  return {
    title: `${year} ${subject} ${skill} Lesson: ${topic}`,
    templateType,
    lessonDetails: {
      subject,
      year,
      className,
      numberOfStudents: numberOfStudents || "35",
      date,
      startTime,
      endTime,
      durationMinutes,
      topic,
      skill,
      studentProficiency: studentProficiency || "Mixed ability",
      classroomEnvironment: classroomEnvironment || "Standard classroom with limited ICT",
      teachingNotes: teachingNotes || "",
      priorKnowledge: priorKnowledge || "Pupils know basic vocabulary related to the topic.",
      materials: materials || "Pictures, word cards, worksheet, board, exit ticket",
      assessmentType: assessmentType || "PBD observation and exit ticket",
    },
    objectives: [
      `Pupils can understand simple ideas about ${topic}.`,
      "Pupils can work in pairs or groups to share answers.",
      "Pupils can show learning through a short oral or written response.",
    ],
    activities: [
      "Set induction: Show a picture or real object. Ask pupils what they notice.",
      "Teacher modelling: Give one simple example and write key words on the board.",
      "Group work: Pupils complete a matching, sorting, or discussion task in groups of four.",
      "Scaffolded practice: Low-support group uses sentence starters; challenge group explains why.",
      "Closure: Pupils share one answer and complete an exit ticket.",
    ],
    procedure,
    assessment: [
      "Observation of group talk and participation.",
      "Exit ticket with one answer and one reason.",
      "Teacher checklist for Content Standard, Learning Standard, and Learning Outcome alignment.",
    ],
    kssrAlignment: {
      contentStandard: "Aligned to the topic and selected primary skill.",
      learningStandard: "Pupils practise the target skill through guided and independent tasks.",
      learningOutcomes: "Outcomes are measurable through oral response, written response, and teacher observation.",
    },
    skillOutcome: `Use ${skill.toLowerCase()} skills to complete scaffolded tasks about ${topic}.`,
    classroomBasedAssessment: "Oral: √\nObservation: √\nWritten: as needed",
    instruments: "Observation checklist, oral responses, worksheet or exit ticket",
    thinkingSkills: "Recall, understand, apply, analyse",
    habitsOfMind: "Thinking flexibly; striving for accuracy; listening with understanding",
    hots: "Compare, justify, explain why, create response",
    crossCurricularElements: "Language; values; environmental awareness where relevant",
    ict: "Projector optional; printed visuals and board can be used.",
    artsInEducation: "Drawing, chant, rhythm, or movement where applicable",
    softSkills: "Communication, collaboration, confidence, respect",
    twentyFirstCentury: "Collaborative learning, communication, creativity, critical thinking",
    sowReference: {
      sourceType: sowSource?.sourceType || "kpm",
      name: sowSource?.name || "KPM Default Scheme of Work",
      note: "Lesson sequence follows the selected Scheme of Work source.",
    },
    successCriteria: ["I can use the target words correctly.", "I can complete the group task.", "I can share one answer with a reason."],
    differentiation: ["Sentence starters for low-proficiency pupils.", "Challenge question for confident pupils.", "Peer support in mixed groups."],
  };
}

function normalizeGenerateResponse(value, fallbackInput) {
  const fallback = mockGenerate(fallbackInput);
  const source = value && typeof value === "object" ? value : {};
  const procedure = normalizeProcedure(source.procedure, fallback.procedure);
  const activities = ensureArray(source.activities, serializeProcedureSteps(procedure), 8);

  return stripMarkdownMarkers({
    title: String(source.title || fallback.title),
    templateType: String(source.templateType || fallback.templateType),
    lessonDetails: source.lessonDetails && typeof source.lessonDetails === "object" ? source.lessonDetails : fallback.lessonDetails,
    objectives: cleanObjectives(source.objectives, fallback.objectives, 5),
    activities,
    procedure,
    steps: serializeProcedureSteps(procedure),
    assessment: ensureArray(source.assessment, fallback.assessment, 5),
    kssrAlignment:
      source.kssrAlignment && typeof source.kssrAlignment === "object" ? source.kssrAlignment : fallback.kssrAlignment,
    skillOutcome: String(source.skillOutcome || fallback.skillOutcome),
    classroomBasedAssessment: String(source.classroomBasedAssessment || fallback.classroomBasedAssessment),
    instruments: String(source.instruments || fallback.instruments),
    thinkingSkills: String(source.thinkingSkills || fallback.thinkingSkills),
    habitsOfMind: String(source.habitsOfMind || fallback.habitsOfMind),
    hots: String(source.hots || fallback.hots),
    crossCurricularElements: String(source.crossCurricularElements || fallback.crossCurricularElements),
    ict: String(source.ict || fallback.ict),
    artsInEducation: String(source.artsInEducation || fallback.artsInEducation),
    softSkills: String(source.softSkills || fallback.softSkills),
    twentyFirstCentury: String(source.twentyFirstCentury || fallback.twentyFirstCentury),
    sowReference: source.sowReference && typeof source.sowReference === "object" ? source.sowReference : fallback.sowReference,
    successCriteria: ensureArray(source.successCriteria, fallback.successCriteria, 5),
    differentiation: ensureArray(source.differentiation, fallback.differentiation, 5),
  });
}

function mockAnalyze(lessonPlan) {
  const text = lessonPlan.toLowerCase();
  const interactive = hasAny(text, ["group", "pair", "peer", "discuss", "collaborat", "share"]);
  const hots = hasAny(text, ["justify", "evaluate", "create", "analyse", "analyze", "compare", "design", "reason"]);
  const scaffolded = hasAny(text, ["scaffold", "sentence starter", "visual", "support", "model", "example"]);

  return {
    engagementLevel: interactive ? "Medium" : "Low",
    hotsLevel: hots ? "Medium" : "Low",
    kssrAlignment: analyzeKssrAlignment(lessonPlan),
    pbdAssessment: {
      assessmentType: "Formative PBD observation, oral response sampling, and exit ticket",
      evidence:
        "Teacher records pair responses, collects one written opinion sentence, and notes pupils needing BM/BI support using a simple TP1-TP6 checklist.",
      improvement:
        "Define success criteria for TP3 basic explanation and TP4 reasoned response, then group pupils for reteaching or extension.",
    },
    weaknesses: [
      interactive
        ? "Interaction exists, but group roles and child-friendly instructions need to be clearer."
        : "Lesson is teacher-centered, which can reduce participation in mixed ability primary classrooms.",
      hots
        ? "HOTS is present, but pupils need clearer success criteria to produce quality justification."
        : "The task does not yet require pupils to justify, compare, evaluate, or create.",
      scaffolded
        ? "Scaffolding is present, but BM/BI bridging should be more deliberate for weaker pupils."
        : "Pupils need visual support, model answers, sentence starters, or BM/BI keyword support.",
    ],
    improvements: [
      "Add a 3-minute Think-Pair-Share before whole-class responses so young pupils rehearse answers safely.",
      "Convert one recall question into a justify-or-compare HOTS prompt with a simple TP-linked success criterion.",
      "Use picture prompts, BI sentence starters, and optional BM keyword support, then fade the scaffold for stronger pupils.",
    ],
  };
}

function normalizeAnalyzeResponse(value, lessonPlan) {
  const fallback = mockAnalyze(lessonPlan);
  const source = value && typeof value === "object" ? value : {};

  return {
    engagementLevel: normalizeLevel(source.engagementLevel, fallback.engagementLevel),
    hotsLevel: String(source.hotsLevel || fallback.hotsLevel),
    kssrAlignment: normalizeKssrAlignment(source.kssrAlignment, lessonPlan),
    pbdAssessment: normalizePbdAssessment(source.pbdAssessment),
    weaknesses: ensureThree(source.weaknesses, fallback.weaknesses),
    improvements: ensureThree(source.improvements, fallback.improvements),
  };
}

function mockSimulate(lessonPlan) {
  const text = lessonPlan.toLowerCase();
  const interactive = hasAny(text, ["group", "pair", "discuss", "role", "peer", "share"]);
  const scaffolded = hasAny(text, ["starter", "scaffold", "model", "visual", "example", "bm", "bi"]);
  const engagementPercent = Math.min(90, 36 + (interactive ? 26 : 0) + (scaffolded ? 18 : 0));

  return {
    engagementPercent,
    studentReactions: [
      interactive
        ? "Most pupils participate when simple group roles are assigned, though some quiet pupils still need pair rehearsal."
        : "Many pupils become passive during long teacher explanation and wait for exam-style answers.",
      scaffolded
        ? "Low-proficiency pupils attempt responses because BM/BI language support is visible."
        : "Weak pupils may copy or stay silent because the language demand is too high.",
      "Primary pupils respond better when instructions are short, visible, timed, and repeated with one example.",
    ],
    teachingIssues: [
      interactive
        ? "Noise and off-task talk need clear timing, group roles, and quick monitoring routines."
        : "Teacher talk time is likely too high for mixed ability engagement.",
      scaffolded
        ? "Scaffolds should be faded after pupils show confidence."
        : "Lack of examples and sentence frames may widen the proficiency gap.",
      "Exam-oriented pupils may undervalue discussion unless it connects to PBD evidence, TP descriptors, or assessment criteria.",
    ],
  };
}

function normalizeSimulationResponse(value, lessonPlan) {
  const fallback = mockSimulate(lessonPlan);
  const source = value && typeof value === "object" ? value : {};
  const engagementPercent = Number.isFinite(Number(source.engagementPercent))
    ? Math.max(0, Math.min(100, Math.round(Number(source.engagementPercent))))
    : fallback.engagementPercent;

  return {
    engagementPercent,
    studentReactions: ensureThree(source.studentReactions, fallback.studentReactions),
    teachingIssues: ensureThree(source.teachingIssues, fallback.teachingIssues),
  };
}

function mockImprove() {
  return {
    improvedLesson:
      "KSSR Focus: Communication, personal skills, values, and child-friendly activity-based learning.\n\n1. Set Induction (5 min): Show a picture, real object, or simple story. Pupils say what they notice using one word or one short sentence.\n\n2. Teacher Modelling (8 min): Teacher models one answer using simple language and visual support. Key words are written on the board with optional BM meaning.\n\n3. Guided Pair Practice (10 min): Pupils practise in pairs using sentence starters. Teacher gives easier frames to low-proficiency pupils and challenge prompts to confident pupils.\n\n4. Group Activity (20 min): Groups of four complete a sorting, matching, reading, speaking, or mini-poster task. Roles: reader, helper, writer, speaker. Teacher checks three groups first, then supports pupils who need help.\n\n5. HOTS Check (10 min): Pupils compare two answers or explain why one answer is better using simple words.\n\n6. PBD Exit Evidence (7 min): Each pupil completes one short exit ticket. Teacher sorts responses into reteach, on-track, and extension groups.",
    pedagogicalMoves: [
      "Reduces teacher talk and increases structured pupil talk through pair and group rehearsal.",
      "Adds HOTS through comparison and justification rather than recall only.",
      "Creates PBD evidence through observation, group reporting, exit tickets, and TP-linked success criteria.",
    ],
    differentiation: [
      "Low-proficiency pupils receive BI sentence frames and BM keyword bridging.",
      "Higher-proficiency pupils extend answers with reasons, examples, and justification.",
      "Large-class management is supported through fixed group roles, short timed tasks, and quick sampling rather than checking every pupil one by one.",
    ],
  };
}

function normalizeImproveResponse(value) {
  const fallback = mockImprove();
  const source = value && typeof value === "object" ? value : {};

  return {
    improvedLesson: String(source.improvedLesson || fallback.improvedLesson),
    pedagogicalMoves: ensureThree(source.pedagogicalMoves, fallback.pedagogicalMoves),
    differentiation: ensureThree(source.differentiation, fallback.differentiation),
  };
}

function normalizeKssrCheckResponse(value, lessonPlan) {
  const fallback = calculateKssrCheck(lessonPlan);
  const source = value && typeof value === "object" ? value : {};
  const alignmentScore = Number.isFinite(Number(source.alignmentScore))
    ? Math.max(0, Math.min(100, Math.round(Number(source.alignmentScore))))
    : fallback.alignmentScore;

  return {
    alignmentScore,
    missingElements: Array.isArray(source.missingElements) ? source.missingElements : fallback.missingElements,
    recommendations: ensureThree(source.recommendations, fallback.recommendations),
  };
}

function buildSystemPrompt(task) {
  return `You are LessonCraft MY, a modular AI pedagogical engine for Malaysian education.
Your task: ${task}.
${MALAYSIAN_CONTEXT}
${buildKssrPromptRequirement()}
Use KSSR-aware, PBD-aware, practical recommendations. Evaluate Content Standard (CS), Learning Standard (LS), and Learning Outcomes (LO). Check alignment between CS, LS, and LO, measurable objectives, student-centered learning, simple instructions, group work, visual support, scaffolded learning, HOTS/KBAT, and activity-based primary pedagogy.
Return only valid JSON.`;
}

export async function generateLesson({
  topic,
  year,
  subject = "English",
  skill,
  classroomType,
  objectives = "",
  template = "",
  templateType = "Default MOE Template",
  date = "",
  startTime = "",
  endTime = "",
  durationMinutes = 60,
  className = "",
  numberOfStudents = "",
  priorKnowledge = "",
  materials = "",
  assessmentType = "",
  stepsOverview = "",
  studentProficiency = "",
  classroomEnvironment = "",
  teachingNotes = "",
  sowSource,
}) {
  const safeYear = /^Year [1-6]$/.test(year) ? year : "Year 4";
  const userPrompt = `Generate a Malaysian primary school KSSR lesson plan.

Return JSON exactly:
{
  "title": "short lesson title",
  "templateType": "selected template type",
  "lessonDetails": {
    "subject": "English",
    "year": "Year 4",
    "className": "class name",
    "numberOfStudents": "35",
    "date": "date",
    "startTime": "start time",
    "endTime": "end time",
    "durationMinutes": 60,
    "topic": "topic",
    "skill": "Reading",
    "priorKnowledge": "prior knowledge",
    "materials": "materials",
    "assessmentType": "PBD method"
  },
  "objectives": ["objective 1", "objective 2", "objective 3"],
  "successCriteria": ["criterion 1", "criterion 2", "criterion 3"],
  "skillOutcome": "what pupils need to do",
  "classroomBasedAssessment": "Oral: √\\nObservation: √\\nWritten: as needed",
  "instruments": "assessment instruments",
  "thinkingSkills": "TS entries",
  "habitsOfMind": "HoM entries",
  "hots": "HOTS entries",
  "crossCurricularElements": "CCE entries",
  "ict": "ICT entries",
  "artsInEducation": "AEd entries or Not applicable",
  "softSkills": "SS entries",
  "twentyFirstCentury": "21stCPP entries",
  "activities": ["activity 1", "activity 2", "activity 3", "activity 4", "activity 5"],
  "procedure": [
    {
      "stage": "Pre Lesson",
      "minutes": 5,
      "lessonContent": "specific content",
      "teacherActivities": "exact teacher actions and questions",
      "pupilActivities": "exact pupil actions and expected responses",
      "remarks": {
        "cba": "stage-specific CBA",
        "thinkingSkills": "TS/HoM/HOTS for this stage",
        "cce": "CCE for this stage",
        "ict": "ICT for this stage",
        "tlm": "teaching and learning materials",
        "aied": "arts in education if applicable",
        "softSkills": "soft skills",
        "twentyFirstCentury": "21stCPP",
        "differentiation": "DS",
        "value": "stage value"
      }
    },
    {
      "stage": "Lesson Development Stage I",
      "minutes": 10,
      "lessonContent": "specific content",
      "teacherActivities": "exact teacher actions and questions",
      "pupilActivities": "exact pupil actions and expected responses",
      "remarks": {
        "cba": "stage-specific CBA",
        "thinkingSkills": "TS/HoM/HOTS for this stage",
        "cce": "CCE for this stage",
        "ict": "ICT for this stage",
        "tlm": "teaching and learning materials",
        "aied": "arts in education if applicable",
        "softSkills": "soft skills",
        "twentyFirstCentury": "21stCPP",
        "differentiation": "DS",
        "value": "stage value"
      }
    },
    {
      "stage": "Stage II",
      "minutes": 15,
      "lessonContent": "specific content",
      "teacherActivities": "exact teacher actions and questions",
      "pupilActivities": "exact pupil actions and expected responses",
      "remarks": {
        "cba": "stage-specific CBA",
        "thinkingSkills": "TS/HoM/HOTS for this stage",
        "cce": "CCE for this stage",
        "ict": "ICT for this stage",
        "tlm": "teaching and learning materials",
        "aied": "arts in education if applicable",
        "softSkills": "soft skills",
        "twentyFirstCentury": "21stCPP",
        "differentiation": "DS",
        "value": "stage value"
      }
    },
    {
      "stage": "Stage III",
      "minutes": 20,
      "lessonContent": "specific content",
      "teacherActivities": "exact teacher actions and questions",
      "pupilActivities": "exact pupil actions and expected responses",
      "remarks": {
        "cba": "stage-specific CBA",
        "thinkingSkills": "TS/HoM/HOTS for this stage",
        "cce": "CCE for this stage",
        "ict": "ICT for this stage",
        "tlm": "teaching and learning materials",
        "aied": "arts in education if applicable",
        "softSkills": "soft skills",
        "twentyFirstCentury": "21stCPP",
        "differentiation": "DS",
        "value": "stage value"
      }
    },
    {
      "stage": "Post Lesson",
      "minutes": 10,
      "lessonContent": "specific content",
      "teacherActivities": "exact teacher actions and questions",
      "pupilActivities": "exact pupil actions and expected responses",
      "remarks": {
        "cba": "stage-specific CBA",
        "thinkingSkills": "TS/HoM/HOTS for this stage",
        "cce": "CCE for this stage",
        "ict": "ICT for this stage",
        "tlm": "teaching and learning materials",
        "aied": "arts in education if applicable",
        "softSkills": "soft skills",
        "twentyFirstCentury": "21stCPP",
        "differentiation": "DS",
        "value": "stage value"
      }
    }
  ],
  "assessment": ["assessment 1", "assessment 2", "assessment 3"],
  "differentiation": ["strategy 1", "strategy 2", "strategy 3"],
  "kssrAlignment": {
    "contentStandard": "short CS alignment",
    "learningStandard": "short LS alignment",
    "learningOutcomes": "short LO alignment"
  },
  "sowReference": {
    "sourceType": "kpm or custom",
    "name": "SoW source name",
    "note": "how the lesson follows the SoW"
  }
}

Inputs:
Topic: ${topic}
Subject: ${subject}
Year: ${safeYear}
Skill: ${skill}
Classroom type: ${classroomType}
Teacher-entered objectives: ${objectives || "Generate measurable KSSR objectives from the topic."}
Teacher-entered lesson steps overview: ${stepsOverview || "Teacher did not provide a sequence. Generate a complete sequence from the topic and KSSR standards."}
Preferred lesson template: ${templateType || template || "Default MOE Template"}
Date: ${date || "Teacher may fill later"}
Time: ${startTime || ""}${endTime ? `-${endTime}` : ""}
Duration: ${durationMinutes || 60} minutes
Class name: ${className || "Not linked to a class"}
Number of pupils: ${numberOfStudents || "Teacher may fill later"}
Student proficiency: ${studentProficiency || "Mixed ability"}
Classroom environment: ${classroomEnvironment || "Standard Malaysian primary classroom; assume large class and limited ICT unless stated."}
Teaching notes: ${teachingNotes || "No additional teacher notes."}
Prior knowledge: ${priorKnowledge || "Infer from topic and year."}
Materials: ${materials || "Suggest practical low-ICT materials."}
Assessment type: ${assessmentType || "PBD formative assessment"}

${buildSowInstruction(sowSource)}

Must use simple child-friendly instructions, group work, visual support, and scaffolded learning.
Use plain text only inside every JSON string value. Do not use Markdown formatting or symbols such as **bold**, __bold__, backticks, Markdown headings, or Markdown bullet markers.
If the teacher entered a lesson steps overview, preserve its sequence and expand it into the five lesson stages.
For objectives, DO NOT repeat "By the end of the lesson" or "By the end of the 60-minute lesson" inside every objective item. Put that lead-in only once in the document; objective array items must start directly with the measurable pupil action.
The procedure must be complete, detailed, and classroom-ready, like a real Malaysian RPH. Do not write short generic lines.
For every procedure stage:
- lessonContent must be 1 to 2 specific sentences about what is being taught or practised.
- teacherActivities must be 3 to 5 detailed sentences with teacher actions, exact prompts/questions, modelling, monitoring, and scaffolding.
- pupilActivities must be 2 to 4 detailed sentences with expected pupil actions, responses, grouping, and evidence of learning.
- remarks must include stage-specific CBA/PBD evidence, materials, TS/HoM/HOTS, CCE, ICT, T&LM, AEd, soft skills, 21stCPP, differentiation, and values.
Use the teacher-entered overview as the backbone, but expand each stage with enough practical detail for a substitute teacher to run the lesson.
Generate the document-ready fields for Content Standard (CS), Learning Standard (LS), Learning Outcome (LO), Knowledge, Skill, Value, Learning Objectives, Success Criteria, Classroom Based Assessment, Instruments, Thinking Skills, Habits of Mind, HOTS, CCE, ICT, T&LM, Arts in Education, Soft Skills, Teaching Strategies, 21stCPP, Differentiation Strategy, and all five lesson stages.`;

  const ai = await callAI(buildSystemPrompt("generate a KSSR primary lesson plan"), userPrompt);
  return { ...normalizeGenerateResponse(ai.data, {
    topic,
    year: safeYear,
    subject,
    skill,
    classroomType,
    templateType,
    date,
    startTime,
    endTime,
    durationMinutes,
    className,
    numberOfStudents,
    priorKnowledge,
    materials,
    assessmentType,
    stepsOverview,
    studentProficiency,
    classroomEnvironment,
    teachingNotes,
    sowSource,
  }), aiSource: buildAiSource(ai) };
}

export async function analyzeLesson(lessonPlan) {
  const userPrompt = `Analyze this lesson plan.

Return JSON exactly in this shape:
{
  "engagementLevel": "Low | Medium | High",
  "hotsLevel": "Low | Medium | High plus short reason",
  "kssrAlignment": {
    "communication": "Low | Medium | High",
    "spiritualValues": "Low | Medium | High",
    "humanities": "Low | Medium | High",
    "scienceTechnology": "Low | Medium | High",
    "personalSkills": "Low | Medium | High",
    "physicalAesthetic": "Low | Medium | High"
  },
  "pbdAssessment": {
    "assessmentType": "short text naming PBD method and TP focus",
    "evidence": "short text naming observable evidence",
    "improvement": "short text naming next instructional response"
  },
  "weaknesses": ["point 1", "point 2", "point 3"],
  "improvements": ["point 1", "point 2", "point 3"]
}

Lesson plan:
${lessonPlan}`;

  const ai = await callAI(buildSystemPrompt("KSSR-aligned lesson analysis"), userPrompt);
  return { ...normalizeAnalyzeResponse(ai.data, lessonPlan), aiSource: buildAiSource(ai) };
}

export async function simulateLesson(lessonPlan) {
  const userPrompt = `Simulate likely classroom outcomes for this lesson plan.

Return JSON exactly in this shape:
{
  "engagementPercent": 0,
  "studentReactions": ["reaction 1", "reaction 2", "reaction 3"],
  "teachingIssues": ["issue 1", "issue 2", "issue 3"]
}

Lesson plan:
${lessonPlan}`;

  const ai = await callAI(buildSystemPrompt("Malaysian classroom simulation"), userPrompt);
  return { ...normalizeSimulationResponse(ai.data, lessonPlan), aiSource: buildAiSource(ai) };
}

export async function improveLesson(lessonPlan) {
  const userPrompt = `Rewrite this lesson with better pedagogy, differentiation, student-centered activities, BM/BI scaffolding, PBD evidence, HOTS/KBAT, six-pillar KSSR awareness, and large-class practicality.

Return JSON exactly in this shape:
{
  "improvedLesson": "rewritten lesson text",
  "pedagogicalMoves": ["move 1", "move 2", "move 3"],
  "differentiation": ["support 1", "support 2", "support 3"]
}

Lesson plan:
${lessonPlan}`;

  const ai = await callAI(buildSystemPrompt("lesson improvement"), userPrompt);
  return { ...normalizeImproveResponse(ai.data), aiSource: buildAiSource(ai) };
}

export async function checkKssrAlignment(lessonPlan) {
  const userPrompt = `Check only KSSR alignment for this lesson plan.

Return JSON exactly in this shape:
{
  "alignmentScore": 0,
  "missingElements": ["missing 1", "missing 2", "missing 3"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}

Lesson plan:
${lessonPlan}`;

  const ai = await callAI(buildSystemPrompt("KSSR alignment checking"), userPrompt);
  return { ...normalizeKssrCheckResponse(ai.data, lessonPlan), aiSource: buildAiSource(ai) };
}

function mockEvaluate(lessonPlan) {
  const annotations = [
    {
      text: "Teacher explains",
      issue: "Too teacher-centered",
      explanation: "Primary pupils need short input followed by activity-based practice.",
      suggestion: "Change this into a short model plus pair or group task.",
      severity: "high",
    },
    {
      text: "recall questions",
      issue: "Low HOTS level",
      explanation: "Recall checks memory but may not show understanding or reasoning.",
      suggestion: "Add one compare, sort, explain why, or create task.",
      severity: "medium",
    },
    {
      text: "worksheet",
      issue: "Needs scaffolding",
      explanation: "Mixed ability pupils may need visual support and sentence starters.",
      suggestion: "Add picture prompts, word bank, and easier/challenge versions.",
      severity: "medium",
    },
  ].filter((annotation) => lessonPlan.toLowerCase().includes(annotation.text.toLowerCase()));

  return {
    annotations: annotations.length
      ? annotations
      : [
          {
            text: lessonPlan.split(/\s+/).slice(0, 4).join(" "),
            issue: "KSSR alignment needs checking",
            explanation: "The lesson should clearly show CS, LS, LO, activity-based learning, and PBD evidence.",
            suggestion: "Add clear measurable outcomes, group work, visual support, and an exit ticket.",
            severity: "medium",
          },
        ],
  };
}

function normalizeEvaluateResponse(value, lessonPlan, classData = "") {
  const fallback = mockEvaluate(lessonPlan);
  const source = value && typeof value === "object" ? value : {};
  const annotations = Array.isArray(source.annotations) ? source.annotations : fallback.annotations;
  const classRationale = classData
    ? `Class-data rationale: ${classData}`
    : "Class-data rationale: No class records were supplied, so this is based on the lesson text and typical mixed-ability KSSR needs.";

  return {
    annotations: annotations
      .filter((item) => item && typeof item === "object")
      .map((item) => {
        const text = String(item.text || "").trim();
        let start = Number(item.start);
        let end = Number(item.end);
        if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0) {
          if (text) {
            let idx = lessonPlan.indexOf(text);
            if (idx < 0) idx = lessonPlan.toLowerCase().indexOf(text.toLowerCase());
            if (idx >= 0) { start = idx; end = idx + text.length; }
          }
        }
        return {
          text,
          start: Number.isFinite(start) ? start : -1,
          end: Number.isFinite(end) ? end : -1,
          issue: String(item.issue || "Issue"),
          explanation: String(item.explanation || "This part needs clearer KSSR teaching logic."),
          suggestion: String(item.suggestion || "Revise with simple instructions, scaffolding, and PBD evidence."),
          rationale: String(item.rationale || classRationale),
          attention: String(item.attention || item.issue || "Needs attention"),
          severity: String(item.severity || "medium").toLowerCase() === "high" ? "high" : "medium",
          category: String(item.category || item.issue || "KSSR/DSKP Review"),
        };
      })
      .filter((item) => item.start >= 0 || item.text),
  };
}

export async function evaluateLesson(lessonPlan, classData = "") {
  const userPrompt = `Evaluate this Malaysian primary school KSSR lesson plan like a mentor teacher or lecturer reviewing an RPH.

Return EXACT JSON:
{
  "annotations": [
    {
      "start": 124,
      "end": 151,
      "issue": "Too generic",
      "explanation": "Does not specify measurable outcome",
      "suggestion": "Add number of sentences required",
      "rationale": "why this matters based on the lesson and class data",
      "severity": "medium",
      "category": "Learning Objective | KSSR Alignment | HOTS | PBD | Differentiation | Clarity | Lesson Flow | Timing | Activities | PAK-21 | KBAT | Assessment | Teaching Aids | Classroom Management | Language | Inclusivity | Reflection"
    }
  ],
  "rubric": {
    "curriculumAlignment": { "score": 9, "maxScore": 10, "status": "excellent", "note": "CS and LS are well aligned." },
    "learningObjectives": { "score": 8, "maxScore": 10, "status": "good", "note": "SMART objectives mostly met." },
    "lessonFlow": { "score": 10, "maxScore": 10, "status": "excellent", "note": "All stages present and well sequenced." },
    "activities": { "score": 8, "maxScore": 10, "status": "good", "note": "Student-centred and interactive." },
    "pak21": { "score": 7, "maxScore": 10, "status": "could_improve", "note": "More student voice needed." },
    "kbatHots": { "score": 6, "maxScore": 10, "status": "could_improve", "note": "Needs more higher-order tasks." },
    "assessment": { "score": 9, "maxScore": 10, "status": "excellent", "note": "Strong PBD alignment." },
    "differentiation": { "score": 5, "maxScore": 10, "status": "needs_work", "note": "Add support for mixed abilities." },
    "teachingAids": { "score": 8, "maxScore": 10, "status": "good", "note": "Materials are practical." },
    "language": { "score": 9, "maxScore": 10, "status": "excellent", "note": "Clear and professional." },
    "reflection": { "score": 7, "maxScore": 10, "status": "could_improve", "note": "More specific evidence needed." },
    "classroomManagement": { "score": 8, "maxScore": 10, "status": "good", "note": "Good grouping strategy." },
    "inclusivity": { "score": 7, "maxScore": 10, "status": "could_improve", "note": "Consider SEN support." },
    "timing": { "score": 8, "maxScore": 10, "status": "good", "note": "Time allocation is reasonable." },
    "overallScore": 81,
    "overallGrade": "good"
  }
}

Rules:
- "start" and "end" are CHARACTER OFFSETS into the lesson plan text (0-based). They mark the exact span to highlight.
- The highlighted span must be an exact substring of the lesson plan text, copied character-for-character.
- Count characters carefully. The first character is offset 0.
- "end" is exclusive (the index AFTER the last character of the span).
- Use "medium" severity for yellow highlights and "high" for red highlights.
- Return 3 to 8 annotations across different categories.
- Do NOT return a "text" field — only "start", "end", and the issue/explanation fields.
- The rubric must evaluate ALL 14 dimensions listed above. Score each from 0 to maxScore (10).
- "status" must be one of: "excellent", "good", "could_improve", "needs_work".
- "overallScore" is the sum of all category scores out of 100 (since there are 10 categories each worth 10 — wait, there are 14, so scale to 100).
- "overallGrade" must be one of: "excellent" (85+), "good" (70-84), "could_improve" (50-69), "needs_work" (below 50).

Class data:
${classData || "No class records supplied."}

Lesson plan:
${lessonPlan}`;

  const ai = await callAI(buildSystemPrompt("evaluate a KSSR lesson document with highlight comments and rubric scoring"), userPrompt);
  const result = { ...normalizeEvaluateResponse(ai.data, lessonPlan, classData), aiSource: buildAiSource(ai) };
  // Extract rubric if the AI returned it.
  if (ai.data && ai.data.rubric) {
    result.rubric = ai.data.rubric;
  }
  return result;
}

// ---------------------------------------------------------------------------
// AI COPILOT — context-aware conversational assistant
// The copilot knows what happened in the teacher's workspace because the route
// gathers real lesson plans, classes, students, assessments, and schedule
// periods and passes them here as a structured context summary.
// ---------------------------------------------------------------------------

// Turn the teacher's real workspace data into a compact text block the model
// can reason about. Stays under a reasonable token budget by truncating lists.
export function buildCopilotContext({ teacher, classes = [], students = [], lessons = [], assessments = [], schedule = [] } = {}) {
  const lines = [];
  lines.push("=== TEACHER WORKSPACE CONTEXT ===");
  lines.push(`Teacher: ${teacher?.name || "Unknown"} — School: ${teacher?.school || "Unknown"}`);

  lines.push(`\n--- CLASSES (${classes.length}) ---`);
  if (classes.length) {
    classes.slice(0, 12).forEach((c) => {
      lines.push(`• ${c.name} · ${c.year} · ${c.subject || "English"} · ${c.studentCount || 0} pupils · ${c.studentProficiency || "Mixed ability"} · ${c.status || "active"}`);
    });
  } else {
    lines.push("(no classes created yet)");
  }

  lines.push(`\n--- STUDENTS (${students.length}) ---`);
  if (students.length) {
    // Group by proficiency band for the model
    const byProf = {};
    students.slice(0, 30).forEach((s) => {
      const band = String(s.proficiency || "Mixed ability").trim();
      (byProf[band] = byProf[band] || []).push(s.studentName);
    });
    Object.entries(byProf).forEach(([band, names]) => {
      lines.push(`• ${band} (${names.length}): ${names.slice(0, 6).join(", ")}${names.length > 6 ? "…" : ""}`);
    });
  } else {
    lines.push("(no student rosters yet)");
  }

  lines.push(`\n--- LESSON PLANS (${lessons.length}) ---`);
  if (lessons.length) {
    lessons.slice(0, 12).forEach((l) => {
      const objCount = (l.objectives || []).length;
      lines.push(`• "${l.title || "Untitled"}" · ${l.year} · ${l.skill || "?"} · ${l.subject || "English"} · ${objCount} objectives · ${l.status || "draft"}${l.className ? ` · ${l.className}` : ""}`);
    });
  } else {
    lines.push("(no lesson plans generated yet)");
  }

  lines.push(`\n--- ASSESSMENTS / PBD (${assessments.length}) ---`);
  if (assessments.length) {
    assessments.slice(0, 10).forEach((a) => {
      const recordCount = (a.records || []).length;
      const tps = (a.records || []).map((r) => r.tp).filter(Number.isFinite);
      const avgTp = tps.length ? (tps.reduce((t, n) => t + n, 0) / tps.length).toFixed(1) : "—";
      lines.push(`• ${a.title} · ${a.year} · ${a.assessmentType || "PBD"} · ${recordCount} assessed · avg TP ${avgTp}`);
    });
  } else {
    lines.push("(no PBD assessments recorded yet)");
  }

  lines.push(`\n--- SCHEDULE PERIODS (${schedule.length}) ---`);
  if (schedule.length) {
    schedule.slice(0, 10).forEach((p) => {
      lines.push(`• ${p.day} ${p.startTime}-${p.endTime} · ${p.className || "—"} · ${p.subject || "English"} · ${p.topic || "—"}`);
    });
  } else {
    lines.push("(no timetable periods yet)");
  }

  lines.push("\n=== END CONTEXT ===");
  return lines.join("\n");
}

// Heuristic local response when the AI model is unreachable. Parses the question
// for keywords and gives a workspace-aware answer from the structured context.
// Each response may append [action:pageId] tags so the frontend can render
// shortcut buttons that jump the teacher to the relevant page.
function copilotHeuristicResponse(question, contextText) {
  const q = String(question || "").toLowerCase();
  const has = (kw) => q.includes(kw);

  // Extract counts from context text
  const classCount = (contextText.match(/--- CLASSES \((\d+)\)/) || [])[1] || 0;
  const studentCount = (contextText.match(/--- STUDENTS \((\d+)\)/) || [])[1] || 0;
  const lessonCount = (contextText.match(/--- LESSON PLANS \((\d+)\)/) || [])[1] || 0;
  const assessmentCount = (contextText.match(/--- ASSESSMENTS \/ PBD \((\d+)\)/) || [])[1] || 0;
  const scheduleCount = (contextText.match(/--- SCHEDULE PERIODS \((\d+)\)/) || [])[1] || 0;

  if (has("class") || has("roster")) {
    return `You have ${classCount} class(es) registered. ${Number(classCount) ? "Open the Classes page to add students or create a new class. For a new English class, pick a Year (1–6), set the proficiency level, and the system will track pupil counts automatically." : "Start by creating your first class from the Classes page — choose a Year, subject, and proficiency mix."}\n[action:classes]`;
  }
  if (has("student") || has("pupil")) {
    return `You have ${studentCount} student(s) across all classes. ${Number(studentCount) ? "You can record PBD proficiency (TP1–TP6) for each pupil on the PBD & Assessment page." : "Add students by opening a class on the Classes page and using the roster editor."}\n[action:classes]`;
  }
  if (has("lesson") || has("rph") || has("plan")) {
    return `You have ${lessonCount} saved lesson plan(s). ${Number(lessonCount) ? "Open the Lesson Planner to generate a new RPH or review existing ones. Each lesson covers a KSSR skill (Reading, Writing, Speaking, Listening, Grammar, or Phonics)." : "Generate your first lesson plan from the Lesson Planner — enter a topic, year, and skill, and the AI will build a complete KSSR-aligned RPH."}\n[action:lesson-planner]`;
  }
  if (has("pbd") || has("assess") || has("tp")) {
    return `You have ${assessmentCount} PBD assessment(s) recorded. ${Number(assessmentCount) ? "Each assessment captures TP1–TP6 proficiency per pupil. Check the PBD & Assessment page to create a template and record evidence." : "Create a PBD assessment template on the PBD page first, then assess pupils with TP scores for each criterion."}\n[action:pbd]`;
  }
  if (has("schedule") || has("timetable") || has("period")) {
    return `You have ${scheduleCount} timetable period(s) saved. ${Number(scheduleCount) ? "The Timetable page lets you drag, resize, and edit recurring English periods. Changes persist to your weekly schedule." : "Add periods on the Timetable page — click 'New slot' to place a recurring English block in your weekly grid."}\n[action:timetable]`;
  }
  if (has("help") || has("what can") || has("how")) {
    return `I'm your ESLessonCraft teaching assistant. I can see your workspace: ${classCount} classes, ${studentCount} students, ${lessonCount} lesson plans, ${assessmentCount} assessments, and ${scheduleCount} schedule periods. Ask me about lesson planning, PBD assessment, student interventions, or classroom strategies — I'll tailor my answer to your actual data.`;
  }
  return `Based on your workspace (${classCount} classes, ${studentCount} students, ${lessonCount} lessons, ${assessmentCount} assessments), I can help with lesson planning, PBD recording, student interventions, or scheduling. Could you give me a bit more detail about what you need?`;
}

// Available shortcut actions the copilot can suggest. Each maps a page id
// (used in [action:pageId] tags) to a human-readable label + icon name.
const COPILOT_ACTIONS = {
  "lesson-planner": { label: "Generate Lesson Plan", icon: "Sparkles" },
  classes: { label: "Manage Classes", icon: "Users" },
  pbd: { label: "Record PBD", icon: "ClipboardCheck" },
  timetable: { label: "Open Timetable", icon: "CalendarDays" },
  analytics: { label: "View Analytics", icon: "BarChart3" },
  evaluate: { label: "Evaluate Lesson", icon: "FileCheck" },
  materials: { label: "Upload Materials", icon: "FolderOpen" },
};

// Parse [action:pageId] tags from a copilot reply. Returns the cleaned text
// and a list of action objects the frontend can render as shortcut buttons.
export function parseCopilotActions(reply) {
  const text = String(reply || "");
  const actions = [];
  const seen = new Set();
  const cleaned = text.replace(/\[action:([a-z-]+)\]/gi, (match, pageId) => {
    const action = COPILOT_ACTIONS[pageId.toLowerCase()];
    if (action && !seen.has(pageId.toLowerCase())) {
      seen.add(pageId.toLowerCase());
      actions.push({ pageId: pageId.toLowerCase(), label: action.label, icon: action.icon });
    }
    return "";
  }).replace(/\n{3,}/g, "\n\n").trim();
  return { reply: cleaned, actions };
}

export async function askCopilot(question, context) {
  const contextText = buildCopilotContext(context);
  const trimmedQuestion = String(question || "").trim();
  if (!trimmedQuestion) {
    return { reply: "Please type a question and I'll help.", actions: [], aiSource: buildAiSource({ fallbackTriggered: false }) };
  }

  const systemPrompt = `You are LessonCraft Copilot, an AI teaching assistant embedded in ESLessonCraft MY — a Malaysian KSSR primary school English teaching platform.
You can see the teacher's actual workspace data below. Use it to give specific, relevant answers.
${MALAYSIAN_CONTEXT}
Answer in a friendly, practical, 2-4 sentence reply unless the teacher asks for something detailed.
When you reference data (e.g. number of classes, student proficiency, lesson topics), use the real data from the context.
If the context shows little data, suggest what the teacher should create next.
Prefer actionable teaching advice over generic platitudes. Mention specific pupils, classes, or lessons from the context when relevant.

IMPORTANT — ACTION BUTTONS:
When you suggest the teacher do something (e.g. create a class, generate a lesson, record PBD, open the timetable, check analytics), append one or more action tags on a new line at the end of your reply in this exact format: [action:PAGE_ID]
Valid page IDs and when to use them:
- [action:lesson-planner] — when suggesting the teacher generate or review a lesson plan
- [action:classes] — when suggesting the teacher create a class or add students to a roster
- [action:pbd] — when suggesting the teacher record PBD assessments or check pupil proficiency
- [action:timetable] — when suggesting the teacher set up their weekly schedule
- [action:analytics] — when suggesting the teacher review analytics or mastery data
- [action:evaluate] — when suggesting the teacher evaluate a lesson plan
- [action:materials] — when suggesting the teacher upload teaching materials
Only suggest actions that are genuinely relevant to the teacher's question. Do not add more than 2 action tags per reply.

${contextText}`;

  const ai = await callAIText(systemPrompt, `Teacher's question: ${trimmedQuestion}`);

  if (ai.fallbackTriggered || !ai.text) {
    const heuristic = copilotHeuristicResponse(trimmedQuestion, contextText);
    const parsed = parseCopilotActions(heuristic);
    return { reply: parsed.reply, actions: parsed.actions, aiSource: buildAiSource(ai) };
  }

  const parsed = parseCopilotActions(ai.text);
  return { reply: parsed.reply, actions: parsed.actions, aiSource: buildAiSource(ai) };
}
