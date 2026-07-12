import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    name: { type: String, default: "Default Weekly Schedule" },
    weekStart: { type: Date },
    dayStructure: { type: [String], default: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] },
    timetableConfig: {
      startHour: { type: String, default: "08:00" },
      endHour: { type: String, default: "14:00" },
      slotMinutes: { type: Number, default: 60 },
    },
    date: { type: Date, required: true },
    title: { type: String, default: "Class period" },
    className: { type: String, default: "" },
    subject: { type: String, default: "English" },
    year: { type: String, default: "Year 4" },
    startTime: { type: String, default: "" },
    endTime: { type: String, default: "" },
    durationMinutes: { type: Number, default: 60 },
    lessonPlanId: { type: mongoose.Schema.Types.ObjectId, ref: "LessonPlan" },
    notes: { type: String, default: "" },
    status: { type: String, enum: ["planned", "linked", "completed"], default: "planned" },
  },
  { timestamps: true },
);

export default mongoose.model("Schedule", scheduleSchema);
