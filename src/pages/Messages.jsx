// src/pages/Messages.jsx
import { useState, useEffect, useRef, useCallback, memo } from "react";
import { C, ROLES, css } from "../design";
import { db } from "../firebase";
import {
  collection, query, orderBy, onSnapshot, addDoc,
  serverTimestamp, doc, setDoc, getDoc, where,
  updateDoc, getDocs, limit
} from "firebase/firestore";

// ── Palette chat ──
const CH = {
  myBubble:    "#2563eb",
  myText:      "#ffffff",
  theirBubble: "#ffffff",
  theirText:   "#1e293b",
  bg:          "#eef2f7",
  inputBg:     "#ffffff",
  online:      "#22c55e",
  header:      "#ffffff",
};

// ── Emojis ──
const EMOJIS = {
  "😊": ["😀","😂","🥹","😊","😍","🤩","😎","🥳","😅","😭","😤","🤔","😴","🤗","😏","🙄","😬","🤯","🥺","😇"],
  "👋": ["👋","🤙","👊","✊","🤞","🖐️","👌","🤟","🫶","💅","🦾","🫡","🙏","👍","👎","💪","✌️","🤝","👏","🫂"],
  "❤️": ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","💔","❣️","💕","💞","💓","💗","💖","💘","💝","🔥","⭐","🎉"],
  "🎓": ["📚","📖","✏️","📝","🎓","🏫","⚓","🚢","🌊","🗺️","📊","💼","🏆","🥇","📋","⚙️","🖥️","📱","💻","🔬"],
};

// ── Contexte par rôle ──
const CONTEXT = {
  etudiant_enseignant:     "Vous vous adressez à un enseignant. Soyez respectueux et précis.",
  etudiant_administration: "Vous contactez l'administration. Formulez clairement votre demande.",
  etudiant_alumni:         "Vous contactez un Alumni ARSTM. Son temps est précieux.",
  alumni_etudiant:         "Vous guidez un futur diplômé. Partagez avec bienveillance.",
  superadmin_etudiant:     "Mode incognito — votre identité Admin est masquée.",
};

const convId = (a, b) => [a, b].sort().join("_");

// ── Hooks Firebase ──
function useConvs(uid) {
  const [convs, setConvs] = useState([]);
  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", uid),
      orderBy("lastAt", "desc")
    );
    return onSnapshot(q, s => setConvs(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [uid]);
  return convs;
}

function useMsgs(cid) {
  const [msgs, setMsgs] = useState([]);
  useEffect(() => {
    if (!cid) return;
    setMsgs([]);
    const q = query(
      collection(db, "conversations", cid, "messages"),
      orderBy("createdAt", "asc"),
      limit(100)
    );
    return onSnapshot(q, s => setMsgs(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [cid]);
  return msgs;
}

// Live presence (online / lastSeen) for a single user
function usePresence(uid) {
  const [pres, setPres] = useState(null);
  useEffect(() => {
    if (!uid) { setPres(null); return; }
    return onSnapshot(doc(db, "users", uid), s => {
      if (s.exists()) { const d = s.data(); setPres({ online: d.online, lastSeen: d.lastSeen }); }
    });
  }, [uid]);
  return pres;
}

// Live conversation doc (for read receipts via lastRead map)
function useConvDoc(cid) {
  const [conv, setConv] = useState(null);
  useEffect(() => {
    if (!cid) { setConv(null); return; }
    return onSnapshot(doc(db, "conversations", cid), s => setConv(s.exists() ? s.data() : null));
  }, [cid]);
  return conv;
}

function useUsers(uid) {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    const q = query(collection(db, "users"), where("status", "==", "approved"));
    return onSnapshot(q, s =>
      setUsers(s.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.uid !== uid))
    );
  }, [uid]);
  return users;
}

