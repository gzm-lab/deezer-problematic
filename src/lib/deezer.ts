// Logique API Deezer - utilise l'endpoint /tracks pour éviter la limite 393

import { DeezerTrack, AnalysisResult } from "./types";

const DEEZER_API = "https://api.deezer.com";

interface DeezerPlaylistResponse {
  id: number;
  title: string;
  error?: { type: string; message: string; code: number } | unknown;
  tracks?: {
    data: DeezerTrack[];
    next?: string;
  };
}

interface DeezerTracksResponse {
  data?: DeezerTrack[];
  next?: string;
  total?: number;
  error?: unknown;
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
  if (url.includes("link.deezer.com") || url.includes("dzr.page.link")) {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    const finalUrl = res.url;
    if (finalUrl && !finalUrl.includes("link.deezer.com")) {
      return finalUrl;
    }
  }
  return url;
}

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

  // Étape 1: récupérer le nom de la playlist
  const infoRes = await fetch(`${DEEZER_API}/playlist/${playlistId}?${params}`);
  if (!infoRes.ok) {
    if (infoRes.status === 404) {
      throw new Error("Playlist non trouvée ou privée. Essayez avec un token d&apos;accès.");
    }
    throw new Error(`Erreur API Deezer: ${infoRes.status}`);
  }
  const infoData: DeezerPlaylistResponse = await infoRes.json();
  if (infoData.error) {
    const msg = typeof infoData.error === "object" && infoData.error !== null && "message" in infoData.error
      ? (infoData.error as { message: string }).message
      : String(infoData.error);
    throw new Error(`Erreur API Deezer: ${msg}`);
  }
  const playlistTitle = infoData.title || "";

  // Étape 2: récupérer TOUS les titres via le endpoint /tracks avec pagination
  const tracks: DeezerTrack[] = [];
  const limit = 2000; // Deezer supporte jusqu'à 2000 par page
  let index = 0;

  while (true) {
    const trackParams = new URLSearchParams(params);
    trackParams.set("limit", String(limit));
    trackParams.set("index", String(index));

    const trackUrl = `${DEEZER_API}/playlist/${playlistId}/tracks?${trackParams}`;
    const res = await fetch(trackUrl);
    if (!res.ok) {
      throw new Error(`Erreur API Deezer tracks: ${res.status}`);
    }

    const data: DeezerTracksResponse = await res.json();
    if (data.error) {
      throw new Error(`Erreur API Deezer: ${JSON.stringify(data.error)}`);
    }

    if (data.data) {
      tracks.push(...data.data);
    }

    // Suivre la pagination via next s'il existe
    if (data.next) {
      const nextUrl = new URL(data.next);
      const nextIndex = nextUrl.searchParams.get("index");
      if (nextIndex) {
        index = parseInt(nextIndex, 10);
        continue;
      }
    }

    // Plus de pages
    break;
  }

  return { tracks, title: playlistTitle };
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
