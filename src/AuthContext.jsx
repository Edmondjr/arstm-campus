import { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { GRADIENTS } from "./design";

const AuthContext = createContext(null);

function LoadingScreen() {
  return (
    <div style={{
      minHeight: "100vh",
      background: GRADIENTS.login,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 18,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 20,
        background: GRADIENTS.primary,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "1.8rem", fontWeight: 900, color: "#fff",
        fontFamily: "'Syne', system-ui, sans-serif",
        boxShadow: "0 8px 32px rgba(37,99,235,0.45)",
      }}>A</div>
      <div style={{
        fontFamily: "'Syne', system-ui, sans-serif",
        fontWeight: 800, fontSize: "1.4rem", color: "#fff",
        letterSpacing: "-0.02em",
      }}>
        ARSTM<span style={{ color: "#67e8f9" }}>Campus</span>
      </div>
      <div className="animate-spin" style={{
        width: 28, height: 28, borderRadius: "50%",
        border: "3px solid rgba(255,255,255,0.12)",
        borderTopColor: "#2563eb",
        marginTop: 4,
      }} />
    </div>
  );
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (snap.exists()) setProfile(snap.data());
        setUser(firebaseUser);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function register({
    email, password, nom, prenom, role,
    promo, filiere, tel, whatsapp,
    modules, ecoles, ecoleAutre, employeur, poste, service,
  }) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const data = {
      uid:        cred.user.uid,
      email,
      nom,
      prenom,
      name:       `${prenom} ${nom}`,
      role,
      promo:      promo || service || modules || "",
      filiere:    filiere    || "",
      tel:        tel        || "",
      whatsapp:   whatsapp   || "",
      modules:    modules    || "",
      ecoles:     ecoles     || [],
      ecoleAutre: ecoleAutre || "",
      employeur:  employeur  || "",
      poste:      poste      || "",
      service:    service    || "",
      status:     "pending",
      createdAt:  serverTimestamp(),
      avatar:     `${prenom[0]}${nom[0]}`.toUpperCase(),
    };
    await setDoc(doc(db, "users", cred.user.uid), data);
    await signOut(auth);
    return cred.user;
  }

  async function login(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const snap = await getDoc(doc(db, "users", cred.user.uid));
    if (snap.exists()) {
      const data = snap.data();
      if (data.status === "pending")  { await signOut(auth); throw new Error("PENDING"); }
      if (data.status === "rejected") { await signOut(auth); throw new Error("REJECTED"); }
      setProfile(data);
    }
    return cred.user;
  }

  async function logout() {
    await signOut(auth);
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, register, login, logout }}>
      {loading ? <LoadingScreen /> : children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
