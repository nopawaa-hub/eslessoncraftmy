const GEMINI_API_VERSION = process.env.GEMINI_API_VERSION || "v1beta";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com";
const GEMINI_MODEL_FALLBACKS = [
  GEMINI_MODEL,
  "gemini-1.5-flash-latest",
  "gemini-2.0-flash",
  "gemini-2.5-flash",
].filter((model, index, models) => model && models.indexOf(model) === index);

export function getConfiguredProvider() {
  return "gemini";
}

export function safeParseJson(rawText) {
  if (!rawText || typeof rawText !== "string") {
    throw new Error("AI response was empty.");
  }

  const cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error("AI response did not contain a JSON object.");
    }

    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  }
}

export async function callAI(systemPrompt, userPrompt) {
  const startedAt = Date.now();

  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    let lastError = null;

    for (const model of GEMINI_MODEL_FALLBACKS) {
      const baseUrl = GEMINI_BASE_URL.replace(/\/+$/, "");
      const url = `${baseUrl}/${GEMINI_API_VERSION}/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
            },
          ],
        }),
      });

      if (!response.ok) {
        const details = await response.text();
        lastError = new Error(`Gemini request failed for ${model}: ${details}`);
        if ([404, 429, 503].includes(response.status)) continue;
        throw lastError;
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const responseTimeMs = Date.now() - startedAt;
      console.log(
        `[AI] provider=gemini apiVersion=${GEMINI_API_VERSION} model=${model} responseTimeMs=${responseTimeMs} fallbackTriggered=false`,
      );

      return {
        data: safeParseJson(text),
        provider: "gemini",
        model,
        responseTimeMs,
        fallbackTriggered: false,
      };
    }

    throw lastError || new Error("No Gemini model could generate content.");
  } catch (error) {
    const responseTimeMs = Date.now() - startedAt;
    console.warn(
      `[AI] provider=gemini apiVersion=${GEMINI_API_VERSION} model=${GEMINI_MODEL} responseTimeMs=${responseTimeMs} fallbackTriggered=true error="${error.message}"`,
    );

    return {
      data: null,
      provider: "gemini",
      responseTimeMs,
      fallbackTriggered: true,
      error: error.message,
    };
  }
}
