import mongoose from "mongoose";

const periodSchema = new mongoose.Schema(
  {
    scheduleId: { type: mongoose.Schema.Types.ObjectId, ref: "Schedule", required: true, index: true },
    day: { type: String, enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    className: { type: String, required: true, trim: true },
    subject: { type: String, default: "English", trim: true },
    year: { type: String, default: "Year 4" },
    recurring: { type: Boolean, default: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

periodSchema.index({ scheduleId: 1, day: 1, startTime: 1 });

export default mongoose.model("Period", periodSchema);
