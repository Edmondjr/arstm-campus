// src/pages/Social.jsx
import { useState, useCallback } from "react";
import { C, css, ROLES } from "../design";
import { usePosts, addDocument, updateDocument, useCollection } from "../hooks/useFirestore";
import { useAuth } from "../AuthContext";
import { ProfilExterne } from "./Profil";
import PageMessages from "./Messages";

const getRoleInfo = r => ROLES.find(x=>x.id===r) || {color:C.blue,bg:C.blueLight,icon:"👤",label:r};

export default function PageSocial({ profile, setPage }) {
  const { user } = useAuth();
  const { data: posts, loading } = usePosts();
  const { data: allUsers } = useCollection("users", []);
  const [tab, setTab]           = useState("forum");
  const [newText, setNew]       = useState("");
  const [saving, setSaving]     = useState(false);
  const [viewUser, setViewUser] = useState(null); // ProfilExterne
  const [showMessages, setShowMessages] = useState(false);

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
      comments:  [],
    });
    setNew(""); setSaving(false);
  };

  const like = async (post) => {
    const uid   = user?.uid;
    const liked = post.likes?.includes(uid);
    await updateDocument("posts", post.id, {
      likes: liked ? post.likes.filter(id=>id!==uid) : [...(post.likes||[]), uid]
    });
  };

  const openProfil = (uid, fallback) => {
    const u = getUserProfile(uid);
    if (u) setViewUser(u);
    else if (fallback) setViewUser(fallback);
  };

  if (loading) return <div style={{padding:40,textAlign:"center",color:C.muted}}>Chargement...</div>;

  return (
    <div style={{maxWidth:680,margin:"0 auto"}}>

      {/* ProfilExterne modal */}
      {viewUser && (
        <ProfilExterne
          user={viewUser}
          onClose={()=>setViewUser(null)}
          onMessage={(u)=>{ setViewUser(null); setTab("messages"); }}
        />
      )}

      <div style={css.pageH}>Espace Social</div>
      <div style={css.pageSub}>{posts.length} publications · Communauté ARSTM</div>

      {/* Onglets */}
      <div style={{display:"flex",gap:6,marginBottom:18,overflowX:"auto",paddingBottom:2}}>
        {[["forum","💬 Forum"],["messages","✉️ Messages"],["groupes","👥 Groupes"],["parrainage","🤝 Parrainage"]].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)} style={{
            padding:"7px 16px", borderRadius:20, border:`1px solid ${tab===v?C.blue:C.border}`,
            background:tab===v?C.blue:"#fff", color:tab===v?"#fff":C.mid,
            cursor:"pointer", fontFamily:"inherit", fontWeight:600, fontSize:"0.82rem",
            whiteSpace:"nowrap", transition:"all 0.15s",
          }}>{l}</button>
        ))}
      </div>

      {/* ── MESSAGES ── */}
      {tab==="messages" && <PageMessages profile={profile} floating={false}/>}

      {/* ── FORUM ── */}
      {tab==="forum" && (
        <>
          {/* Composer */}
          <div style={{...css.card,marginBottom:14}}>
            <div style={{display:"flex",gap:10,marginBottom:12}}>
              {/* Avatar cliquable → propre profil */}
              <div onClick={()=>setPage&&setPage("profil")} style={{
                width:38,height:38,borderRadius:"50%",
                background:profile.photoURL?"transparent":(getRoleInfo(profile.role).bg),
                color:getRoleInfo(profile.role).color,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontWeight:700,fontSize:"0.82rem",flexShrink:0,cursor:"pointer",
                overflow:"hidden",border:`2px solid ${getRoleInfo(profile.role).color}20`,
              }}>
                {profile.photoURL
                  ? <img src={profile.photoURL} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  : (profile.avatar||profile.name?.slice(0,2))}
              </div>
              <textarea style={{...css.input,resize:"none",minHeight:72,flex:1,borderRadius:12}}
                placeholder="Partagez quelque chose avec la communauté..."
                value={newText} onChange={e=>setNew(e.target.value)}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",gap:8}}>
                <button style={{...css.btnGhost,fontSize:"0.8rem",color:C.muted}}>📷 Photo</button>
                <button style={{...css.btnGhost,fontSize:"0.8rem",color:C.muted}}>📎 Fichier</button>
              </div>
              <button style={{...css.btnPrimary,opacity:saving||!newText.trim()?0.6:1,borderRadius:20}}
                onClick={publish} disabled={saving||!newText.trim()}>
                {saving?"Envoi...":"Publier →"}
              </button>
            </div>
          </div>

          {/* Posts */}
          {posts.map(p => {
            const liked = p.likes?.includes(user?.uid);
            const r = getRoleInfo(p.role);
            return (
              <div key={p.id} style={{...css.card,marginBottom:12}}>
                <div style={{display:"flex",gap:10,marginBottom:10}}>
                  {/* Avatar cliquable */}
                  <div onClick={()=>openProfil(p.auteurUid, {name:p.auteur,avatar:p.avatar,role:p.role,promo:p.promo,photoURL:p.photoURL})}
                    style={{
                      width:40,height:40,borderRadius:"50%",
                      background:p.photoURL?"transparent":r.bg,
                      color:r.color,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontWeight:700,fontSize:"0.85rem",flexShrink:0,
                      cursor:"pointer",overflow:"hidden",
                      border:`2px solid ${r.color}20`,
                      transition:"transform 0.15s",
                    }}>
                    {p.photoURL
                      ? <img src={p.photoURL} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      : (p.avatar||p.auteur?.slice(0,2))}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      {/* Nom cliquable */}
                      <span onClick={()=>openProfil(p.auteurUid, {name:p.auteur,avatar:p.avatar,role:p.role,promo:p.promo})}
                        style={{fontWeight:700,fontSize:"0.92rem",color:C.navy,cursor:"pointer"}}>
                        {p.auteur}
                      </span>
                      <span style={{fontSize:"0.72rem",color:C.muted}}>
                        {p.createdAt?.toDate?.()?.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})||""}
                      </span>
                    </div>
                    <div style={{display:"flex",gap:5,marginTop:3,flexWrap:"wrap"}}>
                      <span style={{...css.badge(r.bg,r.color),fontSize:"0.68rem"}}>{r.icon} {p.role}</span>
                      {p.promo && <span style={{...css.badge(C.surfaceAlt,C.mid),fontSize:"0.68rem"}}>{p.promo}</span>}
                    </div>
                  </div>
                </div>

                <p style={{fontSize:"0.88rem",lineHeight:1.7,color:C.dark,marginBottom:12}}>{p.texte}</p>

                <div style={{height:1,background:C.border,margin:"0 0 10px"}}/>
                <div style={{display:"flex",gap:16,alignItems:"center"}}>
                  <button onClick={()=>like(p)} style={{
                    background:"none",border:"none",cursor:"pointer",
                    color:liked?"#dc2626":C.muted,fontSize:"0.84rem",padding:0,
                    display:"flex",alignItems:"center",gap:5,fontFamily:"inherit",
                    transition:"transform 0.1s",
                  }}>
                    {liked?"❤️":"🤍"} {p.likes?.length||0}
                  </button>
                  <button style={{background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:"0.84rem",padding:0,fontFamily:"inherit"}}>
                    💬 {p.comments?.length||0}
                  </button>
                  <button onClick={()=>openProfil(p.auteurUid, {name:p.auteur,avatar:p.avatar,role:p.role,promo:p.promo,photoURL:p.photoURL})}
                    style={{background:"none",border:"none",cursor:"pointer",color:C.blue,fontSize:"0.82rem",padding:0,fontFamily:"inherit",marginLeft:"auto"}}>
                    Voir profil →
                  </button>
                </div>
              </div>
            );
          })}

          {posts.length===0 && (
            <div style={{...css.card,textAlign:"center",padding:48,color:C.muted}}>
              <div style={{fontSize:"2.5rem",marginBottom:12}}>💬</div>
              <div style={{fontWeight:600,color:C.navy,marginBottom:6}}>Aucune publication</div>
              <div style={{fontSize:"0.84rem"}}>Soyez le premier à partager quelque chose !</div>
            </div>
          )}
        </>
      )}

      {/* ── GROUPES ── */}
      {tab==="groupes" && (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {[
            {n:"Groupe révision Droit Maritime",m:6,c:C.blue,icon:"⚖️"},
            {n:"Projet tutoré — Dédouanement",m:4,c:C.green,icon:"📦"},
            {n:"Prépa soutenances MPTML P34",m:12,c:"#7c3aed",icon:"🎓"},
            {n:"TD Incoterms 2020",m:8,c:C.gold,icon:"📋"},
          ].map((g,i)=>(
            <div key={i} style={{...css.card,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
              <div style={{display:"flex",gap:12,alignItems:"center"}}>
                <div style={{width:44,height:44,borderRadius:12,background:`${g.c}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.2rem"}}>{g.icon}</div>
                <div>
                  <div style={{fontWeight:700,color:C.navy,fontSize:"0.9rem"}}>{g.n}</div>
                  <div style={{fontSize:"0.75rem",color:C.muted,marginTop:2}}>{g.m} membres</div>
                </div>
              </div>
              <button style={{...css.btnSm,borderRadius:20}}>Rejoindre</button>
            </div>
          ))}
          <button style={{...css.btnPrimary,alignSelf:"flex-start",borderRadius:20}}>+ Créer un groupe</button>
        </div>
      )}

      {/* ── PARRAINAGE ── */}
      {tab==="parrainage" && (
        <div style={css.card}>
          <div style={{fontWeight:700,color:C.navy,marginBottom:12,fontSize:"1rem"}}>🤝 Parrainage ARSTM</div>
          <p style={{fontSize:"0.86rem",color:C.mid,lineHeight:1.7,marginBottom:16}}>
            Le parrainage met en relation les étudiants des nouvelles promotions avec leurs aînés pour faciliter l'intégration et le partage d'expérience.
          </p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
            {[["🎓","Trouver mon parrain","Être guidé par un aîné"],["🤝","Devenir parrain","Accompagner un nouveau"]].map(([icon,label,desc],i)=>(
              <button key={i} style={{padding:"14px 12px",borderRadius:14,background:C.blueLight,border:`1px solid ${C.blueBorder}`,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
                <div style={{fontSize:"1.4rem",marginBottom:6}}>{icon}</div>
                <div style={{fontWeight:700,color:C.blue,fontSize:"0.88rem"}}>{label}</div>
                <div style={{fontSize:"0.75rem",color:C.mid,marginTop:2}}>{desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}