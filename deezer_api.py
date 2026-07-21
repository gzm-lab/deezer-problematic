"""Deezer API module pour interagir avec les playlists et artistes."""

import requests
from typing import List, Dict, Set, Optional


class DeezerAPI:
    """Classe pour interagir avec l'API Deezer."""
    
    BASE_URL = "https://api.deezer.com"
    
    def __init__(self, access_token: Optional[str] = None):
        """Initialise l'API Deezer.
        
        Args:
            access_token: Token OAuth optionnel pour les playlists privées
        """
        self.access_token = access_token
        self.session = requests.Session()
    
    def get_playlist_id_from_url(self, playlist_url: str) -> str:
        """Extrait l'ID de la playlist depuis une URL Deezer.
        
        Args:
            playlist_url: URL de la playlist Deezer
        
        Returns:
            ID de la playlist
        
        Raises:
            ValueError: Si le format d'URL est invalide
        """
        parts = playlist_url.strip("/").split("/")
        if "playlist" not in parts:
            raise ValueError(f"URL Deezer invalide: {playlist_url}")
        
        playlist_id_index = parts.index("playlist") + 1
        if playlist_id_index >= len(parts):
            raise ValueError(f"Impossible d'extraire l'ID de la playlist: {playlist_url}")
        
        return parts[playlist_id_index]
    
    def get_playlist_tracks(self, playlist_id: str) -> List[Dict]:
        """Récupère tous les titres d'une playlist Deezer.
        
        Gère les résultats paginés et fonctionne aussi pour les playlists privées
        si un access_token est fourni.
        
        Args:
            playlist_id: ID de la playlist Deezer
        
        Returns:
            Liste des titres
        
        Raises:
            requests.RequestException: Si la requête API échoue
        """
        tracks = []
        url = f"{self.BASE_URL}/playlist/{playlist_id}"
        
        try:
            params = {}
            if self.access_token:
                params["access_token"] = self.access_token
            
            response = self.session.get(url, params=params)
            response.raise_for_status()
            playlist_data = response.json()
            
            # Gérer les erreurs d'accès à la playlist privée
            if "error" in playlist_data:
                error = playlist_data["error"]
                if isinstance(error, dict):
                    raise requests.RequestException(
                        f"Erreur API: {error.get('message', 'Playlist non trouvée ou privée')}"
                    )
                raise requests.RequestException(f"Erreur API: {error}")
            
            # Récupérer les titres de la playlist
            if "tracks" in playlist_data:
                tracks_data = playlist_data["tracks"]
                
                # Gérer les résultats paginés
                while True:
                    if "data" in tracks_data:
                        tracks.extend(tracks_data["data"])
                    
                    # Vérifier s'il y a d'autres pages
                    if "next" in tracks_data:
                        response = self.session.get(
                            tracks_data["next"],
                            params=params if self.access_token else {}
                        )
                        response.raise_for_status()
                        tracks_data = response.json()
                    else:
                        break
            
            return tracks
        
        except requests.RequestException as e:
            raise requests.RequestException(
                f"Impossible de récupérer la playlist {playlist_id}: {str(e)}"
            )
    
    def extract_artists_from_tracks(self, tracks: List[Dict]) -> Set[str]:
        """Extrait les noms d'artistes uniques d'une liste de titres.
        
        Args:
            tracks: Liste des titres depuis l'API Deezer
        
        Returns:
            Set des noms d'artistes en minuscules
        """
        artists = set()
        
        for track in tracks:
            if "artist" in track and "name" in track["artist"]:
                artist_name = track["artist"]["name"].lower()
                artists.add(artist_name)
        
        return artists
    
    def count_tracks_by_artists(self, tracks: List[Dict], target_artists: Set[str]) -> int:
        """Compte les titres d'un ensemble d'artistes.
        
        Args:
            tracks: Liste des titres
            target_artists: Set d'artistes cibles (minuscules)
        
        Returns:
            Nombre de titres des artistes cibles
        """
        count = 0
        
        for track in tracks:
            if "artist" in track and "name" in track["artist"]:
                artist_name = track["artist"]["name"].lower()
                if artist_name in target_artists:
                    count += 1
        
        return count
    
    def get_matching_tracks(self, tracks: List[Dict], target_artists: Set[str]) -> List[Dict]:
        """Récupère les titres correspondant aux artistes cibles.
        
        Args:
            tracks: Liste des titres
            target_artists: Set d'artistes cibles (minuscules)
        
        Returns:
            Liste des titres des artistes cibles
        """
        matching = []
        
        for track in tracks:
            if "artist" in track and "name" in track["artist"]:
                artist_name = track["artist"]["name"].lower()
                if artist_name in target_artists:
                    matching.append(track)
        
        return matching
