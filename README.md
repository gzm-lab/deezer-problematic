# Problematic.fyi 🎵

Analyse tes playlists Deezer et découvre le pourcentage de titres faits par des artistes « problématiques ».

## Fonctionnalités

- ✅ Analyse de playlists Deezer (publiques et privées)
- ✅ Interface web propre avec sélecteur Deezer / Spotify
- ✅ Barre de progression visuelle et détail des titres
- ✅ Interface d'administration pour gérer la liste d'artistes
- ✅ Stockage persistant via Vercel Blob
- 🟢 Spotify bientôt disponible

## Déploiement Vercel

### 1. Cloner le repo

```bash
git clone https://github.com/gzm-lab/deezer-problematic.git
cd deezer-problematic
```

### 2. Installer

```bash
npm install
```

### 3. Variables d'environnement

Créer un fichier `.env.local` :

```env
ADMIN_PASSWORD=ton_mot_de_passe_admin
```

Sur Vercel, ajouter ces variables dans les paramètres du projet :

- `ADMIN_PASSWORD` — mot de passe pour l'interface admin
- `BLOB_READ_WRITE_TOKEN` — configuré automatiquement si tu actives Vercel Blob

### 4. Lancer en dev

```bash
npm run dev
```

### 5. Déployer

Connecte le repo GitHub à Vercel et push sur `main`. Le déploiement est automatique.

## Variables d'environnement Vercel

| Variable | Description |
|---|---|
| `ADMIN_PASSWORD` | Mot de passe pour accéder à `/admin` |
| `BLOB_READ_WRITE_TOKEN` | Token Vercel Blob (auto-généré si tu actives Blob Storage) |
| `DEEZER_ACCESS_TOKEN` | Token OAuth Deezer pour les playlists privées (optionnel) |

## Structure

```
src/
  app/
    page.tsx           → Page d'accueil (analyse de playlist)
    admin/page.tsx     → Interface admin (gestion des artistes)
    api/
      analyze/route.ts → POST - Analyse une playlist
      artists/route.ts → GET/POST/DELETE - CRUD artistes
      admin/auth/route.ts → POST - Vérification mot de passe admin
  lib/
    deezer.ts          → Logique API Deezer
    blob.ts            → Stockage Vercel Blob
    types.ts           → Types TypeScript
python/                → Scripts Python originaux (CLI)
```

## Licence

MIT
