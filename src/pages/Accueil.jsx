// src/pages/Accueil.jsx
import { useState } from "react";
import { C, ROLES, GRADIENTS, SHADOWS, css } from "../design";
import { useAnnonces, useEDT, useRessources, useOffres, usePosts, addDocument, updateDocument, useCollection } from "../hooks/useFirestore";
import { useAuth } from "../AuthContext";

const JOURS = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
const MOIS  = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
const REACTIONS = ["❤️","👍","🔥","🙏","😂","😮","🎉","💯"];

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

const getRoleInfo = r => ROLES.find(x => x.id === r) || { color:C.blue, bg:C.blueLight, icon:"👤", label:r };

function StatPill({ icon, value, label, color, onClick }) {
  return (
    <div onClick={onClick} style={{
      background:`${color}18`, border:`1px solid ${color}30`,
      borderRadius:10, padding:"10px 8px", textAlign:"center",
      cursor:onClick?"pointer":"default", transition:"all 0.18s",
    }}
      onMouseEnter={e => { if(onClick){ e.currentTarget.style.background=`${color}28`; e.currentTarget.style.transform="translateY(-1px)"; }}}
      onMouseLeave={e => { e.currentTarget.style.background=`${color}18`; e.currentTarget.style.transform="none"; }}>
      <div style={{ fontSize:"0.9rem" }}>{icon}</div>
      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1.3rem", color, lineHeight:1.1 }}>{value}</div>
      <div style={{ fontSize:"0.68rem", color:"rgba(255,255,255,0.5)", marginTop:1 }}>{label}</div>
    </div>
  );
}

