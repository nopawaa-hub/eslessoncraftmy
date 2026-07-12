import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, default: "Cikgu Ahmad", trim: true },
    school: { type: String, default: "SK Seri Bintang", trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    picture: { type: String, default: "", trim: true },
    googleId: { type: String, default: "", trim: true, index: true },
    authProvider: { type: String, enum: ["local", "google"], default: "local" },
    lastLoginAt: { type: Date },
    settings: {
      defaultYear: { type: String, default: "Year 4" },
      defaultSubject: { type: String, default: "English" },
      weekStartsOn: { type: String, enum: ["Monday", "Sunday"], default: "Monday" },
      timetableView: { type: String, enum: ["weekly", "daily", "calendar"], default: "weekly" },
    },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
