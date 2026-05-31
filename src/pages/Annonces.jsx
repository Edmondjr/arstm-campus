// src/pages/Annonces.jsx
import { useState } from "react";
import { C, css } from "../design";
import { useAnnonces, addDocument, updateDocument, deleteDocument } from "../hooks/useFirestore";

export default function PageAnnonces({ profile }) {
  const role = profile?.role;
  const { data: annonces, loading } = useAnnonces();
  const [filtre, setFiltre] = useState("Tous");
  const [ouvert, setOuvert] = useState(null);
  const [form, setForm]     = useState({ titre:"", cat:"Scolarité", contenu:"", urgent:false });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const cats = ["Tous","Soutenance","Scolarité","Événement","Académique","Club"];
  const liste = filtre==="Tous" ? annonces : annonces.filter(a => a.cat===filtre);
  const canPublish = role==="administration" || role==="superadmin";

  const catColor = {
    Soutenance: [C.purpleLight, "#6d28d9"],
    Scolarité:  [C.blueLight,   C.blue],
    Événement:  [C.goldLight,   "#92400e"],
    Académique: [C.greenLight,  C.green],
    Club:       ["#ecfeff",     C.aqua],
  };

  const handlePublish = async () => {
    if (!form.titre || !form.contenu) return;
    setSaving(true);
    await addDocument("annonces", { ...form, auteur: profile.name, promo:"tous" });
    setForm({ titre:"", cat:"Scolarité", contenu:"", urgent:false });
    setShowForm(false);
    setSaving(false);
  };

  const handleEdit = async () => {
    if (!editForm?.titre || !editForm?.contenu) return;
    setSaving(true);
    await updateDocument("annonces", editId, {
      titre:   editForm.titre,
      cat:     editForm.cat,
      contenu: editForm.contenu,
      urgent:  editForm.urgent,
    });
    setEditId(null);
    setEditForm(null);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await deleteDocument("annonces", id);
    setConfirmDelete(null);
    if (ouvert === id) setOuvert(null);
  };

  if (loading) return <div style={{ padding:40, textAlign:"center", color:C.muted }}>⏳ Chargement…</div>;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12, marginBottom:20 }}>
        <div>
          <div style={css.pageH}>Annonces & Actualités</div>
          <div style={css.pageSub}>{annonces.length} annonces · {annonces.filter(a=>a.urgent).length} urgentes</div>
        </div>
        {canPublish && (
          <button style={css.btnPrimary} onClick={() => setShowForm(!showForm)}>
            {showForm ? "Annuler" : "+ Publier une annonce"}
          </button>
        )}
      </div>

      {/* Formulaire publication */}
      {showForm && canPublish && (
        <div style={{ ...css.card, marginBottom:18, background:C.blueLight, border:`1px solid ${C.blueBorder}` }}>
          <div style={{ fontWeight:700, color:C.navy, marginBottom:14 }}>📢 Nouvelle annonce</div>
          <div style={{ marginBottom:12 }}>
            <span style={css.label}>Titre</span>
            <input style={css.input} placeholder="Titre de l'annonce"
              value={form.titre} onChange={e => setForm({...form, titre:e.target.value})} />
          </div>
          <div style={{ display:"flex", gap:10, marginBottom:12 }}>
            <div style={{ flex:1 }}>
              <span style={css.label}>Catégorie</span>
              <select style={css.input} value={form.cat} onChange={e => setForm({...form, cat:e.target.value})}>
                {["Soutenance","Scolarité","Événement","Académique","Club"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, paddingTop:20 }}>
              <input type="checkbox" checked={form.urgent}
                onChange={e => setForm({...form, urgent:e.target.checked})} />
              <span style={{ fontSize:"0.85rem", color:C.red, fontWeight:600 }}>🔴 Urgent</span>
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <span style={css.label}>Contenu</span>
            <textarea style={{ ...css.input, resize:"none", minHeight:80 }}
              placeholder="Contenu de l'annonce…"
              value={form.contenu} onChange={e => setForm({...form, contenu:e.target.value})} />
          </div>
          <button style={{ ...css.btnPrimary, opacity:saving?0.7:1 }} onClick={handlePublish} disabled={saving}>
            {saving ? "⏳ Publication…" : "📢 Publier"}
          </button>
        </div>
      )}

      {/* Filtres */}
      <div style={{ display:"flex", gap:7, marginBottom:18, flexWrap:"wrap" }}>
        {cats.map(c => (
          <button key={c} style={{
            padding:"6px 14px", borderRadius:100, fontSize:"0.82rem",
            fontWeight:500, cursor:"pointer",
            border:`1px solid ${filtre===c?C.blue:C.border}`,
            background:filtre===c?C.blue:"#fff",
            color:filtre===c?"#fff":C.mid, fontFamily:"inherit",
          }} onClick={() => setFiltre(c)}>{c}</button>
        ))}
      </div>

      {/* Liste */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {liste.map(a => {
          const [bg, fg] = catColor[a.cat] || [C.surfaceAlt, C.mid];
          const isOpen = ouvert === a.id;
          return (
            <div key={a.id} style={{ ...css.card, borderLeft:`3px solid ${a.urgent?C.red:fg}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", gap:12, cursor:"pointer" }}
                onClick={() => setOuvert(isOpen ? null : a.id)}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:7, marginBottom:7, flexWrap:"wrap" }}>
                    <span style={css.badge(bg, fg)}>{a.cat}</span>
                    {a.urgent && <span style={css.badge(C.redLight, C.red)}>🔴 Urgent</span>}
                  </div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:"0.94rem",
                    color:C.navy, lineHeight:1.35, marginBottom:4 }}>{a.titre}</div>
                  <div style={{ fontSize:"0.77rem", color:C.muted }}>
                    ✍️ {a.auteur} · {a.createdAt?.toDate?.()?.toLocaleDateString("fr-FR")||"Récent"}
                  </div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 }}>
                  <span style={{ color:C.muted, fontSize:"0.9rem" }}>{isOpen?"▲":"▼"}</span>
                  {canPublish && (
                    <div style={{ display:"flex", gap:5 }} onClick={e => e.stopPropagation()}>
                      <button style={{ ...css.btnSm, background:C.blueLight, color:C.blue, border:"none", fontSize:"0.72rem" }}
                        onClick={() => { setEditId(a.id); setEditForm({ titre:a.titre, cat:a.cat, contenu:a.contenu, urgent:!!a.urgent }); }}>
                        ✏️
                      </button>
                      <button style={{ ...css.btnSm, background:C.redLight, color:C.red, border:"none", fontSize:"0.72rem" }}
                        onClick={() => setConfirmDelete(a.id)}>
                        🗑
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {isOpen && (
                <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.border}`,
                  fontSize:"0.87rem", lineHeight:1.7, color:C.dark }}>
                  {a.contenu}
                </div>
              )}
            </div>
          );
        })}
        {liste.length === 0 && (
          <div style={{ ...css.card, textAlign:"center", padding:40, color:C.muted }}>
            Aucune annonce dans cette catégorie.
          </div>
        )}
      </div>

      {/* Modal édition */}
      {editId && editForm && (
        <div onClick={() => { setEditId(null); setEditForm(null); }}
          style={{ position:"fixed", inset:0, zIndex:2000, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
          className="animate-fade-in">
          <div onClick={e => e.stopPropagation()} className="modal-enter"
            style={{ background:"#fff", borderRadius:18, padding:"24px 20px", width:"100%", maxWidth:480, boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
            <div style={{ fontWeight:700, color:C.navy, marginBottom:14, fontSize:"1rem" }}>✏️ Modifier l'annonce</div>
            <div style={{ marginBottom:10 }}>
              <span style={css.label}>Titre</span>
              <input style={css.input} value={editForm.titre}
                onChange={e => setEditForm({...editForm, titre:e.target.value})} />
            </div>
            <div style={{ display:"flex", gap:10, marginBottom:10 }}>
              <div style={{ flex:1 }}>
                <span style={css.label}>Catégorie</span>
                <select style={css.input} value={editForm.cat}
                  onChange={e => setEditForm({...editForm, cat:e.target.value})}>
                  {["Soutenance","Scolarité","Événement","Académique","Club"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6, paddingTop:20 }}>
                <input type="checkbox" checked={editForm.urgent}
                  onChange={e => setEditForm({...editForm, urgent:e.target.checked})} />
                <span style={{ fontSize:"0.84rem", color:C.red, fontWeight:600 }}>Urgent</span>
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <span style={css.label}>Contenu</span>
              <textarea style={{ ...css.input, resize:"none", minHeight:80 }} value={editForm.contenu}
                onChange={e => setEditForm({...editForm, contenu:e.target.value})} />
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button style={{ ...css.btnSecondary, flex:1 }} onClick={() => { setEditId(null); setEditForm(null); }}>Annuler</button>
              <button style={{ ...css.btnPrimary, flex:1, opacity:saving?0.7:1 }} onClick={handleEdit} disabled={saving}>
                {saving ? "⏳…" : "✅ Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmation suppression */}
      {confirmDelete && (
        <div onClick={() => setConfirmDelete(null)}
          style={{ position:"fixed", inset:0, zIndex:2000, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
          className="animate-fade-in">
          <div onClick={e => e.stopPropagation()} className="modal-enter"
            style={{ background:"#fff", borderRadius:18, padding:"28px 22px", width:"100%", maxWidth:320, textAlign:"center" }}>
            <div style={{ fontSize:"2rem", marginBottom:10 }}>🗑️</div>
            <div style={{ fontWeight:700, color:C.navy, marginBottom:8 }}>Supprimer cette annonce ?</div>
            <p style={{ fontSize:"0.83rem", color:C.muted, marginBottom:20 }}>Cette action est irréversible.</p>
            <div style={{ display:"flex", gap:10 }}>
              <button style={{ ...css.btnSecondary, flex:1 }} onClick={() => setConfirmDelete(null)}>Annuler</button>
              <button style={{ flex:1, padding:"10px", borderRadius:8, background:C.red, color:"#fff", border:"none", fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}
                onClick={() => handleDelete(confirmDelete)}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
