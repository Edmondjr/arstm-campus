// src/pages/Profil.jsx
import { useState } from "react";
import { C, ROLES, css } from "../design";
import { updateDocument } from "../hooks/useFirestore";

export default function PageProfil({ profile, onLogout, setPage }) {
  const [editMode, setEditMode] = useState(false);
  const [bio, setBio]           = useState(profile?.bio || "");
  const [saving, setSaving]     = useState(false);

  const roleInfo = ROLES.find(r => r.id === profile?.role) || ROLES[0];
  const initials = profile?.avatar || profile?.name?.slice(0,2)?.toUpperCase() || "?";

  const statsMap = {
    etudiant:       [["📅","Cours suivis",42],[" 📚","Ressources DL",24],["💬","Posts",7],["💼","Offres vues",12]],
    enseignant:     [["📖","Cours déposés",18],["🎓","Étudiants",156],["📢","Annonces",5],["📋","Modules",3]],
    alumni:         [["💼","Offres publiées",3],["💡","Conseils",7],["⭐","Recommandations",4],["🤝","Mentorés",2]],
    administration: [["📢","Annonces",24],["👥","Comptes",342],["📁","Docs",67],["📅","EDT",8]],
    superadmin:     [["👥","Utilisateurs",284],["⏳","En attente",12],["🎫","Tickets",3],["⚡","Uptime","99.8%"]],
  };
  const stats = statsMap[profile?.role] || statsMap.etudiant;

  const saveBio = async () => {
    setSaving(true);
    await updateDocument("users", profile?.uid, { bio });
    setSaving(false);
    setEditMode(false);
  };

  return (
    <div style={{ maxWidth:680, margin:"0 auto" }}>
      <div style={css.pageH}>Mon Profil</div>
      <div style={css.pageSub}>{profile?.promo} · {roleInfo.label}</div>

      {/* Carte identité */}
      <div style={{ ...css.card, marginBottom:18 }}>
        <div style={{ display:"flex", gap:16, alignItems:"flex-start", flexWrap:"wrap" }}>
          <div style={{ width:70, height:70, borderRadius:"50%",
            background:`linear-gradient(135deg,${roleInfo.color},${C.aqua})`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:"1.5rem", fontWeight:800, color:"#fff", flexShrink:0 }}>
            {initials}
          </div>
          <div style={{ flex:1, minWidth:180 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1.15rem",
              color:C.navy, marginBottom:2 }}>{profile?.name}</div>
            <div style={{ fontSize:"0.83rem", color:roleInfo.color, fontWeight:600, marginBottom:6 }}>
              {profile?.email}
            </div>
            <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
              <span style={css.badge(roleInfo.bg, roleInfo.color)}>
                {roleInfo.icon} {roleInfo.label}
              </span>
              {profile?.promo && <span style={css.badge(C.blueLight, C.blue)}>{profile.promo}</span>}
            </div>
          </div>
          <button style={{ ...css.btnSecondary, fontSize:"0.8rem" }}
            onClick={()=>editMode ? saveBio() : setEditMode(true)}>
            {saving?"⏳":editMode?"✅ Sauvegarder":"✏️ Modifier"}
          </button>
        </div>

        <div style={css.divider} />
        <span style={css.label}>À propos</span>
        {editMode ? (
          <textarea style={{ ...css.input, resize:"none", minHeight:70 }}
            value={bio} onChange={e=>setBio(e.target.value)}
            placeholder="Présentez-vous en quelques mots..." />
        ) : (
          <p style={{ fontSize:"0.87rem", lineHeight:1.7, color:C.dark }}>
            {bio || `Compte ${roleInfo.label} — ${profile?.promo||""}`}
          </p>
        )}
      </div>

      {/* Stats */}
      <span style={{ ...css.label, display:"block" }}>Activité</span>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:18 }}>
        {stats.map(([icon,label,value],i) => (
          <div key={i} style={{ ...css.cardSm, display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:9, background:`${roleInfo.color}15`,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1rem", flexShrink:0 }}>
              {icon}
            </div>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1.2rem",
                color:roleInfo.color, lineHeight:1 }}>{value}</div>
              <div style={{ fontSize:"0.72rem", color:C.muted, marginTop:2 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Paramètres */}
      <span style={{ ...css.label, display:"block" }}>Paramètres</span>
      <div style={{ ...css.card, marginBottom:18 }}>
        {[["🔔","Notifications push","Activées"],["🌙","Thème","Clair"],
          ["🔒","Confidentialité","Promo uniquement"],["📧","Email",profile?.email||"—"]
        ].map(([icon,label,value],i,arr) => (
          <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"11px 0", borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span>{icon}</span>
              <span style={{ fontSize:"0.87rem", color:C.dark }}>{label}</span>
            </div>
            <span style={{ fontSize:"0.81rem", color:C.muted }}>{value} ›</span>
          </div>
        ))}
      </div>

      <button style={{ width:"100%", padding:"10px", borderRadius:9, background:C.redLight,
        color:C.red, border:`1px solid ${C.redBorder}`, fontWeight:600, fontSize:"0.88rem",
        cursor:"pointer", fontFamily:"inherit" }} onClick={onLogout}>
        🚪 Se déconnecter
      </button>
    </div>
  );
}
