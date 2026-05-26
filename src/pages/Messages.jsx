// src/pages/Messages.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { C, ROLES, css } from "../design";
import { db } from "../firebase";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  collection, query, orderBy, onSnapshot, addDoc,
  serverTimestamp, doc, setDoc, getDoc, where,
  updateDoc, getDocs
} from "firebase/firestore";

const storage = getStorage();

// ── Emojis fréquents ──
const EMOJI_CATEGORIES = {
  "😊 Smileys": ["😀","😂","🥹","😊","😍","🤩","😎","🥳","😅","😭","😤","🤔","😴","🤗","😏","🙈","🔥","❤️","💯","👏","🙏","✅","⭐","🎉","💪","👍","👎","🤝","✌️","💡"],
  "🎓 ARSTM":  ["📚","📖","✏️","📝","🎓","🏫","⚓","🚢","🌊","🗺️","📊","💼","🏆","🥇","📋","🔬","⚙️","🖥️","📱","💻"],
  "👋 Gestes": ["👋","🤙","👊","✊","🤞","🖐️","👌","🤟","🫶","💅","🦾","🫡","🫰","🤌","👆","👇","👉","👈"],
};

// ── Messages de contexte par rôle ──
const CONTEXT_MSG = {
  etudiant_enseignant:      { icon:"📖", color:"#d97706", msg:"Vous vous adressez à un membre du corps professoral. Soyez respectueux et précis." },
  etudiant_administration:  { icon:"🏫", color:"#7c3aed", msg:"Vous contactez le service administratif. Formulez clairement votre demande." },
  etudiant_alumni:          { icon:"🏅", color:"#d97706", msg:"Vous contactez un Alumni ARSTM. Son temps est précieux — soyez courtois." },
  etudiant_superadmin:      { icon:"⚙️", color:"#dc2626", msg:"Vous contactez le support technique. Décrivez précisément votre problème." },
  enseignant_etudiant:      { icon:"🎓", color:"#2563eb", msg:"Message à destination d'un étudiant ARSTM." },
  alumni_etudiant:          { icon:"🎓", color:"#059669", msg:"Vous guidez un futur diplômé de l'ARSTM. Partagez avec bienveillance." },
  administration_etudiant:  { icon:"📋", color:"#7c3aed", msg:"Communication officielle à destination d'un étudiant." },
  superadmin_etudiant:      { icon:"🕵️", color:"#dc2626", msg:"Mode incognito actif — votre identité Admin est masquée." },
};

const getConvId = (uid1, uid2) => [uid1, uid2].sort().join("_");

function useConversations(uid) {
  const [convs, setConvs] = useState([]);
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db,"conversations"),
      where("participants","array-contains",uid),
      orderBy("lastAt","desc"));
    return onSnapshot(q, snap =>
      setConvs(snap.docs.map(d => ({ id:d.id, ...d.data() }))));
  }, [uid]);
  return convs;
}

function useMessages(convId) {
  const [msgs, setMsgs] = useState([]);
  useEffect(() => {
    if (!convId) return;
    const q = query(collection(db,"conversations",convId,"messages"),
      orderBy("createdAt","asc"));
    return onSnapshot(q, snap =>
      setMsgs(snap.docs.map(d => ({ id:d.id, ...d.data() }))));
  }, [convId]);
  return msgs;
}

function useAllUsers(uid) {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    const q = query(collection(db,"users"), where("status","==","approved"));
    return onSnapshot(q, snap =>
      setUsers(snap.docs.map(d => ({ id:d.id, ...d.data() })).filter(u => u.uid !== uid)));
  }, [uid]);
  return users;
}

