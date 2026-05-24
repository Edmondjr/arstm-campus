// src/pages/EDT.jsx
import { useState } from "react";
import { C, css } from "../design";
import { useEDT, addDocument } from "../hooks/useFirestore";

export default function PageEDT({ profile }) {
  const role = profile?.role;
  const { edt, loading } = useEDT(profile?.promo);
  const jours = Object.keys(edt);
  const [jour, setJour] = useState(null);
  const actif = jour || jours[0] || "Lundi";

  if (loading) return <div style={{ padding:40, textAlign:"center", color:C.muted }}>⏳ Chargement...</div>;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
        flexWrap:"wrap", gap:12, marginBottom:20 }}>
        <div>
          <div style={css.pageH}>
            {role==="enseignant" ? "Mon Planning" : "Emploi du Temps"}
          </div>
          <div style={css.pageSub}>
            {profile?.promo || "ARSTM"} · Semaine en cours
          </div>
        </div>
        {(role==="administration"||role==="superadmin") && (
          <button style={css.btnPrimary}>+ Ajouter un cours</button>
        )}
      </div>

      {jours.length === 0 ? (
        <div style={{ ...css.card, textAlign:"center", padding:48, color:C.muted }}>
          <div style={{ fontSize:"2rem", marginBottom:10 }}>📅</div>
          <div style={{ fontWeight:600, marginBottom:4 }}>Aucun emploi du temps disponible</div>
          <div style={{ fontSize:"0.84rem" }}>
            L'Admin Plateforme doit insérer les données via ⚙️ Admin → Données démo.
          </div>
        </div>
      ) : (
        <>
          <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
            {jours.map(j => (
              <button key={j} onClick={()=>setJour(j)}
                style={{ padding:"8px 16px", borderRadius:10, fontSize:"0.83rem", fontWeight:600,
                  cursor:"pointer", border:`1px solid ${actif===j?C.blue:C.border}`,
                  background:actif===j?C.blue:"#fff", color:actif===j?"#fff":C.dark,
                  fontFamily:"inherit", display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                <span>{j}</span>
                <span style={{ fontSize:"0.68rem", fontWeight:400, opacity:0.75 }}>
                  {edt[j]?.length||0} cours
                </span>
              </button>
            ))}
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {(edt[actif]||[]).map(c => (
              <div key={c.id} style={{ ...css.card, display:"flex", padding:0,
                overflow:"hidden", borderLeft:`4px solid ${c.color||C.blue}` }}>
                <div style={{ width:90, padding:"14px 10px", background:C.surfaceAlt,
                  borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column",
                  justifyContent:"center", alignItems:"center", gap:2, flexShrink:0 }}>
                  <span style={{ fontSize:"0.85rem", fontWeight:700, color:C.navy }}>{c.heureDebut}</span>
                  <span style={{ fontSize:"0.72rem", color:C.muted }}>–{c.heureFin}</span>
                </div>
                <div style={{ flex:1, padding:"14px 16px", display:"flex",
                  justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
                  <div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700,
                      fontSize:"0.96rem", color:C.navy, marginBottom:5 }}>{c.matiere}</div>
                    <div style={{ color:C.muted, fontSize:"0.8rem", display:"flex", gap:12 }}>
                      <span>📍 {c.salle}</span>
                      <span>👤 {c.prof}</span>
                    </div>
                  </div>
                  <span style={css.badge(C.blueLight,C.blue)}>{c.tag||""}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
