// Logique API Spotify

import { SpotifyTrackObject, AnalysisResult } from "./types";

const SPOTIFY_API = "https://api.spotify.com";
const SPOTIFY_ACCOUNTS = "https://accounts.spotify.com/api/token";

// Types internes
interface SpotifyPlaylistItem {
  item?: SpotifyTrackObject;
  track?: SpotifyTrackObject;
  added_at?: string;
}

interface SpotifyPlaylistItems {
  items: SpotifyPlaylistItem[];
  next: string | null;
  total: number;
}

// ---- Auth ----

async function getAccessToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Spotify non configuré. Contacte l&apos;administrateur.");
  }

  const res = await fetch(SPOTIFY_ACCOUNTS, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const data = await res.json() as { access_token: string; error?: string };

  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error === "invalid_grant"
        ? "Refresh token Spotify invalide ou expiré."
        : `Erreur auth Spotify: ${data.error || res.status}`
    );
  }

  return data.access_token;
}

// ---- Extraction ID ----

export function extractSpotifyPlaylistId(url: string): string {
  const cleaned = url.trim().split("?")[0];
  const match = cleaned.match(/playlist\/([a-zA-Z0-9]+)/);
  if (match?.[1]) return match[1];

  throw new Error("URL Spotify invalide : impossible de trouver l&apos;ID de la playlist");
}

// ---- Récupération des titres ----

function parseTrack(item: SpotifyPlaylistItem): SpotifyTrackObject | null {
  // Format avec additional_types=track : item.item
  if (item.item && item.item.type === "track") return item.item;
  // Format standard /tracks : item.track
  if (item.track) return item.track;
  return null;
}

async function fetchAllPlaylistTracks(
  playlistId: string,
  accessToken: string
): Promise<{ tracks: SpotifyTrackObject[]; title: string }> {
  // Essayer d'abord avec additional_types=track (inclut les pistes dans items)
  const playlistUrl = `${SPOTIFY_API}/playlists/${playlistId}?additional_types=track&market=FR`;

  console.log("[Spotify] Fetching:", playlistUrl);

  const firstRes = await fetch(playlistUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  console.log("[Spotify] Status:", firstRes.status);

  if (!firstRes.ok) {
    if (firstRes.status === 404) throw new Error("Playlist Spotify non trouvée.");
    if (firstRes.status === 403) throw new Error("Accès refusé. Playlist privée ?");
    throw new Error(`Erreur API Spotify: ${firstRes.status}`);
  }

  const firstData = await firstRes.json() as Record<string, unknown>;
  const title = (firstData.name as string) || "";

  const tracks: SpotifyTrackObject[] = [];

  // Traiter les items de la première réponse
  const paging = firstData.items as SpotifyPlaylistItems | undefined;
  if (paging?.items) {
    for (const item of paging.items) {
      const track = parseTrack(item);
      if (track) tracks.push(track);
    }
  }

  // Pagination parallèle si dispo
  if (paging && paging.total > 100 && paging.next) {
    const remainingPages = Math.ceil(paging.total / 100) - 1;
    const urls: string[] = [];
    for (let i = 1; i <= Math.min(remainingPages, 49); i++) {
      urls.push(
        `${SPOTIFY_API}/playlists/${playlistId}/items?offset=${i * 100}&limit=100&market=FR&additional_types=track`
      );
    }

    const batchSize = 2;
    for (let b = 0; b < urls.length; b += batchSize) {
      const batch = urls.slice(b, b + batchSize);
      const results = await Promise.allSettled(
        batch.map((url) =>
          fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
            .then(async (r) => (r.ok ? r.json() : null))
        )
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          const pageData = result.value as { items: SpotifyPlaylistItem[] };
          if (pageData.items) {
            for (const item of pageData.items) {
              const track = parseTrack(item);
              if (track) tracks.push(track);
            }
          }
        }
      }

      if (b + batchSize < urls.length) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
  }

  // Fallback: si additional_types=track n'a rien donné, essayer /tracks
  if (tracks.length === 0) {
    return fetchTracksFallback(playlistId, accessToken, title);
  }

  return { tracks, title };
}

async function fetchTracksFallback(
  playlistId: string,
  accessToken: string,
  title: string
): Promise<{ tracks: SpotifyTrackObject[]; title: string }> {
  const tracks: SpotifyTrackObject[] = [];
  let url: string | null = `${SPOTIFY_API}/playlists/${playlistId}/tracks?limit=100&market=FR`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      if (res.status === 403) break;
      throw new Error(`Erreur Spotify: ${res.status}`);
    }

    const data = await res.json() as {
      items: { track: SpotifyTrackObject }[];
      next: string | null;
    };

    if (data.items) {
      for (const item of data.items) {
        if (item.track) tracks.push(item.track);
      }
    }
    url = data.next || null;
  }

  return { tracks, title };
}

// ---- Matching ----

export function spotifyCountMatches(
  tracks: SpotifyTrackObject[],
  targetArtists: Set<string>
): {
  count: number;
  details: { title: string; artist: string; cover: string }[];
} {
  let count = 0;
  const details: { title: string; artist: string; cover: string }[] = [];

  for (const track of tracks) {
    if (!track.artists) continue;
    for (const artist of track.artists) {
      const artistName = artist.name.toLowerCase().trim();
      if (targetArtists.has(artistName)) {
        count++;
        details.push({
          title: track.name || "Inconnu",
          artist: artist.name,
          cover: track.album?.images?.[0]?.url || "",
        });
      }
    }
  }

  return { count, details };
}

// ---- Analyse ----

export async function analyzeSpotifyPlaylist(
  playlistUrl: string,
  targetArtists: Set<string>
): Promise<AnalysisResult> {
  const playlistId = extractSpotifyPlaylistId(playlistUrl);
  const accessToken = await getAccessToken();
  const { tracks, title } = await fetchAllPlaylistTracks(playlistId, accessToken);
  const { count, details } = spotifyCountMatches(tracks, targetArtists);

  return {
    platform: "spotify",
    playlistId,
    playlistTitle: title,
    totalTracks: tracks.length,
    matchingTracks: count,
    percentage: tracks.length > 0 ? Math.round((count / tracks.length) * 100 * 10) / 10 : 0,
    matchingTrackDetails: details,
  };
}
