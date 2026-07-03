// src/pages/Aide.jsx
import { useState } from "react";
import { C, css } from "../design";
import { addDocument } from "../hooks/useFirestore";
import { useAuth } from "../AuthContext";
import PrivacyPolicyModal from "./PrivacyPolicy";

export default function PageAide({ profile }) {
  const [ouvert, setOuvert]       = useState(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [ticket, setTicket] = useState({ sujet:"", message:"", priorite:"normale" });
  const [envoye, setEnvoye] = useState(false);
  const [saving, setSaving] = useState(false);

  const faq = [
    { q:"Comment telecharger un document ?", r:"Va dans Ressources, trouve le document et appuie sur Telecharger." },
    { q:"Je ne vois pas mon emploi du temps ?", r:"Verifie que ta promotion est bien renseignee dans ton profil. L'Admin peut aussi inserer les donnees via Admin > Donnees demo." },
    { q:"Mon compte est en attente — pourquoi ?", r:"Tous les comptes sont valides par l'Admin Plateforme sous 24-48h apres inscription." },
    { q:"Comment postuler a une offre Alumni ?", r:"Dans Espace Alumni > Offres, clique sur l'offre qui t'interesse et appuie sur Postuler." },
    { q:"Comment modifier mon profil ?", r:"Va dans Mon Profil > Modifier. Tu peux changer ta bio et ta photo de profil." },
    { q:"Comment signaler un contenu inapproprie ?", r:"Contacte l'Admin via un ticket en indiquant le contenu concerne." },
    { q:"Comment publier dans le forum ?", r:"Va dans Espace Social, tape ton message dans la zone de texte et clique sur Publier." },
    { q:"J'ai oublie mon mot de passe ?", r:"Sur la page de connexion, clique sur Oublie ? et suis les instructions envoyees par email." },
  ];

  const envoyer = async () => {
    if (!ticket.sujet || !ticket.message) return;
    setSaving(true);
    await addDocument("tickets", {
      ...ticket,
      status: "open",
      auteur: profile?.name || "Anonyme",
      auteurUid: profile?.uid || "",
      auteurRole: profile?.role || "",
    });
    setEnvoye(true);
    setTicket({ sujet:"", message:"", priorite:"normale" });
    setSaving(false);
  };

  return (
    <div style={{ maxWidth:680, margin:"0 auto" }}>
      <div style={css.pageH}>Aide & Support</div>
      <div style={css.pageSub}>Centre d'aide ARSTM Campus · Reponse sous 24h</div>

      {/* Contacts rapides */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",
        gap:10, marginBottom:22 }}>
        {[
          ["✉️", "Email support", "support@arstm-campus.ci", C.blue],
          ["📞", "Scolarite ARSTM", "+225 27 22 XX XX XX", C.green],
          ["💬", "WhatsApp", "+225 07 XX XX XX XX", "#25d366"],
        ].map(([icon,label,val,color],i) => (
          <div key={i} style={{ ...css.cardSm, display:"flex", gap:10, alignItems:"center" }}>
            <div style={{ width:36, height:36, borderRadius:9, background:`${color}15`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"1rem", flexShrink:0 }}>{icon}</div>
            <div>
              <div style={{ fontSize:"0.73rem", color:C.muted }}>{label}</div>
              <div style={{ fontSize:"0.79rem", fontWeight:600, color }}>{val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <span style={{ ...css.label, display:"block" }}>Questions frequentes</span>
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:22 }}>
        {faq.map((f,i) => (
          <div key={i} style={{ ...css.card, cursor:"pointer", padding:"14px 16px",
            borderLeft:`3px solid ${ouvert===i?C.blue:"transparent"}` }}
            onClick={()=>setOuvert(ouvert===i?null:i)}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:"0.87rem", fontWeight:600, color:C.navy,
                flex:1, lineHeight:1.35 }}>{f.q}</span>
              <span style={{ color:ouvert===i?C.blue:C.muted, fontSize:"0.8rem",
                transition:"transform 0.2s",
                transform:ouvert===i?"rotate(180deg)":"rotate(0deg)" }}>▼</span>
            </div>
            {ouvert===i && (
              <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${C.border}`,
                fontSize:"0.85rem", lineHeight:1.7, color:C.mid }}>{f.r}</div>
            )}
          </div>
        ))}
      </div>

      {/* Formulaire ticket */}
      <span style={{ ...css.label, display:"block" }}>Envoyer un ticket de support</span>
      {envoye ? (
        <div style={{ ...css.card, background:C.greenLight, border:`1px solid ${C.greenBorder}`,
          textAlign:"center", padding:28 }}>
          <div style={{ fontSize:"2rem", marginBottom:8 }}>✅</div>
          <div style={{ fontWeight:700, color:C.green, marginBottom:4 }}>Ticket envoye !</div>
          <div style={{ fontSize:"0.84rem", color:C.mid, marginBottom:14 }}>
            Notre equipe vous repond sous 24h. Vous serez notifie par email.
          </div>
          <button style={css.btnSm} onClick={()=>setEnvoye(false)}>Nouveau ticket</button>
        </div>
      ) : (
        <div style={css.card}>
          <div style={{ display:"flex", gap:10, marginBottom:12, flexWrap:"wrap" }}>
            <div style={{ flex:2, minWidth:180 }}>
              <span style={css.label}>Sujet</span>
              <select style={css.input} value={ticket.sujet}
                onChange={e=>setTicket({...ticket,sujet:e.target.value})}>
                <option value="">Choisir un sujet...</option>
                {["Probleme technique","Compte & connexion","Emploi du temps",
                  "Document manquant","Contenu inapproprie","Autre"].map(s=>(
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div style={{ flex:1, minWidth:120 }}>
              <span style={css.label}>Priorite</span>
              <select style={css.input} value={ticket.priorite}
                onChange={e=>setTicket({...ticket,priorite:e.target.value})}>
                <option value="basse">Basse</option>
                <option value="normale">Normale</option>
                <option value="haute">Haute</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <span style={css.label}>Description du probleme</span>
            <textarea style={{ ...css.input, resize:"none", minHeight:100 }}
              placeholder="Decris ton probleme en detail..."
              value={ticket.message}
              onChange={e=>setTicket({...ticket,message:e.target.value})} />
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:"0.78rem", color:C.muted }}>
              Connecte en tant que <strong>{profile?.name}</strong>
            </div>
            <button style={{ ...css.btnPrimary,
              opacity:ticket.sujet&&ticket.message.trim()&&!saving?1:0.5 }}
              onClick={envoyer}
              disabled={saving||!ticket.sujet||!ticket.message.trim()}>
              {saving?"Envoi...":"Envoyer le ticket"}
            </button>
          </div>
        </div>
      )}

      {/* Politique de confidentialité */}
      {showPrivacy && <PrivacyPolicyModal onClose={() => setShowPrivacy(false)} />}
      <div style={{ marginTop:24, padding:"14px 18px", borderRadius:14, background:C.surfaceAlt, border:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontWeight:700, fontSize:"0.85rem", color:C.navy, marginBottom:2 }}>🔒 Politique de Confidentialité</div>
          <div style={{ fontSize:"0.76rem", color:C.muted }}>Version 1.0 · Loi n°2013-450 de Côte d'Ivoire (ARTCI)</div>
        </div>
        <button onClick={() => setShowPrivacy(true)} style={{ ...css.btnSm, borderRadius:20, color:C.blue, border:`1px solid ${C.blueBorder}`, background:C.blueLight, fontWeight:600 }}>
          Lire la politique →
        </button>
      </div>

      <div style={{ textAlign:"center", marginTop:16, fontSize:"0.75rem", color:C.muted }}>
        ARSTM Campus v2.0 · Firebase · 2026
      </div>
    </div>
  );
}