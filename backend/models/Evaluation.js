import mongoose from "mongoose";

const annotationSchema = new mongoose.Schema(
  {
    text: { type: String, default: "" },
    start: { type: Number, default: -1 },
    end: { type: Number, default: -1 },
    issue: { type: String, required: true },
    explanation: { type: String, required: true },
    suggestion: { type: String, required: true },
    rationale: { type: String, default: "" },
    attention: { type: String, default: "" },
    severity: { type: String, enum: ["medium", "high"], default: "medium" },
    category: { type: String, default: "KSSR/DSKP Review" },
  },
  { _id: false },
);

const evaluationSchema = new mongoose.Schema(
  {
    lessonPlanId: { type: mongoose.Schema.Types.ObjectId, ref: "LessonPlan", required: true },
    annotations: { type: [annotationSchema], default: [] },
    summary: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export default mongoose.model("Evaluation", evaluationSchema);
