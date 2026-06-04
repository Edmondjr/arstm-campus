// src/pages/Accueil.jsx
import { useState, useRef, useCallback } from "react";
import { C, ROLES, SHADOWS, css } from "../design";
import {
  useAnnonces, useEDT, useRessources, useOffres, usePosts,
  addDocument, updateDocument, useCollection,
  useComments, addComment, deleteComment, sendNotif,
} from "../hooks/useFirestore";
import { useAuth } from "../AuthContext";
import { ProfilExterne } from "./Profil";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

const REACTIONS  = ["❤️","👍","🔥","🙏","😂","😮","🎉","💯"];
const MAX_IMG    = 10 * 1024 * 1024;
const MAX_VID    = 50 * 1024 * 1024;
const getRoleInfo = r => ROLES.find(x => x.id === r) || { color:C.blue, bg:C.blueLight, icon:"👤", label:r };

function fmtTime(ts) {
  if (!ts?.toDate) return "";
  const d = ts.toDate(), diff = Date.now() - d.getTime();
  if (diff < 60000)    return "à l'instant";
  if (diff < 3600000)  return `il y a ${Math.floor(diff/60000)} min`;
  if (diff < 86400000) return `il y a ${Math.floor(diff/3600000)}h`;
  return d.toLocaleDateString("fr-FR",{day:"2-digit",month:"short"});
}

// ── Upload helper avec vraie gestion d'erreur ──────────────────────────────
async function uploadMedia(file, uid, onProgress) {
  const path = `posts/${uid}/${Date.now()}_${file.name}`;
  const task = uploadBytesResumable(ref(storage, path), file);
  return new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      snap => onProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
      err  => reject(err),
      async () => {
        try { resolve(await getDownloadURL(task.snapshot.ref)); }
        catch(e) { reject(e); }
      }
    );
  });
}

// ── Composer ──────────────────────────────────────────────────────────────────
function PostComposer({ profile, onPublish }) {
  const { user } = useAuth();
  const ri = getRoleInfo(profile?.role);
  const [text,  setText]    = useState("");
  const [file,  setFile]    = useState(null);
  const [prev,  setPrev]    = useState(null);
  const [mtype, setMtype]   = useState(null);
  const [prog,  setProg]    = useState(0);
  const [upl,   setUpl]     = useState(false);
  const [saving,setSaving]  = useState(false);
  const [err,   setErr]     = useState("");
  const fileRef = useRef();

  const pick = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const isVid = f.type.startsWith("video/"), isImg = f.type.startsWith("image/");
    if (!isVid && !isImg) { setErr("Image ou vidéo uniquement."); return; }
    if (isImg && f.size > MAX_IMG) { setErr("Image max 10 Mo."); return; }
    if (isVid && f.size > MAX_VID) { setErr("Vidéo max 50 Mo."); return; }
    setErr(""); setFile(f); setMtype(isVid?"video":"image");
    setPrev(URL.createObjectURL(f));
  };

  const clear = () => { setFile(null); setPrev(null); setMtype(null); setProg(0); fileRef.current && (fileRef.current.value=""); };

  const publish = async () => {
    if (!text.trim() && !file) return;
    setErr(""); setSaving(true);
    let mediaUrl = null;
    if (file) {
      setUpl(true);
      try {
        mediaUrl = await uploadMedia(file, user?.uid || "anon", setProg);
      } catch(e) {
        setErr(`Erreur upload : ${e.message || "vérifiez la connexion et réessayez."}`);
        setUpl(false); setSaving(false); return;
      }
      setUpl(false);
    }
    await onPublish(text.trim(), mediaUrl, mtype);
    setText(""); clear(); setSaving(false);
  };

  return (
    <div style={{ ...css.card, marginBottom:14 }}>
      <div style={{ display:"flex", gap:10, marginBottom:10 }}>
        <div style={{ width:40, height:40, borderRadius:"50%", flexShrink:0, overflow:"hidden",
          background:profile.photoURL?"transparent":ri.bg, color:ri.color,
          display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:"0.85rem",
          border:`2px solid ${ri.color}20` }}>
          {profile.photoURL ? <img src={profile.photoURL} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : (profile.avatar||profile.name?.slice(0,2))}
        </div>
        <textarea style={{ ...css.input, resize:"none", minHeight:72, flex:1, borderRadius:12, lineHeight:1.6 }}
          placeholder="Partagez quelque chose avec la communauté ARSTM…"
          value={text} onChange={e=>{setText(e.target.value);setErr("");}}/>
      </div>

      {err && <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:9, padding:"8px 12px", marginBottom:10, fontSize:"0.8rem", color:"#dc2626" }}>⚠️ {err}</div>}

      {prev && (
        <div style={{ position:"relative", marginBottom:10, borderRadius:12, overflow:"hidden", background:"#000" }}>
          {mtype==="video"
            ? <video src={prev} controls style={{width:"100%",maxHeight:220,display:"block"}}/>
            : <img src={prev} alt="" style={{width:"100%",maxHeight:280,objectFit:"cover",display:"block"}}/>}
          <button onClick={clear} style={{ position:"absolute",top:8,right:8,width:28,height:28,borderRadius:"50%",background:"rgba(0,0,0,0.6)",color:"#fff",border:"none",cursor:"pointer",fontSize:"0.85rem",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
        </div>
      )}

      {upl && (
        <div style={{ marginBottom:10 }}>
          <div style={{ background:C.surfaceAlt, borderRadius:100, height:6, overflow:"hidden" }}>
            <div style={{ width:`${prog}%`, height:"100%", background:`linear-gradient(90deg,${C.blue},${C.aqua})`, borderRadius:100, transition:"width 0.3s" }}/>
          </div>
          <div style={{ fontSize:"0.72rem", color:C.muted, marginTop:3 }}>Upload {prog}%…</div>
        </div>
      )}

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <input ref={fileRef} type="file" accept="image/*,video/*" style={{display:"none"}} onChange={pick}/>
          <button onClick={()=>fileRef.current?.click()}
            style={{ padding:"7px 12px", borderRadius:20, border:`1px solid ${C.border}`, background:"#fff", cursor:"pointer", fontSize:"0.8rem", color:C.mid, fontFamily:"inherit", display:"flex", alignItems:"center", gap:5 }}>
            🖼 Photo/Vidéo
          </button>
        </div>
        <button onClick={publish} disabled={saving||upl||(!text.trim()&&!file)}
          style={{ ...css.btnPrimary, borderRadius:20, opacity:(saving||upl||(!text.trim()&&!file))?0.55:1 }}>
          {saving?(upl?`⬆ ${prog}%`:"Publication…"):"Publier →"}
        </button>
      </div>
    </div>
  );
}

