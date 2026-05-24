// src/pages/Alumni.jsx
import { useState } from "react";
import { C, css } from "../design";
import { useOffres, addDocument } from "../hooks/useFirestore";

export default function PageAlumni({ profile }) {
  const role = profile?.role;
  const { data: offres, loading } = useOffres();
  const [tab, setTab]     = useState("offres");
  const [detail, setDetail] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]   = useState({ titre:"", ent:"", type:"Stage", lieu:"Abidjan", secteur:"", desc:"" });
  const [saving, setSaving] = useState(false);

  const canPublish = role==="alumni"||role==="administration"||role==="superadmin";

  const handlePublish = async () => {
    if (!form.titre || !form.ent) return;
    setSaving(true);
    await addDocument("offres", { ...form, alumni: profile.name, tags:[form.secteur] });
    setForm({ titre:"", ent:"", type:"Stage", lieu:"Abidjan", secteur:"", desc:"" });
    setShowForm(false);
    setSaving(false);
  };

  const ALUMNI_DEMO = [
    { nom:"Dr. Kouao Arthur", ini:"KA", bg:C.blueLight, fg:C.blue, promo:"Promo 28", poste:"Directeur Transit", ent:"BOLLORÉ LOGISTICS CI", conseil:"Maîtrisez SYDAM dès votre stage." },
    { nom:"Mme. Traoré Salimata", ini:"TS", bg:C.greenLight, fg:C.green, promo:"Promo 30", poste:"Supply Chain Manager", ent:"NESTLÉ CI", conseil:"Le réseau fait tout. LinkedIn dès la L3." },
    { nom:"M. Yao Pierre", ini:"YP", bg:C.goldLight, fg:C.gold, promo:"Promo 31", poste:"Chef d'Escale", ent:"CMA CGM CI", conseil:"Les certifications IATA ouvrent des portes." },
    { nom:"Mme. Coulibaly Fatoumata", ini:"CF", bg:C.purpleLight, fg:C.purple, promo:"Promo 29", poste:"Resp. Douanes", ent:"VIVO ENERGY CI", conseil:"L'anglais maritime est non-négociable." },
  ];

  if (loading) return <div style={{ padding:40, textAlign:"center", color:C.muted }}>⏳ Chargement...</div>;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
        flexWrap:"wrap", gap:12, marginBottom:20 }}>
        <div>
          <div style={css.pageH}>Espace Alumni</div>
          <div style={css.pageSub}>{offres.length} offres · Réseau ARSTM</div>
        </div>
        {canPublish && (
          <button style={css.btnPrimary} onClick={()=>setShowForm(!showForm)}>
            {showForm?"Annuler":"+ Publier une offre"}
          </button>
        )}
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {[["offres","💼 Offres d'emploi"],["annuaire","🎓 Annuaire"],["conseils","💡 Conseils"]].map(([v,l])=>(
          <button key={v} style={{ ...css.tab(tab===v), borderRadius:10, padding:"8px 16px",
            border:`1px solid ${tab===v?C.blue:C.border}`, fontFamily:"inherit" }}
            onClick={()=>setTab(v)}>{l}</button>
        ))}
      </div>

      {/* OFFRES */}
      {tab==="offres" && (
        <div>
          {showForm && canPublish && (
            <div style={{ ...css.card, marginBottom:18, background:C.goldLight, border:`1px solid ${C.goldBorder}` }}>
              <div style={{ fontWeight:700, color:C.navy, marginBottom:14 }}>💼 Nouvelle offre</div>
              <div style={{ display:"flex", gap:10, marginBottom:12, flexWrap:"wrap" }}>
                <div style={{ flex:2, minWidth:200 }}>
                  <span style={css.label}>Titre du poste</span>
                  <input style={css.input} placeholder="Ex: Stage Opérations Transit"
                    value={form.titre} onChange={e=>setForm({...form,titre:e.target.value})} />
                </div>
                <div style={{ flex:1, minWidth:120 }}>
                  <span style={css.label}>Type</span>
                  <select style={css.input} value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
                    {["Stage","CDI","CDD","Freelance"].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:"flex", gap:10, marginBottom:12, flexWrap:"wrap" }}>
                <div style={{ flex:1, minWidth:160 }}>
                  <span style={css.label}>Entreprise</span>
                  <input style={css.input} placeholder="Nom de l'entreprise"
                    value={form.ent} onChange={e=>setForm({...form,ent:e.target.value})} />
                </div>
                <div style={{ flex:1, minWidth:120 }}>
                  <span style={css.label}>Lieu</span>
                  <input style={css.input} placeholder="Abidjan"
                    value={form.lieu} onChange={e=>setForm({...form,lieu:e.target.value})} />
                </div>
              </div>
              <div style={{ marginBottom:12 }}>
                <span style={css.label}>Description</span>
                <textarea style={{ ...css.input, resize:"none", minHeight:70 }}
                  placeholder="Description du poste..."
                  value={form.desc} onChange={e=>setForm({...form,desc:e.target.value})} />
              </div>
              <button style={{ ...css.btnPrimary, opacity:saving?0.7:1 }}
                onClick={handlePublish} disabled={saving}>
                {saving?"⏳ Publication...":"💼 Publier l'offre"}
              </button>
            </div>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {offres.map(o => (
              <div key={o.id} style={{ ...css.card,
                borderLeft:`3px solid ${o.type==="CDI"?C.green:C.blue}`,
                cursor:"pointer" }} onClick={()=>setDetail(detail===o.id?null:o.id)}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", gap:7, marginBottom:7, flexWrap:"wrap" }}>
                      <span style={css.badge(o.type==="CDI"?C.greenLight:C.blueLight,
                        o.type==="CDI"?C.green:C.blue)}>{o.type}</span>
                      {(o.tags||[]).map(t=><span key={t} style={css.badge(C.goldLight,C.gold)}>{t}</span>)}
                    </div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:"0.98rem",
                      color:C.navy, marginBottom:4 }}>{o.titre}</div>
                    <div style={{ fontSize:"0.81rem", color:C.mid, display:"flex", gap:12, flexWrap:"wrap" }}>
                      <span>🏢 {o.ent}</span>
                      {o.lieu && <span>📍 {o.lieu}</span>}
                      {o.alumni && <span>🎓 Via {o.alumni}</span>}
                    </div>
                  </div>
                  <button style={css.btnPrimary} onClick={e=>e.stopPropagation()}>Postuler →</button>
                </div>
                {detail===o.id && o.desc && (
                  <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.border}`,
                    fontSize:"0.87rem", lineHeight:1.7, color:C.dark }}>{o.desc}</div>
                )}
              </div>
            ))}
            {offres.length===0 && (
              <div style={{ ...css.card, textAlign:"center", padding:40, color:C.muted }}>
                Aucune offre disponible pour le moment.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ANNUAIRE */}
      {tab==="annuaire" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:14 }}>
          {ALUMNI_DEMO.map((a,i) => (
            <div key={i} style={{ ...css.card, textAlign:"center" }}>
              <div style={{ width:52, height:52, borderRadius:"50%", background:a.bg, color:a.fg,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontWeight:700, fontSize:"1rem", margin:"0 auto 12px" }}>{a.ini}</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, color:C.navy }}>{a.nom}</div>
              <div style={{ fontSize:"0.82rem", color:C.mid, marginBottom:3 }}>{a.poste}</div>
              <div style={{ fontSize:"0.82rem", color:a.fg, fontWeight:600, marginBottom:10 }}>{a.ent}</div>
              <div style={{ display:"flex", gap:6, justifyContent:"center", marginBottom:10 }}>
                <span style={css.badge(a.bg,a.fg)}>{a.promo}</span>
              </div>
              <div style={{ background:C.surfaceAlt, borderRadius:8, padding:"8px 10px",
                marginBottom:10, textAlign:"left" }}>
                <div style={{ fontSize:"0.72rem", color:C.muted, marginBottom:2 }}>💡 Conseil</div>
                <div style={{ fontSize:"0.8rem", color:C.dark, fontStyle:"italic" }}>"{a.conseil}"</div>
              </div>
              <button style={{ ...css.btnSecondary, width:"100%", fontSize:"0.82rem" }}>
                ✉️ Contacter
              </button>
            </div>
          ))}
        </div>
      )}

      {/* CONSEILS */}
      {tab==="conseils" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {ALUMNI_DEMO.map((a,i) => (
            <div key={i} style={css.card}>
              <div style={{ display:"flex", gap:12 }}>
                <div style={{ width:38, height:38, borderRadius:"50%", background:a.bg, color:a.fg,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontWeight:700, fontSize:"0.8rem", flexShrink:0 }}>{a.ini}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, color:C.navy, marginBottom:3 }}>{a.nom}</div>
                  <div style={{ fontSize:"0.84rem", color:C.mid, lineHeight:1.65 }}>{a.conseil}</div>
                  <button style={{ ...css.btnSm, marginTop:10 }}>Lire la suite →</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
