// src/pages/Admin.jsx
import { useState, useEffect } from "react";
import { C, ROLES, css } from "../design";
import {
  useUsers, approveUser, rejectUser, useCollection,
  updateDocument, deleteDocument, seedDemoData
} from "../hooks/useFirestore";
import {
  doc, updateDoc, serverTimestamp, onSnapshot,
  collection, query, orderBy, where, setDoc, getDocs
} from "firebase/firestore";
import { db } from "../firebase";

// ── Présence en ligne ──
function usePresence(uid) {
  useEffect(() => {
    if (!uid) return;
    const ref = doc(db, "presence", uid);
    setDoc(ref, { online:true, lastSeen:serverTimestamp(), uid }, { merge:true });
    const off = () => setDoc(ref, { online:false, lastSeen:serverTimestamp(), uid }, { merge:true });
    window.addEventListener("beforeunload", off);
    return () => { off(); window.removeEventListener("beforeunload", off); };
  }, [uid]);
}

function useOnlineUsers() {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    const q = query(collection(db, "presence"), where("online","==",true));
    return onSnapshot(q, snap => setUsers(snap.docs.map(d=>({id:d.id,...d.data()}))));
  }, []);
  return users;
}

function useTicketsRT() {
  const [tickets, setTickets] = useState([]);
  useEffect(() => {
    const q = query(collection(db,"tickets"), orderBy("createdAt","desc"));
    return onSnapshot(q, snap => setTickets(snap.docs.map(d=>({id:d.id,...d.data()}))));
  }, []);
  return tickets;
}

function useActivityRT() {
  const [activity, setActivity] = useState([]);
  useEffect(() => {
    const q = query(collection(db,"activity"), orderBy("createdAt","desc"));
    const unsub = onSnapshot(q, snap => setActivity(snap.docs.slice(0,20).map(d=>({id:d.id,...d.data()}))));
    return unsub;
  }, []);
  return activity;
}

