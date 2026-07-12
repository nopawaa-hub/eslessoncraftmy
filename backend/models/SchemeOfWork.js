import mongoose from "mongoose";

const schemeOfWorkSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sourceType: { type: String, enum: ["custom"], default: "custom" },
    originalFilename: { type: String, default: "" },
    mimeType: { type: String, default: "" },
    text: { type: String, required: true },
    year: { type: String, default: "" },
    subject: { type: String, default: "English" },
  },
  { timestamps: true },
);

export default mongoose.model("SchemeOfWork", schemeOfWorkSchema);
