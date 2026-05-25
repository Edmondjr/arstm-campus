// src/pages/Admin.jsx
import { useState, useEffect } from "react";
import { C, ROLES, css } from "../design";
import {
  useUsers, approveUser, rejectUser, useCollection,
  updateDocument, deleteDocument, seedDemoData
} from "../hooks/useFirestore";
import { doc, updateDoc, serverTimestamp, onSnapshot,
  collection, query, orderBy, where, setDoc } from "firebase/firestore";
import { db } from "../firebase";

function useOnlineAdmins(uid) {
  useEffect(() => {
    if (!uid) return;
    const ref = doc(db, "presence", uid);
    setDoc(ref, { online:true, lastSeen:serverTimestamp(), uid }, { merge:true });
    const handleUnload = () => updateDoc(ref, { online:false });
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      updateDoc(ref, { online:false });
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [uid]);

  const [admins, setAdmins] = useState([]);
  useEffect(() => {
    const q = query(collection(db, "presence"), where("online","==",true));
    return onSnapshot(q, snap => setAdmins(snap.docs.map(d=>({id:d.id,...d.data()}))));
  }, []);
  return admins;
}

function useTicketsRT() {
  const [tickets, setTickets] = useState([]);
  useEffect(() => {
    const q = query(collection(db,"tickets"), orderBy("createdAt","desc"));
    return onSnapshot(q, snap => setTickets(snap.docs.map(d=>({id:d.id,...d.data()}))));
  }, []);
  return tickets;
}

export default function PageAdmin({ profile }) {
  const [tab, setTab]           = useState("pending");
  const [search, setSearch]     = useState("");
  const [filterRole, setFilterRole] = useState("tous");
  const [seeding, setSeeding]   = useState(false);
  const [seedDone, setSeedDone] = useState(false);
  const [ticketReply, setTicketReply] = useState({});

  const { data: pending }  = useUsers("pending");
  const { data: approved } = useUsers("approved");
  const { data: rejected } = useUsers("rejected");
  const { data: blocked }  = useUsers("blocked");
  const { data: posts }    = useCollection("posts");
  const allTickets = useTicketsRT();
  const onlineAdmins = useOnlineAdmins(profile?.uid);

  const openTickets     = allTickets.filter(t=>t.status==="open");
  const progressTickets = allTickets.filter(t=>t.status==="inprogress");
  const resolvedTickets = allTickets.filter(t=>t.status==="resolved");

  const allUsers = [...pending,...approved,...rejected,...blocked];
  const filtered = allUsers.filter(u => {
    const s = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const r = filterRole==="tous" || u.role===filterRole;
    return s && r;
  });

  const handleApprove  = uid => approveUser(uid);
  const handleReject   = uid => rejectUser(uid);
  const handleBlock    = uid => updateDocument("users", uid, { status:"blocked" });
  const handleUnblock  = uid => updateDocument("users", uid, { status:"approved" });
  const handleDelete   = async uid => {
    if (window.confirm("Supprimer ce compte ?")) await deleteDocument("users", uid);
  };
  const assignTicket   = id => updateDocument("tickets", id, {
    assignedTo: profile?.name, assignedUid: profile?.uid, status:"inprogress"
  });
  const replyTicket    = async id => {
    const r = ticketReply[id];
    if (!r?.trim()) return;
    await updateDocument("tickets", id, {
      reply:r, repliedBy:profile?.name, repliedAt:serverTimestamp(), status:"resolved"
    });
    setTicketReply(p=>({...p,[id]:""}));
  };
  const deletePost     = async id => { if(window.confirm("Supprimer ?")) await deleteDocument("posts",id); };
  const warnPost       = async (id, auteur) => { await updateDocument("posts",id,{warned:true}); alert(`Avertissement envoye a ${auteur}`); };
  const handleSeed     = async () => { setSeeding(true); await seedDemoData(); setSeeding(false); setSeedDone(true); };

  const statusBadge = s => ({
    approved:[C.greenLight,C.green,"Approuve"],
    pending: [C.goldLight,C.gold,"En attente"],
    rejected:[C.redLight,C.red,"Refuse"],
    blocked: ["#f3f4f6",C.mid,"Bloque"],
  }[s]||[C.blueLight,C.blue,s]);

  const UserCard = ({u}) => {
    const r = ROLES.find(r=>r.id===u.role)||{};
    const [bg,fg,label] = statusBadge(u.status);
    return (
      <div style={{...css.card,marginBottom:10,padding:14}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
          <div style={{width:42,height:42,borderRadius:"50%",background:r.bg||C.blueLight,
            color:r.color||C.blue,display:"flex",alignItems:"center",justifyContent:"center",
            fontWeight:700,fontSize:"0.85rem",flexShrink:0}}>
            {u.avatar||u.name?.slice(0,2)||"?"}
          </div>
          <div style={{flex:1,minWidth:180}}>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:3}}>
              <span style={{fontWeight:700,color:C.navy,fontSize:"0.92rem"}}>{u.name}</span>
              <span style={css.badge(bg,fg)}>{label}</span>
            </div>
            <div style={{fontSize:"0.77rem",color:C.muted,marginBottom:4}}>{u.email}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <span style={css.badge(r.bg||C.blueLight,r.color||C.blue)}>{r.icon} {u.role}</span>
              {u.filiere&&<span style={css.badge(C.surfaceAlt,C.mid)}>{u.filiere}</span>}
              {u.promo&&<span style={css.badge(C.surfaceAlt,C.mid)}>{u.promo}</span>}
            </div>
            {u.createdAt?.toDate&&(
              <div style={{fontSize:"0.71rem",color:C.muted,marginTop:3}}>
                Inscrit le {u.createdAt.toDate().toLocaleDateString("fr-FR")}
              </div>
            )}
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {u.status==="pending"&&<>
              <button style={{...css.btnSm,background:C.greenLight,color:C.green,border:`1px solid ${C.greenBorder}`}} onClick={()=>handleApprove(u.uid||u.id)}>Approuver</button>
              <button style={{...css.btnDanger,fontSize:"0.76rem",padding:"5px 10px"}} onClick={()=>handleReject(u.uid||u.id)}>Refuser</button>
            </>}
            {u.status==="approved"&&<button style={{...css.btnSm,background:"#fef3c7",color:"#d97706",border:"1px solid #fde68a"}} onClick={()=>handleBlock(u.uid||u.id)}>Bloquer</button>}
            {u.status==="blocked"&&<button style={{...css.btnSm,background:C.greenLight,color:C.green,border:`1px solid ${C.greenBorder}`}} onClick={()=>handleUnblock(u.uid||u.id)}>Debloquer</button>}
            {u.status==="rejected"&&<button style={{...css.btnSm,background:C.greenLight,color:C.green,border:`1px solid ${C.greenBorder}`}} onClick={()=>handleApprove(u.uid||u.id)}>Reapprouver</button>}
            <button style={{...css.btnDanger,fontSize:"0.76rem",padding:"5px 10px"}} onClick={()=>handleDelete(u.uid||u.id)}>Suppr.</button>
          </div>
        </div>
      </div>
    );
  };

  const TicketCard = ({t}) => {
    const borderColor = t.status==="open"?C.red:t.status==="inprogress"?C.gold:C.green;
    const [bg2,fg2,label2] = t.status==="open"?[C.redLight,C.red,"Ouvert"]:t.status==="inprogress"?[C.goldLight,C.gold,"En cours"]:[C.greenLight,C.green,"Resolu"];
    return (
      <div style={{...css.card,marginBottom:12,borderLeft:`3px solid ${borderColor}`}}>
        <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:8}}>
          <div>
            <div style={{fontWeight:700,color:C.navy,fontSize:"0.9rem"}}>{t.sujet}</div>
            <div style={{fontSize:"0.76rem",color:C.muted}}>
              {t.auteur||"Anonyme"} · {t.createdAt?.toDate?.()?.toLocaleDateString("fr-FR")||"Recent"}
              {t.priorite&&t.priorite!=="normale"&&<span style={{...css.badge(C.redLight,C.red),marginLeft:6}}>{t.priorite}</span>}
            </div>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <span style={css.badge(bg2,fg2)}>{label2}</span>
            {t.status==="open"&&<button style={{...css.btnSm,fontSize:"0.74rem"}} onClick={()=>assignTicket(t.id)}>Prendre en charge</button>}
          </div>
        </div>
        <div style={{fontSize:"0.84rem",color:C.dark,background:C.surfaceAlt,borderRadius:8,padding:"8px 12px",marginBottom:10}}>{t.message}</div>
        {t.assignedTo&&<div style={{fontSize:"0.75rem",color:C.blue,marginBottom:6}}>Assigne a : {t.assignedTo}</div>}
        {t.reply&&(
          <div style={{background:C.greenLight,border:`1px solid ${C.greenBorder}`,borderRadius:8,padding:"8px 12px",marginBottom:8}}>
            <div style={{fontSize:"0.71rem",color:C.green,fontWeight:600,marginBottom:2}}>Reponse de {t.repliedBy}</div>
            <div style={{fontSize:"0.83rem",color:C.dark}}>{t.reply}</div>
          </div>
        )}
        {t.status!=="resolved"&&(
          <div style={{display:"flex",gap:8}}>
            <input style={{...css.input,flex:1,fontSize:"0.83rem"}} placeholder="Repondre et resoudre..."
              value={ticketReply[t.id]||""} onChange={e=>setTicketReply(p=>({...p,[t.id]:e.target.value}))} />
            <button style={{...css.btnPrimary,fontSize:"0.82rem",whiteSpace:"nowrap"}} onClick={()=>replyTicket(t.id)}>Envoyer</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div style={css.pageH}>Administration Plateforme</div>
      <div style={css.pageSub}>Acces reserve — Admin Plateforme uniquement</div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:16}}>
        {[
          [pending.length,"En attente","⏳",C.gold,C.goldLight],
          [approved.length,"Approuves","✅",C.green,C.greenLight],
          [openTickets.length,"Tickets ouverts","🎫",C.red,C.redLight],
          [onlineAdmins.length,"Admins en ligne","🟢",C.blue,C.blueLight],
          [posts.length,"Posts publies","💬",C.purple,C.purpleLight],
          [allUsers.length,"Utilisateurs","👥",C.aqua,C.aquaLight],
        ].map(([v,l,icon,color,bg],i)=>(
          <div key={i} style={{...css.cardSm,display:"flex",alignItems:"center",gap:12,background:bg,border:`1px solid ${color}22`}}>
            <div style={{fontSize:"1.3rem"}}>{icon}</div>
            <div>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"1.4rem",color,lineHeight:1}}>{v}</div>
              <div style={{fontSize:"0.71rem",color:C.muted,marginTop:1}}>{l}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Admins en ligne */}
      {onlineAdmins.length>0&&(
        <div style={{...css.card,marginBottom:14,display:"flex",alignItems:"center",gap:10,background:C.blueLight,border:`1px solid ${C.blueBorder}`,padding:"10px 14px"}}>
          <span style={{fontSize:"0.83rem",color:C.blue,fontWeight:600}}>En ligne :</span>
          {onlineAdmins.map(a=>(
            <span key={a.id} style={css.badge(C.greenLight,C.green)}>
              🟢 {a.uid===profile?.uid?"Vous":a.uid?.slice(0,8)}
            </span>
          ))}
        </div>
      )}

      {/* Onglets */}
      <div style={{display:"flex",gap:7,marginBottom:16,flexWrap:"wrap"}}>
        {[
          ["pending",`En attente${pending.length>0?` (${pending.length})`:""}` ],
          ["users","Utilisateurs"],
          ["tickets",`Tickets${openTickets.length>0?` (${openTickets.length})`:""}` ],
          ["moderation","Moderation"],
          ["data","Donnees"],
        ].map(([v,l])=>(
          <button key={v} style={{padding:"7px 14px",borderRadius:10,fontSize:"0.83rem",fontWeight:600,
            cursor:"pointer",fontFamily:"inherit",border:`1px solid ${tab===v?C.blue:C.border}`,
            background:tab===v?C.blue:"#fff",color:tab===v?"#fff":C.mid}}
            onClick={()=>setTab(v)}>{l}</button>
        ))}
      </div>

      {tab==="pending"&&(
        <div>
          {pending.length===0?(
            <div style={{...css.card,textAlign:"center",padding:40,color:C.muted}}>
              <div style={{fontSize:"2rem",marginBottom:8}}>✅</div>Aucun compte en attente.
            </div>
          ):pending.map(u=><UserCard key={u.id} u={u}/>)}
        </div>
      )}

      {tab==="users"&&(
        <div>
          <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
            <input style={{...css.input,flex:1,minWidth:180}} placeholder="Rechercher..."
              value={search} onChange={e=>setSearch(e.target.value)}/>
            <select style={{...css.input,width:"auto"}} value={filterRole} onChange={e=>setFilterRole(e.target.value)}>
              <option value="tous">Tous les roles</option>
              {ROLES.map(r=><option key={r.id} value={r.id}>{r.icon} {r.label}</option>)}
            </select>
          </div>
          <div style={{fontSize:"0.77rem",color:C.muted,marginBottom:10}}>{filtered.length} utilisateur(s)</div>
          {filtered.map(u=><UserCard key={u.id} u={u}/>)}
        </div>
      )}

      {tab==="tickets"&&(
        <div>
          <div style={{display:"flex",gap:7,marginBottom:14,flexWrap:"wrap"}}>
            {[[allTickets,`Tous (${allTickets.length})`],[openTickets,`Ouverts (${openTickets.length})`],[progressTickets,`En cours (${progressTickets.length})`],[resolvedTickets,`Resolus (${resolvedTickets.length})`]].map(([arr,l],i)=>(
              <span key={i} style={{...css.badge(C.surfaceAlt,C.mid),padding:"4px 10px",fontSize:"0.78rem"}}>{l}</span>
            ))}
          </div>
          {allTickets.length===0?(
            <div style={{...css.card,textAlign:"center",padding:40,color:C.muted}}>Aucun ticket.</div>
          ):allTickets.map(t=><TicketCard key={t.id} t={t}/>)}
        </div>
      )}

      {tab==="moderation"&&(
        <div>
          <div style={{fontWeight:700,color:C.navy,marginBottom:12}}>Posts publies — {posts.length} au total</div>
          {posts.length===0?(
            <div style={{...css.card,textAlign:"center",padding:40,color:C.muted}}>Aucun post.</div>
          ):posts.map(p=>(
            <div key={p.id} style={{...css.card,marginBottom:10,padding:14}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:10,marginBottom:8}}>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:C.blueLight,color:C.blue,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.74rem",fontWeight:700}}>{p.avatar||"?"}</div>
                  <div>
                    <div style={{fontWeight:600,fontSize:"0.84rem",color:C.navy}}>{p.auteur}</div>
                    <div style={{fontSize:"0.71rem",color:C.muted}}>{p.createdAt?.toDate?.()?.toLocaleDateString("fr-FR")||"Recent"}</div>
                  </div>
                </div>
                {p.warned&&<span style={css.badge(C.goldLight,C.gold)}>Averti</span>}
              </div>
              <p style={{fontSize:"0.84rem",color:C.dark,background:C.surfaceAlt,borderRadius:8,padding:"8px 12px",marginBottom:10}}>{p.texte}</p>
              <div style={{display:"flex",gap:8}}>
                {!p.warned&&<button style={{...css.btnSm,background:"#fef3c7",color:"#d97706",border:"1px solid #fde68a",fontSize:"0.76rem"}} onClick={()=>warnPost(p.id,p.auteur)}>Avertir</button>}
                <button style={{...css.btnDanger,fontSize:"0.76rem",padding:"5px 10px"}} onClick={()=>deletePost(p.id)}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab==="data"&&(
        <div style={css.card}>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:C.navy,marginBottom:8}}>Initialiser les donnees de demonstration</div>
          <p style={{fontSize:"0.85rem",color:C.mid,lineHeight:1.65,marginBottom:14}}>Insere annonces, EDT, ressources, offres alumni et posts dans Firestore. A utiliser une seule fois.</p>
          {seedDone?(
            <div style={{background:C.greenLight,border:`1px solid ${C.greenBorder}`,borderRadius:10,padding:"12px 16px",color:C.green,fontWeight:600}}>Donnees inserees avec succes !</div>
          ):(
            <button style={{...css.btnPrimary,opacity:seeding?0.7:1}} onClick={handleSeed} disabled={seeding}>
              {seeding?"Insertion en cours...":"Inserer les donnees demo"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}