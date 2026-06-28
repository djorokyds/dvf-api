const { euro } = require('./profileEngine');

function findTransactionInfo(categoryLabel, transactionsByCategory = []) {
  return transactionsByCategory.find(
    (item) =>
      item.label &&
      categoryLabel &&
      item.label.toLowerCase() === categoryLabel.toLowerCase()
  );
}

function detectPattern(variationAmount, transactionCount) {
  if (variationAmount === null || variationAmount === undefined) {
    return null;
  }

  if (variationAmount < 0) {
    return 'maitrise';
  }

  if (transactionCount === null || transactionCount === undefined) {
    return 'hausse';
  }

  if (transactionCount <= 2) {
    return 'ponctuel';
  }

  if (transactionCount <= 8) {
    return 'mixte';
  }

  return 'habitude';
}

function buildBehaviorMessage(category, pattern, variationAmount, transactionCount) {
  const amount = euro(Math.abs(variationAmount));

  if (pattern === 'ponctuel') {
    return `La hausse de ${category} semble liée à une dépense ponctuelle de ${amount}, plutôt qu’à une nouvelle habitude.`;
  }

  if (pattern === 'mixte') {
    return `La hausse de ${category} mérite d’être regardée : elle peut venir de quelques dépenses répétées ou d’un choix ponctuel.`;
  }

  if (pattern === 'habitude') {
    return `La hausse de ${category} semble venir d’habitudes répétées, pas seulement d’un achat isolé.`;
  }

  if (pattern === 'maitrise') {
    return `${category} est mieux maîtrisé ce mois-ci avec une baisse de ${amount}.`;
  }

  return `${category} évolue ce mois-ci et mérite d’être observé.`;
}

function analyzeBehavior(budgetAnalysis) {
  const insights = [];

  const variations = budgetAnalysis.variationCategories || [];
  const transactions = budgetAnalysis.transactionsByCategory || [];

  variations.forEach((category) => {
    const transactionInfo = findTransactionInfo(category.label, transactions);
    const transactionCount =
      transactionInfo?.averageTransactions !== undefined
        ? transactionInfo.averageTransactions
        : null;

    const pattern = detectPattern(category.amount, transactionCount);

    if (!pattern) {
      return;
    }

    // On ignore les faibles variations pour éviter le bruit.
    if (Math.abs(category.amount) < 30) {
      return;
    }

    insights.push({
      category: category.label,
      variation: category.amount,
      transactions: transactionCount,
      pattern,
      priority:
        category.amount > 0
          ? Math.abs(category.amount) + (pattern === 'habitude' ? 50 : 0)
          : Math.abs(category.amount),
      message: buildBehaviorMessage(
        category.label,
        pattern,
        category.amount,
        transactionCount
      ),
    });
  });

  return insights.sort((a, b) => b.priority - a.priority);
}

module.exports = {
  analyzeBehavior,
};
