"""CSV reader module for loading artist lists."""

import pandas as pd
from typing import Set
from pathlib import Path


def load_artists_from_csv(csv_file: str) -> Set[str]:
    """Load artist names from a CSV file.
    
    The CSV file should have at least one column containing artist names.
    The first column is used by default.
    
    Args:
        csv_file: Path to the CSV file
    
    Returns:
        Set of artist names (lowercase for case-insensitive matching)
    
    Raises:
        FileNotFoundError: If CSV file doesn't exist
        pd.errors.EmptyDataError: If CSV file is empty
        Exception: If CSV file has no columns
    """
    csv_path = Path(csv_file)
    
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV file not found: {csv_file}")
    
    try:
        df = pd.read_csv(csv_path)
    except pd.errors.EmptyDataError:
        raise pd.errors.EmptyDataError(f"CSV file is empty: {csv_file}")
    
    if df.empty or len(df.columns) == 0:
        raise Exception(f"CSV file has no data or columns: {csv_file}")
    
    # Get the first column (contains artist names)
    artist_column = df.iloc[:, 0]
    
    # Convert to set of lowercase names for case-insensitive matching
    artists = set()
    for artist in artist_column:
        if pd.notna(artist):  # Skip NaN values
            artists.add(str(artist).lower().strip())
    
    return artists
