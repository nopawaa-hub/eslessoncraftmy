// Demo/mock fixtures used across the dashboard, timetable, analytics and
// materials pages. In liveMode these are replaced by server-fetched data,
// but they are kept here so the non-live demo experience is preserved.

const todayClasses = [
  { id: "c1", subject: "English", className: "5 Bestari", year: "Year 5", skill: "Reading", time: "08:00 - 09:00", topic: "Main Ideas in Short Texts", tone: "emerald", status: "Ready" },
  { id: "c2", subject: "English", className: "4 Cemerlang", year: "Year 4", skill: "Writing", time: "09:30 - 10:30", topic: "Simple Past Tense", tone: "indigo", status: "Needs RPH" },
  { id: "c3", subject: "English", className: "5 Bestari", year: "Year 5", skill: "Speaking", time: "11:00 - 12:00", topic: "Giving Opinions", tone: "amber", status: "PBD due" },
  { id: "c4", subject: "English", className: "6 Amanah", year: "Year 6", skill: "Writing", time: "13:30 - 14:30", topic: "Email Writing", tone: "rose", status: "Needs support" },
  { id: "c5", subject: "English", className: "3 Jujur", year: "Year 3", skill: "Listening", time: "15:00 - 16:00", topic: "Classroom Instructions", tone: "violet", status: "Ready" },
];

const weekClasses = [
  ...todayClasses.map((c, index) => ({ ...c, day: 0, slot: index })),
  { id: "w1", subject: "English", className: "5 Bestari", year: "Year 5", skill: "Grammar", time: "08:00", topic: "Adjectives for Description", tone: "emerald", day: 1, slot: 0, status: "Ready" },
  { id: "w2", subject: "English", className: "4 Cemerlang", year: "Year 4", skill: "Reading", time: "10:00", topic: "Sequencing Events", tone: "indigo", day: 1, slot: 2, status: "Needs RPH" },
  { id: "w3", subject: "English", className: "5 Bestari", year: "Year 5", skill: "Writing", time: "11:00", topic: "Opinion Sentences", tone: "amber", day: 2, slot: 3, status: "PBD due" },
  { id: "w4", subject: "English", className: "5 Bestari", year: "Year 5", skill: "Listening", time: "09:00", topic: "Information Transfer", tone: "emerald", day: 2, slot: 1, status: "Ready" },
  { id: "w5", subject: "English", className: "6 Amanah", year: "Year 6", skill: "Speaking", time: "13:00", topic: "Role-play: Asking for Help", tone: "rose", day: 3, slot: 5, status: "Needs support" },
  { id: "w6", subject: "English", className: "4 Cemerlang", year: "Year 4", skill: "Grammar", time: "08:00", topic: "Prepositions of Place", tone: "indigo", day: 4, slot: 0, status: "Ready" },
  { id: "w7", subject: "English", className: "3 Jujur", year: "Year 3", skill: "Phonics", time: "14:00", topic: "Long Vowel Sounds", tone: "violet", day: 4, slot: 6, status: "Needs RPH" },
];

const summaryStats = [
  { label: "English classes today", value: "5", hint: "2 completed", tone: "indigo", trend: "+1 vs yesterday" },
  { label: "English RPH pending", value: "3", hint: "Due tomorrow", tone: "amber", trend: "-2 this week" },
  { label: "PBD pending", value: "12", hint: "English speaking + writing evidence", tone: "rose", trend: "Needs attention" },
  { label: "English lessons this week", value: "22h", hint: "Target 24h", tone: "emerald", trend: "92% dicapai" },
];

const aiInsights = [
  { title: "5 pupils need vocabulary support", body: "Aishah, Danish, Iman, Nurul and Zikri are repeating TP1-TP2 in reading comprehension.", action: "Open intervention", tone: "rose" },
  { title: "AI suggests a speaking scaffold", body: "Use sentence frames for Giving Opinions before pupils attempt pair discussion.", action: "Generate RPH", tone: "indigo" },
  { title: "8 English PBD records pending", body: "4 Cemerlang: oral responses from last week still need TP evidence.", action: "Key-in marks", tone: "amber" },
  { title: "Writing gap detected", body: "Year 6 pupils can list ideas but weak pupils need email format chunks and model phrases.", action: "View analytics", tone: "emerald" },
];

const staticMaterials = [
  { name: "Reading Main Ideas.pdf", type: "PDF", size: "2.3 MB", subject: "English", updated: "2 jam lalu" },
  { name: "Simple Past Drill.docx", type: "DOCX", size: "412 KB", subject: "English", updated: "Semalam" },
  { name: "Opinion Sentence Frames.pptx", type: "PPT", size: "8.1 MB", subject: "English", updated: "2 hari lalu" },
  { name: "Classroom Instructions Audio.mp3", type: "Audio", size: "18 MB", subject: "English", updated: "3 hari lalu" },
  { name: "Email Writing Checklist.pdf", type: "PDF", size: "1.1 MB", subject: "English", updated: "Minggu lepas" },
  { name: "Phonics Picture Cards.zip", type: "ZIP", size: "22 MB", subject: "English", updated: "Minggu lepas" },
];

const initialStudents = [
  { id: "s1", name: "Aishah binti Rahman", attendance: "Present", score: 78, tp: 4, comment: "Understands main ideas with support." },
  { id: "s2", name: "Danish bin Hakim", attendance: "Present", score: 52, tp: 2, comment: "Needs vocabulary intervention." },
  { id: "s3", name: "Iman bin Zaki", attendance: "MC", score: 0, tp: 1, comment: "Absent for assessment." },
  { id: "s4", name: "Nurul Aina", attendance: "Present", score: 88, tp: 5, comment: "Strong oral explanation." },
  { id: "s5", name: "Zikri bin Azlan", attendance: "Present", score: 45, tp: 2, comment: "Needs decoding support." },
  { id: "s6", name: "Fatimah binti Omar", attendance: "Present", score: 92, tp: 6, comment: "Can mentor peers." },
  { id: "s7", name: "Haziq bin Yusof", attendance: "Present", score: 70, tp: 4, comment: "Consistent comprehension." },
  { id: "s8", name: "Mira binti Lokman", attendance: "Present", score: 65, tp: 3, comment: "Needs sentence frame practice." },
];

