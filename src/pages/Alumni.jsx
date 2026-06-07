// src/pages/Alumni.jsx — offres enrichies + candidatures Firestore
import { useState, useCallback, useEffect } from "react";
import { C, css, ROLES, SHADOWS } from "../design";
import { useOffres, addDocument, useCollection, sendNotif } from "../hooks/useFirestore";
import { useAuth } from "../AuthContext";
import { ProfilExterne } from "./Profil";
import { collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot, updateDoc, doc, increment } from "firebase/firestore";
import { db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const getRoleInfo = r => ROLES.find(x=>x.id===r)||{color:C.blue,bg:C.blueLight,icon:"👤",label:r};

const TYPE_COLORS = {
  "Stage":     { bg:C.blueLight,  color:C.blue  },
  "CDI":       { bg:C.greenLight, color:C.green  },
  "CDD":       { bg:"#fef3c7",    color:"#d97706" },
  "Freelance": { bg:"#faf5ff",    color:"#7c3aed" },
};

// ── Formulaire publication d'offre ─────────────────────────────────────────
function FormulaireOffre({ profile, onClose, onDone }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    titre:"", ent:"", type:"Stage", lieu:"Abidjan, Côte d'Ivoire",
    secteur:"", deadline:"", salaire:"", niveauReq:"",
    desc:"", missions:"", profil:"", contact:"",
    cvReq:true, lmReq:false,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSubmit = async () => {
    if (!form.titre.trim() || !form.ent.trim()) { setErr("Le titre et l'entreprise sont obligatoires."); return; }
    setSaving(true);
    await addDocument("offres", {
      ...form,
      alumni:    profile.name,
      auteurUid: user?.uid || profile.uid,
      tags:      [form.secteur, form.type].filter(Boolean),
      candidaturesCount: 0,
    });
    setSaving(false);
    onDone?.();
    onClose?.();
  };

  const lbl = (t) => <span style={css.label}>{t}</span>;

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:3000, background:"rgba(0,0,0,0.55)",
      display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"40px 16px 24px", overflowY:"auto" }}>
      <div onClick={e=>e.stopPropagation()} className="modal-enter"
        style={{ background:"#fff", borderRadius:22, width:"100%", maxWidth:560, boxShadow:SHADOWS["2xl"], padding:"26px 22px 28px" }}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1.05rem", color:C.navy }}>💼 Publier une offre</div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:"50%", border:"none", background:C.surfaceAlt, cursor:"pointer", fontSize:"0.9rem" }}>✕</button>
        </div>

        {err && <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:9, padding:"8px 12px", marginBottom:14, fontSize:"0.8rem", color:"#dc2626" }}>⚠️ {err}</div>}

        {/* Ligne 1 */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:10, marginBottom:12 }}>
          <div><label style={css.label}>Titre du poste *</label>
            <input style={css.input} placeholder="Ex: Stage Opérations Transit" value={form.titre} onChange={e=>set("titre",e.target.value)}/></div>
          <div style={{ minWidth:110 }}><label style={css.label}>Type *</label>
            <select style={css.input} value={form.type} onChange={e=>set("type",e.target.value)}>
              {["Stage","CDI","CDD","Freelance"].map(t=><option key={t}>{t}</option>)}
            </select></div>
        </div>

        {/* Ligne 2 */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
          <div><label style={css.label}>Entreprise *</label>
            <input style={css.input} placeholder="Nom de l'entreprise" value={form.ent} onChange={e=>set("ent",e.target.value)}/></div>
          <div><label style={css.label}>Lieu</label>
            <input style={css.input} placeholder="Abidjan, CI" value={form.lieu} onChange={e=>set("lieu",e.target.value)}/></div>
        </div>

        {/* Ligne 3 */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
          <div><label style={css.label}>Secteur / Filière</label>
            <input style={css.input} placeholder="Ex: Transit, Maritime…" value={form.secteur} onChange={e=>set("secteur",e.target.value)}/></div>
          <div><label style={css.label}>Niveau requis</label>
            <select style={css.input} value={form.niveauReq} onChange={e=>set("niveauReq",e.target.value)}>
              <option value="">Non précisé</option>
              {["Bac","Bac+2","Bac+3 (Licence)","Bac+5 (Master)","Bac+8 (Doctorat)"].map(n=><option key={n}>{n}</option>)}
            </select></div>
        </div>

        {/* Ligne 4 */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
          <div><label style={css.label}>Date limite (optionnel)</label>
            <input style={{...css.input}} type="date" value={form.deadline} onChange={e=>set("deadline",e.target.value)}/></div>
          <div><label style={css.label}>Rémunération</label>
            <input style={css.input} placeholder="Ex: 80 000 FCFA / mois" value={form.salaire} onChange={e=>set("salaire",e.target.value)}/></div>
        </div>

        {/* Description */}
        <div style={{ marginBottom:12 }}>
          <label style={css.label}>Description du poste</label>
          <textarea style={{...css.input,resize:"none",minHeight:70}} placeholder="Présentation du poste et de l'entreprise…" value={form.desc} onChange={e=>set("desc",e.target.value)}/>
        </div>

        {/* Missions */}
        <div style={{ marginBottom:12 }}>
          <label style={css.label}>Missions principales</label>
          <textarea style={{...css.input,resize:"none",minHeight:60}} placeholder="• Mission 1&#10;• Mission 2…" value={form.missions} onChange={e=>set("missions",e.target.value)}/>
        </div>

        {/* Profil recherché */}
        <div style={{ marginBottom:12 }}>
          <label style={css.label}>Profil recherché</label>
          <textarea style={{...css.input,resize:"none",minHeight:60}} placeholder="Compétences, qualités attendues…" value={form.profil} onChange={e=>set("profil",e.target.value)}/>
        </div>

        {/* Contact */}
        <div style={{ marginBottom:14 }}>
          <label style={css.label}>Email ou WhatsApp pour postuler</label>
          <input style={css.input} placeholder="recrutement@entreprise.ci ou +225…" value={form.contact} onChange={e=>set("contact",e.target.value)}/>
        </div>

        {/* Checkboxes docs */}
        <div style={{ display:"flex", gap:16, marginBottom:18, flexWrap:"wrap" }}>
          <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:"0.85rem", color:C.dark }}>
            <input type="checkbox" checked={form.cvReq} onChange={e=>set("cvReq",e.target.checked)} style={{ width:16, height:16 }}/>
            CV requis
          </label>
          <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:"0.85rem", color:C.dark }}>
            <input type="checkbox" checked={form.lmReq} onChange={e=>set("lmReq",e.target.checked)} style={{ width:16, height:16 }}/>
            Lettre de motivation requise
          </label>
        </div>

        <button onClick={handleSubmit} disabled={saving}
          style={{ ...css.btnPrimary, width:"100%", padding:"13px", borderRadius:12, opacity:saving?0.7:1 }}>
          {saving ? "Publication…" : "💼 Publier l'offre →"}
        </button>
      </div>
    </div>
  );
}

