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
import PageMessages from "./pages/Messages";

// ── Modes disponibles pour le SuperAdmin ──
const SUPER_MODES = [
  { id:"control",       icon:"🎛",  label:"Contrôle",       color:"#dc2626", bg:"#fef2f2" },
  { id:"support",       icon:"🎫",  label:"Support",         color:"#7c3aed", bg:"#faf5ff" },
  { id:"etudiant",      icon:"🎓",  label:"Étudiant",        color:"#2563eb", bg:"#eff6ff" },
  { id:"enseignant",    icon:"📖",  label:"Enseignant",      color:"#059669", bg:"#f0fdf4" },
  { id:"alumni",        icon:"🏅",  label:"Alumni",          color:"#d97706", bg:"#fffbeb" },
  { id:"administration",icon:"🏫",  label:"Administration",  color:"#7c3aed", bg:"#faf5ff" },
];

// ── Navigation par rôle ──
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
  administration: [["accueil","🏠 Tableau de bord"],["annonces","📢 Annonces"],["edt","📅 EDT"],["ressources","📚 Ressources"],["profil","👤 Profil"],["aide","❓ Aide"]],
  superadmin:     [["admin","🎛 Contrôle"],["admin","🎫 Support"],["annonces","📢 Annonces"],["ressources","📚 Ressources"],["profil","👤 Profil"]],
  control:        [["admin","🎛 Centre de Contrôle"],["profil","👤 Profil"]],
  support:        [["admin","🎫 Centre de Support"],["profil","👤 Profil"]],
};

const PAGE_TITLES = {
  accueil:"Accueil", edt:"Emploi du temps", annonces:"Annonces",
  ressources:"Ressources", social:"Social", alumni:"Alumni",
  profil:"Mon Profil", aide:"Aide & Support", admin:"Administration",
};

