function cleanJson(raw = '') {
  return String(raw)
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
}

function normalizeArray(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === 'string' && item.trim())
    : [];
}

function fallbackData(raw = '', analysis = {}) {
  return {
    intention:
      analysis.intent === 'analyse_mensuelle'
        ? 'Regardons ton mois'
        : 'Faisons le point',

    phrase_choc:
      analysis.intent === 'analyse_mensuelle'
        ? 'Ton mois mérite une lecture claire avant de décider quoi ajuster.'
        : 'Tu avances, maintenant il faut transformer tes chiffres en décision utile.',

    message_coach:
      raw || 'Je n’ai pas pu structurer complètement ma réponse.',

    ce_qui_me_rassure:
      analysis.relevantForces?.slice(0, 2) || [],

    ce_qui_te_freine:
      analysis.relevantVigilances?.[0] || '',

    priorite_titre:
      analysis.mission?.title || 'Clarifier la prochaine étape',

    priorite_action:
      analysis.mission?.action ||
      'Choisis une action financière simple à mettre en place.',

    priorite_pourquoi:
      analysis.mission?.why ||
      'Une action ciblée est plus utile qu’une réduction générale sans objectif.',

    module_recommande: {
      nom:
        analysis.module?.name ||
        'Formation gestion financière',

      raison:
        analysis.module?.description ||
        'Pour renforcer tes bases.',

      action:
        'Utilise ce module pour approfondir la situation.',
    },

    reflection: '',
  };
}

function normalizeCoachData(data = {}, analysis = {}) {
  const reassurance = normalizeArray(
    data.ce_qui_me_rassure || data.forces
  );

  const friction =
    data.ce_qui_te_freine ||
    data.ce_qui_me_freine ||
    '';

  return {
    intention:
      data.intention ||
      (analysis.intent === 'analyse_mensuelle'
        ? 'Regardons ton mois'
        : 'Faisons le point'),

    phrase_choc:
      data.phrase_choc || '',

    message_coach:
      data.message_coach ||
      data.message ||
      '',

    ce_qui_me_rassure:
      reassurance.slice(0, 2),

    ce_qui_te_freine:
      typeof friction === 'string'
        ? friction.trim()
        : '',

    priorite_titre:
      data.priorite_titre ||
      data.mission_titre ||
      analysis.mission?.title ||
      '',

    priorite_action:
      data.priorite_action ||
      data.mission ||
      analysis.mission?.action ||
      '',

    priorite_pourquoi:
      data.priorite_pourquoi ||
      data.pourquoi ||
      analysis.mission?.why ||
      '',

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
        'Utilise ce module pour approfondir la situation.',
    },

    reflection:
      typeof data.reflection === 'string'
        ? data.reflection.trim()
        : '',
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
