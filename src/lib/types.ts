// Types partagés pour l'app

export interface DeezerTrack {
  id: number;
  title: string;
  artist: {
    id: number;
    name: string;
  };
  album: {
    id: number;
    title: string;
    cover_small: string;
    cover_medium: string;
    cover_big: string;
  };
  duration: number;
}

export interface AnalysisResult {
  platform: "deezer" | "spotify";
  playlistId: string;
  playlistTitle?: string;
  totalTracks: number;
  matchingTracks: number;
  percentage: number;
  matchingTrackDetails: {
    title: string;
    artist: string;
    cover: string;
  }[];
}

export interface ArtistEntry {
  name: string;
  addedAt: string;
}