// ── Commentaires + réponses ───────────────────────────────────────────────────
function CommentsSection({ postId, postAuthorUid, profile }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const { comments } = useComments(postId);
  const [text, setText]       = useState("");
  const [replyTo, setReplyTo] = useState(null); // { id, auteur }
  const [sending, setSending] = useState(false);
  const ri = getRoleInfo(profile?.role);

  const submit = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const finalText = replyTo ? `@${replyTo.auteur} ${text.trim()}` : text.trim();
    await addComment(postId, {
      auteurUid: uid, auteur: profile.name,
      avatar: profile.avatar||profile.name?.slice(0,2),
      photoURL: profile.photoURL||null, role: profile.role,
      texte: finalText,
      ...(replyTo ? { replyToId: replyTo.id, replyToAuteur: replyTo.auteur } : {}),
    });
    if (postAuthorUid && postAuthorUid !== uid) {
      await sendNotif(postAuthorUid, { type:"comment", fromName:profile.name,
        fromAvatar:profile.avatar||profile.name?.slice(0,2), postId, postText:finalText.slice(0,80) });
    }
    setText(""); setReplyTo(null); setSending(false);
  };

  return (
    <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${C.border}` }}>
      {comments.map(c => {
        const cr = getRoleInfo(c.role);
        return (
          <div key={c.id} style={{ display:"flex", gap:8, marginBottom:10 }}>
            <div style={{ width:30, height:30, borderRadius:"50%", background:c.photoURL?"transparent":cr.bg, color:cr.color,
              display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:"0.65rem", overflow:"hidden", flexShrink:0 }}>
              {c.photoURL?<img src={c.photoURL} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(c.avatar||c.auteur?.slice(0,2))}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ background:C.surfaceAlt, borderRadius:"0 12px 12px 12px", padding:"7px 10px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:2 }}>
                  <span style={{ fontWeight:700, fontSize:"0.78rem", color:C.navy }}>{c.auteur}</span>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span style={{ fontSize:"0.65rem", color:C.muted }}>{fmtTime(c.createdAt)}</span>
                    {c.auteurUid===uid && (
                      <button onClick={()=>deleteComment(postId,c.id,c.auteurUid,uid)}
                        style={{ background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:"0.72rem",padding:0 }}>✕</button>
                    )}
                  </div>
                </div>
                <p style={{ fontSize:"0.82rem", lineHeight:1.5, color:C.dark, margin:0 }}>
                  {c.replyToAuteur && <span style={{ color:C.blue, fontWeight:600 }}>@{c.replyToAuteur} </span>}
                  {c.replyToAuteur ? c.texte.replace(`@${c.replyToAuteur} `,"") : c.texte}
                </p>
              </div>
              {/* Bouton Répondre */}
              <button onClick={()=>setReplyTo(replyTo?.id===c.id ? null : {id:c.id, auteur:c.auteur})}
                style={{ background:"none", border:"none", cursor:"pointer", color:replyTo?.id===c.id?C.blue:C.muted,
                  fontSize:"0.72rem", fontWeight:600, padding:"3px 4px", fontFamily:"inherit" }}>
                ↩ Répondre
              </button>
            </div>
          </div>
        );
      })}

      {/* Zone de saisie */}
      <div style={{ marginTop:6 }}>
        {replyTo && (
          <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px", background:C.blueLight, borderRadius:8, marginBottom:6, fontSize:"0.78rem", color:C.blue }}>
            <span>↩ Réponse à <strong>{replyTo.auteur}</strong></span>
            <button onClick={()=>setReplyTo(null)} style={{ marginLeft:"auto", background:"none", border:"none", cursor:"pointer", color:C.blue, fontSize:"0.8rem" }}>✕</button>
          </div>
        )}
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <div style={{ width:30, height:30, borderRadius:"50%", background:profile.photoURL?"transparent":ri.bg, color:ri.color,
            display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:"0.65rem", overflow:"hidden", flexShrink:0 }}>
            {profile.photoURL?<img src={profile.photoURL} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(profile.avatar||profile.name?.slice(0,2))}
          </div>
          <input style={{ ...css.input, flex:1, borderRadius:20, padding:"8px 14px", fontSize:"0.83rem" }}
            placeholder={replyTo ? `Répondre à ${replyTo.auteur}…` : "Écrire un commentaire…"}
            value={text} onChange={e=>setText(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&submit()}/>
          <button onClick={submit} disabled={sending||!text.trim()}
            style={{ ...css.btnPrimary, borderRadius:20, padding:"8px 14px", fontSize:"0.8rem", opacity:(!text.trim()||sending)?0.55:1 }}>↗</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal partage externe ─────────────────────────────────────────────────────
function ShareModal({ post, onClose, onRepost }) {
  const appUrl   = window.location.href;
  const snippet  = (post.texte||"").slice(0,200);
  const shareText= `${post.auteur} sur ARSTM Campus :\n\n"${snippet}"\n\n${appUrl}`;
  const encoded  = encodeURIComponent(shareText);

  const items = [
    { icon:"🔁", label:"Republier", sub:"Dans le fil ARSTM",    bg:"#fff",    border:C.border,  color:C.navy,
      action:()=>{onRepost();onClose();} },
    { icon:"💚", label:"WhatsApp",  sub:"Envoyer à un contact", bg:"#f0fdf4", border:"#bbf7d0", color:"#059669",
      href:`https://wa.me/?text=${encoded}` },
    { icon:"📘", label:"Facebook",  sub:"Partager sur FB",       bg:"#eff6ff", border:"#bfdbfe", color:"#1d4ed8",
      href:`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(appUrl)}&quote=${encodeURIComponent(snippet)}` },
    { icon:"📋", label:navigator.share?"Partager":"Copier", sub:navigator.share?"Via votre téléphone":"Presse-papiers", bg:"#fff", border:C.border, color:C.navy,
      action:()=>{
        if(navigator.share) navigator.share({title:"ARSTM Campus",text:post.texte||"",url:appUrl}).catch(()=>{});
        else navigator.clipboard?.writeText(shareText).then(()=>alert("Texte copié !"));
        onClose();
      }},
  ];

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:4000, background:"rgba(0,0,0,0.5)",
      display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"60px 16px 16px", overflowY:"auto" }}>
      <div onClick={e=>e.stopPropagation()} className="modal-enter"
        style={{ background:"#fff", borderRadius:22, width:"100%", maxWidth:420, padding:"24px 20px 28px", boxShadow:SHADOWS["2xl"] }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1rem", color:C.navy, marginBottom:16 }}>Partager cette publication</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
          {items.map((it,i) => it.href ? (
            <a key={i} href={it.href} target="_blank" rel="noreferrer" onClick={onClose}
              style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, padding:"14px 10px",
                borderRadius:14, border:`1px solid ${it.border}`, background:it.bg, textDecoration:"none" }}>
              <span style={{fontSize:"1.5rem"}}>{it.icon}</span>
              <span style={{fontSize:"0.78rem",fontWeight:600,color:it.color}}>{it.label}</span>
              <span style={{fontSize:"0.68rem",color:it.color,opacity:0.7}}>{it.sub}</span>
            </a>
          ) : (
            <button key={i} onClick={it.action}
              style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, padding:"14px 10px",
                borderRadius:14, border:`1px solid ${it.border}`, background:it.bg, cursor:"pointer", fontFamily:"inherit" }}>
              <span style={{fontSize:"1.5rem"}}>{it.icon}</span>
              <span style={{fontSize:"0.78rem",fontWeight:600,color:it.color}}>{it.label}</span>
              <span style={{fontSize:"0.68rem",color:it.color,opacity:0.7}}>{it.sub}</span>
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{ width:"100%", padding:"12px", borderRadius:12, border:`1px solid ${C.border}`,
          background:"#fff", fontFamily:"inherit", fontWeight:600, fontSize:"0.88rem", color:C.mid, cursor:"pointer" }}>
          Annuler
        </button>
      </div>
    </div>
  );
}

