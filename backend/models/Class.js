import mongoose from "mongoose";

const classSchema = new mongoose.Schema(
  {
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    name: { type: String, required: true, trim: true },
    year: { type: String, required: true, enum: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"] },
    subject: { type: String, default: "English", trim: true },
    studentCount: { type: Number, default: 0 },
    studentProficiency: { type: String, default: "Mixed ability", trim: true },
    classroomEnvironment: { type: String, default: "Standard classroom with limited ICT", trim: true },
    teachingNotes: { type: String, default: "", trim: true },
    tags: { type: [String], default: [] },
    status: { type: String, enum: ["active", "archived"], default: "active" },
  },
  { timestamps: true },
);

classSchema.index({ teacherId: 1, name: 1 });

export default mongoose.model("Class", classSchema);
