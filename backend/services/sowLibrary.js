export const KPM_DEFAULT_SOW = {
  id: "kpm-default",
  name: "KPM Default Scheme of Work",
  sourceType: "kpm",
  subject: "English",
  text: `KPM KSSR English Scheme of Work default guidance for primary ESL planning.
Use Year 1 to Year 6 KSSR/DSKP alignment. Sequence lessons by theme, topic, main skill, complementary skill, content standard, learning standard, learning objective, success criteria, classroom-based assessment, HOTS/KBAT and language arts/communication activities.
Default weekly flow: activate prior knowledge, introduce target language, guided practice, collaborative communicative task, differentiated support, PBD evidence collection, reflection and follow-up.
Teachers may override this source with a school-provided Scheme of Work upload.`,
};

export function buildSowInstruction(source) {
  const selected = source || KPM_DEFAULT_SOW;
  return `Scheme of Work source: ${selected.name || "KPM Default Scheme of Work"}
Source type: ${selected.sourceType || "kpm"}
Use this SoW when deciding topic sequence, lesson focus, timing, activities, PBD evidence and follow-up:
${String(selected.text || KPM_DEFAULT_SOW.text).slice(0, 5000)}`;
}
