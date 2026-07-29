module.exports = async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  // Vérifie d'abord que les variables d'env existent
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({
      success: false,
      error: "Variables d'environnement manquantes",
      details: {
        SUPABASE_URL: SUPABASE_URL ? "défini" : "MANQUANT",
        SUPABASE_KEY: SUPABASE_KEY ? "défini" : "MANQUANT",
      },
    });
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/transactions?select=*&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const bodyText = await response.text();
      return res.status(500).json({
        success: false,
        error: "Erreur Supabase",
        status: response.status,
        statusText: response.statusText,
        body: bodyText,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Supabase ping OK",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
};
