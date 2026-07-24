// API route: liste les playlists de l'utilisateur connecté
// GET /api/spotify/playlists?token=ACCESS_TOKEN

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token Spotify requis" }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      if (res.status === 401) {
        return NextResponse.json({ error: "Token expiré, reconnecte-toi." }, { status: 401 });
      }
      return NextResponse.json(
        { error: `Erreur Spotify: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json() as {
      items: {
        id: string;
        name: string;
        images: { url: string }[];
        tracks: { total: number };
        owner: { display_name: string };
      }[];
    };

    const playlists = data.items.map((p) => ({
      id: p.id,
      name: p.name,
      image: p.images?.[0]?.url || "",
      tracks: p.tracks?.total || 0,
      owner: p.owner?.display_name || "",
    }));

    return NextResponse.json({ playlists });
  } catch (e) {
    return NextResponse.json(
      { error: `Erreur: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}
