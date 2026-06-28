const { getModuleById } = require('./modules');
const { euro } = require('./profileEngine');

function choosePriority(intent, { budgetAnalysis, behaviorInsights }) {
  if (intent === 'analyse_mensuelle') {
    const mainBehavior = behaviorInsights[0];

    if (mainBehavior && mainBehavior.variation > 0) {
      return {
        title: `Comprendre la hausse de ${mainBehavior.category}`,
        action: `Reprends les opérations de cette catégorie pour comprendre ce qui explique les +${euro(mainBehavior.variation)} du mois.`,
        why: `C’est le levier le plus concret pour comprendre ton budget sans réduire toutes tes dépenses au hasard.`,
      };
    }

    return {
      title: 'Comprendre l’équilibre du mois',
      action: 'Compare tes charges fixes, tes dépenses variables et ton épargne avec les repères Fi-One.',
      why: 'Cela permet d’identifier ce qui influence réellement ton budget.',
    };
  }

  if (intent === 'simulateur_immobilier') {
    return {
      title: 'Tester ton projet immobilier',
      action: 'Lance une simulation avec ton budget cible, ton apport mobilisable et deux durées de crédit.',
      why: 'Le simulateur permettra de vérifier si le projet reste confortable une fois la mensualité, les frais et le reste à vivre intégrés.',
    };
  }

  if (intent === 'capacite_emprunt') {
    return {
      title: 'Clarifier ta capacité d’emprunt',
      action: 'Simule ta capacité avec tes revenus, tes charges et ton endettement actuel.',
      why: 'Tu dois connaître ta limite confortable avant de chercher un projet.',
    };
  }

  if (intent === 'budget') {
    return {
      title: 'Identifier le vrai levier budgétaire',
      action: 'Repère la catégorie qui explique le plus l’évolution de tes dépenses.',
      why: 'Un bon ajustement commence par la cause principale, pas par une réduction générale.',
    };
  }

  if (intent === 'epargne') {
    return {
      title: 'Structurer ton épargne',
      action: 'Sépare clairement ton matelas de sécurité de l’épargne mobilisable pour tes projets.',
      why: 'Chaque euro doit avoir un rôle précis : sécurité, projet ou investissement.',
    };
  }

  if (intent === 'dettes') {
    return {
      title: 'Prioriser tes crédits',
      action: 'Liste tes crédits avec mensualité, taux et durée restante.',
      why: 'Cette vision permet d’arbitrer entre remboursement anticipé et construction d’épargne.',
    };
  }

  return {
    title: 'Clarifier la prochaine décision',
    action: 'Identifie la décision financière que tu veux prendre maintenant.',
    why: 'ONE Coach est plus utile lorsqu’il travaille sur une décision précise.',
  };
}

function chooseModule(intent) {
  return getModuleById(intent);
}

function buildRecommendation({ intent, budgetAnalysis, behaviorInsights }) {
  return {
    module: chooseModule(intent),
    mission: choosePriority(intent, {
      budgetAnalysis,
      behaviorInsights,
    }),
  };
}

module.exports = {
  buildRecommendation,
};
