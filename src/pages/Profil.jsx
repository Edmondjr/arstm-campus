import { useState, useEffect, useRef } from "react";
import { useAuth } from "../AuthContext";
import { C, ROLES, css } from "../design";
import { updateDocument, sendNotif } from "../hooks/useFirestore";
import { db, auth } from "../firebase";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";

// ─── Profil Externe — modal au clic sur un utilisateur ────────────────────────
export function ProfilExterne({ user, onClose, onMessage }) {
  if (!user) return null;
  const roleInfo = ROLES.find(r => r.id === user.role) || ROLES[0];
  const initials  = user.avatar || user.name?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() || "?";
  // Privacy flags — tout visible par défaut, l'utilisateur peut désactiver dans Paramètres
  const priv      = user.privacy || {};
  const showTel   = !!user.tel      && priv.showTel      !== false;
  const showWa    = !!user.whatsapp && priv.showWhatsapp  !== false;
  const showEmail = !!user.email    && priv.showEmail     !== false;
  // Si le numéro commence déjà par "+" il contient déjà l'indicatif — on ne le redouble pas
  const fullWa  = showWa  ? (user.whatsapp.startsWith("+") ? user.whatsapp : (user.waIndicatif||"")+user.whatsapp) : null;
  const fullTel = showTel ? (user.tel.startsWith("+")      ? user.tel      : (user.indicatif||"")+user.tel)        : null;
  const waHref    = fullWa  ? `https://wa.me/${fullWa.replace(/\D/g,"")}` : null;
  const smsHref   = fullTel ? `sms:${fullTel}` : null;
  const telHref   = fullTel ? `tel:${fullTel}` : null;

  // Construire la liste de canaux de contact disponibles
  const contacts = [
    waHref    && { href:waHref,                    label:"WhatsApp", icon:"📱", bg:"#f0fdf4",   color:"#059669", border:"#bbf7d0", external:true },
    smsHref   && { href:smsHref,                   label:"SMS",      icon:"💬", bg:C.blueLight,  color:C.blue,    border:C.blueBorder },
    telHref   && { href:telHref,                   label:"Appeler",  icon:"📞", bg:C.surfaceAlt, color:C.dark,    border:C.border },
    showEmail && { href:`mailto:${user.email}`,    label:"Email",    icon:"✉️", bg:C.surfaceAlt, color:C.mid,     border:C.border },
  ].filter(Boolean);

  const cols = contacts.length >= 3 ? 3 : contacts.length === 2 ? 2 : 1;

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:2000, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", padding:"16px", overflowY:"auto" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:22, width:"100%", maxWidth:480, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 24px 60px rgba(0,0,0,0.35)", paddingBottom:32, margin:"auto" }} className="modal-enter">
        {/* Bannière */}
        <div style={{ background:`linear-gradient(135deg,${roleInfo.color}18,${roleInfo.color}35)`, padding:"24px 20px 18px", position:"relative" }}>
          <button onClick={onClose} style={{ position:"absolute", top:12, right:14, background:"rgba(255,255,255,0.85)", border:"none", borderRadius:"50%", width:30, height:30, cursor:"pointer", fontSize:"0.85rem", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>✕</button>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:68, height:68, borderRadius:"50%", flexShrink:0, background:`linear-gradient(135deg,${roleInfo.color},${C.aqua})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.4rem", fontWeight:700, color:"#fff", overflow:"hidden", border:"3px solid white", boxShadow:"0 4px 16px rgba(0,0,0,0.15)" }}>
              {user.photoURL ? <img src={user.photoURL} alt="av" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : initials}
            </div>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1.1rem", color:C.navy }}>{user.name}</div>
              <div style={{ display:"flex", gap:6, marginTop:5, flexWrap:"wrap" }}>
                <span style={{ ...css.badge(roleInfo.bg, roleInfo.color), fontWeight:700 }}>{roleInfo.icon} {roleInfo.label}</span>
                {user.filiere && <span style={css.badge(C.blueLight, C.blue)}>{user.filiere}</span>}
                {user.promo && <span style={css.badge(C.surfaceAlt, C.mid)}>{user.promo}</span>}
              </div>
            </div>
          </div>
        </div>
        <div style={{ padding:"16px 20px" }}>
          {user.bio && <p style={{ fontSize:"0.86rem", color:C.dark, lineHeight:1.75, marginBottom:14, padding:"10px 13px", background:C.surfaceAlt, borderRadius:12 }}>{user.bio}</p>}
          {user.role==="enseignant" && user.ecoles?.length>0 && (
            <div style={{ marginBottom:12 }}>
              <span style={css.label}>École(s) / Centre(s)</span>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>{user.ecoles.map(e=><span key={e} style={css.tag(C.greenLight,C.green)}>{e}</span>)}</div>
            </div>
          )}
          {user.role==="alumni" && (user.employeur||user.poste) && (
            <div style={{ marginBottom:12 }}>
              {user.poste && <div style={{ fontSize:"0.85rem", color:C.dark }}>💼 <strong>{user.poste}</strong></div>}
              {user.employeur && <div style={{ fontSize:"0.82rem", color:C.mid, marginTop:2 }}>🏢 {user.employeur}</div>}
            </div>
          )}

          {/* Boutons de contact — tous les canaux disponibles selon les préférences */}
          {contacts.length > 0 ? (
            <div style={{ display:"grid", gridTemplateColumns:`repeat(${cols},1fr)`, gap:8 }}>
              {contacts.map(c => (
                <a key={c.label} href={c.href} target={c.external?"_blank":undefined} rel="noreferrer"
                  style={{ padding:"13px 8px", borderRadius:12, background:c.bg, color:c.color,
                    border:`1px solid ${c.border}`, textDecoration:"none", fontFamily:"inherit",
                    fontWeight:700, fontSize:"0.8rem", display:"flex", flexDirection:"column",
                    alignItems:"center", gap:4, textAlign:"center", transition:"opacity 0.15s" }}
                  onMouseEnter={e=>e.currentTarget.style.opacity="0.8"}
                  onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                  <span style={{ fontSize:"1.3rem" }}>{c.icon}</span>
                  {c.label}
                </a>
              ))}
            </div>
          ) : (
            <div style={{ textAlign:"center", padding:"10px 12px", background:C.surfaceAlt, borderRadius:10, fontSize:"0.82rem", color:C.muted }}>
              Aucune information de contact partagée publiquement.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Constantes filières / indicatifs (module scope) ──────────────────────────
const ECOLES   = ["ESTM","ESN","CEAM","ISMI","CREMPOL","FOAD"];
const CODES    = ["+225","+223","+226","+228","+229","+221","+237","+243","+33","+1","+44"];
const FILIERES_ETUDIANT = [
  { group:"LPTML", opts:["LPTML - 1ère Année","LPTML - Port Manutention 2e Année","LPTML - Port Manutention 3e Année","LPTML - Transit Consignation et Armement 2e Année","LPTML - Transit Consignation et Armement 3e Année","LPTML - Transport Multimodal 2e Année","LPTML - Transport Multimodal 3e Année"] },
  { group:"MPTML", opts:["MPTML - Gestion Portuaire et Maritime 1ère Année","MPTML - Gestion Portuaire et Maritime 2e Année","MPTML - Logistique et Transport 1ère Année","MPTML - Logistique et Transport 2e Année"] },
  { group:"Sciences Nautiques", opts:["LPSN – Sciences Nautiques 1ère Année","LPSN – Sciences Nautiques 2e Année","LPSN – Sciences Nautiques 3e Année","MPSN – Capitaine au long cours","PC 750","CHEF DE QUART","ELEVE CHEF DE QUART"] },
  { group:"Mécanique Navale", opts:["LPMN – Mécanique Navale 1ère Année","LPMN – Mécanique Navale 2e Année","LPMN – Mécanique Navale 3e Année","MPMN – Officier Mécanicien 1ère Classe","MPMN – Officier Mécanicien 2e Classe"] },
  { group:"Génie Thermique", opts:["LPGT – Génie Thermique 1ère Année","LPGT – Génie Thermique 2e Année","LPGT – Génie Thermique 3e Année"] },
  { group:"Réseau Informatique", opts:["LPRIT – Réseau Informatique et Télécom 1ère Année","LPRIT – Réseau Informatique et Télécom 2e Année","LPRIT – Réseau Informatique et Télécom 3e Année"] },
  { group:"Autres", opts:["CEAM – Matelot Polyvalent","FOAD","Formation Continue"] },
];
const FILIERES_ALUMNI = ["LPTML - Port Manutention","LPTML - Transit Consignation et Armement","LPTML - Transport Multimodal","MPTML - Gestion Portuaire et Maritime","MPTML - Logistique et Transport","Sciences Nautiques","Capitaine au long cours","Mécanique Navale","Officier Mécanicien","Génie Thermique","Réseau Informatique et Télécom","CEAM","FOAD","Formation Continue","Autre"];

// ─── ProfilRoleFields (module scope — évite le remontage à chaque re-render) ──
function ProfilRoleFields({ role, editMode, profile,
  editFiliere, setEditFiliere, editPromo, setEditPromo,
  editModules, setEditModules, editEcoles, setEditEcoles, editEcoleAutre, setEditEcoleAutre,
  editEmployeur, setEditEmployeur, editPoste, setEditPoste,
  editService, setEditService }) {
  if (!editMode) {
    if (role==="etudiant") return(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Field label="Filière" val={profile?.filiere||"—"}/><Field label="Promotion" val={profile?.promo||"—"}/></div>);
    if (role==="enseignant") return(<div><Field label="Modules" val={profile?.modules||"—"}/>{profile?.ecoles?.length>0&&<div style={{marginTop:10}}><span style={css.label}>Écoles / Centres</span><div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:4}}>{profile.ecoles.map(e=><span key={e} style={css.tag(C.greenLight,C.green)}>{e}</span>)}{profile?.ecoleAutre&&<span style={css.tag(C.blueLight,C.blue)}>{profile.ecoleAutre}</span>}</div></div>}</div>);
    if (role==="alumni") return(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Field label="Filière sortie" val={profile?.filiere||"—"}/><Field label="Promotion" val={profile?.promo||"—"}/><Field label="Employeur" val={profile?.employeur||"—"}/><Field label="Poste" val={profile?.poste||"—"}/></div>);
    if (role==="administration") return <Field label="Service / Direction" val={profile?.service||profile?.promo||"—"}/>;
    if (role==="superadmin") return(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Field label="Rôle" val="Admin Plateforme"/><Field label="Accès" val="Complet" highlight/><Field label="Plateforme" val="ARSTM Campus"/><Field label="Organisation" val="ARSTM"/></div>);
    return null;
  }
  if (role==="enseignant") return(
    <div>
      <div style={{marginBottom:10}}><span style={css.label}>Modules enseignés</span><input style={{...css.input,background:C.surfaceAlt}} placeholder="Ex: Droit Maritime..." value={editModules} onChange={e=>setEditModules(e.target.value)}/></div>
      <div style={{marginBottom:10}}>
        <span style={css.label}>École(s) / Centre(s)</span>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>{ECOLES.map(e=><button key={e} onClick={()=>setEditEcoles(p=>p.includes(e)?p.filter(x=>x!==e):[...p,e])} style={{padding:"5px 10px",borderRadius:8,cursor:"pointer",fontFamily:"inherit",fontSize:"0.78rem",fontWeight:600,border:"none",background:editEcoles.includes(e)?C.green:"#e2e8f0",color:editEcoles.includes(e)?"#fff":"#475569",transition:"all 0.15s"}}>{e}</button>)}</div>
        <input style={{...css.input,background:C.surfaceAlt}} placeholder="Autre..." value={editEcoleAutre} onChange={e=>setEditEcoleAutre(e.target.value)}/>
      </div>
    </div>
  );
  if (role==="etudiant") return(
    <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:10}}>
      <div><span style={css.label}>Filière</span>
        <select style={{...css.input,background:C.surfaceAlt}} value={editFiliere} onChange={e=>setEditFiliere(e.target.value)}>
          <option value="">Sélectionner votre filière...</option>
          {FILIERES_ETUDIANT.map(g=>(<optgroup key={g.group} label={g.group}>{g.opts.map(o=><option key={o} value={o}>{o}</option>)}</optgroup>))}
        </select>
      </div>
      <div><span style={css.label}>Promotion (année d'entrée)</span><input style={{...css.input,background:C.surfaceAlt}} placeholder="Ex: 2024" value={editPromo} onChange={e=>setEditPromo(e.target.value)}/></div>
    </div>
  );
  if (role==="alumni") return(
    <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:10}}>
      <div><span style={css.label}>Filière (formation suivie)</span>
        <select style={{...css.input,background:C.surfaceAlt}} value={editFiliere} onChange={e=>setEditFiliere(e.target.value)}>
          <option value="">Sélectionner votre filière...</option>
          {FILIERES_ALUMNI.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <div><span style={css.label}>Promotion</span><input style={{...css.input,background:C.surfaceAlt}} placeholder="Ex: 2020" value={editPromo} onChange={e=>setEditPromo(e.target.value)}/></div>
        <div><span style={css.label}>Employeur</span><input style={{...css.input,background:C.surfaceAlt}} placeholder="Entreprise" value={editEmployeur} onChange={e=>setEditEmployeur(e.target.value)}/></div>
      </div>
      <div><span style={css.label}>Poste</span><input style={{...css.input,background:C.surfaceAlt}} placeholder="Poste" value={editPoste} onChange={e=>setEditPoste(e.target.value)}/></div>
    </div>
  );
  if (role==="administration") return(
    <div style={{marginBottom:10}}>
      <span style={css.label}>Service / Direction</span>
      <select style={{...css.input,background:C.surfaceAlt}} value={editService} onChange={e=>setEditService(e.target.value)}>
        <option value="">Sélectionner...</option>
        {["Direction Générale","Direction Académique","Scolarité","Comptabilité et Finances","Communication et Marketing","Relations Extérieures","Ressources Humaines","ESTM","ESN","CEAM","ISMI","CREMPOL","FOAD"].map(s=><option key={s}>{s}</option>)}
      </select>
    </div>
  );
  return null;
}

// ─── Page Mon Profil ──────────────────────────────────────────────────────────
export default function PageProfil({ profile, onLogout, setPage }) {
  const authCtx = useAuth();
  const reloadProfile = authCtx?.reloadProfile || null;

  const [activeTab, setActiveTab]       = useState("infos");
  const [editMode, setEditMode]         = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [saving, setSaving]             = useState(false);
  const [uploading, setUploading]       = useState(false);
  const [showPwdForm, setShowPwdForm]   = useState(false);
  const [oldPwd, setOldPwd]             = useState("");
  const [newPwd, setNewPwd]             = useState("");
  const [newPwd2, setNewPwd2]           = useState("");
  const [pwdMsg, setPwdMsg]             = useState("");
  const [pwdLoading, setPwdLoading]     = useState(false);
  const fileRef = useRef();

  const [editBio, setEditBio]           = useState(profile?.bio||"");
  const [editTel, setEditTel]           = useState(profile?.tel||"");
  const [editWa, setEditWa]             = useState(profile?.whatsapp||"");
  const [editIndicatif, setEditIndicatif]   = useState(profile?.indicatif||"+225");
  const [editWaInd, setEditWaInd]       = useState(profile?.waIndicatif||"+225");
  const [photoURL, setPhotoURL]         = useState(profile?.photoURL||null);
  const [editModules, setEditModules]   = useState(profile?.modules||"");
  const [editEcoles, setEditEcoles]     = useState(profile?.ecoles||[]);
  const [editEcoleAutre, setEditEcoleAutre] = useState(profile?.ecoleAutre||"");
  const [editEmployeur, setEditEmployeur]   = useState(profile?.employeur||"");
  const [editPoste, setEditPoste]       = useState(profile?.poste||"");
  const [editService, setEditService]   = useState(profile?.service||profile?.promo||"");
  const [editFiliere, setEditFiliere]   = useState(profile?.filiere||"");
  const [editPromo, setEditPromo]       = useState(profile?.promo||"");
  // Name/email change request
  const [changeReqModal, setChangeReqModal] = useState(null); // "name" | "email" | null
  const [changeReqVal, setChangeReqVal]     = useState("");
  const [changeReqReason, setChangeReqReason] = useState("");
  const [changeReqSending, setChangeReqSending] = useState(false);
  const [changeReqDone, setChangeReqDone]   = useState(false);

  const [stats, setStats] = useState({posts:0,ressources:0,offres:0,annonces:0});
  useEffect(()=>{
    if(!profile?.uid) return;
    (async()=>{
      try {
        const [a,b,c,d] = await Promise.all([
          getDocs(query(collection(db,"posts"),    where("auteurUid","==",profile.uid))),
          getDocs(query(collection(db,"ressources"),where("auteurUid","==",profile.uid))),
          getDocs(query(collection(db,"offres"),   where("auteurUid","==",profile.uid))),
          getDocs(query(collection(db,"annonces"), where("auteurUid","==",profile.uid))),
        ]);
        setStats({posts:a.size,ressources:b.size,offres:c.size,annonces:d.size});
      } catch(_){}
    })();
  },[profile?.uid]);

  const roleInfo = ROLES.find(r=>r.id===profile?.role)||ROLES[0];
  const initials = profile?.avatar||profile?.name?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()||"?";

  const handlePhotoUpload = async(e)=>{
    const file=e.target.files[0]; if(!file) return;
    if(file.size>3000000){alert("Max 3 Mo"); return;}
    setUploading(true);
    const reader=new FileReader();
    reader.onload=async(ev)=>{
      const b64=ev.target.result;
      setPhotoURL(b64);
      await updateDocument("users",profile?.uid,{photoURL:b64});
      if(reloadProfile) await reloadProfile(profile?.uid);
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave=async()=>{
    setSaving(true);
    const u={bio:editBio,tel:editTel,whatsapp:editWa,indicatif:editIndicatif,waIndicatif:editWaInd};
    if(profile?.role==="etudiant"){u.filiere=editFiliere;u.promo=editPromo;}
    if(profile?.role==="enseignant"){u.modules=editModules;u.ecoles=editEcoles;u.ecoleAutre=editEcoleAutre;}
    if(profile?.role==="alumni"){u.filiere=editFiliere;u.promo=editPromo;u.employeur=editEmployeur;u.poste=editPoste;}
    if(profile?.role==="administration"){u.service=editService;}
    await updateDocument("users",profile?.uid,u);
    if(reloadProfile) await reloadProfile(profile?.uid);
    setSaving(false); setEditMode(false);
  };

  const sendChangeRequest = async () => {
    if(!changeReqVal.trim()) return;
    setChangeReqSending(true);
    try {
      // Save request in Firestore
      await addDoc(collection(db,"changeRequests"),{
        uid:      profile?.uid,
        name:     profile?.name,
        email:    profile?.email,
        field:    changeReqModal,
        newValue: changeReqVal.trim(),
        reason:   changeReqReason.trim(),
        status:   "pending",
        createdAt: serverTimestamp(),
      });
      // Notify superadmins
      const admSnap = await getDocs(query(collection(db,"users"),where("role","==","superadmin")));
      await Promise.all(admSnap.docs.map(d => sendNotif(d.id,{
        type:      "change_request",
        fromName:  profile?.name,
        fromAvatar:profile?.avatar||profile?.name?.slice(0,2),
        field:     changeReqModal,
        newValue:  changeReqVal.trim(),
      })));
      setChangeReqDone(true);
      setTimeout(()=>{setChangeReqModal(null);setChangeReqDone(false);setChangeReqVal("");setChangeReqReason("");},2500);
    } catch(_){}
    setChangeReqSending(false);
  };

  const handleChangePwd=async()=>{
    setPwdMsg("");
    if(!oldPwd||!newPwd||!newPwd2){setPwdMsg("Remplissez tous les champs.");return;}
    if(newPwd!==newPwd2){setPwdMsg("Les nouveaux mots de passe ne correspondent pas.");return;}
    if(newPwd.length<6){setPwdMsg("Minimum 6 caractères.");return;}
    setPwdLoading(true);
    try {
      const cred=EmailAuthProvider.credential(auth.currentUser.email,oldPwd);
      await reauthenticateWithCredential(auth.currentUser,cred);
      await updatePassword(auth.currentUser,newPwd);
      setPwdMsg("✅ Mot de passe modifié avec succès !");
      setOldPwd(""); setNewPwd(""); setNewPwd2("");
      setTimeout(()=>{setShowPwdForm(false);setPwdMsg("");},2000);
    } catch(e){
      if(e.code==="auth/wrong-password") setPwdMsg("❌ Ancien mot de passe incorrect.");
      else setPwdMsg("❌ Erreur. Réessayez.");
    }
    setPwdLoading(false);
  };

  const statCards={
    etudiant:      [{icon:"💬",label:"Posts",val:stats.posts,page:"social"},{icon:"📚",label:"Ressources",val:"—",page:"ressources"}],
    enseignant:    [{icon:"📖",label:"Cours déposés",val:stats.ressources,page:"ressources"},{icon:"📢",label:"Annonces",val:stats.annonces,page:"annonces"}],
    alumni:        [{icon:"💼",label:"Offres publiées",val:stats.offres,page:"alumni"},{icon:"💬",label:"Posts",val:stats.posts,page:"social"}],
    administration:[{icon:"📢",label:"Annonces",val:stats.annonces,page:"annonces"},{icon:"📚",label:"Ressources",val:stats.ressources,page:"ressources"}],
    superadmin:    [{icon:"👥",label:"Utilisateurs",val:"—",page:"admin"},{icon:"🛡",label:"Accès total",val:"✓",page:"admin"}],
  }[profile?.role]||[];


  return (
    <div style={{maxWidth:640,margin:"0 auto",paddingBottom:32}}>

      {/* ── HEADER PREMIUM ── */}
      <div style={{borderRadius:22,overflow:"hidden",marginBottom:16,boxShadow:"0 8px 32px rgba(0,0,0,0.15)"}}>
        {/* Bannière colorée */}
        <div style={{height:80,background:`linear-gradient(135deg,${roleInfo.color},${C.aqua})`,position:"relative"}}>
          <div style={{position:"absolute",top:-20,right:-20,width:120,height:120,borderRadius:"50%",background:"rgba(255,255,255,0.1)"}}/>
          <div style={{position:"absolute",bottom:-10,left:60,width:80,height:80,borderRadius:"50%",background:"rgba(255,255,255,0.07)"}}/>
          {/* Bouton modifier flottant */}
          <button onClick={()=>editMode?handleSave():setEditMode(true)} disabled={saving} style={{position:"absolute",top:12,right:14,padding:"6px 14px",borderRadius:20,border:"none",background:"rgba(255,255,255,0.25)",color:"#fff",fontFamily:"inherit",fontWeight:700,fontSize:"0.78rem",cursor:"pointer",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",gap:5,transition:"all 0.2s"}}>
            {saving?"⏳ Sauvegarde...":editMode?"✅ Sauvegarder":"✏️ Modifier"}
          </button>
          {editMode&&<button onClick={()=>setEditMode(false)} style={{position:"absolute",top:12,right:editMode?130:14,padding:"6px 12px",borderRadius:20,border:"none",background:"rgba(0,0,0,0.2)",color:"rgba(255,255,255,0.8)",fontFamily:"inherit",fontWeight:600,fontSize:"0.76rem",cursor:"pointer"}}>Annuler</button>}
        </div>

        {/* Corps du profil */}
        <div style={{background:"#fff",padding:"0 18px 18px"}}>
          <div style={{display:"flex",flexDirection:"column",marginTop:-36,marginBottom:14}}>
            {/* Avatar */}
            <div style={{position:"relative",flexShrink:0,width:72,marginBottom:10}}>
              <div style={{width:72,height:72,borderRadius:"50%",background:`linear-gradient(135deg,${roleInfo.color},${C.aqua})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem",fontWeight:700,color:"#fff",overflow:"hidden",border:"4px solid #fff",boxShadow:"0 4px 16px rgba(0,0,0,0.15)"}}>
                {photoURL?<img src={photoURL} alt="av" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:initials}
              </div>
              {editMode&&<label style={{position:"absolute",bottom:0,right:0,width:24,height:24,borderRadius:"50%",background:C.blue,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.6rem",cursor:"pointer",border:"2px solid #fff",boxShadow:"0 2px 6px rgba(0,0,0,0.2)"}}>
                {uploading?"⏳":"📷"}
                <input type="file" accept="image/*" style={{display:"none"}} onChange={handlePhotoUpload}/>
              </label>}
            </div>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"1.1rem",color:C.navy,lineHeight:1.2}}>{profile?.name}</div>
                <button onClick={()=>{setChangeReqModal("name");setChangeReqVal("");setChangeReqReason("");}}
                  style={{fontSize:"0.68rem",padding:"2px 8px",borderRadius:100,border:`1px solid ${C.border}`,background:C.surfaceAlt,color:C.muted,cursor:"pointer",fontFamily:"inherit"}}>
                  ✏️ Modifier
                </button>
              </div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:5}}>
                <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:100,fontSize:"0.72rem",fontWeight:700,background:roleInfo.bg,color:roleInfo.color}}>{roleInfo.icon} {roleInfo.label}</span>
                {profile?.filiere&&<span style={{padding:"3px 8px",borderRadius:100,fontSize:"0.7rem",background:C.blueLight,color:C.blue,fontWeight:600}}>{profile.filiere.split(" - ")[0]}</span>}
              </div>
            </div>
          </div>

          {/* Stats cliquables */}
          {statCards.length>0&&(
            <div style={{display:"grid",gridTemplateColumns:`repeat(${statCards.length},1fr)`,gap:8,marginBottom:14}}>
              {statCards.map((s,i)=>(
                <button key={i} onClick={()=>setPage&&setPage(s.page)} style={{padding:"10px 8px",borderRadius:12,cursor:"pointer",background:`${roleInfo.color}08`,border:`1px solid ${roleInfo.color}20`,textAlign:"center",fontFamily:"inherit",transition:"all 0.15s"}}>
                  <div style={{fontSize:"0.85rem",marginBottom:2}}>{s.icon}</div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"1.05rem",color:roleInfo.color}}>{s.val}</div>
                  <div style={{fontSize:"0.67rem",color:C.muted,marginTop:1}}>{s.label}</div>
                </button>
              ))}
            </div>
          )}

          <div style={{fontSize:"0.77rem",color:C.muted,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span>✉️</span><span>{profile?.email}</span>
            <button onClick={()=>{setChangeReqModal("email");setChangeReqVal("");setChangeReqReason("");}}
              style={{fontSize:"0.65rem",padding:"2px 7px",borderRadius:100,border:`1px solid ${C.border}`,background:C.surfaceAlt,color:C.muted,cursor:"pointer",fontFamily:"inherit"}}>
              ✏️ Modifier
            </button>
          </div>
        </div>
      </div>

      {/* ── ONGLETS ── */}
      <div style={{display:"flex",gap:4,marginBottom:14,background:"#fff",borderRadius:14,padding:5,border:`1px solid ${C.border}`,boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
        {[["infos","📋 Infos"],["params","⚙️ Paramètres"]].map(([v,l])=>(
          <button key={v} onClick={()=>setActiveTab(v)} style={{flex:1,padding:"9px 0",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:"0.85rem",background:activeTab===v?C.navy:"transparent",color:activeTab===v?"#fff":C.muted,transition:"all 0.15s"}}>
            {l}
          </button>
        ))}
      </div>

      {/* ── INFOS ── */}
      {activeTab==="infos"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>

          {/* Bio */}
          <Card>
            <span style={css.label}>À propos</span>
            {editMode
              ?<textarea style={{...css.input,resize:"none",minHeight:70,lineHeight:1.65}} value={editBio} onChange={e=>setEditBio(e.target.value)} placeholder="Présentez-vous..."/>
              :<p style={{fontSize:"0.87rem",lineHeight:1.8,color:C.dark,margin:0}}>{profile?.bio||<span style={{color:C.muted,fontStyle:"italic"}}>Aucune biographie — cliquez sur Modifier.</span>}</p>
            }
          </Card>

          {/* Infos rôle */}
          <Card>
            <span style={css.label}>Informations</span>
            <ProfilRoleFields role={profile?.role} editMode={editMode} profile={profile}
              editFiliere={editFiliere} setEditFiliere={setEditFiliere}
              editPromo={editPromo} setEditPromo={setEditPromo}
              editModules={editModules} setEditModules={setEditModules}
              editEcoles={editEcoles} setEditEcoles={setEditEcoles}
              editEcoleAutre={editEcoleAutre} setEditEcoleAutre={setEditEcoleAutre}
              editEmployeur={editEmployeur} setEditEmployeur={setEditEmployeur}
              editPoste={editPoste} setEditPoste={setEditPoste}
              editService={editService} setEditService={setEditService}/>
          </Card>

          {/* Contact */}
          <Card>
            <span style={css.label}>Contact</span>
            {editMode?(
              <div>
                <div style={{marginBottom:10}}>
                  <span style={css.label}>Téléphone</span>
                  <div style={{display:"flex",gap:6}}>
                    <select style={{...css.input,background:C.surfaceAlt,width:80,padding:"8px 4px",fontSize:"0.82rem",flexShrink:0}} value={editIndicatif} onChange={e=>setEditIndicatif(e.target.value)}>
                      {CODES.map(c=><option key={c}>{c}</option>)}
                    </select>
                    <input style={{...css.input,background:C.surfaceAlt,flex:1}} placeholder="07 00 00 00" value={editTel} onChange={e=>setEditTel(e.target.value)}/>
                  </div>
                </div>
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <span style={css.label}>WhatsApp</span>
                    <button onClick={()=>{setEditWa(editTel);setEditWaInd(editIndicatif);}} style={{...css.btnGhost,padding:"2px 8px",fontSize:"0.74rem",color:C.blue}}>= Téléphone</button>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <select style={{...css.input,background:C.surfaceAlt,width:80,padding:"8px 4px",fontSize:"0.82rem",flexShrink:0}} value={editWaInd} onChange={e=>setEditWaInd(e.target.value)}>
                      {CODES.map(c=><option key={c}>{c}</option>)}
                    </select>
                    <input style={{...css.input,background:C.surfaceAlt,flex:1}} placeholder="07 00 00 00" value={editWa} onChange={e=>setEditWa(e.target.value)}/>
                  </div>
                </div>
              </div>
            ):(
              <div>
                <ContactRow icon="📞" label="Téléphone" val={profile?.tel?(profile.tel.startsWith("+")?profile.tel:`${profile?.indicatif||""} ${profile.tel}`):null}/>
                <ContactRow icon="💚" label="WhatsApp" val={profile?.whatsapp?(profile.whatsapp.startsWith("+")?profile.whatsapp:`${profile?.waIndicatif||""} ${profile.whatsapp}`):null} green/>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── PARAMÈTRES ── */}
      {activeTab==="params"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>

          {/* Notifications */}
          <Card title="Notifications">
            {[["Nouvelles annonces","Alertes urgentes",true],["Messages privés","À chaque message reçu",true],["Activité sociale","Likes et commentaires",false],["Rappels EDT","30 min avant chaque cours",true]].map(([l,d,o],i)=><Toggle key={i} label={l} desc={d} defaultOn={o}/>)}
          </Card>

          {/* Confidentialité — persisté dans Firestore */}
          <Card title="Confidentialité">
            {[
              ["showTel","Afficher mon téléphone","Bouton « Appeler/SMS » sur mon profil public",true],
              ["showWhatsapp","Afficher mon WhatsApp","Les autres peuvent me contacter via WhatsApp",true],
              ["showEmail","Afficher mon email","Bouton « Email » sur mon profil public",true],
              ["visibleAlumni","Profil visible aux Alumni","Networking et opportunités",true],
            ].map(([key,l,d,def])=>(
              <PrivacyToggle key={key} pkey={key} label={l} desc={d}
                value={profile?.privacy?.[key]} defaultOn={def}
                uid={profile?.uid} privacy={profile?.privacy} reloadProfile={reloadProfile}/>
            ))}
          </Card>

          {/* Compte */}
          <Card title="Mon compte">
            <div style={{padding:"8px 0",borderBottom:`1px solid ${C.border}`,marginBottom:10}}>
              <div style={{fontSize:"0.78rem",color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.04em"}}>Email</div>
              <div style={{fontSize:"0.86rem",color:C.dark,marginTop:2}}>{profile?.email}</div>
            </div>

            {/* Changer mot de passe */}
            <button onClick={()=>{setShowPwdForm(!showPwdForm);setPwdMsg("");}} style={{...css.btnSecondary,width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:7,marginBottom:showPwdForm?10:0}}>
              🔒 {showPwdForm?"Annuler":"Changer le mot de passe"}
            </button>

            {showPwdForm&&(
              <div style={{background:C.surfaceAlt,borderRadius:12,padding:14,border:`1px solid ${C.border}`}}>
                {pwdMsg&&<div style={{padding:"8px 11px",borderRadius:9,marginBottom:10,fontSize:"0.8rem",background:pwdMsg.startsWith("✅")?"#f0fdf4":"#fef2f2",color:pwdMsg.startsWith("✅")?"#059669":"#dc2626",border:`1px solid ${pwdMsg.startsWith("✅")?"#bbf7d0":"#fecaca"}`}}>{pwdMsg}</div>}
                <div style={{marginBottom:8}}><span style={css.label}>Mot de passe actuel</span><input style={{...css.input,background:"#fff"}} type="password" placeholder="••••••••" value={oldPwd} onChange={e=>setOldPwd(e.target.value)}/></div>
                <div style={{display:"flex",gap:8,marginBottom:10}}>
                  <div style={{flex:1}}><span style={css.label}>Nouveau</span><input style={{...css.input,background:"#fff"}} type="password" placeholder="Min. 6 car." value={newPwd} onChange={e=>setNewPwd(e.target.value)}/></div>
                  <div style={{flex:1}}><span style={css.label}>Confirmer</span><input style={{...css.input,background:"#fff"}} type="password" placeholder="Répéter" value={newPwd2} onChange={e=>setNewPwd2(e.target.value)}/></div>
                </div>
                <button onClick={handleChangePwd} disabled={pwdLoading} style={{...css.btnPrimary,width:"100%",opacity:pwdLoading?0.7:1}}>
                  {pwdLoading?"Mise à jour...":"Mettre à jour →"}
                </button>
              </div>
            )}

            {profile?.role==="superadmin"&&(
              <button onClick={()=>setPage&&setPage("admin")} style={{...css.btnPrimary,width:"100%",marginTop:8,display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
                ⚙️ Centre de contrôle Admin
              </button>
            )}
          </Card>

          {/* Retour accueil */}
          <button onClick={()=>setPage&&setPage("accueil")} style={{width:"100%",padding:"11px",borderRadius:12,background:C.blueLight,color:C.blue,border:`1px solid ${C.blueBorder}`,fontWeight:700,fontSize:"0.87rem",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
            🏠 Retour à l'accueil
          </button>
        </div>
      )}

      {/* ── DÉCONNEXION ── */}
      <button onClick={()=>setConfirmLogout(true)} style={{width:"100%",padding:"12px",borderRadius:12,marginTop:12,background:C.redLight,color:C.red,border:`1px solid ${C.redBorder}`,fontWeight:700,fontSize:"0.87rem",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
        🚪 Se déconnecter
      </button>

      {/* ── MODAL DEMANDE MODIFICATION NOM/EMAIL ── */}
      {changeReqModal&&(
        <div onClick={()=>setChangeReqModal(null)} style={{position:"fixed",inset:0,zIndex:3000,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:20,padding:"24px 20px",width:"100%",maxWidth:400,boxShadow:"0 24px 60px rgba(0,0,0,0.3)"}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"1rem",color:C.navy,marginBottom:6}}>
              Demander modification {changeReqModal==="name"?"du nom":"de l'email"}
            </div>
            <p style={{fontSize:"0.8rem",color:C.muted,marginBottom:14,lineHeight:1.6}}>
              Cette modification nécessite une approbation par l'équipe ARSTM. Vous serez notifié une fois traitée.
            </p>
            {changeReqDone?(
              <div style={{padding:"14px",background:"#f0fdf4",borderRadius:10,textAlign:"center",color:"#059669",fontWeight:600,fontSize:"0.87rem"}}>
                ✅ Demande envoyée ! L'équipe ARSTM la traitera sous 48h.
              </div>
            ):(
              <>
                <div style={{marginBottom:10}}>
                  <span style={css.label}>Nouveau {changeReqModal==="name"?"nom":"email"}</span>
                  <input style={{...css.input}} placeholder={changeReqModal==="name"?"Votre nouveau nom complet":"Votre nouvelle adresse email"}
                    value={changeReqVal} onChange={e=>setChangeReqVal(e.target.value)}/>
                </div>
                <div style={{marginBottom:14}}>
                  <span style={css.label}>Motif / Justification</span>
                  <textarea style={{...css.input,resize:"none",minHeight:60}} placeholder="Expliquez brièvement la raison de cette modification..."
                    value={changeReqReason} onChange={e=>setChangeReqReason(e.target.value)}/>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setChangeReqModal(null)} style={{...css.btnSecondary,flex:1}}>Annuler</button>
                  <button onClick={sendChangeRequest} disabled={!changeReqVal.trim()||changeReqSending}
                    style={{...css.btnPrimary,flex:1,opacity:(!changeReqVal.trim()||changeReqSending)?0.6:1}}>
                    {changeReqSending?"Envoi…":"Envoyer →"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL DÉCONNEXION ── */}
      {confirmLogout&&(
        <div onClick={()=>setConfirmLogout(false)} style={{position:"fixed",inset:0,zIndex:2000,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:20,padding:"28px 22px",width:"100%",maxWidth:320,textAlign:"center",boxShadow:"0 24px 60px rgba(0,0,0,0.3)"}}>
            <div style={{width:56,height:56,borderRadius:"50%",background:"#fef2f2",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.6rem",margin:"0 auto 14px"}}>👋</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"1.05rem",color:C.navy,marginBottom:6}}>Quitter ARSTM Campus ?</div>
            <p style={{fontSize:"0.82rem",color:C.muted,lineHeight:1.65,marginBottom:20}}>Vos données sont sauvegardées. Vous pouvez revenir à tout moment.</p>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setConfirmLogout(false)} style={{...css.btnSecondary,flex:1,padding:"11px"}}>Annuler</button>
              <button onClick={onLogout} style={{flex:1,padding:"11px",borderRadius:8,background:C.red,color:"#fff",border:"none",fontWeight:700,fontSize:"0.87rem",cursor:"pointer",fontFamily:"inherit"}}>Déconnecter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Composants utilitaires ────────────────────────────────────────────────────
function Card({title,children}){
  return(
    <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:16,padding:"16px 16px",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
      {title&&<div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:"0.88rem",color:C.navy,marginBottom:12}}>{title}</div>}
      {children}
    </div>
  );
}
function Field({label,val,highlight}){
  return(
    <div>
      <span style={{fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",color:C.muted,display:"block",marginBottom:3}}>{label}</span>
      <span style={{fontSize:"0.87rem",color:highlight?"#059669":C.dark,fontWeight:highlight?700:400}}>{val}</span>
    </div>
  );
}
function ContactRow({icon,label,val,green}){
  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${C.border}`}}>
      <span style={{fontSize:"0.72rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em",color:C.muted}}>{label}</span>
      <span style={{fontSize:"0.85rem",color:val?(green?"#059669":C.dark):C.muted,display:"flex",alignItems:"center",gap:5}}>
        {val?<>{icon} {val}</>:"Non renseigné"}
      </span>
    </div>
  );
}
function PrivacyToggle({pkey,label,desc,value,defaultOn,uid,privacy,reloadProfile}){
  const initial = value === undefined ? defaultOn : value;
  const [on,setOn]=useState(initial);
  const [saving,setSaving]=useState(false);
  const toggle=async()=>{
    const next=!on;
    setOn(next); setSaving(true);
    try {
      await updateDocument("users",uid,{ privacy:{ ...(privacy||{}), [pkey]:next } });
      if(reloadProfile) await reloadProfile(uid);
    } catch(_){ setOn(!next); }
    setSaving(false);
  };
  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid #f8fafc`}}>
      <div><div style={{fontSize:"0.85rem",color:C.dark,fontWeight:500}}>{label}</div><div style={{fontSize:"0.74rem",color:C.muted,marginTop:1}}>{desc}</div></div>
      <button onClick={toggle} disabled={saving} style={{width:42,height:23,borderRadius:12,border:"none",cursor:"pointer",background:on?C.blue:"#e2e8f0",position:"relative",transition:"background 0.2s",flexShrink:0,opacity:saving?0.6:1}}>
        <span style={{position:"absolute",top:2.5,left:on?21:2.5,width:18,height:18,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,0.2)",transition:"left 0.2s"}}/>
      </button>
    </div>
  );
}
function Toggle({label,desc,defaultOn}){
  const [on,setOn]=useState(defaultOn);
  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid #f8fafc`}}>
      <div><div style={{fontSize:"0.85rem",color:C.dark,fontWeight:500}}>{label}</div><div style={{fontSize:"0.74rem",color:C.muted,marginTop:1}}>{desc}</div></div>
      <button onClick={()=>setOn(!on)} style={{width:42,height:23,borderRadius:12,border:"none",cursor:"pointer",background:on?C.blue:"#e2e8f0",position:"relative",transition:"background 0.2s",flexShrink:0}}>
        <span style={{position:"absolute",top:2.5,left:on?21:2.5,width:18,height:18,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,0.2)",transition:"left 0.2s"}}/>
      </button>
    </div>
  );
}