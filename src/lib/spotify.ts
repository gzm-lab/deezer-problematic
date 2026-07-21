// Logique API Spotify

import { AnalysisResult } from "./types";

const SPOTIFY_API = "https://api.spotify.com/v1";
const SPOTIFY_AUTH = "https://accounts.spotify.com/api/token";

// Types pour les réponses Spotify
interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

interface SpotifyArtist {
  name: string;
  id: string;
}

interface SpotifyTrack {
  name: string;
  artists: SpotifyArtist[];
  album: {
    name: string;
    images: SpotifyImage[];
  };
  duration_ms: number;
}

interface SpotifyPlaylistTrackItem {
  track: SpotifyTrack | null;
}

interface SpotifyPlaylistTracksResponse {
  items: SpotifyPlaylistTrackItem[];
  total: number;
  limit: number;
  offset: number;
  next: string | null;
}

interface SpotifyPlaylistResponse {
  name: string;
  tracks: SpotifyPlaylistTracksResponse;
}

// Cache du token d'accès (en mémoire, réutilisé entre appels dans la même instance)
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Réutiliser le token en cache s'il est encore valide (marge de 60s)
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
  // Formats supportés :
  // https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
  // https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=...
  const cleaned = url.trim().split("?")[0]; // Enlever les query params
  const parts = cleaned.replace(/\/$/, "").split("/");
  const idx = parts.indexOf("playlist");
  if (idx === -1 || idx + 1 >= parts.length) {
    throw new Error("URL Spotify invalide : impossible de trouver l&apos;ID de la playlist");
  }
  return parts[idx + 1];
}

async function fetchAllPlaylistTracks(
  playlistId: string,
  accessToken: string
): Promise<{ tracks: SpotifyTrack[]; title: string }> {
  // D'abord récupérer les infos de la playlist
  const playlistRes = await fetch(`${SPOTIFY_API}/playlists/${playlistId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!playlistRes.ok) {
    if (playlistRes.status === 404) {
      throw new Error("Playlist Spotify non trouvée. Vérifie l&apos;URL ou les droits d&apos;accès.");
    }
    throw new Error(`Erreur API Spotify: ${playlistRes.status}`);
  }

  const playlistData: SpotifyPlaylistResponse = await playlistRes.json();
  const title = playlistData.name;

  // Paginer pour récupérer tous les titres
  const tracks: SpotifyTrack[] = [];
  let url: string | null = `${SPOTIFY_API}/playlists/${playlistId}/tracks?limit=100&offset=0`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Erreur API Spotify (tracks): ${res.status}`);
    }

    const data: SpotifyPlaylistTracksResponse = await res.json();

    for (const item of data.items) {
      if (item.track) {
        tracks.push(item.track);
      }
    }

    url = data.next;
  }

  return { tracks, title };
}

export function spotifyCountMatches(
  tracks: SpotifyTrack[],
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
        break; // Ne compter qu'une fois par titre
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
