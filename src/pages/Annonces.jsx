// src/pages/Annonces.jsx
import { useState } from "react";
import { C, css } from "../design";
import { useAnnonces, addDocument } from "../hooks/useFirestore";

export default function PageAnnonces({ profile }) {
  const role = profile?.role;
  const { data: annonces, loading } = useAnnonces();
  const [filtre, setFiltre] = useState("Tous");
  const [ouvert, setOuvert] = useState(null);
  const [form, setForm]     = useState({ titre:"", cat:"Scolarité", contenu:"", urgent:false });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const cats = ["Tous","Soutenance","Scolarité","Événement","Académique","Club"];
  const liste = filtre==="Tous" ? annonces : annonces.filter(a=>a.cat===filtre);
  const canPublish = role==="administration"||role==="superadmin";

  const catColor = {
    Soutenance:[C.purpleLight,"#6d28d9"], Scolarité:[C.blueLight,C.blue],
    Événement:[C.goldLight,"#92400e"], Académique:[C.greenLight,C.green], Club:["#ecfeff",C.aqua]
  };

  const handlePublish = async () => {
    if (!form.titre || !form.contenu) return;
    setSaving(true);
    await addDocument("annonces", { ...form, auteur: profile.name, promo:"tous" });
    setForm({ titre:"", cat:"Scolarité", contenu:"", urgent:false });
    setShowForm(false);
    setSaving(false);
  };

  if (loading) return <div style={{ padding:40, textAlign:"center", color:C.muted }}>⏳ Chargement...</div>;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
        flexWrap:"wrap", gap:12, marginBottom:20 }}>
        <div>
          <div style={css.pageH}>Annonces & Actualités</div>
          <div style={css.pageSub}>{annonces.length} annonces · {annonces.filter(a=>a.urgent).length} urgentes</div>
        </div>
        {canPublish && (
          <button style={css.btnPrimary} onClick={()=>setShowForm(!showForm)}>
            {showForm?"Annuler":"+ Publier une annonce"}
          </button>
        )}
      </div>

      {/* Formulaire publication */}
      {showForm && canPublish && (
        <div style={{ ...css.card, marginBottom:18, background:C.blueLight, border:`1px solid ${C.blueBorder}` }}>
          <div style={{ fontWeight:700, color:C.navy, marginBottom:14 }}>📢 Nouvelle annonce</div>
          <div style={{ marginBottom:12 }}>
            <span style={css.label}>Titre</span>
            <input style={{ ...css.input }} placeholder="Titre de l'annonce"
              value={form.titre} onChange={e=>setForm({...form,titre:e.target.value})} />
          </div>
          <div style={{ display:"flex", gap:10, marginBottom:12 }}>
            <div style={{ flex:1 }}>
              <span style={css.label}>Catégorie</span>
              <select style={css.input} value={form.cat} onChange={e=>setForm({...form,cat:e.target.value})}>
                {["Soutenance","Scolarité","Événement","Académique","Club"].map(c=>(
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, paddingTop:20 }}>
              <input type="checkbox" checked={form.urgent}
                onChange={e=>setForm({...form,urgent:e.target.checked})} />
              <span style={{ fontSize:"0.85rem", color:C.red, fontWeight:600 }}>🔴 Urgent</span>
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <span style={css.label}>Contenu</span>
            <textarea style={{ ...css.input, resize:"none", minHeight:80 }}
              placeholder="Contenu de l'annonce..."
              value={form.contenu} onChange={e=>setForm({...form,contenu:e.target.value})} />
          </div>
          <button style={{ ...css.btnPrimary, opacity:saving?0.7:1 }}
            onClick={handlePublish} disabled={saving}>
            {saving?"⏳ Publication...":"📢 Publier"}
          </button>
        </div>
      )}

      {/* Filtres */}
      <div style={{ display:"flex", gap:7, marginBottom:18, flexWrap:"wrap" }}>
        {cats.map(c => (
          <button key={c} style={{ padding:"6px 14px", borderRadius:100, fontSize:"0.82rem",
            fontWeight:500, cursor:"pointer", border:`1px solid ${filtre===c?C.blue:C.border}`,
            background:filtre===c?C.blue:"#fff", color:filtre===c?"#fff":C.mid, fontFamily:"inherit" }}
            onClick={()=>setFiltre(c)}>{c}</button>
        ))}
      </div>

      {/* Liste */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {liste.map(a => {
          const [bg,fg] = catColor[a.cat]||[C.surfaceAlt,C.mid];
          return (
            <div key={a.id} style={{ ...css.card, borderLeft:`3px solid ${a.urgent?C.red:fg}`,
              cursor:"pointer" }} onClick={()=>setOuvert(ouvert===a.id?null:a.id)}>
              <div style={{ display:"flex", justifyContent:"space-between", gap:12 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:7, marginBottom:7, flexWrap:"wrap" }}>
                    <span style={css.badge(bg,fg)}>{a.cat}</span>
                    {a.urgent && <span style={css.badge(C.redLight,C.red)}>🔴 Urgent</span>}
                  </div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:"0.94rem",
                    color:C.navy, lineHeight:1.35, marginBottom:4 }}>{a.titre}</div>
                  <div style={{ fontSize:"0.77rem", color:C.muted }}>
                    ✍️ {a.auteur} · {a.createdAt?.toDate?.()?.toLocaleDateString("fr-FR")||"Récent"}
                  </div>
                </div>
                <span style={{ color:C.muted, fontSize:"0.9rem" }}>{ouvert===a.id?"▲":"▼"}</span>
              </div>
              {ouvert===a.id && (
                <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.border}`,
                  fontSize:"0.87rem", lineHeight:1.7, color:C.dark }}>
                  {a.contenu}
                </div>
              )}
            </div>
          );
        })}
        {liste.length===0 && (
          <div style={{ ...css.card, textAlign:"center", padding:40, color:C.muted }}>
            Aucune annonce dans cette catégorie.
          </div>
        )}
      </div>
    </div>
  );
}
