// Callback OAuth Spotify — récupère le refresh token
// GET /api/spotify/callback?code=...

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
    return new NextResponse(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Erreur Spotify</title>
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <style>body{font-family:system-ui,sans-serif;background:#0a0a0b;color:#fafafa;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
      .card{background:#141416;border:1px solid #27272a;border-radius:16px;padding:32px;max-width:500px;text-align:center}
      h1{color:#ef4444;margin:0 0 8px}
      p{color:#71717a}</style></head>
      <body><div class="card"><h1>Erreur</h1><p>${error || "Pas de code reçu de Spotify"}</p></div></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || "https://deezer-problematic.vercel.app"}/api/spotify/callback`;

    if (!clientId || !clientSecret) {
      throw new Error("SPOTIFY_CLIENT_ID ou SPOTIFY_CLIENT_SECRET manquant.");
    }

    // Échanger le code contre access_token + refresh_token
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
      throw new Error(err.error_description || err.error || `HTTP ${res.status}`);
    }

    const data: {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      scope: string;
    } = await res.json();

    const refreshToken = data.refresh_token;

    if (!refreshToken) {
      throw new Error("Pas de refresh token reçu. Réessaie en t&apos;assurant que le dialogue d&apos;autorisation s&apos;affiche (show_dialog=true).");
    }

    // Afficher le refresh token à copier
    return new NextResponse(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Token Spotify</title>
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <style>body{font-family:system-ui,sans-serif;background:#0a0a0b;color:#fafafa;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
      .card{background:#141416;border:1px solid #27272a;border-radius:16px;padding:32px;max-width:550px}
      h1{color:#a855f7;margin:0 0 8px;font-size:1.5rem}
      .sub{color:#71717a;margin:0 0 24px;font-size:0.875rem}
      .token-box{background:#0a0a0b;border:1px solid #27272a;border-radius:8px;padding:16px;font-family:monospace;font-size:0.8rem;word-break:break-all;color:#c084fc;margin-bottom:16px;position:relative}
      button{background:#a855f7;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:0.875rem;font-weight:600}
      button:hover{background:#c084fc}
      .copied{color:#4ade80;font-size:0.75rem;margin-top:8px;display:none}
      .step{color:#71717a;font-size:0.8rem;margin-top:20px}
      code{background:#27272a;padding:2px 6px;border-radius:4px;font-size:0.8rem}
      </style></head>
      <body><div class="card">
        <h1>✅ Authentification réussie !</h1>
        <p class="sub">Copie ce refresh token et mets-le dans Vercel :</p>
        <div class="token-box" id="token">${refreshToken}</div>
        <button onclick="navigator.clipboard.writeText('${refreshToken}');document.getElementById('copied').style.display='block'">📋 Copier le token</button>
        <p class="copied" id="copied">✓ Copié !</p>
        <p class="step">
          ➡️ Va dans <b>Vercel → Settings → Environment Variables</b><br>
          ➡️ Ajoute <code>SPOTIFY_REFRESH_TOKEN</code> = le token ci-dessus<br>
          ➡️ Redéploie et c&apos;est bon !
        </p>
      </div></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (e) {
    return new NextResponse(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Erreur Spotify</title>
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <style>body{font-family:system-ui,sans-serif;background:#0a0a0b;color:#fafafa;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
      .card{background:#141416;border:1px solid #27272a;border-radius:16px;padding:32px;max-width:500px}
      h1{color:#ef4444;margin:0 0 8px}
      .msg{color:#71717a;word-break:break-all;font-size:0.875rem}</style></head>
      <body><div class="card"><h1>Erreur</h1><p class="msg">${e instanceof Error ? e.message : String(e)}</p></div></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}
