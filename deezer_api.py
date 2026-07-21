"""Deezer API module for interacting with Deezer playlists."""

import requests
from typing import List, Dict, Set


class DeezerAPI:
    """Class to interact with the Deezer API."""
    
    BASE_URL = "https://api.deezer.com"
    
    def __init__(self):
        self.session = requests.Session()
    
    def get_playlist_id_from_url(self, playlist_url: str) -> str:
        """Extract playlist ID from a Deezer playlist URL.
        
        Args:
            playlist_url: Deezer playlist URL (e.g., https://www.deezer.com/playlist/123456789)
        
        Returns:
            Playlist ID as string
        
        Raises:
            ValueError: If URL format is invalid
        """
        # Extract ID from URL like https://www.deezer.com/playlist/123456789
        parts = playlist_url.strip("/").split("/")
        if "playlist" not in parts:
            raise ValueError(f"Invalid Deezer playlist URL: {playlist_url}")
        
        playlist_id_index = parts.index("playlist") + 1
        if playlist_id_index >= len(parts):
            raise ValueError(f"Could not extract playlist ID from URL: {playlist_url}")
        
        return parts[playlist_id_index]
    
    def get_playlist_tracks(self, playlist_id: str) -> List[Dict]:
        """Fetch all tracks from a Deezer playlist.
        
        Args:
            playlist_id: Deezer playlist ID
        
        Returns:
            List of track dictionaries containing artist and track info
        
        Raises:
            requests.RequestException: If API request fails
        """
        tracks = []
        url = f"{self.BASE_URL}/playlist/{playlist_id}"
        
        try:
            response = self.session.get(url)
            response.raise_for_status()
            playlist_data = response.json()
            
            # Get tracks from the playlist
            if "tracks" in playlist_data:
                tracks_data = playlist_data["tracks"]
                
                # Handle paginated results
                while True:
                    if "data" in tracks_data:
                        tracks.extend(tracks_data["data"])
                    
                    # Check if there are more pages
                    if "next" in tracks_data:
                        response = self.session.get(tracks_data["next"])
                        response.raise_for_status()
                        tracks_data = response.json()
                    else:
                        break
            
            return tracks
        
        except requests.RequestException as e:
            raise requests.RequestException(f"Failed to fetch playlist {playlist_id}: {str(e)}")
    
    def extract_artists_from_tracks(self, tracks: List[Dict]) -> Set[str]:
        """Extract unique artist names from a list of tracks.
        
        Args:
            tracks: List of track dictionaries from Deezer API
        
        Returns:
            Set of unique artist names (lowercase for comparison)
        """
        artists = set()
        
        for track in tracks:
            if "artist" in track and "name" in track["artist"]:
                artist_name = track["artist"]["name"].lower()
                artists.add(artist_name)
        
        return artists
    
    def count_tracks_by_artists(self, tracks: List[Dict], target_artists: Set[str]) -> int:
        """Count tracks from a specific set of artists.
        
        Args:
            tracks: List of track dictionaries from Deezer API
            target_artists: Set of artist names to match (lowercase)
        
        Returns:
            Number of tracks from target artists
        """
        count = 0
        
        for track in tracks:
            if "artist" in track and "name" in track["artist"]:
                artist_name = track["artist"]["name"].lower()
                if artist_name in target_artists:
                    count += 1
        
        return count
