// API route: analyse de playlist
// POST /api/analyze
// Body: { platform: "deezer"|"spotify", url: string, token?: string }

import { NextRequest, NextResponse } from "next/server";
import { analyzeDeezerPlaylist } from "@/lib/deezer";
import { analyzeSpotifyPlaylist } from "@/lib/spotify";
import { getArtists } from "@/lib/blob";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, url } = body;

    if (!url) {
      return NextResponse.json({ error: "URL de playlist requise" }, { status: 400 });
    }

    if (platform !== "deezer" && platform !== "spotify") {
      return NextResponse.json({ error: "Plateforme invalide. Choisissez Deezer ou Spotify." }, { status: 400 });
    }

    const artists = await getArtists();

    if (platform === "spotify") {
      const result = await analyzeSpotifyPlaylist(url, artists);
      return NextResponse.json(result);
    }

    const result = await analyzeDeezerPlaylist(url, artists, body.token);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    const status =
      message.includes("non trouvée") || message.includes("privée") ? 404 :
      message.includes("invalide") ? 400 :
      message.includes("configuré") ? 500 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
