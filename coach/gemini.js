const { GoogleGenAI } = require('@google/genai');

const DEFAULT_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
];

function getModels() {
  if (process.env.GEMINI_MODELS) {
    return process.env.GEMINI_MODELS
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
  }

  return DEFAULT_MODELS;
}

function createGeminiClient() {
  return new GoogleGenAI({
    apiKey: process.env.GOOGLE_API_KEY,
  });
}

function isRetryableGeminiError(error) {
  const text = error.message || '';

  return (
    text.includes('429') ||
    text.includes('RESOURCE_EXHAUSTED') ||
    text.includes('quota') ||
    text.includes('503') ||
    text.includes('UNAVAILABLE') ||
    text.includes('high demand')
  );
}

async function askGemini(prompt) {
  const ai = createGeminiClient();
  const models = getModels();

  let lastError;

  for (const model of models) {
    try {
      const result = await ai.models.generateContent({
        model,
        contents: prompt,
      });

      return result.text || '';
    } catch (error) {
      lastError = error;

      if (!isRetryableGeminiError(error)) {
        throw error;
      }

      console.warn(`Modèle indisponible ou quota atteint : ${model}`);
    }
  }

  throw lastError;
}

module.exports = {
  askGemini,
};
