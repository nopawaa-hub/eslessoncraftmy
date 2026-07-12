import mongoose from "mongoose";

const assessmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    questions: { type: [String], default: [] },
    year: { type: String, required: true, enum: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"] },
    subject: { type: String, required: true, trim: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", index: true },
    assessmentType: { type: String, default: "PBD observation", trim: true },
    evidenceType: { type: String, default: "Teacher observation", trim: true },
    criteria: { type: [String], default: [] },
    scaleType: { type: String, enum: ["tp", "score", "checkbox", "remarks"], default: "tp" },
    records: {
      type: [
        {
          studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
          studentName: { type: String, default: "", trim: true },
          value: { type: String, default: "", trim: true },
          tp: { type: Number, min: 1, max: 6 },
          remarks: { type: String, default: "", trim: true },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

export default mongoose.model("Assessment", assessmentSchema);
