const GEMINI_API_VERSION = process.env.GEMINI_API_VERSION || "v1beta";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com";
const GEMINI_MODEL_FALLBACKS = [
  GEMINI_MODEL,
  "gemini-1.5-flash-latest",
  "gemini-2.0-flash",
  "gemini-2.5-flash",
].filter((model, index, models) => model && models.indexOf(model) === index);

// NeuralWatt / GLM provider config (OpenAI-compatible API).
// When NEURALWATT_API_KEY is set, the system round-robins between Gemini and
// NeuralWatt on each AI call to distribute load and avoid rate limits.
const NEURALWATT_BASE_URL = process.env.NEURALWATT_BASE_URL || "https://api.neuralwatt.com";
const NEURALWATT_MODEL = process.env.NEURALWATT_MODEL || "glm-4-flash";
const NEURALWATT_API_KEY = process.env.NEURALWATT_API_KEY || "";

// Round-robin counter — alternates between providers so neither hits its rate
// limit. When the selected provider fails, the other is tried as a fallback.
let roundRobinCounter = 0;

function isNeuralWattConfigured() {
  return Boolean(NEURALWATT_API_KEY);
}

export function getConfiguredProvider() {
  return isNeuralWattConfigured() ? "gemini+neuralwatt (round-robin)" : "gemini";
}

// Lists the AI models currently available based on configured API keys.
// Used by the /health endpoint so the frontend Settings page can populate
// its model selector with only real, enabled options.
export function getAvailableModels() {
  const models = [
    { id: "gemini", label: `Gemini (${GEMINI_MODEL})`, provider: "gemini" },
  ];
  if (isNeuralWattConfigured()) {
    models.push({ id: "neuralwatt", label: `GLM (${NEURALWATT_MODEL})`, provider: "neuralwatt" });
  }
  return models;
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

// Shared Gemini call loop. Returns the raw response object so callers can
// decide whether to parse JSON (callAI) or return plain text (callAIText).
async function callGemini(systemPrompt, userPrompt) {
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
        text,
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
      text: null,
      provider: "gemini",
      responseTimeMs,
      fallbackTriggered: true,
      error: error.message,
    };
  }
}

// NeuralWatt / GLM call using the OpenAI-compatible Chat Completions API.
// Returns the same shape as callGemini so the dispatcher and callers are agnostic.
async function callNeuralWatt(systemPrompt, userPrompt) {
  const startedAt = Date.now();

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
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`NeuralWatt request failed for ${NEURALWATT_MODEL}: ${details}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    const responseTimeMs = Date.now() - startedAt;
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
    const responseTimeMs = Date.now() - startedAt;
    console.warn(
      `[AI] provider=neuralwatt model=${NEURALWATT_MODEL} responseTimeMs=${responseTimeMs} fallbackTriggered=true error="${error.message}"`,
    );

    return {
      text: null,
      provider: "neuralwatt",
      model: NEURALWATT_MODEL,
      responseTimeMs,
      fallbackTriggered: true,
      error: error.message,
    };
  }
}

// Round-robin dispatcher: alternates between Gemini and NeuralWatt on each call.
// If the selected provider fails, the other is tried as a fallback before
// giving up. When only one provider is configured, it's used exclusively.
//
// modelHint (optional): if the frontend sends a model preference (e.g. "gemini"
// or "neuralwatt"), the dispatcher tries that provider first. Unknown/unsupported
// hints are ignored and the normal round-robin is used.
async function callAIWithRoundRobin(systemPrompt, userPrompt, modelHint) {
  const useNeuralWatt = isNeuralWattConfigured();

  // If a valid model hint was provided, try that provider first.
  if (modelHint && typeof modelHint === "string") {
    const hint = modelHint.toLowerCase();
    if (hint === "neuralwatt" || hint === "glm") {
      if (useNeuralWatt) {
        const hintedResult = await callNeuralWatt(systemPrompt, userPrompt);
        if (!hintedResult.fallbackTriggered && hintedResult.text) return hintedResult;
        // Fall through to round-robin as fallback.
      }
    } else if (hint === "gemini") {
      const hintedResult = await callGemini(systemPrompt, userPrompt);
      if (!hintedResult.fallbackTriggered && hintedResult.text) return hintedResult;
      // Fall through to round-robin as fallback.
    }
    // Unknown hint — ignore and use round-robin below.
  }

  // When only one provider is configured, skip round-robin.
  if (!useNeuralWatt) {
    return callGemini(systemPrompt, userPrompt);
  }

  // Pick the provider for this call (alternating).
  const pickNeuralWattFirst = roundRobinCounter % 2 === 1;
  roundRobinCounter += 1;

  const primary = pickNeuralWattFirst
    ? () => callNeuralWatt(systemPrompt, userPrompt)
    : () => callGemini(systemPrompt, userPrompt);
  const secondary = pickNeuralWattFirst
    ? () => callGemini(systemPrompt, userPrompt)
    : () => callNeuralWatt(systemPrompt, userPrompt);

  const primaryResult = await primary();
  if (!primaryResult.fallbackTriggered && primaryResult.text) {
    return primaryResult;
  }

  // Primary failed — try the other provider before giving up.
  console.log(`[AI] ${primaryResult.provider} failed, falling back to the other provider…`);
  const secondaryResult = await secondary();
  if (!secondaryResult.fallbackTriggered && secondaryResult.text) {
    return secondaryResult;
  }

  // Both failed — return the primary's failure (it was the intended provider).
  return primaryResult;
}

export async function callAI(systemPrompt, userPrompt, modelHint) {
  const result = await callAIWithRoundRobin(systemPrompt, userPrompt, modelHint);
  return { ...result, data: result.fallbackTriggered ? null : safeParseJson(result.text) };
}

// Free-text AI call for conversational responses (copilot). Returns raw text
// instead of trying to parse JSON, so the model can answer naturally.
export async function callAIText(systemPrompt, userPrompt, modelHint) {
  const result = await callAIWithRoundRobin(systemPrompt, userPrompt, modelHint);
  return {
    text: result.text || "",
    provider: result.provider,
    model: result.model,
    responseTimeMs: result.responseTimeMs,
    fallbackTriggered: result.fallbackTriggered,
    error: result.error || null,
  };
}
