// src/pages/Social.jsx
import { useState } from "react";
import { C, css } from "../design";
import { usePosts, addDocument, updateDocument } from "../hooks/useFirestore";
import { useAuth } from "../AuthContext";

export default function PageSocial({ profile }) {
  const { user } = useAuth();
  const { data: posts, loading } = usePosts();
  const [tab, setTab]     = useState("forum");
  const [newText, setNew] = useState("");
  const [saving, setSaving] = useState(false);

  const publish = async () => {
    if (!newText.trim()) return;
    setSaving(true);
    await addDocument("posts", {
      auteur: profile.name,
      avatar: profile.avatar || profile.name?.slice(0,2),
      role:   profile.role,
      promo:  profile.promo,
      texte:  newText,
      likes:  [],
      comments: [],
    });
    setNew("");
    setSaving(false);
  };

  const like = async (post) => {
    const uid   = user?.uid;
    const liked = post.likes?.includes(uid);
    const newLikes = liked
      ? post.likes.filter(id=>id!==uid)
      : [...(post.likes||[]), uid];
    await updateDocument("posts", post.id, { likes: newLikes });
  };

  if (loading) return <div style={{ padding:40, textAlign:"center", color:C.muted }}>⏳ Chargement...</div>;

  return (
    <div style={{ maxWidth:680, margin:"0 auto" }}>
      <div style={css.pageH}>Espace Social</div>
      <div style={css.pageSub}>{posts.length} publications</div>

      <div style={{ display:"flex", gap:8, marginBottom:18 }}>
        {[["forum","💬 Forum"],["groupes","👥 Groupes"],["parrainage","🤝 Parrainage"]].map(([v,l])=>(
          <button key={v} style={{ ...css.tab(tab===v), borderRadius:10, padding:"7px 16px",
            border:`1px solid ${tab===v?C.blue:C.border}`, fontFamily:"inherit" }}
            onClick={()=>setTab(v)}>{l}</button>
        ))}
      </div>

      {tab==="forum" && <>
        {/* Composer */}
        <div style={{ ...css.card, marginBottom:14 }}>
          <div style={{ display:"flex", gap:10, marginBottom:12 }}>
            <div style={{ width:34, height:34, borderRadius:"50%", background:C.blueLight,
              color:C.blue, display:"flex", alignItems:"center", justifyContent:"center",
              fontWeight:700, fontSize:"0.78rem", flexShrink:0 }}>
              {profile.avatar||profile.name?.slice(0,2)}
            </div>
            <textarea style={{ ...css.input, resize:"none", minHeight:72, flex:1 }}
              placeholder="Partagez quelque chose avec la communauté..."
              value={newText} onChange={e=>setNew(e.target.value)} />
          </div>
          <div style={{ display:"flex", justifyContent:"flex-end" }}>
            <button style={{ ...css.btnPrimary, opacity:saving||!newText.trim()?0.6:1 }}
              onClick={publish} disabled={saving||!newText.trim()}>
              {saving?"⏳":"Publier"}
            </button>
          </div>
        </div>

        {posts.map(p => {
          const liked = p.likes?.includes(user?.uid);
          return (
            <div key={p.id} style={{ ...css.card, marginBottom:12 }}>
              <div style={{ display:"flex", gap:10, marginBottom:10 }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:C.blueLight,
                  color:C.blue, display:"flex", alignItems:"center", justifyContent:"center",
                  fontWeight:700, fontSize:"0.8rem", flexShrink:0 }}>{p.avatar}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontWeight:700, fontSize:"0.9rem", color:C.navy }}>{p.auteur}</span>
                    <span style={{ fontSize:"0.74rem", color:C.muted }}>
                      {p.createdAt?.toDate?.()?.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})||""}
                    </span>
                  </div>
                  {p.promo && <span style={css.badge(C.blueLight,C.blue)}>{p.promo}</span>}
                </div>
              </div>
              <p style={{ fontSize:"0.88rem", lineHeight:1.65, color:C.dark, marginBottom:12 }}>{p.texte}</p>
              <div style={{ height:1, background:C.border, margin:"0 0 10px" }} />
              <div style={{ display:"flex", gap:16 }}>
                <button onClick={()=>like(p)}
                  style={{ background:"none", border:"none", cursor:"pointer",
                    color:liked?"#dc2626":C.muted, fontSize:"0.84rem", padding:0,
                    display:"flex", alignItems:"center", gap:5, fontFamily:"inherit" }}>
                  {liked?"❤️":"🤍"} {p.likes?.length||0}
                </button>
                <button style={{ background:"none", border:"none", cursor:"pointer",
                  color:C.muted, fontSize:"0.84rem", padding:0, fontFamily:"inherit" }}>
                  💬 {p.comments?.length||0}
                </button>
              </div>
            </div>
          );
        })}
      </>}

      {tab==="groupes" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {[
            {n:"Groupe révision Droit Maritime",m:6,c:C.blue},
            {n:"Projet tutoré — Dédouanement",m:4,c:C.green},
            {n:"Prépa soutenances MPTML P34",m:12,c:C.purple},
            {n:"TD Incoterms 2020",m:8,c:C.gold},
          ].map((g,i) => (
            <div key={i} style={{ ...css.card, display:"flex", justifyContent:"space-between",
              alignItems:"center", gap:12 }}>
              <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                <div style={{ width:40, height:40, borderRadius:10, background:`${g.c}15`,
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.1rem" }}>👥</div>
                <div>
                  <div style={{ fontWeight:600, color:C.navy, fontSize:"0.9rem" }}>{g.n}</div>
                  <div style={{ fontSize:"0.76rem", color:C.muted }}>{g.m} membres</div>
                </div>
              </div>
              <button style={css.btnSm}>Rejoindre</button>
            </div>
          ))}
          <button style={{ ...css.btnPrimary, alignSelf:"flex-start" }}>+ Créer un groupe</button>
        </div>
      )}

      {tab==="parrainage" && (
        <div style={css.card}>
          <div style={{ fontWeight:700, color:C.navy, marginBottom:12 }}>🤝 Système de parrainage ARSTM</div>
          <p style={{ fontSize:"0.85rem", color:C.mid, lineHeight:1.65 }}>
            Le parrainage met en relation les étudiants des nouvelles promotions avec leurs aînés 
            pour faciliter l'intégration et le partage d'expérience.
          </p>
          <button style={{ ...css.btnPrimary, marginTop:14 }}>Trouver mon parrain</button>
        </div>
      )}
    </div>
  );
}
