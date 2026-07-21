// Logique API Spotify — utilise refresh token (Authorization Code flow)

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

// Cache des tokens d'accès
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Token en cache encore valide (marge de 60s)
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
    // Fallback: Client Credentials (accès limité, pas de tracks)
    throw new Error(
      "SPOTIFY_REFRESH_TOKEN manquant. Va sur /api/spotify/login pour t&apos;authentifier."
    );
  }

  // Rafraîchir avec le refresh token
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
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Erreur refresh token Spotify: ${err.error_description || err.error || res.status}. Le refresh token a peut-être expiré — refais l&apos;authentification sur /api/spotify/login`
    );
  }

  const data: { access_token: string; expires_in: number; refresh_token?: string } = await res.json();
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

async function fetchPlaylistTracks(
  playlistId: string,
  accessToken: string
): Promise<{ tracks: SpotifyTrackObject[]; title: string }> {
  // Récupérer playlist info + première page de tracks
  const playlistUrl = `${SPOTIFY_API}/playlists/${playlistId}?market=FR`;

  const playlistRes = await fetch(playlistUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!playlistRes.ok) {
    if (playlistRes.status === 404) {
      throw new Error("Playlist Spotify non trouvée. Vérifie l&apos;URL.");
    }
    if (playlistRes.status === 403) {
      throw new Error(
        "Accès refusé. La playlist est peut-être privée et tu n&apos;en es pas le propriétaire."
      );
    }
    throw new Error(`Erreur API Spotify: ${playlistRes.status}`);
  }

  const playlistData = await playlistRes.json();
  const title: string = playlistData.name || "";

  // Récupérer les tracks via le endpoint dédié (nécessite refresh token)
  const tracksUrl = `${SPOTIFY_API}/playlists/${playlistId}/tracks?market=FR&limit=100`;

  const tracksRes = await fetch(tracksUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!tracksRes.ok) {
    if (tracksRes.status === 403) {
      throw new Error(
        "Accès refusé aux titres. Vérifie que le refresh token est valide (refais /api/spotify/login)."
      );
    }
    throw new Error(`Erreur API Spotify (tracks): ${tracksRes.status}`);
  }

  const tracksData = await tracksRes.json();
  const tracks: SpotifyTrackObject[] = [];

  if (tracksData.items) {
    for (const item of tracksData.items) {
      if (item.track) {
        tracks.push(item.track);
      }
    }
  }

  // Pagination (si plus de 100 tracks)
  let nextUrl: string | null = tracksData.next;
  while (nextUrl) {
    const nextRes = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!nextRes.ok) break;

    const nextData = await nextRes.json();
    if (nextData.items) {
      for (const item of nextData.items) {
        if (item.track) tracks.push(item.track);
      }
    }
    nextUrl = nextData.next;
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
  const { tracks, title } = await fetchPlaylistTracks(playlistId, accessToken);
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
