#!/usr/bin/env python3
"""Main entrypoint for Deezer playlist artist analysis.

This script takes a Deezer playlist URL and a CSV file containing artist names,
then returns the count of tracks in the playlist made by those artists.
"""

import argparse
import sys
from pathlib import Path

from deezer_api import DeezerAPI
from csv_reader import load_artists_from_csv


def main(playlist_url: str, csv_file: str) -> int:
    """Analyze a Deezer playlist and count tracks from specified artists.
    
    Args:
        playlist_url: Deezer playlist URL (e.g., https://www.deezer.com/playlist/123456789)
        csv_file: Path to CSV file containing artist names (first column)
    
    Returns:
        Number of tracks in the playlist made by artists in the CSV file
    
    Raises:
        ValueError: If playlist URL is invalid
        FileNotFoundError: If CSV file doesn't exist
        requests.RequestException: If API request fails
    """
    
    print(f"Loading artists from CSV: {csv_file}")
    target_artists = load_artists_from_csv(csv_file)
    print(f"✓ Loaded {len(target_artists)} unique artists")
    
    print(f"\nFetching playlist from URL: {playlist_url}")
    deezer = DeezerAPI()
    
    # Extract playlist ID from URL
    playlist_id = deezer.get_playlist_id_from_url(playlist_url)
    print(f"✓ Playlist ID: {playlist_id}")
    
    # Get all tracks from the playlist
    tracks = deezer.get_playlist_tracks(playlist_id)
    print(f"✓ Fetched {len(tracks)} tracks from playlist")
    
    # Count tracks from target artists
    matching_count = deezer.count_tracks_by_artists(tracks, target_artists)
    
    # Display results
    print(f"\n{'='*50}")
    print(f"Results:")
    print(f"  Total tracks in playlist: {len(tracks)}")
    print(f"  Tracks from specified artists: {matching_count}")
    print(f"  Percentage: {(matching_count / len(tracks) * 100):.1f}%" if len(tracks) > 0 else "  Percentage: 0%")
    print(f"{'='*50}")
    
    return matching_count


def cli():
    """Command-line interface for the main function."""
    parser = argparse.ArgumentParser(
        description="Count tracks in a Deezer playlist made by specified artists"
    )
    parser.add_argument(
        "playlist_url",
        help="Deezer playlist URL (e.g., https://www.deezer.com/playlist/123456789)"
    )
    parser.add_argument(
        "csv_file",
        help="CSV file containing artist names (first column)"
    )
    
    args = parser.parse_args()
    
    try:
        count = main(args.playlist_url, args.csv_file)
        print(f"\n✓ Found {count} matching tracks")
        return 0
    
    except (ValueError, FileNotFoundError) as e:
        print(f"✗ Error: {str(e)}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"✗ Unexpected error: {str(e)}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(cli())
