// src/pages/Alumni.jsx
import { useState, useCallback } from "react";
import { C, css, ROLES } from "../design";
import { useOffres, addDocument, useCollection } from "../hooks/useFirestore";
import { ProfilExterne } from "./Profil";

const getRoleInfo = r => ROLES.find(x=>x.id===r)||{color:C.blue,bg:C.blueLight,icon:"👤"};

export default function PageAlumni({ profile, setPage }) {
  const role = profile?.role;
  const { data: offres, loading } = useOffres();
  const { data: allUsers } = useCollection("users", []);
  const [tab, setTab]       = useState("offres");
  const [detail, setDetail] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]     = useState({titre:"",ent:"",type:"Stage",lieu:"Abidjan",secteur:"",desc:""});
  const [saving, setSaving] = useState(false);
  const [viewUser, setViewUser] = useState(null);
  const [filterType, setFilterType] = useState("Tous");

  const canPublish = ["alumni","administration","superadmin"].includes(role);

  const alumni = allUsers.filter(u => u.role==="alumni" && u.status==="approved");

  const handlePublish = async () => {
    if (!form.titre || !form.ent) return;
    setSaving(true);
    await addDocument("offres", {
      ...form,
      alumni:    profile.name,
      auteurUid: profile.uid,
      tags:      [form.secteur].filter(Boolean),
    });
    setForm({titre:"",ent:"",type:"Stage",lieu:"Abidjan",secteur:"",desc:""});
    setShowForm(false); setSaving(false);
  };

  const openProfil = useCallback((u) => setViewUser(u), []);

  const ALUMNI_DEMO = [
    {nom:"Dr. Kouao Arthur",   avatar:"KA",role:"alumni",bg:C.blueLight, fg:C.blue,  promo:"Promo 28",poste:"Directeur Transit",     ent:"BOLLORÉ LOGISTICS CI", conseil:"Maîtrisez SYDAM dès votre stage — c'est la clé de tout.",tel:"",whatsapp:""},
    {nom:"Mme. Traoré Salimata",avatar:"TS",role:"alumni",bg:C.greenLight,fg:C.green, promo:"Promo 30",poste:"Supply Chain Manager",  ent:"NESTLÉ CI",            conseil:"Le réseau fait tout. LinkedIn dès la L3, sans attendre.",tel:"",whatsapp:""},
    {nom:"M. Yao Pierre",      avatar:"YP",role:"alumni",bg:C.goldLight,  fg:C.gold,  promo:"Promo 31",poste:"Chef d'Escale",         ent:"CMA CGM CI",           conseil:"Les certifications IATA ouvrent des portes insoupçonnées.",tel:"",whatsapp:""},
    {nom:"Mme. Coulibaly F.",  avatar:"CF",role:"alumni",bg:"#faf5ff",    fg:"#7c3aed",promo:"Promo 29",poste:"Responsable Douanes",  ent:"VIVO ENERGY CI",       conseil:"L'anglais maritime est non-négociable dans ce secteur.",tel:"",whatsapp:""},
  ];

  const displayAlumni = alumni.length > 0 ? alumni : ALUMNI_DEMO;

  const filteredOffres = filterType==="Tous" ? offres : offres.filter(o=>o.type===filterType);

  if (loading) return <div style={{padding:40,textAlign:"center",color:C.muted}}>Chargement...</div>;

  return (
    <div>
      {viewUser && (
        <ProfilExterne
          user={viewUser}
          onClose={()=>setViewUser(null)}
          onMessage={(u)=>{ setViewUser(null); /* ouvre messages */ }}
        />
      )}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:20}}>
        <div>
          <div style={css.pageH}>Espace Alumni</div>
          <div style={css.pageSub}>{offres.length} offres · {displayAlumni.length} alumni · Réseau ARSTM</div>
        </div>
        {canPublish && (
          <button style={{...css.btnPrimary,borderRadius:20}} onClick={()=>setShowForm(!showForm)}>
            {showForm?"Annuler":"+ Publier une offre"}
          </button>
        )}
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
        {[["offres","💼 Offres"],["annuaire","🎓 Annuaire"],["conseils","💡 Conseils"]].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)} style={{
            padding:"7px 18px",borderRadius:20,
            border:`1px solid ${tab===v?C.blue:C.border}`,
            background:tab===v?C.blue:"#fff",
            color:tab===v?"#fff":C.mid,
            cursor:"pointer",fontFamily:"inherit",fontWeight:600,fontSize:"0.82rem",
            transition:"all 0.15s",
          }}>{l}</button>
        ))}
      </div>

      {/* ── OFFRES ── */}
      {tab==="offres" && (
        <div>
          {/* Formulaire publication */}
          {showForm && canPublish && (
            <div style={{...css.card,marginBottom:18,background:C.goldLight,border:`1px solid ${C.goldBorder}`}}>
              <div style={{fontWeight:700,color:C.navy,marginBottom:14}}>💼 Nouvelle offre</div>
              <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap"}}>
                <div style={{flex:2,minWidth:200}}>
                  <span style={css.label}>Titre du poste</span>
                  <input style={css.input} placeholder="Ex: Stage Opérations Transit" value={form.titre} onChange={e=>setForm({...form,titre:e.target.value})}/>
                </div>
                <div style={{flex:1,minWidth:120}}>
                  <span style={css.label}>Type</span>
                  <select style={css.input} value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
                    {["Stage","CDI","CDD","Freelance"].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:160}}>
                  <span style={css.label}>Entreprise</span>
                  <input style={css.input} placeholder="Nom de l'entreprise" value={form.ent} onChange={e=>setForm({...form,ent:e.target.value})}/>
                </div>
                <div style={{flex:1,minWidth:120}}>
                  <span style={css.label}>Lieu</span>
                  <input style={css.input} placeholder="Abidjan" value={form.lieu} onChange={e=>setForm({...form,lieu:e.target.value})}/>
                </div>
              </div>
              <div style={{marginBottom:12}}>
                <span style={css.label}>Description</span>
                <textarea style={{...css.input,resize:"none",minHeight:70}} placeholder="Description du poste..." value={form.desc} onChange={e=>setForm({...form,desc:e.target.value})}/>
              </div>
              <button style={{...css.btnPrimary,opacity:saving?0.7:1,borderRadius:20}} onClick={handlePublish} disabled={saving}>
                {saving?"Publication...":"💼 Publier l'offre"}
              </button>
            </div>
          )}

          {/* Filtres type */}
          <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
            {["Tous","Stage","CDI","CDD","Freelance"].map(t=>(
              <button key={t} onClick={()=>setFilterType(t)} style={{
                padding:"5px 12px",borderRadius:16,fontSize:"0.78rem",fontWeight:600,
                border:`1px solid ${filterType===t?C.blue:C.border}`,
                background:filterType===t?C.blueLight:"#fff",
                color:filterType===t?C.blue:C.mid,
                cursor:"pointer",fontFamily:"inherit",
              }}>{t}</button>
            ))}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {filteredOffres.map(o=>(
              <div key={o.id} style={{...css.card,borderLeft:`3px solid ${o.type==="CDI"?C.green:C.blue}`,cursor:"pointer"}}
                onClick={()=>setDetail(detail===o.id?null:o.id)}>
                <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",gap:6,marginBottom:7,flexWrap:"wrap"}}>
                      <span style={css.badge(o.type==="CDI"?C.greenLight:C.blueLight,o.type==="CDI"?C.green:C.blue)}>{o.type}</span>
                      {(o.tags||[]).map(t=><span key={t} style={css.badge(C.goldLight,C.gold)}>{t}</span>)}
                    </div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:"0.97rem",color:C.navy,marginBottom:4}}>{o.titre}</div>
                    <div style={{fontSize:"0.8rem",color:C.mid,display:"flex",gap:12,flexWrap:"wrap"}}>
                      <span>🏢 {o.ent}</span>
                      {o.lieu&&<span>📍 {o.lieu}</span>}
                      {o.alumni&&(
                        <span style={{cursor:"pointer",color:C.blue}}
                          onClick={e=>{e.stopPropagation();
                            const u=allUsers.find(x=>x.name===o.alumni);
                            if(u) openProfil(u);
                          }}>
                          🎓 Via {o.alumni}
                        </span>
                      )}
                    </div>
                  </div>
                  <button style={{...css.btnPrimary,borderRadius:20,alignSelf:"flex-start"}} onClick={e=>e.stopPropagation()}>
                    Postuler →
                  </button>
                </div>
                {detail===o.id && o.desc && (
                  <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${C.border}`,fontSize:"0.87rem",lineHeight:1.7,color:C.dark}}>{o.desc}</div>
                )}
              </div>
            ))}
            {filteredOffres.length===0&&(
              <div style={{...css.card,textAlign:"center",padding:40,color:C.muted}}>
                <div style={{fontSize:"2rem",marginBottom:10}}>💼</div>
                <div style={{fontWeight:600,color:C.navy,marginBottom:4}}>Aucune offre disponible</div>
                <div style={{fontSize:"0.83rem"}}>Revenez bientôt ou publiez une offre.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ANNUAIRE ── */}
      {tab==="annuaire" && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:14}}>
          {displayAlumni.map((a,i)=>{
            const r = getRoleInfo(a.role||"alumni");
            const initials = a.avatar || a.name?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() || "?";
            return (
              <div key={a.uid||i} style={{...css.card,textAlign:"center",cursor:"pointer",transition:"box-shadow 0.15s"}}
                onClick={()=>openProfil(a)}>
                {/* Avatar */}
                <div style={{
                  width:56,height:56,borderRadius:"50%",
                  background:a.photoURL?"transparent":(a.bg||r.bg),
                  color:a.fg||r.color,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontWeight:700,fontSize:"1rem",margin:"0 auto 12px",
                  overflow:"hidden",border:`3px solid ${(a.fg||r.color)}20`,
                  boxShadow:"0 2px 8px rgba(0,0,0,0.1)",
                }}>
                  {a.photoURL
                    ?<img src={a.photoURL} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    :initials}
                </div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:C.navy,fontSize:"0.92rem",marginBottom:2}}>{a.nom||a.name}</div>
                <div style={{fontSize:"0.78rem",color:C.mid,marginBottom:2}}>{a.poste||a.service||""}</div>
                <div style={{fontSize:"0.78rem",color:a.fg||r.color,fontWeight:600,marginBottom:8}}>{a.ent||a.employeur||""}</div>
                <div style={{display:"flex",gap:5,justifyContent:"center",marginBottom:10,flexWrap:"wrap"}}>
                  {(a.promo||a.filiere)&&<span style={{...css.badge(a.bg||r.bg,a.fg||r.color),fontSize:"0.68rem"}}>{a.promo||a.filiere}</span>}
                </div>
                {a.conseil&&(
                  <div style={{background:C.surfaceAlt,borderRadius:10,padding:"8px 10px",marginBottom:10,textAlign:"left"}}>
                    <div style={{fontSize:"0.7rem",color:C.muted,marginBottom:2}}>💡 Conseil</div>
                    <div style={{fontSize:"0.78rem",color:C.dark,fontStyle:"italic",lineHeight:1.5}}>"{a.conseil}"</div>
                  </div>
                )}
                <button onClick={e=>{e.stopPropagation();openProfil(a);}}
                  style={{...css.btnSecondary,width:"100%",fontSize:"0.8rem",borderRadius:10}}>
                  Voir le profil →
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CONSEILS ── */}
      {tab==="conseils" && (
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {displayAlumni.map((a,i)=>{
            const r = getRoleInfo(a.role||"alumni");
            const initials = a.avatar || a.name?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() || "?";
            return (
              <div key={a.uid||i} style={css.card}>
                <div style={{display:"flex",gap:12}}>
                  <div onClick={()=>openProfil(a)} style={{
                    width:42,height:42,borderRadius:"50%",
                    background:a.photoURL?"transparent":(a.bg||r.bg),
                    color:a.fg||r.color,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontWeight:700,fontSize:"0.85rem",flexShrink:0,
                    cursor:"pointer",overflow:"hidden",
                  }}>
                    {a.photoURL?<img src={a.photoURL} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:initials}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                      <div>
                        <span onClick={()=>openProfil(a)} style={{fontWeight:700,color:C.navy,cursor:"pointer",fontSize:"0.92rem"}}>{a.nom||a.name}</span>
                        <div style={{fontSize:"0.75rem",color:C.muted,marginTop:1}}>{a.poste||""} {a.ent?"· "+a.ent:""}</div>
                      </div>
                      {(a.promo||a.filiere)&&<span style={{...css.badge(a.bg||r.bg,a.fg||r.color),fontSize:"0.68rem",flexShrink:0}}>{a.promo||a.filiere}</span>}
                    </div>
                    <div style={{background:C.surfaceAlt,borderRadius:10,padding:"10px 12px",marginTop:6}}>
                      <div style={{fontSize:"0.72rem",color:C.muted,marginBottom:3,fontWeight:600}}>💡 Conseil karrière</div>
                      <div style={{fontSize:"0.85rem",color:C.dark,lineHeight:1.65,fontStyle:"italic"}}>"{a.conseil||"Partagez votre expérience avec les étudiants ARSTM."}"</div>
                    </div>
                    <div style={{display:"flex",gap:8,marginTop:10}}>
                      <button onClick={()=>openProfil(a)} style={{...css.btnSm,borderRadius:16}}>Voir profil →</button>
                      {a.whatsapp&&<a href={`https://wa.me/${a.whatsapp.replace(/\D/g,"")}`} target="_blank" rel="noreferrer" style={{...css.btnSm,borderRadius:16,background:"#f0fdf4",color:"#059669",border:"1px solid #bbf7d0",textDecoration:"none"}}>💚 WhatsApp</a>}
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