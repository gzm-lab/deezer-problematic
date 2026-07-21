#!/usr/bin/env python3
"""Point d'entrée principal pour l'analyse de playlists Deezer.

Ce script analyse une playlist Deezer et compte les titres des artistes
spécifiés dans un fichier CSV.

Supporte les playlists publiques (pas d'authentification nécessaire)
et les playlists privées (avec authentification OAuth Deezer).
"""

import argparse
import sys
from pathlib import Path

from deezer_api import DeezerAPI
from deezer_auth import DeezerOAuth
from csv_reader import load_artists_from_csv


def main(playlist_url: str, csv_file: str, access_token: str = None, 
         force_auth: bool = False, no_open: bool = False) -> int:
    """Analyse une playlist Deezer et compte les titres des artistes spécifiés.
    
    Args:
        playlist_url: URL de la playlist Deezer
        csv_file: Chemin du fichier CSV avec les noms d'artistes
        access_token: Token d'accès OAuth optionnel
        force_auth: Forcer une nouvelle authentification
        no_open: Ne pas ouvrir le navigateur pour OAuth
    
    Returns:
        Nombre de titres correspondant aux artistes du CSV
    
    Raises:
        ValueError: Si l'URL de la playlist est invalide
        FileNotFoundError: Si le fichier CSV n'existe pas
        requests.RequestException: Si la requête API échoue
    """
    
    print(f"Chargement des artistes depuis le CSV: {csv_file}")
    target_artists = load_artists_from_csv(csv_file)
    print(f"✓ {len(target_artists)} artistes uniques chargés")
    
    print(f"\nRécupération de la playlist: {playlist_url}")
    
    # Initialiser l'API Deezer
    deezer = DeezerAPI(access_token=access_token)
    
    # Extraire l'ID de la playlist
    playlist_id = deezer.get_playlist_id_from_url(playlist_url)
    print(f"✓ ID de la playlist: {playlist_id}")
    
    # Récupérer tous les titres de la playlist
    try:
        tracks = deezer.get_playlist_tracks(playlist_id)
        print(f"✓ {len(tracks)} titres récupérés")
    except Exception as e:
        # Si la playlist est privée et qu'on n'a pas de token, proposer l'authentification
        if "Playlist non trouvée ou privée" in str(e) or "404" in str(e):
            print(f"\n⚠ La playlist semble être privée ou inaccessible.")
            print(f"Tentative d'authentification OAuth...\n")
            
            oauth = DeezerOAuth()
            try:
                access_token = oauth.get_access_token(
                    force_auth=force_auth,
                    no_open=no_open
                )
                deezer = DeezerAPI(access_token=access_token)
                tracks = deezer.get_playlist_tracks(playlist_id)
                print(f"✓ {len(tracks)} titres récupérés (authentifié)")
            except Exception as auth_error:
                print(f"✗ Erreur d'authentification: {auth_error}")
                raise
        else:
            raise
    
    # Compter les titres des artistes cibles
    matching_count = deezer.count_tracks_by_artists(tracks, target_artists)
    matching_tracks = deezer.get_matching_tracks(tracks, target_artists)
    
    # Afficher les résultats
    print(f"\n{'='*60}")
    print(f"RÉSULTATS:")
    print(f"  Nombre total de titres: {len(tracks)}")
    print(f"  Titres des artistes spécifiés: {matching_count}")
    if len(tracks) > 0:
        percentage = (matching_count / len(tracks) * 100)
        print(f"  Pourcentage: {percentage:.1f}%")
    else:
        print(f"  Pourcentage: 0%")
    print(f"{'='*60}")
    
    if matching_count > 0 and matching_count <= 10:
        print(f"\nTitres trouvés:")
        for track in matching_tracks:
            artist = track.get("artist", {}).get("name", "Inconnu")
            title = track.get("title", "Inconnu")
            print(f"  - {title} — {artist}")
    
    return matching_count


def cli():
    """Interface en ligne de commande."""
    parser = argparse.ArgumentParser(
        description="Compte les titres d'une playlist Deezer faits par des artistes spécifiés",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemples:
  python main.py "https://www.deezer.com/playlist/123456789" artists.csv
  python main.py "https://www.deezer.com/playlist/123456789" artists.csv --force-auth
  python main.py "https://www.deezer.com/playlist/123456789" artists.csv --no-open
        """
    )
    parser.add_argument(
        "playlist_url",
        help="URL de la playlist Deezer"
    )
    parser.add_argument(
        "csv_file",
        help="Fichier CSV contenant les noms d'artistes (première colonne)"
    )
    parser.add_argument(
        "--force-auth",
        action="store_true",
        help="Forcer une nouvelle authentification OAuth (ignorer le cache)"
    )
    parser.add_argument(
        "--no-open",
        action="store_true",
        help="Ne pas ouvrir automatiquement le navigateur pour OAuth"
    )
    
    args = parser.parse_args()
    
    try:
        count = main(
            args.playlist_url,
            args.csv_file,
            force_auth=args.force_auth,
            no_open=args.no_open
        )
        print(f"\n✓ {count} titres correspondants trouvés")
        return 0
    
    except (ValueError, FileNotFoundError) as e:
        print(f"✗ Erreur: {str(e)}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"✗ Erreur inattendue: {str(e)}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(cli())
