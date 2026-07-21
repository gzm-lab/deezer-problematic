# Deezer Problematic

Analysez les playlists Deezer et comptabilisez les titres des artistes spécifiés.

## Description

Cet outil permet de:
1. Accéder à une playlist Deezer par URL (publique ou privée)
2. Lire une liste d'artistes depuis un fichier CSV
3. Compter combien de titres de la playlist sont faits par ces artistes

## Fonctionnalités

- ✅ Support des playlists **publiques** (pas d'authentification nécessaire)
- ✅ Support des playlists **privées** (avec authentification OAuth Deezer)
- ✅ Gestion automatique du token OAuth avec cache
- ✅ API Deezer officielle avec gestion des résultats paginés
- ✅ Comparaison des artistes insensible à la casse
- ✅ Statistiques détaillées et affichage des titres trouvés

## Installation

### 1. Cloner le repository

```bash
git clone https://github.com/gzm-lab/deezer-problematic.git
cd deezer-problematic
```

### 2. Installer les dépendances

```bash
pip install -r requirements.txt
```

### 3. Configuration OAuth (optionnel, pour les playlists privées)

Pour accéder aux playlists privées, créez une application Deezer sur https://developers.deezer.com

Créez un fichier `.env` à la racine du projet:

```env
application_id=YOUR_APP_ID
secret_key=YOUR_SECRET_KEY
application_domain=http://localhost:8080/
```

## Utilisation

### Playlist publique (pas d'auth nécessaire)

```bash
python main.py "https://www.deezer.com/playlist/1234567890" artists.csv
```

### Playlist privée (authentification automatique)

```bash
python main.py "https://www.deezer.com/playlist/1234567890" artists.csv
```

La première fois, le navigateur s'ouvrira pour autoriser l'application. Le token sera mis en cache pour les appels suivants.

### Forcer une nouvelle authentification

```bash
python main.py "https://www.deezer.com/playlist/1234567890" artists.csv --force-auth
```

### Ne pas ouvrir le navigateur

```bash
python main.py "https://www.deezer.com/playlist/1234567890" artists.csv --no-open
```

## Format du fichier CSV

Le fichier CSV doit avoir les noms d'artistes dans la **première colonne**:

```csv
artiste
The Beatles
Pink Floyd
Led Zeppelin
David Bowie
```

Ou sans en-tête:

```csv
The Beatles
Pink Floyd
Led Zeppelin
```

## Exemple de sortie

```
Chargement des artistes depuis le CSV: artists.csv
✓ 5 artistes uniques chargés

Récupération de la playlist: https://www.deezer.com/playlist/1234567890
✓ ID de la playlist: 1234567890
✓ 50 titres récupérés

============================================================
RÉSULTATS:
  Nombre total de titres: 50
  Titres des artistes spécifiés: 12
  Pourcentage: 24.0%
============================================================

Titres trouvés:
  - Bohemian Rhapsody — Queen
  - Stairway to Heaven — Led Zeppelin
  - Hotel California — Eagles
  - Imagine — John Lennon

✓ 12 titres correspondants trouvés
```

## Authentification OAuth

### Configuration de l'application Deezer

1. Allez sur https://developers.deezer.com
2. Connectez-vous ou créez un compte
3. Créez une nouvelle application
4. Obtenez votre:
   - Application ID
   - Secret Key
5. Configurez le Redirect URI (par défaut: `http://localhost:8080/`)

### Flux d'authentification

1. La première fois que vous accédez à une playlist privée, le script:
   - Démarre un serveur HTTP local
   - Ouvre votre navigateur pour autoriser l'application
   - Reçoit le code d'autorisation
   - Échange le code contre un access token
   - Sauvegarde le token dans `.deezer_token.json`

2. Les appels suivants utilisent le token en cache automatiquement

3. Vous pouvez aussi définir `DEEZER_ACCESS_TOKEN` comme variable d'environnement

## Structure du projet

```
.
├── main.py              # Point d'entrée principal
├── deezer_api.py        # Module API Deezer
├── deezer_auth.py       # Gestion de l'authentification OAuth
├── csv_reader.py        # Lecteur CSV
├── requirements.txt     # Dépendances Python
├── example_artists.csv  # Exemple de fichier CSV
└── README.md           # Cette documentation
```

## Dépendances

- Python 3.7+
- requests (requêtes HTTP)
- pandas (traitement CSV)
- python-dotenv (chargement des variables d'environnement)

## Gestion des erreurs

Le script gère les cas suivants:
- ✓ Playlists inexistantes ou supprimées
- ✓ Playlists privées sans accès
- ✓ Fichiers CSV invalides ou vides
- ✓ Problèmes de connexion réseau
- ✓ Timeouts d'authentification OAuth

## Licence

MIT

## Auteur

Créé par gzm-lab

## Remerciements

Inspiration du projet original https://github.com/gzm-lab/deezer-playlist
