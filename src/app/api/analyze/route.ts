// API route: analyse de playlist
// POST /api/analyze
// Body: { platform: "deezer"|"spotify", url: string, token?: string, level?: "plaintes"|"condamné"|"non lieu" }

import { NextRequest, NextResponse } from "next/server";
import { analyzeDeezerPlaylist } from "@/lib/deezer";
import { analyzeSpotifyPlaylist } from "@/lib/spotify";
import { getArtists } from "@/lib/blob";
import { ArtistLevel } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, url, level } = body;

    if (!url) {
      return NextResponse.json({ error: "URL de playlist requise" }, { status: 400 });
    }

    if (platform !== "deezer" && platform !== "spotify") {
      return NextResponse.json(
        { error: "Plateforme invalide. Choisissez Deezer ou Spotify." },
        { status: 400 }
      );
    }

    // Valider le niveau de filtre
    const validLevels: ArtistLevel[] = ["plaintes", "condamné", "non lieu"];
    const filterLevel: ArtistLevel | undefined = validLevels.includes(level)
      ? level
      : undefined;

    const artists = await getArtists(filterLevel);

    if (artists.size === 0) {
      return NextResponse.json({
        platform,
        playlistId: "",
        playlistTitle: "",
        totalTracks: 0,
        matchingTracks: 0,
        percentage: 0,
        matchingTrackDetails: [],
        level: filterLevel,
      });
    }

    let result;
    if (platform === "spotify") {
      result = await analyzeSpotifyPlaylist(url, artists);
    } else {
      result = await analyzeDeezerPlaylist(url, artists, body.token);
    }

    return NextResponse.json({ ...result, level: filterLevel });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    const status = message.includes("non trouvée") || message.includes("privée")
      ? 404
      : message.includes("invalide")
        ? 400
        : message.includes("configuré")
          ? 500
          : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