// ── Carte post ────────────────────────────────────────────────────────────────
function FeedPost({ p, uid, profile, onReact, onRepost, onViewProfile }) {
  const [showReactions, setShowReactions] = useState(false);
  const [showComments,  setShowComments]  = useState(false);
  const [showShare,     setShowShare]     = useState(false);
  const [expanded,      setExpanded]      = useState(false);
  const [reposted,      setReposted]      = useState(false);

  const r          = getRoleInfo(p.role);
  const reactions  = p.reactions || {};
  const total      = Object.values(reactions).reduce((s,a)=>s+a.length,0);
  const myReaction = REACTIONS.find(e=>(reactions[e]||[]).includes(uid));
  const commentCount = p.commentCount||0;
  const shareCount   = p.shareCount||0;
  const isLong = (p.texte?.length||0) > 220;
  const displayText = isLong && !expanded ? p.texte.slice(0,220)+"…" : p.texte;

  const handleRepost = async () => { await onRepost(p); setReposted(true); setTimeout(()=>setReposted(false),2500); };

  return (
    <div style={{ ...css.card, marginBottom:12 }}>
      {/* En-tête auteur — cliquable pour voir le profil */}
      <div style={{ display:"flex", gap:10, marginBottom:10 }}>
        <div onClick={()=>onViewProfile(p)} style={{ width:42, height:42, borderRadius:"50%", background:p.photoURL?"transparent":r.bg,
          color:r.color, display:"flex", alignItems:"center", justifyContent:"center",
          fontWeight:700, fontSize:"0.85rem", flexShrink:0, overflow:"hidden", border:`2px solid ${r.color}20`, cursor:"pointer" }}>
          {p.photoURL?<img src={p.photoURL} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(p.avatar||p.auteur?.slice(0,2))}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <span onClick={()=>onViewProfile(p)} style={{ fontWeight:700, fontSize:"0.9rem", color:C.navy, cursor:"pointer" }}
              onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"}
              onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>
              {p.auteur}
            </span>
            <span style={{ fontSize:"0.7rem", color:C.muted, flexShrink:0, marginLeft:8 }}>{fmtTime(p.createdAt)}</span>
          </div>
          <div style={{ display:"flex", gap:5, marginTop:3, flexWrap:"wrap" }}>
            <span style={{ ...css.badge(r.bg,r.color), fontSize:"0.68rem" }}>{r.icon} {r.label}</span>
            {p.promo && <span style={{ ...css.badge(C.surfaceAlt,C.mid), fontSize:"0.68rem" }}>{p.promo}</span>}
          </div>
        </div>
      </div>

      {/* Texte */}
      {p.texte && <p style={{ fontSize:"0.88rem", lineHeight:1.75, color:C.dark, marginBottom:isLong?4:10 }}>{displayText}</p>}
      {isLong && (
        <button onClick={()=>setExpanded(!expanded)}
          style={{ background:"none",border:"none",color:C.blue,fontSize:"0.82rem",cursor:"pointer",padding:"0 0 8px",fontFamily:"inherit" }}>
          {expanded?"Voir moins ▲":"Voir plus ▼"}
        </button>
      )}

      {/* Media */}
      {p.mediaUrl && (
        <div style={{ marginBottom:10, borderRadius:12, overflow:"hidden", background:"#000" }}>
          {p.mediaType==="video"
            ?<video controls src={p.mediaUrl} style={{width:"100%",maxHeight:340,display:"block"}}/>
            :<img src={p.mediaUrl} alt="" style={{width:"100%",maxHeight:400,objectFit:"cover",display:"block"}}/>}
        </div>
      )}

      {/* Post partagé */}
      {p.sharedFrom && (
        <div style={{ border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 12px",marginBottom:10,background:C.surfaceAlt }}>
          <div style={{ fontSize:"0.78rem",fontWeight:700,color:C.navy,marginBottom:4 }}>🔁 {p.sharedFrom.auteur}</div>
          {p.sharedFrom.texte && <p style={{ fontSize:"0.82rem",lineHeight:1.6,color:C.dark,margin:0 }}>{p.sharedFrom.texte}</p>}
          {p.sharedFrom.mediaUrl && p.sharedFrom.mediaType!=="video" && (
            <img src={p.sharedFrom.mediaUrl} alt="" style={{width:"100%",maxHeight:200,objectFit:"cover",borderRadius:8,marginTop:8,display:"block"}}/>
          )}
        </div>
      )}

      {/* Compteurs réactions */}
      {total>0 && (
        <div style={{ display:"flex",gap:4,marginBottom:8,flexWrap:"wrap" }}>
          {REACTIONS.filter(e=>(reactions[e]||[]).length>0).map(e=>(
            <span key={e} onClick={()=>onReact(p,e)}
              style={{ fontSize:"0.78rem",background:C.surfaceAlt,borderRadius:100,padding:"2px 8px",cursor:"pointer" }}>
              {e} {reactions[e].length}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ height:1,background:C.border,margin:"0 0 10px" }}/>
      <div style={{ display:"flex", gap:0, alignItems:"center" }}>
        {/* Réagir */}
        <div style={{ position:"relative", flex:1 }}>
          <button onClick={()=>setShowReactions(!showReactions)}
            style={{ width:"100%",background:"none",border:"none",cursor:"pointer",color:myReaction?C.red:C.muted,
              fontSize:"0.82rem",padding:"6px 4px",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",gap:4,fontFamily:"inherit" }}>
            {myReaction||"🤍"} <span>{total>0?total:"Réagir"}</span>
          </button>
          {showReactions && (
            <div style={{ position:"absolute",bottom:"calc(100% + 6px)",left:0,zIndex:200,
              background:"#fff",borderRadius:14,boxShadow:SHADOWS.lg,border:`1px solid ${C.border}`,padding:"6px 8px",display:"flex",gap:4 }}>
              {REACTIONS.map(e=>(
                <button key={e} onClick={()=>{onReact(p,e);setShowReactions(false);}}
                  style={{ background:"none",border:"none",cursor:"pointer",fontSize:"1.15rem",padding:"4px 3px",borderRadius:8,
                    transform:(reactions[e]||[]).includes(uid)?"scale(1.35)":"scale(1)",transition:"transform 0.1s" }}>{e}</button>
              ))}
            </div>
          )}
        </div>

        {/* Commenter */}
        <button onClick={()=>setShowComments(!showComments)}
          style={{ flex:1,background:"none",border:"none",cursor:"pointer",color:showComments?C.blue:C.muted,
            fontSize:"0.82rem",padding:"6px 4px",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",gap:4,fontFamily:"inherit" }}>
          💬 <span>{commentCount>0?commentCount:"Commenter"}</span>
        </button>

        {/* Partager */}
        <button onClick={()=>setShowShare(true)}
          style={{ flex:1,background:"none",border:"none",cursor:"pointer",color:reposted?C.green:C.muted,
            fontSize:"0.82rem",padding:"6px 4px",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",gap:4,fontFamily:"inherit" }}>
          {reposted?"✓ Partagé":`🔁 ${shareCount>0?shareCount:"Partager"}`}
        </button>
      </div>

      {showComments && <CommentsSection postId={p.id} postAuthorUid={p.auteurUid} profile={profile}/>}
      {showShare    && <ShareModal post={p} onClose={()=>setShowShare(false)} onRepost={handleRepost}/>}
    </div>
  );
}

// ── Page Accueil ──────────────────────────────────────────────────────────────
export default function Accueil({ setPage, isMobile, profile, onGoToReseau }) {
  const { user } = useAuth();
  const role     = profile?.role || "etudiant";
  const roleInfo = getRoleInfo(role);

  const { data: annonces }   = useAnnonces();
  const { edt }              = useEDT(profile?.promo);
  const { data: ressources } = useRessources();
  const { data: offres }     = useOffres();
  const { data: posts }      = usePosts();
  const { data: allUsers }   = useCollection("users", []);

  const [viewUser, setViewUser] = useState(null);

  const urgent      = annonces.filter(a=>a.urgent);
  const jours       = Object.keys(edt);
  const cours       = jours[0] ? edt[jours[0]] : [];
  const suggestions = allUsers.filter(u=>u.status==="approved"&&u.uid!==user?.uid).slice(0,4);

  // Ouvrir le profil externe depuis un post (cherche le profil complet dans allUsers)
  const viewProfile = useCallback((post) => {
    const found = allUsers.find(u => u.uid === post.auteurUid);
    setViewUser(found || { uid:post.auteurUid, name:post.auteur, avatar:post.avatar, photoURL:post.photoURL, role:post.role, promo:post.promo });
  }, [allUsers]);

  const publish = useCallback(async (texte, mediaUrl, mediaType) => {
    await addDocument("posts", {
      auteur:profile.name, auteurUid:user?.uid,
      avatar:profile.avatar||profile.name?.slice(0,2),
      photoURL:profile.photoURL||null, role:profile.role, promo:profile.promo,
      texte, ...(mediaUrl?{mediaUrl,mediaType}:{}),
      likes:[], reactions:{}, commentCount:0, shareCount:0,
    });
  }, [profile, user?.uid]);

  const react = useCallback(async (post, emoji) => {
    const uid = user?.uid; if(!uid) return;
    const reactions = post.reactions||{}, curr = reactions[emoji]||[], has = curr.includes(uid);
    await updateDocument("posts", post.id, { reactions:{...reactions,[emoji]:has?curr.filter(id=>id!==uid):[...curr,uid]} });
  }, [user?.uid]);

  const repost = useCallback(async (post) => {
    const uid = user?.uid; if(!uid) return;
    const origin = post.sharedFrom||{
      originalId:post.id, auteur:post.auteur, auteurUid:post.auteurUid,
      avatar:post.avatar, role:post.role, promo:post.promo,
      photoURL:post.photoURL||null, texte:post.texte||"",
      ...(post.mediaUrl?{mediaUrl:post.mediaUrl,mediaType:post.mediaType}:{}),
    };
    await addDocument("posts",{
      auteur:profile.name, auteurUid:uid,
      avatar:profile.avatar||profile.name?.slice(0,2),
      photoURL:profile.photoURL||null, role:profile.role, promo:profile.promo,
      texte:"", sharedFrom:origin, likes:[], reactions:{}, commentCount:0, shareCount:0,
    });
    await updateDocument("posts", post.sharedFrom?.originalId||post.id, {shareCount:(post.shareCount||0)+1});
    if(origin.auteurUid&&origin.auteurUid!==uid)
      await sendNotif(origin.auteurUid,{type:"share",fromName:profile.name,
        fromAvatar:profile.avatar||profile.name?.slice(0,2),
        postId:origin.originalId,postText:(origin.texte||"").slice(0,80)});
  }, [profile, user?.uid]);

  // ── Colonnes ──
  const LeftCol = (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ ...css.card, padding:0, overflow:"hidden" }}>
        <div style={{ height:60, background:`linear-gradient(135deg,${roleInfo.color},${C.aqua})` }}/>
        <div style={{ padding:"0 16px 16px", textAlign:"center", marginTop:-32 }}>
          <div onClick={()=>setPage("profil")} style={{ width:64,height:64,borderRadius:"50%",margin:"0 auto 10px",
            background:profile.photoURL?"transparent":roleInfo.bg, color:roleInfo.color,
            display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:"1.3rem",
            overflow:"hidden",border:"4px solid #fff",boxShadow:"0 4px 12px rgba(0,0,0,0.12)",cursor:"pointer" }}>
            {profile.photoURL?<img src={profile.photoURL} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(profile.avatar||profile.name?.slice(0,2))}
          </div>
          <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"1rem",color:C.navy }}>{profile?.name}</div>
          <div style={{ marginTop:6 }}><span style={{ ...css.badge(roleInfo.bg,roleInfo.color),fontWeight:700 }}>{roleInfo.icon} {roleInfo.label}</span></div>
          {profile?.promo && <div style={{ fontSize:"0.76rem",color:C.muted,marginTop:6 }}>{profile.promo}</div>}
          <button style={{ ...css.btnSecondary,width:"100%",marginTop:12,fontSize:"0.82rem" }} onClick={()=>setPage("profil")}>Voir mon profil →</button>
        </div>
      </div>
      <div style={{ ...css.card, background:`linear-gradient(135deg,${C.blueLight},#e0f2fe)` }}>
        <span style={{ ...css.label,color:C.blue,display:"block" }}>⚡ Actions rapides</span>
        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
          {role==="etudiant"&&<><button style={{ ...css.btnSm,textAlign:"left",padding:"9px 12px",borderRadius:9,fontSize:"0.82rem" }} onClick={()=>setPage("annonces")}>📢 Voir les annonces</button><button style={{ ...css.btnSm,textAlign:"left",padding:"9px 12px",borderRadius:9,fontSize:"0.82rem" }} onClick={()=>setPage("ressources")}>📚 Télécharger des cours</button><button style={{ ...css.btnSm,textAlign:"left",padding:"9px 12px",borderRadius:9,fontSize:"0.82rem" }} onClick={()=>setPage("social")}>👥 Groupes & Réseau</button></>}
          {role==="enseignant"&&<><button style={{ ...css.btnSm,textAlign:"left",padding:"9px 12px",borderRadius:9,fontSize:"0.82rem" }} onClick={()=>setPage("ressources")}>📤 Déposer un cours</button><button style={{ ...css.btnSm,textAlign:"left",padding:"9px 12px",borderRadius:9,fontSize:"0.82rem" }} onClick={()=>setPage("annonces")}>📢 Publier une annonce</button><button style={{ ...css.btnSm,textAlign:"left",padding:"9px 12px",borderRadius:9,fontSize:"0.82rem" }} onClick={()=>setPage("social")}>👥 Communauté</button></>}
          {role==="alumni"&&<><button style={{ ...css.btnSm,textAlign:"left",padding:"9px 12px",borderRadius:9,fontSize:"0.82rem" }} onClick={()=>setPage("alumni")}>💼 Publier une offre</button><button style={{ ...css.btnSm,textAlign:"left",padding:"9px 12px",borderRadius:9,fontSize:"0.82rem" }} onClick={()=>setPage("social")}>👥 Social ARSTM</button><button style={{ ...css.btnSm,textAlign:"left",padding:"9px 12px",borderRadius:9,fontSize:"0.82rem" }} onClick={()=>setPage("profil")}>👤 Mon profil</button></>}
          {(role==="administration"||role==="superadmin")&&<><button style={{ ...css.btnSm,textAlign:"left",padding:"9px 12px",borderRadius:9,fontSize:"0.82rem" }} onClick={()=>setPage("annonces")}>📢 Créer une annonce</button><button style={{ ...css.btnSm,textAlign:"left",padding:"9px 12px",borderRadius:9,fontSize:"0.82rem" }} onClick={()=>setPage("edt")}>📅 Gérer le planning</button>{role==="superadmin"&&<button style={{ ...css.btnSm,textAlign:"left",padding:"9px 12px",borderRadius:9,fontSize:"0.82rem" }} onClick={()=>setPage("admin")}>⚙️ Panel Admin</button>}</>}
        </div>
      </div>
    </div>
  );

  const CenterCol = (
    <div>
      <PostComposer profile={profile} onPublish={publish}/>
      {posts.length===0
        ? <div style={{ ...css.card,textAlign:"center",padding:48,color:C.muted }}><div style={{ fontSize:"2.5rem",marginBottom:12 }}>💬</div><div style={{ fontWeight:600,color:C.navy,marginBottom:6 }}>Aucune publication</div><div style={{ fontSize:"0.84rem" }}>Soyez le premier !</div></div>
        : posts.map(p=><FeedPost key={p.id} p={p} uid={user?.uid} profile={profile} onReact={react} onRepost={repost} onViewProfile={viewProfile}/>)
      }
    </div>
  );

  const RightCol = (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={css.card}>
        <span style={{ ...css.label,color:C.red,display:"block" }}>🔴 Annonces urgentes</span>
        {urgent.length===0
          ?<div style={{ color:C.muted,fontSize:"0.84rem",padding:"8px 0" }}>Aucune annonce urgente.</div>
          :urgent.slice(0,3).map(a=>(
            <div key={a.id} onClick={()=>setPage("annonces")} style={{ padding:"9px 0",borderBottom:`1px solid ${C.border}`,cursor:"pointer" }}>
              <span style={css.badge(C.redLight,C.red)}>{a.cat}</span>
              <div style={{ fontSize:"0.84rem",fontWeight:600,color:C.navy,marginTop:4,lineHeight:1.3 }}>{a.titre}</div>
            </div>
          ))}
        <button style={{ ...css.btnSecondary,width:"100%",marginTop:12,fontSize:"0.82rem" }} onClick={()=>setPage("annonces")}>Toutes les annonces →</button>
      </div>

      {(role==="etudiant"||role==="enseignant")&&(
        <div style={css.card}>
          <span style={{ ...css.label,color:C.blue,display:"block" }}>⏱ Prochains cours</span>
          {cours.length===0
            ?<div style={{ color:C.muted,fontSize:"0.84rem" }}>Aucun cours trouvé.</div>
            :cours.slice(0,3).map((c,i)=>(
              <div key={i} style={{ display:"flex",gap:8,alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${C.border}` }}>
                <div style={{ width:3,height:24,borderRadius:2,background:c.color||C.blue,flexShrink:0 }}/>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:"0.82rem",fontWeight:600,color:C.dark,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{c.matiere}</div>
                  <div style={{ fontSize:"0.72rem",color:C.muted }}>{c.heureDebut}–{c.heureFin} · {c.salle}</div>
                </div>
              </div>
            ))}
          <button style={{ ...css.btnSecondary,width:"100%",marginTop:12,fontSize:"0.82rem" }} onClick={()=>setPage("edt")}>Emploi du temps →</button>
        </div>
      )}

      <div style={css.card}>
        <span style={{ ...css.label,color:C.green,display:"block" }}>🌐 Suggestions de réseau</span>
        {suggestions.length===0
          ?<div style={{ color:C.muted,fontSize:"0.84rem" }}>Aucune suggestion.</div>
          :suggestions.map(u=>{
            const ri=getRoleInfo(u.role);
            return (
              <div key={u.uid} onClick={()=>setViewUser(u)}
                style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.border}`,cursor:"pointer" }}>
                <div style={{ width:34,height:34,borderRadius:"50%",background:u.photoURL?"transparent":ri.bg,color:ri.color,
                  display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:"0.72rem",overflow:"hidden",flexShrink:0 }}>
                  {u.photoURL?<img src={u.photoURL} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(u.avatar||u.name?.slice(0,2))}
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:"0.82rem",fontWeight:600,color:C.navy,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{u.name}</div>
                  <div style={{ fontSize:"0.7rem",color:C.muted }}>{ri.icon} {ri.label}</div>
                </div>
              </div>
            );
          })}
        <button style={{ ...css.btnSecondary,width:"100%",marginTop:12,fontSize:"0.82rem" }} onClick={()=>onGoToReseau?onGoToReseau():setPage("social")}>Voir le réseau →</button>
      </div>

      {role==="etudiant"&&offres.length>0&&(
        <div style={css.card}>
          <span style={{ ...css.label,color:C.gold,display:"block" }}>🎓 Offres Alumni</span>
          {offres.slice(0,3).map(o=>(
            <div key={o.id} onClick={()=>setPage("alumni")} style={{ padding:"7px 0",borderBottom:`1px solid ${C.border}`,cursor:"pointer" }}>
              <div style={{ fontSize:"0.83rem",fontWeight:600,color:C.navy,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{o.titre}</div>
              <div style={{ fontSize:"0.75rem",color:C.mid }}>{o.ent}</div>
            </div>
          ))}
          <button style={{ ...css.btnSecondary,width:"100%",marginTop:12,fontSize:"0.82rem" }} onClick={()=>setPage("alumni")}>Espace Alumni →</button>
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* ProfilExterne monté au niveau root pour s'afficher par-dessus tout */}
      {viewUser && (
        <ProfilExterne
          user={viewUser}
          onClose={()=>setViewUser(null)}
          onMessage={()=>{ setViewUser(null); /* la bulle messages s'ouvre via FAB */ }}
        />
      )}

      {isMobile ? (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {CenterCol}{RightCol}{LeftCol}
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"260px 1fr 300px", gap:16, alignItems:"start" }}>
          {LeftCol}{CenterCol}{RightCol}
        </div>
      )}
    </div>
  );
}
