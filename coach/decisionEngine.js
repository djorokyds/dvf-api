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

function buildRealEstateDecision(profileAnalysis, debtAnalysis, query) {
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

  if (debtAnalysis?.totalMensualites > 0 && debtAnalysis?.poidsMensualites !== null) {
    if (debtAnalysis.poidsMensualites >= 30) {
      friction.push(`tes crédits actuels pèsent déjà fortement dans ton budget et peuvent limiter ta capacité à financer un nouveau projet`);
    }
  }

  if (!friction.length && projectAmount && epargneProjet !== null) {
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

function buildDebtDecision(debtAnalysis) {
  const reassure = [];
  const friction = [];

  if (!debtAnalysis || !debtAnalysis.credits.length) {
    return {
      reassure: [],
      friction: 'aucun crédit n’a été renseigné pour analyser ton niveau d’engagement actuel',
    };
  }

  if (debtAnalysis.poidsMensualites !== null && debtAnalysis.poidsMensualites < 20) {
    reassure.push('tes crédits actuels laissent encore une marge de manœuvre financière');
  }

  if (debtAnalysis.mainCredit) {
    friction.push(
      `ton crédit ${debtAnalysis.mainCredit.type} est aujourd’hui l’engagement mensuel qui pèse le plus avec ${euro(debtAnalysis.mainCredit.mensualite)} par mois`
    );
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

function buildDecisionInsights({
  intent,
  profileAnalysis,
  budgetAnalysis,
  behaviorInsights,
  debtAnalysis,
  query,
}) {
  if (intent === 'simulateur_immobilier') {
    return buildRealEstateDecision(profileAnalysis, debtAnalysis, query);
  }

  if (intent === 'analyse_mensuelle') {
    return buildMonthlyDecision(budgetAnalysis, behaviorInsights);
  }

  if (intent === 'dettes') {
    return buildDebtDecision(debtAnalysis);
  }

  if (intent === 'epargne') {
    return buildSavingDecision(profileAnalysis);
  }

  return buildDefaultDecision(profileAnalysis);
}

module.exports = {
  buildDecisionInsights,
};
