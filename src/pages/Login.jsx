import { useState } from "react";
import { useAuth } from "../AuthContext";
import { C, ROLES, css } from "../design";

export default function Login() {
  const { login, register }   = useAuth();
  const [vue, setVue]         = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [email, setEmail]     = useState("");
  const [pwd, setPwd]         = useState("");
  const [showPwd, setShow]    = useState(false);
  const [regRole, setRegRole] = useState(null);
  const [regStep, setRegStep] = useState(1);
  const [regOk, setRegOk]     = useState(false);
  const [form, setForm]       = useState({ nom:"", prenom:"", email:"", promo:"", password:"", confirm:"" });

  const roleInfo = ROLES.find(r => r.id === regRole) || {};

  const handleLogin = async () => {
    setError("");
    if (!email || !pwd) { setError("Veuillez remplir tous les champs."); return; }
    setLoading(true);
    try {
      await login(email.trim(), pwd);
    } catch(e) {
      if (e.message === "PENDING")   setError("⏳ Compte en attente de validation par l'Admin Plateforme.");
      else if (e.message === "REJECTED") setError("❌ Compte refusé. Contactez support@arstm-campus.ci");
      else setError("Email ou mot de passe incorrect.");
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError("");
    const { nom, prenom, email, password, confirm, promo } = form;
    if (!nom || !prenom || !email || !password) { setError("Tous les champs sont obligatoires."); return; }
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    if (password.length < 6)  { setError("Mot de passe trop court (min. 6 caractères)."); return; }
    setLoading(true);
    try {
      await register({ email: email.trim(), password, nom, prenom, role: regRole, promo });
      setRegOk(true);
    } catch(e) {
      setError(e.code === "auth/email-already-in-use" ? "Cet email est déjà utilisé." : "Erreur lors de la création.");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(160deg,${C.navy} 0%,#1e3a5f 55%,#0f2744 100%)`, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ width:"100%", maxWidth:440 }}>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:26 }}>
          <div style={{ width:62, height:62, borderRadius:18, background:`linear-gradient(135deg,${C.blue},${C.aqua})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.7rem", fontWeight:800, color:"#fff", margin:"0 auto 12px" }}>A</div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1.55rem", color:"#fff" }}>ARSTM<span style={{ color:"#67e8f9" }}>Campus</span></div>
          <div style={{ color:"rgba(255,255,255,0.55)", fontSize:"0.82rem", marginTop:5, fontStyle:"italic" }}>Votre campus. Votre réseau. Votre avenir numérique.</div>
        </div>

        {/* Onglets */}
        <div style={{ display:"flex", background:"rgba(255,255,255,0.08)", borderRadius:12, padding:4, marginBottom:18, gap:4 }}>
          {[["login","Se connecter"],["register","Créer un compte"]].map(([v,l]) => (
            <button key={v} onClick={()=>{ setVue(v); setError(""); setRegStep(1); setRegOk(false); }}
              style={{ flex:1, padding:"9px 0", borderRadius:9, border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:600, fontSize:"0.87rem", background:vue===v?"#fff":"transparent", color:vue===v?C.navy:"rgba(255,255,255,0.6)" }}>
              {l}
            </button>
          ))}
        </div>

        {/* CONNEXION */}
        {vue === "login" && (
          <div style={{ background:"#fff", borderRadius:20, padding:"24px 20px", boxShadow:"0 24px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:"1.05rem", color:C.navy, marginBottom:3 }}>Bienvenue 👋</div>
            <div style={{ color:C.muted, fontSize:"0.82rem", marginBottom:18 }}>Connecte-toi à ton espace ARSTM Campus</div>
            {error && <div style={{ background:C.redLight, border:`1px solid ${C.redBorder}`, borderRadius:9, padding:"9px 13px", marginBottom:12, fontSize:"0.83rem", color:C.red }}>{error}</div>}
            <div style={{ marginBottom:12 }}>
              <span style={css.label}>Email</span>
              <input style={{ ...css.input, background:C.surfaceAlt }} type="email" placeholder="prenom@arstm.ci" value={email} onChange={e=>{ setEmail(e.target.value); setError(""); }} />
            </div>
            <div style={{ marginBottom:18 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                <span style={css.label}>Mot de passe</span>
                <button style={{ ...css.btnGhost, padding:0, fontSize:"0.77rem", color:C.blue }}>Oublié ?</button>
              </div>
              <div style={{ position:"relative" }}>
                <input style={{ ...css.input, background:C.surfaceAlt, paddingRight:38 }} type={showPwd?"text":"password"} placeholder="••••••••" value={pwd} onChange={e=>{ setPwd(e.target.value); setError(""); }} onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
                <button onClick={()=>setShow(!showPwd)} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:C.muted }}>{showPwd?"🙈":"👁"}</button>
              </div>
            </div>
            <button style={{ ...css.btnPrimary, width:"100%", padding:"11px", opacity:loading?0.7:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }} onClick={handleLogin} disabled={loading}>
              {loading?"⏳ Connexion...":"Se connecter →"}
            </button>
          </div>
        )}

        {/* CRÉER UN COMPTE */}
        {vue === "register" && !regOk && (
          <div style={{ background:"#fff", borderRadius:20, padding:"24px 20px", boxShadow:"0 24px 60px rgba(0,0,0,0.3)" }}>
            {regStep === 1 && <>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:"1.05rem", color:C.navy, marginBottom:3 }}>Créer mon compte</div>
              <div style={{ color:C.muted, fontSize:"0.82rem", marginBottom:18 }}>Sélectionne ton profil</div>
              <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                {ROLES.map(r => (
                  <button key={r.id} onClick={()=>{ setRegRole(r.id); setRegStep(2); setError(""); }}
                    style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 14px", borderRadius:12, border:`1px solid ${r.color}22`, background:r.bg, cursor:"pointer", fontFamily:"inherit", textAlign:"left" }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.2rem", flexShrink:0 }}>{r.icon}</div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:"0.9rem", color:C.navy }}>{r.label}</div>
                      <div style={{ fontSize:"0.76rem", color:C.mid }}>{r.desc}</div>
                    </div>
                    <span style={{ marginLeft:"auto", color:r.color, fontSize:"1.1rem" }}>›</span>
                  </button>
                ))}
              </div>
            </>}
            {regStep === 2 && <>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
                <button onClick={()=>{ setRegStep(1); setError(""); }} style={{ ...css.btnGhost, padding:"4px 8px", color:C.blue }}>← Retour</button>
                <div style={{ fontWeight:700, color:C.navy }}>{roleInfo.icon} Compte {roleInfo.label}</div>
              </div>
              {error && <div style={{ background:C.redLight, border:`1px solid ${C.redBorder}`, borderRadius:9, padding:"9px 13px", marginBottom:12, fontSize:"0.82rem", color:C.red }}>{error}</div>}
              <div style={{ background:"#fef9c3", border:"1px solid #fde68a", borderRadius:9, padding:"10px 12px", marginBottom:14, fontSize:"0.81rem", color:"#78350f" }}>
                ⚠️ Votre compte sera activé après validation par l'<strong>Admin Plateforme</strong> (24–48h).
              </div>
              <div style={{ display:"flex", gap:10, marginBottom:12 }}>
                <div style={{ flex:1 }}>
                  <span style={css.label}>Prénom</span>
                  <input style={{ ...css.input, background:C.surfaceAlt }} placeholder="Edmond" value={form.prenom} onChange={e=>setForm({...form,prenom:e.target.value})} />
                </div>
                <div style={{ flex:1 }}>
                  <span style={css.label}>Nom</span>
                  <input style={{ ...css.input, background:C.surfaceAlt }} placeholder="DADIÉ" value={form.nom} onChange={e=>setForm({...form,nom:e.target.value})} />
                </div>
              </div>
              <div style={{ marginBottom:12 }}>
                <span style={css.label}>Email</span>
                <input style={{ ...css.input, background:C.surfaceAlt }} type="email" placeholder="prenom@arstm.ci" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
              </div>
              {regRole==="etudiant" && (
                <div style={{ marginBottom:12 }}>
                  <span style={css.label}>Promotion</span>
                  <select style={{ ...css.input, background:C.surfaceAlt }} value={form.promo} onChange={e=>setForm({...form,promo:e.target.value})}>
                    <option value="">Choisir...</option>
                    {["MPTML — Promo 34","MPTML — Promo 35","LPTML — Promo 36","LPTML — Promo 37"].map(p=><option key={p}>{p}</option>)}
                  </select>
                </div>
              )}
              {regRole==="alumni" && (
                <div style={{ marginBottom:12 }}>
                  <span style={css.label}>Promotion de sortie</span>
                  <select style={{ ...css.input, background:C.surfaceAlt }} value={form.promo} onChange={e=>setForm({...form,promo:e.target.value})}>
                    <option value="">Sélectionner...</option>
                    {[28,29,30,31,32,33].map(p=><option key={p}>Promo {p}</option>)}
                  </select>
                </div>
              )}
              {regRole==="administration" && (
                <div style={{ marginBottom:12 }}>
                  <span style={css.label}>Service</span>
                  <select style={{ ...css.input, background:C.surfaceAlt }} value={form.promo} onChange={e=>setForm({...form,promo:e.target.value})}>
                    <option value="">Sélectionner...</option>
                    {["Scolarité","Direction Académique","Direction Générale","Comptabilité"].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display:"flex", gap:10, marginBottom:16 }}>
                <div style={{ flex:1 }}>
                  <span style={css.label}>Mot de passe</span>
                  <input style={{ ...css.input, background:C.surfaceAlt }} type="password" placeholder="Min. 6 caractères" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} />
                </div>
                <div style={{ flex:1 }}>
                  <span style={css.label}>Confirmer</span>
                  <input style={{ ...css.input, background:C.surfaceAlt }} type="password" placeholder="Répéter" value={form.confirm} onChange={e=>setForm({...form,confirm:e.target.value})} />
                </div>
              </div>
              <button style={{ ...css.btnPrimary, width:"100%", padding:"11px", background:`linear-gradient(135deg,${roleInfo.color||C.blue},${C.blue})`, opacity:loading?0.7:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }} onClick={handleRegister} disabled={loading}>
                {loading?"⏳ Création...":"Créer mon compte →"}
              </button>
            </>}
          </div>
        )}

        {/* SUCCÈS */}
        {vue === "register" && regOk && (
          <div style={{ background:"#fff", borderRadius:20, padding:"32px 22px", boxShadow:"0 24px 60px rgba(0,0,0,0.3)", textAlign:"center" }}>
            <div style={{ fontSize:"2.5rem", marginBottom:12 }}>🎉</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1.1rem", color:C.navy, marginBottom:8 }}>Compte créé !</div>
            <div style={{ background:"#fef9c3", border:"1px solid #fde68a", borderRadius:10, padding:"12px", marginBottom:14, textAlign:"left" }}>
              <div style={{ fontWeight:700, color:"#92400e", fontSize:"0.83rem", marginBottom:3 }}>⚠️ Validation requise</div>
              <div style={{ fontSize:"0.81rem", color:"#78350f", lineHeight:1.6 }}>
                Votre compte est en attente de validation par l'<strong>Admin Plateforme</strong>. Vous recevrez un email sous 24–48h.
              </div>
            </div>
            <button style={{ ...css.btnPrimary, width:"100%" }} onClick={()=>{ setVue("login"); setRegOk(false); setRegStep(1); setRegRole(null); setForm({nom:"",prenom:"",email:"",promo:"",password:"",confirm:""}); }}>
              Aller à la connexion →
            </button>
          </div>
        )}

        <div style={{ textAlign:"center", marginTop:16, fontSize:"0.72rem", color:"rgba(255,255,255,0.25)" }}>
          ARSTM Campus v2.0 · Firebase · Mai 2026
        </div>
      </div>
    </div>
  );
}