export default function PageMessages({ profile, onClose, floating=false }) {
  const [screen, setScreen]         = useState("list"); // "list" | "chat" | "new"
  const [activeConv, setActiveConv] = useState(null);
  const [activeUser, setActiveUser] = useState(null);
  const [text, setText]             = useState("");
  const [search, setSearch]         = useState("");
  const [showEmoji, setShowEmoji]   = useState(false);
  const [emojiCat, setEmojiCat]     = useState("😊 Smileys");
  const [recording, setRecording]   = useState(false);
  const [audioBlob, setAudioBlob]   = useState(null);
  const [audioURL, setAudioURL]     = useState(null);
  const [sending, setSending]       = useState(false);
  const [replyTo, setReplyTo]       = useState(null);

  const messagesEndRef = useRef(null);
  const mediaRecorder  = useRef(null);
  const audioChunks    = useRef([]);
  const inputRef       = useRef(null);

  const conversations = useConversations(profile?.uid);
  const messages      = useMessages(activeConv);
  const allUsers      = useAllUsers(profile?.uid);

  const filteredUsers = allUsers.filter(u => {
    if (!search) return true;
    return (
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.role?.toLowerCase().includes(search.toLowerCase()) ||
      u.filiere?.toLowerCase().includes(search.toLowerCase()) ||
      u.promo?.toLowerCase().includes(search.toLowerCase())
    );
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages]);

  const getRoleInfo = r => ROLES.find(x=>x.id===r) || { color:C.blue, bg:C.blueLight, icon:"👤" };

  const openConversation = async (otherUser) => {
    const convId = getConvId(profile.uid, otherUser.uid);
    const convRef = doc(db,"conversations",convId);
    const snap = await getDoc(convRef);
    if (!snap.exists()) {
      await setDoc(convRef, {
        participants:     [profile.uid, otherUser.uid],
        participantNames: { [profile.uid]:profile.name, [otherUser.uid]:otherUser.name },
        participantRoles: { [profile.uid]:profile.role, [otherUser.uid]:otherUser.role },
        participantAvatars:{ [profile.uid]:profile.avatar||profile.name?.slice(0,2), [otherUser.uid]:otherUser.avatar||otherUser.name?.slice(0,2) },
        lastMessage: "",
        lastAt:      serverTimestamp(),
        unread:      { [profile.uid]:0, [otherUser.uid]:0 },
        createdAt:   serverTimestamp(),
      });
    }
    setActiveConv(convId);
    setActiveUser(otherUser);
    setScreen("chat");
    setSearch("");
  };

  const openExistingConv = (conv) => {
    const otherUid = conv.participants?.find(p=>p!==profile?.uid);
    const otherName = conv.participantNames?.[otherUid]||"Utilisateur";
    const otherRole = conv.participantRoles?.[otherUid]||"etudiant";
    const otherAvatar = conv.participantAvatars?.[otherUid]||otherName?.slice(0,2);
    setActiveConv(conv.id);
    setActiveUser({ uid:otherUid, name:otherName, role:otherRole, avatar:otherAvatar });
    setScreen("chat");
    // Marquer comme lu
    updateDoc(doc(db,"conversations",conv.id), {
      [`unread.${profile.uid}`]: 0
    }).catch(()=>{});
  };

  const addEmoji = (emoji) => {
    setText(t=>t+emoji);
    inputRef.current?.focus();
  };

  // ── Enregistrement vocal ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = e => audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(audioChunks.current, { type:"audio/webm" });
        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
        stream.getTracks().forEach(t=>t.stop());
      };
      mediaRecorder.current.start();
      setRecording(true);
    } catch(e) {
      alert("Microphone non disponible sur cet appareil.");
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setRecording(false);
  };

  const cancelAudio = () => {
    setAudioBlob(null);
    setAudioURL(null);
    setRecording(false);
  };

  const sendMessage = async (type="text", content=null) => {
    if (sending) return;
    if (type==="text" && !text.trim() && !audioBlob) return;
    setSending(true);

    let msgData = {
      from:       profile.uid,
      fromName:   profile.name,
      fromRole:   profile.role,
      fromAvatar: profile.avatar || profile.name?.slice(0,2),
      type,
      createdAt:  serverTimestamp(),
      reactions:  {},
      replyTo:    replyTo ? { id:replyTo.id, text:replyTo.text||"🎤 Audio", from:replyTo.fromName } : null,
    };

    if (type==="text") {
      msgData.text = text.trim();
    } else if (type==="audio" && audioBlob) {
      try {
        const audioRef = ref(storage, `voice/${activeConv}/${Date.now()}.webm`);
        await uploadBytes(audioRef, audioBlob);
        msgData.audioURL = await getDownloadURL(audioRef);
        msgData.text = "🎤 Note vocale";
      } catch(e) {
        msgData.text = "🎤 Note vocale (stockage local)";
        msgData.audioURL = audioURL;
      }
    } else if (type==="emoji") {
      msgData.text = content;
      msgData.isSticker = true;
    }

    await addDoc(collection(db,"conversations",activeConv,"messages"), msgData);
    await updateDoc(doc(db,"conversations",activeConv), {
      lastMessage: msgData.text,
      lastAt:      serverTimestamp(),
    });

    setText("");
    setAudioBlob(null);
    setAudioURL(null);
    setReplyTo(null);
    setSending(false);
  };

  const addReaction = async (msgId, emoji) => {
    const msgRef = doc(db,"conversations",activeConv,"messages",msgId);
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;
    const reactions = snap.data().reactions || {};
    const users = reactions[emoji] || [];
    const newUsers = users.includes(profile.uid)
      ? users.filter(u=>u!==profile.uid)
      : [...users, profile.uid];
    await updateDoc(msgRef, { [`reactions.${emoji}`]: newUsers });
  };

  const contextMsg = activeUser
    ? CONTEXT_MSG[`${profile?.role}_${activeUser.role}`]
    : null;

  const formatTime = (ts) => {
    if (!ts?.toDate) return "";
    const d = ts.toDate();
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return "Maintenant";
    if (diff < 3600000) return `${Math.floor(diff/60000)}min`;
    if (diff < 86400000) return d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
    if (diff < 604800000) return d.toLocaleDateString("fr-FR",{weekday:"short"});
    return d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"});
  };

  const QUICK_REACTIONS = ["❤️","😂","👍","🙏","🔥","😮"];

  // ════ ÉCRAN : LISTE DES CONVERSATIONS ════
  const ListScreen = () => (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      {/* Header */}
      <div style={{ padding:"14px 16px 10px", borderBottom:`1px solid ${C.border}`,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        background:"#fff", flexShrink:0 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800,
          fontSize:"1.1rem", color:C.navy }}>Messages</div>
        <div style={{ display:"flex", gap:8 }}>
          <button style={{ ...css.btnPrimary, borderRadius:20, fontSize:"0.82rem",
            padding:"6px 14px" }} onClick={()=>setScreen("new")}>
            ✏️ Nouveau
          </button>
          {onClose&&<button style={{ ...css.btnGhost, padding:"6px 10px", color:C.muted }}
            onClick={onClose}>✕</button>}
        </div>
      </div>

      {/* Recherche */}
      <div style={{ padding:"10px 12px", background:"#f8fafc", flexShrink:0 }}>
        <input style={{ ...css.input, background:"#fff", borderRadius:20,
          padding:"8px 16px", fontSize:"0.84rem" }}
          placeholder="🔍 Rechercher une conversation..."
          value={search} onChange={e=>setSearch(e.target.value)} />
      </div>

      {/* Liste */}
      <div style={{ flex:1, overflowY:"auto" }}>
        {conversations.length === 0 ? (
          <div style={{ padding:40, textAlign:"center", color:C.muted }}>
            <div style={{ fontSize:"3rem", marginBottom:12 }}>💬</div>
            <div style={{ fontWeight:600, color:C.navy, marginBottom:6 }}>Aucune conversation</div>
            <div style={{ fontSize:"0.84rem" }}>
              Appuie sur ✏️ Nouveau pour envoyer un message.
            </div>
          </div>
        ) : conversations
            .filter(c => {
              if (!search) return true;
              const otherUid = c.participants?.find(p=>p!==profile?.uid);
              const name = c.participantNames?.[otherUid]||"";
              return name.toLowerCase().includes(search.toLowerCase());
            })
            .map(conv => {
              const otherUid  = conv.participants?.find(p=>p!==profile?.uid);
              const otherName = conv.participantNames?.[otherUid]||"Utilisateur";
              const otherRole = conv.participantRoles?.[otherUid]||"etudiant";
              const otherAv   = conv.participantAvatars?.[otherUid]||otherName?.slice(0,2);
              const r         = getRoleInfo(otherRole);
              const unread    = conv.unread?.[profile.uid] || 0;
              return (
                <div key={conv.id} onClick={()=>openExistingConv(conv)}
                  style={{ display:"flex", alignItems:"center", gap:12,
                    padding:"12px 16px", cursor:"pointer",
                    borderBottom:`1px solid ${C.border}`,
                    background:"#fff",
                    transition:"background 0.15s" }}>
                  {/* Avatar */}
                  <div style={{ position:"relative", flexShrink:0 }}>
                    <div style={{ width:46, height:46, borderRadius:"50%",
                      background:r.bg, color:r.color, display:"flex",
                      alignItems:"center", justifyContent:"center",
                      fontSize:"1rem", fontWeight:700 }}>
                      {otherAv}
                    </div>
                    <div style={{ position:"absolute", bottom:1, right:1,
                      width:12, height:12, borderRadius:"50%",
                      background:C.green, border:"2px solid #fff" }} />
                  </div>
                  {/* Infos */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"center", marginBottom:3 }}>
                      <span style={{ fontWeight:700, fontSize:"0.92rem",
                        color:C.navy }}>{otherName}</span>
                      <span style={{ fontSize:"0.72rem", color:C.muted }}>
                        {formatTime(conv.lastAt)}
                      </span>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"center" }}>
                      <span style={{ fontSize:"0.81rem", color:C.muted,
                        whiteSpace:"nowrap", overflow:"hidden",
                        textOverflow:"ellipsis", maxWidth:180 }}>
                        {conv.lastMessage || "Nouvelle conversation"}
                      </span>
                      {unread > 0 && (
                        <span style={{ minWidth:20, height:20, borderRadius:10,
                          background:C.blue, color:"#fff", fontSize:"0.68rem",
                          fontWeight:700, display:"flex", alignItems:"center",
                          justifyContent:"center", padding:"0 6px" }}>
                          {unread}
                        </span>
                      )}
                    </div>
                    <span style={{ ...css.badge(r.bg,r.color), fontSize:"0.68rem",
                      marginTop:3, display:"inline-block" }}>
                      {r.icon} {otherRole}
                    </span>
                  </div>
                </div>
              );
            })
        }
      </div>
    </div>
  );

  // ════ ÉCRAN : NOUVEAU MESSAGE ════
  const NewScreen = () => (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ padding:"14px 16px 10px", borderBottom:`1px solid ${C.border}`,
        display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
        <button style={{ ...css.btnGhost, padding:"6px 10px", color:C.blue }}
          onClick={()=>setScreen("list")}>←</button>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800,
          fontSize:"1rem", color:C.navy }}>Nouveau message</div>
      </div>
      <div style={{ padding:"10px 12px", flexShrink:0 }}>
        <input style={{ ...css.input, borderRadius:20, padding:"8px 16px",
          fontSize:"0.84rem" }}
          placeholder="🔍 Rechercher par nom, rôle, filière..."
          value={search} onChange={e=>setSearch(e.target.value)}
          autoFocus />
      </div>
      <div style={{ padding:"0 12px 6px", fontSize:"0.72rem", color:C.muted }}>
        {filteredUsers.length} utilisateur(s)
      </div>
      <div style={{ flex:1, overflowY:"auto" }}>
        {filteredUsers.map(u => {
          const r = getRoleInfo(u.role);
          return (
            <div key={u.id} onClick={()=>openConversation(u)}
              style={{ display:"flex", alignItems:"center", gap:12,
                padding:"10px 16px", cursor:"pointer",
                borderBottom:`1px solid ${C.border}`,
                transition:"background 0.15s" }}>
              <div style={{ width:42, height:42, borderRadius:"50%",
                background:r.bg, color:r.color, display:"flex",
                alignItems:"center", justifyContent:"center",
                fontSize:"0.9rem", fontWeight:700, flexShrink:0 }}>
                {u.avatar||u.name?.slice(0,2)}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:"0.9rem",
                  color:C.navy, marginBottom:3 }}>{u.name}</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  <span style={css.badge(r.bg,r.color)}>{r.icon} {u.role}</span>
                  {u.filiere&&<span style={{ fontSize:"0.72rem", color:C.muted }}>{u.filiere}</span>}
                  {u.promo&&<span style={{ fontSize:"0.72rem", color:C.muted }}>{u.promo}</span>}
                </div>
              </div>
              <span style={{ color:C.blue, fontSize:"1rem" }}>→</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ════ ÉCRAN : CONVERSATION ════
  const ChatScreen = () => (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", position:"relative" }}>
      {/* Header */}
      <div style={{ padding:"10px 14px", borderBottom:`1px solid ${C.border}`,
        display:"flex", alignItems:"center", gap:10, background:"#fff",
        flexShrink:0, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
        <button style={{ ...css.btnGhost, padding:"6px 10px", color:C.blue, fontSize:"1rem" }}
          onClick={()=>{ setScreen("list"); setActiveConv(null); setActiveUser(null); }}>
          ←
        </button>
        {activeUser && (
          <>
            <div style={{ position:"relative" }}>
              <div style={{ width:38, height:38, borderRadius:"50%",
                background:getRoleInfo(activeUser.role).bg,
                color:getRoleInfo(activeUser.role).color,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"0.85rem", fontWeight:700 }}>
                {activeUser.avatar||activeUser.name?.slice(0,2)}
              </div>
              <div style={{ position:"absolute", bottom:1, right:1,
                width:10, height:10, borderRadius:"50%",
                background:C.green, border:"2px solid #fff" }} />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:"0.92rem", color:C.navy }}>
                {activeUser.name}
              </div>
              <span style={{ ...css.badge(getRoleInfo(activeUser.role).bg,
                getRoleInfo(activeUser.role).color), fontSize:"0.68rem" }}>
                {getRoleInfo(activeUser.role).icon} {activeUser.role}
              </span>
            </div>
          </>
        )}
        {onClose&&<button style={{ ...css.btnGhost, padding:"6px", color:C.muted }}
          onClick={onClose}>✕</button>}
      </div>

      {/* Message de contexte */}
      {contextMsg && (
        <div style={{ padding:"8px 14px", background:"#fffbeb",
          borderBottom:"1px solid #fde68a", fontSize:"0.78rem",
          color:contextMsg.color, display:"flex", gap:6, flexShrink:0 }}>
          <span>{contextMsg.icon}</span>
          <span>{contextMsg.msg}</span>
        </div>
      )}

      {/* Reply preview */}
      {replyTo && (
        <div style={{ padding:"8px 14px", background:C.blueLight,
          borderBottom:`1px solid ${C.blueBorder}`,
          display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:"0.72rem", color:C.blue, fontWeight:600 }}>
              ↩ Réponse à {replyTo.fromName}
            </div>
            <div style={{ fontSize:"0.8rem", color:C.dark,
              whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
              {replyTo.text||"🎤 Note vocale"}
            </div>
          </div>
          <button style={{ ...css.btnGhost, padding:"4px 8px", color:C.muted }}
            onClick={()=>setReplyTo(null)}>✕</button>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", padding:"12px 14px",
        background:"#f0f4f8", display:"flex", flexDirection:"column", gap:6 }}>
        {messages.map((m, idx) => {
          const isMine = m.from === profile?.uid;
          const showDate = idx===0 ||
            (messages[idx-1]?.createdAt?.toDate?.()?.toDateString() !==
             m.createdAt?.toDate?.()?.toDateString());

          return (
            <div key={m.id}>
              {showDate && m.createdAt?.toDate && (
                <div style={{ textAlign:"center", margin:"8px 0" }}>
                  <span style={{ background:"rgba(0,0,0,0.1)", borderRadius:12,
                    padding:"3px 10px", fontSize:"0.72rem", color:C.mid }}>
                    {m.createdAt.toDate().toLocaleDateString("fr-FR",
                      {weekday:"long",day:"numeric",month:"long"})}
                  </span>
                </div>
              )}

              <div style={{ display:"flex",
                justifyContent:isMine?"flex-end":"flex-start",
                alignItems:"flex-end", gap:6 }}>

                {!isMine && (
                  <div style={{ width:28, height:28, borderRadius:"50%",
                    background:getRoleInfo(m.fromRole).bg,
                    color:getRoleInfo(m.fromRole).color,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:"0.65rem", fontWeight:700, flexShrink:0 }}>
                    {m.fromAvatar||m.fromName?.slice(0,2)}
                  </div>
                )}

                <div style={{ maxWidth:"75%" }}>
                  {/* Reply info */}
                  {m.replyTo && (
                    <div style={{ background:"rgba(0,0,0,0.08)", borderRadius:"8px 8px 0 0",
                      padding:"5px 10px", fontSize:"0.74rem",
                      borderLeft:`3px solid ${isMine?"rgba(255,255,255,0.5)":C.blue}` }}>
                      <div style={{ fontWeight:600, opacity:0.8 }}>↩ {m.replyTo.from}</div>
                      <div style={{ opacity:0.7 }}>{m.replyTo.text}</div>
                    </div>
                  )}

                  {/* Bulle */}
                  <div onClick={()=>setReplyTo(m)}
                    style={{ padding: m.isSticker?"4px":"8px 12px",
                      borderRadius:m.replyTo
                        ? (isMine?"0 0 4px 14px":"0 0 14px 4px")
                        : (isMine?"14px 14px 4px 14px":"14px 14px 14px 4px"),
                      background: m.isSticker?"transparent":isMine?C.blue:"#fff",
                      color:isMine?"#fff":C.dark,
                      fontSize: m.isSticker?"2.5rem":"0.87rem",
                      lineHeight:1.5, cursor:"pointer",
                      boxShadow: m.isSticker?"none":"0 1px 4px rgba(0,0,0,0.08)" }}>

                    {/* Audio */}
                    {m.type==="audio" && m.audioURL ? (
                      <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:180 }}>
                        <span style={{ fontSize:"1.2rem" }}>🎤</span>
                        <audio controls src={m.audioURL}
                          style={{ height:32, flex:1, outline:"none" }} />
                      </div>
                    ) : (
                      <span>{m.text}</span>
                    )}

                    {/* Heure */}
                    {!m.isSticker && (
                      <div style={{ fontSize:"0.65rem", marginTop:2, textAlign:"right",
                        color:isMine?"rgba(255,255,255,0.6)":C.muted }}>
                        {formatTime(m.createdAt)}
                        {isMine && " ✓✓"}
                      </div>
                    )}
                  </div>

                  {/* Réactions rapides */}
                  <div style={{ display:"flex", gap:3, marginTop:3,
                    justifyContent:isMine?"flex-end":"flex-start", flexWrap:"wrap" }}>
                    {QUICK_REACTIONS.map(emoji => {
                      const users = m.reactions?.[emoji] || [];
                      if (users.length === 0) return null;
                      return (
                        <button key={emoji} onClick={()=>addReaction(m.id,emoji)}
                          style={{ padding:"2px 6px", borderRadius:10, fontSize:"0.75rem",
                            background:users.includes(profile.uid)?"#dbeafe":"#f1f5f9",
                            border:`1px solid ${users.includes(profile.uid)?C.blue:C.border}`,
                            cursor:"pointer", fontFamily:"inherit" }}>
                          {emoji} {users.length}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Panneau emoji */}
      {showEmoji && (
        <div style={{ flexShrink:0, background:"#fff",
          borderTop:`1px solid ${C.border}`, maxHeight:220, overflowY:"auto" }}>
          {/* Catégories */}
          <div style={{ display:"flex", gap:6, padding:"8px 12px",
            overflowX:"auto", borderBottom:`1px solid ${C.border}` }}>
            {Object.keys(EMOJI_CATEGORIES).map(cat=>(
              <button key={cat} onClick={()=>setEmojiCat(cat)}
                style={{ padding:"4px 10px", borderRadius:20, fontSize:"0.76rem",
                  whiteSpace:"nowrap", cursor:"pointer", fontFamily:"inherit",
                  border:`1px solid ${emojiCat===cat?C.blue:C.border}`,
                  background:emojiCat===cat?C.blueLight:"#fff",
                  color:emojiCat===cat?C.blue:C.mid }}>
                {cat}
              </button>
            ))}
          </div>
          {/* Emojis */}
          <div style={{ display:"flex", flexWrap:"wrap", padding:"8px 12px", gap:4 }}>
            {EMOJI_CATEGORIES[emojiCat].map(emoji=>(
              <button key={emoji} onClick={()=>{
                  if(emojiCat==="😊 Smileys"||emojiCat==="👋 Gestes") addEmoji(emoji);
                  else sendMessage("emoji", emoji); // Sticker grand format
                }}
                style={{ width:36, height:36, borderRadius:8, fontSize:"1.3rem",
                  cursor:"pointer", background:"transparent", border:"none",
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                {emoji}
              </button>
            ))}
          </div>
          {/* Réactions rapides */}
          <div style={{ padding:"6px 12px 10px", borderTop:`1px solid ${C.border}` }}>
            <div style={{ fontSize:"0.72rem", color:C.muted, marginBottom:4 }}>
              Réagir au dernier message
            </div>
            <div style={{ display:"flex", gap:8 }}>
              {QUICK_REACTIONS.map(emoji=>(
                <button key={emoji} onClick={()=>{
                    const lastMsg = messages[messages.length-1];
                    if(lastMsg) addReaction(lastMsg.id, emoji);
                  }}
                  style={{ fontSize:"1.4rem", cursor:"pointer",
                    background:"none", border:"none" }}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Zone de saisie */}
      <div style={{ flexShrink:0, background:"#fff",
        borderTop:`1px solid ${C.border}`, padding:"8px 12px" }}>

        {/* Aperçu audio */}
        {audioURL && (
          <div style={{ display:"flex", alignItems:"center", gap:8,
            padding:"6px 10px", background:C.blueLight, borderRadius:10,
            marginBottom:8, border:`1px solid ${C.blueBorder}` }}>
            <span style={{ fontSize:"1.1rem" }}>🎤</span>
            <audio controls src={audioURL} style={{ height:28, flex:1 }} />
            <button style={{ ...css.btnGhost, padding:"4px 8px", color:C.red }}
              onClick={cancelAudio}>✕</button>
            <button style={{ ...css.btnPrimary, borderRadius:20, fontSize:"0.8rem",
              padding:"5px 14px" }} onClick={()=>sendMessage("audio")}>
              Envoyer
            </button>
          </div>
        )}

        {recording && (
          <div style={{ display:"flex", alignItems:"center", gap:8,
            padding:"8px 12px", background:C.redLight, borderRadius:10,
            marginBottom:8, border:`1px solid ${C.redBorder}` }}>
            <div style={{ width:10, height:10, borderRadius:"50%",
              background:C.red, animation:"pulse 1s infinite" }} />
            <span style={{ fontSize:"0.84rem", color:C.red, flex:1 }}>
              Enregistrement en cours...
            </span>
            <button style={{ ...css.btnDanger, fontSize:"0.8rem", padding:"5px 14px" }}
              onClick={stopRecording}>
              ⏹ Arrêter
            </button>
          </div>
        )}

        <div style={{ display:"flex", alignItems:"flex-end", gap:8 }}>
          {/* Bouton emoji */}
          <button onClick={()=>setShowEmoji(!showEmoji)}
            style={{ width:38, height:38, borderRadius:"50%", flexShrink:0,
              background:showEmoji?C.blueLight:"#f1f5f9",
              border:`1px solid ${showEmoji?C.blue:C.border}`,
              cursor:"pointer", fontSize:"1.2rem",
              display:"flex", alignItems:"center", justifyContent:"center" }}>
            😊
          </button>

          {/* Input texte */}
          <textarea ref={inputRef}
            style={{ ...css.input, flex:1, resize:"none", borderRadius:20,
              padding:"8px 14px", fontSize:"0.87rem",
              maxHeight:100, overflowY:"auto", lineHeight:1.4 }}
            placeholder="Message..."
            value={text}
            rows={1}
            onChange={e=>{
              setText(e.target.value);
              e.target.style.height="auto";
              e.target.style.height=Math.min(e.target.scrollHeight,100)+"px";
            }}
            onKeyDown={e=>{
              if(e.key==="Enter"&&!e.shiftKey){
                e.preventDefault();
                sendMessage();
              }
            }} />

          {/* Bouton micro OU envoyer */}
          {text.trim() || audioURL ? (
            <button onClick={()=>sendMessage()}
              style={{ width:40, height:40, borderRadius:"50%", flexShrink:0,
                background:C.blue, color:"#fff", border:"none", cursor:"pointer",
                fontSize:"1rem", display:"flex", alignItems:"center",
                justifyContent:"center", opacity:sending?0.7:1 }}>
              ➤
            </button>
          ) : (
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              style={{ width:40, height:40, borderRadius:"50%", flexShrink:0,
                background:recording?C.red:C.green, color:"#fff",
                border:"none", cursor:"pointer", fontSize:"1rem",
                display:"flex", alignItems:"center", justifyContent:"center" }}>
              🎤
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const containerStyle = floating
    ? { width:"100%", height:"100%", borderRadius:18, overflow:"hidden",
        display:"flex", flexDirection:"column", background:"#fff" }
    : { display:"flex", flexDirection:"column", height:"calc(100vh - 180px)",
        background:"#fff", borderRadius:14, border:`1px solid ${C.border}`,
        overflow:"hidden" };

  return (
    <div style={containerStyle}>
      {screen==="list" && <ListScreen />}
      {screen==="new"  && <NewScreen />}
      {screen==="chat" && <ChatScreen />}
    </div>
  );
}