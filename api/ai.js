// Vercel Serverless Function — proxy sécurisé vers l'API Anthropic
// La clé ANTHROPIC_KEY est stockée côté serveur (variable d'env Vercel, sans préfixe VITE_)
// et n'est jamais exposée dans le bundle JS client.

const ALLOWED_MODELS = ["claude-haiku-4-5-20251001", "claude-sonnet-4-5"];
const MAX_TOKENS_LIMIT = 8192;

export default async function handler(req, res) {
  // Méthode uniquement POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Clé serveur uniquement — sans préfixe VITE_
  const apiKey = process.env.ANTHROPIC_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_KEY non configurée côté serveur" });
  }

  // Validation du payload entrant
  const { model, max_tokens, system, messages } = req.body || {};

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Paramètre messages manquant ou invalide" });
  }
  if (!ALLOWED_MODELS.includes(model)) {
    return res.status(400).json({ error: `Modèle non autorisé : ${model}` });
  }
  if (typeof max_tokens !== "number" || max_tokens > MAX_TOKENS_LIMIT) {
    return res.status(400).json({ error: `max_tokens invalide (max ${MAX_TOKENS_LIMIT})` });
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, max_tokens, system, messages }),
    });

    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: "Erreur lors de la connexion à l'API Anthropic" });
  }
}
