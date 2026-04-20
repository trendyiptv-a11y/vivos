export const vivosTheme = {
  colors: {
    bgPrimary: "#173F72",
    bgSecondary: "#214A80",
    bgDeep: "#122E54",
    panel: "#1B3560",
    panelSoft: "#24497D",

    white: "#F2F2F2",
    whiteSoft: "#E8E8E8",

    yellow: "#F8C13A",
    orange: "#F79A42",

    pink: "#C96AA1",
    purple: "#9A71C1",

    blueLight: "#63A6E6",
    teal: "#45BFD2",

    arcBlueLeft: "#4C86C9",
    arcBlueRight: "#5E95D3",

    success: "#34D399",
    danger: "#F87171",
    dangerStrong: "#EF4444",
    warning: "#FBBF24",

    textPrimary: "#FFFFFF",
    textSoft: "rgba(255,255,255,0.82)",
    textMuted: "rgba(255,255,255,0.60)",
    textFaint: "rgba(255,255,255,0.38)",

    borderSoft: "rgba(255,255,255,0.08)",
    borderMedium: "rgba(255,255,255,0.12)",
    surfaceGlass: "rgba(255,255,255,0.07)",
    surfaceGlassStrong: "rgba(255,255,255,0.10)",
    overlayDark: "rgba(0,0,0,0.65)",
  },

  gradients: {
    appBackground:
      "radial-gradient(circle at top, rgba(99,166,230,0.16), transparent 28%), linear-gradient(180deg, #173F72 0%, #163865 48%, #122E54 100%)",

    headerBackground: "rgba(23, 63, 114, 0.84)",
    footerBackground: "rgba(23, 63, 114, 0.90)",

    avatarPrimary:
      "linear-gradient(135deg, #C96AA1 0%, #9A71C1 55%, #63A6E6 100%)",

    bubbleMine:
      "linear-gradient(135deg, #C96AA1 0%, #9A71C1 52%, #63A6E6 100%)",

    sendButton:
      "linear-gradient(135deg, #F8C13A 0%, #F79A42 100%)",

    incomingCall:
      "linear-gradient(135deg, #C96AA1 0%, #9A71C1 100%)",

    connectedCall:
      "linear-gradient(135deg, #45BFD2 0%, #63A6E6 100%)",

    outgoingCall:
      "linear-gradient(135deg, #4C86C9 0%, #214A80 100%)",

    dangerButton:
      "linear-gradient(135deg, #F87171 0%, #EF4444 100%)",

    panelStrong:
      "linear-gradient(180deg, rgba(27,53,96,0.98) 0%, rgba(19,39,71,0.98) 100%)",
  },

  shadows: {
    soft: "0 8px 20px rgba(10, 18, 36, 0.18)",
    medium: "0 10px 25px rgba(8, 20, 40, 0.35)",
    bubble: "0 8px 20px rgba(20, 30, 60, 0.28)",
    buttonWarm: "0 12px 24px rgba(70, 40, 0, 0.28)",
    modal: "0 24px 48px rgba(0,0,0,0.42)",
    avatar: "0 16px 36px rgba(0,0,0,0.28)",
  },

  radii: {
    xl: "1rem",
    xxl: "1.25rem",
    pill: "9999px",
    card: "2rem",
    bubble: "18px",
    bubbleTail: "6px",
  },

  styles: {
    appShell: {
      background:
        "radial-gradient(circle at top, rgba(99,166,230,0.16), transparent 28%), linear-gradient(180deg, #173F72 0%, #163865 48%, #122E54 100%)",
      color: "#FFFFFF",
    },

    header: {
      background: "rgba(23, 63, 114, 0.84)",
      borderColor: "rgba(255,255,255,0.08)",
    },

    footer: {
      background: "rgba(23, 63, 114, 0.90)",
      borderColor: "rgba(255,255,255,0.08)",
    },

    menuPanel: {
      background: "rgba(28, 58, 103, 0.98)",
      borderColor: "rgba(255,255,255,0.10)",
      boxShadow: "0 24px 48px rgba(0,0,0,0.42)",
    },

    cardPanel: {
      background: "rgba(255,255,255,0.07)",
      borderColor: "rgba(255,255,255,0.09)",
      boxShadow: "0 8px 20px rgba(10, 18, 36, 0.18)",
    },

    bubbleMine: {
      background:
        "linear-gradient(135deg, #C96AA1 0%, #9A71C1 52%, #63A6E6 100%)",
      boxShadow: "0 8px 20px rgba(20, 30, 60, 0.28)",
      color: "#FFFFFF",
    },

    bubbleOther: {
      background: "rgba(255,255,255,0.07)",
      borderColor: "rgba(255,255,255,0.09)",
      boxShadow: "0 8px 20px rgba(10, 18, 36, 0.18)",
      color: "rgba(255,255,255,0.92)",
    },

    input: {
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(255,255,255,0.08)",
      color: "#FFFFFF",
    },

    sendButton: {
      background: "linear-gradient(135deg, #F8C13A 0%, #F79A42 100%)",
      color: "#FFFFFF",
      boxShadow: "0 12px 24px rgba(70, 40, 0, 0.28)",
    },

    primaryAvatar: {
      background:
        "linear-gradient(135deg, #C96AA1 0%, #9A71C1 55%, #63A6E6 100%)",
      color: "#FFFFFF",
      boxShadow: "0 10px 25px rgba(8, 20, 40, 0.35)",
    },

    connectedStatus: {
      background: "#34D399",
    },

    offlineBanner: {
      borderColor: "rgba(248,193,58,0.24)",
      background: "rgba(248,193,58,0.12)",
      color: "#FFE28A",
    },

    warningBanner: {
      borderColor: "rgba(247,154,66,0.25)",
      background: "rgba(247,154,66,0.12)",
      color: "#FFD0A0",
    },

    callOverlay: {
      background: "rgba(0,0,0,0.65)",
    },

    callModal: {
      background: "linear-gradient(180deg, rgba(27,53,96,0.98) 0%, rgba(19,39,71,0.98) 100%)",
      borderColor: "rgba(255,255,255,0.10)",
      boxShadow: "0 24px 48px rgba(0,0,0,0.42)",
    },

    callAvatarIncoming: {
      background: "linear-gradient(135deg, #C96AA1 0%, #9A71C1 100%)",
      color: "#FFFFFF",
      boxShadow: "0 16px 36px rgba(0,0,0,0.28)",
    },

    callAvatarConnected: {
      background: "linear-gradient(135deg, #45BFD2 0%, #63A6E6 100%)",
      color: "#FFFFFF",
      boxShadow: "0 16px 36px rgba(0,0,0,0.28)",
    },

    callAvatarOutgoing: {
      background: "linear-gradient(135deg, #4C86C9 0%, #214A80 100%)",
      color: "#FFFFFF",
      boxShadow: "0 16px 36px rgba(0,0,0,0.28)",
    },

    acceptCallButton: {
      background: "linear-gradient(135deg, #45BFD2 0%, #63A6E6 100%)",
      color: "#FFFFFF",
    },

    rejectCallButton: {
      borderColor: "rgba(248,113,113,0.25)",
      background: "rgba(248,113,113,0.12)",
      color: "#FCA5A5",
    },

    endCallButton: {
      background: "linear-gradient(135deg, #F87171 0%, #EF4444 100%)",
      color: "#FFFFFF",
    },
  },
} as const

export type VivosTheme = typeof vivosTheme

export function getVivosAvatarGradient(seed?: string | null) {
  if (!seed) return vivosTheme.gradients.avatarPrimary

  const normalized = seed.trim().toLowerCase()
  const first = normalized.charCodeAt(0) || 0

  if (first % 4 === 0) {
    return "linear-gradient(135deg, #C96AA1 0%, #9A71C1 55%, #63A6E6 100%)"
  }
  if (first % 4 === 1) {
    return "linear-gradient(135deg, #45BFD2 0%, #63A6E6 100%)"
  }
  if (first % 4 === 2) {
    return "linear-gradient(135deg, #F8C13A 0%, #F79A42 100%)"
  }
  return "linear-gradient(135deg, #4C86C9 0%, #9A71C1 100%)"
}
