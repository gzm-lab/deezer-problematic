// Logique API Deezer - port du code Python existant

import { DeezerTrack, AnalysisResult } from "./types";

const DEEZER_API = "https://api.deezer.com";

// Types internes pour les réponses de l'API Deezer
interface DeezerPlaylistResponse {
  id: number;
  title: string;
  error?: { type: string; message: string; code: number } | unknown;
  tracks?: {
    data: DeezerTrack[];
    next?: string;
  };
}

export function extractPlaylistId(url: string): string {
  const parts = url.trim().replace(/\/$/, "").split("/");
  const idx = parts.indexOf("playlist");
  if (idx === -1 || idx + 1 >= parts.length) {
    throw new Error("URL Deezer invalide : impossible de trouver l&apos;ID de la playlist");
  }
  return parts[idx + 1];
}

async function resolveShortLink(url: string): Promise<string> {
  // Les liens courts Deezer (link.deezer.com) redirigent vers l'URL canonique
  if (url.includes("link.deezer.com") || url.includes("dzr.page.link")) {
    const res = await fetch(url, { method: "HEAD", redirect: "manual" });
    const location = res.headers.get("location");
    if (location) return location;
  }
  return url;
}

/**
 * Extrait l'ID d'une playlist Deezer depuis n'importe quel format d'URL.
 * Supporte les URLs canoniques, les liens courts, et les URLs avec query params.
 */
async function resolvePlaylistId(playlistUrl: string): Promise<string> {
  const resolved = await resolveShortLink(playlistUrl);
  return extractPlaylistId(resolved);
}

export async function fetchPlaylistTracks(playlistId: string, accessToken?: string): Promise<{
  tracks: DeezerTrack[];
  title: string;
}> {
  const params = new URLSearchParams();
  if (accessToken) params.set("access_token", accessToken);

  let url: string | null = `${DEEZER_API}/playlist/${playlistId}?${params}`;
  const tracks: DeezerTrack[] = [];
  let playlistTitle = "";

  try {
    while (url) {
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Playlist non trouvée ou privée. Essayez avec un token d&apos;accès.");
        }
        throw new Error(`Erreur API Deezer: ${res.status} ${res.statusText}`);
      }

      const data: DeezerPlaylistResponse = await res.json();

      if (data.error) {
        const msg = typeof data.error === "object" && data.error !== null && "message" in data.error
          ? (data.error as { message: string }).message
          : String(data.error);
        throw new Error(`Erreur API Deezer: ${msg}`);
      }

      if (data.title && !playlistTitle) {
        playlistTitle = data.title;
      }

      if (data.tracks) {
        if (data.tracks.data) {
          tracks.push(...data.tracks.data);
        }
        url = data.tracks.next || null;
      } else {
        break;
      }
    }

    return { tracks, title: playlistTitle };
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Erreur API Deezer")) {
      throw e;
    }
    throw new Error(`Impossible de récupérer la playlist ${playlistId}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export function countMatches(tracks: DeezerTrack[], targetArtists: Set<string>): {
  count: number;
  details: { title: string; artist: string; cover: string }[];
} {
  let count = 0;
  const details: { title: string; artist: string; cover: string }[] = [];

  for (const track of tracks) {
    if (track.artist?.name) {
      const artistName = track.artist.name.toLowerCase().trim();
      if (targetArtists.has(artistName)) {
        count++;
        details.push({
          title: track.title || "Inconnu",
          artist: track.artist.name,
          cover: track.album?.cover_medium || "",
        });
      }
    }
  }

  return { count, details };
}

export async function analyzeDeezerPlaylist(
  playlistUrl: string,
  targetArtists: Set<string>,
  accessToken?: string
): Promise<AnalysisResult> {
  const playlistId = await resolvePlaylistId(playlistUrl);
  const { tracks, title } = await fetchPlaylistTracks(playlistId, accessToken);
  const { count, details } = countMatches(tracks, targetArtists);

  return {
    platform: "deezer",
    playlistId,
    playlistTitle: title,
    totalTracks: tracks.length,
    matchingTracks: count,
    percentage: tracks.length > 0 ? Math.round((count / tracks.length) * 100 * 10) / 10 : 0,
    matchingTrackDetails: details,
  };
}
