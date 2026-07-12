import { Router } from "express";
import User from "../models/User.js";
import { requireDatabase } from "../services/db.js";
import { createSessionToken, publicUser, requireAuth } from "../services/auth.js";

const router = Router();

function allowedGoogleAudiences() {
  return String(process.env.GOOGLE_CLIENT_ID || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function verifyGoogleCredential(credential) {
  const audiences = allowedGoogleAudiences();
  if (!audiences.length) {
    const error = new Error("GOOGLE_CLIENT_ID is missing in backend/.env.");
    error.statusCode = 500;
    throw error;
  }

  const url = new URL("https://oauth2.googleapis.com/tokeninfo");
  url.searchParams.set("id_token", credential);
  const response = await fetch(url);
  const profile = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(profile.error_description || "Google sign-in token could not be verified.");
    error.statusCode = 401;
    throw error;
  }
  if (!audiences.includes(profile.aud)) {
    const error = new Error("Google sign-in token was issued for a different client ID.");
    error.statusCode = 401;
    throw error;
  }
  if (profile.email_verified !== "true" && profile.email_verified !== true) {
    const error = new Error("Google account email is not verified.");
    error.statusCode = 401;
    throw error;
  }

  return profile;
}

router.post("/google", requireDatabase, async (req, res, next) => {
  try {
    const credential = String(req.body.credential || "");
    if (!credential) return res.status(400).json({ error: "Google credential is required." });

    const profile = await verifyGoogleCredential(credential);
    const email = String(profile.email || "").toLowerCase();
    let user = await User.findOne({ $or: [{ googleId: profile.sub }, { email }] });
    if (!user) user = new User();

    user.googleId = profile.sub;
    user.authProvider = "google";
    user.email = email;
    user.name = profile.name || user.name || email.split("@")[0];
    user.picture = profile.picture || user.picture || "";
    user.lastLoginAt = new Date();
    await user.save();

    res.json({ token: createSessionToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireDatabase, requireAuth, async (req, res) => {
  res.json(publicUser(req.user));
});

router.post("/logout", (_req, res) => {
  res.json({ ok: true });
});

export default router;
