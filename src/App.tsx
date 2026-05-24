// src/App.jsx
import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { C, ROLES, css } from "./design";
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

// Navigation selon rôle
const NAV_BY_ROLE = {
  etudiant:       [["accueil","🏠","Accueil"],["edt","📅","Planning"],["annonces","📢","Annonces"],["ressources","📚","Ressources"],["more","☰","Plus"]],
  enseignant:     [["accueil","🏠","Accueil"],["edt","📅","Planning"],["annonces","📢","Annonces"],["ressources","📚","Ressources"],["more","☰","Plus"]],
  alumni:         [["accueil","🏠","Accueil"],["alumni","🎓","Alumni"],["annonces","📢","Annonces"],["social","💬","Social"],["more","☰","Plus"]],
  administration: [["accueil","🏠","Accueil"],["annonces","📢","Annonces"],["edt","📅","EDT"],["ressources","📚","Ressources"],["more","☰","Plus"]],
  superadmin:     [["accueil","🏠","Accueil"],["admin","⚙️","Admin"],["annonces","📢","Annonces"],["ressources","📚","Ressources"],["more","☰","Plus"]],
};

const MORE_BY_ROLE = {
  etudiant:       [["social","💬","Espace Social"],["alumni","🎓","Espace Alumni"],["profil","👤","Mon Profil"],["aide","❓","Aide"]],
  enseignant:     [["social","💬","Communauté"],["alumni","🎓","Espace Alumni"],["profil","👤","Mon Profil"],["aide","❓","Aide"]],
  alumni:         [["profil","👤","Mon Profil"],["social","💬","Social"],["aide","❓","Aide"]],
  administration: [["social","💬","Social"],["profil","👤","Mon Profil"],["aide","❓","Aide"]],
  superadmin:     [["admin","⚙️","Admin"],["profil","👤","Mon Profil"],["aide","❓","Aide"]],
};

const DESKTOP_NAV_BY_ROLE = {
  etudiant:       [["accueil","🏠 Accueil"],["edt","📅 Planning"],["annonces","📢 Annonces"],["ressources","📚 Ressources"],["social","💬 Social"],["alumni","🎓 Alumni"],["profil","👤 Profil"],["aide","❓ Aide"]],
  enseignant:     [["accueil","🏠 Accueil"],["edt","📅 Planning"],["annonces","📢 Annonces"],["ressources","📚 Mes cours"],["social","💬 Communauté"],["profil","👤 Profil"],["aide","❓ Aide"]],
  alumni:         [["accueil","🏠 Accueil"],["alumni","🎓 Espace Alumni"],["annonces","📢 Annonces"],["social","💬 Social"],["profil","👤 Profil"],["aide","❓ Aide"]],
  administration: [["accueil","🏠 Tableau de bord"],["annonces","📢 Annonces"],["edt","📅 EDT"],["ressources","📚 Ressources"],["profil","👤 Profil"],["aide","❓ Aide"]],
  superadmin:     [["accueil","🏠 Tableau de bord"],["admin","⚙️ Administration"],["annonces","📢 Annonces"],["ressources","📚 Ressources"],["profil","👤 Profil"],["aide","❓ Aide"]],
};

const PAGE_TITLES = {
  accueil:"Accueil", edt:"Emploi du temps", annonces:"Annonces",
  ressources:"Ressources", social:"Social", alumni:"Alumni",
  profil:"Mon Profil", aide:"Aide & Support", admin:"Administration",
};

