// Logique API Spotify — utilise refresh token (Authorization Code flow)
// Utilise l'API moderne avec additional_types=track

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
  type: string;
  track: boolean;
  name: string;
  artists: SpotifyArtist[];
  album: {
    images: SpotifyImage[];
  };
}

interface SpotifyPlaylistItem {
  item: SpotifyTrackObject | null;
}

interface SpotifyPlaylistItems {
  href: string;
  items: SpotifyPlaylistItem[];
  limit: number;
  next: string | null;
  offset: number;
  total: number;
}

// Cache des tokens d'accès
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Spotify non configuré. Ajoute SPOTIFY_CLIENT_ID et SPOTIFY_CLIENT_SECRET dans les variables d&apos;environnement."
    );
  }

  if (!refreshToken) {
    throw new Error(
      "SPOTIFY_REFRESH_TOKEN manquant. Va sur /api/spotify/login pour t&apos;authentifier."
    );
  }

  const res = await fetch(SPOTIFY_AUTH, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(
      `Erreur refresh token Spotify. Le token a peut-être expiré — refais l&apos;authentification sur /api/spotify/login`
    );
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

async function fetchAllPlaylistTracks(
  playlistId: string,
  accessToken: string
): Promise<{ tracks: SpotifyTrackObject[]; title: string }> {
  // Utiliser additional_types=track pour obtenir les pistes dans le endpoint playlist
  let url: string | null =
    `${SPOTIFY_API}/playlists/${playlistId}?additional_types=track&market=FR`;

  const tracks: SpotifyTrackObject[] = [];
  let title = "";

  while (url) {
    const res: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error("Playlist Spotify non trouvée. Vérifie l&apos;URL.");
      }
      if (res.status === 403) {
        throw new Error(
          "Accès refusé. La playlist est peut-être privée et tu n&apos;en es pas le propriétaire."
        );
      }
      throw new Error(`Erreur API Spotify: ${res.status}`);
    }

    const data = await res.json() as Record<string, unknown>;

    if (data.name && !title) {
      title = data.name as string;
    }

    // Avec additional_types=track, les pistes sont dans data.items (pas data.tracks)
    const items = data.items as SpotifyPlaylistItems | undefined;
    if (items?.items) {
      for (const playlistItem of items.items) {
        if (playlistItem.item && playlistItem.item.type === "track") {
          tracks.push(playlistItem.item);
        }
      }
    }

    // Pagination via items.next
    url = items?.next || null;
  }

  return { tracks, title };
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
    if (!track.artists) continue;
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
