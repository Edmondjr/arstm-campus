import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAyp_S0bfus9A5-K-PqWW5hcXd5_bbGpA4",
  authDomain: "arstm-campus.firebaseapp.com",
  projectId: "arstm-campus",
  storageBucket: "arstm-campus.firebasestorage.app",
  messagingSenderId: "1004916135001",
  appId: "1:1004916135001:web:b755bc5b51851c73374d48"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;