export default function PageAdmin({ profile, activeMode = "control" }) {
  usePresence(profile?.uid);

  const [tab, setTab]           = useState("dashboard");
  const [search, setSearch]     = useState("");
  const [filterRole, setFilterRole] = useState("tous");
  const [filterStatus, setFilterStatus] = useState("tous");
  const [seeding, setSeeding]   = useState(false);
  const [seedDone, setSeedDone] = useState(false);
  const [ticketReply, setTicketReply] = useState({});
  const [ticketFilter, setTicketFilter] = useState("all");

  const { data: pending }  = useUsers("pending");
  const { data: approved } = useUsers("approved");
  const { data: rejected } = useUsers("rejected");
  const { data: blocked }  = useUsers("blocked");
  const { data: posts }    = useCollection("posts");
  const { data: annonces } = useCollection("annonces");
  const { data: ressources } = useCollection("ressources");
  const allTickets   = useTicketsRT();
  const onlineUsers  = useOnlineUsers();
  const activity     = useActivityRT();

  const allUsers = [...pending,...approved,...rejected,...blocked];
  const openTickets     = allTickets.filter(t=>t.status==="open");
  const progressTickets = allTickets.filter(t=>t.status==="inprogress");
  const resolvedTickets = allTickets.filter(t=>t.status==="resolved");
  const urgentTickets   = allTickets.filter(t=>t.priorite==="urgente"&&t.status!=="resolved");

  const filteredUsers = allUsers.filter(u => {
    const s = !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const r = filterRole==="tous" || u.role===filterRole;
    const st = filterStatus==="tous" || u.status===filterStatus;
    return s && r && st;
  });

  const ticketsList = ticketFilter==="all" ? allTickets
    : ticketFilter==="open" ? openTickets
    : ticketFilter==="inprogress" ? progressTickets
    : resolvedTickets;

  // ── Actions ──
  const handleApprove  = uid => approveUser(uid);
  const handleReject   = uid => rejectUser(uid);
  const handleBlock    = uid => updateDocument("users", uid, { status:"blocked" });
  const handleUnblock  = uid => updateDocument("users", uid, { status:"approved" });
  const handleDelete   = async uid => {
    if (window.confirm("Supprimer définitivement ce compte ?"))
      await deleteDocument("users", uid);
  };
  const changeRole     = async (uid, newRole) => {
    await updateDocument("users", uid, { role:newRole });
  };
  const assignTicket   = id => updateDocument("tickets", id, {
    assignedTo:profile?.name, assignedUid:profile?.uid, status:"inprogress"
  });
  const replyTicket    = async id => {
    const r = ticketReply[id];
    if (!r?.trim()) return;
    await updateDocument("tickets", id, {
      reply:r, repliedBy:profile?.name,
      repliedAt:serverTimestamp(), status:"resolved"
    });
    setTicketReply(p=>({...p,[id]:""}));
  };
  const closeTicket    = id => updateDocument("tickets", id, { status:"resolved", closedBy:profile?.name });
  const deletePost     = async id => { if(window.confirm("Supprimer ce post ?")) await deleteDocument("posts",id); };
  const warnUser       = async (uid, name) => {
    await updateDocument("users", uid, { warned:true, warnedBy:profile?.name, warnedAt:serverTimestamp() });
    alert(`Avertissement envoyé à ${name}`);
  };
  const deleteAnnonce  = async id => { if(window.confirm("Supprimer cette annonce ?")) await deleteDocument("annonces",id); };
  const handleSeed     = async () => { setSeeding(true); await seedDemoData(); setSeeding(false); setSeedDone(true); };

  // ── Badge statut ──
  const statusBadge = s => ({
    approved: [C.greenLight, C.green,   "Approuvé"],
    pending:  [C.goldLight,  C.gold,    "En attente"],
    rejected: [C.redLight,   C.red,     "Refusé"],
    blocked:  ["#f3f4f6",   C.mid,     "Bloqué"],
  }[s] || [C.blueLight, C.blue, s]);

  // ── Composant UserCard ──
  const UserCard = ({ u, compact=false }) => {
    const r = ROLES.find(r=>r.id===u.role)||{};
    const [sbg,sfg,slabel] = statusBadge(u.status);
    const [showRoleEdit, setShowRoleEdit] = useState(false);
    return (
      <div style={{...css.card, marginBottom:8, padding:compact?10:14}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10,flexWrap:"wrap"}}>
          <div style={{width:38,height:38,borderRadius:"50%",background:r.bg||C.blueLight,
            color:r.color||C.blue,display:"flex",alignItems:"center",justifyContent:"center",
            fontWeight:700,fontSize:"0.82rem",flexShrink:0}}>
            {u.avatar||u.name?.slice(0,2)||"?"}
          </div>
          <div style={{flex:1,minWidth:160}}>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:2}}>
              <span style={{fontWeight:700,color:C.navy,fontSize:"0.9rem"}}>{u.name}</span>
              <span style={css.badge(sbg,sfg)}>{slabel}</span>
              {onlineUsers.some(o=>o.uid===u.uid) &&
                <span style={css.badge(C.greenLight,C.green)}>🟢 En ligne</span>}
              {u.warned && <span style={css.badge(C.goldLight,C.gold)}>⚠️ Averti</span>}
            </div>
            <div style={{fontSize:"0.76rem",color:C.muted,marginBottom:3}}>{u.email}</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
              <span style={css.badge(r.bg||C.blueLight,r.color||C.blue)}>{r.icon} {u.role}</span>
              {u.filiere&&<span style={css.badge(C.surfaceAlt,C.mid)}>{u.filiere}</span>}
              {u.promo&&<span style={css.badge(C.surfaceAlt,C.mid)}>{u.promo}</span>}
            </div>
            {u.createdAt?.toDate&&(
              <div style={{fontSize:"0.7rem",color:C.muted,marginTop:2}}>
                Inscrit le {u.createdAt.toDate().toLocaleDateString("fr-FR")}
              </div>
            )}
          </div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"flex-start"}}>
            {u.status==="pending"&&<>
              <button style={{...css.btnSm,background:C.greenLight,color:C.green,border:`1px solid ${C.greenBorder}`}}
                onClick={()=>handleApprove(u.uid||u.id)}>✓ Approuver</button>
              <button style={{...css.btnDanger,fontSize:"0.75rem",padding:"5px 10px"}}
                onClick={()=>handleReject(u.uid||u.id)}>✗ Refuser</button>
            </>}
            {u.status==="approved"&&<>
              <button style={{...css.btnSm,background:"#fef3c7",color:"#d97706",border:"1px solid #fde68a"}}
                onClick={()=>handleBlock(u.uid||u.id)}>🔒</button>
              <button style={{...css.btnSm,background:C.goldLight,color:C.gold,border:`1px solid ${C.goldBorder}`}}
                onClick={()=>warnUser(u.uid||u.id, u.name)}>⚠️</button>
            </>}
            {u.status==="blocked"&&
              <button style={{...css.btnSm,background:C.greenLight,color:C.green,border:`1px solid ${C.greenBorder}`}}
                onClick={()=>handleUnblock(u.uid||u.id)}>🔓</button>}
            {u.status==="rejected"&&
              <button style={{...css.btnSm,background:C.greenLight,color:C.green,border:`1px solid ${C.greenBorder}`}}
                onClick={()=>handleApprove(u.uid||u.id)}>↩</button>}
            <button style={{...css.btnSm,background:C.blueLight,color:C.blue,border:`1px solid ${C.blueBorder}`}}
              onClick={()=>setShowRoleEdit(!showRoleEdit)}>✏️ Rôle</button>
            <button style={{...css.btnDanger,fontSize:"0.75rem",padding:"5px 10px"}}
              onClick={()=>handleDelete(u.uid||u.id)}>🗑</button>
          </div>
        </div>
        {showRoleEdit&&(
          <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${C.border}`,display:"flex",gap:8,flexWrap:"wrap"}}>
            <span style={{fontSize:"0.78rem",color:C.muted,alignSelf:"center"}}>Changer le rôle :</span>
            {ROLES.map(r=>(
              <button key={r.id} style={{...css.badge(r.bg,r.color),cursor:"pointer",border:`1px solid ${r.color}30`,
                padding:"4px 10px",fontFamily:"inherit",
                fontWeight:u.role===r.id?700:400,
                boxShadow:u.role===r.id?`0 0 0 2px ${r.color}`:"none"}}
                onClick={()=>{ changeRole(u.uid||u.id,r.id); setShowRoleEdit(false); }}>
                {r.icon} {r.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── Composant TicketCard ──
  const TicketCard = ({ t }) => {
    const borderColor = t.status==="open"?C.red:t.status==="inprogress"?C.gold:C.green;
    const priColor = { urgente:[C.redLight,C.red], haute:["#fef3c7","#d97706"],
      normale:[C.blueLight,C.blue], basse:[C.surfaceAlt,C.mid] }[t.priorite||"normale"];
    return (
      <div style={{...css.card,marginBottom:10,borderLeft:`3px solid ${borderColor}`,padding:14}}>
        <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:8}}>
          <div>
            <div style={{fontWeight:700,color:C.navy,fontSize:"0.9rem",marginBottom:2}}>{t.sujet}</div>
            <div style={{fontSize:"0.75rem",color:C.muted,display:"flex",gap:8,flexWrap:"wrap"}}>
              <span>De : <strong>{t.auteur||"Anonyme"}</strong></span>
              <span>{t.createdAt?.toDate?.()?.toLocaleString("fr-FR")||"Récent"}</span>
              {t.auteurRole&&<span style={css.badge(C.blueLight,C.blue)}>{t.auteurRole}</span>}
            </div>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
            {t.priorite&&<span style={css.badge(...priColor)}>{t.priorite}</span>}
            <span style={css.badge(
              t.status==="open"?C.redLight:t.status==="inprogress"?C.goldLight:C.greenLight,
              t.status==="open"?C.red:t.status==="inprogress"?C.gold:C.green
            )}>{t.status==="open"?"Ouvert":t.status==="inprogress"?"En cours":"Résolu"}</span>
            {t.status==="open"&&(
              <button style={{...css.btnSm,fontSize:"0.74rem"}} onClick={()=>assignTicket(t.id)}>
                Prendre en charge
              </button>
            )}
            {t.status!=="resolved"&&(
              <button style={{...css.btnSm,background:C.surfaceAlt,color:C.mid,border:`1px solid ${C.border}`,fontSize:"0.74rem"}}
                onClick={()=>closeTicket(t.id)}>Clôturer</button>
            )}
          </div>
        </div>
        <div style={{fontSize:"0.84rem",color:C.dark,background:C.surfaceAlt,
          borderRadius:8,padding:"8px 12px",marginBottom:10,lineHeight:1.6}}>{t.message}</div>
        {t.assignedTo&&(
          <div style={{fontSize:"0.75rem",color:C.blue,marginBottom:6}}>
            Assigné à : <strong>{t.assignedTo}</strong>
          </div>
        )}
        {t.reply&&(
          <div style={{background:C.greenLight,border:`1px solid ${C.greenBorder}`,
            borderRadius:8,padding:"8px 12px",marginBottom:8}}>
            <div style={{fontSize:"0.7rem",color:C.green,fontWeight:600,marginBottom:2}}>
              Réponse de {t.repliedBy}
            </div>
            <div style={{fontSize:"0.83rem",color:C.dark}}>{t.reply}</div>
          </div>
        )}
        {t.status!=="resolved"&&(
          <div style={{display:"flex",gap:8}}>
            <input style={{...css.input,flex:1,fontSize:"0.83rem"}}
              placeholder="Répondre et résoudre automatiquement..."
              value={ticketReply[t.id]||""}
              onChange={e=>setTicketReply(p=>({...p,[t.id]:e.target.value}))}
              onKeyDown={e=>e.key==="Enter"&&replyTicket(t.id)} />
            <button style={{...css.btnPrimary,fontSize:"0.82rem",whiteSpace:"nowrap"}}
              onClick={()=>replyTicket(t.id)}>Envoyer ✓</button>
          </div>
        )}
      </div>
    );
  };

  // ════════════════════════════════════════
  // CENTRE DE CONTRÔLE
  // ════════════════════════════════════════
  const CentreControle = () => {
    const ctrlTabs = [
      ["dashboard","📊 Dashboard"],
      ["users","👥 Utilisateurs"],
      ["pending",`⏳ En attente${pending.length>0?` (${pending.length})`:""}` ],
      ["content","🛡 Contenu"],
      ["data","🌱 Données"],
    ];

    return (
      <div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6,flexWrap:"wrap",gap:8}}>
          <div>
            <div style={css.pageH}>🎛 Centre de Contrôle</div>
            <div style={css.pageSub}>Supervision complète de la plateforme ARSTM Campus</div>
          </div>
          <div style={{...css.badge(C.redLight,C.red),fontSize:"0.78rem",padding:"4px 12px"}}>
            ⚙️ Admin Plateforme
          </div>
        </div>

        {/* Stats live */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:16}}>
          {[
            [allUsers.length,"Utilisateurs total","👥",C.blue,C.blueLight],
            [onlineUsers.length,"En ligne maintenant","🟢",C.green,C.greenLight],
            [pending.length,"Comptes en attente","⏳",C.gold,C.goldLight],
            [openTickets.length,"Tickets ouverts","🎫",C.red,C.redLight],
            [posts.length,"Posts publiés","💬",C.purple,C.purpleLight],
            [annonces.length,"Annonces actives","📢",C.aqua,C.aquaLight],
          ].map(([v,l,icon,color,bg],i)=>(
            <div key={i} style={{...css.cardSm,display:"flex",alignItems:"center",gap:12,
              background:bg,border:`1px solid ${color}22`}}>
              <div style={{fontSize:"1.3rem"}}>{icon}</div>
              <div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,
                  fontSize:"1.4rem",color,lineHeight:1}}>{v}</div>
                <div style={{fontSize:"0.7rem",color:C.muted,marginTop:1}}>{l}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Alertes urgentes */}
        {(pending.length>0||urgentTickets.length>0)&&(
          <div style={{...css.card,marginBottom:14,background:"#fef2f2",
            border:`1px solid ${C.redBorder}`,padding:14}}>
            <div style={{fontWeight:700,color:C.red,marginBottom:8,fontSize:"0.9rem"}}>
              🚨 Alertes requérant une action immédiate
            </div>
            {pending.length>0&&(
              <div style={{fontSize:"0.84rem",color:C.dark,marginBottom:4}}>
                • <strong>{pending.length} compte(s)</strong> en attente de validation
              </div>
            )}
            {urgentTickets.length>0&&(
              <div style={{fontSize:"0.84rem",color:C.dark}}>
                • <strong>{urgentTickets.length} ticket(s) urgent(s)</strong> non traités
              </div>
            )}
          </div>
        )}

        {/* Utilisateurs en ligne */}
        {onlineUsers.length>0&&(
          <div style={{...css.card,marginBottom:14,padding:14}}>
            <div style={{fontWeight:700,color:C.navy,marginBottom:10,fontSize:"0.88rem"}}>
              🟢 Utilisateurs actifs maintenant ({onlineUsers.length})
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {onlineUsers.map(u=>{
                const userInfo = allUsers.find(au=>au.uid===u.uid);
                const r = ROLES.find(r=>r.id===userInfo?.role)||{};
                return (
                  <div key={u.id} style={{...css.badge(r.bg||C.blueLight,r.color||C.blue),
                    padding:"4px 10px",gap:5}}>
                    🟢 {userInfo?.name||u.uid?.slice(0,8)||"Utilisateur"}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Onglets */}
        <div style={{display:"flex",gap:7,marginBottom:16,flexWrap:"wrap"}}>
          {ctrlTabs.map(([v,l])=>(
            <button key={v} style={{padding:"7px 14px",borderRadius:10,fontSize:"0.82rem",
              fontWeight:600,cursor:"pointer",fontFamily:"inherit",
              border:`1px solid ${tab===v?C.blue:C.border}`,
              background:tab===v?C.blue:"#fff",color:tab===v?"#fff":C.mid}}
              onClick={()=>setTab(v)}>{l}</button>
          ))}
        </div>

        {/* Dashboard */}
        {tab==="dashboard"&&(
          <div>
            <div style={{fontWeight:700,color:C.navy,marginBottom:12}}>
              Dernières activités
            </div>
            <div style={{...css.card,padding:14}}>
              {activity.length===0?(
                <div style={{textAlign:"center",padding:24,color:C.muted}}>
                  Aucune activité enregistrée.
                </div>
              ):activity.map((a,i)=>(
                <div key={i} style={{display:"flex",gap:10,padding:"8px 0",
                  borderBottom:i<activity.length-1?`1px solid ${C.border}`:"none"}}>
                  <span style={{fontSize:"1rem"}}>{a.icon||"📌"}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:"0.84rem",color:C.dark}}>{a.message}</div>
                    <div style={{fontSize:"0.72rem",color:C.muted}}>
                      {a.createdAt?.toDate?.()?.toLocaleString("fr-FR")||"Récent"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{...css.card,marginTop:14,padding:14}}>
              <div style={{fontWeight:700,color:C.navy,marginBottom:12}}>
                Répartition des utilisateurs par rôle
              </div>
              {ROLES.map(r=>{
                const count = allUsers.filter(u=>u.role===r.id).length;
                const pct = allUsers.length>0 ? Math.round(count/allUsers.length*100) : 0;
                return (
                  <div key={r.id} style={{marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontSize:"0.82rem",color:C.dark}}>{r.icon} {r.label}</span>
                      <span style={{fontSize:"0.82rem",fontWeight:600,color:r.color}}>
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div style={{height:6,borderRadius:3,background:C.border,overflow:"hidden"}}>
                      <div style={{height:"100%",borderRadius:3,background:r.color,
                        width:`${pct}%`,transition:"width 0.3s"}} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Utilisateurs */}
        {tab==="users"&&(
          <div>
            <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
              <input style={{...css.input,flex:1,minWidth:180}}
                placeholder="Rechercher par nom ou email..."
                value={search} onChange={e=>setSearch(e.target.value)}/>
              <select style={{...css.input,width:"auto"}} value={filterRole}
                onChange={e=>setFilterRole(e.target.value)}>
                <option value="tous">Tous les rôles</option>
                {ROLES.map(r=><option key={r.id} value={r.id}>{r.icon} {r.label}</option>)}
              </select>
              <select style={{...css.input,width:"auto"}} value={filterStatus}
                onChange={e=>setFilterStatus(e.target.value)}>
                <option value="tous">Tous statuts</option>
                <option value="approved">Approuvés</option>
                <option value="pending">En attente</option>
                <option value="blocked">Bloqués</option>
                <option value="rejected">Refusés</option>
              </select>
            </div>
            <div style={{fontSize:"0.77rem",color:C.muted,marginBottom:10}}>
              {filteredUsers.length} utilisateur(s) trouvé(s)
            </div>
            {filteredUsers.map(u=><UserCard key={u.id} u={u}/>)}
          </div>
        )}

        {/* En attente */}
        {tab==="pending"&&(
          <div>
            {pending.length===0?(
              <div style={{...css.card,textAlign:"center",padding:40,color:C.muted}}>
                <div style={{fontSize:"2rem",marginBottom:8}}>✅</div>
                Aucun compte en attente.
              </div>
            ):pending.map(u=><UserCard key={u.id} u={u}/>)}
          </div>
        )}

        {/* Contenu */}
        {tab==="content"&&(
          <div>
            <div style={{fontWeight:700,color:C.navy,marginBottom:12}}>
              Posts — {posts.length} publiés
            </div>
            {posts.map(p=>(
              <div key={p.id} style={{...css.card,marginBottom:8,padding:12}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:8,marginBottom:6}}>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <div style={{width:28,height:28,borderRadius:"50%",background:C.blueLight,
                      color:C.blue,display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:"0.7rem",fontWeight:700,flexShrink:0}}>{p.avatar||"?"}</div>
                    <div>
                      <span style={{fontWeight:600,fontSize:"0.83rem",color:C.navy}}>{p.auteur}</span>
                      <span style={{fontSize:"0.7rem",color:C.muted,marginLeft:8}}>
                        {p.createdAt?.toDate?.()?.toLocaleDateString("fr-FR")||""}
                      </span>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    {p.warned&&<span style={css.badge(C.goldLight,C.gold)}>Averti</span>}
                    <button style={{...css.btnDanger,fontSize:"0.74rem",padding:"4px 10px"}}
                      onClick={()=>deletePost(p.id)}>Suppr.</button>
                  </div>
                </div>
                <div style={{fontSize:"0.83rem",color:C.dark,lineHeight:1.55}}>{p.texte}</div>
              </div>
            ))}
            <div style={{fontWeight:700,color:C.navy,marginTop:16,marginBottom:12}}>
              Annonces — {annonces.length} actives
            </div>
            {annonces.map(a=>(
              <div key={a.id} style={{...css.card,marginBottom:8,padding:12,
                display:"flex",justifyContent:"space-between",gap:10,alignItems:"center"}}>
                <div>
                  <div style={{fontWeight:600,fontSize:"0.85rem",color:C.navy}}>{a.titre}</div>
                  <div style={{fontSize:"0.72rem",color:C.muted}}>{a.auteur}</div>
                </div>
                <button style={{...css.btnDanger,fontSize:"0.74rem",padding:"4px 10px"}}
                  onClick={()=>deleteAnnonce(a.id)}>Suppr.</button>
              </div>
            ))}
          </div>
        )}

        {/* Données */}
        {tab==="data"&&(
          <div style={css.card}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:C.navy,marginBottom:8}}>
              Initialiser les données de démonstration
            </div>
            <p style={{fontSize:"0.85rem",color:C.mid,lineHeight:1.65,marginBottom:14}}>
              Insère annonces, EDT, ressources, offres alumni et posts dans Firestore.
              A utiliser une seule fois avant la démo.
            </p>
            {seedDone?(
              <div style={{background:C.greenLight,border:`1px solid ${C.greenBorder}`,
                borderRadius:10,padding:"12px 16px",color:C.green,fontWeight:600}}>
                Données insérées avec succès !
              </div>
            ):(
              <button style={{...css.btnPrimary,opacity:seeding?0.7:1}}
                onClick={handleSeed} disabled={seeding}>
                {seeding?"Insertion en cours...":"Insérer les données démo"}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // ════════════════════════════════════════
  // CENTRE DE SUPPORT
  // ════════════════════════════════════════
  const CentreSupport = () => {
    const supportTabs = [
      ["all",`Tous (${allTickets.length})`],
      ["open",`Ouverts (${openTickets.length})`],
      ["inprogress",`En cours (${progressTickets.length})`],
      ["resolved",`Résolus (${resolvedTickets.length})`],
    ];

    return (
      <div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          marginBottom:6,flexWrap:"wrap",gap:8}}>
          <div>
            <div style={css.pageH}>🎫 Centre de Support</div>
            <div style={css.pageSub}>Gestion des tickets et support en temps réel</div>
          </div>
          <div style={{...css.badge(C.purpleLight,C.purple),fontSize:"0.78rem",padding:"4px 12px"}}>
            ⚙️ Admin Plateforme
          </div>
        </div>

        {/* Stats support */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:16}}>
          {[
            [openTickets.length,"Tickets ouverts","🔴",C.red,C.redLight],
            [progressTickets.length,"En cours","🟡",C.gold,C.goldLight],
            [resolvedTickets.length,"Résolus","🟢",C.green,C.greenLight],
            [urgentTickets.length,"Urgents","🚨","#dc2626","#fef2f2"],
          ].map(([v,l,icon,color,bg],i)=>(
            <div key={i} style={{...css.cardSm,display:"flex",alignItems:"center",
              gap:12,background:bg,border:`1px solid ${color}22`}}>
              <div style={{fontSize:"1.3rem"}}>{icon}</div>
              <div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,
                  fontSize:"1.4rem",color,lineHeight:1}}>{v}</div>
                <div style={{fontSize:"0.7rem",color:C.muted,marginTop:1}}>{l}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Alertes tickets urgents */}
        {urgentTickets.length>0&&(
          <div style={{...css.card,marginBottom:14,background:"#fef2f2",
            border:`1px solid ${C.redBorder}`,padding:14}}>
            <div style={{fontWeight:700,color:C.red,marginBottom:8}}>
              🚨 {urgentTickets.length} ticket(s) urgent(s) — Action immédiate requise
            </div>
            {urgentTickets.slice(0,2).map(t=>(
              <div key={t.id} style={{fontSize:"0.84rem",color:C.dark,marginBottom:4}}>
                • <strong>{t.sujet}</strong> — de {t.auteur||"Anonyme"}
              </div>
            ))}
          </div>
        )}

        {/* Admins en ligne */}
        {onlineUsers.length>0&&(
          <div style={{...css.card,marginBottom:14,padding:12,
            background:C.blueLight,border:`1px solid ${C.blueBorder}`}}>
            <span style={{fontSize:"0.82rem",color:C.blue,fontWeight:600,marginRight:8}}>
              En ligne :
            </span>
            {onlineUsers.map(u=>{
              const ui = allUsers.find(a=>a.uid===u.uid);
              return (
                <span key={u.id} style={{...css.badge(C.greenLight,C.green),marginRight:4}}>
                  🟢 {ui?.name||u.uid?.slice(0,8)}
                </span>
              );
            })}
          </div>
        )}

        {/* Filtres */}
        <div style={{display:"flex",gap:7,marginBottom:16,flexWrap:"wrap"}}>
          {supportTabs.map(([v,l])=>(
            <button key={v} style={{padding:"7px 14px",borderRadius:10,fontSize:"0.82rem",
              fontWeight:600,cursor:"pointer",fontFamily:"inherit",
              border:`1px solid ${ticketFilter===v?C.purple:C.border}`,
              background:ticketFilter===v?C.purple:"#fff",
              color:ticketFilter===v?"#fff":C.mid}}
              onClick={()=>setTicketFilter(v)}>{l}</button>
          ))}
        </div>

        {/* Liste tickets */}
        {ticketsList.length===0?(
          <div style={{...css.card,textAlign:"center",padding:40,color:C.muted}}>
            <div style={{fontSize:"2rem",marginBottom:8}}>✅</div>
            Aucun ticket dans cette catégorie.
          </div>
        ):ticketsList.map(t=><TicketCard key={t.id} t={t}/>)}
      </div>
    );
  };

  // ── Rendu principal ──
  if (activeMode === "support") return <CentreSupport />;
  return <CentreControle />;
}