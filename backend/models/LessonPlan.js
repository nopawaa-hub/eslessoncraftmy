import mongoose from "mongoose";

const lessonPlanSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    year: { type: String, required: true, enum: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"] },
    subject: { type: String, required: true, trim: true },
    topic: { type: String, required: true, trim: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", index: true },
    className: { type: String, default: "", trim: true },
    skill: { type: String, required: true, enum: ["Reading", "Writing", "Speaking", "Listening", "Grammar", "Phonics"] },
    contentStandard: { type: String, default: "" },
    learningStandard: { type: String, default: "" },
    objectives: { type: [String], default: [] },
    activities: { type: [String], default: [] },
    assessments: { type: [String], default: [] },
    reflection: { type: String, default: "" },
    steps: { type: [String], default: [] },
    aiGeneratedContent: { type: mongoose.Schema.Types.Mixed, default: {} },
    tags: { type: [String], default: [] },
    status: { type: String, enum: ["draft", "completed", "archived"], default: "draft" },
    templateType: { type: String, default: "Default MOE Template" },
    lessonDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
    generatedFields: { type: mongoose.Schema.Types.Mixed, default: {} },
    sowSource: {
      type: { type: String, enum: ["kpm", "custom"], default: "kpm" },
      id: { type: mongoose.Schema.Types.ObjectId, ref: "SchemeOfWork" },
      name: { type: String, default: "KPM Default Scheme of Work" },
    },
    scheduleId: { type: mongoose.Schema.Types.ObjectId, ref: "Schedule" },
    exportMeta: {
      lastFormat: { type: String, default: "" },
      lastExportedAt: { type: Date },
    },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

export default mongoose.model("LessonPlan", lessonPlanSchema);
