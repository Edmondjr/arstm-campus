// src/pages/Accueil.jsx  — fil LinkedIn complet : upload media, commentaires, partage interne + externe
import { useState, useRef, useCallback } from "react";
import { C, ROLES, GRADIENTS, SHADOWS, css } from "../design";
import {
  useAnnonces, useEDT, useRessources, useOffres, usePosts,
  addDocument, updateDocument, useCollection,
  useComments, addComment, deleteComment, sendNotif,
} from "../hooks/useFirestore";
import { useAuth } from "../AuthContext";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

const JOURS = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
const MOIS  = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
const REACTIONS = ["❤️","👍","🔥","🙏","😂","😮","🎉","💯"];
const MAX_IMG = 10 * 1024 * 1024;
const MAX_VID = 50 * 1024 * 1024;

const getRoleInfo = r => ROLES.find(x => x.id === r) || { color:C.blue, bg:C.blueLight, icon:"👤", label:r };

function fmtTime(ts) {
  if (!ts?.toDate) return "";
  const d = ts.toDate(), now = Date.now(), diff = now - d.getTime();
  if (diff < 60000)   return "à l'instant";
  if (diff < 3600000) return `il y a ${Math.floor(diff/60000)} min`;
  if (diff < 86400000)return `il y a ${Math.floor(diff/3600000)}h`;
  return d.toLocaleDateString("fr-FR", { day:"2-digit", month:"short" });
}

