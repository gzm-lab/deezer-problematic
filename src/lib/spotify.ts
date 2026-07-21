// Logique API Spotify

import { AnalysisResult } from "./types";

const SPOTIFY_API = "https://api.spotify.com/v1";
const SPOTIFY_AUTH = "https://accounts.spotify.com/api/token";

interface SpotifyImage {
  url: string;
}

interface SpotifyArtist {
  name: string;
}

interface SpotifyTrackObject {
  name: string;
  artists: SpotifyArtist[];
  album: {
    images: SpotifyImage[];
  };
}

interface SpotifyTrackItem {
  track: SpotifyTrackObject | null;
}

interface SpotifyPlaylistResponse {
  name: string;
  tracks: {
    items: SpotifyTrackItem[];
    next: string | null;
    total: number;
  };
}

// Cache du token
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Spotify non configuré. Ajoute SPOTIFY_CLIENT_ID et SPOTIFY_CLIENT_SECRET dans les variables d&apos;environnement."
    );
  }

  const res = await fetch(SPOTIFY_AUTH, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`Erreur d&apos;authentification Spotify: ${res.status}`);
  }

  const data: { access_token: string; expires_in: number } = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

export function extractSpotifyPlaylistId(url: string): string {
  const cleaned = url.trim().split("?")[0];
  const parts = cleaned.replace(/\/$/, "").split("/");
  const idx = parts.indexOf("playlist");
  if (idx === -1 || idx + 1 >= parts.length) {
    throw new Error("URL Spotify invalide : impossible de trouver l&apos;ID de la playlist");
  }
  return parts[idx + 1];
}

async function fetchPlaylistWithTracks(
  playlistId: string,
  accessToken: string
): Promise<{ tracks: SpotifyTrackObject[]; title: string; total: number }> {
  // Récupérer nom + premiers titres en un seul appel
  const url = `${SPOTIFY_API}/playlists/${playlistId}?market=FR`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("Playlist Spotify non trouvée. Vérifie l&apos;URL.");
    }
    if (res.status === 403) {
      throw new Error(
        "Accès refusé. Vérifie que ton compte Spotify est Premium et que la playlist est publique."
      );
    }
    throw new Error(`Erreur API Spotify: ${res.status}`);
  }

  const data = await res.json();

  // DEBUG: log la structure de la réponse
  console.error("SPOTIFY DEBUG - full keys:", Object.keys(data));
  console.error("SPOTIFY DEBUG - tracks keys:", data.tracks ? Object.keys(data.tracks) : "NO TRACKS");
  console.error("SPOTIFY DEBUG - tracks.items length:", data.tracks?.items?.length ?? "NO ITEMS");
  if (data.tracks?.items?.[0]) {
    console.error("SPOTIFY DEBUG - first item keys:", Object.keys(data.tracks.items[0]));
    console.error("SPOTIFY DEBUG - first item.track:", JSON.stringify(data.tracks.items[0].track)?.slice(0, 200));
  }

  const tracks: SpotifyTrackObject[] = [];
  if (data.tracks?.items) {
    for (const item of data.tracks.items) {
      if (item.track) {
        tracks.push(item.track);
      }
    }
  }

  return {
    tracks,
    title: data.name || "",
    total: data.tracks?.total || tracks.length,
  };
}

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
    for (const artist of track.artists) {
      const artistName = artist.name.toLowerCase().trim();
      if (targetArtists.has(artistName)) {
        count++;
        details.push({
          title: track.name,
          artist: artist.name,
          cover: track.album?.images?.[0]?.url || "",
        });
        break;
      }
    }
  }

  return { count, details };
}

export async function analyzeSpotifyPlaylist(
  playlistUrl: string,
  targetArtists: Set<string>
): Promise<AnalysisResult> {
  const playlistId = extractSpotifyPlaylistId(playlistUrl);
  const accessToken = await getAccessToken();
  const { tracks, title } = await fetchPlaylistWithTracks(playlistId, accessToken);
  const { count, details } = spotifyCountMatches(tracks, targetArtists);

  // Note: Spotify bloque la pagination pour les apps non-approuvées.
  // On analyse les 100 premiers titres (largement suffisant pour l'immense majorité des playlists).
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
