// API route: analyse de playlist
// POST /api/analyze
// Body: { platform: "deezer"|"spotify", url: string, token?: string, level?: "plaintes"|"condamné"|"non lieu" }

import { NextRequest, NextResponse } from "next/server";
import { analyzeDeezerPlaylist } from "@/lib/deezer";
import { analyzeSpotifyPlaylist } from "@/lib/spotify";
import { getArtists } from "@/lib/blob";
import { ArtistLevel } from "@/lib/types";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "JSON invalide dans le corps de la requête" },
      { status: 400 }
    );
  }

  try {
    const platform = body.platform as string | undefined;
    const url = body.url as string | undefined;
    const level = body.level as string | undefined;
    const token = body.token as string | undefined;

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
    const filterLevel: ArtistLevel | undefined = validLevels.includes(level as ArtistLevel)
      ? (level as ArtistLevel)
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
      result = await analyzeDeezerPlaylist(url, artists, token);
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
