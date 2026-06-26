const modules = [
  {
    id: 'budget',
    name: 'Module budget',
    description: 'Comprendre ses dépenses et reprendre le contrôle du budget mensuel.',
  },
  {
    id: 'epargne',
    name: 'Module épargne',
    description: 'Construire un apport, renforcer un matelas de sécurité ou structurer son épargne.',
  },
  {
    id: 'dettes',
    name: 'Module dettes',
    description: 'Suivre ses crédits, réduire son endettement et arbitrer entre dette et épargne.',
  },
  {
    id: 'simulateur_immobilier',
    name: 'Simulateur immobilier',
    description: 'Tester un achat, un apport, des frais de notaire, une mensualité ou un projet locatif.',
  },
  {
    id: 'capacite_emprunt',
    name: "Simulateur capacité d'emprunt",
    description: 'Estimer combien l’utilisateur peut emprunter selon ses revenus, charges et endettement.',
  },
  {
    id: 'formation_achat',
    name: 'Formation achat immobilier',
    description: 'Comprendre les étapes d’un achat, la banque, le notaire et les frais.',
  },
  {
    id: 'formation_gestion',
    name: 'Formation gestion financière',
    description: 'Renforcer les bases financières et les bons réflexes.',
  },
];

function getModuleById(id) {
  return modules.find((module) => module.id === id) || modules[0];
}

module.exports = {
  modules,
  getModuleById,
};
