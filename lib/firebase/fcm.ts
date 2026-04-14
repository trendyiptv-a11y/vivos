import { getToken } from "firebase/messaging"
import { getFirebaseMessaging } from "./client"

export async function getFCMToken(): Promise<string | null> {
  try {
    const messaging = await getFirebaseMessaging()
    if (!messaging) {
      alert("FCM Debug: messaging null - browser nu suportă")
      return null
    }

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
    if (!vapidKey) {
      alert("FCM Debug: lipsește VAPID key")
      return null
    }

    // Înregistrează explicit firebase-messaging-sw.js
    const swRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js")
    await navigator.serviceWorker.ready

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    })

    alert(`FCM Debug: token=${token || "gol"}`)
    return token || null
  } catch (error: any) {
    alert(`FCM Debug eroare: ${error?.message || JSON.stringify(error)}`)
    return null
  }
}
