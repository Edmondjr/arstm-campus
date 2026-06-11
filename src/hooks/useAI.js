// src/hooks/useAI.js
import { useState } from "react";

const API_KEY = import.meta.env.VITE_ANTHROPIC_KEY;

export function useAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const improveText = async (text, context = "") => {
    if (!API_KEY) { setError("Clé API manquante"); return null; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          messages: [{
            role: "user",
            content: `Tu es un assistant de rédaction pour une plateforme scolaire universitaire francophone (ARSTM Campus). Améliore le texte suivant : rends-le plus clair, professionnel et engageant, tout en conservant le sens et le ton original. Réponds UNIQUEMENT avec le texte amélioré, sans explication ni préambule.${context ? `\n\nContexte : ${context}` : ""}\n\nTexte à améliorer :\n${text}`,
          }],
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.content?.[0]?.text || null;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { improveText, loading, error };
}
