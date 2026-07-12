import crypto from "node:crypto";
import User from "../models/User.js";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function base64UrlEncode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function base64UrlDecode(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function getSessionSecret() {
  return process.env.SESSION_SECRET || process.env.JWT_SECRET || "lessoncraft-local-dev-secret";
}

function sign(value) {
  return crypto.createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

export function createSessionToken(user) {
  const header = base64UrlEncode({ alg: "HS256", typ: "JWT" });
  const now = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode({
    sub: String(user._id),
    email: user.email,
    name: user.name,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  });
  const body = `${header}.${payload}`;
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token) {
  if (!token) return null;
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) return null;
  const body = `${header}.${payload}`;
  const expected = sign(body);
  const actual = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actual.length !== expectedBuffer.length || !crypto.timingSafeEqual(actual, expectedBuffer)) return null;
  const claims = base64UrlDecode(payload);
  if (!claims?.sub || !claims?.exp || claims.exp < Math.floor(Date.now() / 1000)) return null;
  return claims;
}

function readBearerToken(req) {
  const header = req.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

export async function requireAuth(req, res, next) {
  try {
    const claims = verifySessionToken(readBearerToken(req));
    if (!claims) return res.status(401).json({ error: "Please sign in again." });
    const user = await User.findById(claims.sub);
    if (!user) return res.status(401).json({ error: "Account not found. Please sign in again." });
    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function publicUser(user) {
  return {
    _id: user._id,
    name: user.name,
    school: user.school,
    email: user.email,
    picture: user.picture,
    settings: user.settings,
    authProvider: user.authProvider,
  };
}
