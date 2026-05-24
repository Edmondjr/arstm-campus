// src/pages/Admin.jsx
import { useState } from "react";
import { C, ROLES, css } from "../design";
import { useUsers, approveUser, rejectUser, useCollection } from "../hooks/useFirestore";
import { seedDemoData } from "../hooks/useFirestore";

export default function PageAdmin({ profile }) {
  const [tab, setTab]       = useState("pending");
  const [seeding, setSeeding] = useState(false);
  const [seedDone, setSeedDone] = useState(false);

  const { data: pending }  = useUsers("pending");
  const { data: approved } = useUsers("approved");
  const { data: rejected } = useUsers("rejected");
  const { data: annonces } = useCollection("annonces");

  const handleApprove = async (uid) => {
    await approveUser(uid);
  };

  const handleReject = async (uid) => {
    await rejectUser(uid);
  };

  const handleSeed = async () => {
    setSeeding(true);
    await seedDemoData();
    setSeeding(false);
    setSeedDone(true);
  };

  const UserCard = ({ u, showActions }) => {
    const r = ROLES.find(r=>r.id===u.role)||{};
    return (
      <div style={{ ...css.card, marginBottom:10, display:"flex", alignItems:"center",
        justifyContent:"space-between", flexWrap:"wrap", gap:12, padding:14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:"50%", background:r.bg||C.blueLight,
            color:r.color||C.blue, display:"flex", alignItems:"center", justifyContent:"center",
            fontWeight:700, fontSize:"0.85rem", flexShrink:0 }}>
            {u.avatar||u.name?.slice(0,2)||"?"}
          </div>
          <div>
            <div style={{ fontWeight:600, color:C.navy, fontSize:"0.9rem" }}>{u.name}</div>
            <div style={{ fontSize:"0.78rem", color:C.muted }}>{u.email}</div>
            <div style={{ display:"flex", gap:6, marginTop:3 }}>
              <span style={css.badge(r.bg||C.blueLight, r.color||C.blue)}>
                {r.icon} {u.role}
              </span>
              {u.promo && <span style={css.badge(C.surfaceAlt, C.mid)}>{u.promo}</span>}
            </div>
          </div>
        </div>
        {showActions && (
          <div style={{ display:"flex", gap:8 }}>
            <button style={{ ...css.btnSm, background:C.greenLight, color:C.green,
              border:`1px solid ${C.greenBorder}`, padding:"7px 16px" }}
              onClick={()=>handleApprove(u.uid||u.id)}>
              ✓ Approuver
            </button>
            <button style={{ ...css.btnDanger, fontSize:"0.78rem", padding:"7px 16px" }}
              onClick={()=>handleReject(u.uid||u.id)}>
              ✗ Refuser
            </button>
          </div>
        )}
        {!showActions && (
          <span style={css.badge(
            u.status==="approved"?C.greenLight:C.redLight,
            u.status==="approved"?C.green:C.red
          )}>
            {u.status==="approved"?"✓ Approuvé":"✗ Refusé"}
          </span>
        )}
      </div>
    );
  };

  return (
    <div>
      <div style={css.pageH}>⚙️ Administration Plateforme</div>
      <div style={css.pageSub}>Accès réservé — Admin Plateforme uniquement</div>

      {/* Stats globales */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:22 }}>
        {[
          [pending.length, "En attente", "⏳", C.gold, C.goldLight],
          [approved.length, "Approuvés", "✅", C.green, C.greenLight],
          [rejected.length, "Refusés", "❌", C.red, C.redLight],
          [annonces.length, "Annonces", "📢", C.blue, C.blueLight],
        ].map(([v,l,icon,color,bg],i) => (
          <div key={i} style={{ ...css.cardSm, textAlign:"center", background:bg, border:`1px solid ${color}22` }}>
            <div style={{ fontSize:"1.2rem" }}>{icon}</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1.5rem", color }}>{v}</div>
            <div style={{ fontSize:"0.73rem", color:C.muted, marginTop:2 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap" }}>
        {[["pending","⏳ En attente"],["approved","✅ Approuvés"],["rejected","❌ Refusés"],["data","🌱 Données démo"]].map(([v,l]) => (
          <button key={v} style={{ ...css.tab(tab===v), borderRadius:10, padding:"7px 14px",
            border:`1px solid ${tab===v?C.blue:C.border}`, fontFamily:"inherit" }}
            onClick={()=>setTab(v)}>{l}
            {v==="pending" && pending.length > 0 && (
              <span style={{ ...css.badge(C.red, "#fff"), marginLeft:6, fontSize:"0.65rem" }}>
                {pending.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Comptes en attente */}
      {tab === "pending" && (
        <div>
          {pending.length === 0 ? (
            <div style={{ ...css.card, textAlign:"center", padding:40, color:C.muted }}>
              <div style={{ fontSize:"2rem", marginBottom:8 }}>✅</div>
              <div>Aucun compte en attente de validation.</div>
            </div>
          ) : (
            pending.map(u => <UserCard key={u.id} u={u} showActions={true} />)
          )}
        </div>
      )}

      {/* Comptes approuvés */}
      {tab === "approved" && (
        <div>
          {approved.length === 0 ? (
            <div style={{ ...css.card, textAlign:"center", padding:40, color:C.muted }}>
              Aucun compte approuvé.
            </div>
          ) : (
            approved.map(u => <UserCard key={u.id} u={u} showActions={false} />)
          )}
        </div>
      )}

      {/* Comptes refusés */}
      {tab === "rejected" && (
        <div>
          {rejected.length === 0 ? (
            <div style={{ ...css.card, textAlign:"center", padding:40, color:C.muted }}>
              Aucun compte refusé.
            </div>
          ) : (
            rejected.map(u => <UserCard key={u.id} u={u} showActions={false} />)
          )}
        </div>
      )}

      {/* Données démo */}
      {tab === "data" && (
        <div style={css.card}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, color:C.navy, marginBottom:8 }}>
            🌱 Initialiser les données de démonstration
          </div>
          <p style={{ fontSize:"0.86rem", color:C.mid, lineHeight:1.65, marginBottom:16 }}>
            Insère les données de démonstration dans Firestore : annonces, emplois du temps, 
            ressources pédagogiques, offres alumni et posts sociaux. À utiliser une seule fois 
            pour préparer la démo.
          </p>
          {seedDone ? (
            <div style={{ background:C.greenLight, border:`1px solid ${C.greenBorder}`,
              borderRadius:10, padding:"12px 16px", color:C.green, fontWeight:600 }}>
              ✅ Données insérées avec succès dans Firestore !
            </div>
          ) : (
            <button style={{ ...css.btnPrimary, opacity:seeding?0.7:1,
              display:"flex", alignItems:"center", gap:8 }}
              onClick={handleSeed} disabled={seeding}>
              {seeding ? "⏳ Insertion en cours..." : "🌱 Insérer les données démo"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
