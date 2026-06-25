module.exports = async function handler(req, res) {
  const {
    formationLevel,
    simulateurBourse,
    simulateurPer,
    simulateurImmo,
    moisEquilibres
  } = req.query;

  const level = parseInt(formationLevel) || 1;
  const bourse = simulateurBourse === 'true' || simulateurBourse === '1';
  const per = simulateurPer === 'true' || simulateurPer === '1';
  const immo = simulateurImmo === 'true' || simulateurImmo === '1';
  const mois = parseInt(moisEquilibres) || 0;

  // Discipline
  let disciplineLabel, disciplineColor, disciplinePhrase;
  if (mois === 0) {
    disciplineLabel = 'Novice'; disciplineColor = '#E74C3C';
    disciplinePhrase = 'Commencez par équilibrer votre premier mois.';
  } else if (mois <= 2) {
    disciplineLabel = 'Régulier'; disciplineColor = '#F39C12';
    disciplinePhrase = 'Vous prenez de bonnes habitudes. Continuez sur cette lancée.';
  } else if (mois <= 5) {
    disciplineLabel = 'Discipliné'; disciplineColor = '#F0D000';
    disciplinePhrase = 'Votre régularité commence à porter ses fruits.';
  } else if (mois <= 11) {
    disciplineLabel = 'Solide'; disciplineColor = '#C38F5A';
    disciplinePhrase = 'Votre discipline financière est un vrai atout patrimonial.';
  } else {
    disciplineLabel = 'Expert'; disciplineColor = '#27AE60';
    disciplinePhrase = 'Maîtrise totale. Vous êtes un modèle de rigueur financière.';
  }

  // Profil utilisateur
  const simCount = [bourse, per, immo].filter(Boolean).length;
  const formationPct = Math.round((level / 4) * 100);
  const simPct = Math.round((simCount / 3) * 100);
  const disciplinePct = Math.min(100, Math.round((mois / 12) * 100));
  const globalPct = Math.round((formationPct + simPct + disciplinePct) / 3);

  let profilLabel, profilColor;
  if (globalPct < 20) { profilLabel = 'Débutant'; profilColor = '#888'; }
  else if (globalPct < 40) { profilLabel = 'Gestionnaire'; profilColor = '#F39C12'; }
  else if (globalPct < 60) { profilLabel = 'Investisseur'; profilColor = '#C38F5A'; }
  else if (globalPct < 80) { profilLabel = 'Stratège'; profilColor = '#7B9DD9'; }
  else { profilLabel = 'Bâtisseur de patrimoine'; profilColor = '#27AE60'; }

  // Flamme — couleur selon globalPct
  let flameColor1, flameColor2, flameOpacity;
  if (globalPct < 25) { flameColor1 = '#444'; flameColor2 = '#333'; flameOpacity = 0.3; }
  else if (globalPct < 50) { flameColor1 = '#E8700A'; flameColor2 = '#C85A00'; flameOpacity = 0.6; }
  else if (globalPct < 75) { flameColor1 = '#FF8C00'; flameColor2 = '#E05500'; flameOpacity = 0.8; }
  else { flameColor1 = '#FFB347'; flameColor2 = '#FF6A00'; flameOpacity = 1.0; }

  // Prochaine étape
  let nextStep, nextIcon, nextCTA;
  const formationModules = ['Fondations', 'Sécurité', 'Investissement', 'Stratégie'];
  if (level < 4) {
    nextStep = `Module "${formationModules[level]}" à compléter`;
    nextIcon = '📚'; nextCTA = 'Accéder au module →';
  } else if (mois < 12) {
    if (mois === 0) { nextStep = 'Équilibrez votre premier mois'; nextCTA = 'Voir mon budget →'; }
    else if (mois <= 2) { nextStep = 'Atteindre 3 mois équilibrés'; nextCTA = 'Voir mon budget →'; }
    else if (mois <= 5) { nextStep = 'Atteindre 6 mois équilibrés'; nextCTA = 'Voir mon budget →'; }
    else { nextStep = 'Atteindre 12 mois équilibrés'; nextCTA = 'Voir mon budget →'; }
    nextIcon = '🎯'; nextCTA = nextCTA || 'Voir mon budget →';
  } else if (!bourse) {
    nextStep = 'Simuler votre premier investissement Bourse';
    nextIcon = '📈'; nextCTA = 'Lancer le simulateur →';
  } else if (!per) {
    nextStep = 'Découvrir le potentiel du PER';
    nextIcon = '🏦'; nextCTA = 'Lancer le simulateur →';
  } else if (!immo) {
    nextStep = 'Simuler votre projet immobilier';
    nextIcon = '🏠'; nextCTA = 'Lancer le simulateur →';
  } else {
    nextStep = null; nextIcon = '🏆'; nextCTA = null;
  }

  const formationItems = [
    { label: 'Fondations', done: level >= 1 },
    { label: 'Sécurité', done: level >= 2 },
    { label: 'Investissement', done: level >= 3 },
    { label: 'Stratégie', done: level >= 4 },
  ];

  const simItems = [
    { label: 'Bourse', done: bourse },
    { label: 'PER', done: per },
    { label: 'Immobilier', done: immo },
  ];

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Progression Fi-One</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: auto; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #1f1f1f;
      color: #eaeaea;
    }
    .card {
      background: #242424;
      border-bottom: 1px solid #2a2a2a;
      overflow: hidden;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px 10px;
      cursor: pointer;
      user-select: none;
      gap: 10px;
    }
    .header:active { background: #2a2a2a; }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }

    /* Flamme SVG */
    .flame-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex-shrink: 0;
      gap: 2px;
    }
    .flame-pct {
      font-size: 10px;
      font-weight: 700;
      color: ${flameOpacity > 0.5 ? flameColor1 : '#555'};
    }

    .header-text {}
    .header-title {
      font-size: 14px;
      font-weight: 600;
      color: #eaeaea;
      margin-bottom: 3px;
    }
    .profil-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 600;
      color: ${profilColor};
      background: ${profilColor}18;
      border: 1px solid ${profilColor}44;
      border-radius: 20px;
      padding: 2px 8px;
    }
    .chevron {
      font-size: 11px;
      color: #444;
      transition: transform 0.3s ease;
      flex-shrink: 0;
    }
    .chevron.open { transform: rotate(180deg); }

    /* Contenu */
    .content { max-height: 0; overflow: hidden; transition: max-height 0.4s ease; }
    .content.open { max-height: 700px; }
    .content-inner { padding: 8px 16px 16px; display: flex; flex-direction: column; gap: 14px; }

    /* Colonnes */
    .two-cols {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .section-title {
      font-size: 9px;
      font-weight: 700;
      color: #555;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }

    /* Items */
    .item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 0;
      font-size: 12px;
    }
    .item-check {
      width: 17px;
      height: 17px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      flex-shrink: 0;
    }
    .item-check.done {
      background: rgba(195,143,90,0.18);
      color: #C38F5A;
      border: 1px solid #C38F5A66;
    }
    .item-check.todo {
      background: #2e2e2e;
      color: #666;
      border: 1px solid #444;
    }
    .item-label.done { color: #ccc; font-weight: 500; }
    .item-label.todo { color: #777; }

    .sep { height: 1px; background: #2a2a2a; }

    /* Discipline */
    .discipline-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 5px;
    }
    .discipline-level { font-size: 13px; font-weight: 700; color: ${disciplineColor}; }
    .discipline-mois { font-size: 10px; color: #666; }
    .discipline-phrase { font-size: 11px; color: #666; font-style: italic; line-height: 1.4; margin-top: 5px; }
    .disc-bar-track { height: 4px; background: #2a2a2a; border-radius: 2px; overflow: hidden; }
    .disc-bar-fill { height: 100%; border-radius: 2px; background: ${disciplineColor}; width: ${disciplinePct}%; }

    /* Prochaine étape */
    .next-step {
      background: #1a1a1a;
      border-radius: 10px;
      padding: 12px 14px;
      border-left: 3px solid #C38F5A;
    }
    .next-label { font-size: 9px; color: #555; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 5px; }
    .next-row { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 10px; }
    .next-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
    .next-text { font-size: 13px; font-weight: 600; color: #eaeaea; line-height: 1.4; }
    .next-cta {
      display: inline-block;
      background: #C38F5A;
      color: #1a1a1a;
      font-size: 11px;
      font-weight: 700;
      padding: 7px 14px;
      border-radius: 8px;
      cursor: pointer;
      letter-spacing: 0.3px;
      width: 100%;
      text-align: center;
    }

    .congrats { text-align: center; padding: 8px 0; }
    .congrats-icon { font-size: 28px; margin-bottom: 6px; }
    .congrats-title { font-size: 14px; font-weight: 700; color: #C38F5A; margin-bottom: 4px; }
    .congrats-text { font-size: 11px; color: #666; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">

    <div class="header" id="header" onclick="togglePanel()">
      <div class="header-left">

        <!-- Flamme -->
        <div class="flame-wrap">
          <svg width="28" height="34" viewBox="0 0 28 34" fill="none">
            <defs>
              <radialGradient id="flameGlow" cx="50%" cy="80%" r="60%">
                <stop offset="0%" stop-color="${flameColor1}" stop-opacity="${flameOpacity}"/>
                <stop offset="100%" stop-color="${flameColor2}" stop-opacity="0"/>
              </radialGradient>
              <linearGradient id="flameGrad" x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stop-color="${flameColor1}" stop-opacity="${flameOpacity}"/>
                <stop offset="100%" stop-color="${flameColor2}" stop-opacity="${flameOpacity * 0.7}"/>
              </linearGradient>
            </defs>
            <!-- Lueur base -->
            ${flameOpacity > 0.4 ? `<ellipse cx="14" cy="30" rx="10" ry="4" fill="${flameColor1}" opacity="${flameOpacity * 0.3}"/>` : ''}
            <!-- Corps flamme -->
            <path d="M14 2 C14 2 20 8 20 14 C20 16 19 17 18 17 C19 13 16 10 14 8 C14 8 16 14 13 18 C12 19 11 19 10 18 C9 16 9 14 10 12 C8 14 7 17 8 20 C8 22 9 24 11 25 C8 24 6 21 6 18 C6 12 10 6 14 2Z"
              fill="url(#flameGrad)"
              ${flameOpacity > 0.6 ? `filter="url(#f1)"` : ''}
            />
            <!-- Coeur flamme (plus clair) -->
            ${flameOpacity > 0.5 ? `
            <path d="M14 10 C14 10 17 14 17 17 C17 19 16 20 15 20 C15 18 14 16 13 15 C13 17 12 19 12 20 C11 19 11 17 12 15 C11 16 10 18 10 19 C10 16 12 12 14 10Z"
              fill="${flameColor1}" opacity="${flameOpacity * 0.5}"/>
            ` : ''}
            <defs>
              <filter id="f1"><feGaussianBlur stdDeviation="1" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
          </svg>
          <div class="flame-pct">${globalPct}%</div>
        </div>

        <div class="header-text">
          <div class="header-title">Ma progression Fi-One</div>
          <span class="profil-badge">${profilLabel}</span>
        </div>
      </div>
      <div class="chevron" id="chevron">▼</div>
    </div>

    <!-- Contenu repliable -->
    <div class="content" id="content">
      <div class="content-inner">

        <!-- 2 colonnes : Formation + Outils -->
        <div class="two-cols">

          <div>
            <div class="section-title">Formation</div>
            ${formationItems.map(it => `
              <div class="item">
                <div class="item-check ${it.done ? 'done' : 'todo'}">${it.done ? '✓' : '○'}</div>
                <span class="item-label ${it.done ? 'done' : 'todo'}">${it.label}</span>
              </div>
            `).join('')}
          </div>

          <div>
            <div class="section-title">Outils découverts</div>
            ${simItems.map(it => `
              <div class="item">
                <div class="item-check ${it.done ? 'done' : 'todo'}">${it.done ? '✓' : '○'}</div>
                <span class="item-label ${it.done ? 'done' : 'todo'}">${it.label}</span>
              </div>
            `).join('')}
          </div>

        </div>

        <div class="sep"></div>

        <!-- Discipline -->
        <div>
          <div class="section-title">Discipline financière</div>
          <div class="discipline-header">
            <div class="discipline-level">${disciplineLabel}</div>
            <div class="discipline-mois">${mois} mois équilibré${mois > 1 ? 's' : ''}</div>
          </div>
          <div class="disc-bar-track">
            <div class="disc-bar-fill"></div>
          </div>
          <div class="discipline-phrase">${disciplinePhrase}</div>
        </div>

        <div class="sep"></div>

        <!-- Prochaine étape -->
        ${nextStep ? `
        <div class="next-step">
          <div class="next-label">Prochaine étape recommandée</div>
          <div class="next-row">
            <div class="next-icon">${nextIcon}</div>
            <div class="next-text">${nextStep}</div>
          </div>
          <div class="next-cta">${nextCTA}</div>
        </div>
        ` : `
        <div class="congrats">
          <div class="congrats-icon">🏆</div>
          <div class="congrats-title">Félicitations !</div>
          <div class="congrats-text">Vous avez complété l'ensemble<br>du parcours Fi-One.</div>
        </div>
        `}

      </div>
    </div>

  </div>

  <script>
    let isOpen = false;
    function togglePanel() {
      isOpen = !isOpen;
      document.getElementById('content').classList.toggle('open', isOpen);
      document.getElementById('chevron').classList.toggle('open', isOpen);
    }
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
};