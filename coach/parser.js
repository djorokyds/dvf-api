function cleanJson(raw = '') {
  return String(raw)
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
}

function fallbackData(raw = '', analysis = {}) {
  return {
    intention: 'Faisons le point',
    phrase_choc: 'Tu avances, maintenant il faut transformer tes chiffres en décision utile.',
    message_coach: raw || 'Je n’ai pas pu structurer complètement ma réponse.',
    priorite_titre: analysis.mission?.title || 'Clarifier la prochaine étape',
    priorite_action: analysis.mission?.action || 'Choisis une action financière simple cette semaine.',
    priorite_pourquoi:
      analysis.mission?.why || 'Un petit pas régulier vaut mieux qu’une grande décision repoussée.',
    module_recommande: {
      nom: analysis.module?.name || 'Formation gestion financière',
      raison: analysis.module?.description || 'Pour renforcer tes bases.',
      action: 'Commence par ce module pour avancer avec méthode.',
    },
    reflection: '',
  };
}

function normalizeCoachData(data = {}, analysis = {}) {
  return {
    intention: data.intention || data.mood || 'Faisons le point',
    phrase_choc: data.phrase_choc || '',
    message_coach: data.message_coach || data.message || '',
    priorite_titre:
      data.priorite_titre || data.mission_titre || analysis.mission?.title || '',
    priorite_action:
      data.priorite_action || data.mission || analysis.mission?.action || '',
    priorite_pourquoi:
      data.priorite_pourquoi || data.pourquoi || analysis.mission?.why || '',
    module_recommande: {
      nom:
        data.module_recommande?.nom ||
        data.module ||
        analysis.module?.name ||
        'Formation gestion financière',
      raison:
        data.module_recommande?.raison ||
        analysis.module?.description ||
        '',
      action:
        data.module_recommande?.action ||
        data.module_action ||
        'Commence par ce module pour avancer avec méthode.',
    },
    reflection:
      data.reflection ||
      data.pensee_finale ||
      '',
  };
}

function parseCoachResponse(raw, analysis) {
  try {
    const parsed = JSON.parse(cleanJson(raw));
    return normalizeCoachData(parsed, analysis);
  } catch {
    return fallbackData(raw, analysis);
  }
}

module.exports = {
  parseCoachResponse,
};
