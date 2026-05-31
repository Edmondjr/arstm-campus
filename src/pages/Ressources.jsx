// src/pages/Ressources.jsx
import { useState } from "react";
import { C, css } from "../design";
import { useRessources, addDocument, updateDocument } from "../hooks/useFirestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
import { useAuth } from "../AuthContext";

export default function PageRessources({ profile }) {
  const { user } = useAuth();
  const role = profile?.role;
  const { data: ressources, loading } = useRessources();
  const [search, setSearch]     = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [file, setFile]         = useState(null);
  const [form, setForm] = useState({ titre:"", type:"PDF", module:"", auteur:"", filiere:"MPTML" });

  const canUpload = role==="enseignant" || role==="administration" || role==="superadmin";
  const liste = ressources.filter(r =>
    r.titre?.toLowerCase().includes(search.toLowerCase()) ||
    r.auteur?.toLowerCase().includes(search.toLowerCase()) ||
    r.module?.toLowerCase().includes(search.toLowerCase())
  );

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) {
      alert("Fichier trop volumineux. Limite : 50 Mo.");
      e.target.value = "";
      return;
    }
    setFile(f);
    const ext = f.name.split(".").pop().toUpperCase();
    if (["PDF","PPT","PPTX","DOC","DOCX","XLSX"].includes(ext)) {
      setForm(prev => ({ ...prev, type: ext.replace("PPTX","PPT").replace("DOCX","DOC").replace("XLSX","XLSX") }));
    }
  };

  const handleUpload = async () => {
    if (!form.titre || !form.module) return;
    setSaving(true);
    try {
      let url = "";
      let taille = "";
      if (file) {
        setUploading(true);
        const uid = user?.uid || profile?.uid || "anon";
        const path = `ressources/${uid}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, path);
        const task = uploadBytesResumable(storageRef, file);
        await new Promise((resolve, reject) => {
          task.on("state_changed",
            snap => setProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
            reject,
            async () => {
              url = await getDownloadURL(task.snapshot.ref);
              resolve();
            }
          );
        });
        setUploading(false);
        const kb = file.size / 1024;
        taille = kb > 1024 ? `${(kb/1024).toFixed(1)} Mo` : `${Math.round(kb)} Ko`;
      }
      await addDocument("ressources", {
        ...form,
        auteur: form.auteur || profile.name,
        url,
        taille,
        dl: 0,
        nouveau: true,
      });
      setForm({ titre:"", type:"PDF", module:"", auteur:"", filiere:"MPTML" });
      setFile(null);
      setProgress(0);
      setShowForm(false);
    } catch (err) {
      alert("Erreur lors de l'upload : " + err.message);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleDownload = async (r) => {
    if (r.url && r.url !== "#") {
      window.open(r.url, "_blank");
      await updateDocument("ressources", r.id, { dl: (r.dl || 0) + 1 });
    }
  };

  const TypeBadge = ({ type }) => {
    const colors = {
      PDF: [C.redLight, C.red],
      PPT: [C.goldLight, C.gold],
      DOC: [C.blueLight, C.blue],
      XLSX: [C.greenLight, C.green],
    };
    const [bg, fg] = colors[type] || [C.surfaceAlt, C.mid];
    return <span style={{ background:bg, color:fg, padding:"2px 8px", borderRadius:6, fontSize:"0.72rem", fontWeight:600 }}>{type}</span>;
  };

  if (loading) return <div style={{ padding:40, textAlign:"center", color:C.muted }}>Chargement...</div>;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12, marginBottom:20 }}>
        <div>
          <div style={css.pageH}>{role==="enseignant" ? "Mes cours & Ressources" : "Ressources Pédagogiques"}</div>
          <div style={css.pageSub}>{ressources.length} documents disponibles</div>
        </div>
        {canUpload && (
          <button style={css.btnPrimary} onClick={() => setShowForm(!showForm)}>
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
                value={form.titre} onChange={e => setForm({...form, titre:e.target.value})} />
            </div>
            <div style={{ flex:1, minWidth:100 }}>
              <span style={css.label}>Type</span>
              <select style={css.input} value={form.type} onChange={e => setForm({...form, type:e.target.value})}>
                {["PDF","PPT","DOC","XLSX"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:"flex", gap:10, marginBottom:12, flexWrap:"wrap" }}>
            <div style={{ flex:1, minWidth:140 }}>
              <span style={css.label}>Module</span>
              <input style={css.input} placeholder="Ex: Supply Chain"
                value={form.module} onChange={e => setForm({...form, module:e.target.value})} />
            </div>
            <div style={{ flex:1, minWidth:100 }}>
              <span style={css.label}>Filière</span>
              <select style={css.input} value={form.filiere} onChange={e => setForm({...form, filiere:e.target.value})}>
                {["MPTML","LPTML","Tous"].map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <span style={css.label}>Fichier (max 50 Mo)</span>
            <input type="file" accept=".pdf,.ppt,.pptx,.doc,.docx,.xlsx"
              onChange={handleFileChange}
              style={{ display:"block", marginTop:4, fontSize:"0.84rem", color:C.dark }} />
            {file && <div style={{ fontSize:"0.78rem", color:C.green, marginTop:4 }}>✓ {file.name}</div>}
          </div>
          {uploading && (
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:"0.8rem", color:C.blue, marginBottom:4 }}>Upload en cours… {progress}%</div>
              <div style={{ height:6, background:C.border, borderRadius:3 }}>
                <div style={{ height:"100%", width:`${progress}%`, background:C.blue, borderRadius:3, transition:"width 0.2s" }} />
              </div>
            </div>
          )}
          <button style={{ ...css.btnPrimary, opacity:saving?0.7:1 }} onClick={handleUpload} disabled={saving}>
            {saving ? (uploading ? `⏳ Upload ${progress}%…` : "⏳ Enregistrement…") : "📤 Déposer"}
          </button>
        </div>
      )}

      <input style={{ ...css.input, maxWidth:400, marginBottom:18 }}
        placeholder="🔍 Rechercher un cours, auteur, module..."
        value={search} onChange={e => setSearch(e.target.value)} />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
        {liste.map(r => (
          <div key={r.id} style={css.card}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
              <TypeBadge type={r.type} />
              {r.nouveau && <span style={css.badge(C.greenLight, C.green)}>Nouveau</span>}
            </div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:"0.92rem", color:C.navy, lineHeight:1.4, marginBottom:8 }}>{r.titre}</div>
            <span style={{ ...css.badge(C.blueLight, C.blue), marginBottom:8, display:"inline-block" }}>{r.module}</span>
            <div style={{ fontSize:"0.78rem", color:C.muted, marginBottom:4 }}>👤 {r.auteur}</div>
            {r.taille && <div style={{ fontSize:"0.74rem", color:C.muted, marginBottom:10 }}>💾 {r.taille}</div>}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <span style={{ fontSize:"0.76rem", color:C.muted }}>⬇️ {r.dl||0} téléchargements</span>
              <div style={{ display:"flex", gap:6 }}>
                {r.url && r.url !== "#" && r.type === "PDF" && (
                  <button style={{ ...css.btnSm, background:C.blueLight, color:C.blue, border:"none" }}
                    onClick={() => window.open(r.url, "_blank")}>
                    👁 Aperçu
                  </button>
                )}
                <button
                  style={{ ...css.btnSm, opacity:(!r.url || r.url==="#") ? 0.4 : 1 }}
                  onClick={() => handleDownload(r)}
                  disabled={!r.url || r.url==="#"}>
                  ⬇ Télécharger
                </button>
              </div>
            </div>
          </div>
        ))}
        {liste.length === 0 && (
          <div style={{ gridColumn:"1/-1", ...css.card, textAlign:"center", padding:40, color:C.muted }}>
            {search ? `Aucun résultat pour "${search}"` : "Aucun document disponible."}
          </div>
        )}
      </div>
    </div>
  );
}
