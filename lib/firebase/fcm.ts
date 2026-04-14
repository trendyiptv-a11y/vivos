import { getApp, getApps, initializeApp } from "firebase/app"
import { getMessaging, getToken, isSupported } from "firebase/messaging"

const firebaseConfig = {
  apiKey: "AIzaSyBSzmSeANo-20hyoYdKjDqNcMiCY6NHK7o",
  authDomain: "vivos-3bfba.firebaseapp.com",
  projectId: "vivos-3bfba",
  storageBucket: "vivos-3bfba.firebasestorage.app",
  messagingSenderId: "631514497195",
  appId: "1:631514497195:web:6c0c9b17e24379a75a77ee",
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
