import SchoolClass from "../models/Class.js";
import Student from "../models/Student.js";
import LessonPlan from "../models/LessonPlan.js";
import Assessment from "../models/Assessment.js";
import Schedule from "../models/Schedule.js";
import Period from "../models/Period.js";
import ScheduleLessonLink from "../models/ScheduleLessonLink.js";
import Material from "../models/Material.js";
import SchemeOfWork from "../models/SchemeOfWork.js";
import StudentRecord from "../models/StudentRecord.js";

function scheduledDateFromDay(day) {
  const weekStart = new Date();
  const mondayOffset = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const date = new Date(weekStart);
  date.setDate(weekStart.getDate() + Math.max(0, days.indexOf(day)));
  return date;
}

export async function ensureDemoDataSeeded(userId) {
  if (!userId) return;
  const userIdStr = String(userId);
  if (userIdStr !== "000000000000000000000001") return;

  try {
    // Check if we already seeded comprehensive data
    const existingClasses = await SchoolClass.find({ teacherId: userId });
    const classIds = existingClasses.map((c) => c._id);
    const existingStudentCount = await Student.countDocuments({ classId: { $in: classIds } });
    const existingLessonCount = await LessonPlan.countDocuments({ userId: userId });
    const existingScheduleCount = await Schedule.countDocuments({ userId: userId });
    const existingMaterialCount = await Material.countDocuments({ teacherId: userId });
    const existingSOWCount = await SchemeOfWork.countDocuments({ teacherId: userId });
    const existingRecordCount = await StudentRecord.countDocuments({ teacherId: userId });

    // If fully seeded across all modules, skip
    if (
      existingClasses.length >= 3 &&
      existingStudentCount >= 35 &&
      existingLessonCount >= 4 &&
      existingScheduleCount >= 1 &&
      existingMaterialCount >= 8 &&
      existingSOWCount >= 1 &&
      existingRecordCount >= 35
    ) {
      return;
    }

    console.log("Seeding comprehensive realistic Malaysian KSSR English Teacher data for Demo Account...");

    // Clean up old incomplete demo records
    await SchoolClass.deleteMany({ teacherId: userId });
    await Student.deleteMany({ classId: { $in: classIds } });
    const allValidClassIds = await SchoolClass.find().distinct("_id");
    await Student.deleteMany({ classId: { $nin: allValidClassIds } });
    await LessonPlan.deleteMany({ userId: userId });
    await Assessment.deleteMany({ teacherId: userId });
    await Schedule.deleteMany({ userId: userId });
    await Period.deleteMany({ scheduleId: { $in: (await Schedule.find({ userId: userId }).distinct("_id")) } });
    await Material.deleteMany({ teacherId: userId });
    await SchemeOfWork.deleteMany({ teacherId: userId });
    await StudentRecord.deleteMany({ teacherId: userId });

    // 1. Create Classes
    const [class5Bestari, class4Cemerlang, class6Amanah] = await SchoolClass.create([
      {
        teacherId: userId,
        name: "5 Bestari",
        year: "Year 5",
        subject: "English",
        studentCount: 16,
        studentProficiency: "Mixed ability",
        classroomEnvironment: "Standard classroom with smart projector and whiteboard.",
        teachingNotes: "Active participants during group work. Reading comprehension and complex sentence structures need support. Strong speaking skills.",
        tags: ["High energy", "Group work focus", "CEFR B1 target"],
        status: "active",
      },
      {
        teacherId: userId,
        name: "4 Cemerlang",
        year: "Year 4",
        subject: "English",
        studentCount: 14,
        studentProficiency: "Low-to-mid proficiency",
        classroomEnvironment: "Standard classroom with limited ICT, speaker system available.",
        teachingNotes: "Focus heavily on vocabulary reinforcement, phonics blending, and guided writing frames.",
        tags: ["Phonics & Vocabulary", "Visual learners", "CEFR A2 target"],
        status: "active",
      },
      {
        teacherId: userId,
        name: "6 Amanah",
        year: "Year 6",
        subject: "English",
        studentCount: 14,
        studentProficiency: "High proficiency",
        classroomEnvironment: "Fully equipped ICT lab / Smart Classroom.",
        teachingNotes: "Preparing for UASA (Ujian Akhir Sesi Akademik). Focus on essay writing, critical thinking, and advanced reading strategies.",
        tags: ["UASA Prep", "Advanced Writing", "Critical Thinking"],
        status: "active",
      },
    ]);

    // 2. Create Student Rosters
    const students5BestariData = [
      { name: "Ahmad Daniel bin Razak", proficiency: "Mid proficiency", notes: "Good oral effort, needs scaffolding with complex vocabulary." },
      { name: "Siti Sarah binti Ismail", proficiency: "High proficiency", notes: "Consistently achieves TP5/TP6. Helps peers during pair tasks." },
      { name: "Chong Wei Jie", proficiency: "High proficiency", notes: "Very analytical, excels in reading comprehension and spelling." },
      { name: "Priya a/p Subramaniam", proficiency: "Mid proficiency", notes: "Enthusiastic speaker, needs gentle correction on past tense verbs." },
      { name: "Muhammad Haziq bin Othman", proficiency: "Mid proficiency", notes: "Confident presentation skills, polite and cooperative." },
      { name: "Nurul Izzah binti Abdullah", proficiency: "High proficiency", notes: "Neat handwriting, structured sentences and accurate grammar." },
      { name: "Danish Iskandar bin Faisal", proficiency: "Low proficiency", notes: "Requires visual cues and sentence starters for writing tasks." },
      { name: "Wong Xin Yee", proficiency: "High proficiency", notes: "Quick learner, enjoys creative storytelling and role-plays." },
      { name: "Kavitha a/p Raman", proficiency: "Mid proficiency", notes: "Good listening comprehension, hesitant during whole-class discussions." },
      { name: "Amirul Asyraf bin Zulkifli", proficiency: "Low proficiency", notes: "AI identified vocabulary support needed; focus on sight words." },
      { name: "Farah Nabila binti Zahir", proficiency: "High proficiency", notes: "Excellent vocabulary, reads chapter books independently." },
      { name: "Lim Boon Jin", proficiency: "Mid proficiency", notes: "Strong team player, benefits from graphic organizers." },
      { name: "Azfar Faris bin Azman", proficiency: "Low proficiency", notes: "Easily distracted, benefits from active kinesthetic activities." },
      { name: "Suhaila binti Yusof", proficiency: "Mid proficiency", notes: "Consistent progress in reading fluency and basic writing." },
      { name: "Brandon Lee", proficiency: "High proficiency", notes: "Fluent speaker, accurate pronunciation and intonation." },
      { name: "Nur Amani binti Hafiz", proficiency: "Mid proficiency", notes: "Active participant in group work and vocabulary games." },
    ];

    const students4CemerlangData = [
      { name: "Darwisy Hakim bin Azroy", proficiency: "Low proficiency", notes: "Phonics reinforcement needed for multi-syllable words." },
      { name: "Qurratul Ain binti Mansor", proficiency: "Mid proficiency", notes: "Follows instructions well, accurate copying and basic sentence writing." },
      { name: "Tan Jia Hao", proficiency: "High proficiency", notes: "Slightly above class average, reads short storybooks well." },
      { name: "Divya a/p Kumar", proficiency: "Mid proficiency", notes: "Enjoys audio-visual songs and TPR (Total Physical Response) games." },
      { name: "Hakimi bin Solihin", proficiency: "Low proficiency", notes: "Struggles with basic prepositions (in, on, under, beside)." },
      { name: "Siti Khadijah binti Ramli", proficiency: "Mid proficiency", notes: "Pleasant attitude, steady improvement in oral confidence." },
      { name: "Kelvin Ng", proficiency: "Mid proficiency", notes: "Enjoys Wordwall interactive activities and digital flashcards." },
      { name: "Meera a/p Balan", proficiency: "High proficiency", notes: "Speaks clearly, good grasp of present simple tense." },
      { name: "Luqman Harith bin Kamal", proficiency: "Low proficiency", notes: "Needs 1-on-1 teacher guidance during written exercises." },
      { name: "Aleesya Humaira binti Syukri", proficiency: "Mid proficiency", notes: "Cooperative peer partner, neat workbook entries." },
      { name: "Nicholas Liew", proficiency: "Mid proficiency", notes: "Good listening skills, enjoys story read-aloud sessions." },
      { name: "Nur Hanim binti Zaidi", proficiency: "Low proficiency", notes: "Needs vocabulary scaffolding with bilingual picture dictionaries." },
      { name: "Irfan Daniel bin Johari", proficiency: "Mid proficiency", notes: "Energetic during language games, requires pacing focus." },
      { name: "Shameena binti Tariq", proficiency: "High proficiency", notes: "Always ready to answer questions, helps classmates with instructions." },
    ];

    const students6AmanahData = [
      { name: "Zara Sofea binti Tengku", proficiency: "High proficiency", notes: "Outstanding essay structure, uses mature connectors like 'Furthermore'." },
      { name: "Syed Muzaffar bin Syed Ali", proficiency: "High proficiency", notes: "Sharp critical thinker, excels in debate and oral justification." },
      { name: "Grace Wong Mei Ling", proficiency: "High proficiency", notes: "Top scorer in comprehension and grammar drills." },
      { name: "Arjun a/l Rajoo", proficiency: "Mid proficiency", notes: "Good ideas in writing, occasionally forgets subject-verb agreement." },
      { name: "Najwa Latif binti Razak", proficiency: "High proficiency", notes: "Very expressive reader, great intonation and dramatic delivery." },
      { name: "Harris Junaidi bin Roslan", proficiency: "Mid proficiency", notes: "Good general knowledge, needs structure when drafting essays." },
      { name: "Jason Cheah", proficiency: "High proficiency", notes: "Strong vocabulary, consistently achieves TP6 in writing mastery." },
      { name: "Anis Suraya binti Hisham", proficiency: "Mid proficiency", notes: "Hardworking, reviews feedback thoroughly to improve drafts." },
      { name: "Taufiq Hidayat bin Rahman", proficiency: "Mid proficiency", notes: "Enjoys literature graphic novels and character comparisons." },
      { name: "Nia Ramadhani binti Sulaiman", proficiency: "High proficiency", notes: "Articulate speaker, leads group project presentations with poise." },
      { name: "Vikneswaran a/l Muthu", proficiency: "Mid proficiency", notes: "Improving steadily in argumentative writing and vocabulary." },
      { name: "Emilda Rose binti Aris", proficiency: "High proficiency", notes: "Precise grammar usage and creative descriptive writing." },
      { name: "Daniel Fong", proficiency: "High proficiency", notes: "Consistently high performance across listening, speaking, reading, writing." },
      { name: "Sara Yasmin binti Baharuddin", proficiency: "Mid proficiency", notes: "Diligent pupil, asks insightful questions during comprehension analysis." },
    ];

    const createStudentsForClass = async (classObj, dataList) => {
      const docs = dataList.map((s) => ({
        classId: classObj._id,
        studentName: s.name,
        proficiency: s.proficiency,
        notes: s.notes,
        status: "active",
      }));
      const created = await Student.create(docs);
      await SchoolClass.findByIdAndUpdate(classObj._id, { studentCount: created.length });
      return created;
    };

    const students5Bestari = await createStudentsForClass(class5Bestari, students5BestariData);
    const students4Cemerlang = await createStudentsForClass(class4Cemerlang, students4CemerlangData);
    const students6Amanah = await createStudentsForClass(class6Amanah, students6AmanahData);

    // 3. Create Lesson Plans
    const [lesson1, lesson2, lesson3, lesson4] = await LessonPlan.create([
      {
        userId: userId,
        title: "Year 5 English Reading Lesson: Main Ideas in Short Texts (Unit 3: Wildlife Conservation)",
        year: "Year 5",
        subject: "English",
        topic: "Unit 3: Wildlife Conservation - Main Ideas in Short Texts",
        classId: class5Bestari._id,
        className: "5 Bestari",
        skill: "Reading",
        contentStandard: "2.1 Communicate simple information intelligibly",
        learningStandard: "2.1.1 Explain simple content and main ideas from short texts",
        objectives: [
          "Identify the main idea in a 3-paragraph text about endangered Malaysian wildlife with guidance.",
          "Match at least 3 supporting details to the correct main idea cards.",
          "Explain one answer orally using a structured sentence frame ('The main idea of paragraph 2 is... because...')."
        ],
        activities: [
          "Set Induction (5 mins): Picture talk using vivid images of Malayan tigers and rhinoceros hornbills. Elicit keywords and prior knowledge.",
          "Presentation (15 mins): Teacher models reading the short passage aloud and highlighting the topic sentence in paragraph 1 using the smart projector.",
          "Practice (20 mins): In pairs, pupils sort vocabulary strips and match supporting detail cards to paragraph headings.",
          "Production (15 mins): Group task — each group creates a mini anchor chart explaining why the Malayan tiger is endangered.",
          "Closure (5 mins): Exit ticket assessment — write one main idea and one key fact learned today."
        ],
        assessments: [
          "Formative PBD observation during pair matching (Checklist for TP3/TP4 baseline mastery).",
          "Exit ticket sorting: Reteach group (TP1-TP2), On-Track group (TP3-TP4), Extension group (TP5-TP6)."
        ],
        reflection: "30 out of 32 pupils achieved TP3 and above. Ahmad Daniel and Amirul Asyraf needed extra 1-on-1 vocabulary scaffolding during the strip sorting activity. Will provide bilingual glossary next period.",
        status: "completed",
        templateType: "KSSR English Lesson Plan",
        lessonDetails: {
          subject: "English",
          year: "Year 5",
          className: "5 Bestari",
          durationMinutes: 60,
          topic: "Main Ideas in Short Texts",
          skill: "Reading",
          materials: "Short text strips, picture prompts, sentence frames, exit ticket cards",
          assessmentType: "PBD observation, oral response, exit ticket"
        },
      },
      {
        userId: userId,
        title: "Year 4 Speaking & Listening: Daily Routines & Time (Unit 2: Where are you from?)",
        year: "Year 4",
        subject: "English",
        topic: "Unit 2: Where are you from? - Telling Time and Daily Routines",
        classId: class4Cemerlang._id,
        className: "4 Cemerlang",
        skill: "Speaking",
        contentStandard: "2.1 Communicate simple information intelligibly",
        learningStandard: "2.1.2 Find out about and describe basic everyday routines",
        objectives: [
          "Ask and answer questions about daily routines using 'What time do you...?' with at least 80% accuracy.",
          "Use simple present tense verbs (get up, have breakfast, go to school) correctly during peer interviews."
        ],
        activities: [
          "Warm-up (5 mins): 'Simon Says' action verbs with TPR gestures (get up, brush teeth, catch bus).",
          "Teacher Demonstration (15 mins): Clock flashcard drills and model Q&A on the whiteboard.",
          "Pair Work (25 mins): 'Find Someone Who' bingo grid interview activity where pupils walk around asking peers about their morning schedules.",
          "Class Sharing (15 mins): 3 selected pupils report their partner's routine to the class using 'He/She gets up at...'."
        ],
        assessments: [
          "PBD Oral Checklist tracking correct question formation and third-person '-s' verb accuracy (TP3 target)."
        ],
        reflection: "Pupils loved the TPR game and bingo interview! Hakimi and Darwisy showed great enthusiasm and practiced speaking clearly.",
        status: "completed",
        templateType: "KSSR English Lesson Plan",
        lessonDetails: {
          subject: "English",
          year: "Year 4",
          className: "4 Cemerlang",
          durationMinutes: 60,
          topic: "Daily Routines & Time Telling",
          skill: "Speaking",
          materials: "Clock flashcards, bingo interview sheets, action flashcards",
          assessmentType: "Oral observation checklist"
        },
      },
      {
        userId: userId,
        title: "Year 6 Writing Mastery: Persuasive Essay on Environmental Protection (Unit 4: Step Up!)",
        year: "Year 6",
        subject: "English",
        topic: "Unit 4: Step Up! - Persuasive Writing and Connectors",
        classId: class6Amanah._id,
        className: "6 Amanah",
        skill: "Writing",
        contentStandard: "4.2 Communicate basic information intelligibly for a range of purposes in print and digital media",
        learningStandard: "4.2.3 Produce a plan or draft of two paragraphs or more for a familiar topic and modify this appropriately in response to feedback",
        objectives: [
          "Draft a structured 3-paragraph persuasive essay on reducing plastic waste in school.",
          "Incorporate at least 4 logical discourse markers (Furthermore, Consequently, In addition, Therefore) accurately."
        ],
        activities: [
          "Brainstorming (10 mins): Collaborative mind-map on the smart board on single-use plastics.",
          "Model Analysis (15 mins): Guided deconstruction of a model UASA persuasive essay focusing on topic sentences and transition words.",
          "Guided Drafting (25 mins): Independent drafting while Cikgu Aisyah roves the classroom giving immediate formative feedback.",
          "Peer Review (10 mins): Pairs exchange drafts and use a '2-Stars-and-a-Wish' sticky note rubric."
        ],
        assessments: [
          "Draft evaluation using KSSR Year 6 Writing Rubric (TP4/TP5 writing standards)."
        ],
        reflection: "Excellent draft submissions from Zara Sofea and Syed Muzaffar. Will conduct a mini-lesson on paragraph transitions for 4 pupils next Tuesday.",
        status: "completed",
        templateType: "KSSR English Lesson Plan",
        lessonDetails: {
          subject: "English",
          year: "Year 6",
          className: "6 Amanah",
          durationMinutes: 60,
          topic: "Persuasive Writing & Connectors",
          skill: "Writing",
          materials: "Model essay handout, connector anchor chart, peer review notes",
          assessmentType: "Written draft evaluation"
        },
      },
      {
        userId: userId,
        title: "Year 5 Grammar Focus: Past Simple vs. Past Continuous Tense (Unit 5: Adventure!)",
        year: "Year 5",
        subject: "English",
        topic: "Unit 5: Adventure! - Interrupted Past Actions (when/while)",
        classId: class5Bestari._id,
        className: "5 Bestari",
        skill: "Grammar",
        contentStandard: "3.2 Understand a variety of linear and non-linear print and digital texts by using appropriate reading strategies",
        learningStandard: "3.2.2 Understand specific information and details of two paragraphs or more",
        objectives: [
          "Differentiate between past simple (short action) and past continuous (long action) in narrative adventure texts.",
          "Complete 8 out of 10 gap-fill sentences accurately using 'when' or 'while'."
        ],
        activities: [
          "Set Induction (10 mins): Storyboarding classroom mishaps ('While Cikgu Aisyah was writing on the whiteboard, the bell rang loudly').",
          "Digital Drill (15 mins): Interactive Wordwall quiz on the smart projector.",
          "Group Worksheet (25 mins): Differentiated gap-fill exercises in ability teams.",
          "Exit Ticket (10 mins): Write one original sentence using 'while'."
        ],
        assessments: [
          "Worksheet score check and exit ticket grammar review."
        ],
        reflection: "High engagement during the Wordwall quiz. Pupils grasped the concept of interrupted actions quickly.",
        status: "completed",
        templateType: "KSSR English Lesson Plan",
        lessonDetails: {
          subject: "English",
          year: "Year 5",
          className: "5 Bestari",
          durationMinutes: 60,
          topic: "Past Simple vs Past Continuous",
          skill: "Grammar",
          materials: "Smart projector, Wordwall link, differentiated grammar worksheets",
          assessmentType: "Worksheet assessment"
        },
      },
    ]);

    // 4. Create PBD Assessments
    const pbdRecords5Bestari = students5Bestari.map((s, idx) => {
      let tp = 4;
      if (s.proficiency === "High proficiency") tp = idx % 2 === 0 ? 5 : 6;
      else if (s.proficiency === "Low proficiency") tp = idx % 2 === 0 ? 2 : 3;
      return {
        studentId: s._id,
        studentName: s.studentName,
        tp: tp,
        value: `TP${tp}`,
        remarks: tp >= 5 ? "Confident, accurate, and autonomous communicator." : tp === 4 ? "Good mastery with polite and structured communication." : "Can communicate basic ideas when guided by teacher.",
      };
    });

    const pbdRecords4Cemerlang = students4Cemerlang.map((s, idx) => {
      let tp = 3;
      if (s.proficiency === "High proficiency") tp = 4;
      else if (s.proficiency === "Low proficiency") tp = 2;
      return {
        studentId: s._id,
        studentName: s.studentName,
        tp: tp,
        value: `TP${tp}`,
        remarks: tp >= 4 ? "Can describe daily routines accurately without prompting." : tp === 3 ? "Understands simple questions and responds with visual support." : "Needs phonics flashcards and teacher guidance.",
      };
    });

    const pbdRecords6Amanah = students6Amanah.map((s, idx) => {
      let tp = 5;
      if (s.proficiency === "High proficiency") tp = idx % 2 === 0 ? 6 : 5;
      else if (s.proficiency === "Mid proficiency") tp = 4;
      return {
        studentId: s._id,
        studentName: s.studentName,
        tp: tp,
        value: `TP${tp}`,
        remarks: tp === 6 ? "Creative, exemplary writing structure with advanced vocabulary." : tp === 5 ? "Consistent accuracy and great use of discourse markers." : "Meets baseline writing targets with good organization.",
      };
    });

    await Assessment.create([
      {
        title: "Formative PBD Speaking Assessment: Wildlife Presentations (Unit 3)",
        teacherId: userId,
        year: "Year 5",
        subject: "English",
        classId: class5Bestari._id,
        assessmentType: "PBD observation",
        evidenceType: "Teacher observation & oral presentation",
        criteria: ["Pronunciation & Intonation", "Vocabulary Accuracy", "Sentence Structure", "Confidence & Fluency"],
        scaleType: "tp",
        records: pbdRecords5Bestari,
      },
      {
        title: "Vocabulary & Daily Routines Oral Checklist (Unit 2)",
        teacherId: userId,
        year: "Year 4",
        subject: "English",
        classId: class4Cemerlang._id,
        assessmentType: "PBD observation",
        evidenceType: "Pair interview checklist",
        criteria: ["Question Formation (What time...?)", "Present Simple Accuracy", "Listening Comprehension"],
        scaleType: "tp",
        records: pbdRecords4Cemerlang,
      },
      {
        title: "UASA Trial Persuasive Essay Rubric Evaluation (Unit 1-4)",
        teacherId: userId,
        year: "Year 6",
        subject: "English",
        classId: class6Amanah._id,
        assessmentType: "Formative writing rubric",
        evidenceType: "Written draft & peer review",
        criteria: ["Paragraph Organization", "Use of Connectors (Furthermore, Therefore)", "Grammar Accuracy", "Persuasive Argumentation"],
        scaleType: "tp",
        records: pbdRecords6Amanah,
      },
    ]);

    const allStudents = [...students5Bestari, ...students4Cemerlang, ...students6Amanah];
    const studentRecordDocs = allStudents.map((s) => {
      let scores = [78, 82, 80, 85];
      if (s.proficiency === "High proficiency") scores = [88, 92, 90, 95];
      else if (s.proficiency === "Low proficiency") scores = [55, 62, 58, 65];
      const avg = Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2));
      return {
        studentName: s.studentName,
        scores: scores,
        average: avg,
        teacherId: userId,
      };
    });
    await StudentRecord.create(studentRecordDocs);

    // 6. Create Timetable & Weekly Schedule
    const schedule = await Schedule.create({
      userId: userId,
      name: "Default Weekly Schedule",
      weekStart: new Date(),
      date: new Date(),
      title: "Default Weekly Schedule",
      className: "General",
      subject: "English",
      year: "Year 5",
      status: "planned",
    });

    const periodsData = [
      { day: "Monday", startTime: "08:00", endTime: "09:00", className: "5 Bestari", year: "Year 5", subject: "English", skill: "Reading", topic: "Unit 3: Wildlife Conservation", lessonPlan: lesson1._id },
      { day: "Monday", startTime: "10:30", endTime: "11:30", className: "4 Cemerlang", year: "Year 4", subject: "English", skill: "Speaking", topic: "Unit 2: Where are you from?", lessonPlan: lesson2._id },
      { day: "Tuesday", startTime: "08:30", endTime: "09:30", className: "6 Amanah", year: "Year 6", subject: "English", skill: "Writing", topic: "Unit 4: Step Up! Persuasive Writing", lessonPlan: lesson3._id },
      { day: "Tuesday", startTime: "11:30", endTime: "12:30", className: "5 Bestari", year: "Year 5", subject: "English", skill: "Language Arts", topic: "Endangered Animals Poetry & Roleplay" },
      { day: "Wednesday", startTime: "09:00", endTime: "10:00", className: "4 Cemerlang", year: "Year 4", subject: "English", skill: "Reading", topic: "Phonics & Guided Reading Practice" },
      { day: "Wednesday", startTime: "10:30", endTime: "11:30", className: "5 Bestari", year: "Year 5", subject: "English", skill: "Grammar", topic: "Unit 5: Adventure! (Past Simple vs Continuous)", lessonPlan: lesson4._id },
      { day: "Thursday", startTime: "08:00", endTime: "09:00", className: "6 Amanah", year: "Year 6", subject: "English", skill: "Literature", topic: "Literature in Action: Graphic Novel Analysis" },
      { day: "Thursday", startTime: "11:30", endTime: "12:30", className: "4 Cemerlang", year: "Year 4", subject: "English", skill: "Writing", topic: "Action Verbs & Daily Routines Worksheet" },
      { day: "Friday", startTime: "08:30", endTime: "09:30", className: "5 Bestari", year: "Year 5", subject: "English", skill: "Listening & Speaking", topic: "Weekly PBD Formative Assessment & Group Presentations" },
      { day: "Friday", startTime: "10:00", endTime: "11:00", className: "6 Amanah", year: "Year 6", subject: "English", skill: "Language Arts", topic: "UASA Mock Paper Review & Grammar Drill" },
    ];

    const createdPeriods = await Period.create(
      periodsData.map((p) => ({
        scheduleId: schedule._id,
        day: p.day,
        startTime: p.startTime,
        endTime: p.endTime,
        className: p.className,
        subject: p.subject,
        year: p.year,
        skill: p.skill || "Language Arts",
        topic: p.topic || "",
        recurring: true,
      }))
    );

    // Link periods to lesson plans where specified
    for (let i = 0; i < periodsData.length; i++) {
      if (periodsData[i].lessonPlan) {
        await ScheduleLessonLink.create({
          lessonPlanId: periodsData[i].lessonPlan,
          periodId: createdPeriods[i]._id,
          scheduledDate: scheduledDateFromDay(periodsData[i].day),
          status: "planned",
          notes: `Linked to ${periodsData[i].className} syllabus.`,
        });
      }
    }

    // 7. Create Materials
    await Material.create([
      {
        teacherId: userId,
        title: "KSSR Year 5 DSKP English Language (SK & SJK).pdf",
        type: "PDF",
        size: "2.4 MB",
        subject: "English",
        year: "Year 5",
        folder: "DSKP & Syllabus",
        url: "https://drive.google.com/file/d/demo-dskp-y5/view",
      },
      {
        teacherId: userId,
        title: "Unit 3: Wildlife Conservation - Differentiated Reading Strips.docx",
        type: "DOCX",
        size: "410 KB",
        subject: "English",
        year: "Year 5",
        folder: "Reading Support",
        url: "https://drive.google.com/file/d/demo-unit3-reading/view",
      },
      {
        teacherId: userId,
        title: "Year 5 Bestari Speaking & Listening PBD Formative Rubric.pdf",
        type: "PDF",
        size: "320 KB",
        subject: "English",
        year: "Year 5",
        folder: "PBD Rubrics",
        url: "https://drive.google.com/file/d/demo-pbd-rubric/view",
      },
      {
        teacherId: userId,
        title: "Interactive Wordwall Quiz: Past Tense Irregular Verbs (Adventure Unit)",
        type: "WORDWALL",
        size: "External Link",
        subject: "English",
        year: "Year 5",
        folder: "Interactive Activities",
        url: "https://wordwall.net/resource/123456/english/past-tense-verbs",
      },
      {
        teacherId: userId,
        title: "Canva Slide Deck: Malayan Tigers & Endangered Animals (Visual Presentation)",
        type: "CANVA",
        size: "External Link",
        subject: "English",
        year: "Year 5",
        folder: "Visual Presentations",
        url: "https://www.canva.com/design/DAF_demo_tiger_presentation/view",
      },
      {
        teacherId: userId,
        title: "Year 6 UASA English Model Essay Collection & Connectors Guide.pdf",
        type: "PDF",
        size: "1.8 MB",
        subject: "English",
        year: "Year 6",
        folder: "UASA Prep",
        url: "https://drive.google.com/file/d/demo-uasa-essays/view",
      },
      {
        teacherId: userId,
        title: "Year 4 Phonics Blending Flashcards & Audio Practice",
        type: "DRIVE",
        size: "External Link",
        subject: "English",
        year: "Year 4",
        folder: "Phonics & Vocabulary",
        url: "https://drive.google.com/drive/folders/demo-phonics-y4",
      },
      {
        teacherId: userId,
        title: "YouTube Video: Daily Routines & Time Telling ESL Song for Kids",
        type: "YOUTUBE",
        size: "External Link",
        subject: "English",
        year: "Year 4",
        folder: "Audio & Video Resources",
        url: "https://www.youtube.com/watch?v=demo_routines_song",
      },
    ]);

    // 8. Create Scheme of Work
    await SchemeOfWork.create({
      name: "SOW Year 5 English (CEFR Aligned) - Term 2",
      sourceType: "custom",
      originalFilename: "SOW_Year_5_CEFR_Term_2.pdf",
      text: `SOW Year 5 English CEFR Aligned Scheme of Work - Term 2\n\nUnit 3: Wildlife Conservation (Weeks 1-3)\n- Theme: World of Knowledge\n- Key Learning Standards: 2.1.1 Explain simple content and main ideas from short texts, 3.2.2 Understand specific details.\n- Grammar Focus: Modals (should/must), comparative adjectives.\n\nUnit 4: Learning World (Weeks 4-6)\n- Theme: World of Self, Family and Friends\n- Key Learning Standards: 1.2.1 Understand complex questions, 4.2.4 Describe personal experiences.\n\nUnit 5: Adventure! (Weeks 7-9)\n- Theme: World of Stories\n- Key Learning Standards: 3.2.2 Read and understand narrative texts, 4.3.3 Produce a narrative with appropriate connectors.\n- Grammar Focus: Past Simple vs Past Continuous (when/while).`,
      year: "Year 5",
      subject: "English",
      teacherId: userId,
    });

    console.log("Successfully seeded comprehensive demo account data!");
  } catch (err) {
    console.error("Error seeding comprehensive demo account data:", err);
  }
}
