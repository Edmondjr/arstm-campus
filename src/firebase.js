import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || "AIzaSyAyp_S0bfus9A5-K-PqWW5hcXd5_bbGpA4",
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || "arstm-campus.firebaseapp.com",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || "arstm-campus",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || "arstm-campus.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1004916135001",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || "1:1004916135001:web:b755bc5b51851c73374d48",
};

const app = initializeApp(firebaseConfig);
export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);
export default app;
