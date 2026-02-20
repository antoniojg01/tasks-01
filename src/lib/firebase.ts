import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBX9DWu5WQtDXNcJr9JIVzu_iX-O3m4QZI",
  authDomain: "tasks-tdah-80693786-e8e12.firebaseapp.com",
  databaseURL: "https://tasks-tdah-80693786-e8e12-default-rtdb.firebaseio.com",
  projectId: "tasks-tdah-80693786-e8e12",
  storageBucket: "tasks-tdah-80693786-e8e12.firebasestorage.app",
  messagingSenderId: "137156323782",
  appId: "1:137156323782:web:6379b611a0755dfef3aac7"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
