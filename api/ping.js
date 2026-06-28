module.exports = async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

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
      return res.status(500).json({
        success: false,
        error: "Erreur Supabase",
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
    });
  }
};
