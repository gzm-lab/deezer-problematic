// Gestion des artistes via Vercel Blob Storage

import { put, list, del } from "@vercel/blob";
import { ArtistEntry } from "./types";

const ARTISTS_BLOB_PREFIX = "artists/";
const DEFAULT_ARTISTS = [
  "the beatles",
  "pink floyd",
  "led zeppelin",
  "david bowie",
  "queen",
  "radiohead",
  "nirvana",
  "metallica",
  "iron maiden",
  "black sabbath",
];

// On stocke chaque artiste comme un blob séparé dans artists/<name>.json
function blobKey(name: string): string {
  return `${ARTISTS_BLOB_PREFIX}${name.toLowerCase().trim()}.json`;
}

function blobKeyToName(key: string): string {
  return key.replace(ARTISTS_BLOB_PREFIX, "").replace(".json", "");
}

export async function getArtists(): Promise<Set<string>> {
  try {
    const { blobs } = await list({ prefix: ARTISTS_BLOB_PREFIX });
    if (blobs.length === 0) {
      // Initialiser avec les artistes par défaut
      await seedDefaultArtists();
      return new Set(DEFAULT_ARTISTS);
    }
    return new Set(blobs.map((b) => blobKeyToName(b.pathname)));
  } catch {
    // Si Blob n'est pas configuré (dev local), retourner les artistes par défaut
    return new Set(DEFAULT_ARTISTS);
  }
}

async function seedDefaultArtists(): Promise<void> {
  for (const artist of DEFAULT_ARTISTS) {
    const entry: ArtistEntry = { name: artist, addedAt: new Date().toISOString() };
    await put(blobKey(artist), JSON.stringify(entry), {
      access: "public",
      contentType: "application/json",
    });
  }
}

export async function addArtist(name: string): Promise<{ success: boolean; error?: string }> {
  const trimmed = name.toLowerCase().trim();
  if (!trimmed) return { success: false, error: "Nom d&apos;artiste vide" };

  try {
    const existing = await getArtists();
    if (existing.has(trimmed)) {
      return { success: false, error: "Cet artiste est déjà dans la liste" };
    }

    const entry: ArtistEntry = { name: trimmed, addedAt: new Date().toISOString() };
    await put(blobKey(trimmed), JSON.stringify(entry), {
      access: "public",
      contentType: "application/json",
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: `Erreur lors de l&apos;ajout: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function removeArtist(name: string): Promise<{ success: boolean; error?: string }> {
  const trimmed = name.toLowerCase().trim();
  if (!trimmed) return { success: false, error: "Nom d&apos;artiste vide" };

  try {
    const { blobs } = await list({ prefix: ARTISTS_BLOB_PREFIX });
    const target = blobs.find((b) => blobKeyToName(b.pathname) === trimmed);

    if (!target) {
      return { success: false, error: "Artiste non trouvé dans la liste" };
    }

    await del(target.url);
    return { success: true };
  } catch (e) {
    return { success: false, error: `Erreur lors de la suppression: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function importArtists(names: string[]): Promise<{ added: number; errors: string[] }> {
  let added = 0;
  const errors: string[] = [];

  for (const name of names) {
    const result = await addArtist(name);
    if (result.success) {
      added++;
    } else if (result.error && !result.error.includes("déjà dans la liste")) {
      errors.push(`${name}: ${result.error}`);
    }
  }

  return { added, errors };
}
