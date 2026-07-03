export const C = {
  /* Surfaces */
  bg:"#f0f4f8", surface:"#ffffff", surfaceAlt:"#f8fafc",
  /* Borders */
  border:"#e2e8f0",
  /* Text */
  navy:"#0f172a", dark:"#1e293b", mid:"#475569", muted:"#94a3b8",
  /* Blue */
  blue:"#2563eb", blueLight:"#eff6ff", blueBorder:"#bfdbfe",
  /* Aqua */
  aqua:"#0891b2", aquaLight:"#ecfeff",
  /* Green */
  green:"#059669", greenLight:"#f0fdf4", greenBorder:"#bbf7d0",
  /* Gold */
  gold:"#d97706", goldLight:"#fffbeb", goldBorder:"#fde68a",
  /* Red */
  red:"#dc2626", redLight:"#fef2f2", redBorder:"#fecaca",
  /* Purple */
  purple:"#7c3aed", purpleLight:"#faf5ff", purpleBorder:"#ddd6fe",
};

export const SHADOWS = {
  xs:  "0 1px 2px rgba(0,0,0,0.05)",
  sm:  "0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)",
  md:  "0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04)",
  lg:  "0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04)",
  xl:  "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
  "2xl": "0 25px 50px -12px rgba(0,0,0,0.18)",
  blue:  "0 4px 16px rgba(37,99,235,0.35)",
  blueXl:"0 8px 32px rgba(37,99,235,0.4)",
  card:  "0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)",
  modal: "0 24px 60px rgba(0,0,0,0.3)",
};

export const GRADIENTS = {
  primary:   "linear-gradient(135deg,#2563eb,#0891b2)",
  dark:      "linear-gradient(135deg,#0f172a,#1e3a5f)",
  success:   "linear-gradient(135deg,#059669,#0891b2)",
  danger:    "linear-gradient(135deg,#dc2626,#ea580c)",
  gold:      "linear-gradient(135deg,#d97706,#f59e0b)",
  purple:    "linear-gradient(135deg,#7c3aed,#2563eb)",
  login:     "linear-gradient(160deg,#0f172a 0%,#1e3a5f 50%,#0f2744 100%)",
};

export const ROLES = [
  { id:"etudiant",       icon:"🎓", label:"Étudiant",        desc:"Licence ou Master ARSTM",       color:"#2563eb", bg:"#eff6ff" },
  { id:"enseignant",     icon:"📖", label:"Enseignant",       desc:"Corps professoral ARSTM",       color:"#059669", bg:"#f0fdf4" },
  { id:"alumni",         icon:"🏅", label:"Alumni",           desc:"Ancien étudiant diplômé",       color:"#d97706", bg:"#fffbeb" },
  { id:"administration", icon:"🏫", label:"Administration",   desc:"Scolarité / Direction ARSTM",   color:"#7c3aed", bg:"#faf5ff" },
  { id:"superadmin",     icon:"⚙️", label:"Admin Plateforme", desc:"Gestionnaire de l'application", color:"#dc2626", bg:"#fef2f2" },
];

const T = "all 0.18s ease";
const TFast = "all 0.12s ease";

