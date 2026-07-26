// Callback OAuth Spotify — renvoie au frontend avec le token
// GET /api/spotify/callback?code=...

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const state = request.nextUrl.searchParams.get("state");

  if (error || !code) {
    const msg = error === "access_denied" ? "Tu as refusé l&apos;accès Spotify." : "Pas de code reçu.";
    return NextResponse.redirect(`/?spotify_error=${encodeURIComponent(msg)}`);
  }

  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || "https://problematic.gzm.fr"}/api/spotify/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`/?spotify_error=${encodeURIComponent("Config Spotify manquante côté serveur.")}`);
    }

    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      const msg = err.error_description || err.error || `Erreur ${res.status}`;
      return NextResponse.redirect(`/?spotify_error=${encodeURIComponent(msg)}`);
    }

    const data: {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    } = await res.json();

    const expiresAt = Date.now() + data.expires_in * 1000;

    // Rediriger vers la page d'accueil avec le token dans le fragment (pas query params)
    // Le fragment évite le bug iOS "Download callback"
    const fragment = `spotify_token=${encodeURIComponent(data.access_token)}&spotify_expires=${expiresAt}`;
    return NextResponse.redirect(`/#${fragment}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.redirect(`/?spotify_error=${encodeURIComponent(msg)}`);
  }
}