function FeedPost({ p, uid, onReact }) {
  const [showReactions, setShowReactions] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const r = getRoleInfo(p.role);
  const reactions = p.reactions || {};
  const total = Object.values(reactions).reduce((s, a) => s + a.length, 0);
  const userReaction = REACTIONS.find(e => (reactions[e]||[]).includes(uid));
  const isLong = p.texte?.length > 200;
  const text = isLong && !expanded ? p.texte.slice(0,200)+"…" : p.texte;

  return (
    <div style={{ ...css.card, marginBottom:12 }}>
      <div style={{ display:"flex", gap:10, marginBottom:10 }}>
        <div style={{ width:40, height:40, borderRadius:"50%", background:p.photoURL?"transparent":r.bg,
          color:r.color, display:"flex", alignItems:"center", justifyContent:"center",
          fontWeight:700, fontSize:"0.85rem", flexShrink:0, overflow:"hidden", border:`2px solid ${r.color}20` }}>
          {p.photoURL ? <img src={p.photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : (p.avatar||p.auteur?.slice(0,2))}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontWeight:700, fontSize:"0.9rem", color:C.navy }}>{p.auteur}</span>
            <span style={{ fontSize:"0.72rem", color:C.muted }}>
              {p.createdAt?.toDate?.()?.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})||""}
            </span>
          </div>
          <div style={{ display:"flex", gap:5, marginTop:3, flexWrap:"wrap" }}>
            <span style={{ ...css.badge(r.bg,r.color), fontSize:"0.68rem" }}>{r.icon} {p.role}</span>
            {p.promo && <span style={{ ...css.badge(C.surfaceAlt,C.mid), fontSize:"0.68rem" }}>{p.promo}</span>}
          </div>
        </div>
      </div>
      <p style={{ fontSize:"0.88rem", lineHeight:1.7, color:C.dark, marginBottom:isLong?4:12 }}>{text}</p>
      {isLong && (
        <button onClick={() => setExpanded(!expanded)} style={{ background:"none", border:"none", color:C.blue, fontSize:"0.82rem", cursor:"pointer", padding:"0 0 10px", fontFamily:"inherit" }}>
          {expanded ? "Voir moins ▲" : "Voir plus ▼"}
        </button>
      )}
      {total > 0 && (
        <div style={{ display:"flex", gap:4, marginBottom:8, flexWrap:"wrap" }}>
          {REACTIONS.filter(e => (reactions[e]||[]).length > 0).map(e => (
            <span key={e} style={{ fontSize:"0.78rem", background:C.surfaceAlt, borderRadius:100, padding:"2px 8px" }}>{e} {reactions[e].length}</span>
          ))}
        </div>
      )}
      <div style={{ height:1, background:C.border, margin:"0 0 10px" }}/>
      <div style={{ position:"relative" }}>
        <button onClick={() => setShowReactions(!showReactions)} style={{
          background:"none", border:"none", cursor:"pointer", color:userReaction?C.red:C.muted,
          fontSize:"0.84rem", padding:0, display:"flex", alignItems:"center", gap:5, fontFamily:"inherit" }}>
          {userReaction || "🤍"} {total > 0 ? total : "Réagir"}
        </button>
        {showReactions && (
          <div style={{ position:"absolute", bottom:"calc(100% + 6px)", left:0, zIndex:100,
            background:"#fff", borderRadius:14, boxShadow:"0 4px 24px rgba(0,0,0,0.18)",
            border:`1px solid ${C.border}`, padding:"6px 8px", display:"flex", gap:4 }}>
            {REACTIONS.map(e => (
              <button key={e} onClick={() => { onReact(p, e); setShowReactions(false); }}
                style={{ background:"none", border:"none", cursor:"pointer", fontSize:"1.1rem", padding:"4px", borderRadius:8,
                  transform:(reactions[e]||[]).includes(uid)?"scale(1.3)":"scale(1)" }}>{e}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Accueil({ setPage, isMobile, profile }) {
  const { user } = useAuth();
  const role     = profile?.role || "etudiant";
  const roleInfo = getRoleInfo(role);

  const { data: annonces } = useAnnonces();
  const { edt }            = useEDT(profile?.promo);
  const { data: ressources } = useRessources();
  const { data: offres }   = useOffres();
  const { data: posts }    = usePosts();
  const { data: allUsers } = useCollection("users", []);

  const [newText, setNew] = useState("");
  const [saving, setSaving] = useState(false);

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
      { icon:"📅", value:cours.length, label:"Cours aujourd'hui", color:"#60a5fa", page:"edt" },
      { icon:"🔴", value:urgent.length, label:"Urgentes", color:"#f87171", page:"annonces" },
      { icon:"📚", value:ressources.filter(r=>r.nouveau).length, label:"Nouveaux docs", color:"#4ade80", page:"ressources" },
    ],
    enseignant: [
      { icon:"📖", value:cours.length, label:"Cours à donner", color:"#4ade80", page:"edt" },
      { icon:"📢", value:annonces.length, label:"Annonces", color:"#fbbf24", page:"annonces" },
      { icon:"📚", value:ressources.length, label:"Ressources", color:"#60a5fa", page:"ressources" },
    ],
    alumni: [
      { icon:"💼", value:offres.length, label:"Offres publiées", color:"#fbbf24", page:"alumni" },
      { icon:"📢", value:annonces.length, label:"Annonces", color:"#60a5fa", page:"annonces" },
      { icon:"🔴", value:urgent.length, label:"Urgentes", color:"#f87171", page:"annonces" },
    ],
  };
  const defaultStats = [
    { icon:"🔴", value:urgent.length, label:"Urgentes", color:"#f87171", page:"annonces" },
    { icon:"📢", value:annonces.length, label:"Annonces", color:"#fbbf24", page:"annonces" },
    { icon:"📚", value:ressources.length, label:"Ressources", color:"#60a5fa", page:"ressources" },
  ];
  const stats = statsByRole[role] || defaultStats;

  const publish = async () => {
    if (!newText.trim()) return;
    setSaving(true);
    await addDocument("posts", {
      auteur:    profile.name,
      auteurUid: user?.uid,
      avatar:    profile.avatar || profile.name?.slice(0,2),
      photoURL:  profile.photoURL || null,
      role:      profile.role,
      promo:     profile.promo,
      texte:     newText,
      likes:     [],
      reactions: {},
      comments:  [],
    });
    setNew(""); setSaving(false);
  };

  const react = async (post, emoji) => {
    const uid = user?.uid;
    if (!uid) return;
    const reactions = post.reactions || {};
    const curr = reactions[emoji] || [];
    const has = curr.includes(uid);
    await updateDocument("posts", post.id, { reactions: { ...reactions, [emoji]: has ? curr.filter(id=>id!==uid) : [...curr, uid] } });
  };

  // Suggestions: other approved users (not me)
  const suggestions = allUsers.filter(u => u.status === "approved" && u.uid !== user?.uid).slice(0, 4);

  // ── Banner (full-width, on top) ──
  const Banner = (
    <div style={{ background:GRADIENTS.dark, borderRadius:16, padding:isMobile?"16px 14px":"22px 26px", marginBottom:18, boxShadow:SHADOWS.lg }}>
      <div style={{ color:"rgba(255,255,255,0.35)", fontSize:"0.72rem", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>{dateStr}</div>
      <div style={{ marginBottom:14 }}>
        <div style={{ color:"rgba(255,255,255,0.5)", fontSize:"0.82rem", marginBottom:2 }}>{greeting} {greet.emoji}</div>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:isMobile?"1.25rem":"1.55rem", color:"#fff", letterSpacing:"-0.02em", lineHeight:1.15 }}>{profile?.name}</div>
        <div style={{ color:"#67e8f9", fontSize:"0.8rem", marginTop:4 }}>{greet.sub}</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
        {stats.map((s, i) => <StatPill key={i} {...s} onClick={() => setPage(s.page)} />)}
      </div>
    </div>
  );

  // ── Left column: profile card + quick actions ──
  const LeftCol = (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ ...css.card, padding:0, overflow:"hidden" }}>
        <div style={{ height:60, background:`linear-gradient(135deg,${roleInfo.color},${C.aqua})` }}/>
        <div style={{ padding:"0 16px 16px", textAlign:"center", marginTop:-32 }}>
          <div onClick={() => setPage("profil")} style={{ width:64, height:64, borderRadius:"50%", margin:"0 auto 10px",
            background:profile.photoURL?"transparent":roleInfo.bg, color:roleInfo.color,
            display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:"1.3rem",
            overflow:"hidden", border:"4px solid #fff", boxShadow:"0 4px 12px rgba(0,0,0,0.12)", cursor:"pointer" }}>
            {profile.photoURL ? <img src={profile.photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : (profile.avatar||profile.name?.slice(0,2))}
          </div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1rem", color:C.navy }}>{profile?.name}</div>
          <div style={{ marginTop:6 }}>
            <span style={{ ...css.badge(roleInfo.bg, roleInfo.color), fontWeight:700 }}>{roleInfo.icon} {roleInfo.label}</span>
          </div>
          {profile?.promo && <div style={{ fontSize:"0.76rem", color:C.muted, marginTop:6 }}>{profile.promo}</div>}
          <button style={{ ...css.btnSecondary, width:"100%", marginTop:12, fontSize:"0.82rem" }} onClick={() => setPage("profil")}>
            Voir mon profil →
          </button>
        </div>
      </div>

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
  );

  // ── Center column: feed ──
  const CenterCol = (
    <div>
      <div style={{ ...css.card, marginBottom:14 }}>
        <div style={{ display:"flex", gap:10, marginBottom:12 }}>
          <div style={{ width:38, height:38, borderRadius:"50%", background:profile.photoURL?"transparent":roleInfo.bg,
            color:roleInfo.color, display:"flex", alignItems:"center", justifyContent:"center",
            fontWeight:700, fontSize:"0.82rem", flexShrink:0, overflow:"hidden", border:`2px solid ${roleInfo.color}20` }}>
            {profile.photoURL ? <img src={profile.photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : (profile.avatar||profile.name?.slice(0,2))}
          </div>
          <textarea style={{ ...css.input, resize:"none", minHeight:60, flex:1, borderRadius:12 }}
            placeholder="Partagez quelque chose avec la communauté…"
            value={newText} onChange={e => setNew(e.target.value)}/>
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end" }}>
          <button style={{ ...css.btnPrimary, opacity:saving||!newText.trim()?0.6:1, borderRadius:20 }}
            onClick={publish} disabled={saving||!newText.trim()}>
            {saving ? "Envoi…" : "Publier →"}
          </button>
        </div>
      </div>

      {posts.length === 0 ? (
        <div style={{ ...css.card, textAlign:"center", padding:40, color:C.muted }}>
          <div style={{ fontSize:"2.2rem", marginBottom:10 }}>💬</div>
          <div style={{ fontWeight:600, color:C.navy, marginBottom:4 }}>Aucune publication</div>
          <div style={{ fontSize:"0.84rem" }}>Soyez le premier à partager quelque chose !</div>
        </div>
      ) : posts.map(p => <FeedPost key={p.id} p={p} uid={user?.uid} onReact={react} />)}
    </div>
  );

  // ── Right column: urgent, schedule, suggestions ──
  const RightCol = (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={css.card}>
        <span style={{ ...css.label, color:C.red, display:"block" }}>🔴 Annonces urgentes</span>
        {urgent.length === 0
          ? <div style={{ color:C.muted, fontSize:"0.84rem", padding:"8px 0" }}>Aucune annonce urgente.</div>
          : urgent.slice(0,3).map(a => (
            <div key={a.id} style={{ padding:"9px 0", borderBottom:`1px solid ${C.border}` }}>
              <span style={css.badge(C.redLight, C.red)}>{a.cat}</span>
              <div style={{ fontSize:"0.84rem", fontWeight:600, color:C.navy, marginTop:4, lineHeight:1.3 }}>{a.titre}</div>
            </div>
          ))}
        <button style={{ ...css.btnSecondary, width:"100%", marginTop:12, fontSize:"0.82rem" }} onClick={() => setPage("annonces")}>Toutes les annonces →</button>
      </div>

      {(role==="etudiant" || role==="enseignant") && (
        <div style={css.card}>
          <span style={{ ...css.label, color:C.blue, display:"block" }}>⏱ Prochains cours</span>
          {cours.length === 0
            ? <div style={{ color:C.muted, fontSize:"0.84rem" }}>Aucun cours trouvé.</div>
            : cours.slice(0,3).map((c, i) => (
              <div key={i} style={{ display:"flex", gap:8, alignItems:"center", padding:"7px 0", borderBottom:`1px solid ${C.border}` }}>
                <div style={{ width:3, height:24, borderRadius:2, background:c.color||C.blue }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:"0.82rem", fontWeight:600, color:C.dark, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.matiere}</div>
                  <div style={{ fontSize:"0.72rem", color:C.muted }}>{c.heureDebut}–{c.heureFin} · {c.salle}</div>
                </div>
              </div>
            ))}
          <button style={{ ...css.btnSecondary, width:"100%", marginTop:12, fontSize:"0.82rem" }} onClick={() => setPage("edt")}>Emploi du temps →</button>
        </div>
      )}

      <div style={css.card}>
        <span style={{ ...css.label, color:C.green, display:"block" }}>🌐 Suggestions de réseau</span>
        {suggestions.length === 0
          ? <div style={{ color:C.muted, fontSize:"0.84rem" }}>Aucune suggestion.</div>
          : suggestions.map(u => {
            const ri = getRoleInfo(u.role);
            return (
              <div key={u.uid} onClick={() => setPage("social")} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:`1px solid ${C.border}`, cursor:"pointer" }}>
                <div style={{ width:34, height:34, borderRadius:"50%", background:u.photoURL?"transparent":ri.bg, color:ri.color,
                  display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:"0.72rem", overflow:"hidden", flexShrink:0 }}>
                  {u.photoURL ? <img src={u.photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : (u.avatar||u.name?.slice(0,2))}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:"0.82rem", fontWeight:600, color:C.navy, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{u.name}</div>
                  <div style={{ fontSize:"0.7rem", color:C.muted }}>{ri.icon} {ri.label}</div>
                </div>
              </div>
            );
          })}
        <button style={{ ...css.btnSecondary, width:"100%", marginTop:12, fontSize:"0.82rem" }} onClick={() => setPage("social")}>Voir le réseau →</button>
      </div>

      {role==="etudiant" && offres.length > 0 && (
        <div style={css.card}>
          <span style={{ ...css.label, color:C.gold, display:"block" }}>🎓 Offres Alumni</span>
          {offres.slice(0,3).map(o => (
            <div key={o.id} style={{ padding:"7px 0", borderBottom:`1px solid ${C.border}` }}>
              <div style={{ fontSize:"0.83rem", fontWeight:600, color:C.navy, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{o.titre}</div>
              <div style={{ fontSize:"0.75rem", color:C.mid }}>{o.ent}</div>
            </div>
          ))}
          <button style={{ ...css.btnSecondary, width:"100%", marginTop:12, fontSize:"0.82rem" }} onClick={() => setPage("alumni")}>Espace Alumni →</button>
        </div>
      )}
    </div>
  );

  return (
    <div>
      {Banner}
      {isMobile ? (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {CenterCol}
          {RightCol}
          {LeftCol}
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"260px 1fr 300px", gap:16, alignItems:"start" }}>
          {LeftCol}
          {CenterCol}
          {RightCol}
        </div>
      )}
    </div>
  );
}
