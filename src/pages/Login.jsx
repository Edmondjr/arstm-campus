import { useState, useCallback, memo, useMemo } from "react";
import { useAuth } from "../AuthContext";
import { C, ROLES, GRADIENTS, css } from "../design";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import PrivacyPolicyModal from "./PrivacyPolicy";

const CODES = [
  {code:"+225",flag:"🇨🇮"},{code:"+223",flag:"🇲🇱"},{code:"+226",flag:"🇧🇫"},
  {code:"+228",flag:"🇹🇬"},{code:"+229",flag:"🇧🇯"},{code:"+224",flag:"🇬🇳"},
  {code:"+221",flag:"🇸🇳"},{code:"+237",flag:"🇨🇲"},{code:"+242",flag:"🇨🇬"},
  {code:"+243",flag:"🇨🇩"},{code:"+241",flag:"🇬🇦"},{code:"+233",flag:"🇬🇭"},
  {code:"+234",flag:"🇳🇬"},{code:"+212",flag:"🇲🇦"},{code:"+33",flag:"🇫🇷"},
  {code:"+32",flag:"🇧🇪"},{code:"+41",flag:"🇨🇭"},{code:"+1",flag:"🇺🇸"},
  {code:"+44",flag:"🇬🇧"},
];

const ECOLES = ["ESTM","ESN","CEAM","ISMI","CREMPOL","FOAD"];

function getPwdStrength(pwd) {
  if (!pwd) return 0;
  let s = 0;
  if (pwd.length >= 6)  s++;
  if (pwd.length >= 10) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[0-9\W]/.test(pwd)) s++;
  return Math.min(s, 4);
}
const STRENGTH_LABEL = ["", "Faible", "Moyen", "Bien", "Fort"];
const STRENGTH_COLOR = ["", "#ef4444", "#f97316", "#22c55e", "#16a34a"];

