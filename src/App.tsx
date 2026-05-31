// src/App.tsx
import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { C, ROLES, SHADOWS, GRADIENTS, css } from "./design";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import Login from "./pages/Login";
import Accueil from "./pages/Accueil";
import PageEDT from "./pages/EDT";
import PageAnnonces from "./pages/Annonces";
import PageRessources from "./pages/Ressources";
import PageSocial from "./pages/Social";
import PageAlumni from "./pages/Alumni";
import PageProfil from "./pages/Profil";
import PageAide from "./pages/Aide";
import PageAdmin from "./pages/Admin";
import PageMessages from "./pages/Messages";
import PageNotifications from "./pages/Notifications";
import { useNotifs } from "./hooks/useFirestore";

const SUPER_MODES = [
  { id:"control",        icon:"🎛",  label:"Contrôle",       color:"#dc2626", bg:"#fef2f2" },
  { id:"support",        icon:"🎫",  label:"Support",         color:"#7c3aed", bg:"#faf5ff" },
  { id:"etudiant",       icon:"🎓",  label:"Étudiant",        color:"#2563eb", bg:"#eff6ff" },
  { id:"enseignant",     icon:"📖",  label:"Enseignant",      color:"#059669", bg:"#f0fdf4" },
  { id:"alumni",         icon:"🏅",  label:"Alumni",          color:"#d97706", bg:"#fffbeb" },
  { id:"administration", icon:"🏫",  label:"Administration",  color:"#7c3aed", bg:"#faf5ff" },
];

const NAV_BY_ROLE = {
  etudiant:       [["accueil","🏠","Accueil"],["edt","📅","Planning"],["annonces","📢","Annonces"],["ressources","📚","Ressources"],["more","☰","Plus"]],
  enseignant:     [["accueil","🏠","Accueil"],["edt","📅","Planning"],["annonces","📢","Annonces"],["ressources","📚","Ressources"],["more","☰","Plus"]],
  alumni:         [["accueil","🏠","Accueil"],["alumni","🎓","Alumni"],["annonces","📢","Annonces"],["social","💬","Social"],["more","☰","Plus"]],
  administration: [["accueil","🏠","Accueil"],["annonces","📢","Annonces"],["edt","📅","EDT"],["ressources","📚","Ressources"],["more","☰","Plus"]],
  superadmin:     [["accueil","🏠","Accueil"],["admin","⚙️","Admin"],["annonces","📢","Annonces"],["ressources","📚","Ressources"],["more","☰","Plus"]],
  control:        [["admin","🎛","Contrôle"],["more","☰","Plus"]],
  support:        [["admin","🎫","Support"],["more","☰","Plus"]],
};

const MORE_BY_ROLE = {
  etudiant:       [["social","💬","Espace Social"],["alumni","🎓","Espace Alumni"],["profil","👤","Mon Profil"],["aide","❓","Aide"]],
  enseignant:     [["social","💬","Communauté"],["alumni","🎓","Espace Alumni"],["profil","👤","Mon Profil"],["aide","❓","Aide"]],
  alumni:         [["profil","👤","Mon Profil"],["social","💬","Social"],["aide","❓","Aide"]],
  administration: [["social","💬","Social"],["profil","👤","Mon Profil"],["aide","❓","Aide"]],
  superadmin:     [["admin","⚙️","Admin"],["profil","👤","Mon Profil"]],
  control:        [["profil","👤","Mon Profil"]],
  support:        [["profil","👤","Mon Profil"]],
};

const DESKTOP_NAV_BY_ROLE = {
  etudiant:       [["accueil","🏠 Accueil"],["edt","📅 Planning"],["annonces","📢 Annonces"],["ressources","📚 Ressources"],["social","💬 Social"],["alumni","🎓 Alumni"],["profil","👤 Profil"],["aide","❓ Aide"]],
  enseignant:     [["accueil","🏠 Accueil"],["edt","📅 Planning"],["annonces","📢 Annonces"],["ressources","📚 Mes cours"],["social","💬 Communauté"],["profil","👤 Profil"],["aide","❓ Aide"]],
  alumni:         [["accueil","🏠 Accueil"],["alumni","🎓 Espace Alumni"],["annonces","📢 Annonces"],["social","💬 Social"],["profil","👤 Profil"],["aide","❓ Aide"]],
  administration: [["accueil","🏠 Accueil"],["annonces","📢 Annonces"],["edt","📅 EDT"],["ressources","📚 Ressources"],["profil","👤 Profil"],["aide","❓ Aide"]],
  superadmin:     [["accueil","🏠 Accueil"],["admin","⚙️ Admin"],["annonces","📢 Annonces"],["ressources","📚 Ressources"],["profil","👤 Profil"]],
  control:        [["admin","🎛 Centre de Contrôle"],["profil","👤 Profil"]],
  support:        [["admin","🎫 Centre de Support"],["profil","👤 Profil"]],
};

