// src/pages/Accueil.jsx
import { C, ROLES, css } from "../design";
import { useAnnonces, useEDT, useRessources, useOffres } from "../hooks/useFirestore";

export default function Accueil({ setPage, isMobile, profile }) {
  const role     = profile?.role || "etudiant";
  const roleInfo = ROLES.find(r=>r.id===role) || ROLES[0];

  const { data: annonces } = useAnnonces();
  const { edt }            = useEDT(profile?.promo);
  const { data: ressources } = useRessources();
  const { data: offres }   = useOffres();

  const urgent  = annonces.filter(a=>a.urgent);
  const jours   = Object.keys(edt);
  const today   = jours[0];
  const cours   = today ? edt[today] : [];

  const greetMap = {
    etudiant:       { emoji:"🎓", sub:"Prêt pour une nouvelle journée d'apprentissage ?" },
    enseignant:     { emoji:"📖", sub:"Vos cours et votre planning du jour" },
    alumni:         { emoji:"🏅", sub:"Bienvenue dans votre espace réseau ARSTM" },
    administration: { emoji:"🏫", sub:"Tableau de bord — Administration ARSTM" },
    superadmin:     { emoji:"⚙️", sub:"Tableau de bord — Administration Plateforme" },
  };
  const greet = greetMap[role] || greetMap.etudiant;

  return (
    <div>
      {/* Banner */}
      <div style={{ background:`linear-gradient(135deg,${C.navy},#1e3a5f)`,
        borderRadius:16, padding:isMobile?"16px 14px":"22px 26px", marginBottom:18 }}>
        <div style={{ marginBottom:12 }}>
          <div style={{ color:"rgba(255,255,255,0.5)", fontSize:"0.82rem", marginBottom:2 }}>
            Bonjour {greet.emoji}
          </div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800,
            fontSize:isMobile?"1.2rem":"1.5rem", color:"#fff", letterSpacing:"-0.02em" }}>
            {profile?.name}
          </div>
          <div style={{ color:"#67e8f9", fontSize:"0.8rem", marginTop:2 }}>{greet.sub}</div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {role==="etudiant" && [
            [cours.length,"Cours aujourd'hui","📅","#60a5fa"],
            [urgent.length,"Urgentes","🔴","#f87171"],
            [ressources.filter(r=>r.nouveau).length,"Nouveaux docs","📚","#4ade80"],
          ].map(([v,l,icon,color],i) => (
            <div key={i} style={{ background:`${color}18`, border:`1px solid ${color}30`,
              borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
              <div style={{ fontSize:"0.9rem" }}>{icon}</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1.3rem",
                color, lineHeight:1.1 }}>{v}</div>
              <div style={{ fontSize:"0.68rem", color:"rgba(255,255,255,0.5)", marginTop:1 }}>{l}</div>
            </div>
          ))}
          {role==="enseignant" && [
            [cours.length,"Cours à donner","📖","#4ade80"],
            [annonces.length,"Annonces","📢","#fbbf24"],
            [ressources.length,"Ressources","📚","#60a5fa"],
          ].map(([v,l,icon,color],i) => (
            <div key={i} style={{ background:`${color}18`, border:`1px solid ${color}30`,
              borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
              <div style={{ fontSize:"0.9rem" }}>{icon}</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1.3rem",
                color, lineHeight:1.1 }}>{v}</div>
              <div style={{ fontSize:"0.68rem", color:"rgba(255,255,255,0.5)", marginTop:1 }}>{l}</div>
            </div>
          ))}
          {role==="alumni" && [
            [offres.length,"Offres publiées","💼","#fbbf24"],
            [annonces.length,"Annonces","📢","#60a5fa"],
            [urgent.length,"Urgentes","🔴","#f87171"],
          ].map(([v,l,icon,color],i) => (
            <div key={i} style={{ background:`${color}18`, border:`1px solid ${color}30`,
              borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
              <div style={{ fontSize:"0.9rem" }}>{icon}</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1.3rem",
                color, lineHeight:1.1 }}>{v}</div>
              <div style={{ fontSize:"0.68rem", color:"rgba(255,255,255,0.5)", marginTop:1 }}>{l}</div>
            </div>
          ))}
          {(role==="administration"||role==="superadmin") && [
            [urgent.length,"Urgentes","🔴","#f87171"],
            [annonces.length,"Annonces","📢","#fbbf24"],
            [ressources.length,"Ressources","📚","#60a5fa"],
          ].map(([v,l,icon,color],i) => (
            <div key={i} style={{ background:`${color}18`, border:`1px solid ${color}30`,
              borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
              <div style={{ fontSize:"0.9rem" }}>{icon}</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1.3rem",
                color, lineHeight:1.1 }}>{v}</div>
              <div style={{ fontSize:"0.68rem", color:"rgba(255,255,255,0.5)", marginTop:1 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Grille */}
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:14 }}>

        {/* Annonces urgentes — tous */}
        <div style={css.card}>
          <span style={{ ...css.label, color:C.red, display:"block" }}>🔴 Annonces urgentes</span>
          {urgent.length === 0 && <div style={{ color:C.muted, fontSize:"0.84rem" }}>Aucune annonce urgente.</div>}
          {urgent.slice(0,3).map(a => (
            <div key={a.id} style={{ padding:"9px 0", borderBottom:`1px solid ${C.border}` }}>
              <span style={css.badge(C.redLight,C.red)}>{a.cat}</span>
              <div style={{ fontSize:"0.84rem", fontWeight:600, color:C.navy, marginTop:4, lineHeight:1.3 }}>{a.titre}</div>
              <div style={{ fontSize:"0.73rem", color:C.muted, marginTop:2 }}>
                {a.createdAt?.toDate?.()?.toLocaleDateString("fr-FR")||"Récent"}
              </div>
            </div>
          ))}
          <button style={{ ...css.btnSecondary, width:"100%", marginTop:12, fontSize:"0.82rem" }}
            onClick={()=>setPage("annonces")}>Toutes les annonces →</button>
        </div>

        {/* Prochain cours — étudiant & enseignant */}
        {(role==="etudiant"||role==="enseignant") && (
          <div style={css.card}>
            <span style={{ ...css.label, color:C.blue, display:"block" }}>⏱ Prochain cours</span>
            {cours.length === 0 ? (
              <div style={{ color:C.muted, fontSize:"0.84rem" }}>
                Aucun cours trouvé. <br/>
                <span style={{ fontSize:"0.78rem" }}>
                  L'Admin peut insérer les données via ⚙️ Admin → Données démo.
                </span>
              </div>
            ) : (
              <>
                <div style={{ borderLeft:`3px solid ${cours[0].color||C.blue}`, paddingLeft:12, marginBottom:10 }}>
                  <div style={css.h3}>{cours[0].matiere}</div>
                  <div style={{ color:C.mid, fontSize:"0.82rem", marginTop:3 }}>
                    🕐 {cours[0].heureDebut}–{cours[0].heureFin} · 📍 {cours[0].salle}
                  </div>
                </div>
                {cours.slice(1,3).map((c,i) => (
                  <div key={i} style={{ display:"flex", gap:8, alignItems:"center", padding:"6px 0",
                    borderTop:`1px solid ${C.border}` }}>
                    <div style={{ width:3, height:22, borderRadius:2, background:c.color||C.blue }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:"0.82rem", fontWeight:600, color:C.dark,
                        whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.matiere}</div>
                      <div style={{ fontSize:"0.72rem", color:C.muted }}>{c.heureDebut}–{c.heureFin}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
            <button style={{ ...css.btnSecondary, width:"100%", marginTop:12, fontSize:"0.82rem" }}
              onClick={()=>setPage("edt")}>Voir l'emploi du temps →</button>
          </div>
        )}

        {/* Ressources récentes — étudiant & enseignant */}
        {(role==="etudiant"||role==="enseignant") && (
          <div style={css.card}>
            <span style={{ ...css.label, color:C.green, display:"block" }}>📚 Ressources récentes</span>
            {ressources.slice(0,3).map(r => (
              <div key={r.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0",
                borderBottom:`1px solid ${C.border}` }}>
                <span style={css.badge(r.type==="PDF"?C.redLight:r.type==="PPT"?C.goldLight:C.blueLight,
                  r.type==="PDF"?C.red:r.type==="PPT"?C.gold:C.blue)}>{r.type}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:"0.82rem", fontWeight:500, color:C.dark,
                    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.titre}</div>
                  <div style={{ fontSize:"0.72rem", color:C.muted }}>{r.auteur}</div>
                </div>
              </div>
            ))}
            <button style={{ ...css.btnSecondary, width:"100%", marginTop:12, fontSize:"0.82rem" }}
              onClick={()=>setPage("ressources")}>Bibliothèque →</button>
          </div>
        )}

        {/* Offres alumni — étudiant */}
        {role==="etudiant" && (
          <div style={css.card}>
            <span style={{ ...css.label, color:C.gold, display:"block" }}>🎓 Offres Alumni récentes</span>
            {offres.slice(0,3).map(o => (
              <div key={o.id} style={{ padding:"7px 0", borderBottom:`1px solid ${C.border}` }}>
                <div style={{ fontSize:"0.83rem", fontWeight:600, color:C.navy, marginBottom:2,
                  whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{o.titre}</div>
                <div style={{ display:"flex", gap:7, alignItems:"center" }}>
                  <span style={{ fontSize:"0.75rem", color:C.mid }}>{o.ent}</span>
                  <span style={css.badge(o.type==="CDI"?C.greenLight:C.blueLight,
                    o.type==="CDI"?C.green:C.blue)}>{o.type}</span>
                </div>
              </div>
            ))}
            <button style={{ ...css.btnSecondary, width:"100%", marginTop:12, fontSize:"0.82rem" }}
              onClick={()=>setPage("alumni")}>Espace Alumni →</button>
          </div>
        )}

        {/* Offres publiées — alumni */}
        {role==="alumni" && (
          <div style={css.card}>
            <span style={{ ...css.label, color:C.gold, display:"block" }}>💼 Offres publiées</span>
            {offres.slice(0,3).map(o => (
              <div key={o.id} style={{ padding:"7px 0", borderBottom:`1px solid ${C.border}` }}>
                <div style={{ fontSize:"0.83rem", fontWeight:600, color:C.navy }}>{o.titre}</div>
                <div style={{ fontSize:"0.76rem", color:C.mid }}>{o.ent}</div>
              </div>
            ))}
            <button style={{ ...css.btnSecondary, width:"100%", marginTop:12, fontSize:"0.82rem" }}
              onClick={()=>setPage("alumni")}>Gérer mes offres →</button>
          </div>
        )}

        {/* Dernières annonces — administration */}
        {(role==="administration"||role==="superadmin") && (
          <div style={css.card}>
            <span style={{ ...css.label, color:C.purple, display:"block" }}>📢 Dernières annonces</span>
            {annonces.slice(0,3).map(a => (
              <div key={a.id} style={{ padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
                <div style={{ fontSize:"0.84rem", fontWeight:600, color:C.navy, lineHeight:1.3 }}>{a.titre}</div>
                <div style={{ fontSize:"0.73rem", color:C.muted, marginTop:2 }}>
                  {a.createdAt?.toDate?.()?.toLocaleDateString("fr-FR")||"Récent"}
                </div>
              </div>
            ))}
            <button style={{ ...css.btnSecondary, width:"100%", marginTop:12, fontSize:"0.82rem" }}
              onClick={()=>setPage("annonces")}>Gérer les annonces →</button>
          </div>
        )}
      </div>
    </div>
  );
}
