// src/hooks/useAI.js
import { useState } from "react";

// ── Lecture du fichier selon son type ─────────────────────────────────────────
async function readFileContent(file) {
  // Images → Claude vision (base64)
  if (file.type.startsWith("image/")) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const b64 = e.target.result.split(",")[1];
        resolve({ isImage: true, base64: b64, mediaType: file.type || "image/jpeg" });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Excel → CSV via SheetJS
  if (/\.xlsx?$/i.test(file.name)) {
    const XLSX = await import("xlsx");
    const buf  = await file.arrayBuffer();
    const wb   = XLSX.read(buf, { type: "array" });
    const text = wb.SheetNames.map(name => {
      const ws = wb.Sheets[name];
      return `Feuille "${name}":\n${XLSX.utils.sheet_to_csv(ws)}`;
    }).join("\n\n");
    return { isImage: false, text };
  }

  // Tout le reste (PDF texte, TXT, CSV, DOCX lisible)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve({ isImage: false, text: e.target.result });
    reader.onerror = reject;
    reader.readAsText(file, "UTF-8");
  });
}

// ── Appel API Claude via le proxy serveur /api/ai ─────────────────────────────
// La clé Anthropic est stockée côté serveur (Vercel env var ANTHROPIC_KEY)
// et n'est jamais exposée dans le bundle JS client.
async function callClaude(content, system) {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erreur serveur HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

// ── Construction du message selon le type de fichier ──────────────────────────
function buildContent(fileData, textPrompt) {
  if (fileData.isImage) {
    return [
      { type: "image", source: { type: "base64", media_type: fileData.mediaType, data: fileData.base64 } },
      { type: "text", text: textPrompt },
    ];
  }
  return textPrompt + "\n\nContenu du fichier :\n" + fileData.text.slice(0, 12000);
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  // Extraire un emploi du temps → tableau de cours
  const parseSchedule = async (file) => {
    setLoading(true); setError(null);
    try {
      const fileData = await readFileContent(file);
      const prompt = `Analyse cet emploi du temps et extrait TOUS les cours visibles.
Réponds UNIQUEMENT avec un tableau JSON valide, sans texte ni markdown autour, au format EXACT :
[
  {
    "jour": "Lundi",
    "heureDebut": "08:00",
    "heureFin": "10:00",
    "matiere": "Nom de la matière",
    "salle": "Salle ou Amphi",
    "prof": "Nom du professeur",
    "promo": "Filière ou promo si visible"
  }
]
Si une information est absente, utilise une chaîne vide. Pour le jour, utilise le français (Lundi, Mardi…).`;
      const content = buildContent(fileData, prompt);
      const raw = await callClaude(content, "Tu extrais des données d'emplois du temps scolaires. Réponds UNIQUEMENT avec du JSON valide, sans markdown, sans explication.");
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("Réponse non valide — réessaie avec une image plus nette");
      return JSON.parse(match[0]);
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Extraire une offre d'emploi → objet de champs
  const parseJobOffer = async (file) => {
    setLoading(true); setError(null);
    try {
      const fileData = await readFileContent(file);
      const prompt = `Analyse cette offre d'emploi et extrait toutes les informations.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte ni markdown autour, au format EXACT :
{
  "titre": "Titre exact du poste",
  "ent": "Nom de l'entreprise",
  "type": "Stage ou CDI ou CDD ou Freelance",
  "lieu": "Ville, Pays",
  "secteur": "Secteur d'activité",
  "salaire": "Rémunération mentionnée ou vide",
  "niveauReq": "Bac+3 (Licence) ou Bac+5 (Master) etc., vide si non précisé",
  "deadline": "YYYY-MM-DD si mentionnée, sinon vide",
  "desc": "Description complète du poste et de l'entreprise",
  "missions": "Missions listées avec • au début de chaque ligne",
  "profil": "Profil recherché et compétences requises"
}`;
      const content = buildContent(fileData, prompt);
      const raw = await callClaude(content, "Tu extrais des offres d'emploi. Réponds UNIQUEMENT avec du JSON valide, sans markdown, sans explication.");
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Réponse non valide — réessaie avec un fichier différent");
      return JSON.parse(match[0]);
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { parseSchedule, parseJobOffer, loading, error };
}
