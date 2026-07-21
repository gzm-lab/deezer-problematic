// API route: analyse de playlist
// POST /api/analyze
// Body: { platform: "deezer"|"spotify", url: string, token?: string }

import { NextRequest, NextResponse } from "next/server";
import { analyzeDeezerPlaylist } from "@/lib/deezer";
import { getArtists } from "@/lib/blob";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, url } = body;

    if (!url) {
      return NextResponse.json({ error: "URL de playlist requise" }, { status: 400 });
    }

    if (platform === "spotify") {
      return NextResponse.json(
        { error: "Spotify n&apos;est pas encore supporté. Bientôt disponible !" },
        { status: 501 }
      );
    }

    if (platform !== "deezer") {
      return NextResponse.json({ error: "Plateforme invalide. Choisissez Deezer ou Spotify." }, { status: 400 });
    }

    const artists = await getArtists();
    const result = await analyzeDeezerPlaylist(url, artists, body.token);

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    const status =
      message.includes("Playlist non trouvée") ? 404 :
      message.includes("invalide") ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
