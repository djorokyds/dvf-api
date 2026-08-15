const { GoogleGenAI } = require('@google/genai');

// Liste vérifiée en août 2026 (voir https://ai.google.dev/gemini-api/docs/changelog).
// gemini-2.0-flash / gemini-2.0-flash-lite : arrêtés le 01/06/2026 (404 permanent).
// gemini-3-flash : n'a jamais existé sous ce nom.
// gemini-2.5-* : encore actifs, mais arrêt prévu le 16/10/2026 -> à retirer avant cette date.
const DEFAULT_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash', // fallback temporaire, arrêt prévu le 16/10/2026
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
    text.includes('high demand') ||
    // Modèle inexistant / non supporté
    text.includes('404') ||
    text.includes('NOT_FOUND') ||
    text.includes('is not found') ||
    text.includes('not supported for generateContent')
  );
}

// Schéma explicite pour le JSON mode natif de Gemini : évite de dépendre
// uniquement de la consigne texte "réponds en JSON" dans le prompt, et
// réduit fortement les cas où parser.js doit retomber sur le fallback.
const COACH_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    intention: { type: 'string' },
    phrase_choc: { type: 'string' },
    message_coach: { type: 'string' },
    ce_qui_me_rassure: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 2,
    },
    ce_qui_te_freine: { type: 'string' },
    priorite_titre: { type: 'string' },
    priorite_action: { type: 'string' },
    priorite_pourquoi: { type: 'string' },
    module_recommande: {
      type: 'object',
      properties: {
        nom: { type: 'string' },
        raison: { type: 'string' },
        action: { type: 'string' },
      },
      required: ['nom', 'raison', 'action'],
    },
    reflection: { type: 'string' },
  },
  required: [
    'intention',
    'phrase_choc',
    'message_coach',
    'priorite_titre',
    'priorite_action',
    'priorite_pourquoi',
    'module_recommande',
  ],
};

async function askGemini(prompt) {
  const ai = createGeminiClient();
  const models = getModels();
  let lastError;

  for (const model of models) {
    try {
      const result = await ai.models.generateContent({
        model,
        contents: prompt,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: COACH_RESPONSE_SCHEMA,
          maxOutputTokens: 2048,
          temperature: 0.6,
        },
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
  isRetryableGeminiError,
};
