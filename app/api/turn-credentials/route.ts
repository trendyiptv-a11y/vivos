export async function GET() {
  const response = await fetch(
    `https://${process.env.METERED_DOMAIN}/api/v1/turn/credentials?apiKey=${process.env.METERED_API_KEY}`
  )

  if (!response.ok) {
    return Response.json({ error: "TURN fetch failed" }, { status: 500 })
  }

  const iceServers = await response.json()
  return Response.json({ iceServers })
}
