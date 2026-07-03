// src/pages/Social.jsx
import { useState, useCallback, useRef } from "react";
import { C, css, ROLES } from "../design";
import { usePosts, addDocument, updateDocument, useCollection, useComments, addComment, deleteComment, sendNotif } from "../hooks/useFirestore";
import { useAuth } from "../AuthContext";
import { ProfilExterne } from "./Profil";
import PageMessages from "./Messages";
import PageGroups from "./Groups";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

const REACTIONS = ["❤️","👍","🔥","🙏","😂","😮","🎉","💯"];
const MAX_LEN = 200;
const MAX_IMG = 5 * 1024 * 1024;
const MAX_VID = 50 * 1024 * 1024;

const getRoleInfo = r => ROLES.find(x => x.id===r) || { color:C.blue, bg:C.blueLight, icon:"👤", label:r };

// ── Texte avec formatage riche ─────────────────────────────────────────────────
function FormattedText({ text, style = {} }) {
  if (!text) return null;
  const html = (text + "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/==([\s\S]+?)==/g, "<mark style='background:#fef08a;padding:0 2px;border-radius:3px'>$1</mark>")
    .replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__([\s\S]+?)__/g, "<u>$1</u>")
    .replace(/_([\s\S]+?)_/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
  return <span style={style} dangerouslySetInnerHTML={{ __html: html }}/>;
}

// ── Lightbox plein écran ───────────────────────────────────────────────────────
function Lightbox({ src, onClose }) {
  if (!src) return null;
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:9000, background:"rgba(0,0,0,0.93)",
      display:"flex", alignItems:"center", justifyContent:"center", cursor:"zoom-out" }}>
      <button onClick={onClose} style={{ position:"absolute", top:16, right:16, width:38, height:38, borderRadius:"50%",
        background:"rgba(255,255,255,0.18)", border:"none", color:"#fff", cursor:"pointer", fontSize:"1.15rem",
        display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }}>✕</button>
      <img src={src} alt="" onClick={e=>e.stopPropagation()}
        style={{ maxWidth:"96vw", maxHeight:"92vh", objectFit:"contain", borderRadius:10,
          boxShadow:"0 8px 40px rgba(0,0,0,0.6)", cursor:"default" }}/>
    </div>
  );
}

// ── Modal "Qui a réagi" ────────────────────────────────────────────────────────
function ReactorsModal({ reactions, emoji, allUsers, onClose }) {
  const uids  = emoji ? (reactions[emoji]||[]) : [...new Set(Object.values(reactions).flat())];
  const users = uids.map(uid => allUsers.find(u => u.uid===uid)).filter(Boolean);
  const emojiCounts = Object.entries(reactions).filter(([,v]) => v.length > 0);
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:4000, background:"rgba(0,0,0,0.55)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:360,
        maxHeight:"72vh", display:"flex", flexDirection:"column", boxShadow:"0 24px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ padding:"14px 16px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, color:C.navy }}>
            {emoji ? `${emoji} ${users.length} réaction${users.length>1?"s":""}` : `${users.length} réaction${users.length>1?"s":""} au total`}
          </span>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:"50%", border:"none", background:C.surfaceAlt, cursor:"pointer", fontSize:"0.85rem" }}>✕</button>
        </div>
        {!emoji && emojiCounts.length > 0 && (
          <div style={{ display:"flex", gap:6, padding:"8px 16px", borderBottom:`1px solid ${C.border}`, flexWrap:"wrap", flexShrink:0 }}>
            {emojiCounts.map(([e,v]) => (
              <span key={e} style={{ fontSize:"0.8rem", padding:"3px 8px", borderRadius:20, background:C.surfaceAlt }}>{e} {v.length}</span>
            ))}
          </div>
        )}
        <div style={{ overflowY:"auto", flex:1, padding:"8px 0" }}>
          {users.length === 0
            ? <div style={{ padding:"24px", textAlign:"center", color:C.muted, fontSize:"0.84rem" }}>Aucune donnée disponible</div>
            : users.map(u => {
                const ri = getRoleInfo(u.role);
                return (
                  <div key={u.uid} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 16px" }}>
                    <div style={{ width:34, height:34, borderRadius:"50%", background:u.photoURL?"transparent":ri.bg, color:ri.color,
                      display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:"0.72rem", overflow:"hidden", flexShrink:0 }}>
                      {u.photoURL ? <img src={u.photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : (u.avatar||u.name?.slice(0,2))}
                    </div>
                    <div>
                      <div style={{ fontSize:"0.86rem", fontWeight:600, color:C.navy }}>{u.name}</div>
                      <div style={{ fontSize:"0.73rem", color:C.muted }}>{ri.icon} {ri.label}</div>
                    </div>
                  </div>
                );
              })
          }
        </div>
      </div>
    </div>
  );
}