// ── Avatar ──
const Avatar = memo(({ user, size = 44, showOnline = false }) => {
  const r = ROLES.find(x => x.id === user?.role) || { color: C.blue, bg: C.blueLight };
  const initials = user?.avatar || user?.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: user?.photoURL ? "transparent" : `linear-gradient(135deg,${r.color},${r.color}99)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.35 + "px", fontWeight: 700, color: "#fff", overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
      }}>
        {user?.photoURL
          ? <img src={user.photoURL} alt="av" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : initials}
      </div>
      {showOnline && (
        <div style={{
          position: "absolute", bottom: 1, right: 1,
          width: size * 0.28, height: size * 0.28, borderRadius: "50%",
          background: CH.online, border: "2px solid #fff",
        }} />
      )}
    </div>
  );
});

// ── Bulle de message ──
const Bubble = memo(({ msg, isMine, profile, onReply, onReact, showAvatar, senderUser, read }) => {
  const [showActions, setShowActions] = useState(false);
  const REACTIONS = ["❤️", "😂", "👍", "🙏", "🔥", "😮"];

  const fmt = ts => {
    if (!ts?.toDate) return "";
    const d = ts.toDate(), now = new Date(), diff = now - d;
    if (diff < 60000) return "maintenant";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min`;
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const totalReactions = Object.entries(msg.reactions || {})
    .filter(([, users]) => users.length > 0);

  return (
    <div style={{
      display: "flex", justifyContent: isMine ? "flex-end" : "flex-start",
      alignItems: "flex-end", gap: 8, marginBottom: 2,
    }}>
      {!isMine && showAvatar && <Avatar user={senderUser || { name: msg.fromName, role: msg.fromRole, avatar: msg.fromAvatar }} size={30} />}
      {!isMine && !showAvatar && <div style={{ width: 30, flexShrink: 0 }} />}

      <div style={{ maxWidth: "72%", position: "relative" }}>
        {/* Sender name (groupes) */}
        {!isMine && showAvatar && (
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: C.blue, marginBottom: 3, paddingLeft: 4 }}>
            {msg.fromName}
          </div>
        )}

        {/* Reply preview */}
        {msg.replyTo && (
          <div style={{
            background: isMine ? "rgba(255,255,255,0.2)" : "#f1f5f9",
            borderLeft: `3px solid ${isMine ? "rgba(255,255,255,0.6)" : C.blue}`,
            padding: "5px 10px", borderRadius: "8px 8px 0 0",
            fontSize: "0.75rem", color: isMine ? "rgba(255,255,255,0.8)" : C.muted,
          }}>
            <div style={{ fontWeight: 700 }}>↩ {msg.replyTo.from}</div>
            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
              {msg.replyTo.text}
            </div>
          </div>
        )}

        {/* Bulle principale */}
        <div
          onClick={() => setShowActions(!showActions)}
          style={{
            padding: msg.isSticker ? "4px" : "9px 13px",
            borderRadius: msg.replyTo
              ? (isMine ? "0 0 4px 16px" : "0 0 16px 4px")
              : (isMine ? "16px 16px 4px 16px" : "16px 16px 16px 4px"),
            background: msg.isSticker ? "transparent" : (isMine ? CH.myBubble : CH.theirBubble),
            color: isMine ? CH.myText : CH.theirText,
            fontSize: msg.isSticker ? "2.8rem" : "0.88rem",
            lineHeight: 1.5, cursor: "pointer",
            boxShadow: msg.isSticker ? "none" : "0 1px 6px rgba(0,0,0,0.08)",
          }}>
          {msg.type === "audio" && msg.audioURL ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 180 }}>
              <span style={{ fontSize: "1.2rem" }}>🎤</span>
              <audio controls src={msg.audioURL} style={{ height: 30, flex: 1 }} />
            </div>
          ) : <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.text}</span>}

          {!msg.isSticker && (
            <div style={{
              fontSize: "0.62rem", marginTop: 4,
              textAlign: "right", opacity: 0.65,
              color: isMine ? "#fff" : C.muted,
            }}>
              {fmt(msg.createdAt)}
              {isMine && <span style={{ color: read ? "#38bdf8" : "rgba(255,255,255,0.65)", fontWeight: 700, marginLeft: 3 }}>✓✓</span>}
            </div>
          )}
        </div>

        {/* Réactions affichées */}
        {totalReactions.length > 0 && (
          <div style={{
            display: "flex", gap: 4, marginTop: 4,
            justifyContent: isMine ? "flex-end" : "flex-start", flexWrap: "wrap",
          }}>
            {totalReactions.map(([emoji, users]) => (
              <button key={emoji} onClick={() => onReact(msg.id, emoji)} style={{
                padding: "2px 7px", borderRadius: 12, fontSize: "0.75rem",
                background: users.includes(profile.uid) ? C.blueLight : "#f1f5f9",
                border: `1px solid ${users.includes(profile.uid) ? C.blue : C.border}`,
                cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 3,
              }}>
                {emoji} <span style={{ fontSize: "0.7rem", color: C.mid }}>{users.length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Actions rapides */}
        {showActions && (
          <div style={{
            position: "absolute", [isMine ? "right" : "left"]: 0,
            bottom: "calc(100% + 6px)", zIndex: 10,
            background: "#fff", borderRadius: 14, padding: "8px 10px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            display: "flex", gap: 4, alignItems: "center",
          }}>
            {REACTIONS.map(e => (
              <button key={e} onClick={() => { onReact(msg.id, e); setShowActions(false); }} style={{
                width: 34, height: 34, borderRadius: "50%", border: "none",
                background: "transparent", cursor: "pointer", fontSize: "1.2rem",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "transform 0.15s",
              }}>{e}</button>
            ))}
            <div style={{ width: 1, height: 24, background: C.border, margin: "0 4px" }} />
            <button onClick={() => { onReply(msg); setShowActions(false); }} style={{
              padding: "5px 10px", borderRadius: 8, border: "none",
              background: C.surfaceAlt, color: C.mid, cursor: "pointer",
              fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 600,
            }}>↩ Répondre</button>
          </div>
        )}
      </div>

      {isMine && (
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: CH.myBubble, opacity: 0.3, flexShrink: 0, alignSelf: "flex-end", marginBottom: 8,
        }} />
      )}
    </div>
  );
});

