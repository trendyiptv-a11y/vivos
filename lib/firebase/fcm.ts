import { getApp, getApps, initializeApp } from "firebase/app"
import { getMessaging, getToken, isSupported } from "firebase/messaging"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export async function getFCMToken(
  serviceWorkerRegistration?: ServiceWorkerRegistration
) {
  const supported = await isSupported()
  if (!supported) return null

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
  if (!vapidKey) {
    throw new Error("Lipsește NEXT_PUBLIC_FIREBASE_VAPID_KEY.")
  }

  const messaging = getMessaging(app)

  return getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration,
  })
}
