const { GoogleGenAI } = require('@google/genai');

const MODEL_NAME = 'gemini-3.1-flash-lite';

function createGeminiClient() {
  return new GoogleGenAI({
    apiKey: process.env.GOOGLE_API_KEY,
  });
}

async function askGemini(prompt) {
  const ai = createGeminiClient();

  const result = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
  });

  return result.text || '';
}

module.exports = {
  askGemini,
};