export default function App() {
  const { user, profile, logout } = useAuth();
  const [page, setPage]   = useState("accueil");
  const [drawer, setDrawer] = useState(false);
  const [winW, setWinW]   = useState(window.innerWidth);

  useEffect(() => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap";
    document.head.appendChild(l);
    const onResize = () => setWinW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (!user || !profile) return <Login />;

  const isMobile = winW < 820;
  const role     = profile.role || "etudiant";
  const roleInfo = ROLES.find(r => r.id === role) || ROLES[0];
  const goTo     = (id) => { setPage(id); setDrawer(false); };

  const navBottom  = NAV_BY_ROLE[role]    || NAV_BY_ROLE.etudiant;
  const moreItems  = MORE_BY_ROLE[role]   || MORE_BY_ROLE.etudiant;
  const navDesktop = DESKTOP_NAV_BY_ROLE[role] || DESKTOP_NAV_BY_ROLE.etudiant;

  const PAGE = {
    accueil:    <Accueil setPage={goTo} isMobile={isMobile} profile={profile} />,
    edt:        <PageEDT profile={profile} />,
    annonces:   <PageAnnonces profile={profile} />,
    ressources: <PageRessources profile={profile} />,
    social:     <PageSocial profile={profile} />,
    alumni:     <PageAlumni profile={profile} />,
    profil:     <PageProfil profile={profile} onLogout={logout} setPage={goTo} />,
    aide:       <PageAide />,
    admin:      <PageAdmin profile={profile} />,
  };

  return (
    <div style={{ ...css.app, height:"100vh", overflow:"hidden", display:"flex", flexDirection:"column" }}>

      {/* ── DESKTOP NAV ── */}
      {!isMobile && (
        <nav style={{ ...css.nav, flexShrink:0 }}>
          <div style={css.logo}>
            <div style={css.logoBox}>A</div>
            ARSTM<span style={{ color:C.blue }}>Campus</span>
          </div>
          <div style={css.tabs}>
            {navDesktop.map(([id, label]) => (
              <button key={id} style={{ ...css.tab(page===id), fontFamily:"inherit" }}
                onClick={()=>goTo(id)}>{label}</button>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={css.userPill}>
              <div style={css.avatar(roleInfo.bg, roleInfo.color, 28)}>
                {profile.avatar || profile.name?.slice(0,2).toUpperCase()}
              </div>
              <span style={{ fontSize:"0.83rem", fontWeight:500, color:C.dark }}>{profile.name}</span>
              <span style={css.badge(roleInfo.bg, roleInfo.color)}>{roleInfo.icon}</span>
            </div>
            <button style={{ ...css.btnGhost, color:C.red, fontSize:"0.8rem" }} onClick={logout}>🚪</button>
          </div>
        </nav>
      )}

      {/* ── MOBILE TOP BAR ── */}
      {isMobile && (
        <div style={{ flexShrink:0, background:"#fff", borderBottom:`1px solid ${C.border}`,
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"0 14px", height:50, boxShadow:"0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ ...css.logo, fontSize:"0.95rem" }}>
            <div style={{ ...css.logoBox, width:26, height:26, borderRadius:7, fontSize:"0.75rem" }}>A</div>
            ARSTM<span style={{ color:C.blue }}>Campus</span>
          </div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:"0.88rem", color:C.navy }}>
            {PAGE_TITLES[page] || ""}
          </div>
          <div style={{ ...css.avatar(roleInfo.bg, roleInfo.color, 28), cursor:"pointer" }}
            onClick={()=>goTo("profil")}>
            {profile.avatar || profile.name?.slice(0,2).toUpperCase()}
          </div>
        </div>
      )}

      {/* ── PAGE CONTENT ── */}
      <main style={{ flex:1, overflowY:"auto", padding:isMobile?"14px 12px":"24px 16px" }}>
        <div style={{ maxWidth:1080, margin:"0 auto" }}>
          {PAGE[page] || PAGE.accueil}
        </div>
        {isMobile && <div style={{ height:16 }} />}
      </main>

      {/* ── DESKTOP FOOTER ── */}
      {!isMobile && (
        <footer style={{ flexShrink:0, borderTop:`1px solid ${C.border}`, padding:"12px 20px",
          textAlign:"center", fontSize:"0.75rem", color:C.muted, background:"#fff" }}>
          ARSTM Campus v2.0 · Firebase · École Supérieure des Transports Maritimes · Abidjan · 2026
        </footer>
      )}

     {/* ── MOBILE BOTTOM NAV ── */}
{isMobile && (
  <nav style={{ 
    position:"fixed", bottom:0, left:0, right:0, zIndex:500,
    background:"#fff", borderTop:`1px solid ${C.border}`,
    display:"flex", height:58, 
    boxShadow:"0 -2px 10px rgba(0,0,0,0.07)" 
  }}>
    {navBottom.map(([id, icon, label]) => {
      const isMore = id === "more";
      const active = isMore ? drawer : page === id;
      return (
        <button key={id} onClick={()=>isMore?setDrawer(!drawer):goTo(id)}
          style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
            justifyContent:"center", gap:2, border:"none", background:"transparent",
            cursor:"pointer", fontFamily:"inherit",
            borderTop:active?`2px solid ${C.blue}`:"2px solid transparent" }}>
          <span style={{ fontSize:"1.15rem", lineHeight:1 }}>{icon}</span>
          <span style={{ fontSize:"0.6rem", fontWeight:600,
            color:active?C.blue:C.muted }}>{label}</span>
        </button>
      );
    })}
  </nav>
)}

      {/* ── DRAWER PLUS ── */}
      {isMobile && drawer && (
        <>
          <div onClick={()=>setDrawer(false)}
            style={{ position:"fixed", inset:0, zIndex:290, background:"rgba(0,0,0,0.3)" }} />
          <div style={{ position:"fixed", bottom:58, left:0, right:0, zIndex:295,
            background:"#fff", borderTop:`1px solid ${C.border}`,
            borderRadius:"18px 18px 0 0", padding:"14px 18px 10px",
            boxShadow:"0 -4px 20px rgba(0,0,0,0.12)" }}>
            <div style={{ width:32, height:4, borderRadius:2, background:C.border, margin:"0 auto 14px" }} />
            <div style={{ fontSize:"0.72rem", fontWeight:600, textTransform:"uppercase",
              letterSpacing:"0.04em", color:C.muted, marginBottom:10 }}>Autres sections</div>
            {moreItems.map(([id, icon, label]) => (
              <button key={id} onClick={()=>goTo(id)}
                style={{ display:"flex", alignItems:"center", gap:12, width:"100%",
                  padding:"12px 14px", marginBottom:7, borderRadius:12,
                  background:page===id?C.blueLight:C.surfaceAlt,
                  border:`1px solid ${page===id?C.blueBorder:C.border}`,
                  cursor:"pointer", fontFamily:"inherit", textAlign:"left" }}>
                <span style={{ fontSize:"1.2rem" }}>{icon}</span>
                <span style={{ fontWeight:600, fontSize:"0.9rem",
                  color:page===id?C.blue:C.navy }}>{label}</span>
                <span style={{ marginLeft:"auto", color:C.muted }}>›</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
<main style={{ flex:1, overflowY:"auto", 
  padding:isMobile?"14px 12px":"24px 16px",
  paddingBottom: isMobile ? "72px" : undefined }}></main>