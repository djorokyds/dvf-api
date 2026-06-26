const { askGemini } = require('../coach/gemini');
const { buildCoachAnalysis } = require('../coach/analysisEngine');
const { buildPrompt } = require('../coach/prompt');
const { parseCoachResponse } = require('../coach/parser');
const { renderCoachHtml } = require('../coach/ui');
const { extractRetrySeconds, renderRetryPage } = require('../coach/retry');

module.exports = async function handler(req, res) {
  try {
    const analysis = buildCoachAnalysis(req.query);
    const prompt = buildPrompt(req.query, analysis);
    const raw = await askGemini(prompt);
    const data = parseCoachResponse(raw, analysis);

    const html = renderCoachHtml(data);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (error) {
    const text = error.message || '';

    if (
      text.includes('429') ||
      text.includes('RESOURCE_EXHAUSTED') ||
      text.includes('quota')
    ) {
      const seconds = extractRetrySeconds(text);
      return res.status(429).send(renderRetryPage(seconds));
    }

    return res.status(500).json({ error: error.message });
  }
};
