// Gestion des artistes via Vercel Blob Storage

import { put, list, del } from "@vercel/blob";
import { ArtistEntry, ArtistLevel } from "./types";

const ARTISTS_BLOB_PREFIX = "artists/";
const DEFAULT_ARTISTS: { name: string; level: ArtistLevel }[] = [
  { name: "the beatles", level: "condamné" },
  { name: "pink floyd", level: "condamné" },
  { name: "led zeppelin", level: "condamné" },
  { name: "david bowie", level: "condamné" },
  { name: "queen", level: "condamné" },
  { name: "radiohead", level: "condamné" },
  { name: "nirvana", level: "condamné" },
  { name: "metallica", level: "condamné" },
  { name: "iron maiden", level: "condamné" },
  { name: "black sabbath", level: "condamné" },
];

function blobKey(name: string): string {
  return `${ARTISTS_BLOB_PREFIX}${name.toLowerCase().trim()}.json`;
}

function blobKeyToName(key: string): string {
  return key.replace(ARTISTS_BLOB_PREFIX, "").replace(".json", "");
}

async function getArtistEntries(): Promise<ArtistEntry[]> {
  try {
    const { blobs } = await list({ prefix: ARTISTS_BLOB_PREFIX });
    if (blobs.length === 0) {
      await seedDefaultArtists();
      return DEFAULT_ARTISTS.map((a) => ({
        ...a,
        addedAt: new Date().toISOString(),
      }));
    }

    // Lire chaque blob pour récupérer le niveau
    // Pour les anciens blobs sans level, défaut = "condamné"
    const entries: ArtistEntry[] = [];
    for (const blob of blobs) {
      const name = blobKeyToName(blob.pathname);
      try {
        const res = await fetch(blob.url);
        const data = await res.json();
        entries.push({
          name,
          level: data.level || "condamné",
          addedAt: data.addedAt || new Date().toISOString(),
        });
      } catch {
        entries.push({
          name,
          level: "condamné",
          addedAt: new Date().toISOString(),
        });
      }
    }
    return entries;
  } catch {
    return DEFAULT_ARTISTS.map((a) => ({
      ...a,
      addedAt: new Date().toISOString(),
    }));
  }
}

async function seedDefaultArtists(): Promise<void> {
  for (const artist of DEFAULT_ARTISTS) {
    const entry: ArtistEntry = {
      name: artist.name,
      level: artist.level,
      addedAt: new Date().toISOString(),
    };
    await put(blobKey(artist.name), JSON.stringify(entry), {
      access: "private",
      contentType: "application/json",
    });
  }
}

/**
 * Retourne le set de noms d'artistes (pour la compatibilité existante).
 * Si level est spécifié, filtre par niveau.
 */
export async function getArtists(level?: ArtistLevel): Promise<Set<string>> {
  const entries = await getArtistEntries();
  if (level) {
    return new Set(entries.filter((e) => e.level === level).map((e) => e.name));
  }
  return new Set(entries.map((e) => e.name));
}

/**
 * Retourne la liste complète avec les niveaux (pour l'admin et la page publique).
 */
export async function getArtistsDetailed(): Promise<ArtistEntry[]> {
  return getArtistEntries();
}

export async function addArtist(
  name: string,
  level: ArtistLevel = "condamné"
): Promise<{ success: boolean; error?: string }> {
  const trimmed = name.toLowerCase().trim();
  if (!trimmed) return { success: false, error: "Nom d&apos;artiste vide" };

  try {
    const existing = await getArtists();
    if (existing.has(trimmed)) {
      return { success: false, error: "Cet artiste est déjà dans la liste" };
    }

    const entry: ArtistEntry = {
      name: trimmed,
      level,
      addedAt: new Date().toISOString(),
    };
    await put(blobKey(trimmed), JSON.stringify(entry), {
      access: "private",
      contentType: "application/json",
    });
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: `Erreur lors de l&apos;ajout: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

export async function updateArtistLevel(
  name: string,
  level: ArtistLevel
): Promise<{ success: boolean; error?: string }> {
  const trimmed = name.toLowerCase().trim();
  if (!trimmed) return { success: false, error: "Nom d&apos;artiste vide" };

  try {
    const entries = await getArtistEntries();
    const existing = entries.find((e) => e.name === trimmed);
    if (!existing) {
      return { success: false, error: "Artiste non trouvé" };
    }

    const entry: ArtistEntry = {
      ...existing,
      level,
    };
    await put(blobKey(trimmed), JSON.stringify(entry), {
      access: "private",
      contentType: "application/json",
    });
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: `Erreur lors de la mise à jour: ${e instanceof Error ? e.message : String(e)}`,
    };
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
    return {
      success: false,
      error: `Erreur lors de la suppression: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

export async function importArtists(
  items: { name: string; level: ArtistLevel }[]
): Promise<{ added: number; errors: string[] }> {
  let added = 0;
  const errors: string[] = [];

  for (const item of items) {
    const result = await addArtist(item.name, item.level);
    if (result.success) {
      added++;
    } else if (result.error && !result.error.includes("déjà dans la liste")) {
      errors.push(`${item.name}: ${result.error}`);
    }
  }

  return { added, errors };
}
