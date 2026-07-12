import { Router } from "express";
import User from "../models/User.js";
import { requireDatabase } from "../services/db.js";
import { publicUser, requireAuth } from "../services/auth.js";

const router = Router();

async function getDefaultUser() {
  let user = await User.findOne();
  if (!user) user = await User.create({});
  return user;
}

router.get("/me", requireDatabase, requireAuth, async (req, res, next) => {
  try {
    res.json(publicUser(req.user || (await getDefaultUser())));
  } catch (error) {
    next(error);
  }
});

router.put("/me", requireDatabase, requireAuth, async (req, res, next) => {
  try {
    const user = req.user || (await getDefaultUser());
    user.name = req.body.name ?? user.name;
    user.school = req.body.school ?? user.school;
    user.email = req.body.email ?? user.email;
    user.settings = { ...user.settings, ...(req.body.settings || {}) };
    await user.save();
    res.json(publicUser(user));
  } catch (error) {
    next(error);
  }
});

export default router;