const tpDistribution = [
  { label: "TP1", value: 2 },
  { label: "TP2", value: 4 },
  { label: "TP3", value: 6 },
  { label: "TP4", value: 10 },
  { label: "TP5", value: 8 },
  { label: "TP6", value: 3 },
];

const defaultLesson = {
  title: "Year 5 English Reading Lesson: Main Ideas in Short Texts",
  templateType: "KSSR English Lesson Plan",
  lessonDetails: {
    subject: "English",
    year: "Year 5",
    className: "5 Bestari",
    durationMinutes: 60,
    topic: "Main Ideas in Short Texts",
    skill: "Reading",
    materials: "Short text strips, picture prompts, sentence frames, exit ticket",
    assessmentType: "PBD observation, oral response, exit ticket",
  },
  objectives: [
    "identify the main idea in a short text with guidance.",
    "match supporting details to the correct main idea.",
    "explain one answer using a simple sentence frame.",
  ],
  successCriteria: [
    "I can find what the text is mostly about.",
    "I can choose one detail that supports the main idea.",
    "I can say my answer using because.",
  ],
  activities: [
    "Picture talk and keyword prediction.",
    "Teacher models how to underline repeated ideas.",
    "Pairs match text strips to main idea cards.",
    "Groups justify one answer using sentence frames.",
    "Exit ticket: one main idea and one supporting detail.",
  ],
  assessment: [
    "Teacher checklist for identifying main ideas.",
    "Pair discussion sampling.",
    "Exit ticket sorted into reteach, on-track and extension groups.",
  ],
  differentiation: [
    "Low-proficiency pupils receive picture prompts and sentence starters.",
    "On-track pupils work with short paragraph strips.",
    "High-proficiency pupils explain why a distractor is incorrect.",
  ],
  procedure: [
    { stage: "Pre Lesson", minutes: 5, lessonContent: "Activate vocabulary and topic prediction.", teacherActivities: "Show a picture and ask: What do you think this text is about?", pupilActivities: "Pupils share one word or phrase with a partner." },
    { stage: "Lesson Development Stage I", minutes: 10, lessonContent: "Model finding the main idea.", teacherActivities: "Read a short paragraph aloud and underline repeated ideas.", pupilActivities: "Pupils repeat key words and complete one guided example." },
    { stage: "Stage II", minutes: 15, lessonContent: "Pair matching task.", teacherActivities: "Give text strips and main idea cards. Monitor support group first.", pupilActivities: "Pupils match texts to main ideas and use a sentence frame." },
    { stage: "Stage III", minutes: 20, lessonContent: "Group justification and HOTS distractor check.", teacherActivities: "Ask groups to explain why one answer is best.", pupilActivities: "Groups present one answer with one reason." },
    { stage: "Post Lesson", minutes: 10, lessonContent: "Exit evidence and reflection.", teacherActivities: "Collect exit tickets and sort pupils for next lesson.", pupilActivities: "Pupils write one main idea and one supporting detail." },
  ],
  kssrAlignment: {
    contentStandard: "English language comprehension through reading short linear texts.",
    learningStandard: "Pupils identify main ideas and specific details with support.",
    learningOutcomes: "Pupils show understanding through oral explanation and written exit ticket.",
  },
};

const englishSkillPerformance = [
  { label: "Reading", value: 76 },
  { label: "Writing", value: 64 },
  { label: "Speaking", value: 72 },
  { label: "Listening", value: 81 },
  { label: "Grammar", value: 68 },
  { label: "Phonics", value: 74 },
];

const analyticsCards = [
  { title: "Reading Comprehension", value: "76%", note: "+8% after main-idea practice", tone: "emerald", icon: "book" },
  { title: "Writing Accuracy", value: "64%", note: "Past tense and email format need support", tone: "amber", icon: "pencil" },
  { title: "Speaking Confidence", value: "72%", note: "Sentence frames improved pair talk", tone: "indigo", icon: "mic" },
  { title: "Pupils at Risk", value: "5", note: "Vocabulary and decoding support group", tone: "rose", icon: "alert" },
];

const scheduleColors = [
  { id: "indigo", label: "Indigo" },
  { id: "emerald", label: "Green" },
  { id: "amber", label: "Yellow" },
  { id: "rose", label: "Red" },
  { id: "violet", label: "Violet" },
];

// Default form for the Lesson Planner. Also used by the draft system as the
// starting shape for a freshly-created lesson plan draft.
const emptyLessonForm = {
  classId: "",
  year: "Year 5",
  className: "",
  topic: "",
  skill: "Reading",
  durationMinutes: "",
  numberOfStudents: "",
  priorKnowledge: "",
  materials: "",
  assessmentType: "PBD observation, oral response and exit ticket",
  objectives: "",
  stepsOverview: "",
  studentProficiency: "",
  classroomEnvironment: "",
  teachingNotes: "",
};

export {
  todayClasses,
  weekClasses,
  summaryStats,
  aiInsights,
  staticMaterials,
  initialStudents,
  tpDistribution,
  defaultLesson,
  englishSkillPerformance,
  analyticsCards,
  scheduleColors,
  emptyLessonForm,
};
