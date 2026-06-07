// src/pages/Groups.jsx
import { useState, useEffect, useRef } from "react";
import { C, ROLES, css, GRADIENTS, SHADOWS } from "../design";
import { useAuth } from "../AuthContext";
import {
  useGroups, useGroupMessages, createGroup, joinGroup, leaveGroup, sendGroupMessage, updateDocument,
} from "../hooks/useFirestore";
import { arrayUnion, arrayRemove, serverTimestamp } from "firebase/firestore";

const ICONS  = ["⚓","📦","⚖️","🚢","📋","🎓","📚","💼","🔬","🌊","🏆","💬","🛳️","🗺️","📊"];
const COLORS = ["#2563eb","#059669","#7c3aed","#d97706","#dc2626","#0891b2","#db2777"];

const getRoleInfo = r => ROLES.find(x => x.id===r) || { color:C.blue, bg:C.blueLight, icon:"👤", label:r };

function GroupChat({ group, profile, onBack }) {
  const { msgs } = useGroupMessages(group.id);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    await sendGroupMessage(group.id, {
      from:       profile.uid,
      fromName:   profile.name,
      fromAvatar: profile.avatar || profile.name?.slice(0,2),
      fromRole:   profile.role,
      photoURL:   profile.photoURL || null,
      text:       text.trim(),
    });
    setText(""); setSending(false);
  };

  const fmt = ts => {
    if (!ts?.toDate) return "";
    const d = ts.toDate(), now = new Date(), diff = now - d;
    if (diff < 60000) return "maintenant";
    if (diff < 3600000) return `${Math.floor(diff/60000)}min`;
    return d.toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" });
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:"#eef2f7" }}>
      {/* Header */}
      <div style={{ padding:"10px 14px", background:`linear-gradient(135deg,${C.navy},#1e3a5f)`, display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
        <button onClick={onBack} style={{ width:32, height:32, borderRadius:"50%", background:"rgba(255,255,255,0.12)", border:"none", color:"#fff", cursor:"pointer", fontSize:"1rem", flexShrink:0 }}>←</button>
        <div style={{ width:38, height:38, borderRadius:10, background:`${group.color||C.blue}25`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.2rem", flexShrink:0 }}>{group.icon||"💬"}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:"0.95rem", color:"#fff" }}>{group.name}</div>
          <div style={{ fontSize:"0.7rem", color:"rgba(255,255,255,0.5)" }}>{group.members?.length||0} membres</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", padding:"12px 14px", display:"flex", flexDirection:"column", gap:8 }}>
        {msgs.length === 0 && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:C.muted, gap:8, padding:40 }}>
            <div style={{ fontSize:"2.5rem" }}>{group.icon||"💬"}</div>
            <div style={{ fontWeight:700, color:C.navy, fontSize:"0.9rem" }}>{group.name}</div>
            <div style={{ fontSize:"0.8rem", textAlign:"center" }}>Personne n'a encore écrit ici.<br/>Soyez le premier !</div>
          </div>
        )}
        {msgs.map((m, i) => {
          const isMine = m.from === profile.uid;
          const r = getRoleInfo(m.fromRole);
          const showName = !isMine && (i===0 || msgs[i-1]?.from !== m.from);
          return (
            <div key={m.id} style={{ display:"flex", justifyContent:isMine?"flex-end":"flex-start", alignItems:"flex-end", gap:8 }}>
              {!isMine && (
                <div style={{ width:30, height:30, borderRadius:"50%", background:m.photoURL?"transparent":r.bg, color:r.color,
                  display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:"0.62rem", overflow:"hidden", flexShrink:0 }}>
                  {m.photoURL ? <img src={m.photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : (m.fromAvatar||m.fromName?.slice(0,2))}
                </div>
              )}
              <div style={{ maxWidth:"72%" }}>
                {showName && <div style={{ fontSize:"0.7rem", fontWeight:700, color:r.color, marginBottom:3, paddingLeft:4 }}>{m.fromName}</div>}
                <div style={{
                  padding:"9px 13px", borderRadius:isMine?"16px 16px 4px 16px":"16px 16px 16px 4px",
                  background:isMine?"#2563eb":"#fff", color:isMine?"#fff":"#1e293b",
                  fontSize:"0.88rem", lineHeight:1.5, boxShadow:"0 1px 6px rgba(0,0,0,0.08)",
                }}>
                  <span style={{ whiteSpace:"pre-wrap", wordBreak:"break-word" }}>{m.text}</span>
                  <div style={{ fontSize:"0.62rem", marginTop:4, textAlign:"right", opacity:0.6 }}>{fmt(m.createdAt)}</div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{ flexShrink:0, background:"#fff", borderTop:`1px solid ${C.border}`, padding:"8px 10px", display:"flex", gap:8, alignItems:"flex-end" }}>
        <textarea rows={1} value={text}
          onChange={e => { setText(e.target.value); e.target.style.height="auto"; e.target.style.height=Math.min(e.target.scrollHeight,100)+"px"; }}
          onKeyDown={e => { if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); send(); }}}
          placeholder="Écrire dans le groupe…"
          style={{ flex:1, resize:"none", borderRadius:20, border:`1px solid ${C.border}`, padding:"9px 14px", fontSize:"0.87rem", fontFamily:"inherit", outline:"none", background:"#f8fafc", maxHeight:100 }}/>
        <button onClick={send} disabled={!text.trim()||sending} style={{
          width:40, height:40, borderRadius:"50%", border:"none", cursor:"pointer",
          background:text.trim()?`linear-gradient(135deg,${C.blue},${C.aqua})`:"#e2e8f0",
          color:text.trim()?"#fff":C.muted, fontSize:"1.1rem", display:"flex", alignItems:"center", justifyContent:"center",
          flexShrink:0, transition:"all 0.15s",
        }}>➤</button>
      </div>
    </div>
  );
}

export default function PageGroups({ profile }) {
  const { user } = useAuth();
  const uid = user?.uid || profile?.uid;
  const { data: groups, loading } = useGroups();
  const [activeGroup, setActiveGroup] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name:"", description:"", icon:"💬", color:"#2563eb", whatsappLink:"" });
  const [creating, setCreating] = useState(false);
  const [createdGroup, setCreatedGroup] = useState(null);
  const [filter, setFilter] = useState("tous"); // "tous" | "mes"

  const mesGroupes = groups.filter(g => g.members?.includes(uid));
  const displayed  = filter === "mes" ? mesGroupes : groups;

  const handleCreate = async () => {
    if (!createForm.name.trim()) return;
    setCreating(true);
    await createGroup({
      name:         createForm.name.trim(),
      description:  createForm.description.trim(),
      icon:         createForm.icon,
      color:        createForm.color,
      whatsappLink: createForm.whatsappLink.trim() || null,
      members:      [uid],
      admins:       [uid],
      createdBy:    uid,
      lastMessage:  "",
    });
    setCreatedGroup(createForm.name.trim());
    setCreateForm({ name:"", description:"", icon:"💬", color:"#2563eb", whatsappLink:"" });
    setShowCreate(false); setCreating(false);
  };

  const handleJoin = async (g, e) => {
    e.stopPropagation();
    await joinGroup(g.id, uid);
  };

  const handleLeave = async (g, e) => {
    e.stopPropagation();
    if (!confirm(`Quitter "${g.name}" ?`)) return;
    await leaveGroup(g.id, uid);
    if (activeGroup?.id === g.id) setActiveGroup(null);
  };

  if (activeGroup) return <GroupChat group={activeGroup} profile={{...profile, uid}} onBack={() => setActiveGroup(null)} />;

  if (loading) return <div style={{ padding:40, textAlign:"center", color:C.muted }}>Chargement…</div>;

  return (
    <div style={{ maxWidth:680, margin:"0 auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12, marginBottom:20 }}>
        <div>
          <div style={css.pageH}>Groupes</div>
          <div style={css.pageSub}>{groups.length} groupes · {mesGroupes.length} rejoints</div>
        </div>
        <button style={css.btnPrimary} onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Annuler" : "+ Créer un groupe"}
        </button>
      </div>

      {/* Formulaire création */}
      {showCreate && (
        <div style={{ ...css.card, marginBottom:18, background:C.blueLight, border:`1px solid ${C.blueBorder}` }}>
          <div style={{ fontWeight:700, color:C.navy, marginBottom:14 }}>💬 Nouveau groupe</div>
          <div style={{ marginBottom:10 }}>
            <span style={css.label}>Nom du groupe *</span>
            <input style={css.input} placeholder="Ex: Révision Droit Maritime"
              value={createForm.name} onChange={e => setCreateForm({...createForm, name:e.target.value})}/>
          </div>
          <div style={{ marginBottom:12 }}>
            <span style={css.label}>Description</span>
            <input style={css.input} placeholder="À quoi sert ce groupe ?"
              value={createForm.description} onChange={e => setCreateForm({...createForm, description:e.target.value})}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
            <div>
              <span style={css.label}>Icône</span>
              <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:4 }}>
                {ICONS.map(ic => (
                  <button key={ic} onClick={() => setCreateForm({...createForm, icon:ic})}
                    style={{ width:32, height:32, borderRadius:8, border:`2px solid ${createForm.icon===ic?C.blue:"transparent"}`, background:createForm.icon===ic?C.blueLight:"#f1f5f9", cursor:"pointer", fontSize:"1rem" }}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span style={css.label}>Couleur</span>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:4 }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setCreateForm({...createForm, color:c})}
                    style={{ width:28, height:28, borderRadius:"50%", background:c, border:`3px solid ${createForm.color===c?"#fff":"transparent"}`, outline:createForm.color===c?`2px solid ${c}`:"none", cursor:"pointer" }}/>
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <span style={css.label}>Lien WhatsApp (optionnel)</span>
            <input style={css.input} placeholder="https://chat.whatsapp.com/…"
              value={createForm.whatsappLink} onChange={e => setCreateForm({...createForm, whatsappLink:e.target.value})}/>
            <div style={{ fontSize:"0.73rem", color:C.muted, marginTop:3 }}>Collez un lien d'invitation WhatsApp pour connecter ce groupe</div>
          </div>
          <button style={{ ...css.btnPrimary, opacity:creating?0.7:1 }} onClick={handleCreate} disabled={creating}>
            {creating ? "⏳ Création…" : "✅ Créer le groupe"}
          </button>
        </div>
      )}

      {/* Bannière post-création — partager sur WhatsApp */}
      {createdGroup && (
        <div style={{ ...css.card, marginBottom:16, background:"#f0fdf4", border:"1px solid #bbf7d0", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, color:"#059669", fontSize:"0.88rem" }}>✅ Groupe « {createdGroup} » créé !</div>
            <div style={{ fontSize:"0.78rem", color:C.muted, marginTop:2 }}>Invitez des membres en partageant sur WhatsApp.</div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Rejoignez le groupe "${createdGroup}" sur ARSTM Campus !`)}`}
              target="_blank" rel="noreferrer"
              style={{ padding:"8px 14px", borderRadius:20, background:"#25D366", color:"#fff", fontWeight:700, fontSize:"0.8rem", textDecoration:"none", display:"flex", alignItems:"center", gap:6 }}>
              <svg width="16" height="16" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill="white" fillOpacity="0.2"/><path d="M23.5 8.5C21.7 6.7 19.4 5.7 16.9 5.7C11.7 5.7 7.5 9.9 7.5 15.1C7.5 16.8 8 18.4 8.8 19.8L7.4 24.3L12 22.9C13.4 23.7 14.9 24.1 16.5 24.1H16.9C22.1 24.1 26.3 19.9 26.3 14.7C26.3 12.2 25.3 9.9 23.5 8.5Z" fill="white"/></svg>
              Partager
            </a>
            <button onClick={() => setCreatedGroup(null)} style={{ padding:"8px 12px", borderRadius:20, background:"transparent", border:"1px solid #bbf7d0", color:"#059669", fontSize:"0.8rem", cursor:"pointer", fontFamily:"inherit" }}>✕</button>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {[["tous","Tous les groupes"],["mes","Mes groupes"]].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)} style={{
            padding:"7px 16px", borderRadius:20, border:`1px solid ${filter===v?C.blue:C.border}`,
            background:filter===v?C.blue:"#fff", color:filter===v?"#fff":C.mid,
            cursor:"pointer", fontFamily:"inherit", fontWeight:600, fontSize:"0.82rem",
          }}>{l}</button>
        ))}
      </div>

      {/* Liste */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {displayed.map(g => {
          const isMember = g.members?.includes(uid);
          return (
            <div key={g.id} onClick={() => isMember && setActiveGroup(g)}
              style={{ ...css.card, display:"flex", alignItems:"center", gap:14, cursor:isMember?"pointer":"default",
                transition:"all 0.18s", opacity:1 }}
              onMouseEnter={e => { if(isMember) e.currentTarget.style.boxShadow="0 6px 20px rgba(37,99,235,0.12)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow=""; }}>
              <div style={{ width:50, height:50, borderRadius:14, background:`${g.color||C.blue}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.4rem", flexShrink:0, border:`2px solid ${g.color||C.blue}30` }}>
                {g.icon||"💬"}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, color:C.navy, fontSize:"0.92rem", marginBottom:2 }}>{g.name}</div>
                {g.description && <div style={{ fontSize:"0.76rem", color:C.muted, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{g.description}</div>}
                <div style={{ display:"flex", gap:8, marginTop:4, alignItems:"center" }}>
                  <span style={{ fontSize:"0.73rem", color:C.muted }}>👥 {g.members?.length||0} membres</span>
                  {g.lastMessage && <span style={{ fontSize:"0.73rem", color:C.muted, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:160 }}>· {g.lastMessage}</span>}
                </div>
              </div>
              <div style={{ flexShrink:0, display:"flex", flexDirection:"column", gap:6, alignItems:"flex-end" }}>
                {isMember ? (
                  <div style={{ display:"flex", gap:6 }}>
                    <span style={{ ...css.badge(C.greenLight, C.green), fontSize:"0.7rem" }}>✓ Membre</span>
                    <button style={{ ...css.btnSm, background:C.redLight, color:C.red, border:"none", fontSize:"0.72rem" }}
                      onClick={e => handleLeave(g, e)}>Quitter</button>
                  </div>
                ) : (
                  <button style={{ ...css.btnPrimary, fontSize:"0.78rem", padding:"7px 14px", borderRadius:20 }}
                    onClick={e => handleJoin(g, e)}>
                    + Rejoindre
                  </button>
                )}
                {g.whatsappLink && (
                  <a href={g.whatsappLink} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}
                    style={{ fontSize:"0.72rem", color:"#059669", textDecoration:"none", display:"flex", alignItems:"center", gap:4, padding:"4px 8px", borderRadius:10, background:"#f0fdf4", border:"1px solid #bbf7d0" }}>
                    <svg width="12" height="12" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill="#25D366"/><path d="M23.5 8.5C21.7 6.7 19.4 5.7 16.9 5.7C11.7 5.7 7.5 9.9 7.5 15.1C7.5 16.8 8 18.4 8.8 19.8L7.4 24.3L12 22.9C13.4 23.7 14.9 24.1 16.5 24.1H16.9C22.1 24.1 26.3 19.9 26.3 14.7C26.3 12.2 25.3 9.9 23.5 8.5Z" fill="white"/></svg>
                    Groupe WA
                  </a>
                )}
              </div>
            </div>
          );
        })}
        {displayed.length === 0 && (
          <div style={{ ...css.card, textAlign:"center", padding:48, color:C.muted }}>
            <div style={{ fontSize:"2.5rem", marginBottom:12 }}>👥</div>
            <div style={{ fontWeight:600, color:C.navy, marginBottom:6 }}>
              {filter==="mes" ? "Vous n'avez rejoint aucun groupe" : "Aucun groupe disponible"}
            </div>
            <div style={{ fontSize:"0.84rem" }}>Créez le premier groupe de la communauté !</div>
          </div>
        )}
      </div>
    </div>
  );
}
