import { describe, it, expect } from "vitest";
import { buildAiSource } from "../services/pedagogyEngine.js";

// buildAiSource is the provenance stamp threaded through every AI route result.
// It must correctly flag when the model could not be reached (fallback) so the
// frontend can show a "demo content" notice instead of presenting mock output
// as if it were real AI.

describe("buildAiSource", () => {
  it("marks a successful AI call as not-fallback and carries the model", () => {
    const ai = {
      data: { title: "Real lesson" },
      provider: "gemini",
      model: "gemini-2.5-flash",
      responseTimeMs: 1200,
      fallbackTriggered: false,
    };
    const source = buildAiSource(ai);
    expect(source.fallbackTriggered).toBe(false);
    expect(source.provider).toBe("gemini");
    expect(source.model).toBe("gemini-2.5-flash");
    expect(source.error).toBeNull();
  });

  it("marks a failed AI call as fallback and surfaces the error", () => {
    const ai = {
      data: null,
      provider: "gemini",
      responseTimeMs: 40,
      fallbackTriggered: true,
      error: "Gemini request failed: quota exceeded",
    };
    const source = buildAiSource(ai);
    expect(source.fallbackTriggered).toBe(true);
    expect(source.error).toContain("quota exceeded");
    expect(source.model).toBeNull();
  });

  it("defaults to a gemini provider when the AI result is missing/undefined", () => {
    const source = buildAiSource(undefined);
    expect(source.fallbackTriggered).toBe(false);
    expect(source.provider).toBe("gemini");
    expect(source.model).toBeNull();
    expect(source.error).toBeNull();
  });
});