// ── Séparateur de date ──
const DateSep = ({ ts }) => {
  if (!ts?.toDate) return null;
  const d = ts.toDate();
  const now = new Date();
  const diff = now - d;
  let label;
  if (diff < 86400000 && now.getDate() === d.getDate()) label = "Aujourd'hui";
  else if (diff < 172800000) label = "Hier";
  else label = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div style={{ textAlign: "center", margin: "14px 0 8px" }}>
      <span style={{ background: "rgba(0,0,0,0.08)", borderRadius: 14, padding: "4px 12px", fontSize: "0.71rem", color: "#475569", fontWeight: 600 }}>
        {label}
      </span>
    </div>
  );
};

// ══════════════════════════════════════════════════════
export default function PageMessages({ profile, onClose, floating = false }) {
  const [screen, setScreen] = useState("list");
  const [convId_, setConvId] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiTab, setEmojiTab] = useState("😊");
  const [replyTo, setReplyTo] = useState(null);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioURL, setAudioURL] = useState(null);

  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);
  const mrRef       = useRef(null);
  const audioChunks = useRef([]);

  const convs    = useConvs(profile?.uid);
  const messages = useMsgs(convId_);
  const allUsers = useUsers(profile?.uid);
  const presence = usePresence(otherUser?.uid);
  const convDoc  = useConvDoc(convId_);

  // Read receipt for my messages: other party's lastRead >= message time
  const otherLastRead = otherUser?.uid ? convDoc?.lastRead?.[otherUser.uid] : null;
  const isReadByOther = (msg) => {
    if (!otherLastRead?.toMillis || !msg.createdAt?.toMillis) return false;
    return otherLastRead.toMillis() >= msg.createdAt.toMillis();
  };

  // Presence label
  const presenceLabel = () => {
    if (presence?.online) return "En ligne";
    const ls = presence?.lastSeen?.toDate?.();
    if (!ls) return getRoleInfo(otherUser?.role).label;
    const diff = Date.now() - ls.getTime();
    if (diff < 60000) return "Vu à l'instant";
    if (diff < 3600000) return `Vu il y a ${Math.floor(diff/60000)} min`;
    if (diff < 86400000) return `Vu à ${ls.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}`;
    return `Vu le ${ls.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"})}`;
  };

  // Mark conversation as read when viewing chat / new messages arrive
  useEffect(() => {
    if (screen === "chat" && convId_ && profile?.uid) {
      updateDoc(doc(db, "conversations", convId_), {
        [`lastRead.${profile.uid}`]: serverTimestamp(),
        [`unread.${profile.uid}`]: 0,
      }).catch(() => {});
    }
  }, [screen, convId_, messages.length, profile?.uid]);

  const filtered = allUsers.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.name?.toLowerCase().includes(q)
      || u.role?.toLowerCase().includes(q)
      || u.filiere?.toLowerCase().includes(q)
      || u.promo?.toLowerCase().includes(q);
  });

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input quand on ouvre chat
  useEffect(() => {
    if (screen === "chat") setTimeout(() => inputRef.current?.focus(), 100);
  }, [screen, convId_]);

  const getRoleInfo = r => ROLES.find(x => x.id === r) || { color: C.blue, bg: C.blueLight, icon: "👤", label: r };

  const openConv = async (user) => {
    const cid = convId(profile.uid, user.uid);
    const ref_ = doc(db, "conversations", cid);
    const snap = await getDoc(ref_);
    if (!snap.exists()) {
      await setDoc(ref_, {
        participants:      [profile.uid, user.uid],
        participantNames:  { [profile.uid]: profile.name, [user.uid]: user.name },
        participantRoles:  { [profile.uid]: profile.role, [user.uid]: user.role },
        participantAvatars:{ [profile.uid]: profile.avatar || profile.name?.slice(0, 2), [user.uid]: user.avatar || user.name?.slice(0, 2) },
        participantPhotos: { [profile.uid]: profile.photoURL || null, [user.uid]: user.photoURL || null },
        lastMessage: "", lastAt: serverTimestamp(),
        unread: { [profile.uid]: 0, [user.uid]: 0 },
        createdAt: serverTimestamp(),
      });
    }
    setConvId(cid);
    setOtherUser(user);
    setScreen("chat");
    setSearch("");
    setShowEmoji(false);
  };

  const openExisting = (conv) => {
    const oUid = conv.participants?.find(p => p !== profile?.uid);
    setConvId(conv.id);
    setOtherUser({
      uid:    oUid,
      name:   conv.participantNames?.[oUid] || "Utilisateur",
      role:   conv.participantRoles?.[oUid] || "etudiant",
      avatar: conv.participantAvatars?.[oUid],
      photoURL: conv.participantPhotos?.[oUid] || null,
    });
    setScreen("chat");
    updateDoc(doc(db, "conversations", conv.id), { [`unread.${profile.uid}`]: 0 }).catch(() => {});
  };

  const send = useCallback(async (type = "text", content = null) => {
    if (sending) return;
    if (type === "text" && !text.trim() && !audioBlob) return;
    setSending(true);

    const base = {
      from: profile.uid, fromName: profile.name,
      fromRole: profile.role, fromAvatar: profile.avatar || profile.name?.slice(0, 2),
      type, createdAt: serverTimestamp(), reactions: {},
      replyTo: replyTo ? { id: replyTo.id, text: replyTo.text || "🎤 Audio", from: replyTo.fromName } : null,
    };

    if (type === "text")  base.text = text.trim();
    if (type === "emoji") { base.text = content; base.isSticker = true; }
    if (type === "audio" && audioBlob) {
      base.text = "🎤 Note vocale";
      base.audioURL = audioURL;
    }

    await addDoc(collection(db, "conversations", convId_, "messages"), base);
    await updateDoc(doc(db, "conversations", convId_), {
      lastMessage: base.text, lastAt: serverTimestamp(),
    });

    setText(""); setAudioBlob(null); setAudioURL(null); setReplyTo(null);
    setSending(false);
    if (inputRef.current) { inputRef.current.style.height = "auto"; }
  }, [sending, text, audioBlob, audioURL, replyTo, convId_, profile]);

  const react = async (msgId, emoji) => {
    const ref_ = doc(db, "conversations", convId_, "messages", msgId);
    const snap = await getDoc(ref_);
    if (!snap.exists()) return;
    const reactions = snap.data().reactions || {};
    const users = reactions[emoji] || [];
    await updateDoc(ref_, {
      [`reactions.${emoji}`]: users.includes(profile.uid)
        ? users.filter(u => u !== profile.uid)
        : [...users, profile.uid],
    });
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mrRef.current = new MediaRecorder(stream);
      audioChunks.current = [];
      mrRef.current.ondataavailable = e => audioChunks.current.push(e.data);
      mrRef.current.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mrRef.current.start();
      setRecording(true);
    } catch { alert("Microphone non disponible."); }
  };

  const stopRec = () => { mrRef.current?.stop(); setRecording(false); };

  const fmt = ts => {
    if (!ts?.toDate) return "";
    const d = ts.toDate(), now = new Date(), diff = now - d;
    if (diff < 60000) return "maintenant";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min`;
    if (diff < 86400000) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    if (diff < 604800000) return d.toLocaleDateString("fr-FR", { weekday: "short" });
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
  };

  const contextKey = `${profile?.role}_${otherUser?.role}`;
  const contextMsg = CONTEXT[contextKey];

  // ── Liste des conversations ──────────────────────────────────────────────
  if (screen === "list") return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fff" }}>
      {/* Header */}
      <div style={{ padding: "16px 16px 12px", background: `linear-gradient(135deg,${C.navy},#1e3a5f)`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "1.15rem", color: "#fff" }}>Messages</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setScreen("new")} style={{ padding: "7px 14px", borderRadius: 20, background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: "0.82rem", backdropFilter: "blur(8px)" }}>
              ✏️ Nouveau
            </button>
            {onClose && <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", cursor: "pointer", fontSize: "0.9rem" }}>✕</button>}
          </div>
        </div>
        <input
          style={{ width: "100%", padding: "9px 16px", borderRadius: 20, border: "none", background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: "0.84rem", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
          placeholder="🔍 Rechercher..."
          value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Liste */}
      <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc" }}>
        {convs.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: 14 }}>💬</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, color: C.navy, fontSize: "1rem", marginBottom: 6 }}>Aucune conversation</div>
            <div style={{ fontSize: "0.83rem", color: C.muted, marginBottom: 20 }}>Envoyez votre premier message</div>
            <button onClick={() => setScreen("new")} style={{ ...css.btnPrimary, borderRadius: 20 }}>✏️ Nouveau message</button>
          </div>
        ) : convs
          .filter(c => {
            if (!search) return true;
            const oUid = c.participants?.find(p => p !== profile?.uid);
            return c.participantNames?.[oUid]?.toLowerCase().includes(search.toLowerCase());
          })
          .map(conv => {
            const oUid  = conv.participants?.find(p => p !== profile?.uid);
            const oName = conv.participantNames?.[oUid] || "Utilisateur";
            const oRole = conv.participantRoles?.[oUid] || "etudiant";
            const oPhoto = conv.participantPhotos?.[oUid] || null;
            const oAv   = conv.participantAvatars?.[oUid] || oName.slice(0, 2);
            const r     = getRoleInfo(oRole);
            const unread = conv.unread?.[profile.uid] || 0;
            return (
              <div key={conv.id} onClick={() => openExisting(conv)} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 16px", cursor: "pointer",
                background: "#fff", marginBottom: 1,
                borderBottom: `1px solid ${C.border}`,
                transition: "background 0.15s",
              }}>
                <Avatar user={{ name: oName, role: oRole, avatar: oAv, photoURL: oPhoto }} size={48} showOnline />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <span style={{ fontWeight: unread > 0 ? 800 : 600, fontSize: "0.92rem", color: C.navy }}>{oName}</span>
                    <span style={{ fontSize: "0.7rem", color: unread > 0 ? C.blue : C.muted, fontWeight: unread > 0 ? 700 : 400 }}>{fmt(conv.lastAt)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.81rem", color: unread > 0 ? C.dark : C.muted, fontWeight: unread > 0 ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>
                      {conv.lastMessage || "Nouvelle conversation"}
                    </span>
                    {unread > 0 && (
                      <span style={{ minWidth: 20, height: 20, borderRadius: 10, background: C.blue, color: "#fff", fontSize: "0.68rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px", flexShrink: 0 }}>{unread}</span>
                    )}
                  </div>
                  <span style={{ ...css.badge(r.bg, r.color), fontSize: "0.68rem", marginTop: 4, display: "inline-flex" }}>{r.icon} {r.label}</span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );

  // ── Nouveau message ──────────────────────────────────────────────────────
  if (screen === "new") return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fff" }}>
      <div style={{ padding: "14px 16px 12px", background: `linear-gradient(135deg,${C.navy},#1e3a5f)`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <button onClick={() => setScreen("list")} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", cursor: "pointer", fontSize: "1rem" }}>←</button>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "1rem", color: "#fff" }}>Nouveau message</div>
          {onClose && <button onClick={onClose} style={{ marginLeft: "auto", width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", cursor: "pointer" }}>✕</button>}
        </div>
        <input
          style={{ width: "100%", padding: "9px 16px", borderRadius: 20, border: "none", background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: "0.84rem", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
          placeholder="🔍 Rechercher par nom, rôle, filière..."
          value={search} onChange={e => setSearch(e.target.value)} autoFocus
        />
        <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", marginTop: 8 }}>{filtered.length} utilisateur(s)</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.map(u => {
          const r = getRoleInfo(u.role);
          return (
            <div key={u.id} onClick={() => openConv(u)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", cursor: "pointer", borderBottom: `1px solid ${C.border}`, transition: "background 0.15s" }}>
              <Avatar user={u} size={44} showOnline />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "0.92rem", color: C.navy, marginBottom: 4 }}>{u.name}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ ...css.badge(r.bg, r.color), fontSize: "0.7rem" }}>{r.icon} {r.label}</span>
                  {u.filiere && <span style={{ fontSize: "0.72rem", color: C.muted }}>{u.filiere.split(" - ").pop()}</span>}
                  {u.promo && <span style={{ fontSize: "0.72rem", color: C.muted }}>{u.promo}</span>}
                </div>
              </div>
              <span style={{ color: C.blue, fontSize: "1.1rem" }}>→</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── Conversation ─────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: CH.bg }}>

      {/* Header conversation */}
      <div style={{ padding: "10px 14px", background: `linear-gradient(135deg,${C.navy},#1e3a5f)`, display: "flex", alignItems: "center", gap: 10, flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
        <button onClick={() => { setScreen("list"); setConvId(null); setOtherUser(null); setShowEmoji(false); setReplyTo(null); }} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", cursor: "pointer", fontSize: "1rem", flexShrink: 0 }}>←</button>
        {otherUser && <Avatar user={{...otherUser, online: presence?.online}} size={38} showOnline={!!presence?.online} />}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#fff" }}>{otherUser?.name}</div>
          <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: 4 }}>
            {presence?.online && <span style={{ width: 6, height: 6, borderRadius: "50%", background: CH.online, display: "inline-block" }} />}
            {presenceLabel()}
          </div>
        </div>
        {onClose && <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", cursor: "pointer", flexShrink: 0 }}>✕</button>}
      </div>

      {/* Bandeau contexte */}
      {contextMsg && (
        <div style={{ padding: "7px 14px", background: "#fffbeb", borderBottom: "1px solid #fde68a", fontSize: "0.76rem", color: "#92400e", display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
          <span style={{ fontSize: "1rem" }}>ℹ️</span> {contextMsg}
        </div>
      )}

      {/* Reply preview */}
      {replyTo && (
        <div style={{ padding: "8px 14px", background: C.blueLight, borderBottom: `1px solid ${C.blueBorder}`, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.72rem", color: C.blue, fontWeight: 700 }}>↩ {replyTo.fromName}</div>
            <div style={{ fontSize: "0.8rem", color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{replyTo.text}</div>
          </div>
          <button onClick={() => setReplyTo(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "1rem" }}>✕</button>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column" }}>
        {messages.length === 0 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.muted, gap: 10 }}>
            <div style={{ fontSize: "3rem" }}>👋</div>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: C.navy }}>Démarrez la conversation</div>
            <div style={{ fontSize: "0.78rem" }}>Envoyez votre premier message à {otherUser?.name}</div>
          </div>
        )}
        {messages.map((m, i) => {
          const isMine = m.from === profile?.uid;
          const prev = messages[i - 1];
          const showDate = i === 0 || prev?.createdAt?.toDate?.()?.toDateString() !== m.createdAt?.toDate?.()?.toDateString();
          const showAvatar = !isMine && (i === 0 || messages[i - 1]?.from !== m.from);
          return (
            <div key={m.id}>
              {showDate && <DateSep ts={m.createdAt} />}
              <Bubble
                msg={m} isMine={isMine} profile={profile}
                onReply={setReplyTo} onReact={react}
                showAvatar={showAvatar}
                senderUser={!isMine ? otherUser : null}
                read={isMine && isReadByOther(m)}
              />
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Panneau emoji */}
      {showEmoji && (
        <div style={{ flexShrink: 0, background: "#fff", borderTop: `1px solid ${C.border}`, maxHeight: 230, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", gap: 4, padding: "8px 12px", borderBottom: `1px solid ${C.border}`, overflowX: "auto" }}>
            {Object.keys(EMOJIS).map(tab => (
              <button key={tab} onClick={() => setEmojiTab(tab)} style={{ padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "0.82rem", whiteSpace: "nowrap", background: emojiTab === tab ? C.blueLight : "transparent", color: emojiTab === tab ? C.blue : C.mid, fontWeight: emojiTab === tab ? 700 : 400 }}>
                {tab}
              </button>
            ))}
          </div>
          <div style={{ overflowY: "auto", padding: "8px 12px", display: "flex", flexWrap: "wrap", gap: 4 }}>
            {EMOJIS[emojiTab].map(e => (
              <button key={e} onClick={() => { setText(t => t + e); setShowEmoji(false); inputRef.current?.focus(); }} style={{ width: 38, height: 38, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", fontSize: "1.35rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Audio preview */}
      {(audioURL || recording) && (
        <div style={{ flexShrink: 0, padding: "8px 12px", background: recording ? "#fef2f2" : C.blueLight, borderTop: `1px solid ${recording ? C.redBorder : C.blueBorder}`, display: "flex", alignItems: "center", gap: 8 }}>
          {recording ? (
            <>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.red, flexShrink: 0 }} />
              <span style={{ fontSize: "0.84rem", color: C.red, flex: 1 }}>Enregistrement...</span>
              <button onClick={stopRec} style={{ ...css.btnDanger, fontSize: "0.8rem", padding: "5px 12px" }}>⏹ Stop</button>
            </>
          ) : (
            <>
              <span style={{ fontSize: "1.1rem" }}>🎤</span>
              <audio controls src={audioURL} style={{ height: 28, flex: 1 }} />
              <button onClick={() => { setAudioBlob(null); setAudioURL(null); }} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: "1rem" }}>✕</button>
              <button onClick={() => send("audio")} style={{ ...css.btnPrimary, fontSize: "0.8rem", padding: "5px 14px", borderRadius: 20 }}>Envoyer</button>
            </>
          )}
        </div>
      )}

      {/* Zone de saisie */}
      <div style={{ flexShrink: 0, background: "#fff", borderTop: `1px solid ${C.border}`, padding: "8px 10px", display: "flex", alignItems: "flex-end", gap: 8 }}>
        {/* Emoji */}
        <button onClick={() => setShowEmoji(!showEmoji)} style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: showEmoji ? C.blueLight : "#f1f5f9", cursor: "pointer", fontSize: "1.25rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s" }}>
          {showEmoji ? "⌨️" : "😊"}
        </button>

        {/* Input */}
        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          onChange={e => {
            setText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 110) + "px";
          }}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Message..."
          style={{ flex: 1, resize: "none", borderRadius: 22, border: `1px solid ${C.border}`, padding: "9px 14px", fontSize: "0.87rem", fontFamily: "inherit", outline: "none", lineHeight: 1.45, background: "#f8fafc", maxHeight: 110, overflowY: "auto" }}
        />

        {/* Micro / Envoyer */}
        {text.trim() || audioURL ? (
          <button onClick={() => send()} disabled={sending} style={{ width: 42, height: 42, borderRadius: "50%", border: "none", background: `linear-gradient(135deg,${C.blue},${C.aqua})`, color: "#fff", cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: sending ? 0.6 : 1, boxShadow: "0 3px 10px rgba(37,99,235,0.35)", transition: "all 0.15s" }}>
            ➤
          </button>
        ) : (
          <button
            onMouseDown={startRec} onMouseUp={stopRec}
            onTouchStart={startRec} onTouchEnd={stopRec}
            style={{ width: 42, height: 42, borderRadius: "50%", border: "none", background: recording ? `linear-gradient(135deg,${C.red},#ef4444)` : `linear-gradient(135deg,${C.green},#10b981)`, color: "#fff", cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 3px 10px ${recording ? C.red : C.green}40` }}>
            🎤
          </button>
        )}
      </div>
    </div>
  );
}