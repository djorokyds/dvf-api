function cleanJson(raw = '') {
  return String(raw)
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
}

function fallbackData(raw = '', analysis = {}) {
  return {
    mood: 'encouragement',
    phrase_choc: 'Tu avances, maintenant il faut transformer tes chiffres en plan d’action.',
    message_coach: raw || 'Je n’ai pas pu structurer complètement ma réponse.',
    mission_titre: analysis.mission?.title || 'Clarifier la prochaine étape',
    mission: analysis.mission?.action || 'Choisis une action financière simple cette semaine.',
    pourquoi: analysis.mission?.why || 'Un petit pas régulier vaut mieux qu’une grande décision repoussée.',
    module_recommande: {
      nom: analysis.module?.name || 'Formation gestion financière',
      raison: analysis.module?.description || 'Pour renforcer tes bases.',
      action: 'Commence par ce module pour avancer avec méthode.',
    },
    pensee_finale: 'L’important n’est pas d’aller vite, mais d’avancer avec constance.',
  };
}

function parseCoachResponse(raw, analysis) {
  try {
    return JSON.parse(cleanJson(raw));
  } catch {
    return fallbackData(raw, analysis);
  }
}

module.exports = {
  parseCoachResponse,
};