// ── Section commentaires ──────────────────────────────────────────────────────
function CommentsSection({ postId, postAuthorUid, profile }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const { comments } = useComments(postId);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const data = {
      auteurUid: uid,
      auteur:    profile.name,
      avatar:    profile.avatar || profile.name?.slice(0,2),
      photoURL:  profile.photoURL || null,
      role:      profile.role,
      texte:     text.trim(),
    };
    await addComment(postId, data);
    if (postAuthorUid && postAuthorUid !== uid) {
      await sendNotif(postAuthorUid, {
        type:      "comment",
        fromName:  profile.name,
        fromAvatar:profile.avatar || profile.name?.slice(0,2),
        postId,
        postText:  text.trim().slice(0,80),
      });
    }
    setText(""); setSending(false);
  };

  const r = getRoleInfo(profile.role);

  return (
    <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
      {comments.map(c => {
        const cr = getRoleInfo(c.role);
        const isOwn = c.auteurUid === uid;
        return (
          <div key={c.id} style={{ display:"flex", gap:8, marginBottom:10 }}>
            <div style={{ width:30, height:30, borderRadius:"50%", background:c.photoURL?"transparent":cr.bg, color:cr.color,
              display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:"0.65rem", overflow:"hidden", flexShrink:0 }}>
              {c.photoURL ? <img src={c.photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : (c.avatar||c.auteur?.slice(0,2))}
            </div>
            <div style={{ flex:1, background:C.surfaceAlt, borderRadius:"0 12px 12px 12px", padding:"7px 10px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
                <span style={{ fontWeight:700, fontSize:"0.78rem", color:C.navy }}>{c.auteur}</span>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <span style={{ fontSize:"0.67rem", color:C.muted }}>
                    {c.createdAt?.toDate?.()?.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})||""}
                  </span>
                  {isOwn && (
                    <button onClick={() => deleteComment(postId, c.id, c.auteurUid, uid)}
                      style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, fontSize:"0.75rem", padding:0 }}>✕</button>
                  )}
                </div>
              </div>
              <p style={{ fontSize:"0.82rem", lineHeight:1.5, color:C.dark, margin:0 }}>{c.texte}</p>
            </div>
          </div>
        );
      })}
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <div style={{ width:28, height:28, borderRadius:"50%", background:profile.photoURL?"transparent":r.bg, color:r.color,
          display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:"0.62rem", overflow:"hidden", flexShrink:0 }}>
          {profile.photoURL ? <img src={profile.photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : (profile.avatar||profile.name?.slice(0,2))}
        </div>
        <div style={{ flex:1, display:"flex", gap:6 }}>
          <input style={{ ...css.input, flex:1, fontSize:"0.83rem", padding:"7px 12px", borderRadius:20 }}
            placeholder="Écrire un commentaire…"
            value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key==="Enter" && submit()} />
          <button onClick={submit} disabled={!text.trim()||sending}
            style={{ ...css.btnPrimary, padding:"7px 14px", borderRadius:20, fontSize:"0.78rem", opacity:(!text.trim()||sending)?0.5:1 }}>
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Carte de post ─────────────────────────────────────────────────────────────
function PostCard({ p, uid, profile, onReact, onOpenProfil, onShare, allUsers = [] }) {
  const [showReactions, setShowReactions] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [shared, setShared] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [showReactors, setShowReactors] = useState(null);

  const shareCount = p.shareCount || 0;
  const r = getRoleInfo(p.role);
  const reactions = p.reactions || {};
  const total = Object.values(reactions).reduce((s, a) => s + a.length, 0);
  const userReaction = REACTIONS.find(e => (reactions[e]||[]).includes(uid));
  const isLong = p.texte?.length > MAX_LEN;
  const text = isLong && !expanded ? p.texte.slice(0,MAX_LEN)+"…" : p.texte;
  const commentCount = p.commentCount || p.comments?.length || 0;

  return (
    <div style={{ ...css.card, marginBottom:12 }}>
      {lightboxImg && <Lightbox src={lightboxImg} onClose={() => setLightboxImg(null)}/>}
      {showReactors !== null && (
        <ReactorsModal reactions={reactions} emoji={showReactors||""} allUsers={allUsers} onClose={() => setShowReactors(null)}/>
      )}

      {/* Auteur */}
      <div style={{ display:"flex", gap:10, marginBottom:10 }}>
        <div onClick={() => onOpenProfil(p.auteurUid, p)}
          style={{ width:42, height:42, borderRadius:"50%", background:p.photoURL?"transparent":r.bg, color:r.color,
            display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:"0.88rem",
            flexShrink:0, cursor:"pointer", overflow:"hidden", border:`2px solid ${r.color}20` }}>
          {p.photoURL ? <img src={p.photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : (p.avatar||p.auteur?.slice(0,2))}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span onClick={() => onOpenProfil(p.auteurUid, p)} style={{ fontWeight:700, fontSize:"0.92rem", color:C.navy, cursor:"pointer" }}>{p.auteur}</span>
            <span style={{ fontSize:"0.72rem", color:C.muted }}>{p.createdAt?.toDate?.()?.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})||""}</span>
          </div>
          <div style={{ display:"flex", gap:5, marginTop:3, flexWrap:"wrap" }}>
            <span style={{ ...css.badge(r.bg,r.color), fontSize:"0.68rem" }}>{r.icon} {p.role}</span>
            {p.promo && <span style={{ ...css.badge(C.surfaceAlt,C.mid), fontSize:"0.68rem" }}>{p.promo}</span>}
          </div>
        </div>
      </div>

      {/* Texte avec formatage */}
      {p.texte && (
        <div style={{ fontSize:"0.88rem", lineHeight:1.7, color:C.dark, marginBottom:isLong?4:10 }}>
          <FormattedText text={text}/>
        </div>
      )}
      {isLong && (
        <button onClick={() => setExpanded(!expanded)}
          style={{ background:"none", border:"none", color:C.blue, fontSize:"0.82rem", cursor:"pointer", padding:"0 0 10px", fontFamily:"inherit" }}>
          {expanded ? "Voir moins ▲" : "Voir plus ▼"}
        </button>
      )}

      {/* Média */}
      {p.mediaUrl && (
        <div style={{ marginBottom:10, borderRadius:12, overflow:"hidden", maxHeight:400, cursor:p.mediaType!=="video"?"zoom-in":"default" }}>
          {p.mediaType === "video" ? (
            <video controls src={p.mediaUrl} style={{ width:"100%", maxHeight:360, objectFit:"contain", background:"#000", display:"block" }}/>
          ) : (
            <img src={p.mediaUrl} alt="media" style={{ width:"100%", maxHeight:560, objectFit:"contain", background:"#0a0a0a", display:"block" }}
              onClick={() => setLightboxImg(p.mediaUrl)}/>
          )}
        </div>
      )}

      {/* Post repartagé */}
      {p.sharedFrom && (
        <div style={{ border:`1px solid ${C.border}`, borderRadius:12, padding:"10px 12px", marginBottom:10, background:C.surfaceAlt }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
            <span style={{ fontSize:"0.72rem" }}>🔁</span>
            <span style={{ fontWeight:700, fontSize:"0.82rem", color:C.navy }}>{p.sharedFrom.auteur}</span>
            {p.sharedFrom.role && <span style={{ ...css.badge(getRoleInfo(p.sharedFrom.role).bg, getRoleInfo(p.sharedFrom.role).color), fontSize:"0.64rem" }}>{getRoleInfo(p.sharedFrom.role).icon}</span>}
          </div>
          {p.sharedFrom.texte && <div style={{ fontSize:"0.83rem", lineHeight:1.6, color:C.dark, margin:0 }}><FormattedText text={p.sharedFrom.texte}/></div>}
          {p.sharedFrom.mediaUrl && (
            <div style={{ marginTop:8, borderRadius:8, overflow:"hidden", maxHeight:240 }}>
              {p.sharedFrom.mediaType === "video"
                ? <video controls src={p.sharedFrom.mediaUrl} style={{ width:"100%", maxHeight:240, background:"#000", display:"block" }}/>
                : <img src={p.sharedFrom.mediaUrl} alt="" style={{ width:"100%", maxHeight:300, objectFit:"contain", background:"#111", display:"block", cursor:"zoom-in" }}
                    onClick={() => setLightboxImg(p.sharedFrom.mediaUrl)}/>}
            </div>
          )}
        </div>
      )}

      {/* Compteurs réactions — cliquables */}
      {total > 0 && (
        <div style={{ display:"flex", gap:4, marginBottom:8, flexWrap:"wrap" }}>
          {REACTIONS.filter(e => (reactions[e]||[]).length > 0).map(e => (
            <button key={e} onClick={() => setShowReactors(e)}
              style={{ fontSize:"0.78rem", background:C.surfaceAlt, borderRadius:100, padding:"2px 8px",
                border:"none", cursor:"pointer", fontFamily:"inherit", transition:"background 0.1s" }}
              onMouseEnter={ev => ev.currentTarget.style.background=C.blueLight}
              onMouseLeave={ev => ev.currentTarget.style.background=C.surfaceAlt}>
              {e} {reactions[e].length}
            </button>
          ))}
          <button onClick={() => setShowReactors("")}
            style={{ fontSize:"0.73rem", background:"transparent", border:"none", cursor:"pointer", color:C.muted, padding:"2px 4px", fontFamily:"inherit" }}>
            Voir tout
          </button>
        </div>
      )}

      <div style={{ height:1, background:C.border, margin:"0 0 10px" }}/>

      {/* Actions */}
      <div style={{ display:"flex", gap:8, alignItems:"center", position:"relative", flexWrap:"wrap" }}>
        <div style={{ position:"relative" }}>
          <button onClick={() => setShowReactions(!showReactions)}
            style={{ background:"none", border:"none", cursor:"pointer", color:userReaction?C.red:C.muted,
              fontSize:"0.84rem", padding:0, display:"flex", alignItems:"center", gap:5, fontFamily:"inherit" }}>
            {userReaction||"🤍"} {total>0 ? total : "Réagir"}
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
        <button onClick={() => setShowComments(!showComments)}
          style={{ background:"none", border:"none", cursor:"pointer", color:showComments?C.blue:C.muted, fontSize:"0.84rem", padding:0, fontFamily:"inherit", display:"flex", alignItems:"center", gap:4 }}>
          💬 {commentCount > 0 ? commentCount : "Commenter"}
        </button>
        <button onClick={async () => { await onShare(p); setShared(true); setTimeout(() => setShared(false), 2500); }}
          style={{ background:"none", border:"none", cursor:"pointer", color:shared?C.green:C.muted, fontSize:"0.84rem", padding:0, fontFamily:"inherit", display:"flex", alignItems:"center", gap:4 }}>
          {shared ? "✓ Partagé" : `🔁 ${shareCount > 0 ? shareCount : "Partager"}`}
        </button>
        <button onClick={() => onOpenProfil(p.auteurUid, p)}
          style={{ background:"none", border:"none", cursor:"pointer", color:C.blue, fontSize:"0.82rem", padding:0, fontFamily:"inherit", marginLeft:"auto" }}>
          Voir profil →
        </button>
      </div>

      {showComments && (
        <CommentsSection postId={p.id} postAuthorUid={p.auteurUid} profile={profile} />
      )}
    </div>
  );
}

