// src/pages/Aide.jsx
import { useState } from "react";
import { C, css } from "../design";
import { addDocument } from "../hooks/useFirestore";

export default function PageAide() {
  const [ouvert, setOuvert]   = useState(null);
  const [ticket, setTicket]   = useState({ sujet:"", message:"" });
  const [envoye, setEnvoye]   = useState(false);
  const [saving, setSaving]   = useState(false);

  const faq = [
    { q:"Comment télécharger un document ?", r:"Va dans Ressources, trouve le document et appuie sur ⬇ Télécharger." },
    { q:"Comment activer les notifications push ?", r:"Va dans Mon Profil → Paramètres → Notifications push." },
    { q:"Je ne vois pas mon emploi du temps ?", r:"L'Admin doit d'abord insérer les données via ⚙️ Admin → Données démo." },
    { q:"Comment postuler à une offre Alumni ?", r:"Dans Espace Alumni → Offres, clique sur l'offre et appuie sur Postuler." },
    { q:"Mon compte est en attente — pourquoi ?", r:"Tous les comptes sont validés par l'Admin Plateforme sous 24–48h." },
    { q:"Comment signaler un contenu inapproprié ?", r:"Appuie longuement sur le post puis sélectionne Signaler." },
  ];

  const envoyer = async () => {
    if (!ticket.sujet || !ticket.message) return;
    setSaving(true);
    await addDocument("tickets", { ...ticket, status:"open" });
    setEnvoye(true);
    setTicket({ sujet:"", message:"" });
    setSaving(false);
  };

  return (
    <div style={{ maxWidth:680, margin:"0 auto" }}>
      <div style={css.pageH}>Aide & Support</div>
      <div style={css.pageSub}>Centre d'aide ARSTM Campus · Réponse sous 24h</div>

      {/* Contacts */}
      <div style={{ display:"flex", gap:10, marginBottom:22, flexWrap:"wrap" }}>
        {[["✉️","Email support","support@arstm-campus.ci",C.blue],
          ["📞","Scolarité ARSTM","+225 27 22 XX XX XX",C.green],
          ["💬","WhatsApp","+225 07 XX XX XX XX","#25d366"]
        ].map(([icon,label,val,color],i) => (
          <div key={i} style={{ ...css.cardSm, flex:1, minWidth:150, display:"flex", gap:10, alignItems:"center" }}>
            <div style={{ width:36, height:36, borderRadius:9, background:`${color}15`,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1rem", flexShrink:0 }}>
              {icon}
            </div>
            <div>
              <div style={{ fontSize:"0.75rem", color:C.muted }}>{label}</div>
              <div style={{ fontSize:"0.81rem", fontWeight:600, color }}>{val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <span style={{ ...css.label, display:"block" }}>Questions fréquentes</span>
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:22 }}>
        {faq.map((f,i) => (
          <div key={i} style={{ ...css.card, cursor:"pointer", padding:"14px 16px" }}
            onClick={()=>setOuvert(ouvert===i?null:i)}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:"0.87rem", fontWeight:600, color:C.navy, flex:1, lineHeight:1.35 }}>
                {f.q}
              </span>
              <span style={{ color:C.muted, transition:"transform 0.2s",
                transform:ouvert===i?"rotate(180deg)":"rotate(0deg)" }}>▼</span>
            </div>
            {ouvert===i && (
              <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${C.border}`,
                fontSize:"0.85rem", lineHeight:1.7, color:C.mid }}>{f.r}</div>
            )}
          </div>
        ))}
      </div>

      {/* Ticket */}
      <span style={{ ...css.label, display:"block" }}>Envoyer un ticket</span>
      {envoye ? (
        <div style={{ ...css.card, background:C.greenLight, border:`1px solid ${C.greenBorder}`,
          textAlign:"center", padding:28 }}>
          <div style={{ fontSize:"2rem", marginBottom:8 }}>✅</div>
          <div style={{ fontWeight:700, color:C.green, marginBottom:4 }}>Ticket envoyé !</div>
          <div style={{ fontSize:"0.84rem", color:C.mid, marginBottom:14 }}>
            Notre équipe vous répond sous 24h.
          </div>
          <button style={css.btnSm} onClick={()=>setEnvoye(false)}>Nouveau ticket</button>
        </div>
      ) : (
        <div style={css.card}>
          <div style={{ marginBottom:12 }}>
            <span style={css.label}>Sujet</span>
            <select style={css.input} value={ticket.sujet} onChange={e=>setTicket({...ticket,sujet:e.target.value})}>
              <option value="">Choisir un sujet...</option>
              {["Problème technique","Compte & connexion","Emploi du temps","Document manquant","Autre"].map(s=>(
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom:14 }}>
            <span style={css.label}>Message</span>
            <textarea style={{ ...css.input, resize:"none", minHeight:90 }}
              placeholder="Décris ton problème..."
              value={ticket.message} onChange={e=>setTicket({...ticket,message:e.target.value})} />
          </div>
          <button style={{ ...css.btnPrimary,
            opacity:ticket.sujet&&ticket.message.trim()&&!saving?1:0.5 }}
            onClick={envoyer} disabled={saving||!ticket.sujet||!ticket.message.trim()}>
            {saving?"⏳ Envoi...":"📤 Envoyer le ticket"}
          </button>
        </div>
      )}

      <div style={{ textAlign:"center", marginTop:24, fontSize:"0.75rem", color:C.muted }}>
        ARSTM Campus v2.0 · Firebase · Mai 2026
      </div>
    </div>
  );
}
