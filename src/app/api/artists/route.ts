// API route: gestion des artistes
// GET /api/artists - liste détaillée (noms + niveaux)
// POST /api/artists - ajoute un artiste (authentifié)
// PATCH /api/artists - modifie le niveau d'un artiste (authentifié)
// DELETE /api/artists - supprime un artiste (authentifié)

import { NextRequest, NextResponse } from "next/server";
import { getArtistsDetailed, addArtist, removeArtist, updateArtistLevel } from "@/lib/blob";
import { ArtistLevel } from "@/lib/types";

function checkAuth(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  return auth === `Bearer ${adminPassword}`;
}

export async function GET() {
  try {
    const entries = await getArtistsDetailed();
    const artists = entries
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((e) => ({ name: e.name, level: e.level }));
    return NextResponse.json({ artists });
  } catch (e) {
    return NextResponse.json(
      { error: `Erreur: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, level } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Nom d&apos;artiste requis" }, { status: 400 });
    }

    // Valider le niveau
    const validLevels: ArtistLevel[] = ["plaintes", "condamné", "non lieu"];
    const artistLevel: ArtistLevel = validLevels.includes(level) ? level : "condamné";

    const result = await addArtist(name, artistLevel);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      name: name.toLowerCase().trim(),
      level: artistLevel,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Erreur: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const { name, level } = await request.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Nom d&apos;artiste requis" }, { status: 400 });
    }

    const validLevels: ArtistLevel[] = ["plaintes", "condamné", "non lieu"];
    if (!validLevels.includes(level)) {
      return NextResponse.json({ error: "Niveau invalide" }, { status: 400 });
    }

    const result = await updateArtistLevel(name, level);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, name, level });
  } catch (e) {
    return NextResponse.json(
      { error: `Erreur: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const { name } = await request.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Nom d&apos;artiste requis" }, { status: 400 });
    }

    const result = await removeArtist(name);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, name: name.toLowerCase().trim() });
  } catch (e) {
    return NextResponse.json(
      { error: `Erreur: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}
