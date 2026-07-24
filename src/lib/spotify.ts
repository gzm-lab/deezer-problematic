// Logique API Spotify - utilise le endpoint /tracks pour une fiabilité maximale

import { SpotifyTrackObject, AnalysisResult, ArtistLevel } from "./types";

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
    throw new Error(
      "Spotify non configuré. Contacte l&apos;administrateur."
    );
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
  // Nettoie les query params
  const cleaned = url.trim().split("?")[0];

  const match = cleaned.match(/playlist\/([a-zA-Z0-9]+)/);
  if (match?.[1]) return match[1];

  throw new Error(
    "URL Spotify invalide : impossible de trouver l&apos;ID de la playlist"
  );
}

// ---- Récupération des titres ----

async function fetchAllPlaylistTracks(
  playlistId: string,
  accessToken: string
): Promise<{ tracks: SpotifyTrackObject[]; title: string }> {
  // Étape 1 : récupérer le nom de la playlist
  const infoRes = await fetch(`${SPOTIFY_API}/playlists/${playlistId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!infoRes.ok) {
    if (infoRes.status === 404) throw new Error("Playlist Spotify non trouvée.");
    if (infoRes.status === 403) throw new Error("Accès refusé. Playlist privée ?");
    throw new Error(`Erreur API Spotify: ${infoRes.status}`);
  }

  const infoData = await infoRes.json() as { name: string };
  const title = infoData.name || "";

  // Étape 2 : récupérer tous les titres via /tracks (endpoint fiable)
  const tracks: SpotifyTrackObject[] = [];
  let url: string | null = `${SPOTIFY_API}/playlists/${playlistId}/tracks?limit=100&market=FR`;

  let pages = 0;
  const MAX_PAGES = 100; // sécurité : max 10 000 titres

  while (url && pages < MAX_PAGES) {
    pages++;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      if (res.status === 403) break; // Silencieux pour les playlists restreintes
      throw new Error(`Erreur Spotify /tracks: ${res.status}`);
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
