const LEVELS = ["Low", "Medium", "High"];

const pillarSignals = {
  communication: [
    "speak",
    "speaking",
    "listen",
    "present",
    "discuss",
    "pair",
    "group",
    "share",
    "question",
    "opinion",
  ],
  spiritualValues: [
    "value",
    "respect",
    "responsibility",
    "ethical",
    "moral",
    "gratitude",
    "empathy",
    "cooperate",
  ],
  humanities: [
    "community",
    "culture",
    "history",
    "society",
    "malaysia",
    "local",
    "identity",
    "citizen",
  ],
  scienceTechnology: [
    "science",
    "technology",
    "digital",
    "ict",
    "data",
    "experiment",
    "problem",
    "design",
  ],
  personalSkills: [
    "reflect",
    "self",
    "confidence",
    "leadership",
    "role",
    "collaborate",
    "independent",
    "peer",
  ],
  physicalAesthetic: [
    "draw",
    "movement",
    "physical",
    "visual",
    "creative",
    "art",
    "poster",
    "perform",
    "gallery",
  ],
};

const pillarLabels = {
  communication: "Communication",
  spiritualValues: "Spiritual values, attitudes, and values",
  humanities: "Humanities",
  scienceTechnology: "Science and technology literacy",
  personalSkills: "Personal competence and self-development",
  physicalAesthetic: "Physical and aesthetic development",
};

function scorePillar(text, keywords) {
  return keywords.reduce((score, keyword) => {
    return text.includes(keyword) ? score + 1 : score;
  }, 0);
}

function toLevel(score) {
  if (score >= 3) return "High";
  if (score >= 1) return "Medium";
  return "Low";
}

export function analyzeKssrAlignment(lessonPlan) {
  const text = lessonPlan.toLowerCase();

  return Object.fromEntries(
    Object.entries(pillarSignals).map(([pillar, keywords]) => [
      pillar,
      toLevel(scorePillar(text, keywords)),
    ]),
  );
}

export function calculateKssrCheck(lessonPlan) {
  const kssrAlignment = analyzeKssrAlignment(lessonPlan);
  const scores = Object.values(kssrAlignment).map((level) => LEVELS.indexOf(level) + 1);
  const maxScore = scores.length * 3;
  const alignmentScore = Math.round((scores.reduce((total, score) => total + score, 0) / maxScore) * 100);

  const missingElements = Object.entries(kssrAlignment)
    .filter(([, level]) => level === "Low")
    .map(([pillar]) => pillarLabels[pillar]);

  const recommendations = missingElements.length
    ? missingElements.slice(0, 3).map((label) => `Add one explicit activity or evidence point for ${label}.`)
    : [
        "KSSR coverage is broad. Strengthen evidence collection through PBD-ready exit tickets.",
        "Keep BM/BI scaffolds visible for mixed ability pupils.",
        "Add role-based collaboration to manage large class participation.",
      ];

  return {
    alignmentScore,
    missingElements,
    recommendations,
  };
}

export function buildKssrPromptRequirement() {
  return `Evaluate alignment with the six KSSR pillars:
1. Communication
2. Spiritual values, attitudes, and values
3. Humanities
4. Science and technology literacy
5. Personal competence and self-development
6. Physical and aesthetic development`;
}
