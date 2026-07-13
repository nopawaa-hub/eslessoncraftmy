import { describe, it, expect, beforeEach } from "vitest";
import { createSessionToken, verifySessionToken, publicUser } from "../services/auth.js";

// These are pure crypto tests — no DB connection required. createSessionToken
// signs with process.env.SESSION_SECRET (set in backend/.env), so we pin it
// here so the round-trip is deterministic regardless of env load order.
beforeEach(() => {
  process.env.SESSION_SECRET = "vitest-test-secret";
});

const fakeUser = {
  _id: "65a1b2c3d4e5f6a7b8c9d0e1",
  name: "Cikgu Test",
  email: "test@lessoncraft.my",
  school: "SK Test",
  picture: "",
  settings: { defaultYear: "Year 4" },
  authProvider: "google",
};

describe("session tokens", () => {
  it("round-trips a valid token and exposes the subject claim", () => {
    const token = createSessionToken(fakeUser);
    const claims = verifySessionToken(token);
    expect(claims).not.toBeNull();
    expect(claims.sub).toBe(String(fakeUser._id));
    expect(claims.email).toBe(fakeUser.email);
    expect(claims.name).toBe(fakeUser.name);
    expect(claims.exp).toBeGreaterThan(claims.iat);
  });

  it("rejects a tampered signature", () => {
    const token = createSessionToken(fakeUser);
    const [header, payload] = token.split(".");
    const forged = `${header}.${payload}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
    expect(verifySessionToken(forged)).toBeNull();
  });

  it("rejects a token past its expiry", () => {
    // Build a token, then rewind the clock so it appears already expired.
    const token = createSessionToken(fakeUser);
    const claims = verifySessionToken(token);
    // Re-sign with an expiry in the past by mocking Date.now during creation.
    const realNow = Date.now;
    Date.now = () => 0;
    const expiredToken = createSessionToken(fakeUser);
    Date.now = realNow;
    // The token minted at epoch 0 has exp ~ 1970 + 7 days, so it is expired now.
    expect(verifySessionToken(expiredToken)).toBeNull();
    // Sanity: the fresh token (minted now) still verifies.
    expect(claims).not.toBeNull();
  });

  it("returns null for malformed input", () => {
    expect(verifySessionToken(null)).toBeNull();
    expect(verifySessionToken("")).toBeNull();
    expect(verifySessionToken("not.a.token")).toBeNull();
    expect(verifySessionToken("onlyonepart")).toBeNull();
  });
});

describe("publicUser", () => {
  it("exposes only the safe profile fields, not secrets or auth internals", () => {
    const out = publicUser(fakeUser);
    expect(out.name).toBe(fakeUser.name);
    expect(out.email).toBe(fakeUser.email);
    expect(out.school).toBe(fakeUser.school);
    expect(out.settings).toEqual(fakeUser.settings);
    expect(out.authProvider).toBe("google");
    // Must not leak a password-ish or token field even if one were added.
    expect(out).not.toHaveProperty("password");
    expect(out).not.toHaveProperty("token");
  });
});
