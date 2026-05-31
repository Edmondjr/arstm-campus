// src/pages/EDT.jsx
import { useState } from "react";
import { C, css } from "../design";
import { useEDT, addDocument, deleteDocument } from "../hooks/useFirestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
import { useAuth } from "../AuthContext";

const JOURS_LIST = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
const TAG_COLORS = {
  Droit:"#2563eb", Logistique:"#0891b2", Douanes:"#059669",
  Commerce:"#0891b2", Projet:"#7c3aed", Maritime:"#0891b2", TD:"#d97706",
};

export default function PageEDT({ profile }) {
  const { user } = useAuth();
  const role = profile?.role;
  const canManage = role === "administration" || role === "superadmin";
  const { edt, loading } = useEDT(canManage ? null : profile?.promo);
  const jours = Object.keys(edt);
  const [jour, setJour] = useState(null);
  const actif = jour || jours[0] || "Lundi";

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [attachFile, setAttachFile] = useState(null);
  const [form, setForm] = useState({
    jour: "Lundi",
    heureDebut: "08:00",
    heureFin:   "10:00",
    matiere:    "",
    salle:      "",
    prof:       "",
    tag:        "Logistique",
    color:      "#2563eb",
    promo:      profile?.promo || "MPTML — Promo 34",
  });

  const handleAttach = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) { alert("Max 20 Mo"); e.target.value = ""; return; }
    setAttachFile(f);
  };

  const handleSave = async () => {
    if (!form.matiere || !form.salle || !form.prof) return;
    setSaving(true);
    try {
      let fileUrl = "";
      if (attachFile) {
        setUploading(true);
        const uid = user?.uid || "anon";
        const path = `edt/${uid}/${Date.now()}_${attachFile.name}`;
        const task = uploadBytesResumable(ref(storage, path), attachFile);
        await new Promise((resolve, reject) => {
          task.on("state_changed",
            snap => setProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
            reject,
            async () => { fileUrl = await getDownloadURL(task.snapshot.ref); resolve(); }
          );
        });
        setUploading(false);
      }
      await addDocument("edt", { ...form, fileUrl });
      setForm({
        jour:"Lundi", heureDebut:"08:00", heureFin:"10:00",
        matiere:"", salle:"", prof:"", tag:"Logistique", color:"#2563eb",
        promo: profile?.promo || "MPTML — Promo 34",
      });
      setAttachFile(null);
      setProgress(0);
      setShowForm(false);
    } catch (err) {
      alert("Erreur : " + err.message);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  if (loading) return <div style={{ padding:40, textAlign:"center", color:C.muted }}>⏳ Chargement…</div>;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12, marginBottom:20 }}>
        <div>
          <div style={css.pageH}>{role==="enseignant" ? "Mon Planning" : "Emploi du Temps"}</div>
          <div style={css.pageSub}>{profile?.promo || "ARSTM"} · Semaine en cours</div>
        </div>
        {canManage && (
          <button style={css.btnPrimary} onClick={() => setShowForm(!showForm)}>
            {showForm ? "Annuler" : "+ Ajouter un cours"}
          </button>
        )}
      </div>

      {/* ── FORMULAIRE ── */}
      {showForm && canManage && (
        <div style={{ ...css.card, marginBottom:18, background:C.blueLight, border:`1px solid ${C.blueBorder}` }}>
          <div style={{ fontWeight:700, color:C.navy, marginBottom:14 }}>📅 Nouveau cours</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
            <div>
              <span style={css.label}>Jour</span>
              <select style={css.input} value={form.jour} onChange={e => setForm({...form, jour:e.target.value})}>
                {JOURS_LIST.map(j => <option key={j}>{j}</option>)}
              </select>
            </div>
            <div>
              <span style={css.label}>Promotion</span>
              <input style={css.input} placeholder="Ex: MPTML — Promo 34"
                value={form.promo} onChange={e => setForm({...form, promo:e.target.value})} />
            </div>
            <div>
              <span style={css.label}>Heure début</span>
              <input style={css.input} type="time" value={form.heureDebut}
                onChange={e => setForm({...form, heureDebut:e.target.value})} />
            </div>
            <div>
              <span style={css.label}>Heure fin</span>
              <input style={css.input} type="time" value={form.heureFin}
                onChange={e => setForm({...form, heureFin:e.target.value})} />
            </div>
          </div>
          <div style={{ marginBottom:10 }}>
            <span style={css.label}>Matière *</span>
            <input style={css.input} placeholder="Ex: Supply Chain Avancée"
              value={form.matiere} onChange={e => setForm({...form, matiere:e.target.value})} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
            <div>
              <span style={css.label}>Salle *</span>
              <input style={css.input} placeholder="Ex: Amphi A"
                value={form.salle} onChange={e => setForm({...form, salle:e.target.value})} />
            </div>
            <div>
              <span style={css.label}>Professeur *</span>
              <input style={css.input} placeholder="Ex: M. Dosso Ismaël"
                value={form.prof} onChange={e => setForm({...form, prof:e.target.value})} />
            </div>
            <div>
              <span style={css.label}>Tag</span>
              <select style={css.input} value={form.tag}
                onChange={e => setForm({...form, tag:e.target.value, color:TAG_COLORS[e.target.value]||"#2563eb"})}>
                {Object.keys(TAG_COLORS).map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <span style={css.label}>Couleur</span>
              <input type="color" value={form.color} onChange={e => setForm({...form, color:e.target.value})}
                style={{ ...css.input, padding:4, height:38, cursor:"pointer" }} />
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <span style={css.label}>Pièce jointe (PDF/image, max 20 Mo)</span>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleAttach}
              style={{ display:"block", marginTop:4, fontSize:"0.84rem", color:C.dark }} />
            {attachFile && <div style={{ fontSize:"0.78rem", color:C.green, marginTop:4 }}>✓ {attachFile.name}</div>}
          </div>
          {uploading && (
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:"0.8rem", color:C.blue, marginBottom:4 }}>Upload… {progress}%</div>
              <div style={{ height:6, background:C.border, borderRadius:3 }}>
                <div style={{ height:"100%", width:`${progress}%`, background:C.blue, borderRadius:3, transition:"width 0.2s" }} />
              </div>
            </div>
          )}
          <button style={{ ...css.btnPrimary, opacity:saving?0.7:1 }} onClick={handleSave} disabled={saving}>
            {saving ? "⏳ Enregistrement…" : "✅ Enregistrer"}
          </button>
        </div>
      )}

      {jours.length === 0 ? (
        <div style={{ ...css.card, textAlign:"center", padding:48, color:C.muted }}>
          <div style={{ fontSize:"2rem", marginBottom:10 }}>📅</div>
          <div style={{ fontWeight:600, marginBottom:4 }}>Aucun emploi du temps disponible</div>
          <div style={{ fontSize:"0.84rem" }}>
            {canManage ? "Utilisez le bouton « + Ajouter un cours » ci-dessus." : "L'Admin doit insérer les données via ⚙️ Admin → Données démo."}
          </div>
        </div>
      ) : (
        <>
          <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
            {jours.map(j => (
              <button key={j} onClick={() => setJour(j)} style={{
                padding:"8px 16px", borderRadius:10, fontSize:"0.83rem", fontWeight:600,
                cursor:"pointer", border:`1px solid ${actif===j?C.blue:C.border}`,
                background:actif===j?C.blue:"#fff", color:actif===j?"#fff":C.dark,
                fontFamily:"inherit", display:"flex", flexDirection:"column", alignItems:"center", gap:2,
              }}>
                <span>{j}</span>
                <span style={{ fontSize:"0.68rem", fontWeight:400, opacity:0.75 }}>
                  {edt[j]?.length||0} cours
                </span>
              </button>
            ))}
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {(edt[actif]||[]).map(c => (
              <div key={c.id} style={{ ...css.card, display:"flex", padding:0, overflow:"hidden", borderLeft:`4px solid ${c.color||C.blue}` }}>
                <div style={{ width:90, padding:"14px 10px", background:C.surfaceAlt,
                  borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column",
                  justifyContent:"center", alignItems:"center", gap:2, flexShrink:0 }}>
                  <span style={{ fontSize:"0.85rem", fontWeight:700, color:C.navy }}>{c.heureDebut}</span>
                  <span style={{ fontSize:"0.72rem", color:C.muted }}>–{c.heureFin}</span>
                </div>
                <div style={{ flex:1, padding:"14px 16px", display:"flex",
                  justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700,
                      fontSize:"0.96rem", color:C.navy, marginBottom:5 }}>{c.matiere}</div>
                    <div style={{ color:C.muted, fontSize:"0.8rem", display:"flex", gap:12, flexWrap:"wrap" }}>
                      <span>📍 {c.salle}</span>
                      <span>👤 {c.prof}</span>
                      {c.promo && <span style={{ opacity:0.7 }}>🎓 {c.promo}</span>}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
                    <span style={css.badge(C.blueLight, C.blue)}>{c.tag||""}</span>
                    {c.fileUrl && (
                      <button style={{ ...css.btnSm, fontSize:"0.74rem" }}
                        onClick={() => window.open(c.fileUrl, "_blank")}>
                        📎 Fichier
                      </button>
                    )}
                    {canManage && (
                      <button style={{ ...css.btnSm, background:C.redLight, color:C.red, border:"none", fontSize:"0.74rem" }}
                        onClick={() => { if(confirm("Supprimer ce cours ?")) deleteDocument("edt", c.id); }}>
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
