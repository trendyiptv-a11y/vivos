import { getToken } from "firebase/messaging"
import { getFirebaseMessaging } from "./client"

export async function getFCMToken(): Promise<string | null> {
  try {
    const messaging = await getFirebaseMessaging()
    if (!messaging) return null

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
    if (!vapidKey) return null

    const swRegistration = await navigator.serviceWorker.register("/sw.js")
    await navigator.serviceWorker.ready

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    })

    return token || null
  } catch (error) {
    console.error("FCM token error:", error)
    return null
  }
}