// ── Barre de formatage ────────────────────────────────────────────────────────
function FormatToolbar({ textareaRef, setText }) {
  const wrap = (open, close) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const val = ta.value;
    const sel = val.slice(s, e);
    const newVal = val.slice(0, s) + open + sel + close + val.slice(e);
    setText(newVal);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(s + open.length, e + open.length);
    }, 10);
  };
  const btns = [
    { label:"B", title:"Gras (**)", open:"**", close:"**", style:{ fontWeight:700 } },
    { label:"I", title:"Italique (_)",  open:"_",  close:"_",  style:{ fontStyle:"italic" } },
    { label:"U", title:"Souligné (__)", open:"__", close:"__", style:{ textDecoration:"underline" } },
    { label:"S", title:"Surligner (==)", open:"==", close:"==", style:{ background:"#fef08a", borderRadius:3, padding:"0 2px" } },
  ];
  return (
    <div style={{ display:"flex", gap:4, marginBottom:8 }}>
      {btns.map(b => (
        <button key={b.label} title={b.title} onClick={() => wrap(b.open, b.close)}
          style={{ ...b.style, width:28, height:28, borderRadius:6, border:`1px solid ${C.border}`, background:C.surfaceAlt,
            cursor:"pointer", fontSize:"0.8rem", display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:"inherit", transition:"background 0.1s" }}
          onMouseEnter={ev => ev.currentTarget.style.background=C.blueLight}
          onMouseLeave={ev => ev.currentTarget.style.background=C.surfaceAlt}>
          {b.label}
        </button>
      ))}
      <span style={{ fontSize:"0.7rem", color:C.muted, display:"flex", alignItems:"center", marginLeft:4 }}>
        Sélectionner du texte puis cliquer
      </span>
    </div>
  );
}

