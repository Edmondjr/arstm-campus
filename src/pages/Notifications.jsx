// src/pages/Notifications.jsx
import { useEffect } from "react";
import { C, ROLES, css } from "../design";
import { useNotifs, markNotifsRead, updateDocument } from "../hooks/useFirestore";
import { useAuth } from "../AuthContext";
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const TYPE_META = {
  comment:  { icon:"💬", label:"a commenté votre publication", color:C.blue,   bg:C.blueLight },
  reaction: { icon:"❤️", label:"a réagi à votre publication",  color:"#dc2626", bg:"#fef2f2" },
  message:  { icon:"✉️", label:"vous a envoyé un message",     color:C.aqua,   bg:"#ecfeff" },
  annonce:  { icon:"📢", label:"Nouvelle annonce urgente",      color:C.red,    bg:C.redLight },
  group:    { icon:"👥", label:"a rejoint votre groupe",        color:C.green,  bg:C.greenLight },
};

export default function PageNotifications({ profile, onGoTo }) {
  const { user } = useAuth();
  const uid = user?.uid || profile?.uid;
  const { notifs, unread, loading } = useNotifs(uid);

  // Mark all as read when we open this page
  useEffect(() => {
    if (!uid || unread === 0) return;
    const unsub = markNotifsRead(uid);
    return () => { if(typeof unsub === "function") unsub(); };
  }, [uid]);

  const fmt = ts => {
    if (!ts?.toDate) return "";
    const d = ts.toDate(), diff = Date.now() - d.getTime();
    if (diff < 60000) return "à l'instant";
    if (diff < 3600000) return `il y a ${Math.floor(diff/60000)} min`;
    if (diff < 86400000) return `il y a ${Math.floor(diff/3600000)}h`;
    return d.toLocaleDateString("fr-FR", { day:"2-digit", month:"short" });
  };

  if (loading) return <div style={{ padding:40, textAlign:"center", color:C.muted }}>Chargement…</div>;

  return (
    <div style={{ maxWidth:600, margin:"0 auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <div style={css.pageH}>Notifications</div>
          <div style={css.pageSub}>{notifs.length} notifications {unread > 0 ? `· ${unread} non lues` : ""}</div>
        </div>
        {unread > 0 && (
          <button style={{ ...css.btnSecondary, fontSize:"0.8rem" }} onClick={() => markNotifsRead(uid)}>
            Tout marquer lu
          </button>
        )}
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {notifs.length === 0 && (
          <div style={{ ...css.card, textAlign:"center", padding:48, color:C.muted }}>
            <div style={{ fontSize:"2.5rem", marginBottom:12 }}>🔔</div>
            <div style={{ fontWeight:600, color:C.navy, marginBottom:6 }}>Aucune notification</div>
            <div style={{ fontSize:"0.84rem" }}>Vous êtes à jour !</div>
          </div>
        )}
        {notifs.map(n => {
          const meta = TYPE_META[n.type] || TYPE_META.comment;
          return (
            <div key={n.id}
              onClick={() => n.postId && onGoTo && onGoTo("social")}
              style={{
                ...css.card, display:"flex", gap:12, cursor:n.postId?"pointer":"default",
                background: n.read ? "#fff" : `${meta.bg}80`,
                borderLeft:`3px solid ${n.read ? C.border : meta.color}`,
                transition:"all 0.15s",
              }}>
              <div style={{ width:44, height:44, borderRadius:"50%", background:meta.bg,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.2rem", flexShrink:0 }}>
                {n.fromAvatar ? (
                  <div style={{ width:44, height:44, borderRadius:"50%", background:C.blueLight,
                    display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:"0.9rem", color:C.blue }}>
                    {n.fromAvatar}
                  </div>
                ) : meta.icon}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:"0.88rem", color:C.dark, lineHeight:1.4, marginBottom:4 }}>
                  {n.fromName && <strong style={{ color:C.navy }}>{n.fromName} </strong>}
                  {meta.label}
                  {n.emoji && <span style={{ marginLeft:4 }}>{n.emoji}</span>}
                </div>
                {n.postText && (
                  <div style={{ fontSize:"0.76rem", color:C.muted, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", marginBottom:4, padding:"4px 8px", background:C.surfaceAlt, borderRadius:6 }}>
                    "{n.postText}"
                  </div>
                )}
                <div style={{ fontSize:"0.72rem", color:C.muted, display:"flex", alignItems:"center", gap:6 }}>
                  {!n.read && <span style={{ width:6, height:6, borderRadius:"50%", background:meta.color, display:"inline-block" }}/>}
                  {fmt(n.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
