// src/components/GlobalSearch.jsx
import { useState, useMemo, useEffect, useRef } from "react";
import { C, ROLES, css, SHADOWS } from "../design";
import { useCollection } from "../hooks/useFirestore";

const getRoleInfo = r => ROLES.find(x => x.id===r) || { color:C.blue, bg:C.blueLight, icon:"👤", label:r };

const norm = s => (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");

const FILTERS = [
  ["all","Tout","🔍"],
  ["members","Membres","👥"],
  ["annonces","Annonces","📢"],
  ["ressources","Ressources","📚"],
  ["posts","Publications","💬"],
];

export default function GlobalSearch({ onClose, onNavigate, onOpenProfil, membersOnly = false }) {
  const [q, setQ]       = useState("");
  const [filter, setFilter] = useState(membersOnly ? "members" : "all");
  const inputRef = useRef();

  const { data: users }      = useCollection("users", []);
  const { data: annonces }   = useCollection("annonces", []);
  const { data: ressources } = useCollection("ressources", []);
  const { data: posts }      = useCollection("posts", []);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const nq = norm(q);

  const results = useMemo(() => {
    if (!nq) return { members:[], annonces:[], ressources:[], posts:[] };
    const members = users
      .filter(u => u.status === "approved" && (norm(u.name).includes(nq) || norm(u.role).includes(nq) || norm(u.promo).includes(nq) || norm(u.filiere).includes(nq)))
      .slice(0, 12);
    const ann = annonces
      .filter(a => norm(a.titre).includes(nq) || norm(a.contenu).includes(nq) || norm(a.cat).includes(nq))
      .slice(0, 12);
    const res = ressources
      .filter(r => norm(r.titre).includes(nq) || norm(r.auteur).includes(nq) || norm(r.module).includes(nq))
      .slice(0, 12);
    const pos = posts
      .filter(p => norm(p.texte).includes(nq) || norm(p.auteur).includes(nq))
      .slice(0, 12);
    return { members, annonces:ann, ressources:res, posts:pos };
  }, [nq, users, annonces, ressources, posts]);

  const totalCount = membersOnly
    ? results.members.length
    : results.members.length + results.annonces.length + results.ressources.length + results.posts.length;
  const show = (key) => !membersOnly && (filter === "all" || filter === key);

  const go = (page) => { onNavigate(page); onClose(); };

  return (
    <div onClick={onClose} className="animate-fade-in"
      style={{ position:"fixed", inset:0, zIndex:3000, background:"rgba(15,23,42,0.55)", display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"8vh 16px 16px" }}>
      <div onClick={e => e.stopPropagation()} className="modal-enter"
        style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:560, maxHeight:"82vh", display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:SHADOWS["2xl"] }}>

        {/* Barre de recherche */}
        <div style={{ padding:"14px 16px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
          <span style={{ fontSize:"1.1rem" }}>🔍</span>
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
            placeholder={membersOnly ? "Rechercher un membre ARSTM…" : "Rechercher membres, annonces, ressources, publications…"}
            style={{ flex:1, border:"none", outline:"none", fontSize:"0.95rem", fontFamily:"inherit", color:C.dark, background:"transparent" }}/>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:"50%", border:"none", background:C.surfaceAlt, cursor:"pointer", color:C.muted, fontSize:"0.85rem" }}>✕</button>
        </div>

        {/* Filtres */}
        {!membersOnly && (
          <div style={{ display:"flex", gap:6, padding:"10px 16px", borderBottom:`1px solid ${C.border}`, overflowX:"auto", flexShrink:0 }}>
            {FILTERS.map(([v,l,ic]) => (
              <button key={v} onClick={() => setFilter(v)} style={{
                padding:"5px 12px", borderRadius:20, border:`1px solid ${filter===v?C.blue:C.border}`,
                background:filter===v?C.blue:"#fff", color:filter===v?"#fff":C.mid,
                cursor:"pointer", fontFamily:"inherit", fontWeight:600, fontSize:"0.78rem", whiteSpace:"nowrap",
              }}>{ic} {l}</button>
            ))}
          </div>
        )}

        {/* Résultats */}
        <div style={{ flex:1, overflowY:"auto", padding:"8px 0" }}>
          {!nq && (
            <div style={{ padding:40, textAlign:"center", color:C.muted }}>
              <div style={{ fontSize:"2.5rem", marginBottom:10 }}>{membersOnly ? "👥" : "🔍"}</div>
              <div style={{ fontSize:"0.86rem" }}>
                {membersOnly ? "Tapez le nom d'un membre pour le contacter." : "Tapez pour rechercher dans tout le campus."}
              </div>
            </div>
          )}
          {nq && totalCount === 0 && (
            <div style={{ padding:40, textAlign:"center", color:C.muted }}>
              <div style={{ fontSize:"2rem", marginBottom:8 }}>🤷</div>
              <div style={{ fontSize:"0.86rem" }}>Aucun résultat pour « {q} ».</div>
            </div>
          )}

          {/* Membres */}
          {(membersOnly || show("members")) && results.members.length > 0 && (
            <Section title="👥 Membres" count={results.members.length}>
              {results.members.map(u => {
                const ri = getRoleInfo(u.role);
                return (
                  <Row key={u.uid} onClick={() => { onOpenProfil(u); onClose(); }}>
                    <div style={{ width:36, height:36, borderRadius:"50%", background:u.photoURL?"transparent":ri.bg, color:ri.color,
                      display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:"0.72rem", overflow:"hidden", flexShrink:0 }}>
                      {u.photoURL ? <img src={u.photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : (u.avatar||u.name?.slice(0,2))}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:"0.86rem", fontWeight:600, color:C.navy }}>{u.name}</div>
                      <div style={{ fontSize:"0.74rem", color:C.muted }}>{ri.icon} {ri.label}{u.promo ? ` · ${u.promo}` : ""}</div>
                    </div>
                  </Row>
                );
              })}
            </Section>
          )}

          {/* Annonces */}
          {show("annonces") && results.annonces.length > 0 && (
            <Section title="📢 Annonces" count={results.annonces.length}>
              {results.annonces.map(a => (
                <Row key={a.id} onClick={() => go("annonces")}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:"0.86rem", fontWeight:600, color:C.navy }}>{a.titre}</div>
                    <div style={{ fontSize:"0.74rem", color:C.muted, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {a.urgent ? "🔴 " : ""}{a.cat} · {a.auteur}
                    </div>
                  </div>
                </Row>
              ))}
            </Section>
          )}

          {/* Ressources */}
          {show("ressources") && results.ressources.length > 0 && (
            <Section title="📚 Ressources" count={results.ressources.length}>
              {results.ressources.map(r => (
                <Row key={r.id} onClick={() => go("ressources")}>
                  <span style={{ ...css.badge(C.blueLight, C.blue), flexShrink:0 }}>{r.type}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:"0.86rem", fontWeight:600, color:C.navy }}>{r.titre}</div>
                    <div style={{ fontSize:"0.74rem", color:C.muted }}>{r.module} · {r.auteur}</div>
                  </div>
                </Row>
              ))}
            </Section>
          )}

          {/* Posts */}
          {show("posts") && results.posts.length > 0 && (
            <Section title="💬 Publications" count={results.posts.length}>
              {results.posts.map(p => (
                <Row key={p.id} onClick={() => go("social")}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:"0.84rem", color:C.dark, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.texte}</div>
                    <div style={{ fontSize:"0.74rem", color:C.muted }}>{p.auteur}</div>
                  </div>
                </Row>
              ))}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, count, children }) {
  return (
    <div style={{ marginBottom:4 }}>
      <div style={{ padding:"6px 16px", fontSize:"0.72rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.04em", color:C.muted, display:"flex", justifyContent:"space-between" }}>
        <span>{title}</span><span>{count}</span>
      </div>
      {children}
    </div>
  );
}

function Row({ onClick, children }) {
  return (
    <div onClick={onClick}
      style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 16px", cursor:"pointer", transition:"background 0.12s" }}
      onMouseEnter={e => e.currentTarget.style.background = C.surfaceAlt}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
      {children}
    </div>
  );
}
