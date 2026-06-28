const { analyzeProfile } = require('./profileEngine');
const { analyzeBudget } = require('./budgetEngine');
const { analyzeBehavior } = require('./behaviorEngine');
const { buildDecisionInsights } = require('./decisionEngine');
const { buildRecommendation } = require('./recommendationEngine');

function detectIntent(query) {
  const text = `${query.objectif || ''} ${query.message || ''}`.toLowerCase();

  const hasMonthlyData =
    query.revenus ||
    query.depenses ||
    query.epargne ||
    query.variation_depenses ||
    query.variation_epargne ||
    query.autres_charges ||
    query.variation_categories ||
    query.nb_transactions ||
    query.depassement ||
    query.total_fixes ||
    query.total_autres;

  const asksMonthlyAnalysis =
    text.includes('analyse mon mois') ||
    text.includes('mois en cours') ||
    text.includes('ce mois') ||
    text.includes('bilan mensuel') ||
    text.includes('analyse mensuelle') ||
    text.includes('mois');

  if (asksMonthlyAnalysis && hasMonthlyData) return 'analyse_mensuelle';

  if (
    text.includes('mensualité') ||
    text.includes('capacité') ||
    text.includes('emprunter')
  ) {
    return 'capacite_emprunt';
  }

  if (
    text.includes('achat') ||
    text.includes('immobilier') ||
    text.includes('bien') ||
    text.includes('apport')
  ) {
    return 'simulateur_immobilier';
  }

  if (
    text.includes('dette') ||
    text.includes('crédit') ||
    text.includes('auto') ||
    text.includes('conso')
  ) {
    return 'dettes';
  }

  if (
    text.includes('épargne') ||
    text.includes('epargne') ||
    text.includes('matelas')
  ) {
    return 'epargne';
  }

  if (
    text.includes('budget') ||
    text.includes('dépense') ||
    text.includes('depense')
  ) {
    return 'budget';
  }

  return 'formation_gestion';
}

function buildCoachAnalysis(query) {
  const profileAnalysis = analyzeProfile(query);
  const budgetAnalysis = analyzeBudget(query);
  const behaviorInsights = analyzeBehavior(budgetAnalysis);
  const intent = detectIntent(query);

  const decisionInsights = buildDecisionInsights({
    intent,
    profileAnalysis,
    budgetAnalysis,
    behaviorInsights,
    query,
  });

  const recommendation = buildRecommendation({
    intent,
    budgetAnalysis,
    behaviorInsights,
  });

  return {
    profile: profileAnalysis.profile,
    numbers: profileAnalysis.numbers,

    monthly: budgetAnalysis,
    behaviorInsights,

    intent,

    profileInsights: profileAnalysis.profileInsights,
    budgetInsights: budgetAnalysis.budgetInsights,

    decisionInsights,

    relevantForces: decisionInsights.reassure,
    relevantVigilances: decisionInsights.friction
      ? [decisionInsights.friction]
      : [],

    module: recommendation.module,
    mission: recommendation.mission,
  };
}

module.exports = {
  buildCoachAnalysis,
};
