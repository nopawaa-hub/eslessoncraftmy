import mongoose from "mongoose";

const materialSchema = new mongoose.Schema(
  {
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    title: { type: String, required: true, trim: true },
    type: { type: String, default: "FILE", trim: true }, // e.g., "PDF", "DOCX", "PPTX", "LINK", "DRIVE", "CANVA", "IMAGE"
    size: { type: String, default: "External", trim: true },
    subject: { type: String, default: "English", trim: true },
    year: { type: String, default: "General", trim: true },
    url: { type: String, default: "", trim: true }, // External Drive/Canva link OR download path
    driveId: { type: String, default: "", trim: true },
    fileData: { type: String, default: "" }, // Base64 data URI string for small files <= 1.5MB so they download directly without external storage limits
    folder: { type: String, default: "General", trim: true },
    notes: { type: String, default: "", trim: true },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

materialSchema.index({ teacherId: 1, createdAt: -1 });

export default mongoose.model("Material", materialSchema);
