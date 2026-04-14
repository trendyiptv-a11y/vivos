import { initializeApp, getApps } from "firebase/app"
import { getMessaging, isSupported } from "firebase/messaging"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "vivos-3bfba.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "vivos-3bfba.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
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
