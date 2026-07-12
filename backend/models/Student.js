import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true, index: true },
    studentName: { type: String, required: true, trim: true },
    proficiency: { type: String, default: "Mixed ability", trim: true },
    notes: { type: String, default: "", trim: true },
    status: { type: String, enum: ["active", "archived"], default: "active" },
  },
  { timestamps: true },
);

studentSchema.index({ classId: 1, studentName: 1 });

export default mongoose.model("Student", studentSchema);
