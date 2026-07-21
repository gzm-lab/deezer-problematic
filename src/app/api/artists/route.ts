// API route: gestion des artistes
// GET /api/artists - liste tous les artistes
// POST /api/artists - ajoute un artiste (authentifié)
// DELETE /api/artists - supprime un artiste (authentifié)

import { NextRequest, NextResponse } from "next/server";
import { getArtists, addArtist, removeArtist } from "@/lib/blob";

function checkAuth(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  return auth === `Bearer ${adminPassword}`;
}

export async function GET() {
  try {
    const artists = await getArtists();
    return NextResponse.json({ artists: Array.from(artists).sort() });
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
    const { name } = await request.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Nom d&apos;artiste requis" }, { status: 400 });
    }

    const result = await addArtist(name);
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
