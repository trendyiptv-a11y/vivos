import { initializeApp, getApps } from "firebase/app"
import { getMessaging, isSupported } from "firebase/messaging"

const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

export function getFirebaseApp() {
  if (getApps().length > 0) return getApps()[0]
  return initializeApp(firebaseConfig)
}

export async function getFirebaseMessaging() {
  const supported = await isSupported()
  if (!supported) return null
  const app = getFirebaseApp()
  return getMessaging(app)
}
