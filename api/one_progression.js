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

  // Discipline niveau
  let disciplineLabel, disciplineColor;
  if (mois === 0) { disciplineLabel = 'Novice'; disciplineColor = '#E74C3C'; }
  else if (mois <= 2) { disciplineLabel = 'Régulier'; disciplineColor = '#F39C12'; }
  else if (mois <= 5) { disciplineLabel = 'Discipliné'; disciplineColor = '#F0D000'; }
  else if (mois <= 11) { disciplineLabel = 'Solide'; disciplineColor = '#C38F5A'; }
  else { disciplineLabel = 'Expert'; disciplineColor = '#27AE60'; }

  // Progression globale
  const formationPct = Math.round((level / 4) * 100);
  const simCount = [bourse, per, immo].filter(Boolean).length;
  const simPct = Math.round((simCount / 3) * 100);
  const disciplinePct = Math.min(100, Math.round((mois / 12) * 100));
  const globalPct = Math.round((formationPct + simPct + disciplinePct) / 3);

  // Prochaine étape
  let nextStep, nextIcon;
  const formationModules = ['Fondations', 'Sécurité', 'Investissement', 'Stratégie'];
  if (level < 4) {
    nextStep = `Terminer le module ${formationModules[level]}`;
    nextIcon = '📚';
  } else if (mois < 12) {
    if (mois === 0) nextStep = 'Atteindre 1 mois équilibré';
    else if (mois <= 2) nextStep = 'Atteindre 3 mois équilibrés';
    else if (mois <= 5) nextStep = 'Atteindre 6 mois équilibrés';
    else nextStep = 'Atteindre 12 mois équilibrés';
    nextIcon = '🎯';
  } else if (!bourse) {
    nextStep = 'Découvrir le simulateur Bourse';
    nextIcon = '📈';
  } else if (!per) {
    nextStep = 'Découvrir le simulateur PER';
    nextIcon = '🏦';
  } else if (!immo) {
    nextStep = 'Découvrir le simulateur Immobilier';
    nextIcon = '🏠';
  } else {
    nextStep = null;
    nextIcon = '🏆';
  }

  // Formation items
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
      padding: 0;
    }

    /* Carte principale */
    .card {
      background: #242424;
      border-radius: 0;
      border-bottom: 1px solid #2a2a2a;
      overflow: hidden;
    }

    /* Header cliquable */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      cursor: pointer;
      user-select: none;
      gap: 12px;
    }
    .header:active { background: #2a2a2a; }

    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
    }
    .header-title {
      font-size: 14px;
      font-weight: 600;
      color: #eaeaea;
    }

    /* Mini progress ring */
    .mini-ring { flex-shrink: 0; }

    /* Chevron */
    .chevron {
      font-size: 12px;
      color: #555;
      transition: transform 0.3s ease;
      flex-shrink: 0;
    }
    .chevron.open { transform: rotate(180deg); }

    /* Barre progression globale */
    .global-bar-wrap {
      padding: 0 16px 12px;
    }
    .global-bar-track {
      height: 3px;
      background: #2a2a2a;
      border-radius: 2px;
      overflow: hidden;
    }
    .global-bar-fill {
      height: 100%;
      border-radius: 2px;
      background: linear-gradient(90deg, #C38F5A, #E8B87A);
      width: ${globalPct}%;
      transition: width 0.8s ease;
    }

    /* Contenu repliable */
    .content {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.4s ease;
    }
    .content.open { max-height: 600px; }

    .content-inner {
      padding: 4px 16px 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Section */
    .section-title {
      font-size: 10px;
      font-weight: 600;
      color: #555;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }

    /* Items formation / simulateurs */
    .items-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }
    .item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }
    .item-check {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      flex-shrink: 0;
    }
    .item-check.done {
      background: rgba(195,143,90,0.2);
      color: #C38F5A;
      border: 1px solid #C38F5A;
    }
    .item-check.todo {
      background: #2a2a2a;
      color: #444;
      border: 1px solid #333;
    }
    .item-label.done { color: #eaeaea; }
    .item-label.todo { color: #555; }

    /* Barre discipline */
    .discipline-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .discipline-level {
      font-size: 13px;
      font-weight: 700;
      color: ${disciplineColor};
    }
    .discipline-mois {
      font-size: 11px;
      color: #666;
    }
    .disc-bar-track {
      height: 5px;
      background: #2a2a2a;
      border-radius: 3px;
      overflow: hidden;
    }
    .disc-bar-fill {
      height: 100%;
      border-radius: 3px;
      background: ${disciplineColor};
      width: ${disciplinePct}%;
    }

    /* Prochaine étape */
    .next-step {
      background: #1a1a1a;
      border-radius: 10px;
      padding: 12px 14px;
      border-left: 3px solid #C38F5A;
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .next-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
    .next-content {}
    .next-label {
      font-size: 9px;
      color: #555;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 3px;
    }
    .next-text {
      font-size: 12px;
      font-weight: 600;
      color: #eaeaea;
      line-height: 1.4;
    }

    /* Félicitations */
    .congrats {
      text-align: center;
      padding: 8px 0;
    }
    .congrats-icon { font-size: 28px; margin-bottom: 6px; }
    .congrats-title { font-size: 14px; font-weight: 700; color: #C38F5A; margin-bottom: 4px; }
    .congrats-text { font-size: 11px; color: #666; line-height: 1.5; }

    /* Séparateur */
    .sep { height: 1px; background: #2a2a2a; }
  </style>
</head>
<body>
  <div class="card">

    <!-- Header cliquable -->
    <div class="header" id="header" onclick="togglePanel()">
      <div class="header-left">

        <!-- Mini ring SVG -->
        <svg class="mini-ring" width="32" height="32" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="13" fill="none" stroke="#2a2a2a" stroke-width="3"/>
          <circle cx="16" cy="16" r="13" fill="none" stroke="#C38F5A" stroke-width="3"
            stroke-dasharray="${Math.round(2 * Math.PI * 13 * globalPct / 100)} ${Math.round(2 * Math.PI * 13)}"
            stroke-dashoffset="${Math.round(2 * Math.PI * 13 * 0.25)}"
            stroke-linecap="round"
            transform="rotate(-90 16 16)"
          />
          <text x="16" y="20" text-anchor="middle" font-size="9" font-weight="700"
            fill="#C38F5A" font-family="-apple-system, sans-serif">${globalPct}%</text>
        </svg>

        <div>
          <div class="header-title">📈 Ma progression Fi-One</div>
        </div>
      </div>
      <div class="chevron" id="chevron">▼</div>
    </div>

    <!-- Barre fine sous le header -->
    <div class="global-bar-wrap">
      <div class="global-bar-track">
        <div class="global-bar-fill"></div>
      </div>
    </div>

    <!-- Contenu repliable -->
    <div class="content" id="content">
      <div class="content-inner">

        <!-- Formation -->
        <div>
          <div class="section-title">Formation</div>
          <div class="items-grid">
            ${formationItems.map(it => `
              <div class="item">
                <div class="item-check ${it.done ? 'done' : 'todo'}">${it.done ? '✓' : '○'}</div>
                <span class="item-label ${it.done ? 'done' : 'todo'}">${it.label}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="sep"></div>

        <!-- Simulateurs -->
        <div>
          <div class="section-title">Simulateurs</div>
          <div class="items-grid">
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
          <div class="discipline-row">
            <div class="discipline-level">${disciplineLabel}</div>
            <div class="discipline-mois">${mois} mois équilibré${mois > 1 ? 's' : ''}</div>
          </div>
          <div class="disc-bar-track">
            <div class="disc-bar-fill"></div>
          </div>
        </div>

        <div class="sep"></div>

        <!-- Prochaine étape -->
        ${nextStep ? `
        <div class="next-step">
          <div class="next-icon">${nextIcon}</div>
          <div class="next-content">
            <div class="next-label">Prochaine étape</div>
            <div class="next-text">${nextStep}</div>
          </div>
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
