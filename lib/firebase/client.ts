import { initializeApp, getApps } from "firebase/app"
import { getMessaging, isSupported } from "firebase/messaging"

const firebaseConfig = {
  apiKey: "AIzaSyBSzmSeANo-20hyoYdKjDqNcMiCY6NHK7o",
  authDomain: "vivos-3bfba.firebaseapp.com",
  projectId: "vivos-3bfba",
  storageBucket: "vivos-3bfba.firebasestorage.app",
  messagingSenderId: "631514497195",
  appId: "1:631514497195:web:6c0c9b17e24379a75a77ee"
}

function assertFirebaseConfig() {
  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    throw new Error(`Firebase config incomplet. Lipsesc: ${missing.join(", ")}`)
  }
}

export function getFirebaseApp() {
  assertFirebaseConfig()
  if (getApps().length > 0) return getApps()[0]
  return initializeApp(firebaseConfig)
}

export async function getFirebaseMessaging() {
  const supported = await isSupported()
  if (!supported) return null
  const app = getFirebaseApp()
  return getMessaging(app)
}
