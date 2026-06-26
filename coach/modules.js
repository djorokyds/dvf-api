const modules = [
  {
    id: 'budget',
    name: 'Module budget',
    description:
      'Comprendre tes dépenses, organiser ton budget mensuel et identifier les postes à ajuster.',
  },
  {
    id: 'analyse_mensuelle',
    name: 'Analyse du mois',
    description:
      'Comprendre l’évolution de tes revenus, dépenses, épargne et catégories par rapport au mois précédent.',
  },
  {
    id: 'epargne',
    name: 'Module épargne',
    description:
      'Structurer ton matelas de sécurité et ton épargne disponible pour tes projets.',
  },
  {
    id: 'dettes',
    name: 'Module dettes',
    description:
      'Suivre tes crédits et arbitrer entre remboursement, épargne et nouveaux projets.',
  },
  {
    id: 'simulateur_immobilier',
    name: 'Simulateur immobilier',
    description:
      'Tester un achat, un apport, des frais de notaire, une mensualité ou un projet locatif.',
  },
  {
    id: 'capacite_emprunt',
    name: "Simulateur capacité d'emprunt",
    description:
      'Estimer combien tu peux emprunter selon tes revenus, tes charges et ton endettement.',
  },
  {
    id: 'formation_achat',
    name: 'Formation achat immobilier',
    description:
      'Comprendre les étapes d’un achat, le financement, la banque, le notaire et les frais.',
  },
  {
    id: 'formation_gestion',
    name: 'Formation gestion financière',
    description:
      'Renforcer tes bases financières et tes réflexes de gestion.',
  },
];

function getModuleById(id) {
  return (
    modules.find((module) => module.id === id) ||
    modules.find((module) => module.id === 'formation_gestion')
  );
}

module.exports = {
  modules,
  getModuleById,
};
