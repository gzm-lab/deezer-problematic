// Page callback Spotify — évite le bug iOS "Download callback"
// /spotify-auth?code=...

import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion Spotify...",
};

async function getSiteUrl(): Promise<string> {
  // Vercel exposes this at runtime
  try {
    const vc = process.env.VERCEL_URL;
    if (vc) return `https://${vc}`;
  } catch { /* */ }
  return process.env.NEXT_PUBLIC_SITE_URL || "https://problematic.gzm.fr";
}

export default async function SpotifyAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string }>;
}) {
  const { code, error } = await searchParams;
  const siteUrl = await getSiteUrl();

  if (error || !code) {
    const msg = error === "access_denied"
      ? "Tu as refusé l'accès Spotify."
      : "Pas de code reçu.";
    return <RedirectHtml url={`${siteUrl}/?spotify_error=${encodeURIComponent(msg)}`} />;
  }

  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = `${siteUrl}/spotify-auth`;

    if (!clientId || !clientSecret) {
      return <RedirectHtml url={`${siteUrl}/?spotify_error=${encodeURIComponent("Config Spotify manquante.")}`} />;
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
      return <RedirectHtml url={`${siteUrl}/?spotify_error=${encodeURIComponent(msg)}`} />;
    }

    const data = await res.json() as {
      access_token: string;
      expires_in: number;
    };

    const expiresAt = Date.now() + data.expires_in * 1000;
    const tokenEncoded = encodeURIComponent(data.access_token);
    const target = `${siteUrl}/#spotify_token=${tokenEncoded}&spotify_expires=${expiresAt}`;

    return <RedirectHtml url={target} />;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return <RedirectHtml url={`${siteUrl}/?spotify_error=${encodeURIComponent(msg)}`} />;
  }
}

function RedirectHtml({ url }: { url: string }) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Connexion...</title>
        <style>{`
          body{font-family:system-ui,sans-serif;background:#fafaf8;color:#2d2d2d;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center}
          .loader{width:32px;height:32px;border:3px solid #e5e0d5;border-top-color:#c17f59;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 16px}
          @keyframes spin{to{transform:rotate(360deg)}}
          p{color:#8a8378;font-size:14px}
        `}</style>
      </head>
      <body>
        <div>
          <div className="loader"></div>
          <p>Connexion en cours...</p>
        </div>
        <script dangerouslySetInnerHTML={{ __html: `window.location.replace(${JSON.stringify(url)});` }} />
      </body>
    </html>
  );
}
