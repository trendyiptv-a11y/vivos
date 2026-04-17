"use client"

import { useEffect } from "react"
import { Capacitor } from "@capacitor/core"
import { App as CapacitorApp } from "@capacitor/app"
import { Network } from "@capacitor/network"

function emitRuntimeEvent(name: string, detail: Record<string, unknown>) {
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }))
  } catch (error) {
    console.error(`Runtime bridge event error for ${name}:`, error)
  }
}

export default function NativeRuntimeBridge() {
  const isNativePlatform = Capacitor.isNativePlatform()

  useEffect(() => {
    if (!isNativePlatform) {
      return
    }

    let appStateListener: any
    let appRestoredListener: any
    let networkStatusListener: any

    const syncInitialNetworkState = async () => {
      try {
        const status = await Network.getStatus()
        emitRuntimeEvent("vivos:network-change", {
          connected: status.connected,
          connectionType: status.connectionType,
          source: "initial",
        })
      } catch (error) {
        console.error("Initial network state error:", error)
      }
    }

    const initRuntimeBridge = async () => {
      try {
        appStateListener = await CapacitorApp.addListener("appStateChange", ({ isActive }) => {
          emitRuntimeEvent(isActive ? "vivos:app-active" : "vivos:app-background", {
            isActive,
            source: "appStateChange",
          })
        })

        appRestoredListener = await CapacitorApp.addListener("appRestoredResult", (payload) => {
          emitRuntimeEvent("vivos:app-restored", {
            payload,
            source: "appRestoredResult",
          })
        })

        networkStatusListener = await Network.addListener("networkStatusChange", (status) => {
          emitRuntimeEvent("vivos:network-change", {
            connected: status.connected,
            connectionType: status.connectionType,
            source: "networkStatusChange",
          })
        })

        await syncInitialNetworkState()
      } catch (error) {
        console.error("Native runtime bridge init error:", error)
      }
    }

    initRuntimeBridge()

    return () => {
      appStateListener?.remove?.()
      appRestoredListener?.remove?.()
      networkStatusListener?.remove?.()
    }
  }, [isNativePlatform])

  return null
}
