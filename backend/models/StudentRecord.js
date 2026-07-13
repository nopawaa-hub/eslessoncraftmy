import mongoose from "mongoose";

const studentRecordSchema = new mongoose.Schema(
  {
    studentName: { type: String, required: true, trim: true },
    scores: { type: [Number], default: [] },
    average: { type: Number, default: 0 },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

studentRecordSchema.pre("save", function calculateAverage(next) {
  if (this.scores.length) {
    this.average = Number((this.scores.reduce((total, score) => total + score, 0) / this.scores.length).toFixed(2));
  } else {
    this.average = 0;
  }
  next();
});

export default mongoose.model("StudentRecord", studentRecordSchema);
