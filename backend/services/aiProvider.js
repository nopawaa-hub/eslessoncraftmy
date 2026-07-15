// AI provider service — NeuralWatt (GLM) only.
// Uses the OpenAI-compatible Chat Completions API.

const NEURALWATT_BASE_URL = process.env.NEURALWATT_BASE_URL || "https://api.neuralwatt.com";
const NEURALWATT_MODEL = process.env.NEURALWATT_MODEL || "glm-4-flash";
const NEURALWATT_API_KEY = process.env.NEURALWATT_API_KEY || "";

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

export function getConfiguredProvider() {
  return "neuralwatt (glm)";
}

export function getAvailableModels() {
  return [{ id: "neuralwatt", label: `GLM (${NEURALWATT_MODEL})`, provider: "neuralwatt" }];
}

// Core call to the NeuralWatt (GLM) API. Returns a unified result shape so
// callers can decide whether to parse JSON (callAI) or use plain text (callAIText).
async function callNeuralWatt(systemPrompt, userPrompt) {
  const start = Date.now();

  try {
    if (!NEURALWATT_API_KEY) {
      throw new Error("NEURALWATT_API_KEY is not configured.");
    }

    const baseUrl = NEURALWATT_BASE_URL.replace(/\/+$/, "");
    const url = `${baseUrl}/v1/chat/completions`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${NEURALWATT_API_KEY}`,
      },
      body: JSON.stringify({
        model: NEURALWATT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`NeuralWatt request failed: ${details}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    const responseTimeMs = Date.now() - start;
    console.log(
      `[AI] provider=neuralwatt model=${NEURALWATT_MODEL} responseTimeMs=${responseTimeMs} fallbackTriggered=false`,
    );

    return {
      text,
      provider: "neuralwatt",
      model: NEURALWATT_MODEL,
      responseTimeMs,
      fallbackTriggered: false,
    };
  } catch (error) {
    const responseTimeMs = Date.now() - start;
    console.warn(
      `[AI] provider=neuralwatt model=${NEURALWATT_MODEL} responseTimeMs=${responseTimeMs} fallbackTriggered=true error="${error.message}"`,
    );

    return {
      text: null,
      provider: "neuralwatt",
      responseTimeMs,
      fallbackTriggered: true,
      error: error.message,
    };
  }
}

// Structured AI call — returns parsed JSON. Used by lesson generation,
// evaluation, KSSR analysis, etc.
export async function callAI(systemPrompt, userPrompt, _modelHint) {
  const result = await callNeuralWatt(systemPrompt, userPrompt);
  return { ...result, data: result.fallbackTriggered ? null : safeParseJson(result.text) };
}

// Free-text AI call for conversational responses (copilot). Returns raw text
// instead of trying to parse JSON, so the model can answer naturally.
export async function callAIText(systemPrompt, userPrompt, _modelHint) {
  const result = await callNeuralWatt(systemPrompt, userPrompt);
  return {
    text: result.text || "",
    provider: result.provider,
    model: result.model,
    responseTimeMs: result.responseTimeMs,
    fallbackTriggered: result.fallbackTriggered,
    error: result.error || null,
  };
}
