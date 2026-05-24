// src/pages/Ressources.jsx
import { useState } from "react";
import { C, css } from "../design";
import { useRessources, addDocument } from "../hooks/useFirestore";

export default function PageRessources({ profile }) {
  const role = profile?.role;
  const { data: ressources, loading } = useRessources();
  const [search, setSearch]     = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm] = useState({ titre:"", type:"PDF", module:"", auteur:"", filiere:"MPTML", taille:"", url:"" });

  const canUpload = role==="enseignant" || role==="administration" || role==="superadmin";
  const liste = ressources.filter(r =>
    r.titre?.toLowerCase().includes(search.toLowerCase()) ||
    r.auteur?.toLowerCase().includes(search.toLowerCase()) ||
    r.module?.toLowerCase().includes(search.toLowerCase())
  );

  const handleUpload = async () => {
    if (!form.titre || !form.module) return;
    setSaving(true);
    await addDocument("ressources", { ...form, auteur: form.auteur || profile.name, dl:0, nouveau:true });
    setForm({ titre:"", type:"PDF", module:"", auteur:"", filiere:"MPTML", taille:"", url:"" });
    setShowForm(false);
    setSaving(false);
  };

  const TypeBadge = ({ type }) => {
    const colors = { PDF:[C.redLight,C.red], PPT:[C.goldLight,C.gold], DOC:[C.blueLight,C.blue] };
    const [bg, fg] = colors[type] || [C.surfaceAlt, C.mid];
    return <span style={{ background:bg, color:fg, padding:"2px 8px", borderRadius:6, fontSize:"0.72rem", fontWeight:600 }}>{type}</span>;
  }
  if (loading) return <div style={{ padding:40, textAlign:"center", color:C.muted }}> Chargement...</div>;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12, marginBottom:20 }}>
        <div>
          <div style={css.pageH}>{role==="enseignant" ? "Mes cours & Ressources" : "Ressources Pédagogiques"}</div>
          <div style={css.pageSub}>{ressources.length} documents disponibles</div>
        </div>
        {canUpload && (
          <button style={css.btnPrimary} onClick={()=>setShowForm(!showForm)}>
            {showForm ? "Annuler" : "+ Déposer un document"}
          </button>
        )}
      </div>

      {showForm && (
        <div style={{ ...css.card, marginBottom:18, background:C.greenLight, border:`1px solid ${C.greenBorder}` }}>
          <div style={{ fontWeight:700, color:C.navy, marginBottom:14 }}>📚 Déposer un document</div>
          <div style={{ display:"flex", gap:10, marginBottom:12, flexWrap:"wrap" }}>
            <div style={{ flex:2, minWidth:200 }}>
              <span style={css.label}>Titre</span>
              <input style={css.input} placeholder="Titre du document"
                value={form.titre} onChange={e=>setForm({...form,titre:e.target.value})} />
            </div>
            <div style={{ flex:1, minWidth:100 }}>
              <span style={css.label}>Type</span>
              <select style={css.input} value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
                {["PDF","PPT","DOC","XLSX"].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap" }}>
            <div style={{ flex:1, minWidth:140 }}>
              <span style={css.label}>Module</span>
              <input style={css.input} placeholder="Ex: Supply Chain"
                value={form.module} onChange={e=>setForm({...form,module:e.target.value})} />
            </div>
            <div style={{ flex:1, minWidth:100 }}>
              <span style={css.label}>Filière</span>
              <select style={css.input} value={form.filiere} onChange={e=>setForm({...form,filiere:e.target.value})}>
                {["MPTML","LPTML","Tous"].map(f=><option key={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <button style={{ ...css.btnPrimary, opacity:saving?0.7:1 }} onClick={handleUpload} disabled={saving}>
            {saving ? "⏳ Enregistrement..." : "📤 Déposer"}
          </button>
        </div>
      )}

      <input style={{ ...css.input, maxWidth:400, marginBottom:18 }}
        placeholder="🔍 Rechercher un cours, auteur, module..."
        value={search} onChange={e=>setSearch(e.target.value)} />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
        {liste.map(r => (
          <div key={r.id} style={css.card}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
              <TypeBadge type={r.type} />
              {r.nouveau && <span style={css.badge(C.greenLight,C.green)}>Nouveau</span>}
            </div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:"0.92rem", color:C.navy, lineHeight:1.4, marginBottom:8 }}>{r.titre}</div>
            <span style={{ ...css.badge(C.blueLight,C.blue), marginBottom:8, display:"inline-block" }}>{r.module}</span>
            <div style={{ fontSize:"0.78rem", color:C.muted, marginBottom:10 }}>👤 {r.auteur}</div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:"0.76rem", color:C.muted }}>⬇️ {r.dl||0}</span>
              <button style={css.btnSm}>⬇ Télécharger</button>
            </div>
          </div>
        ))}
        {liste.length===0 && (
          <div style={{ gridColumn:"1/-1", ...css.card, textAlign:"center", padding:40, color:C.muted }}>
            {search ? `Aucun résultat pour "${search}"` : "Aucun document disponible."}
          </div>
        )}
      </div>
    </div>
  );
}