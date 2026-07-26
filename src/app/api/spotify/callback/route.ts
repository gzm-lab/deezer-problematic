// Callback OAuth Spotify — renvoie au frontend avec le token
// GET /api/spotify/callback?code=...

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
    const msg = error === "access_denied"
      ? "Tu as refusé l&apos;accès Spotify."
      : "Pas de code reçu.";
    return NextResponse.redirect(`/?spotify_error=${encodeURIComponent(msg)}`);
  }

  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || "https://problematic.gzm.fr"}/api/spotify/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`/?spotify_error=${encodeURIComponent("Config Spotify manquante.")}`);
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

    // Au lieu d'un redirect HTTP (qui trigger "Download callback" sur iOS),
    // on sert une page HTML qui fait une redirection JS immédiate
    const tokenEncoded = encodeURIComponent(data.access_token);
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Redirection...</title>
<style>
  body {
    font-family: system-ui, sans-serif;
    background: #fafaf8;
    color: #2d2d2d;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    margin: 0;
    text-align: center;
  }
  .loader {
    width: 32px;
    height: 32px;
    border: 3px solid #e5e0d5;
    border-top-color: #c17f59;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 16px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  p { color: #8a8378; font-size: 14px; }
</style>
</head>
<body>
<div>
  <div class="loader"></div>
  <p>Connexion en cours...</p>
</div>
<script>
  window.location.replace('/#spotify_token=${tokenEncoded}&spotify_expires=${expiresAt}');
</script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.redirect(`/?spotify_error=${encodeURIComponent(msg)}`);
  }
}