// ── Modal candidature ───────────────────────────────────────────────────────
function ModalCandidature({ offre, profile, onClose }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    nom:     profile?.name    || "",
    email:   profile?.email   || "",
    tel:     profile?.tel     || "",
    message: "",
    filiere: profile?.filiere || "",
    promo:   profile?.promo   || "",
  });
  const [cvFile,    setCvFile]    = useState(null);
  const [lmFile,    setLmFile]    = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [err,       setErr]       = useState("");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const pickFile = (setter) => (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setErr("Fichier trop grand (max 5 Mo)."); return; }
    setter(f);
    setErr("");
  };

  const handleSubmit = async () => {
    if (!form.nom.trim() || !form.email.trim()) { setErr("Nom et email obligatoires."); return; }
    if (offre.cvReq && !cvFile) { setErr("Le CV est requis pour cette offre."); return; }
    if (offre.lmReq && !lmFile) { setErr("La lettre de motivation est requise pour cette offre."); return; }
    setSaving(true);
    try {
      let cvUrl = null, lmUrl = null;
      if (cvFile || lmFile) setUploading(true);
      if (cvFile) {
        const r = ref(storage, `candidatures/${offre.id}/${user?.uid||"anon"}/cv_${Date.now()}_${cvFile.name}`);
        await uploadBytes(r, cvFile);
        cvUrl = await getDownloadURL(r);
      }
      if (lmFile) {
        const r = ref(storage, `candidatures/${offre.id}/${user?.uid||"anon"}/lm_${Date.now()}_${lmFile.name}`);
        await uploadBytes(r, lmFile);
        lmUrl = await getDownloadURL(r);
      }
      setUploading(false);

      await addDoc(collection(db, "candidatures"), {
        offreId:     offre.id,
        offreTitre:  offre.titre,
        entreprise:  offre.ent,
        auteurOffre: offre.auteurUid || null,
        candidatUid: user?.uid || null,
        ...form,
        cvUrl,
        lmUrl,
        createdAt: serverTimestamp(),
        statut:    "nouveau",
      });

      // incrémenter compteur (best-effort)
      try { await updateDoc(doc(db,"offres",offre.id), { candidaturesCount: increment(1) }); } catch(_) {}

      // notifier le publieur de l'offre
      if (offre.auteurUid) {
        await sendNotif(offre.auteurUid, {
          type:        "candidature",
          icon:        "📝",
          message:     `${form.nom} a postulé à « ${offre.titre} »`,
          offreId:     offre.id,
          candidatNom: form.nom,
        });
      }

      setSuccess(true);
    } catch(e) {
      setUploading(false);
      setErr("Erreur lors de l'envoi. Réessayez.");
    }
    setSaving(false);
  };

  const FileInput = ({ label, file, setter, required }) => (
    <div style={{ marginBottom:10 }}>
      <label style={css.label}>
        {label} {required && <span style={{ color:C.red }}>*</span>}
        {!required && <span style={{ color:C.muted, fontWeight:400 }}> (optionnel)</span>}
      </label>
      <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer",
        padding:"10px 12px", background:file?"#f0fdf4":C.surfaceAlt,
        borderRadius:10, border:`1px solid ${file?"#bbf7d0":C.border}`, transition:"all 0.15s" }}>
        <span style={{ fontSize:"1.1rem" }}>{file ? "✅" : "📎"}</span>
        <span style={{ fontSize:"0.83rem", color:file?"#059669":C.muted, flex:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
          {file ? file.name : "PDF, DOC, DOCX — max 5 Mo"}
        </span>
        {file && <button type="button" onClick={e=>{e.preventDefault();setter(null);}} style={{ border:"none",background:"none",cursor:"pointer",color:C.muted,fontSize:"0.8rem",padding:0 }}>✕</button>}
        <input type="file" accept=".pdf,.doc,.docx,.odt" style={{ display:"none" }} onChange={pickFile(setter)}/>
      </label>
    </div>
  );

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:3000, background:"rgba(0,0,0,0.55)",
      display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"40px 16px 24px", overflowY:"auto" }}>
      <div onClick={e=>e.stopPropagation()} className="modal-enter"
        style={{ background:"#fff", borderRadius:22, width:"100%", maxWidth:480, boxShadow:SHADOWS["2xl"], padding:"26px 22px 28px" }}>

        {success ? (
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <div style={{ fontSize:"3rem", marginBottom:14 }}>🎉</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1.1rem", color:C.navy, marginBottom:8 }}>Candidature envoyée !</div>
            <p style={{ fontSize:"0.85rem", color:C.muted, lineHeight:1.7, marginBottom:20 }}>
              Votre candidature pour <strong>{offre.titre}</strong> chez <strong>{offre.ent}</strong> a bien été transmise.<br/>
              {offre.contact && <>Contact direct : <strong>{offre.contact}</strong></>}
            </p>
            <button onClick={onClose} style={{ ...css.btnPrimary, borderRadius:12, padding:"12px 28px" }}>Fermer</button>
          </div>
        ) : (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1rem", color:C.navy }}>📝 Postuler</div>
                <div style={{ fontSize:"0.8rem", color:C.muted, marginTop:2 }}>{offre.titre} · {offre.ent}</div>
              </div>
              <button onClick={onClose} style={{ width:30, height:30, borderRadius:"50%", border:"none", background:C.surfaceAlt, cursor:"pointer", fontSize:"0.9rem" }}>✕</button>
            </div>

            {err && <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:9, padding:"8px 12px", marginBottom:12, fontSize:"0.8rem", color:"#dc2626" }}>⚠️ {err}</div>}
            {uploading && <div style={{ background:C.blueLight, borderRadius:9, padding:"8px 12px", marginBottom:12, fontSize:"0.8rem", color:C.blue }}>⏳ Envoi des fichiers…</div>}

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
              <div><label style={css.label}>Nom complet *</label>
                <input style={css.input} value={form.nom} onChange={e=>set("nom",e.target.value)} placeholder="Votre nom"/></div>
              <div><label style={css.label}>Email *</label>
                <input style={css.input} type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="votre@email.ci"/></div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
              <div><label style={css.label}>Téléphone / WhatsApp</label>
                <input style={css.input} value={form.tel} onChange={e=>set("tel",e.target.value)} placeholder="+225…"/></div>
              <div><label style={css.label}>Filière</label>
                <input style={css.input} value={form.filiere} onChange={e=>set("filiere",e.target.value)} placeholder="Ex: LPTML Transit"/></div>
            </div>
            <div style={{ marginBottom:10 }}>
              <label style={css.label}>Promotion</label>
              <input style={css.input} value={form.promo} onChange={e=>set("promo",e.target.value)} placeholder="Ex: Promo 32"/>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={css.label}>Lettre de motivation / Message</label>
              <textarea style={{...css.input,resize:"none",minHeight:80}} placeholder="Présentez-vous et expliquez votre motivation…"
                value={form.message} onChange={e=>set("message",e.target.value)}/>
            </div>

            {/* Uploads documents */}
            <div style={{ background:C.surfaceAlt, borderRadius:12, padding:"12px 14px", marginBottom:16 }}>
              <div style={{ fontSize:"0.78rem", fontWeight:700, color:C.navy, marginBottom:10, textTransform:"uppercase", letterSpacing:"0.04em" }}>
                📎 Documents
              </div>
              <FileInput label="CV" file={cvFile} setter={setCvFile} required={offre.cvReq}/>
              <FileInput label="Lettre de motivation" file={lmFile} setter={setLmFile} required={offre.lmReq}/>
            </div>

            <button onClick={handleSubmit} disabled={saving||uploading}
              style={{ ...css.btnPrimary, width:"100%", padding:"13px", borderRadius:12, opacity:(saving||uploading)?0.7:1 }}>
              {saving ? "Envoi en cours…" : "Envoyer ma candidature →"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Modal candidatures reçues (pour le publieur) ────────────────────────────
function ModalCandidaturesRecues({ offre, onClose }) {
  const [candidatures, setCandidatures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "candidatures"), where("offreId","==",offre.id));
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      docs.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
      setCandidatures(docs);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [offre.id]);

  const fmt = ts => ts?.toDate ? ts.toDate().toLocaleDateString("fr-FR",{day:"2-digit",month:"short"}) : "";

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:4000, background:"rgba(0,0,0,0.6)",
      display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"40px 16px 24px", overflowY:"auto" }}>
      <div onClick={e=>e.stopPropagation()} className="modal-enter"
        style={{ background:"#fff", borderRadius:22, width:"100%", maxWidth:600, boxShadow:SHADOWS["2xl"],
          padding:"26px 22px 28px", maxHeight:"85vh", overflowY:"auto" }}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1rem", color:C.navy }}>📋 Candidatures reçues</div>
            <div style={{ fontSize:"0.8rem", color:C.muted }}>{offre.titre} · {offre.ent} · {candidatures.length} candidat{candidatures.length>1?"s":""}</div>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:"50%", border:"none", background:C.surfaceAlt, cursor:"pointer", fontSize:"0.9rem" }}>✕</button>
        </div>

        {loading ? (
          <div style={{ textAlign:"center", padding:40, color:C.muted }}>Chargement…</div>
        ) : candidatures.length === 0 ? (
          <div style={{ textAlign:"center", padding:"40px 20px", color:C.muted }}>
            <div style={{ fontSize:"2.5rem", marginBottom:8 }}>📭</div>
            <div style={{ fontWeight:600 }}>Aucune candidature pour l'instant.</div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {candidatures.map(c => (
              <div key={c.id} style={{ ...css.card, padding:"14px 16px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                  <div>
                    <div style={{ fontWeight:700, color:C.navy, fontSize:"0.92rem" }}>{c.nom}</div>
                    <div style={{ fontSize:"0.76rem", color:C.muted }}>
                      {c.filiere}{c.promo ? ` · ${c.promo}` : ""}
                    </div>
                  </div>
                  <span style={{ ...css.badge(C.greenLight, C.green), fontSize:"0.7rem", flexShrink:0 }}>
                    {fmt(c.createdAt)}
                  </span>
                </div>
                <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginBottom:c.message?8:0 }}>
                  {c.email && <a href={`mailto:${c.email}`} style={{ ...css.badge(C.blueLight, C.blue), textDecoration:"none" }}>✉️ {c.email}</a>}
                  {c.tel   && <a href={`tel:${c.tel}`}      style={{ ...css.badge(C.surfaceAlt, C.mid), textDecoration:"none" }}>📞 {c.tel}</a>}
                  {c.cvUrl && <a href={c.cvUrl} target="_blank" rel="noreferrer" style={{ ...css.badge(C.blueLight, C.blue), textDecoration:"none" }}>📎 CV</a>}
                  {c.lmUrl && <a href={c.lmUrl} target="_blank" rel="noreferrer" style={{ ...css.badge(C.blueLight, C.blue), textDecoration:"none" }}>✍️ LM</a>}
                </div>
                {c.message && (
                  <div style={{ fontSize:"0.82rem", color:C.dark, background:C.surfaceAlt, borderRadius:8, padding:"8px 10px", lineHeight:1.65 }}>
                    {c.message}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Carte d'offre ───────────────────────────────────────────────────────────
function CarteOffre({ offre, allUsers, onPostule, onViewAlumni, currentUserUid }) {
  const tc = TYPE_COLORS[offre.type] || TYPE_COLORS["Stage"];
  const [open, setOpen] = useState(false);
  const [showCandidatures, setShowCandidatures] = useState(false);
  const isExpired  = offre.deadline && new Date(offre.deadline) < new Date();
  const isMyOffre  = offre.auteurUid && offre.auteurUid === currentUserUid;

  return (
    <>
      {showCandidatures && <ModalCandidaturesRecues offre={offre} onClose={() => setShowCandidatures(false)}/>}
    <div style={{ ...css.card, borderLeft:`4px solid ${tc.color}`, opacity:isExpired?0.6:1 }}>
      <div style={{ display:"flex", justifyContent:"space-between", gap:10, flexWrap:"wrap", marginBottom:8 }}>
        <div style={{ flex:1, minWidth:0 }}>
          {/* Badges */}
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:7 }}>
            <span style={{ ...css.badge(tc.bg, tc.color), fontWeight:700 }}>{offre.type}</span>
            {offre.secteur && <span style={{ ...css.badge(C.goldLight, C.gold) }}>{offre.secteur}</span>}
            {offre.niveauReq && <span style={{ ...css.badge(C.surfaceAlt, C.mid) }}>🎓 {offre.niveauReq}</span>}
            {isExpired && <span style={{ ...css.badge(C.redLight, C.red) }}>Expiré</span>}
            {isMyOffre && <span style={{ ...css.badge("#faf5ff","#7c3aed") }}>Ma publication</span>}
          </div>
          {/* Titre */}
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1rem", color:C.navy, marginBottom:5 }}>{offre.titre}</div>
          {/* Meta */}
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", fontSize:"0.8rem", color:C.mid }}>
            <span>🏢 {offre.ent}</span>
            {offre.lieu    && <span>📍 {offre.lieu}</span>}
            {offre.salaire && <span>💰 {offre.salaire}</span>}
            {offre.deadline&& <span>⏳ Avant le {new Date(offre.deadline).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"})}</span>}
          </div>
          {/* Via alumni */}
          {offre.alumni && (
            <button onClick={()=>{const u=allUsers.find(x=>x.name===offre.alumni);if(u)onViewAlumni(u);}}
              style={{ background:"none",border:"none",cursor:"pointer",color:C.blue,fontSize:"0.78rem",padding:"4px 0",fontFamily:"inherit" }}>
              🎓 Via {offre.alumni} →
            </button>
          )}
        </div>
        {/* Boutons */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
          {isMyOffre ? (
            <button onClick={() => setShowCandidatures(true)}
              style={{ ...css.btnPrimary, borderRadius:20, whiteSpace:"nowrap", background:"#7c3aed" }}>
              📋 {offre.candidaturesCount||0} candidature{(offre.candidaturesCount||0)!==1?"s":""}
            </button>
          ) : (
            <button onClick={()=>!isExpired&&onPostule(offre)} disabled={isExpired}
              style={{ ...css.btnPrimary, borderRadius:20, whiteSpace:"nowrap", opacity:isExpired?0.5:1 }}>
              Postuler →
            </button>
          )}
          {!isMyOffre && !!offre.candidaturesCount && (
            <span style={{ fontSize:"0.72rem", color:C.muted }}>{offre.candidaturesCount} candidat{offre.candidaturesCount>1?"s":""}</span>
          )}
        </div>
      </div>

      {/* Détails expandable */}
      <button onClick={()=>setOpen(!open)}
        style={{ background:"none",border:"none",cursor:"pointer",color:C.blue,fontSize:"0.8rem",padding:0,fontFamily:"inherit" }}>
        {open?"▲ Réduire":"▼ Voir les détails"}
      </button>
      {open && (
        <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.border}`, display:"flex", flexDirection:"column", gap:10 }}>
          {offre.desc     && <div><div style={{ fontSize:"0.72rem",fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:4 }}>Description</div><p style={{ fontSize:"0.86rem",lineHeight:1.7,color:C.dark,margin:0 }}>{offre.desc}</p></div>}
          {offre.missions && <div><div style={{ fontSize:"0.72rem",fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:4 }}>Missions</div><p style={{ fontSize:"0.86rem",lineHeight:1.7,color:C.dark,margin:0,whiteSpace:"pre-line" }}>{offre.missions}</p></div>}
          {offre.profil   && <div><div style={{ fontSize:"0.72rem",fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:4 }}>Profil recherché</div><p style={{ fontSize:"0.86rem",lineHeight:1.7,color:C.dark,margin:0,whiteSpace:"pre-line" }}>{offre.profil}</p></div>}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {offre.cvReq  && <span style={{ ...css.badge(C.blueLight,C.blue) }}>📎 CV requis</span>}
            {offre.lmReq  && <span style={{ ...css.badge(C.blueLight,C.blue) }}>✍️ Lettre de motivation</span>}
            {offre.contact&& <span style={{ ...css.badge(C.greenLight,C.green) }}>📧 {offre.contact}</span>}
          </div>
        </div>
      )}
    </div>
    </>
  );
}

// ── Page principale ─────────────────────────────────────────────────────────
export default function PageAlumni({ profile, setPage }) {
  const role = profile?.role;
  const { data: offres, loading } = useOffres();
  const { data: allUsers }        = useCollection("users", []);

  const [tab,        setTab]        = useState("offres");
  const [showForm,   setShowForm]   = useState(false);
  const [viewUser,   setViewUser]   = useState(null);
  const [postuleOn,  setPostuleOn]  = useState(null);
  const [filterType, setFilterType] = useState("Tous");
  const [searchQ,    setSearchQ]    = useState("");

  const canPublish = ["alumni","administration","superadmin"].includes(role);
  const isAdmin    = ["administration","superadmin"].includes(role);

  const alumni = allUsers.filter(u=>u.role==="alumni"&&u.status==="approved");

  const ALUMNI_DEMO = [
    {nom:"Dr. Kouao Arthur",    avatar:"KA",role:"alumni",bg:C.blueLight,  fg:C.blue,   promo:"Promo 28",poste:"Directeur Transit",    ent:"BOLLORÉ LOGISTICS CI",conseil:"Maîtrisez SYDAM dès votre stage — c'est la clé de tout.",whatsapp:""},
    {nom:"Mme. Traoré Salimata",avatar:"TS",role:"alumni",bg:C.greenLight, fg:C.green,  promo:"Promo 30",poste:"Supply Chain Manager",  ent:"NESTLÉ CI",           conseil:"Le réseau fait tout. LinkedIn dès la L3, sans attendre.",whatsapp:""},
    {nom:"M. Yao Pierre",       avatar:"YP",role:"alumni",bg:C.goldLight,  fg:C.gold,   promo:"Promo 31",poste:"Chef d'Escale",         ent:"CMA CGM CI",          conseil:"Les certifications IATA ouvrent des portes insoupçonnées.",whatsapp:""},
    {nom:"Mme. Coulibaly F.",   avatar:"CF",role:"alumni",bg:"#faf5ff",    fg:"#7c3aed",promo:"Promo 29",poste:"Responsable Douanes",   ent:"VIVO ENERGY CI",      conseil:"L'anglais maritime est non-négociable dans ce secteur.",whatsapp:""},
  ];
  const displayAlumni = alumni.length > 0 ? alumni : ALUMNI_DEMO;

  const norm = s => (s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
  const nq   = norm(searchQ);
  const filteredOffres = offres
    .filter(o => filterType==="Tous" || o.type===filterType)
    .filter(o => !nq || norm(o.titre).includes(nq) || norm(o.ent).includes(nq) || norm(o.secteur).includes(nq));

  if (loading) return <div style={{padding:40,textAlign:"center",color:C.muted}}>Chargement…</div>;

  return (
    <div>
      {/* Modals */}
      {viewUser  && <ProfilExterne user={viewUser} onClose={()=>setViewUser(null)} onMessage={()=>setViewUser(null)}/>}
      {postuleOn && <ModalCandidature offre={postuleOn} profile={profile} onClose={()=>setPostuleOn(null)}/>}
      {showForm  && <FormulaireOffre profile={profile} onClose={()=>setShowForm(false)} onDone={()=>{}}/>}

      {/* En-tête */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:20}}>
        <div>
          <div style={css.pageH}>Espace Alumni</div>
          <div style={css.pageSub}>{offres.length} offre{offres.length>1?"s":""} · {displayAlumni.length} alumni · Réseau ARSTM</div>
        </div>
        {canPublish && (
          <button style={{...css.btnPrimary,borderRadius:20}} onClick={()=>setShowForm(true)}>
            + Publier une offre
          </button>
        )}
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
        {[["offres","💼 Offres"],["annuaire","🎓 Annuaire"],["conseils","💡 Conseils"]].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)} style={{
            padding:"7px 18px",borderRadius:20,
            border:`1px solid ${tab===v?C.blue:C.border}`,
            background:tab===v?C.blue:"#fff",color:tab===v?"#fff":C.mid,
            cursor:"pointer",fontFamily:"inherit",fontWeight:600,fontSize:"0.82rem",transition:"all 0.15s",
          }}>{l}</button>
        ))}
      </div>

      {/* ── OFFRES ── */}
      {tab==="offres" && (
        <div>
          {/* Recherche + filtres */}
          <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
            <input style={{...css.input,flex:1,minWidth:180}} placeholder="🔍 Rechercher un poste, entreprise…"
              value={searchQ} onChange={e=>setSearchQ(e.target.value)}/>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["Tous","Stage","CDI","CDD","Freelance"].map(t=>(
                <button key={t} onClick={()=>setFilterType(t)} style={{
                  padding:"6px 12px",borderRadius:16,fontSize:"0.78rem",fontWeight:600,
                  border:`1px solid ${filterType===t?C.blue:C.border}`,
                  background:filterType===t?C.blueLight:"#fff",
                  color:filterType===t?C.blue:C.mid,cursor:"pointer",fontFamily:"inherit",
                }}>{t}</button>
              ))}
            </div>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {filteredOffres.length===0 ? (
              <div style={{...css.card,textAlign:"center",padding:48,color:C.muted}}>
                <div style={{fontSize:"2.5rem",marginBottom:12}}>💼</div>
                <div style={{fontWeight:600,color:C.navy,marginBottom:6}}>Aucune offre trouvée</div>
                <div style={{fontSize:"0.84rem"}}>{canPublish?"Soyez le premier à publier !":"Revenez bientôt."}</div>
              </div>
            ) : filteredOffres.map(o=>(
              <CarteOffre
                key={o.id}
                offre={o}
                allUsers={allUsers}
                onPostule={setPostuleOn}
                onViewAlumni={setViewUser}
                currentUserUid={profile?.uid}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── ANNUAIRE ── */}
      {tab==="annuaire" && (
        <div>
          <input style={{...css.input,marginBottom:16}} placeholder="🔍 Rechercher un alumni…" value={searchQ} onChange={e=>setSearchQ(e.target.value)}/>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:14}}>
            {displayAlumni
              .filter(a=>!nq||norm(a.nom||a.name).includes(nq)||norm(a.poste||a.service).includes(nq)||norm(a.ent||a.employeur).includes(nq))
              .map((a,i)=>{
              const r = getRoleInfo(a.role||"alumni");
              const initials = a.avatar||a.name?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()||"?";
              return (
                <div key={a.uid||i} style={{...css.card,textAlign:"center",cursor:"pointer",transition:"all 0.18s"}}
                  onClick={()=>setViewUser(a)}
                  onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(37,99,235,0.12)";}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="";}}>
                  <div style={{width:56,height:56,borderRadius:"50%",background:a.photoURL?"transparent":(a.bg||r.bg),color:a.fg||r.color,
                    display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:"1rem",margin:"0 auto 12px",
                    overflow:"hidden",border:`3px solid ${(a.fg||r.color)}20`,boxShadow:"0 2px 8px rgba(0,0,0,0.1)"}}>
                    {a.photoURL?<img src={a.photoURL} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:initials}
                  </div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:C.navy,fontSize:"0.92rem",marginBottom:2}}>{a.nom||a.name}</div>
                  <div style={{fontSize:"0.78rem",color:C.mid,marginBottom:2}}>{a.poste||a.service||""}</div>
                  <div style={{fontSize:"0.78rem",color:a.fg||r.color,fontWeight:600,marginBottom:8}}>{a.ent||a.employeur||""}</div>
                  {(a.promo||a.filiere)&&<span style={{...css.badge(a.bg||r.bg,a.fg||r.color),fontSize:"0.68rem"}}>{a.promo||a.filiere}</span>}
                  {a.whatsapp&&(
                    <a href={`https://wa.me/${a.whatsapp.replace(/\D/g,"")}`} target="_blank" rel="noreferrer"
                      onClick={e=>e.stopPropagation()}
                      style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginTop:10,padding:"8px",borderRadius:10,background:"#f0fdf4",color:"#059669",border:"1px solid #bbf7d0",textDecoration:"none",fontSize:"0.8rem",fontWeight:600}}>
                      📱 WhatsApp
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CONSEILS ── */}
      {tab==="conseils" && (
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {displayAlumni.map((a,i)=>{
            const r = getRoleInfo(a.role||"alumni");
            const initials = a.avatar||a.name?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()||"?";
            return (
              <div key={a.uid||i} style={css.card}>
                <div style={{display:"flex",gap:12}}>
                  <div onClick={()=>setViewUser(a)} style={{width:42,height:42,borderRadius:"50%",background:a.photoURL?"transparent":(a.bg||r.bg),color:a.fg||r.color,
                    display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:"0.85rem",flexShrink:0,cursor:"pointer",overflow:"hidden"}}>
                    {a.photoURL?<img src={a.photoURL} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:initials}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                      <div>
                        <span onClick={()=>setViewUser(a)} style={{fontWeight:700,color:C.navy,cursor:"pointer",fontSize:"0.92rem"}}>{a.nom||a.name}</span>
                        <div style={{fontSize:"0.75rem",color:C.muted,marginTop:1}}>{a.poste||""}{a.ent?" · "+a.ent:""}</div>
                      </div>
                      {(a.promo||a.filiere)&&<span style={{...css.badge(a.bg||r.bg,a.fg||r.color),fontSize:"0.68rem",flexShrink:0}}>{a.promo||a.filiere}</span>}
                    </div>
                    <div style={{background:C.surfaceAlt,borderRadius:10,padding:"10px 12px",marginTop:6}}>
                      <div style={{fontSize:"0.72rem",color:C.muted,marginBottom:3,fontWeight:600}}>💡 Conseil karrière</div>
                      <div style={{fontSize:"0.85rem",color:C.dark,lineHeight:1.65,fontStyle:"italic"}}>"{a.conseil||"Donnez le meilleur de vous-même chaque jour."}"</div>
                    </div>
                    <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
                      <button onClick={()=>setViewUser(a)} style={{...css.btnSm,borderRadius:16}}>Voir profil →</button>
                      {a.whatsapp&&(
                        <a href={`https://wa.me/${a.whatsapp.replace(/\D/g,"")}`} target="_blank" rel="noreferrer"
                          style={{...css.btnSm,borderRadius:16,background:"#f0fdf4",color:"#059669",border:"1px solid #bbf7d0",textDecoration:"none"}}>
                          📱 WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
