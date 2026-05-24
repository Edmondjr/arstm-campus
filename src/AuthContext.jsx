import { createContext, useContext, useState, useEffect } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
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

  async function register({ email, password, nom, prenom, role, promo }) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const data = {
      uid: cred.user.uid, email, nom, prenom,
      name: `${prenom} ${nom}`, role, promo: promo || "",
      status: "pending", createdAt: serverTimestamp(),
      avatar: `${prenom[0]}${nom[0]}`.toUpperCase(),
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
      setUser(cred.user);
    }
    return cred.user;
  }

  async function reloadProfile(uid) {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) setProfile(snap.data());
  }

  async function logout() {
    await signOut(auth);
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, register, login, logout, reloadProfile }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}