"""Module de lecture CSV pour charger les listes d'artistes."""

import pandas as pd
from typing import Set
from pathlib import Path


def load_artists_from_csv(csv_file: str) -> Set[str]:
    """Charge les noms d'artistes depuis un fichier CSV.
    
    Le fichier CSV doit contenir au minimum une colonne avec les noms d'artistes.
    La première colonne est utilisée par défaut.
    
    Args:
        csv_file: Chemin du fichier CSV
    
    Returns:
        Set des noms d'artistes en minuscules
    
    Raises:
        FileNotFoundError: Si le fichier CSV n'existe pas
        pd.errors.EmptyDataError: Si le fichier CSV est vide
        Exception: Si le fichier CSV n'a pas de colonnes
    """
    csv_path = Path(csv_file)
    
    if not csv_path.exists():
        raise FileNotFoundError(f"Fichier CSV non trouvé: {csv_file}")
    
    try:
        df = pd.read_csv(csv_path)
    except pd.errors.EmptyDataError:
        raise pd.errors.EmptyDataError(f"Fichier CSV vide: {csv_file}")
    
    if df.empty or len(df.columns) == 0:
        raise Exception(f"Fichier CSV sans données ou colonnes: {csv_file}")
    
    # Récupérer la première colonne (noms d'artistes)
    artist_column = df.iloc[:, 0]
    
    # Convertir en set de noms minuscules
    artists = set()
    for artist in artist_column:
        if pd.notna(artist):  # Ignorer les valeurs NaN
            artists.add(str(artist).lower().strip())
    
    return artists
