// Redirige vers l'auth Spotify OAuth (user-facing)
// GET /api/spotify/login

import { NextResponse } from "next/server";

const SCOPES = [
  "playlist-read-private",
  "playlist-read-collaborative",
].join(" ");

export async function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://problematic.gzm.fr";

  if (!clientId) {
    return NextResponse.json(
      { error: "SPOTIFY_CLIENT_ID non configuré" },
      { status: 500 }
    );
  }

  const redirectUri = `${baseUrl}/spotify-auth`;

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
