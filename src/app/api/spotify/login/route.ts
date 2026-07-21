// Redirige vers l'auth Spotify OAuth
// GET /api/spotify/login

import { NextResponse } from "next/server";

const SCOPES = [
  "playlist-read-private",
  "playlist-read-collaborative",
].join(" ");

export async function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "SPOTIFY_CLIENT_ID non configuré" },
      { status: 500 }
    );
  }

  // Construire l'URL de callback (même domaine que la requête)
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || "https://deezer-problematic.vercel.app"}/api/spotify/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SCOPES,
    show_dialog: "true",
  });

  return NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params}`
  );
}