export default function App() {
  const { user, profile, logout } = useAuth();
  const [page, setPage]       = useState("accueil");
  const [drawer, setDrawer]   = useState(false);
  const [winW, setWinW]       = useState(typeof window !== "undefined" ? window.innerWidth : 800);
  const [activeMode, setActiveMode] = useState(null); // Mode actif pour SuperAdmin
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showMessages, setShowMessages] = useState(false);

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

  const isMobile   = winW < 820;
  const isSuperAdmin = profile.role === "superadmin";

  // Rôle effectif — si SuperAdmin a choisi un mode, on utilise ce mode
  const effectiveRole = isSuperAdmin && activeMode ? activeMode : profile.role || "etudiant";
  const roleInfo = ROLES.find(r => r.id === effectiveRole) ||
                   SUPER_MODES.find(m => m.id === effectiveRole) ||
                   ROLES[0];

  const goTo = (id) => { setPage(id); setDrawer(false); };

  const switchMode = (modeId) => {
    setActiveMode(modeId);
    setShowModeSelector(false);
    // Rediriger vers la bonne page selon le mode
    if (modeId === "control" || modeId === "support") {
      setPage("admin");
    } else {
      setPage("accueil");
    }
  };

  const navBottom  = NAV_BY_ROLE[effectiveRole]    || NAV_BY_ROLE.etudiant;
  const moreItems  = MORE_BY_ROLE[effectiveRole]   || MORE_BY_ROLE.etudiant;
  const navDesktop = DESKTOP_NAV_BY_ROLE[effectiveRole] || DESKTOP_NAV_BY_ROLE.etudiant;

  // Pages disponibles selon le mode effectif
  const PAGE = {
    accueil:    <Accueil setPage={goTo} isMobile={isMobile} profile={{...profile, role: effectiveRole}} />,
    edt:        <PageEDT profile={{...profile, role: effectiveRole}} />,
    annonces:   <PageAnnonces profile={{...profile, role: effectiveRole}} />,
    ressources: <PageRessources profile={{...profile, role: effectiveRole}} />,
    social:     <PageSocial profile={{...profile, role: effectiveRole}} />,
    alumni:     <PageAlumni profile={{...profile, role: effectiveRole}} />,
    profil:     <PageProfil profile={profile} onLogout={logout} setPage={goTo} />,
    aide:       <PageAide profile={profile} />,
    admin:      <PageAdmin profile={profile} activeMode={activeMode || "control"} />,
  };

  // ── Sélecteur de mode SuperAdmin ──
  const ModeSelectorBar = () => (
    <div style={{
      background: `linear-gradient(135deg, #0f172a, #1e3a5f)`,
      padding: "6px 16px",
      display: "flex",
      alignItems: "center",
      gap: 8,
      overflowX: "auto",
      flexShrink: 0,
    }}>
      <span style={{ fontSize:"0.72rem", color:"rgba(255,255,255,0.5)",
        fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em",
        whiteSpace:"nowrap", marginRight:4 }}>
        Mode :
      </span>
      {SUPER_MODES.map(m => {
        const isActive = (activeMode || "control") === m.id;
        return (
          <button key={m.id} onClick={() => switchMode(m.id)}
            style={{
              padding: "4px 12px", borderRadius: 20, fontSize: "0.75rem",
              fontWeight: 600, cursor: "pointer", border: "none",
              whiteSpace: "nowrap", fontFamily: "inherit",
              background: isActive ? m.bg : "rgba(255,255,255,0.08)",
              color: isActive ? m.color : "rgba(255,255,255,0.6)",
              boxShadow: isActive ? `0 0 0 1px ${m.color}40` : "none",
              transition: "all 0.15s",
            }}>
            {m.icon} {m.label}
          </button>
        );
      })}
      <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
        <span style={{ fontSize:"0.7rem", color:"rgba(255,255,255,0.35)" }}>
          ⚙️ Admin Plateforme
        </span>
        {activeMode && activeMode !== "control" && (
          <button onClick={() => switchMode("control")}
            style={{ padding:"3px 10px", borderRadius:20, fontSize:"0.72rem",
              background:"rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.7)",
              border:"none", cursor:"pointer", fontFamily:"inherit" }}>
            ← Contrôle
          </button>
        )}
      </div>
    </div>
  );

  // Indicateur de mode incognito dans les pages sociales
  const IncognitoBar = () => {
    if (!isSuperAdmin || !activeMode || activeMode === "control" || activeMode === "support") return null;
    const m = SUPER_MODES.find(x => x.id === activeMode);
    return (
      <div style={{
        background: `${m?.color}15`, borderBottom: `1px solid ${m?.color}30`,
        padding: "6px 16px", display:"flex", alignItems:"center", gap:8,
        flexShrink:0, fontSize:"0.78rem",
      }}>
        <span style={{ fontSize:"0.9rem" }}>{m?.icon}</span>
        <span style={{ color: m?.color, fontWeight:600 }}>
          Mode {m?.label}
        </span>
        <span style={{ color: C.muted }}>
          — Vous interagissez comme un {m?.label.toLowerCase()}. Vos actions sont réelles.
        </span>
        <span style={{ ...css.badge("#fef3c7","#d97706"), marginLeft:"auto" }}>
          🕵️ Incognito actif
        </span>
      </div>
    );
  };

  return (
    <div style={{ ...css.app, height:"100vh", overflow:"hidden", display:"flex", flexDirection:"column" }}>

      {/* ── BARRE DE MODE SUPERADMIN ── */}
      {isSuperAdmin && <ModeSelectorBar />}

      {/* ── INDICATEUR INCOGNITO ── */}
      {isSuperAdmin && <IncognitoBar />}

      {/* ── DESKTOP NAV ── */}
      {!isMobile && (
        <nav style={{ ...css.nav, flexShrink:0 }}>
          <div style={css.logo}>
            <div style={css.logoBox}>A</div>
            ARSTM<span style={{ color:C.blue }}>Campus</span>
          </div>
          <div style={css.tabs}>
            {navDesktop.map(([id, label]) => (
              <button key={id+label} style={{ ...css.tab(page===id), fontFamily:"inherit" }}
                onClick={()=>goTo(id)}>{label}</button>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={css.userPill}>
              <div style={{ width:28, height:28, borderRadius:"50%",
                background: roleInfo.bg || C.blueLight,
                color: roleInfo.color || C.blue,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"0.58rem", fontWeight:600, overflow:"hidden", flexShrink:0 }}>
                {profile.avatar || profile.name?.slice(0,2).toUpperCase()}
              </div>
              <span style={{ fontSize:"0.83rem", fontWeight:500, color:C.dark }}>
                {profile.name}
              </span>
              <span style={css.badge(roleInfo.bg || C.blueLight, roleInfo.color || C.blue)}>
                {roleInfo.icon}
              </span>
            </div>
            <button style={{ ...css.btnGhost, color:C.red, fontSize:"0.8rem" }} onClick={logout}>
              🚪
            </button>
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
          <div style={{ width:28, height:28, borderRadius:"50%",
            background: roleInfo.bg || C.blueLight,
            color: roleInfo.color || C.blue,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:"0.58rem", fontWeight:600, cursor:"pointer" }}
            onClick={()=>goTo("profil")}>
            {profile.avatar || profile.name?.slice(0,2).toUpperCase()}
          </div>
        </div>
      )}

      {/* ── PAGE CONTENT ── */}
      <main style={{ flex:1, overflowY:"auto",
        padding: isMobile ? "14px 12px" : "24px 16px",
        paddingBottom: isMobile ? "72px" : "24px" }}>
        <div style={{ maxWidth:1080, margin:"0 auto" }}>
          {PAGE[page] || PAGE.accueil}
        </div>
      </main>

      {/* ── DESKTOP FOOTER ── */}
      {!isMobile && (
        <footer style={{ flexShrink:0, borderTop:`1px solid ${C.border}`, padding:"10px 20px",
          textAlign:"center", fontSize:"0.75rem", color:C.muted, background:"#fff" }}>
          ARSTM Campus v2.0 · Firebase · École Supérieure des Transports Maritimes · Abidjan · 2026
        </footer>
      )}

      {/* ── MOBILE BOTTOM NAV ── */}
      {isMobile && (
        <nav style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:500,
          background:"#fff", borderTop:`1px solid ${C.border}`,
          display:"flex", height:58, boxShadow:"0 -2px 10px rgba(0,0,0,0.07)" }}>
          {navBottom.map(([id, icon, label]) => {
            const isMore = id === "more";
            const active = isMore ? drawer : page === id;
            return (
              <button key={id+label} onClick={()=>isMore?setDrawer(!drawer):goTo(id)}
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

      {/* ── BOUTON FLOTTANT MESSAGES ── */}
      {profile.role !== "superadmin" || (activeMode && activeMode !== "control" && activeMode !== "support") ? (
        <>
          <button onClick={()=>setShowMessages(!showMessages)}
            style={{ position:"fixed", bottom: isMobile ? 72 : 24, right:16, zIndex:800,
              width:50, height:50, borderRadius:"50%",
              background:`linear-gradient(135deg,${C.blue},${C.aqua})`,
              color:"#fff", border:"none", cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"1.3rem", boxShadow:"0 4px 16px rgba(37,99,235,0.4)",
              transition:"transform 0.2s",
              transform: showMessages ? "scale(0.9)" : "scale(1)" }}>
            {showMessages ? "✕" : "💬"}
          </button>
          {showMessages && (
            <>
              <div onClick={()=>setShowMessages(false)}
                style={{ position:"fixed", inset:0, zIndex:799,
                  background:"rgba(0,0,0,0.15)" }} />
              <div style={{ position:"fixed", bottom: isMobile ? 132 : 84,
                right:16, zIndex:800, width: isMobile ? "calc(100vw - 32px)" : 380,
                height: isMobile ? "70vh" : 520 }}>
                <PageMessages profile={profile}
                  onClose={()=>setShowMessages(false)}
                  floating={true} />
              </div>
            </>
          )}
        </>
      ) : null}

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
              <button key={id+label} onClick={()=>goTo(id)}
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