// ── Composer de post ──────────────────────────────────────────────────────────
function PostComposer({ profile, onPublish, r }) {
  const { user } = useAuth();
  const [text, setText]             = useState("");
  const [saving, setSaving]         = useState(false);
  const [mediaFile, setMedia]       = useState(null);
  const [mediaPreview, setPreview]  = useState(null);
  const [mediaType, setType]        = useState(null);
  const [progress, setProgress]     = useState(0);
  const [uploading, setUploading]   = useState(false);
  const [rotation, setRotation]     = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast]     = useState(100);
  const [vidDuration, setVidDuration] = useState(null);

  const imgRef      = useRef();
  const vidRef      = useRef();
  const textareaRef = useRef();

  const resetMedia = () => {
    setMedia(null); setPreview(null); setType(null);
    setRotation(0); setBrightness(100); setContrast(100);
    setVidDuration(null);
  };

  const handleImage = (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) { alert("Fichier image uniquement."); return; }
    if (f.size > MAX_IMG) { alert("Image max 5 Mo."); return; }
    resetMedia();
    setMedia(f); setType("image"); setPreview(URL.createObjectURL(f));
  };

  const handleVideo = (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("video/")) { alert("Fichier vidéo uniquement."); return; }
    if (f.size > MAX_VID) { alert("Vidéo max 50 Mo."); return; }
    const url = URL.createObjectURL(f);
    const vid = document.createElement("video");
    vid.preload = "metadata";
    vid.src = url;
    vid.onloadedmetadata = () => {
      if (vid.duration > 30) {
        URL.revokeObjectURL(url);
        alert(`Vidéo trop longue (${Math.round(vid.duration)}s). Maximum 30 secondes.`);
        return;
      }
      resetMedia();
      setMedia(f); setType("video"); setPreview(url);
      setVidDuration(Math.round(vid.duration));
    };
  };

  const processImageFile = (file) => new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const rad = (rotation * 90 * Math.PI) / 180;
      const swapped = rotation % 2 !== 0;
      const w = swapped ? img.naturalHeight : img.naturalWidth;
      const h = swapped ? img.naturalWidth  : img.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
      ctx.translate(w / 2, h / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      URL.revokeObjectURL(url);
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    };
    img.src = url;
  });

  const publish = async () => {
    if (!text.trim() && !mediaFile) return;
    setSaving(true);
    let mediaUrl = null;
    if (mediaFile) {
      setUploading(true);
      const uid = user?.uid || profile?.uid || "anon";
      let uploadFile = mediaFile;
      if (mediaType === "image") {
        const blob = await processImageFile(mediaFile);
        uploadFile = new File([blob], mediaFile.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
      }
      const path = `posts/${uid}/${Date.now()}_${uploadFile.name}`;
      const task = uploadBytesResumable(ref(storage, path), uploadFile);
      await new Promise((resolve, reject) => {
        task.on("state_changed",
          snap => setProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
          reject,
          async () => { mediaUrl = await getDownloadURL(task.snapshot.ref); resolve(); }
        );
      });
      setUploading(false);
    }
    await onPublish(text.trim(), mediaUrl, mediaType);
    setText(""); resetMedia(); setProgress(0);
    setSaving(false);
  };

  const btnEdit = {
    padding: "4px 10px", borderRadius: 8, border: `1px solid ${C.border}`,
    background: "transparent", cursor: "pointer", fontSize: "0.8rem",
  };

  return (
    <div style={{ ...css.card, marginBottom:14 }}>
      <div style={{ display:"flex", gap:10, marginBottom:8 }}>
        <div style={{ width:38, height:38, borderRadius:"50%", background:profile.photoURL?"transparent":r.bg,
          color:r.color, display:"flex", alignItems:"center", justifyContent:"center",
          fontWeight:700, fontSize:"0.82rem", flexShrink:0, overflow:"hidden", border:`2px solid ${r.color}20` }}>
          {profile.photoURL ? <img src={profile.photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : (profile.avatar||profile.name?.slice(0,2))}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ marginBottom:4 }}>
            <FormatToolbar textareaRef={textareaRef} setText={setText}/>
          </div>
          <textarea ref={textareaRef}
            style={{ ...css.input, resize:"none", minHeight:72, width:"100%", borderRadius:12 }}
            placeholder="Partagez quelque chose avec la communauté…"
            value={text} onChange={e => setText(e.target.value)}/>
        </div>
      </div>

      {/* Aperçu média */}
      {mediaPreview && (
        <div style={{ marginBottom:10 }}>
          <div style={{ position:"relative", borderRadius:12, overflow:"hidden" }}>
            {mediaType === "video"
              ? <video src={mediaPreview} controls style={{ width:"100%", maxHeight:200, objectFit:"cover" }}/>
              : <img src={mediaPreview} alt="preview"
                  style={{ width:"100%", maxHeight:380, objectFit:"contain", background:"#111",
                    transform:`rotate(${rotation * 90}deg)`,
                    filter:`brightness(${brightness}%) contrast(${contrast}%)`,
                    transition:"transform 0.2s, filter 0.2s" }}/>
            }
            {mediaType === "video" && vidDuration !== null && (
              <span style={{ position:"absolute", bottom:8, left:8, background:"rgba(0,0,0,0.65)",
                color:"#fff", borderRadius:8, padding:"2px 8px", fontSize:"0.78rem" }}>
                ⏱ {vidDuration}s
              </span>
            )}
            <button onClick={resetMedia}
              style={{ position:"absolute", top:8, right:8, width:28, height:28, borderRadius:"50%",
                background:"rgba(0,0,0,0.55)", color:"#fff", border:"none", cursor:"pointer",
                fontSize:"0.85rem", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
          </div>

          {mediaType === "image" && (
            <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:8,
              padding:"10px 12px", background:C.bg, borderRadius:10, border:`1px solid ${C.border}` }}>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <button style={btnEdit} onClick={() => setRotation(rv => (rv - 1 + 4) % 4)}>↺ Gauche</button>
                <button style={btnEdit} onClick={() => setRotation(rv => (rv + 1) % 4)}>↻ Droite</button>
              </div>
              <label style={{ fontSize:"0.78rem", color:C.muted }}>
                Luminosité : {brightness}%
                <input type="range" min={80} max={120} value={brightness}
                  onChange={e => setBrightness(Number(e.target.value))}
                  style={{ display:"block", width:"100%", marginTop:2 }}/>
              </label>
              <label style={{ fontSize:"0.78rem", color:C.muted }}>
                Contraste : {contrast}%
                <input type="range" min={80} max={120} value={contrast}
                  onChange={e => setContrast(Number(e.target.value))}
                  style={{ display:"block", width:"100%", marginTop:2 }}/>
              </label>
            </div>
          )}
        </div>
      )}

      {uploading && (
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:"0.78rem", color:C.blue, marginBottom:4 }}>Upload… {progress}%</div>
          <div style={{ height:4, background:C.border, borderRadius:2 }}>
            <div style={{ height:"100%", width:`${progress}%`, background:C.blue, borderRadius:2, transition:"width 0.2s" }}/>
          </div>
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", gap:6 }}>
          <button onClick={() => imgRef.current.click()}
            style={{ ...css.btnGhost, fontSize:"0.8rem", color:C.muted, display:"flex", alignItems:"center", gap:4 }}>
            📷 Photo
          </button>
          <button onClick={() => vidRef.current.click()}
            style={{ ...css.btnGhost, fontSize:"0.8rem", color:C.muted, display:"flex", alignItems:"center", gap:4 }}>
            🎬 Vidéo
          </button>
          <input ref={imgRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
            style={{ display:"none" }} onChange={handleImage}/>
          <input ref={vidRef} type="file" accept="video/mp4,video/webm,video/quicktime"
            style={{ display:"none" }} onChange={handleVideo}/>
        </div>
        <button style={{ ...css.btnPrimary, opacity:(saving||(!text.trim()&&!mediaFile))?0.6:1, borderRadius:20 }}
          onClick={publish} disabled={saving||(!text.trim()&&!mediaFile)}>
          {saving ? (uploading?`Upload ${progress}%…`:"Envoi…") : "Publier →"}
        </button>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function PageSocial({ profile, setPage, initialTab }) {
  const { user } = useAuth();
  const { data: posts, loading } = usePosts();
  const { data: allUsers } = useCollection("users", []);
  const [tab, setTab]             = useState(initialTab || "forum");
  const [viewUser, setViewUser]   = useState(null);
  const [roleFilter, setRoleFilter] = useState("Tous");
  const [promoFilter, setPromoFilter] = useState("Tous");
  const [searchReseau, setSearchReseau] = useState("");

  const getUserProfile = useCallback((uid) => allUsers.find(u => u.uid === uid) || null, [allUsers]);

  const publish = async (texte, mediaUrl, mediaType) => {
    await addDocument("posts", {
      auteur:    profile.name,
      auteurUid: user?.uid,
      avatar:    profile.avatar || profile.name?.slice(0,2),
      photoURL:  profile.photoURL || null,
      role:      profile.role,
      promo:     profile.promo,
      texte,
      ...(mediaUrl ? { mediaUrl, mediaType } : {}),
      likes:     [],
      reactions: {},
      commentCount: 0,
      comments:  [],
    });
  };

  const react = async (post, emoji) => {
    const uid = user?.uid; if (!uid) return;
    const reactions = post.reactions || {};
    const curr = reactions[emoji] || [];
    const has = curr.includes(uid);
    await updateDocument("posts", post.id, { reactions: { ...reactions, [emoji]: has ? curr.filter(id=>id!==uid) : [...curr, uid] } });
    if (!has && post.auteurUid && post.auteurUid !== uid) {
      await sendNotif(post.auteurUid, {
        type:      "reaction",
        fromName:  profile.name,
        fromAvatar:profile.avatar || profile.name?.slice(0,2),
        emoji,
        postId:    post.id,
        postText:  post.texte?.slice(0,80),
      });
    }
  };

  const openProfil = (uid, fallback) => {
    const u = getUserProfile(uid);
    if (u) setViewUser(u);
    else if (fallback) setViewUser({ name:fallback.auteur||fallback.name, avatar:fallback.avatar, role:fallback.role, promo:fallback.promo, photoURL:fallback.photoURL });
  };

  const share = async (post) => {
    const uid = user?.uid; if (!uid) return;
    const origin = post.sharedFrom || {
      originalId: post.id,
      auteur:    post.auteur,
      auteurUid: post.auteurUid,
      avatar:    post.avatar,
      role:      post.role,
      promo:     post.promo,
      photoURL:  post.photoURL || null,
      texte:     post.texte || "",
      ...(post.mediaUrl ? { mediaUrl:post.mediaUrl, mediaType:post.mediaType } : {}),
    };
    await addDocument("posts", {
      auteur:    profile.name,
      auteurUid: uid,
      avatar:    profile.avatar || profile.name?.slice(0,2),
      photoURL:  profile.photoURL || null,
      role:      profile.role,
      promo:     profile.promo,
      texte:     "",
      sharedFrom: origin,
      likes:     [],
      reactions: {},
      commentCount: 0,
      comments:  [],
    });
    await updateDocument("posts", post.sharedFrom?.originalId || post.id, { shareCount: (post.shareCount || 0) + 1 });
    if (origin.auteurUid && origin.auteurUid !== uid) {
      await sendNotif(origin.auteurUid, {
        type:      "share",
        fromName:  profile.name,
        fromAvatar:profile.avatar || profile.name?.slice(0,2),
        postId:    origin.originalId,
        postText:  (origin.texte||"").slice(0,80),
      });
    }
  };

  const r = getRoleInfo(profile.role);

  const approved   = allUsers.filter(u => u.status==="approved");
  const promos     = ["Tous", ...new Set(approved.map(u=>u.promo).filter(Boolean))];
  const roles      = ["Tous", ...new Set(approved.map(u=>u.role).filter(Boolean))];
  const reseauList = approved.filter(u => {
    const ok1 = roleFilter==="Tous" || u.role===roleFilter;
    const ok2 = promoFilter==="Tous" || u.promo===promoFilter;
    const ok3 = !searchReseau || u.name?.toLowerCase().includes(searchReseau.toLowerCase());
    return ok1 && ok2 && ok3;
  });

  if (loading) return <div style={{ padding:40, textAlign:"center", color:C.muted }}>Chargement…</div>;

  return (
    <div style={{ maxWidth:680, margin:"0 auto" }}>
      {viewUser && (
        <ProfilExterne user={viewUser} onClose={() => setViewUser(null)}
          onMessage={() => { setViewUser(null); setTab("messages"); }}/>
      )}

      <div style={css.pageH}>Espace Social</div>
      <div style={css.pageSub}>Forum · Groupes · Réseau ARSTM</div>

      {/* Onglets */}
      <div style={{ display:"flex", gap:6, marginBottom:18, overflowX:"auto", paddingBottom:2 }}>
        {[["forum","📝 Forum"],["groupes","👥 Groupes"],["reseau","🌐 Réseau"]].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)} style={{
            padding:"7px 16px", borderRadius:20, border:`1px solid ${tab===v?C.blue:C.border}`,
            background:tab===v?C.blue:"#fff", color:tab===v?"#fff":C.mid,
            cursor:"pointer", fontFamily:"inherit", fontWeight:600, fontSize:"0.82rem",
            whiteSpace:"nowrap", transition:"all 0.15s",
          }}>{l}</button>
        ))}
      </div>

      {/* ── FORUM (fil d'actualité) ── */}
      {tab==="forum" && (
        <div>
          <PostComposer profile={profile} onPublish={publish} r={r}/>
          {posts.length === 0 && (
            <div style={{ ...css.card, textAlign:"center", padding:48, color:C.muted }}>
              <div style={{ fontSize:"2.5rem", marginBottom:12 }}>📝</div>
              <div style={{ fontWeight:600, color:C.navy, marginBottom:6 }}>Aucune publication pour l'instant</div>
              <div style={{ fontSize:"0.84rem" }}>Soyez le premier à partager quelque chose !</div>
            </div>
          )}
          {posts.map(p => (
            <PostCard key={p.id} p={p} uid={user?.uid} profile={profile}
              onReact={react} onOpenProfil={openProfil} onShare={share} allUsers={allUsers}/>
          ))}
        </div>
      )}

      {/* ── GROUPES ── */}
      {tab==="groupes" && <PageGroups profile={profile}/>}

      {/* ── RÉSEAU ── */}
      {tab==="reseau" && (
        <div>
          <div style={{ marginBottom:14 }}>
            <input style={{ ...css.input, marginBottom:10 }}
              placeholder="🔍 Rechercher un membre…"
              value={searchReseau} onChange={e => setSearchReseau(e.target.value)}/>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <select style={{ ...css.input, flex:1, minWidth:120 }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                {roles.map(rv => <option key={rv}>{rv}</option>)}
              </select>
              <select style={{ ...css.input, flex:1, minWidth:120 }} value={promoFilter} onChange={e => setPromoFilter(e.target.value)}>
                {promos.map(pv => <option key={pv}>{pv}</option>)}
              </select>
            </div>
          </div>
          <div style={{ fontSize:"0.78rem", color:C.muted, marginBottom:12 }}>{reseauList.length} membres</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))", gap:12 }}>
            {reseauList.map(u => {
              const ri = getRoleInfo(u.role);
              return (
                <div key={u.uid} onClick={() => setViewUser(u)}
                  style={{ ...css.card, cursor:"pointer", textAlign:"center", padding:"20px 16px", transition:"all 0.18s" }}
                  onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 8px 24px rgba(37,99,235,0.12)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow=""; }}>
                  <div style={{ width:56, height:56, borderRadius:"50%", background:u.photoURL?"transparent":ri.bg,
                    color:ri.color, display:"flex", alignItems:"center", justifyContent:"center",
                    fontWeight:700, fontSize:"1.1rem", margin:"0 auto 10px", overflow:"hidden", border:`3px solid ${ri.color}25` }}>
                    {u.photoURL ? <img src={u.photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : (u.avatar||u.name?.slice(0,2))}
                  </div>
                  <div style={{ fontWeight:700, color:C.navy, fontSize:"0.9rem", marginBottom:4 }}>{u.name}</div>
                  <span style={{ ...css.badge(ri.bg,ri.color), fontSize:"0.68rem" }}>{ri.icon} {ri.label}</span>
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
            {reseauList.length===0 && (
              <div style={{ gridColumn:"1/-1", ...css.card, textAlign:"center", padding:40, color:C.muted }}>Aucun membre trouvé.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