const PAGE_TITLES = {
  accueil:"Accueil", edt:"Emploi du temps", annonces:"Annonces",
  ressources:"Ressources", social:"Social", alumni:"Alumni",
  profil:"Mon Profil", aide:"Aide & Support", admin:"Administration",
  notifications:"Notifications",
};

export default function App() {
  const { user, profile, logout } = useAuth();
  const [page, setPageState]          = useState("accueil");
  const [drawer, setDrawer]           = useState(false);
  const [winW, setWinW]               = useState(typeof window !== "undefined" ? window.innerWidth : 800);
  const [activeMode, setActiveMode]   = useState(null);
  const [showMessages, setShowMessages] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { unread: notifUnread } = useNotifs(user?.uid);

  const goTo = (id) => {
    setPageState(id);
    setDrawer(false);
    setShowMessages(false);
  };

  useEffect(() => {
    const onResize = () => setWinW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (profile?.role !== "superadmin" && profile?.role !== "administration" && profile?.role !== "control") return;
    const q = query(collection(db, "users"), where("status", "==", "pending"));
    const unsub = onSnapshot(q, snap => setPendingCount(snap.size), () => {});
    return unsub;
  }, [profile?.role]);

  if (!user || !profile) return <Login />;

  const isMobile     = winW < 820;
  const isSuperAdmin = profile.role === "superadmin";
  const effectiveRole = isSuperAdmin && activeMode ? activeMode : profile.role || "etudiant";
  const roleInfo = ROLES.find(r => r.id === effectiveRole)
                || SUPER_MODES.find(m => m.id === effectiveRole)
                || ROLES[0];

  const switchMode = (modeId) => {
    setActiveMode(modeId);
    setPageState(modeId === "control" || modeId === "support" ? "admin" : "accueil");
  };

  const navBottom  = NAV_BY_ROLE[effectiveRole]         || NAV_BY_ROLE.etudiant;
  const moreItems  = MORE_BY_ROLE[effectiveRole]        || MORE_BY_ROLE.etudiant;
  const navDesktop = DESKTOP_NAV_BY_ROLE[effectiveRole] || DESKTOP_NAV_BY_ROLE.etudiant;

  const avatarInitials = profile.avatar || profile.name?.slice(0,2).toUpperCase() || "?";
  const AvatarEl = ({ size = 28 }) => (
    <div style={{
      width:size, height:size, borderRadius:"50%",
      background: profile.photoURL ? "transparent" : (roleInfo.bg || C.blueLight),
      color: roleInfo.color || C.blue,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize: size <= 28 ? "0.58rem" : "0.72rem",
      fontWeight:700, overflow:"hidden", flexShrink:0,
    }}>
      {profile.photoURL
        ? <img src={profile.photoURL} alt={profile.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        : avatarInitials}
    </div>
  );

  const PAGE = {
    accueil:    <Accueil      setPage={goTo} isMobile={isMobile} profile={{...profile, role:effectiveRole}} />,
    edt:        <PageEDT      profile={{...profile, role:effectiveRole}} setPage={goTo} />,
    annonces:   <PageAnnonces profile={{...profile, role:effectiveRole}} setPage={goTo} />,
    ressources: <PageRessources profile={{...profile, role:effectiveRole}} setPage={goTo} />,
    social:     <PageSocial   profile={{...profile, role:effectiveRole}} setPage={goTo} />,
    alumni:     <PageAlumni   profile={{...profile, role:effectiveRole}} setPage={goTo} />,
    profil:     <PageProfil   profile={profile} onLogout={()=>setConfirmLogout(true)} setPage={goTo} />,
    aide:       <PageAide     profile={profile} setPage={goTo} />,
    admin:         <PageAdmin         profile={profile} activeMode={activeMode||"control"} setPage={goTo} />,
    notifications: <PageNotifications profile={profile} onGoTo={goTo} />,
  };

  const ModeSelectorBar = () => (
    <div style={{
      background: GRADIENTS.dark,
      padding:"6px 16px", display:"flex", alignItems:"center",
      gap:8, overflowX:"auto", flexShrink:0,
    }}>
      <span style={{fontSize:"0.7rem",color:"rgba(255,255,255,0.45)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em",whiteSpace:"nowrap",marginRight:4}}>
        Mode :
      </span>
      {SUPER_MODES.map(m => {
        const isActive = (activeMode || "control") === m.id;
        return (
          <button key={m.id} onClick={() => switchMode(m.id)} style={{
            padding:"4px 11px", borderRadius:20, fontSize:"0.74rem", fontWeight:600,
            cursor:"pointer", border:"none", whiteSpace:"nowrap", fontFamily:"inherit",
            background: isActive ? m.bg : "rgba(255,255,255,0.08)",
            color: isActive ? m.color : "rgba(255,255,255,0.55)",
            boxShadow: isActive ? `0 0 0 1.5px ${m.color}60` : "none",
            transition:"all 0.15s",
          }}>
            {m.icon} {m.label}
          </button>
        );
      })}
      <div style={{marginLeft:"auto",flexShrink:0,display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:"0.68rem",color:"rgba(255,255,255,0.3)"}}>⚙️ Admin Plateforme</span>
        {activeMode && activeMode !== "control" && (
          <button onClick={() => switchMode("control")} style={{padding:"3px 10px",borderRadius:20,fontSize:"0.71rem",background:"rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.65)",border:"none",cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>
            ← Contrôle
          </button>
        )}
      </div>
    </div>
  );

  const IncognitoBar = () => {
    if (!isSuperAdmin || !activeMode || activeMode === "control" || activeMode === "support") return null;
    const m = SUPER_MODES.find(x => x.id === activeMode);
    return (
      <div style={{background:`${m?.color}12`,borderBottom:`1px solid ${m?.color}25`,padding:"5px 16px",display:"flex",alignItems:"center",gap:8,flexShrink:0,fontSize:"0.77rem"}}>
        <span>{m?.icon}</span>
        <span style={{color:m?.color,fontWeight:700}}>Mode {m?.label}</span>
        <span style={{color:C.muted}}>— Actions réelles · Incognito</span>
        <span style={{...css.badge("#fef3c7","#d97706"),marginLeft:"auto"}}>🕵️ Incognito</span>
      </div>
    );
  };

  return (
    <div style={{...css.app, height:"100vh", overflow:"hidden", display:"flex", flexDirection:"column"}}>

      {isSuperAdmin && <ModeSelectorBar />}
      {isSuperAdmin && <IncognitoBar />}

      {/* ── DESKTOP NAV ── */}
      {!isMobile && (
        <nav style={{...css.nav, flexShrink:0}}>
          <div style={css.logo}>
            <div style={css.logoBox}>A</div>
            ARSTM<span style={{color:C.blue}}>Campus</span>
          </div>
          <div style={css.tabs}>
            {navDesktop.map(([id, label]) => (
              <button key={id+label} style={{...css.tab(page===id), fontFamily:"inherit", position:"relative"}} onClick={() => goTo(id)}>
                {label}
                {id==="admin" && pendingCount > 0 && (
                  <span style={{ position:"absolute", top:2, right:2, minWidth:16, height:16, borderRadius:8, background:"#dc2626", color:"#fff", fontSize:"0.6rem", fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 3px" }}>
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {/* Cloche notifications */}
            <button onClick={() => goTo("notifications")} title="Notifications"
              style={{ position:"relative", width:36, height:36, borderRadius:"50%", border:`1px solid ${C.border}`, background:page==="notifications"?C.blueLight:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.1rem", transition:"all 0.15s" }}>
              🔔
              {notifUnread > 0 && (
                <span style={{ position:"absolute", top:-2, right:-2, minWidth:16, height:16, borderRadius:8, background:"#dc2626", color:"#fff", fontSize:"0.6rem", fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 4px" }}>
                  {notifUnread > 9 ? "9+" : notifUnread}
                </span>
              )}
            </button>
            <div onClick={() => goTo("profil")} style={{...css.userPill, cursor:"pointer"}} title="Mon profil">
              <AvatarEl size={28}/>
              <span style={{fontSize:"0.83rem",fontWeight:500,color:C.dark}}>{profile.name}</span>
              <span style={css.badge(roleInfo.bg||C.blueLight, roleInfo.color||C.blue)}>{roleInfo.icon}</span>
            </div>
            <button onClick={() => setConfirmLogout(true)} style={{...css.btnGhost,color:C.red,fontSize:"0.85rem"}} title="Se déconnecter">
              🚪
            </button>
          </div>
        </nav>
      )}

      {/* ── MOBILE TOP BAR ── */}
      {isMobile && (
        <div style={{flexShrink:0,background:"#fff",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 14px",height:50,boxShadow:SHADOWS.sm}}>
          <div style={{...css.logo, fontSize:"0.95rem"}}>
            <div style={{...css.logoBox, width:26, height:26, borderRadius:7, fontSize:"0.75rem"}}>A</div>
            ARSTM<span style={{color:C.blue}}>Campus</span>
          </div>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:"0.88rem",color:C.navy}}>
            {PAGE_TITLES[page] || ""}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <button onClick={() => goTo("notifications")}
              style={{ position:"relative", width:32, height:32, borderRadius:"50%", border:`1px solid ${C.border}`, background:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1rem" }}>
              🔔
              {notifUnread > 0 && (
                <span style={{ position:"absolute", top:-2, right:-2, minWidth:14, height:14, borderRadius:7, background:"#dc2626", color:"#fff", fontSize:"0.55rem", fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 3px" }}>
                  {notifUnread > 9 ? "9+" : notifUnread}
                </span>
              )}
            </button>
            <div onClick={() => goTo("profil")} style={{cursor:"pointer",borderRadius:"50%",border:`2px solid ${roleInfo.color||C.blue}25`,padding:1}}>
              <AvatarEl size={32}/>
            </div>
          </div>
        </div>
      )}

      {/* ── CONTENU ── */}
      <main style={{flex:1,overflowY:"auto",padding:isMobile?"14px 12px":"24px 16px",paddingBottom:isMobile?"72px":"24px"}}>
        {/* key={page} triggers re-mount → CSS animation plays on each navigation */}
        <div key={page} className="page-enter" style={{maxWidth:1080,margin:"0 auto"}}>
          {PAGE[page] || PAGE.accueil}
        </div>
      </main>

      {/* ── FOOTER DESKTOP ── */}
      {!isMobile && (
        <footer style={{flexShrink:0,borderTop:`1px solid ${C.border}`,padding:"10px 20px",textAlign:"center",fontSize:"0.75rem",color:C.muted,background:"#fff"}}>
          ARSTM Campus v2.0 · Firebase · ARSTM · Abidjan · 2026
        </footer>
      )}

      {/* ── MOBILE BOTTOM NAV ── */}
      {isMobile && (
        <nav style={{position:"fixed",bottom:0,left:0,right:0,zIndex:500,background:"#fff",borderTop:`1px solid ${C.border}`,display:"flex",height:58,boxShadow:"0 -2px 12px rgba(0,0,0,0.08)"}}>
          {navBottom.map(([id, icon, label]) => {
            const isMore = id === "more";
            const active = isMore ? drawer : page === id;
            return (
              <button key={id+label} onClick={() => isMore ? setDrawer(!drawer) : goTo(id)} style={{
                flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                gap:2, border:"none", background:"transparent", cursor:"pointer", fontFamily:"inherit",
                borderTop: active ? `2.5px solid ${C.blue}` : "2.5px solid transparent",
                transition:"border-color 0.15s", position:"relative",
              }}>
                <span style={{fontSize:"1.15rem",lineHeight:1,transition:"transform 0.15s",transform:active?"scale(1.1)":"scale(1)", position:"relative"}}>
                  {icon}
                  {id==="admin" && pendingCount > 0 && (
                    <span style={{ position:"absolute", top:-4, right:-6, minWidth:14, height:14, borderRadius:7, background:"#dc2626", color:"#fff", fontSize:"0.55rem", fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 3px" }}>
                      {pendingCount}
                    </span>
                  )}
                </span>
                <span style={{fontSize:"0.6rem",fontWeight:active?700:600,color:active?C.blue:C.muted,transition:"color 0.15s"}}>{label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* ── FAB MESSAGES ── */}
      <button
        onClick={() => setShowMessages(!showMessages)}
        aria-label={showMessages ? "Fermer les messages" : "Ouvrir les messages"}
        style={{
          position:"fixed", bottom:isMobile?72:24, right:16, zIndex:800,
          width:50, height:50, borderRadius:"50%",
          background: showMessages ? C.mid : GRADIENTS.primary,
          color:"#fff", border:"none", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:"1.3rem", boxShadow: showMessages ? SHADOWS.md : SHADOWS.blue,
          transition:"all 0.22s cubic-bezier(0.22,1,0.36,1)",
          transform: showMessages ? "scale(0.9) rotate(90deg)" : "scale(1) rotate(0deg)",
        }}
      >
        {showMessages ? "✕" : "💬"}
      </button>

      {showMessages && (
        <>
          <div onClick={() => setShowMessages(false)} style={{position:"fixed",inset:0,zIndex:799,background:"rgba(0,0,0,0.22)"}} className="animate-fade-in"/>
          <div className="animate-slide-up" style={{position:"fixed",bottom:isMobile?132:84,right:16,zIndex:800,width:isMobile?"calc(100vw - 32px)":390,height:isMobile?"70vh":530,borderRadius:18,overflow:"hidden",boxShadow:SHADOWS["2xl"]}}>
            <PageMessages profile={profile} onClose={() => setShowMessages(false)} floating={true}/>
          </div>
        </>
      )}

      {/* ── DRAWER "PLUS" MOBILE ── */}
      {isMobile && drawer && (
        <>
          <div onClick={() => setDrawer(false)} style={{position:"fixed",inset:0,zIndex:290,background:"rgba(0,0,0,0.3)"}} className="animate-fade-in"/>
          <div className="animate-slide-up" style={{position:"fixed",bottom:58,left:0,right:0,zIndex:295,background:"#fff",borderTop:`1px solid ${C.border}`,borderRadius:"18px 18px 0 0",padding:"14px 18px 16px",boxShadow:"0 -4px 24px rgba(0,0,0,0.14)"}}>
            <div style={{width:32,height:4,borderRadius:2,background:C.border,margin:"0 auto 14px"}}/>
            <div style={{fontSize:"0.72rem",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.04em",color:C.muted,marginBottom:10}}>Autres sections</div>
            {moreItems.map(([id, icon, label]) => (
              <button key={id+label} onClick={() => goTo(id)} style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"12px 14px",marginBottom:7,borderRadius:12,background:page===id?C.blueLight:C.surfaceAlt,border:`1px solid ${page===id?C.blueBorder:C.border}`,cursor:"pointer",fontFamily:"inherit",textAlign:"left",transition:"all 0.15s"}}>
                <span style={{fontSize:"1.2rem"}}>{icon}</span>
                <span style={{fontWeight:600,fontSize:"0.9rem",color:page===id?C.blue:C.navy}}>{label}</span>
                <span style={{marginLeft:"auto",color:C.muted}}>›</span>
              </button>
            ))}
            <button onClick={() => { setDrawer(false); setConfirmLogout(true); }} style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"12px 14px",borderRadius:12,background:C.redLight,border:`1px solid ${C.redBorder}`,cursor:"pointer",fontFamily:"inherit",textAlign:"left",marginTop:4,transition:"all 0.15s"}}>
              <span style={{fontSize:"1.2rem"}}>🚪</span>
              <span style={{fontWeight:600,fontSize:"0.9rem",color:C.red}}>Se déconnecter</span>
            </button>
          </div>
        </>
      )}

      {/* ── MODAL CONFIRMATION DÉCONNEXION ── */}
      {confirmLogout && (
        <div onClick={() => setConfirmLogout(false)} style={{position:"fixed",inset:0,zIndex:2000,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} className="animate-fade-in">
          <div onClick={e => e.stopPropagation()} className="modal-enter" style={{background:"#fff",borderRadius:20,padding:"28px 22px",width:"100%",maxWidth:320,textAlign:"center",boxShadow:SHADOWS.modal}}>
            <div style={{width:56,height:56,borderRadius:"50%",background:"#fef2f2",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.6rem",margin:"0 auto 14px"}}>👋</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"1.05rem",color:C.navy,marginBottom:6}}>Quitter ARSTM Campus ?</div>
            <p style={{fontSize:"0.83rem",color:C.muted,lineHeight:1.65,marginBottom:22}}>Vos données sont sauvegardées. Vous pouvez revenir à tout moment.</p>
            <div style={{display:"flex",gap:10}}>
              <button onClick={() => setConfirmLogout(false)} style={{...css.btnSecondary,flex:1,padding:"11px"}}>Annuler</button>
              <button onClick={logout} style={{flex:1,padding:"11px",borderRadius:8,background:C.red,color:"#fff",border:"none",fontWeight:700,fontSize:"0.88rem",cursor:"pointer",fontFamily:"inherit"}}>Déconnecter</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
