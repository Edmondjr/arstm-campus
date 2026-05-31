// src/pages/Social.jsx
import { useState, useCallback } from "react";
import { C, css, ROLES } from "../design";
import { usePosts, addDocument, updateDocument, useCollection } from "../hooks/useFirestore";
import { useAuth } from "../AuthContext";
import { ProfilExterne } from "./Profil";
import PageMessages from "./Messages";

const REACTIONS = ["❤️","👍","🔥","🙏","😂","😮","🎉","💯"];
const MAX_LEN = 200;

const getRoleInfo = r => ROLES.find(x => x.id===r) || { color:C.blue, bg:C.blueLight, icon:"👤", label:r };

function PostCard({ p, uid, onReact, onOpenProfil }) {
  const [showReactions, setShowReactions] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const r = getRoleInfo(p.role);
  const reactions = p.reactions || {};
  const totalReactions = Object.values(reactions).reduce((s, arr) => s + arr.length, 0);
  const userReaction = REACTIONS.find(e => (reactions[e]||[]).includes(uid));
  const isLong = p.texte?.length > MAX_LEN;
  const displayText = isLong && !expanded ? p.texte.slice(0, MAX_LEN) + "…" : p.texte;

  return (
    <div style={{ ...css.card, marginBottom:12 }}>
      <div style={{ display:"flex", gap:10, marginBottom:10 }}>
        <div onClick={() => onOpenProfil(p.auteurUid, p)}
          style={{ width:40, height:40, borderRadius:"50%", background:p.photoURL?"transparent":r.bg,
            color:r.color, display:"flex", alignItems:"center", justifyContent:"center",
            fontWeight:700, fontSize:"0.85rem", flexShrink:0, cursor:"pointer", overflow:"hidden",
            border:`2px solid ${r.color}20`, transition:"transform 0.15s" }}>
          {p.photoURL
            ? <img src={p.photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
            : (p.avatar||p.auteur?.slice(0,2))}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <span onClick={() => onOpenProfil(p.auteurUid, p)}
              style={{ fontWeight:700, fontSize:"0.92rem", color:C.navy, cursor:"pointer" }}>
              {p.auteur}
            </span>
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

      <p style={{ fontSize:"0.88rem", lineHeight:1.7, color:C.dark, marginBottom:isLong?4:12 }}>
        {displayText}
      </p>
      {isLong && (
        <button onClick={() => setExpanded(!expanded)}
          style={{ background:"none", border:"none", color:C.blue, fontSize:"0.82rem", cursor:"pointer", padding:"0 0 10px", fontFamily:"inherit" }}>
          {expanded ? "Voir moins ▲" : "Voir plus ▼"}
        </button>
      )}

      {totalReactions > 0 && (
        <div style={{ display:"flex", gap:4, marginBottom:8, flexWrap:"wrap" }}>
          {REACTIONS.filter(e => (reactions[e]||[]).length > 0).map(e => (
            <span key={e} style={{ fontSize:"0.78rem", background:C.surfaceAlt, borderRadius:100, padding:"2px 8px", color:C.dark }}>
              {e} {reactions[e].length}
            </span>
          ))}
        </div>
      )}

      <div style={{ height:1, background:C.border, margin:"0 0 10px" }}/>
      <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", position:"relative" }}>
        <div style={{ position:"relative" }}>
          <button onClick={() => setShowReactions(!showReactions)}
            style={{ background:"none", border:"none", cursor:"pointer", color:userReaction?C.red:C.muted,
              fontSize:"0.84rem", padding:0, display:"flex", alignItems:"center", gap:5, fontFamily:"inherit" }}>
            {userReaction || "🤍"} {totalReactions > 0 ? totalReactions : "Réagir"}
          </button>
          {showReactions && (
            <div style={{ position:"absolute", bottom:"calc(100% + 6px)", left:0, zIndex:100,
              background:"#fff", borderRadius:14, boxShadow:"0 4px 24px rgba(0,0,0,0.18)",
              border:`1px solid ${C.border}`, padding:"6px 8px", display:"flex", gap:4 }}>
              {REACTIONS.map(e => (
                <button key={e} onClick={() => { onReact(p, e); setShowReactions(false); }}
                  style={{ background:"none", border:"none", cursor:"pointer", fontSize:"1.1rem",
                    padding:"4px", borderRadius:8, transition:"transform 0.1s",
                    transform:(reactions[e]||[]).includes(uid)?"scale(1.3)":"scale(1)" }}>
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
        <button style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, fontSize:"0.84rem", padding:0, fontFamily:"inherit" }}>
          💬 {p.comments?.length||0}
        </button>
        <button onClick={() => onOpenProfil(p.auteurUid, p)}
          style={{ background:"none", border:"none", cursor:"pointer", color:C.blue, fontSize:"0.82rem", padding:0, fontFamily:"inherit", marginLeft:"auto" }}>
          Voir profil →
        </button>
      </div>
    </div>
  );
}

export default function PageSocial({ profile, setPage }) {
  const { user } = useAuth();
  const { data: posts, loading } = usePosts();
  const { data: allUsers } = useCollection("users", []);
  const [tab, setTab]           = useState("fil");
  const [newText, setNew]       = useState("");
  const [saving, setSaving]     = useState(false);
  const [viewUser, setViewUser] = useState(null);
  const [roleFilter, setRoleFilter] = useState("Tous");
  const [promoFilter, setPromoFilter] = useState("Tous");
  const [searchReseau, setSearchReseau] = useState("");

  const getUserProfile = useCallback((uid) => {
    return allUsers.find(u => u.uid === uid) || null;
  }, [allUsers]);

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
    const updated = {
      ...reactions,
      [emoji]: has ? curr.filter(id => id !== uid) : [...curr, uid],
    };
    await updateDocument("posts", post.id, { reactions: updated });
  };

  const openProfil = (uid, fallback) => {
    const u = getUserProfile(uid);
    if (u) setViewUser(u);
    else if (fallback) setViewUser({ name:fallback.auteur, avatar:fallback.avatar, role:fallback.role, promo:fallback.promo, photoURL:fallback.photoURL });
  };

  // Réseau filters
  const approvedUsers = allUsers.filter(u => u.status === "approved");
  const promos = ["Tous", ...new Set(approvedUsers.map(u => u.promo).filter(Boolean))];
  const roles  = ["Tous", ...new Set(approvedUsers.map(u => u.role).filter(Boolean))];
  const reseauFiltered = approvedUsers.filter(u => {
    const matchRole  = roleFilter === "Tous" || u.role === roleFilter;
    const matchPromo = promoFilter === "Tous" || u.promo === promoFilter;
    const matchSearch = !searchReseau || u.name?.toLowerCase().includes(searchReseau.toLowerCase());
    return matchRole && matchPromo && matchSearch;
  });

  if (loading) return <div style={{ padding:40, textAlign:"center", color:C.muted }}>Chargement…</div>;

  const r = getRoleInfo(profile.role);

  return (
    <div style={{ maxWidth:680, margin:"0 auto" }}>
      {viewUser && (
        <ProfilExterne
          user={viewUser}
          onClose={() => setViewUser(null)}
          onMessage={() => { setViewUser(null); setTab("messages"); }}
        />
      )}

      <div style={css.pageH}>Espace Social</div>
      <div style={css.pageSub}>{posts.length} publications · Communauté ARSTM</div>

      {/* Onglets */}
      <div style={{ display:"flex", gap:6, marginBottom:18, overflowX:"auto", paddingBottom:2 }}>
        {[["fil","💬 Fil"],["messages","✉️ Messages"],["groupes","👥 Groupes"],["reseau","🌐 Réseau"]].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)} style={{
            padding:"7px 16px", borderRadius:20, border:`1px solid ${tab===v?C.blue:C.border}`,
            background:tab===v?C.blue:"#fff", color:tab===v?"#fff":C.mid,
            cursor:"pointer", fontFamily:"inherit", fontWeight:600, fontSize:"0.82rem",
            whiteSpace:"nowrap", transition:"all 0.15s",
          }}>{l}</button>
        ))}
      </div>

      {/* ── MESSAGES ── */}
      {tab==="messages" && <PageMessages profile={profile} floating={false}/>}

      {/* ── FIL ── */}
      {tab==="fil" && (
        <>
          <div style={{ ...css.card, marginBottom:14 }}>
            <div style={{ display:"flex", gap:10, marginBottom:12 }}>
              <div onClick={() => setPage && setPage("profil")}
                style={{ width:38, height:38, borderRadius:"50%", background:profile.photoURL?"transparent":r.bg,
                  color:r.color, display:"flex", alignItems:"center", justifyContent:"center",
                  fontWeight:700, fontSize:"0.82rem", flexShrink:0, cursor:"pointer", overflow:"hidden",
                  border:`2px solid ${r.color}20` }}>
                {profile.photoURL
                  ? <img src={profile.photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                  : (profile.avatar||profile.name?.slice(0,2))}
              </div>
              <textarea style={{ ...css.input, resize:"none", minHeight:72, flex:1, borderRadius:12 }}
                placeholder="Partagez quelque chose avec la communauté…"
                value={newText} onChange={e => setNew(e.target.value)}/>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ display:"flex", gap:8 }}>
                <button style={{ ...css.btnGhost, fontSize:"0.8rem", color:C.muted }}>📷 Photo</button>
                <button style={{ ...css.btnGhost, fontSize:"0.8rem", color:C.muted }}>📎 Fichier</button>
              </div>
              <button style={{ ...css.btnPrimary, opacity:saving||!newText.trim()?0.6:1, borderRadius:20 }}
                onClick={publish} disabled={saving||!newText.trim()}>
                {saving ? "Envoi…" : "Publier →"}
              </button>
            </div>
          </div>

          {posts.map(p => (
            <PostCard key={p.id} p={p} uid={user?.uid} onReact={react} onOpenProfil={openProfil} />
          ))}

          {posts.length === 0 && (
            <div style={{ ...css.card, textAlign:"center", padding:48, color:C.muted }}>
              <div style={{ fontSize:"2.5rem", marginBottom:12 }}>💬</div>
              <div style={{ fontWeight:600, color:C.navy, marginBottom:6 }}>Aucune publication</div>
              <div style={{ fontSize:"0.84rem" }}>Soyez le premier à partager quelque chose !</div>
            </div>
          )}
        </>
      )}

      {/* ── GROUPES ── */}
      {tab==="groupes" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {[
            { n:"Groupe révision Droit Maritime", m:6, c:C.blue, icon:"⚖️" },
            { n:"Projet tutoré — Dédouanement",   m:4, c:C.green, icon:"📦" },
            { n:"Prépa soutenances MPTML P34",    m:12, c:"#7c3aed", icon:"🎓" },
            { n:"TD Incoterms 2020",              m:8, c:C.gold, icon:"📋" },
          ].map((g, i) => (
            <div key={i} style={{ ...css.card, display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
              <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                <div style={{ width:44, height:44, borderRadius:12, background:`${g.c}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.2rem" }}>{g.icon}</div>
                <div>
                  <div style={{ fontWeight:700, color:C.navy, fontSize:"0.9rem" }}>{g.n}</div>
                  <div style={{ fontSize:"0.75rem", color:C.muted, marginTop:2 }}>{g.m} membres</div>
                </div>
              </div>
              <button style={{ ...css.btnSm, borderRadius:20 }}>Rejoindre</button>
            </div>
          ))}
          <button style={{ ...css.btnPrimary, alignSelf:"flex-start", borderRadius:20 }}>+ Créer un groupe</button>
        </div>
      )}

      {/* ── RÉSEAU ── */}
      {tab==="reseau" && (
        <div>
          <div style={{ marginBottom:14 }}>
            <input style={{ ...css.input, marginBottom:10 }}
              placeholder="🔍 Rechercher un membre…"
              value={searchReseau} onChange={e => setSearchReseau(e.target.value)} />
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <select style={{ ...css.input, flex:1, minWidth:120 }} value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}>
                {roles.map(r => <option key={r}>{r}</option>)}
              </select>
              <select style={{ ...css.input, flex:1, minWidth:120 }} value={promoFilter}
                onChange={e => setPromoFilter(e.target.value)}>
                {promos.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div style={{ fontSize:"0.78rem", color:C.muted, marginBottom:12 }}>{reseauFiltered.length} membres</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12 }}>
            {reseauFiltered.map(u => {
              const ri = getRoleInfo(u.role);
              return (
                <div key={u.uid} onClick={() => setViewUser(u)}
                  style={{ ...css.card, cursor:"pointer", textAlign:"center", padding:"20px 16px", transition:"all 0.18s" }}
                  onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 8px 24px rgba(37,99,235,0.12)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow=""; }}>
                  <div style={{ width:56, height:56, borderRadius:"50%", background:u.photoURL?"transparent":ri.bg,
                    color:ri.color, display:"flex", alignItems:"center", justifyContent:"center",
                    fontWeight:700, fontSize:"1.1rem", margin:"0 auto 10px", overflow:"hidden",
                    border:`3px solid ${ri.color}25` }}>
                    {u.photoURL
                      ? <img src={u.photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                      : (u.avatar||u.name?.slice(0,2))}
                  </div>
                  <div style={{ fontWeight:700, color:C.navy, fontSize:"0.9rem", marginBottom:4 }}>{u.name}</div>
                  <span style={{ ...css.badge(ri.bg, ri.color), fontSize:"0.68rem" }}>{ri.icon} {ri.label}</span>
                  {u.promo && <div style={{ fontSize:"0.74rem", color:C.muted, marginTop:6 }}>{u.promo}</div>}
                  {u.online && (
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:4, marginTop:6 }}>
                      <div style={{ width:6, height:6, borderRadius:"50%", background:"#10b981" }}/>
                      <span style={{ fontSize:"0.7rem", color:"#10b981" }}>En ligne</span>
                    </div>
                  )}
                </div>
              );
            })}
            {reseauFiltered.length === 0 && (
              <div style={{ gridColumn:"1/-1", ...css.card, textAlign:"center", padding:40, color:C.muted }}>
                Aucun membre trouvé.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