const PhoneInput = memo(({ label, tel, setTel, code, setCode, style={} }) => (
  <div style={{ marginBottom:12, ...style }}>
    {label && <span style={css.label}>{label}</span>}
    <div style={{ display:"flex", gap:6 }}>
      <select value={code} onChange={e => setCode(e.target.value)}
        style={{ ...css.input, background:C.surfaceAlt, width:82, flexShrink:0, padding:"8px 4px", fontSize:"0.85rem" }}>
        {CODES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
      </select>
      <input style={{ ...css.input, background:C.surfaceAlt, flex:1 }}
        type="tel" placeholder="07 XX XX XX XX"
        value={tel} onChange={e => setTel(e.target.value)} />
    </div>
  </div>
));

// ── Modal réinitialisation mot de passe ──
function ResetModal({ onClose }) {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  const handleReset = async () => {
    setError("");
    if (!email.trim()) { setError("Saisissez votre adresse email."); return; }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (e) {
      if (e.code === "auth/user-not-found" || e.code === "auth/invalid-email")
        setError("Aucun compte trouvé avec cet email.");
      else setError("Erreur. Réessayez plus tard.");
    }
    setLoading(false);
  };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:3000, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div onClick={e => e.stopPropagation()} className="modal-enter" style={{ background:"#fff", borderRadius:20, padding:"28px 22px", width:"100%", maxWidth:360, boxShadow:"0 24px 60px rgba(0,0,0,0.3)" }}>
        {sent ? (
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:"2.5rem", marginBottom:12 }}>📧</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1.05rem", color:C.navy, marginBottom:8 }}>Email envoyé !</div>
            <p style={{ fontSize:"0.83rem", color:C.muted, lineHeight:1.6, marginBottom:20 }}>
              Un lien de réinitialisation a été envoyé à <strong>{email}</strong>. Vérifiez votre boîte mail (et les spams).
            </p>
            <button onClick={onClose} style={{ ...css.btnPrimary, width:"100%", padding:"12px", borderRadius:12 }}>
              Retour à la connexion
            </button>
          </div>
        ) : (
          <>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1.05rem", color:C.navy, marginBottom:6 }}>
              🔐 Mot de passe oublié
            </div>
            <p style={{ fontSize:"0.82rem", color:C.muted, lineHeight:1.55, marginBottom:18 }}>
              Saisissez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>
            {error && (
              <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:9, padding:"9px 12px", marginBottom:14, fontSize:"0.81rem", color:"#dc2626" }}>
                ⚠️ {error}
              </div>
            )}
            <div style={{ marginBottom:16 }}>
              <span style={css.label}>Votre adresse email</span>
              <input style={{ ...css.input, background:C.surfaceAlt }}
                type="email" placeholder="prenom@arstm.ci"
                value={email} onChange={e => { setEmail(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleReset()} autoFocus />
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={onClose} style={{ ...css.btnSecondary, flex:1, padding:"11px" }}>Annuler</button>
              <button onClick={handleReset} disabled={loading} style={{
                flex:1, padding:"11px", borderRadius:8, border:"none",
                background: loading ? "#94a3b8" : GRADIENTS.primary,
                color:"#fff", fontFamily:"inherit", fontWeight:700, fontSize:"0.87rem", cursor: loading ? "not-allowed" : "pointer",
              }}>
                {loading ? "Envoi…" : "Envoyer →"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Login() {
  const { login, register } = useAuth();
  const [vue, setVue]         = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [showReset, setShowReset] = useState(false);

  // Connexion
  const [email, setEmail]   = useState("");
  const [pwd, setPwd]       = useState("");
  const [showPwd, setShow]  = useState(false);

  // Inscription
  const [regRole, setRegRole] = useState(null);
  const [regStep, setRegStep] = useState(1);
  const [regOk, setRegOk]   = useState(false);
  const [nom, setNom]         = useState("");
  const [prenom, setPrenom]   = useState("");
  const [emailR, setEmailR]   = useState("");
  const [filiere, setFiliere] = useState("");
  const [promo, setPromo]     = useState("");
  const [service, setService] = useState("");
  const [modules, setModules] = useState("");
  const [ecoles, setEcoles]   = useState([]);
  const [ecoleAutre, setEcoleAutre] = useState("");
  const [employeur, setEmployeur]   = useState("");
  const [poste, setPoste]           = useState("");
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [telCode, setTelCode]       = useState("+225");
  const [telNum, setTelNum]         = useState("");
  const [waCode, setWaCode]         = useState("+225");
  const [waNum, setWaNum]           = useState("");
  const [waSame, setWaSame]         = useState(true);
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPrivacy, setShowPrivacy]     = useState(false);

  const roleInfo    = ROLES.find(r => r.id === regRole) || {};
  const pwdStrength = useMemo(() => getPwdStrength(password), [password]);
  const toggleEcole = e => setEcoles(p => p.includes(e) ? p.filter(x => x !== e) : [...p, e]);

  const handleLogin = async () => {
    setError("");
    if (!email || !pwd) { setError("Remplissez tous les champs."); return; }
    setLoading(true);
    try { await login(email.trim(), pwd); }
    catch (e) {
      if (e.message === "PENDING")   setError("Compte en attente de validation (24-48h ouvrables).");
      else if (e.message === "REJECTED") setError("Compte refusé. Contactez le support.");
      else setError("Email ou mot de passe incorrect.");
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError("");
    if (!nom || !prenom || !emailR || !password) { setError("Champs obligatoires manquants."); return; }
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    if (password.length < 6)  { setError("Mot de passe trop court (min. 6 caractères)."); return; }
    if (!telNum) { setError("Le numéro de téléphone est obligatoire."); return; }
    const telFull = `${telCode}${telNum.replace(/\s/g,"")}`;
    const waFull  = waSame ? telFull : `${waCode}${waNum.replace(/\s/g,"")}`;
    setLoading(true);
    try {
      await register({
        email: emailR.trim(), password, nom, prenom, role: regRole,
        promo: promo || service || modules, filiere,
        tel: telFull, whatsapp: waFull,
        modules, ecoles, ecoleAutre, employeur, poste, service,
      });
      setRegOk(true);
    } catch (e) {
      setError(e.code === "auth/email-already-in-use" ? "Cet email est déjà utilisé." : "Erreur lors de la création du compte.");
      setLoading(false);
    }
  };

  const reset = () => {
    setVue("login"); setRegOk(false); setRegStep(1); setRegRole(null);
    setNom(""); setPrenom(""); setEmailR(""); setFiliere(""); setPromo("");
    setService(""); setModules(""); setEcoles([]); setEcoleAutre("");
    setEmployeur(""); setPoste(""); setPassword(""); setConfirm("");
    setTelNum(""); setWaNum(""); setWaSame(true); setShowRegPwd(false);
  };

  const ErrorBanner = () => !error ? null : (
    <div className="animate-slide-down" style={{
      background:"#fef2f2", border:"1px solid #fecaca", borderRadius:10,
      padding:"10px 13px", marginBottom:14, fontSize:"0.82rem",
      color:"#dc2626", display:"flex", alignItems:"center", gap:8,
    }}>⚠️ {error}</div>
  );

  const RoleSection = () => {
    if (regRole === "etudiant") return (
      <>
        <div style={{ marginBottom:10 }}>
          <span style={css.label}>Filière</span>
          <select style={{ ...css.input, background:C.surfaceAlt, marginBottom:8 }}
            value={filiere} onChange={e => setFiliere(e.target.value)}>
            <option value="">Choisir une filière...</option>
            <optgroup label="── LPTML">
              <option value="LPTML - 1ère Année">LPTML - 1ère Année</option>
              <option value="LPTML - Port Manutention 2e Année">LPTML PM2</option>
              <option value="LPTML - Port Manutention 3e Année">LPTML PM3</option>
              <option value="LPTML - Transit Consignation et Armement 2e Année">LPTML TCA2</option>
              <option value="LPTML - Transit Consignation et Armement 3e Année">LPTML TCA3</option>
              <option value="LPTML - Transport Multimodal 2e Année">LPTML TM2</option>
              <option value="LPTML - Transport Multimodal 3e Année">LPTML TM3</option>
            </optgroup>
            <optgroup label="── MPTML">
              <option value="MPTML - Gestion Portuaire et Maritime 1ère Année">MPTML GPM1</option>
              <option value="MPTML - Gestion Portuaire et Maritime 2e Année">MPTML GPM2</option>
              <option value="MPTML - Logistique et Transport 1ère Année">MPTML LT1</option>
              <option value="MPTML - Logistique et Transport 2e Année">MPTML LT2</option>
            </optgroup>
            <optgroup label="── Sciences Nautiques">
              <option value="LPSN – Sciences Nautiques 1ère Année">LPSN 1</option>
              <option value="LPSN – Sciences Nautiques 2e Année">LPSN 2</option>
              <option value="LPSN – Sciences Nautiques 3e Année">LPSN 3</option>
              <option value="MPSN – Capitaine au long cours">CLC</option>
              <option value="PC 750">PC 750</option>
              <option value="CHEF DE QUART">CDQ</option>
              <option value="ELEVE CHEF DE QUART">ECQD</option>
            </optgroup>
            <optgroup label="── Mécanique Navale">
              <option value="LPMN – Mécanique Navale 1ère Année">LPMN 1</option>
              <option value="LPMN – Mécanique Navale 2e Année">LPMN 2</option>
              <option value="LPMN – Mécanique Navale 3e Année">LPMN 3</option>
              <option value="MPMN – Officier Mécanicien 1ère Classe">OM1</option>
              <option value="MPMN – Officier Mécanicien 2e Classe">OM2</option>
            </optgroup>
            <optgroup label="── Génie Thermique">
              <option value="LPGT – Génie Thermique 1ère Année">LPGT 1</option>
              <option value="LPGT – Génie Thermique 2e Année">LPGT 2</option>
              <option value="LPGT – Génie Thermique 3e Année">LPGT 3</option>
            </optgroup>
            <optgroup label="── Réseau Informatique et Télécom">
              <option value="LPRIT – Réseau Informatique et Télécom 1ère Année">LPRIT 1</option>
              <option value="LPRIT – Réseau Informatique et Télécom 2e Année">LPRIT 2</option>
              <option value="LPRIT – Réseau Informatique et Télécom 3e Année">LPRIT 3</option>
            </optgroup>
            <optgroup label="── CEAM">
              <option value="CEAM – Matelot Polyvalent">CAM POLY</option>
            </optgroup>
            <optgroup label="── Autres">
              <option value="FOAD">FOAD</option>
              <option value="Formation Continue">FC</option>
            </optgroup>
          </select>
        </div>
        <div style={{ marginBottom:10 }}>
          <span style={css.label}>Promotion</span>
          <select style={{ ...css.input, background:C.surfaceAlt }} value={promo} onChange={e => setPromo(e.target.value)}>
            <option value="">Choisir...</option>
            {Array.from({length:40},(_,i)=>i+1).map(n=><option key={n} value={`Promo ${n}`}>Promotion {n}</option>)}
          </select>
        </div>
      </>
    );
    if (regRole === "enseignant") return (
      <>
        <div style={{ marginBottom:10 }}>
          <span style={css.label}>Module(s)</span>
          <input style={{ ...css.input, background:C.surfaceAlt }} placeholder="Ex: Droit Maritime, Supply Chain..."
            value={modules} onChange={e => setModules(e.target.value)} />
        </div>
        <div style={{ marginBottom:10 }}>
          <span style={css.label}>École(s) / Centre(s)</span>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:6 }}>
            {ECOLES.map(e => (
              <button key={e} type="button" onClick={() => toggleEcole(e)} style={{
                padding:"5px 10px", borderRadius:8, cursor:"pointer", fontFamily:"inherit",
                fontSize:"0.78rem", fontWeight:600, border:"none", transition:"all 0.15s",
                background: ecoles.includes(e) ? C.green : "#e2e8f0",
                color: ecoles.includes(e) ? "#fff" : C.mid,
              }}>{e}</button>
            ))}
          </div>
          <input style={{ ...css.input, background:C.surfaceAlt }} placeholder="Autre (préciser)..."
            value={ecoleAutre} onChange={e => setEcoleAutre(e.target.value)} />
        </div>
      </>
    );
    if (regRole === "alumni") return (
      <>
        <div style={{ display:"flex", gap:8, marginBottom:10 }}>
          <div style={{ flex:1 }}>
            <span style={css.label}>Filière</span>
            <select style={{ ...css.input, background:C.surfaceAlt, marginBottom:8 }}
              value={filiere} onChange={e => setFiliere(e.target.value)}>
              <option value="">Choisir une filière...</option>
              <option value="LPTML-TCA">LPTML-TCA</option>
              <option value="LPTML-PM">LPTML-PM</option>
              <option value="LPTML-TM">LPTML-TM</option>
              <option value="MPTML-GPM">MPTML-GPM</option>
              <option value="MPTML-LT">MPTML-LT</option>
              <option value="LPSN">LPSN</option>
              <option value="CLC">CLC</option>
              <option value="LPMN">LPMN</option>
              <option value="OM1">OM1</option>
              <option value="OM2">OM2</option>
              <option value="CEAM - CAM POLY">CEAM - CAM POLY</option>
              <option value="PC 750">PC 750</option>
              <option value="CDQ">CDQ</option>
              <option value="ECQD">ECQD</option>
              <option value="LPGT">LPGT</option>
              <option value="LPRIT">LPRIT</option>
              <option value="FOAD">FOAD</option>
              <option value="Formation Continue">FC</option>
            </select>
          </div>
          <div style={{ flex:1 }}>
            <span style={css.label}>Promotion</span>
            <select style={{ ...css.input, background:C.surfaceAlt }} value={promo} onChange={e => setPromo(e.target.value)}>
              <option value="">Choisir...</option>
              {Array.from({length:40},(_,i)=>i+1).map(n=><option key={n} value={`Promo ${n}`}>P{n}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:10 }}>
          <div style={{ flex:1 }}><span style={css.label}>Employeur</span><input style={{ ...css.input, background:C.surfaceAlt }} placeholder="Optionnel" value={employeur} onChange={e => setEmployeur(e.target.value)} /></div>
          <div style={{ flex:1 }}><span style={css.label}>Poste</span><input style={{ ...css.input, background:C.surfaceAlt }} placeholder="Optionnel" value={poste} onChange={e => setPoste(e.target.value)} /></div>
        </div>
      </>
    );
    if (regRole === "administration") return (
      <div style={{ marginBottom:10 }}>
        <span style={css.label}>Service / Direction</span>
        <select style={{ ...css.input, background:C.surfaceAlt }} value={service} onChange={e => setService(e.target.value)}>
          <option value="">Sélectionner...</option>
          {["Direction Generale","Direction Academique","Scolarite","Comptabilite et Finances","Communication et Marketing","Relations Exterieures","Ressources Humaines","ESTM","ESN","CEAM","ISMI","CREMPOL","FOAD"].map(s=><option key={s}>{s}</option>)}
        </select>
      </div>
    );
    return null;
  };

  return (
    <div style={{ position:"fixed", inset:0, background: GRADIENTS.login, overflowY:"auto" }}>
    <div style={{ minHeight:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-start", padding:"24px 16px 40px" }}>
      {showReset   && <ResetModal onClose={() => setShowReset(false)} />}
      {showPrivacy && (
        <PrivacyPolicyModal
          onClose={() => setShowPrivacy(false)}
          onAccept={() => setAcceptedTerms(true)}
        />
      )}

      {/* Decorative orbs */}
      <div style={{ position:"fixed", top:-100, right:-100, width:340, height:340, borderRadius:"50%", background:"rgba(37,99,235,0.07)", pointerEvents:"none" }} />
      <div style={{ position:"fixed", bottom:-80, left:-80, width:240, height:240, borderRadius:"50%", background:"rgba(8,145,178,0.05)", pointerEvents:"none" }} />

      <div style={{ width:"100%", maxWidth:420, paddingBottom:24, position:"relative" }}>

        {/* LOGO */}
        <div style={{ textAlign:"center", marginBottom:28 }} className="animate-slide-up">
          <div style={{ width:64, height:64, borderRadius:20, background:GRADIENTS.primary, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.8rem", fontWeight:900, color:"#fff", margin:"0 auto 14px", boxShadow:"0 8px 32px rgba(37,99,235,0.45)", fontFamily:"'Syne',sans-serif" }}>A</div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1.6rem", color:"#fff", letterSpacing:"-0.02em", lineHeight:1.1 }}>
            ARSTM<br/><span style={{ color:"#67e8f9" }}>Campus</span>
          </div>
          <div style={{ color:"rgba(255,255,255,0.45)", fontSize:"0.78rem", marginTop:6 }}>Votre campus · Votre réseau · Votre avenir</div>
        </div>

        {/* ONGLETS */}
        <div style={{ display:"flex", background:"rgba(255,255,255,0.07)", borderRadius:14, padding:5, marginBottom:20, gap:4 }} className="animate-slide-up">
          {[["login","Se connecter"],["register","Créer un compte"]].map(([v,l])=>(
            <button key={v} onClick={() => { setVue(v); setError(""); setRegStep(1); setRegOk(false); }} style={{
              flex:1, padding:"10px 0", borderRadius:10, border:"none", cursor:"pointer",
              fontFamily:"inherit", fontWeight:700, fontSize:"0.85rem",
              background: vue===v ? "#fff" : "transparent",
              color: vue===v ? C.navy : "rgba(255,255,255,0.55)",
              boxShadow: vue===v ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
              transition:"all 0.2s",
            }}>{l}</button>
          ))}
        </div>

        {/* CONNEXION */}
        {vue==="login" && (
          <div className="animate-scale-in" style={{ background:"#fff", borderRadius:22, padding:"26px 20px", boxShadow:"0 24px 60px rgba(0,0,0,0.35)" }}>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1.1rem", color:C.navy }}>Bienvenue 👋</div>
              <div style={{ color:C.muted, fontSize:"0.8rem", marginTop:3 }}>Connecte-toi à ton espace ARSTM</div>
            </div>
            <ErrorBanner />
            <div style={{ marginBottom:12 }}>
              <span style={css.label}>Email</span>
              <input style={{ ...css.input, background:"#f8fafc" }} type="email" placeholder="prenom@arstm.ci"
                value={email} onChange={e => { setEmail(e.target.value); setError(""); }} />
            </div>
            <div style={{ marginBottom:22 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                <span style={css.label}>Mot de passe</span>
                <button onClick={() => setShowReset(true)} style={{ background:"none", border:"none", cursor:"pointer", color:C.blue, fontSize:"0.76rem", fontFamily:"inherit", padding:0 }}>
                  Oublié ?
                </button>
              </div>
              <div style={{ position:"relative" }}>
                <input style={{ ...css.input, background:"#f8fafc", paddingRight:40 }}
                  type={showPwd ? "text" : "password"} placeholder="••••••••"
                  value={pwd} onChange={e => { setPwd(e.target.value); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleLogin()} />
                <button onClick={() => setShow(!showPwd)} aria-label="Afficher/masquer" style={{ position:"absolute", right:11, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:C.muted, fontSize:"1rem" }}>
                  {showPwd ? "🙈" : "👁"}
                </button>
              </div>
            </div>
            <button onClick={handleLogin} disabled={loading} style={{
              width:"100%", padding:"13px", borderRadius:12, border:"none",
              background: loading ? "#94a3b8" : GRADIENTS.primary,
              color:"#fff", fontFamily:"inherit", fontWeight:700, fontSize:"0.92rem",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 4px 16px rgba(37,99,235,0.35)",
              transition:"all 0.2s",
            }}>
              {loading ? "Connexion en cours…" : "Se connecter →"}
            </button>
          </div>
        )}

        {/* CRÉER UN COMPTE */}
        {vue==="register" && !regOk && (
          <div className="animate-scale-in" style={{ background:"#fff", borderRadius:22, padding:"22px 18px", boxShadow:"0 24px 60px rgba(0,0,0,0.35)" }}>
            {regStep===1 && (
              <>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1.05rem", color:C.navy, marginBottom:4 }}>Créer mon compte</div>
                <div style={{ color:C.muted, fontSize:"0.8rem", marginBottom:18 }}>Sélectionne ton profil</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {ROLES.map(r => (
                    <button key={r.id} onClick={() => { setRegRole(r.id); setRegStep(2); setError(""); }} style={{
                      display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
                      borderRadius:14, border:`1.5px solid ${r.color}25`, background:r.bg,
                      cursor:"pointer", fontFamily:"inherit", textAlign:"left", transition:"all 0.15s",
                    }}>
                      <div style={{ width:38, height:38, borderRadius:10, background:"rgba(255,255,255,0.8)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.15rem", flexShrink:0 }}>{r.icon}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:"0.88rem", color:C.navy }}>{r.label}</div>
                        <div style={{ fontSize:"0.72rem", color:C.mid, marginTop:1 }}>{r.desc}</div>
                      </div>
                      <span style={{ color:r.color, fontSize:"1.2rem", fontWeight:700 }}>›</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {regStep===2 && (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, paddingBottom:14, borderBottom:`1px solid ${C.border}` }}>
                  <button onClick={() => { setRegStep(1); setError(""); }} style={{ width:30, height:30, borderRadius:8, border:`1px solid ${C.border}`, background:C.surfaceAlt, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.9rem", flexShrink:0 }}>←</button>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:roleInfo.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1rem" }}>{roleInfo.icon}</div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:"0.9rem", color:C.navy }}>{roleInfo.label}</div>
                      <div style={{ fontSize:"0.7rem", color:C.muted }}>Étape 2 sur 2</div>
                    </div>
                  </div>
                </div>
                <ErrorBanner />
                <div style={{ background:"linear-gradient(135deg,#fefce8,#fef9c3)", border:"1px solid #fde68a", borderRadius:10, padding:"9px 12px", marginBottom:16, display:"flex", alignItems:"flex-start", gap:8 }}>
                  <span style={{ fontSize:"1rem", flexShrink:0 }}>⏳</span>
                  <div style={{ fontSize:"0.77rem", color:"#78350f", lineHeight:1.5 }}>Activation sous <strong>24-48h</strong> après validation par l'Admin Plateforme.</div>
                </div>
                <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                  <div style={{ flex:1 }}><span style={css.label}>Prénom *</span><input style={{ ...css.input, background:C.surfaceAlt }} placeholder="Edmond" value={prenom} onChange={e => setPrenom(e.target.value)} /></div>
                  <div style={{ flex:1 }}><span style={css.label}>Nom *</span><input style={{ ...css.input, background:C.surfaceAlt }} placeholder="DADIE" value={nom} onChange={e => setNom(e.target.value)} /></div>
                </div>
                <div style={{ marginBottom:10 }}>
                  <span style={css.label}>Email *</span>
                  <input style={{ ...css.input, background:C.surfaceAlt }} type="email" placeholder="prenom@arstm.ci" value={emailR} onChange={e => setEmailR(e.target.value)} />
                </div>
                <RoleSection />
                <div style={{ display:"flex", alignItems:"center", gap:10, margin:"14px 0 12px" }}>
                  <div style={{ flex:1, height:1, background:C.border }} />
                  <span style={{ fontSize:"0.72rem", color:C.muted, fontWeight:600, whiteSpace:"nowrap" }}>Coordonnées</span>
                  <div style={{ flex:1, height:1, background:C.border }} />
                </div>
                <PhoneInput label="Téléphone *" tel={telNum} setTel={setTelNum} code={telCode} setCode={c => { setTelCode(c); if (waSame) setWaCode(c); }} />
                <div style={{ marginBottom:12 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={css.label}>WhatsApp</span>
                    <label style={{ display:"flex", alignItems:"center", gap:5, cursor:"pointer" }}>
                      <div onClick={() => setWaSame(!waSame)} style={{ width:36, height:20, borderRadius:10, background:waSame?C.green:"#e2e8f0", position:"relative", transition:"background 0.2s", cursor:"pointer", flexShrink:0 }}>
                        <span style={{ position:"absolute", top:2, left:waSame?18:2, width:16, height:16, borderRadius:"50%", background:"#fff", boxShadow:"0 1px 3px rgba(0,0,0,0.2)", transition:"left 0.2s" }} />
                      </div>
                      <span style={{ fontSize:"0.74rem", color:C.mid }}>= Tél</span>
                    </label>
                  </div>
                  {waSame
                    ? <div style={{ ...css.input, background:"#f0fdf4", color:C.green, fontSize:"0.83rem", display:"flex", alignItems:"center", gap:7, border:"1px solid #bbf7d0" }}>💚 <span>{telCode} {telNum || "Même numéro"}</span></div>
                    : <PhoneInput label="" tel={waNum} setTel={setWaNum} code={waCode} setCode={setWaCode} />}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10, margin:"14px 0 12px" }}>
                  <div style={{ flex:1, height:1, background:C.border }} />
                  <span style={{ fontSize:"0.72rem", color:C.muted, fontWeight:600, whiteSpace:"nowrap" }}>Sécurité</span>
                  <div style={{ flex:1, height:1, background:C.border }} />
                </div>
                <div style={{ display:"flex", gap:8, marginBottom:18 }}>
                  <div style={{ flex:1 }}>
                    <span style={css.label}>Mot de passe *</span>
                    <div style={{ position:"relative" }}>
                      <input style={{ ...css.input, background:C.surfaceAlt, paddingRight:36 }}
                        type={showRegPwd ? "text" : "password"} placeholder="Min. 6 car."
                        value={password} onChange={e => setPassword(e.target.value)} />
                      <button onClick={() => setShowRegPwd(!showRegPwd)} style={{ position:"absolute", right:9, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:C.muted, fontSize:"0.9rem" }}>
                        {showRegPwd ? "🙈" : "👁"}
                      </button>
                    </div>
                    {password && (
                      <div style={{ marginTop:5 }}>
                        <div style={{ display:"flex", gap:3 }}>
                          {[1,2,3,4].map(i => <div key={i} style={{ flex:1, height:3, borderRadius:99, background: i <= pwdStrength ? STRENGTH_COLOR[pwdStrength] : C.border, transition:"background 0.25s" }} />)}
                        </div>
                        <div style={{ fontSize:"0.68rem", color:STRENGTH_COLOR[pwdStrength], fontWeight:600, marginTop:2 }}>{STRENGTH_LABEL[pwdStrength]}</div>
                      </div>
                    )}
                  </div>
                  <div style={{ flex:1 }}>
                    <span style={css.label}>Confirmer *</span>
                    <input style={{ ...css.input, background:C.surfaceAlt }} type="password" placeholder="Répéter"
                      value={confirm} onChange={e => setConfirm(e.target.value)} />
                    {confirm && password && (
                      <div style={{ marginTop:5, fontSize:"0.68rem", fontWeight:600, color: confirm === password ? "#16a34a" : "#ef4444" }}>
                        {confirm === password ? "✓ Identiques" : "✗ Non identiques"}
                      </div>
                    )}
                  </div>
                </div>
                {/* Charte de confidentialité */}
                <label style={{ display:"flex", alignItems:"flex-start", gap:10, cursor:"pointer", marginBottom:16, padding:"10px 12px", background:C.surfaceAlt, borderRadius:10, border:`1px solid ${acceptedTerms?C.blueBorder:C.border}` }}>
                  <div onClick={()=>setAcceptedTerms(!acceptedTerms)} style={{ width:20, height:20, borderRadius:5, border:`2px solid ${acceptedTerms?C.blue:C.border}`, background:acceptedTerms?C.blue:"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1, transition:"all 0.15s", cursor:"pointer" }}>
                    {acceptedTerms && <span style={{ color:"#fff", fontSize:"0.7rem", fontWeight:900 }}>✓</span>}
                  </div>
                  <span style={{ fontSize:"0.77rem", color:C.dark, lineHeight:1.55 }}>
                    J'ai lu et j'accepte la{" "}
                    <button type="button" onClick={e => { e.stopPropagation(); setShowPrivacy(true); }} style={{ background:"none", border:"none", padding:0, cursor:"pointer", color:C.blue, fontWeight:700, fontFamily:"inherit", fontSize:"inherit", textDecoration:"underline" }}>
                      politique de confidentialité
                    </button>{" "}
                    d'ARSTM Campus. Mes données sont traitées conformément à la Loi n°2013-450 de Côte d'Ivoire et uniquement dans le cadre de la gestion de la plateforme scolaire.
                  </span>
                </label>

                <button onClick={handleRegister} disabled={loading || !acceptedTerms} style={{
                  width:"100%", padding:"13px", borderRadius:12, border:"none",
                  background: (loading || !acceptedTerms) ? "#94a3b8" : `linear-gradient(135deg,${roleInfo.color||C.blue},${C.blue})`,
                  color:"#fff", fontFamily:"inherit", fontWeight:700, fontSize:"0.9rem",
                  cursor: (loading || !acceptedTerms) ? "not-allowed" : "pointer",
                  boxShadow: (loading || !acceptedTerms) ? "none" : `0 4px 16px ${roleInfo.color||C.blue}40`,
                  transition:"all 0.2s",
                }}>
                  {loading ? "Création en cours…" : "Créer mon compte →"}
                </button>
              </>
            )}
          </div>
        )}

        {/* SUCCÈS */}
        {vue==="register" && regOk && (
          <div className="animate-bounce-in" style={{ background:"#fff", borderRadius:22, padding:"32px 22px", boxShadow:"0 24px 60px rgba(0,0,0,0.35)", textAlign:"center" }}>
            <div style={{ width:64, height:64, borderRadius:"50%", background:"#f0fdf4", border:"2px solid #bbf7d0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"2rem", margin:"0 auto 16px" }}>🎉</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1.15rem", color:C.navy, marginBottom:6 }}>Compte créé !</div>
            <div style={{ fontSize:"0.82rem", color:C.muted, lineHeight:1.6, marginBottom:18 }}>Votre demande est en cours de traitement.</div>
            <div style={{ background:"#fefce8", border:"1px solid #fde68a", borderRadius:12, padding:"12px 14px", marginBottom:20, textAlign:"left" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}><span>⏳</span><span style={{ fontWeight:700, color:"#92400e", fontSize:"0.82rem" }}>Validation requise</span></div>
              <div style={{ fontSize:"0.78rem", color:"#78350f", lineHeight:1.6 }}>L'<strong>Admin Plateforme</strong> activera votre compte sous 24-48h ouvrables.</div>
            </div>
            <button onClick={reset} style={{ width:"100%", padding:"12px", borderRadius:12, border:"none", background:GRADIENTS.primary, color:"#fff", fontFamily:"inherit", fontWeight:700, fontSize:"0.9rem", cursor:"pointer", boxShadow:"0 4px 16px rgba(37,99,235,0.3)" }}>
              Aller à la connexion →
            </button>
          </div>
        )}

        <div style={{ textAlign:"center", marginTop:18, fontSize:"0.7rem", color:"rgba(255,255,255,0.18)" }}>
          ARSTM Campus v2.0 · Firebase · 2026
        </div>
      </div>
    </div>
    </div>
  );
}
