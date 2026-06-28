const { euro } = require('./profileEngine');
const { ratio, pct } = require('./budgetEngine');

function extractProjectAmount(query) {
  const text = `${query.objectif || ''} ${query.message || ''}`;
  const matches = text.match(/(\d[\d\s]{3,})\s*(€|euros)?/i);

  if (!matches) return null;

  const normalized = matches[1].replace(/\s/g, '');
  const amount = Number(normalized);

  return Number.isFinite(amount) ? amount : null;
}

function buildRealEstateDecision(profileAnalysis, query) {
  const reassure = [];
  const friction = [];

  const projectAmount = extractProjectAmount(query);
  const { epargneProjet, tauxEndettement, epargneMoyen } =
    profileAnalysis.numbers;

  if (epargneProjet !== null && epargneProjet > 0) {
    reassure.push(`${euro(epargneProjet)} sont déjà mobilisables pour constituer ton apport`);
  }

  if (tauxEndettement !== null && tauxEndettement <= 20) {
    reassure.push(`avec ${tauxEndettement} % d’endettement, tu gardes une vraie marge pour financer un projet`);
  }

  if (projectAmount && epargneProjet !== null) {
    const apportRatio = ratio(epargneProjet, projectAmount);

    if (apportRatio !== null && apportRatio < 10) {
      friction.push(
        `pour un projet de ${euro(projectAmount)}, ton apport mobilisable reste le principal levier à renforcer`
      );
    }
  }

  if (!friction.length && epargneMoyen !== null && epargneMoyen >= 300) {
    friction.push(
      `le prochain enjeu est de transformer ton rythme d’épargne en apport plus solide`
    );
  }

  return {
    reassure: reassure.slice(0, 2),
    friction: friction[0] || '',
  };
}

function buildMonthlyDecision(budgetAnalysis, behaviorInsights) {
  const reassure = [];
  const friction = [];

  if (budgetAnalysis.budgetRule.budgetRespecte === true) {
    reassure.push('ton budget prévisionnel est respecté ce mois-ci');
  }

  if (budgetAnalysis.budgetRule.epargneOk === true) {
    reassure.push(
      `ton épargne du mois soutient tes objectifs sans déséquilibrer ton budget`
    );
  }

  const mainBehavior = behaviorInsights[0];

  if (mainBehavior && mainBehavior.variation > 0) {
    friction.push(mainBehavior.message);
  } else if (budgetAnalysis.budgetRule.summary) {
    friction.push(budgetAnalysis.budgetRule.summary);
  }

  return {
    reassure: reassure.slice(0, 2),
    friction: friction[0] || '',
  };
}

function buildSavingDecision(profileAnalysis) {
  const reassure = [];
  const friction = [];

  const { matelas, epargneProjet, epargneMoyen } = profileAnalysis.numbers;

  if (matelas !== null && matelas > 0) {
    reassure.push(`ton matelas de sécurité de ${euro(matelas)} protège ton équilibre`);
  }

  if (epargneMoyen !== null && epargneMoyen > 0) {
    reassure.push(`ton rythme d’épargne de ${euro(epargneMoyen)} par mois peut soutenir tes projets`);
  }

  if (epargneProjet !== null && epargneProjet <= 0) {
    friction.push('ton épargne disponible est encore entièrement absorbée par ta sécurité');
  }

  return {
    reassure: reassure.slice(0, 2),
    friction: friction[0] || '',
  };
}

function buildDefaultDecision(profileAnalysis) {
  return {
    reassure: profileAnalysis.profileInsights
      .slice(0, 2)
      .map((insight) => insight.message),
    friction: '',
  };
}

function buildDecisionInsights({ intent, profileAnalysis, budgetAnalysis, behaviorInsights, query }) {
  if (intent === 'simulateur_immobilier') {
    return buildRealEstateDecision(profileAnalysis, query);
  }

  if (intent === 'analyse_mensuelle') {
    return buildMonthlyDecision(budgetAnalysis, behaviorInsights);
  }

  if (intent === 'epargne') {
    return buildSavingDecision(profileAnalysis);
  }

  return buildDefaultDecision(profileAnalysis);
}

module.exports = {
  buildDecisionInsights,
};