// ── Composer de publication ───────────────────────────────────────────────────
function PostComposer({ profile, onPublish }) {
  const { user } = useAuth();
  const roleInfo = getRoleInfo(profile?.role);
  const [text, setText]       = useState("");
  const [mediaFile, setMedia] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mediaType, setType]  = useState(null);
  const [progress, setProg]   = useState(0);
  const [uploading, setUpl]   = useState(false);
  const [saving, setSaving]   = useState(false);
  const fileRef = useRef();

  const handleMedia = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const isVideo = f.type.startsWith("video/");
    const isImage = f.type.startsWith("image/");
    if (!isVideo && !isImage) { alert("Image ou vidéo uniquement."); return; }
    if (isImage && f.size > MAX_IMG) { alert("Image max 10 Mo."); return; }
    if (isVideo && f.size > MAX_VID) { alert("Vidéo max 50 Mo."); return; }
    setMedia(f); setType(isVideo ? "video" : "image");
    setPreview(URL.createObjectURL(f));
  };

  const publish = async () => {
    if (!text.trim() && !mediaFile) return;
    setSaving(true);
    let mediaUrl = null;
    if (mediaFile) {
      setUpl(true);
      const uid = user?.uid || "anon";
      const path = `posts/${uid}/${Date.now()}_${mediaFile.name}`;
      const task = uploadBytesResumable(ref(storage, path), mediaFile);
      await new Promise((resolve, reject) => {
        task.on("state_changed",
          snap => setProg(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
          reject,
          async () => { mediaUrl = await getDownloadURL(task.snapshot.ref); resolve(); }
        );
      });
      setUpl(false);
    }
    await onPublish(text.trim(), mediaUrl, mediaType);
    setText(""); setMedia(null); setPreview(null); setType(null); setProg(0); setSaving(false);
  };

  return (
    <div style={{ ...css.card, marginBottom:14 }}>
      {/* En-tête : avatar + textarea */}
      <div style={{ display:"flex", gap:10, marginBottom:10 }}>
        <div style={{ width:40, height:40, borderRadius:"50%", flexShrink:0, overflow:"hidden",
          background: profile.photoURL ? "transparent" : roleInfo.bg, color:roleInfo.color,
          display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:"0.85rem",
          border:`2px solid ${roleInfo.color}20` }}>
          {profile.photoURL ? <img src={profile.photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : (profile.avatar||profile.name?.slice(0,2))}
        </div>
        <textarea
          style={{ ...css.input, resize:"none", minHeight:72, flex:1, borderRadius:12, lineHeight:1.6 }}
          placeholder="Partagez quelque chose avec la communauté ARSTM…"
          value={text} onChange={e => setText(e.target.value)}
        />
      </div>

      {/* Aperçu media */}
      {preview && (
        <div style={{ position:"relative", marginBottom:10, borderRadius:12, overflow:"hidden", background:"#000" }}>
          {mediaType === "video"
            ? <video src={preview} controls style={{ width:"100%", maxHeight:220, display:"block" }}/>
            : <img src={preview} alt="" style={{ width:"100%", maxHeight:280, objectFit:"cover", display:"block" }}/>}
          <button onClick={() => { setMedia(null); setPreview(null); setType(null); }}
            style={{ position:"absolute", top:8, right:8, width:28, height:28, borderRadius:"50%", background:"rgba(0,0,0,0.6)", color:"#fff", border:"none", cursor:"pointer", fontSize:"0.85rem", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>
      )}

      {/* Barre de progression */}
      {uploading && (
        <div style={{ marginBottom:10 }}>
          <div style={{ background:C.surfaceAlt, borderRadius:100, height:6, overflow:"hidden" }}>
            <div style={{ width:`${progress}%`, height:"100%", background:`linear-gradient(90deg,${C.blue},${C.aqua})`, borderRadius:100, transition:"width 0.3s" }}/>
          </div>
          <div style={{ fontSize:"0.72rem", color:C.muted, marginTop:3 }}>Upload {progress}%…</div>
        </div>
      )}

      {/* Actions bas */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", gap:6 }}>
          <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display:"none" }} onChange={handleMedia}/>
          <button onClick={() => fileRef.current?.click()}
            style={{ padding:"7px 12px", borderRadius:20, border:`1px solid ${C.border}`, background:"#fff", cursor:"pointer", fontSize:"0.8rem", color:C.mid, fontFamily:"inherit", display:"flex", alignItems:"center", gap:5, transition:"all 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = C.surfaceAlt}
            onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
            🖼 Photo/Vidéo
          </button>
        </div>
        <button
          onClick={publish}
          disabled={saving || uploading || (!text.trim() && !mediaFile)}
          style={{ ...css.btnPrimary, borderRadius:20, opacity:(saving || uploading || (!text.trim() && !mediaFile)) ? 0.55 : 1 }}>
          {saving ? (uploading ? `⬆ ${progress}%` : "Publication…") : "Publier →"}
        </button>
      </div>
    </div>
  );
}

// ── Section commentaires ──────────────────────────────────────────────────────
function CommentsSection({ postId, postAuthorUid, profile }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const { comments } = useComments(postId);
  const [text, setText]   = useState("");
  const [sending, setSending] = useState(false);
  const roleInfo = getRoleInfo(profile?.role);

  const submit = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    await addComment(postId, {
      auteurUid: uid,
      auteur:    profile.name,
      avatar:    profile.avatar || profile.name?.slice(0,2),
      photoURL:  profile.photoURL || null,
      role:      profile.role,
      texte:     text.trim(),
    });
    if (postAuthorUid && postAuthorUid !== uid) {
      await sendNotif(postAuthorUid, {
        type:"comment", fromName:profile.name,
        fromAvatar: profile.avatar || profile.name?.slice(0,2),
        postId, postText: text.trim().slice(0,80),
      });
    }
    setText(""); setSending(false);
  };

  return (
    <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${C.border}` }}>
      {comments.map(c => {
        const cr = getRoleInfo(c.role);
        return (
          <div key={c.id} style={{ display:"flex", gap:8, marginBottom:10 }}>
            <div style={{ width:30, height:30, borderRadius:"50%", background:c.photoURL?"transparent":cr.bg, color:cr.color,
              display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:"0.65rem", overflow:"hidden", flexShrink:0 }}>
              {c.photoURL ? <img src={c.photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : (c.avatar||c.auteur?.slice(0,2))}
            </div>
            <div style={{ flex:1, background:C.surfaceAlt, borderRadius:"0 12px 12px 12px", padding:"7px 10px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:2 }}>
                <span style={{ fontWeight:700, fontSize:"0.78rem", color:C.navy }}>{c.auteur}</span>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <span style={{ fontSize:"0.67rem", color:C.muted }}>{fmtTime(c.createdAt)}</span>
                  {c.auteurUid === uid && (
                    <button onClick={() => deleteComment(postId, c.id, c.auteurUid, uid)}
                      style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, fontSize:"0.72rem", padding:0 }}>✕</button>
                  )}
                </div>
              </div>
              <p style={{ fontSize:"0.82rem", lineHeight:1.5, color:C.dark, margin:0 }}>{c.texte}</p>
            </div>
          </div>
        );
      })}

      {/* Zone de saisie */}
      <div style={{ display:"flex", gap:8, marginTop:4 }}>
        <div style={{ width:30, height:30, borderRadius:"50%", background:profile.photoURL?"transparent":roleInfo.bg, color:roleInfo.color,
          display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:"0.65rem", overflow:"hidden", flexShrink:0 }}>
          {profile.photoURL ? <img src={profile.photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : (profile.avatar||profile.name?.slice(0,2))}
        </div>
        <div style={{ flex:1, display:"flex", gap:6 }}>
          <input
            style={{ ...css.input, flex:1, borderRadius:20, padding:"7px 14px", fontSize:"0.83rem" }}
            placeholder="Écrire un commentaire…"
            value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && submit()}
          />
          <button onClick={submit} disabled={sending || !text.trim()}
            style={{ ...css.btnPrimary, borderRadius:20, padding:"7px 14px", fontSize:"0.8rem", opacity:(!text.trim()||sending)?0.55:1 }}>
            ↗
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal partage externe ─────────────────────────────────────────────────────
function ShareModal({ post, onClose, onRepost }) {
  const appUrl = window.location.href;
  const shareText = `${post.auteur} sur ARSTM Campus :\n\n"${(post.texte||"").slice(0,200)}"\n\n${appUrl}`;
  const encoded   = encodeURIComponent(shareText);

  const nativeShare = () => {
    if (navigator.share) {
      navigator.share({ title:"ARSTM Campus", text:post.texte || "", url:appUrl }).catch(()=>{});
    }
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:3000, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"flex-end", justifyContent:"center", padding:0 }}>
      <div onClick={e => e.stopPropagation()} className="animate-slide-up"
        style={{ background:"#fff", borderRadius:"22px 22px 0 0", width:"100%", maxWidth:480, padding:"24px 20px 32px", boxShadow:"0 -8px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ width:36, height:4, borderRadius:2, background:C.border, margin:"0 auto 20px" }}/>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1rem", color:C.navy, marginBottom:16 }}>Partager cette publication</div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
          {/* Repost interne */}
          <button onClick={() => { onRepost(); onClose(); }}
            style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, padding:"14px 10px", borderRadius:14, border:`1px solid ${C.border}`, background:"#fff", cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = C.surfaceAlt}
            onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
            <span style={{ fontSize:"1.5rem" }}>🔁</span>
            <span style={{ fontSize:"0.78rem", fontWeight:600, color:C.navy }}>Republier</span>
            <span style={{ fontSize:"0.68rem", color:C.muted }}>Dans le fil ARSTM</span>
          </button>

          {/* WhatsApp */}
          <a href={`https://wa.me/?text=${encoded}`} target="_blank" rel="noreferrer"
            onClick={onClose}
            style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, padding:"14px 10px", borderRadius:14, border:"1px solid #bbf7d0", background:"#f0fdf4", textDecoration:"none", transition:"all 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "#dcfce7"}
            onMouseLeave={e => e.currentTarget.style.background = "#f0fdf4"}>
            <span style={{ fontSize:"1.5rem" }}>💚</span>
            <span style={{ fontSize:"0.78rem", fontWeight:600, color:"#059669" }}>WhatsApp</span>
            <span style={{ fontSize:"0.68rem", color:"#059669" }}>Envoyer à un contact</span>
          </a>

          {/* Facebook */}
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(appUrl)}&quote=${encodeURIComponent((post.texte||"").slice(0,200))}`}
            target="_blank" rel="noreferrer" onClick={onClose}
            style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, padding:"14px 10px", borderRadius:14, border:"1px solid #bfdbfe", background:"#eff6ff", textDecoration:"none", transition:"all 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "#dbeafe"}
            onMouseLeave={e => e.currentTarget.style.background = "#eff6ff"}>
            <span style={{ fontSize:"1.5rem" }}>📘</span>
            <span style={{ fontSize:"0.78rem", fontWeight:600, color:"#1d4ed8" }}>Facebook</span>
            <span style={{ fontSize:"0.68rem", color:"#1d4ed8" }}>Partager sur FB</span>
          </a>

          {/* Partage natif / Copier lien */}
          <button onClick={() => {
              if (navigator.share) { nativeShare(); }
              else { navigator.clipboard?.writeText(shareText); onClose(); alert("Texte copié !"); }
            }}
            style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, padding:"14px 10px", borderRadius:14, border:`1px solid ${C.border}`, background:"#fff", cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = C.surfaceAlt}
            onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
            <span style={{ fontSize:"1.5rem" }}>📋</span>
            <span style={{ fontSize:"0.78rem", fontWeight:600, color:C.navy }}>
              {navigator.share ? "Partager" : "Copier le texte"}
            </span>
            <span style={{ fontSize:"0.68rem", color:C.muted }}>
              {navigator.share ? "Via votre téléphone" : "Presse-papiers"}
            </span>
          </button>
        </div>

        <button onClick={onClose} style={{ width:"100%", padding:"12px", borderRadius:12, border:`1px solid ${C.border}`, background:"#fff", fontFamily:"inherit", fontWeight:600, fontSize:"0.88rem", color:C.mid, cursor:"pointer" }}>
          Annuler
        </button>
      </div>
    </div>
  );
}

// ── Carte de post (FeedPost) ──────────────────────────────────────────────────
function FeedPost({ p, uid, profile, onReact, onRepost }) {
  const [showReactions, setShowReactions] = useState(false);
  const [showComments, setShowComments]   = useState(false);
  const [showShare, setShowShare]         = useState(false);
  const [expanded, setExpanded]           = useState(false);
  const [reposted, setReposted]           = useState(false);

  const r         = getRoleInfo(p.role);
  const reactions = p.reactions || {};
  const total     = Object.values(reactions).reduce((s, a) => s + a.length, 0);
  const userReaction = REACTIONS.find(e => (reactions[e]||[]).includes(uid));
  const commentCount = p.commentCount || 0;
  const shareCount   = p.shareCount   || 0;
  const isLong = (p.texte?.length || 0) > 220;
  const text   = isLong && !expanded ? p.texte.slice(0,220)+"…" : p.texte;

  const handleRepost = async () => {
    await onRepost(p);
    setReposted(true);
    setTimeout(() => setReposted(false), 2500);
  };

  return (
    <div style={{ ...css.card, marginBottom:12 }}>
      {/* En-tête auteur */}
      <div style={{ display:"flex", gap:10, marginBottom:10 }}>
        <div style={{ width:42, height:42, borderRadius:"50%", background:p.photoURL?"transparent":r.bg,
          color:r.color, display:"flex", alignItems:"center", justifyContent:"center",
          fontWeight:700, fontSize:"0.85rem", flexShrink:0, overflow:"hidden", border:`2px solid ${r.color}20` }}>
          {p.photoURL ? <img src={p.photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : (p.avatar||p.auteur?.slice(0,2))}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <span style={{ fontWeight:700, fontSize:"0.9rem", color:C.navy }}>{p.auteur}</span>
            <span style={{ fontSize:"0.7rem", color:C.muted, flexShrink:0 }}>{fmtTime(p.createdAt)}</span>
          </div>
          <div style={{ display:"flex", gap:5, marginTop:3, flexWrap:"wrap" }}>
            <span style={{ ...css.badge(r.bg,r.color), fontSize:"0.68rem" }}>{r.icon} {r.label}</span>
            {p.promo && <span style={{ ...css.badge(C.surfaceAlt,C.mid), fontSize:"0.68rem" }}>{p.promo}</span>}
          </div>
        </div>
      </div>

      {/* Texte */}
      {p.texte && <p style={{ fontSize:"0.88rem", lineHeight:1.75, color:C.dark, marginBottom: isLong ? 4 : 10 }}>{text}</p>}
      {isLong && (
        <button onClick={() => setExpanded(!expanded)}
          style={{ background:"none", border:"none", color:C.blue, fontSize:"0.82rem", cursor:"pointer", padding:"0 0 8px", fontFamily:"inherit" }}>
          {expanded ? "Voir moins ▲" : "Voir plus ▼"}
        </button>
      )}

      {/* Media */}
      {p.mediaUrl && (
        <div style={{ marginBottom:10, borderRadius:12, overflow:"hidden", background:"#000" }}>
          {p.mediaType === "video"
            ? <video controls src={p.mediaUrl} style={{ width:"100%", maxHeight:340, display:"block" }}/>
            : <img src={p.mediaUrl} alt="" style={{ width:"100%", maxHeight:400, objectFit:"cover", display:"block" }}/>}
        </div>
      )}

      {/* Repost d'un post original */}
      {p.sharedFrom && (
        <div style={{ border:`1px solid ${C.border}`, borderRadius:12, padding:"10px 12px", marginBottom:10, background:C.surfaceAlt }}>
          <div style={{ fontSize:"0.78rem", fontWeight:700, color:C.navy, marginBottom:4 }}>🔁 {p.sharedFrom.auteur}</div>
          {p.sharedFrom.texte && <p style={{ fontSize:"0.82rem", lineHeight:1.6, color:C.dark, margin:0 }}>{p.sharedFrom.texte}</p>}
          {p.sharedFrom.mediaUrl && p.sharedFrom.mediaType !== "video" && (
            <img src={p.sharedFrom.mediaUrl} alt="" style={{ width:"100%", maxHeight:200, objectFit:"cover", borderRadius:8, marginTop:8, display:"block" }}/>
          )}
        </div>
      )}

      {/* Compteurs réactions */}
      {total > 0 && (
        <div style={{ display:"flex", gap:4, marginBottom:8, flexWrap:"wrap" }}>
          {REACTIONS.filter(e => (reactions[e]||[]).length > 0).map(e => (
            <span key={e} style={{ fontSize:"0.78rem", background:C.surfaceAlt, borderRadius:100, padding:"2px 8px", cursor:"pointer" }}
              onClick={() => onReact(p, e)}>
              {e} {reactions[e].length}
            </span>
          ))}
        </div>
      )}

      {/* Séparateur + boutons d'action */}
      <div style={{ height:1, background:C.border, margin:"0 0 10px" }}/>
      <div style={{ display:"flex", gap:2, alignItems:"center", flexWrap:"wrap" }}>

        {/* Réagir */}
        <div style={{ position:"relative" }}>
          <button onClick={() => setShowReactions(!showReactions)}
            style={{ background:"none", border:"none", cursor:"pointer", color:userReaction?C.red:C.muted,
              fontSize:"0.83rem", padding:"5px 8px", borderRadius:8, display:"flex", alignItems:"center", gap:4, fontFamily:"inherit",
              transition:"background 0.12s" }}
            onMouseEnter={e => e.currentTarget.style.background = C.surfaceAlt}
            onMouseLeave={e => e.currentTarget.style.background = "none"}>
            {userReaction || "🤍"} <span>{total > 0 ? total : "Réagir"}</span>
          </button>
          {showReactions && (
            <div style={{ position:"absolute", bottom:"calc(100% + 6px)", left:0, zIndex:200,
              background:"#fff", borderRadius:14, boxShadow:SHADOWS.lg,
              border:`1px solid ${C.border}`, padding:"6px 8px", display:"flex", gap:4 }}>
              {REACTIONS.map(e => (
                <button key={e} onClick={() => { onReact(p, e); setShowReactions(false); }}
                  style={{ background:"none", border:"none", cursor:"pointer", fontSize:"1.15rem", padding:"4px 3px", borderRadius:8,
                    transform:(reactions[e]||[]).includes(uid)?"scale(1.35)":"scale(1)", transition:"transform 0.1s" }}>{e}</button>
              ))}
            </div>
          )}
        </div>

        {/* Commenter */}
        <button onClick={() => setShowComments(!showComments)}
          style={{ background:"none", border:"none", cursor:"pointer", color:showComments?C.blue:C.muted,
            fontSize:"0.83rem", padding:"5px 8px", borderRadius:8, display:"flex", alignItems:"center", gap:4, fontFamily:"inherit",
            transition:"background 0.12s" }}
          onMouseEnter={e => e.currentTarget.style.background = C.surfaceAlt}
          onMouseLeave={e => e.currentTarget.style.background = "none"}>
          💬 <span>{commentCount > 0 ? commentCount : "Commenter"}</span>
        </button>

        {/* Partager */}
        <button onClick={() => setShowShare(true)}
          style={{ background:"none", border:"none", cursor:"pointer", color:reposted?C.green:C.muted,
            fontSize:"0.83rem", padding:"5px 8px", borderRadius:8, display:"flex", alignItems:"center", gap:4, fontFamily:"inherit",
            transition:"background 0.12s" }}
          onMouseEnter={e => e.currentTarget.style.background = C.surfaceAlt}
          onMouseLeave={e => e.currentTarget.style.background = "none"}>
          {reposted ? "✓ Partagé" : `🔁 ${shareCount > 0 ? shareCount : "Partager"}`}
        </button>
      </div>

      {/* Commentaires */}
      {showComments && (
        <CommentsSection postId={p.id} postAuthorUid={p.auteurUid} profile={profile} />
      )}

      {/* Modal partage externe */}
      {showShare && (
        <ShareModal
          post={p}
          onClose={() => setShowShare(false)}
          onRepost={handleRepost}
        />
      )}
    </div>
  );
}

// ── Page Accueil principale ───────────────────────────────────────────────────
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

  const urgent = annonces.filter(a => a.urgent);
  const jours  = Object.keys(edt);
  const today  = jours[0];
  const cours  = today ? edt[today] : [];

  const suggestions = allUsers.filter(u => u.status === "approved" && u.uid !== user?.uid).slice(0,4);

  // Publier un post (avec ou sans media)
  const publish = useCallback(async (texte, mediaUrl, mediaType) => {
    await addDocument("posts", {
      auteur:      profile.name,
      auteurUid:   user?.uid,
      avatar:      profile.avatar || profile.name?.slice(0,2),
      photoURL:    profile.photoURL || null,
      role:        profile.role,
      promo:       profile.promo,
      texte,
      ...(mediaUrl ? { mediaUrl, mediaType } : {}),
      likes:        [],
      reactions:    {},
      commentCount: 0,
      shareCount:   0,
    });
  }, [profile, user?.uid]);

  // Réagir à un post
  const react = useCallback(async (post, emoji) => {
    const uid = user?.uid; if (!uid) return;
    const reactions = post.reactions || {};
    const curr = reactions[emoji] || [];
    const has  = curr.includes(uid);
    await updateDocument("posts", post.id, {
      reactions: { ...reactions, [emoji]: has ? curr.filter(id=>id!==uid) : [...curr, uid] }
    });
  }, [user?.uid]);

  // Repost interne
  const repost = useCallback(async (post) => {
    const uid = user?.uid; if (!uid) return;
    const origin = post.sharedFrom || {
      originalId: post.id, auteur: post.auteur, auteurUid: post.auteurUid,
      avatar: post.avatar, role: post.role, promo: post.promo,
      photoURL: post.photoURL || null, texte: post.texte || "",
      ...(post.mediaUrl ? { mediaUrl:post.mediaUrl, mediaType:post.mediaType } : {}),
    };
    await addDocument("posts", {
      auteur: profile.name, auteurUid: uid,
      avatar: profile.avatar || profile.name?.slice(0,2),
      photoURL: profile.photoURL || null,
      role: profile.role, promo: profile.promo,
      texte: "", sharedFrom: origin,
      likes:[], reactions:{}, commentCount:0, shareCount:0,
    });
    await updateDocument("posts", post.sharedFrom?.originalId || post.id, { shareCount:(post.shareCount||0)+1 });
    if (origin.auteurUid && origin.auteurUid !== uid) {
      await sendNotif(origin.auteurUid, { type:"share", fromName:profile.name,
        fromAvatar: profile.avatar||profile.name?.slice(0,2),
        postId: origin.originalId, postText:(origin.texte||"").slice(0,80) });
    }
  }, [profile, user?.uid]);

  // ── Colonne gauche : carte profil + actions rapides ──
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
            <span style={{ ...css.badge(roleInfo.bg,roleInfo.color), fontWeight:700 }}>{roleInfo.icon} {roleInfo.label}</span>
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
            <button style={{ ...css.btnSm, textAlign:"left", padding:"9px 12px", borderRadius:9, fontSize:"0.82rem" }} onClick={() => setPage("social")}>👥 Groupes & Réseau</button>
          </>}
          {role==="enseignant" && <>
            <button style={{ ...css.btnSm, textAlign:"left", padding:"9px 12px", borderRadius:9, fontSize:"0.82rem" }} onClick={() => setPage("ressources")}>📤 Déposer un cours</button>
            <button style={{ ...css.btnSm, textAlign:"left", padding:"9px 12px", borderRadius:9, fontSize:"0.82rem" }} onClick={() => setPage("annonces")}>📢 Publier une annonce</button>
            <button style={{ ...css.btnSm, textAlign:"left", padding:"9px 12px", borderRadius:9, fontSize:"0.82rem" }} onClick={() => setPage("social")}>👥 Communauté</button>
          </>}
          {role==="alumni" && <>
            <button style={{ ...css.btnSm, textAlign:"left", padding:"9px 12px", borderRadius:9, fontSize:"0.82rem" }} onClick={() => setPage("alumni")}>💼 Publier une offre</button>
            <button style={{ ...css.btnSm, textAlign:"left", padding:"9px 12px", borderRadius:9, fontSize:"0.82rem" }} onClick={() => setPage("social")}>👥 Social ARSTM</button>
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

  // ── Colonne centrale : composer + fil ──
  const CenterCol = (
    <div>
      <PostComposer profile={profile} onPublish={publish} />
      {posts.length === 0 ? (
        <div style={{ ...css.card, textAlign:"center", padding:48, color:C.muted }}>
          <div style={{ fontSize:"2.5rem", marginBottom:12 }}>💬</div>
          <div style={{ fontWeight:600, color:C.navy, marginBottom:6 }}>Aucune publication</div>
          <div style={{ fontSize:"0.84rem" }}>Soyez le premier à partager quelque chose !</div>
        </div>
      ) : posts.map(p => (
        <FeedPost key={p.id} p={p} uid={user?.uid} profile={profile} onReact={react} onRepost={repost} />
      ))}
    </div>
  );

  // ── Colonne droite : annonces urgentes, cours, réseau, offres ──
  const RightCol = (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={css.card}>
        <span style={{ ...css.label, color:C.red, display:"block" }}>🔴 Annonces urgentes</span>
        {urgent.length === 0
          ? <div style={{ color:C.muted, fontSize:"0.84rem", padding:"8px 0" }}>Aucune annonce urgente.</div>
          : urgent.slice(0,3).map(a => (
            <div key={a.id} onClick={() => setPage("annonces")} style={{ padding:"9px 0", borderBottom:`1px solid ${C.border}`, cursor:"pointer" }}>
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
                <div style={{ width:3, height:24, borderRadius:2, background:c.color||C.blue, flexShrink:0 }}/>
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
              <div key={u.uid} onClick={() => onGoToReseau ? onGoToReseau() : setPage("social")}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:`1px solid ${C.border}`, cursor:"pointer" }}>
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
        <button style={{ ...css.btnSecondary, width:"100%", marginTop:12, fontSize:"0.82rem" }} onClick={() => onGoToReseau ? onGoToReseau() : setPage("social")}>Voir le réseau →</button>
      </div>

      {role==="etudiant" && offres.length > 0 && (
        <div style={css.card}>
          <span style={{ ...css.label, color:C.gold, display:"block" }}>🎓 Offres Alumni</span>
          {offres.slice(0,3).map(o => (
            <div key={o.id} onClick={() => setPage("alumni")} style={{ padding:"7px 0", borderBottom:`1px solid ${C.border}`, cursor:"pointer" }}>
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
