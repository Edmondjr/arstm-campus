// src/pages/Trombinoscope.jsx
import { useState, useMemo } from "react";
import { C, ROLES, css, SHADOWS, GRADIENTS } from "../design";
import { useCollection } from "../hooks/useFirestore";
import { ProfilExterne } from "./Profil";

const getRoleInfo = r => ROLES.find(x => x.id===r) || { color:C.blue, bg:C.blueLight, icon:"👤", label:r };

export default function PageTrombinoscope() {
  const { data: allUsers, loading } = useCollection("users", []);
  const [viewUser, setViewUser] = useState(null);
  const [search, setSearch]     = useState("");
  const [filterRole, setFilterRole]   = useState("Tous");
  const [filterPromo, setFilterPromo] = useState("Tous");

  const approved = useMemo(() => allUsers.filter(u => u.status === "approved"), [allUsers]);
  const promos   = useMemo(() => ["Tous", ...new Set(approved.map(u=>u.promo).filter(Boolean))], [approved]);

  const filtered = useMemo(() => approved.filter(u => {
    const ok1 = filterRole  === "Tous" || u.role  === filterRole;
    const ok2 = filterPromo === "Tous" || u.promo === filterPromo;
    const q   = search.toLowerCase();
    const ok3 = !q || u.name?.toLowerCase().includes(q)
                   || u.filiere?.toLowerCase().includes(q)
                   || u.promo?.toLowerCase().includes(q);
    return ok1 && ok2 && ok3;
  }), [approved, filterRole, filterPromo, search]);

  // Regroupement par rôle pour l'affichage
  const byRole = useMemo(() => {
    const groups = {};
    filtered.forEach(u => {
      const ri = getRoleInfo(u.role);
      if (!groups[u.role]) groups[u.role] = { info:ri, users:[] };
      groups[u.role].users.push(u);
    });
    return Object.values(groups).sort((a,b) =>
      ROLES.findIndex(r=>r.id===a.info.id) - ROLES.findIndex(r=>r.id===b.info.id)
    );
  }, [filtered]);

  if (loading) return <div style={{ padding:40, textAlign:"center", color:C.muted }}>Chargement…</div>;

  return (
    <div style={{ maxWidth:960, margin:"0 auto" }}>
      {viewUser && <ProfilExterne user={viewUser} onClose={()=>setViewUser(null)} onMessage={()=>setViewUser(null)}/>}

      {/* Header premium */}
      <div style={{ borderRadius:20, background:GRADIENTS.dark, padding:"24px 22px 20px", marginBottom:20, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-30, right:-30, width:180, height:180, borderRadius:"50%", background:"rgba(255,255,255,0.04)" }}/>
        <div style={{ position:"absolute", bottom:-50, left:40, width:120, height:120, borderRadius:"50%", background:"rgba(255,255,255,0.03)" }}/>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10, position:"relative" }}>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1.45rem", color:"#fff", marginBottom:4 }}>
              👥 Trombinoscope
            </div>
            <div style={{ fontSize:"0.83rem", color:"rgba(255,255,255,0.55)" }}>
              Communauté ARSTM Campus · {approved.length} membres actifs
            </div>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {ROLES.slice(0,4).map(r => {
              const count = approved.filter(u=>u.role===r.id).length;
              if (!count) return null;
              return (
                <div key={r.id} style={{ background:"rgba(255,255,255,0.1)", borderRadius:10, padding:"6px 12px", textAlign:"center" }}>
                  <div style={{ fontSize:"0.65rem", color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:"0.05em" }}>{r.label}</div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1.1rem", color:r.color }}>{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <input style={{ ...css.input, flex:1, minWidth:200 }}
          placeholder="🔍 Rechercher par nom, filière, promotion…"
          value={search} onChange={e => setSearch(e.target.value)}/>
        <select style={{ ...css.input, minWidth:150 }} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="Tous">Tous les rôles</option>
          {ROLES.map(r => <option key={r.id} value={r.id}>{r.icon} {r.label}</option>)}
        </select>
        <select style={{ ...css.input, minWidth:140 }} value={filterPromo} onChange={e => setFilterPromo(e.target.value)}>
          <option value="Tous">Toutes promos</option>
          {promos.filter(p=>p!=="Tous").map(p => <option key={p}>{p}</option>)}
        </select>
      </div>

      <div style={{ fontSize:"0.77rem", color:C.muted, marginBottom:16 }}>{filtered.length} membre(s) affiché(s)</div>

      {/* Grille par groupe de rôle */}
      {byRole.map(group => (
        <div key={group.info.id} style={{ marginBottom:28 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
            <div style={{ width:32, height:32, borderRadius:10, background:group.info.bg,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1rem" }}>
              {group.info.icon}
            </div>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, color:C.navy, fontSize:"0.95rem" }}>
                {group.info.label}
              </div>
              <div style={{ fontSize:"0.72rem", color:C.muted }}>{group.users.length} membre{group.users.length>1?"s":""}</div>
            </div>
            <div style={{ flex:1, height:1, background:C.border, marginLeft:4 }}/>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))", gap:12 }}>
            {group.users.map(u => {
              const ri = group.info;
              return (
                <div key={u.uid||u.id} onClick={() => setViewUser(u)}
                  style={{ background:"#fff", borderRadius:16, padding:"18px 12px 14px", cursor:"pointer",
                    textAlign:"center", position:"relative", overflow:"hidden",
                    border:`1px solid ${C.border}`, transition:"all 0.2s",
                    boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}
                  onMouseEnter={e => { e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow=`0 8px 24px ${ri.color}20`; e.currentTarget.style.borderColor=`${ri.color}40`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.05)"; e.currentTarget.style.borderColor=C.border; }}>

                  {/* Barre colorée en haut */}
                  <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${ri.color},${ri.color}60)` }}/>

                  {/* Online dot */}
                  {u.online && (
                    <div style={{ position:"absolute", top:10, right:10, width:8, height:8, borderRadius:"50%", background:"#10b981", boxShadow:"0 0 0 2px #fff" }}/>
                  )}

                  {/* Avatar */}
                  <div style={{ width:62, height:62, borderRadius:"50%", margin:"0 auto 10px",
                    background:u.photoURL?"transparent":`linear-gradient(135deg,${ri.color},${ri.color}80)`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontWeight:700, fontSize:"1.15rem", color:"#fff", overflow:"hidden",
                    border:`3px solid ${ri.color}25`, boxShadow:`0 4px 14px ${ri.color}30` }}>
                    {u.photoURL
                      ? <img src={u.photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                      : (u.avatar || u.name?.slice(0,2)?.toUpperCase())}
                  </div>

                  <div style={{ fontWeight:700, color:C.navy, fontSize:"0.86rem", marginBottom:5, lineHeight:1.3,
                    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{u.name}</div>

                  {u.promo && (
                    <div style={{ fontSize:"0.68rem", color:C.muted, marginBottom:3 }}>Promo {u.promo}</div>
                  )}
                  {u.filiere && (
                    <div style={{ fontSize:"0.65rem", color:ri.color, fontWeight:600,
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                      background:ri.bg, borderRadius:20, padding:"2px 7px", display:"inline-block", marginTop:2 }}>
                      {u.filiere.split(" - ")[0]}
                    </div>
                  )}
                  {(u.role==="alumni") && u.poste && (
                    <div style={{ fontSize:"0.64rem", color:C.muted, marginTop:4,
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>💼 {u.poste}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div style={{ ...css.card, textAlign:"center", padding:48, color:C.muted }}>
          <div style={{ fontSize:"2.5rem", marginBottom:12 }}>👥</div>
          <div style={{ fontWeight:600, color:C.navy, marginBottom:6 }}>Aucun membre trouvé</div>
          <div style={{ fontSize:"0.84rem" }}>Modifiez vos filtres ou votre recherche.</div>
        </div>
      )}
    </div>
  );
}
