import mongoose from "mongoose";

const scheduleLessonLinkSchema = new mongoose.Schema(
  {
    lessonPlanId: { type: mongoose.Schema.Types.ObjectId, ref: "LessonPlan", required: true, index: true },
    periodId: { type: mongoose.Schema.Types.ObjectId, ref: "Period", required: true, index: true },
    scheduledDate: { type: Date, required: true, index: true },
    status: { type: String, enum: ["planned", "taught", "missed"], default: "planned" },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

scheduleLessonLinkSchema.index({ periodId: 1, scheduledDate: 1 }, { unique: true });

export default mongoose.model("ScheduleLessonLink", scheduleLessonLinkSchema);