export const css = {
  app:{ minHeight:"100vh", background:C.bg, color:C.dark, fontFamily:"'Inter',system-ui,sans-serif", fontSize:14 },

  nav:{ position:"sticky", top:0, zIndex:200, background:"#fff",
        borderBottom:`1px solid ${C.border}`, boxShadow:SHADOWS.sm,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 20px", height:56 },

  logo:{ display:"flex", alignItems:"center", gap:9,
         fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1.05rem",
         letterSpacing:"-0.02em", color:C.navy },

  logoBox:{ width:32, height:32, borderRadius:8,
            background:GRADIENTS.primary,
            display:"flex", alignItems:"center", justifyContent:"center",
            color:"#fff", fontWeight:800, fontSize:"0.85rem",
            boxShadow:"0 2px 8px rgba(37,99,235,0.3)" },

  tabs:{ display:"flex", gap:2 },

  tab:(a)=>({ padding:"6px 13px", borderRadius:7, fontSize:"0.82rem", fontWeight:a?600:500,
               cursor:"pointer", border:"none", transition:T,
               background:a?"#eff6ff":"transparent",
               color:a?C.blue:C.mid,
               fontFamily:"inherit" }),

  userPill:{ display:"flex", alignItems:"center", gap:8,
             padding:"5px 10px 5px 6px", borderRadius:20,
             background:C.surfaceAlt, border:`1px solid ${C.border}`,
             transition:T },

  card:{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:14,
         padding:20, boxShadow:SHADOWS.card, transition:T },

  cardSm:{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12,
           padding:16, boxShadow:SHADOWS.xs },

  cardHover:{ boxShadow:SHADOWS.md, transform:"translateY(-1px)", borderColor:"#cbd5e1" },

  pageH:{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1.45rem",
          color:C.navy, letterSpacing:"-0.02em", marginBottom:2 },

  pageSub:{ color:C.muted, fontSize:"0.84rem", marginBottom:20 },

  h3:{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:"1rem",
       color:C.navy, marginBottom:4 },

  label:{ fontSize:"0.72rem", fontWeight:600, textTransform:"uppercase",
          letterSpacing:"0.04em", color:C.muted, marginBottom:8, display:"block" },

  badge:(bg,fg)=>({ display:"inline-flex", alignItems:"center",
                     padding:"2px 8px", borderRadius:100,
                     fontSize:"0.72rem", fontWeight:600, background:bg, color:fg }),

  tag:(bg,fg)=>({ display:"inline-block", padding:"2px 8px", borderRadius:6,
                   fontSize:"0.72rem", fontWeight:600, background:bg, color:fg }),

  btnPrimary:{ padding:"9px 18px", borderRadius:8,
               background:GRADIENTS.primary, color:"#fff", border:"none",
               fontWeight:700, fontSize:"0.84rem", cursor:"pointer",
               fontFamily:"inherit", transition:T,
               boxShadow:"0 2px 8px rgba(37,99,235,0.25)" },

  btnSecondary:{ padding:"8px 16px", borderRadius:8,
                 background:C.surfaceAlt, color:C.dark,
                 border:`1px solid ${C.border}`,
                 fontWeight:500, fontSize:"0.84rem",
                 cursor:"pointer", fontFamily:"inherit", transition:TFast },

  btnGhost:{ padding:"6px 12px", borderRadius:8, background:"transparent",
             color:C.mid, border:"none", fontWeight:500,
             fontSize:"0.82rem", cursor:"pointer",
             fontFamily:"inherit", transition:TFast },

  btnSm:{ padding:"5px 11px", borderRadius:7,
          background:C.blueLight, color:C.blue,
          border:`1px solid ${C.blueBorder}`,
          fontWeight:600, fontSize:"0.76rem",
          cursor:"pointer", fontFamily:"inherit", transition:TFast },

  btnDanger:{ padding:"8px 16px", borderRadius:8,
              background:C.redLight, color:C.red,
              border:`1px solid ${C.redBorder}`,
              fontWeight:600, fontSize:"0.84rem",
              cursor:"pointer", fontFamily:"inherit", transition:TFast },

  input:{ width:"100%", padding:"9px 13px", borderRadius:9,
          border:`1px solid ${C.border}`, fontSize:"0.88rem",
          background:"#fff", color:C.dark, outline:"none",
          boxSizing:"border-box", fontFamily:"inherit",
          transition:"border-color 0.15s, box-shadow 0.15s" },

  inputFocus:{ borderColor:C.blue, boxShadow:`0 0 0 3px ${C.blueLight}` },

  divider:{ height:1, background:C.border, margin:"14px 0" },

  avatar:(bg,fg,sz=36)=>({
    width:sz, height:sz, borderRadius:"50%",
    background:bg, color:fg,
    display:"flex", alignItems:"center", justifyContent:"center",
    fontSize: sz <= 28 ? "0.58rem" : sz <= 36 ? "0.72rem" : "1rem",
    fontWeight:600, flexShrink:0, overflow:"hidden", lineHeight:1,
  }),
};
