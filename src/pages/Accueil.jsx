// src/pages/Accueil.jsx
import { C, ROLES, GRADIENTS, SHADOWS, css } from "../design";
import { useAnnonces, useEDT, useRessources, useOffres } from "../hooks/useFirestore";

const JOURS = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
const MOIS  = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

function getDateStr() {
  const d = new Date();
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

function StatCard({ icon, value, label, color, onClick }) {
  return (
    <div onClick={onClick} style={{
      background:`${color}18`, border:`1px solid ${color}30`,
      borderRadius:10, padding:"10px 8px", textAlign:"center",
      cursor: onClick ? "pointer" : "default",
      transition:"all 0.18s",
    }}
      onMouseEnter={e => { if(onClick) { e.currentTarget.style.background=`${color}28`; e.currentTarget.style.transform="translateY(-1px)"; }}}
      onMouseLeave={e => { e.currentTarget.style.background=`${color}18`; e.currentTarget.style.transform="none"; }}
    >
      <div style={{ fontSize:"0.9rem" }}>{icon}</div>
      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1.3rem", color, lineHeight:1.1 }}>{value}</div>
      <div style={{ fontSize:"0.68rem", color:"rgba(255,255,255,0.5)", marginTop:1 }}>{label}</div>
    </div>
  );
}

export default function Accueil({ setPage, isMobile, profile }) {
  const role     = profile?.role || "etudiant";
  const roleInfo = ROLES.find(r => r.id === role) || ROLES[0];

  const { data: annonces } = useAnnonces();
  const { edt }            = useEDT(profile?.promo);
  const { data: ressources } = useRessources();
  const { data: offres }   = useOffres();

  const urgent = annonces.filter(a => a.urgent);
  const jours  = Object.keys(edt);
  const today  = jours[0];
  const cours  = today ? edt[today] : [];

  const greeting = getGreeting();
  const dateStr  = getDateStr();

  const greetMap = {
    etudiant:       { emoji:"🎓", sub:"Prêt pour une nouvelle journée d'apprentissage ?" },
    enseignant:     { emoji:"📖", sub:"Vos cours et votre planning du jour" },
    alumni:         { emoji:"🏅", sub:"Bienvenue dans votre espace réseau ARSTM" },
    administration: { emoji:"🏫", sub:"Tableau de bord — Administration ARSTM" },
    superadmin:     { emoji:"⚙️", sub:"Tableau de bord — Administration Plateforme" },
  };
  const greet = greetMap[role] || greetMap.etudiant;

  const statsByRole = {
    etudiant: [
      { icon:"📅", value:cours.length,                          label:"Cours aujourd'hui", color:"#60a5fa", page:"edt" },
      { icon:"🔴", value:urgent.length,                         label:"Urgentes",          color:"#f87171", page:"annonces" },
      { icon:"📚", value:ressources.filter(r=>r.nouveau).length, label:"Nouveaux docs",     color:"#4ade80", page:"ressources" },
    ],
    enseignant: [
      { icon:"📖", value:cours.length,      label:"Cours à donner", color:"#4ade80", page:"edt" },
      { icon:"📢", value:annonces.length,   label:"Annonces",       color:"#fbbf24", page:"annonces" },
      { icon:"📚", value:ressources.length, label:"Ressources",     color:"#60a5fa", page:"ressources" },
    ],
    alumni: [
      { icon:"💼", value:offres.length,   label:"Offres publiées", color:"#fbbf24", page:"alumni" },
      { icon:"📢", value:annonces.length, label:"Annonces",        color:"#60a5fa", page:"annonces" },
      { icon:"🔴", value:urgent.length,   label:"Urgentes",        color:"#f87171", page:"annonces" },
    ],
  };
  const defaultStats = [
    { icon:"🔴", value:urgent.length,   label:"Urgentes",   color:"#f87171", page:"annonces" },
    { icon:"📢", value:annonces.length, label:"Annonces",   color:"#fbbf24", page:"annonces" },
    { icon:"📚", value:ressources.length, label:"Ressources", color:"#60a5fa", page:"ressources" },
  ];
  const stats = statsByRole[role] || defaultStats;

  return (
    <div>
      {/* ── BANNER ── */}
      <div style={{
        background: GRADIENTS.dark,
        borderRadius:16, padding:isMobile?"16px 14px":"22px 26px", marginBottom:18,
        boxShadow: SHADOWS.lg,
      }}>
        {/* Date */}
        <div style={{ color:"rgba(255,255,255,0.35)", fontSize:"0.72rem", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>
          {dateStr}
        </div>
        <div style={{ marginBottom:14 }}>
          <div style={{ color:"rgba(255,255,255,0.5)", fontSize:"0.82rem", marginBottom:2 }}>
            {greeting} {greet.emoji}
          </div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:isMobile?"1.25rem":"1.55rem", color:"#fff", letterSpacing:"-0.02em", lineHeight:1.15 }}>
            {profile?.name}
          </div>
          <div style={{ color:"#67e8f9", fontSize:"0.8rem", marginTop:4 }}>{greet.sub}</div>
        </div>

        {/* Role badge */}
        <div style={{ marginBottom:14 }}>
          <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:100, background:`${roleInfo.color}20`, border:`1px solid ${roleInfo.color}30`, fontSize:"0.75rem", fontWeight:600, color:roleInfo.color }}>
            {roleInfo.icon} {roleInfo.label}
            {profile?.promo && <span style={{ opacity:0.7 }}>· {profile.promo}</span>}
          </span>
        </div>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {stats.map((s, i) => (
            <StatCard key={i} icon={s.icon} value={s.value} label={s.label} color={s.color} onClick={() => setPage(s.page)} />
          ))}
        </div>
      </div>

      {/* ── GRILLE ── */}
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:14 }}>

        {/* Annonces urgentes */}
        <div style={css.card}>
          <span style={{ ...css.label, color:C.red, display:"block" }}>🔴 Annonces urgentes</span>
          {urgent.length === 0
            ? <div style={{ color:C.muted, fontSize:"0.84rem", padding:"8px 0" }}>Aucune annonce urgente.</div>
            : urgent.slice(0,3).map(a => (
              <div key={a.id} style={{ padding:"9px 0", borderBottom:`1px solid ${C.border}` }}>
                <span style={css.badge(C.redLight, C.red)}>{a.cat}</span>
                <div style={{ fontSize:"0.84rem", fontWeight:600, color:C.navy, marginTop:4, lineHeight:1.3 }}>{a.titre}</div>
                <div style={{ fontSize:"0.73rem", color:C.muted, marginTop:2 }}>
                  {a.createdAt?.toDate?.()?.toLocaleDateString("fr-FR") || "Récent"}
                </div>
              </div>
            ))
          }
          <button style={{ ...css.btnSecondary, width:"100%", marginTop:12, fontSize:"0.82rem" }}
            onClick={() => setPage("annonces")}>
            Toutes les annonces →
          </button>
        </div>

        {/* Prochain cours */}
        {(role==="etudiant" || role==="enseignant") && (
          <div style={css.card}>
            <span style={{ ...css.label, color:C.blue, display:"block" }}>⏱ Prochain cours</span>
            {cours.length === 0 ? (
              <div style={{ color:C.muted, fontSize:"0.84rem", lineHeight:1.6 }}>
                Aucun cours trouvé.<br/>
                <span style={{ fontSize:"0.78rem" }}>L'Admin peut insérer les données via ⚙️ Admin → Données démo.</span>
              </div>
            ) : (
              <>
                <div style={{ borderLeft:`3px solid ${cours[0].color||C.blue}`, paddingLeft:12, marginBottom:10 }}>
                  <div style={css.h3}>{cours[0].matiere}</div>
                  <div style={{ color:C.mid, fontSize:"0.82rem", marginTop:3 }}>
                    🕐 {cours[0].heureDebut}–{cours[0].heureFin} · 📍 {cours[0].salle}
                  </div>
                </div>
                {cours.slice(1,3).map((c, i) => (
                  <div key={i} style={{ display:"flex", gap:8, alignItems:"center", padding:"6px 0", borderTop:`1px solid ${C.border}` }}>
                    <div style={{ width:3, height:22, borderRadius:2, background:c.color||C.blue }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:"0.82rem", fontWeight:600, color:C.dark, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.matiere}</div>
                      <div style={{ fontSize:"0.72rem", color:C.muted }}>{c.heureDebut}–{c.heureFin}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
            <button style={{ ...css.btnSecondary, width:"100%", marginTop:12, fontSize:"0.82rem" }}
              onClick={() => setPage("edt")}>
              Voir l'emploi du temps →
            </button>
          </div>
        )}

        {/* Ressources récentes */}
        {(role==="etudiant" || role==="enseignant") && (
          <div style={css.card}>
            <span style={{ ...css.label, color:C.green, display:"block" }}>📚 Ressources récentes</span>
            {ressources.length === 0
              ? <div style={{ color:C.muted, fontSize:"0.84rem" }}>Aucune ressource disponible.</div>
              : ressources.slice(0,3).map(r => (
                <div key={r.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", borderBottom:`1px solid ${C.border}` }}>
                  <span style={css.badge(
                    r.type==="PDF"?C.redLight:r.type==="PPT"?C.goldLight:C.blueLight,
                    r.type==="PDF"?C.red:r.type==="PPT"?C.gold:C.blue
                  )}>{r.type}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:"0.82rem", fontWeight:500, color:C.dark, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.titre}</div>
                    <div style={{ fontSize:"0.72rem", color:C.muted }}>{r.auteur}</div>
                  </div>
                </div>
              ))
            }
            <button style={{ ...css.btnSecondary, width:"100%", marginTop:12, fontSize:"0.82rem" }}
              onClick={() => setPage("ressources")}>
              Bibliothèque →
            </button>
          </div>
        )}

        {/* Offres alumni — étudiant */}
        {role==="etudiant" && (
          <div style={css.card}>
            <span style={{ ...css.label, color:C.gold, display:"block" }}>🎓 Offres Alumni récentes</span>
            {offres.length === 0
              ? <div style={{ color:C.muted, fontSize:"0.84rem" }}>Aucune offre disponible.</div>
              : offres.slice(0,3).map(o => (
                <div key={o.id} style={{ padding:"7px 0", borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:"0.83rem", fontWeight:600, color:C.navy, marginBottom:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{o.titre}</div>
                  <div style={{ display:"flex", gap:7, alignItems:"center" }}>
                    <span style={{ fontSize:"0.75rem", color:C.mid }}>{o.ent}</span>
                    <span style={css.badge(o.type==="CDI"?C.greenLight:C.blueLight, o.type==="CDI"?C.green:C.blue)}>{o.type}</span>
                  </div>
                </div>
              ))
            }
            <button style={{ ...css.btnSecondary, width:"100%", marginTop:12, fontSize:"0.82rem" }}
              onClick={() => setPage("alumni")}>
              Espace Alumni →
            </button>
          </div>
        )}

        {/* Offres publiées — alumni */}
        {role==="alumni" && (
          <div style={css.card}>
            <span style={{ ...css.label, color:C.gold, display:"block" }}>💼 Offres publiées</span>
            {offres.length === 0
              ? <div style={{ color:C.muted, fontSize:"0.84rem" }}>Aucune offre pour l'instant.</div>
              : offres.slice(0,3).map(o => (
                <div key={o.id} style={{ padding:"7px 0", borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:"0.83rem", fontWeight:600, color:C.navy }}>{o.titre}</div>
                  <div style={{ fontSize:"0.76rem", color:C.mid }}>{o.ent}</div>
                </div>
              ))
            }
            <button style={{ ...css.btnSecondary, width:"100%", marginTop:12, fontSize:"0.82rem" }}
              onClick={() => setPage("alumni")}>
              Gérer mes offres →
            </button>
          </div>
        )}

        {/* Dernières annonces — administration / superadmin */}
        {(role==="administration" || role==="superadmin") && (
          <div style={css.card}>
            <span style={{ ...css.label, color:C.purple, display:"block" }}>📢 Dernières annonces</span>
            {annonces.length === 0
              ? <div style={{ color:C.muted, fontSize:"0.84rem" }}>Aucune annonce.</div>
              : annonces.slice(0,3).map(a => (
                <div key={a.id} style={{ padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:"0.84rem", fontWeight:600, color:C.navy, lineHeight:1.3 }}>{a.titre}</div>
                  <div style={{ fontSize:"0.73rem", color:C.muted, marginTop:2 }}>
                    {a.createdAt?.toDate?.()?.toLocaleDateString("fr-FR") || "Récent"}
                  </div>
                </div>
              ))
            }
            <button style={{ ...css.btnSecondary, width:"100%", marginTop:12, fontSize:"0.82rem" }}
              onClick={() => setPage("annonces")}>
              Gérer les annonces →
            </button>
          </div>
        )}

        {/* Quick actions */}
        <div style={{ ...css.card, background:`linear-gradient(135deg,${C.blueLight},#e0f2fe)` }}>
          <span style={{ ...css.label, color:C.blue, display:"block" }}>⚡ Actions rapides</span>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {role==="etudiant" && <>
              <button style={{ ...css.btnSm, textAlign:"left", padding:"9px 12px", borderRadius:9, fontSize:"0.82rem" }} onClick={() => setPage("annonces")}>📢 Voir les annonces</button>
              <button style={{ ...css.btnSm, textAlign:"left", padding:"9px 12px", borderRadius:9, fontSize:"0.82rem" }} onClick={() => setPage("ressources")}>📚 Télécharger des cours</button>
              <button style={{ ...css.btnSm, textAlign:"left", padding:"9px 12px", borderRadius:9, fontSize:"0.82rem" }} onClick={() => setPage("social")}>💬 Espace Social</button>
            </>}
            {role==="enseignant" && <>
              <button style={{ ...css.btnSm, textAlign:"left", padding:"9px 12px", borderRadius:9, fontSize:"0.82rem" }} onClick={() => setPage("ressources")}>📤 Déposer un cours</button>
              <button style={{ ...css.btnSm, textAlign:"left", padding:"9px 12px", borderRadius:9, fontSize:"0.82rem" }} onClick={() => setPage("annonces")}>📢 Publier une annonce</button>
              <button style={{ ...css.btnSm, textAlign:"left", padding:"9px 12px", borderRadius:9, fontSize:"0.82rem" }} onClick={() => setPage("social")}>💬 Communauté</button>
            </>}
            {role==="alumni" && <>
              <button style={{ ...css.btnSm, textAlign:"left", padding:"9px 12px", borderRadius:9, fontSize:"0.82rem" }} onClick={() => setPage("alumni")}>💼 Publier une offre</button>
              <button style={{ ...css.btnSm, textAlign:"left", padding:"9px 12px", borderRadius:9, fontSize:"0.82rem" }} onClick={() => setPage("social")}>💬 Social ARSTM</button>
              <button style={{ ...css.btnSm, textAlign:"left", padding:"9px 12px", borderRadius:9, fontSize:"0.82rem" }} onClick={() => setPage("profil")}>👤 Mon profil</button>
            </>}
            {(role==="administration" || role==="superadmin") && <>
              <button style={{ ...css.btnSm, textAlign:"left", padding:"9px 12px", borderRadius:9, fontSize:"0.82rem" }} onClick={() => setPage("annonces")}>📢 Créer une annonce</button>
              <button style={{ ...css.btnSm, textAlign:"left", padding:"9px 12px", borderRadius:9, fontSize:"0.82rem" }} onClick={() => setPage("edt")}>📅 Gérer le planning</button>
              {role==="superadmin" && <button style={{ ...css.btnSm, textAlign:"left", padding:"9px 12px", borderRadius:9, fontSize:"0.82rem" }} onClick={() => setPage("admin")}>⚙️ Panel Admin</button>}
            </>}
          </div>
        </div>

      </div>
    </div>
  );
}
