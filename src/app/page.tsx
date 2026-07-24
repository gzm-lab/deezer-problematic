"use client";

import { useState, useRef, useEffect } from "react";
import { AnalysisResult } from "@/lib/types";

export default function Home() {
  const [platform, setPlatform] = useState<"deezer" | "spotify">("deezer");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [condamneOnly, setCondamneOnly] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Spotify auth
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<{ id: string; name: string; image: string; tracks: number; owner: string }[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState("");
  const [playlistsLoading, setPlaylistsLoading] = useState(false);

  async function fetchSpotifyPlaylists(token: string) {
    setPlaylistsLoading(true);
    try {
      const res = await fetch(`/api/spotify/playlists?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (data.playlists) {
        setSpotifyPlaylists(data.playlists);
      } else if (data.error) {
        setSpotifyError(data.error);
      }
    } catch {
      // silencieux
    } finally {
      setPlaylistsLoading(false);
    }
  }

  useEffect(() => {
    // Vérifier les params d'URL (retour du callback OAuth)
    const params = new URLSearchParams(window.location.search);
    const token = params.get("spotify_token");
    const expires = params.get("spotify_expires");
    const authError = params.get("spotify_error");

    if (authError) {
      setSpotifyError(decodeURIComponent(authError));
      // Nettoyer l'URL
      window.history.replaceState({}, "", "/");
      return;
    }

    if (token && expires) {
      const expiresAt = parseInt(expires, 10);
      sessionStorage.setItem("spotify_token", token);
      sessionStorage.setItem("spotify_expires", String(expiresAt));
      setSpotifyToken(token);
      setSpotifyConnected(true);
      fetchSpotifyPlaylists(token);
      // Nettoyer l'URL
      window.history.replaceState({}, "", "/");
      return;
    }

    // Vérifier si un token est déjà stocké et valide
    const storedToken = sessionStorage.getItem("spotify_token");
    const storedExpires = sessionStorage.getItem("spotify_expires");

    if (storedToken && storedExpires) {
      const expiresAt = parseInt(storedExpires, 10);
      if (Date.now() < expiresAt) {
        setSpotifyToken(storedToken);
        setSpotifyConnected(true);
        fetchSpotifyPlaylists(storedToken);
      } else {
        sessionStorage.removeItem("spotify_token");
        sessionStorage.removeItem("spotify_expires");
      }
    }
  }, []);

  function handleSpotifyLogin() {
    window.location.href = "/api/spotify/login";
  }

  function handleSpotifyLogout() {
    sessionStorage.removeItem("spotify_token");
    sessionStorage.removeItem("spotify_expires");
    setSpotifyToken(null);
    setSpotifyConnected(false);
  }

  function handleClear() {
    setUrl("");
    setSelectedPlaylist("");
    setResult(null);
    setError(null);
    inputRef.current?.focus();
  }

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();

    // Pour Spotify connecté, utiliser la playlist sélectionnée
    // Sinon, utiliser l'URL saisie
    const playlistUrl =
      platform === "spotify" && spotifyConnected && selectedPlaylist
        ? `https://open.spotify.com/playlist/${selectedPlaylist}`
        : url.trim();

    if (!playlistUrl) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const body: Record<string, unknown> = {
        platform,
        url: playlistUrl,
        level: condamneOnly ? "condamné" : undefined,
      };

      if (platform === "spotify" && spotifyToken) {
        body.spotifyToken = spotifyToken;
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur inconnue");
        return;
      }

      setResult(data);
    } catch {
      setError("Erreur réseau. Vérifie ta connexion.");
    } finally {
      setLoading(false);
    }
  }

  const getScoreColor = (pct: number) => {
    if (pct > 50) return "text-danger";
    if (pct > 25) return "text-warning";
    return "text-success";
  };

  const getBarColor = (pct: number) => {
    if (pct > 50) return "bg-danger";
    if (pct > 25) return "bg-warning";
    return "bg-success";
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
      {/* Hero */}
      <div className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-accent-light text-accent text-xs sm:text-sm font-medium mb-4 sm:mb-6">
          🎧 Beta · Deezer &amp; Spotify
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3 sm:mb-4 text-foreground leading-tight">
          Ta playlist est-elle<br />
          <span className="text-accent">problématique</span>&nbsp;?
        </h1>
        <p className="text-muted text-base sm:text-lg max-w-md mx-auto leading-relaxed">
          Analyse le pourcentage de titres faits par des artistes dans la liste.
        </p>
      </div>

      {/* Platform selector */}
      <div className="flex justify-center gap-2 sm:gap-3 mb-4 sm:mb-5">
        <button
          onClick={() => { setPlatform("deezer"); setResult(null); setError(null); }}
          className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-[var(--radius-md)] font-semibold text-xs sm:text-sm transition-all ${
            platform === "deezer"
              ? "bg-accent text-white shadow-lg shadow-accent/20"
              : "bg-surface border border-border text-muted hover:text-foreground hover:border-accent/30"
          }`}
        >
          🎵 Deezer
        </button>
        <button
          onClick={() => { setPlatform("spotify"); setResult(null); setError(null); }}
          className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-[var(--radius-md)] font-semibold text-xs sm:text-sm transition-all ${
            platform === "spotify"
              ? "bg-accent text-white shadow-lg shadow-accent/20"
              : "bg-surface border border-border text-muted hover:text-foreground hover:border-accent/30"
          }`}
        >
          🟢 Spotify
        </button>
      </div>

      {/* Spotify connect banner */}
      {platform === "spotify" && (
        <div className="flex justify-center mb-2">
          {spotifyConnected ? (
            <div className="flex items-center gap-3 px-4 py-2 rounded-[var(--radius-md)] bg-green-50 border border-green-200">
              <span className="flex items-center gap-1.5 text-sm font-medium text-green-700">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                Connecté à Spotify
              </span>
              <button
                onClick={handleSpotifyLogout}
                className="text-xs text-green-600 hover:text-green-800 underline"
              >
                Déconnecter
              </button>
            </div>
          ) : (
            <button
              onClick={handleSpotifyLogin}
              className="flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-md)] bg-[#1DB954] text-white font-semibold text-sm hover:bg-[#1ed760] transition-all shadow-lg shadow-[#1DB954]/20"
            >
              <SpotifyIcon /> Se connecter avec Spotify
            </button>
          )}
        </div>
      )}
      {spotifyError && platform === "spotify" && (
        <div className="flex justify-center mb-4">
          <p className="text-sm text-danger bg-danger-light border border-danger/20 rounded-[var(--radius-md)] px-4 py-2">
            {spotifyError}
          </p>
        </div>
      )}

      {/* Filter toggle */}
      <div className="flex justify-center mb-5 sm:mb-6">
        <label className="flex items-center gap-2.5 px-4 py-2 rounded-[var(--radius-md)] bg-surface border border-border cursor-pointer hover:border-accent/30 transition-all select-none">
          <div className={`relative w-9 h-5 rounded-full transition-colors ${condamneOnly ? "bg-accent" : "bg-border"}`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${condamneOnly ? "translate-x-4" : "translate-x-0.5"}`} />
          </div>
          <span className="text-xs sm:text-sm font-medium text-foreground">
            Condamné uniquement
          </span>
          <input
            type="checkbox"
            checked={condamneOnly}
            onChange={(e) => setCondamneOnly(e.target.checked)}
            className="sr-only"
          />
        </label>
      </div>

      {/* Input form */}
      <form onSubmit={handleAnalyze} className="mb-8 sm:mb-10">
        {platform === "spotify" && spotifyConnected ? (
          /* Spotify connecté : sélecteur de playlists */
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <select
                value={selectedPlaylist}
                onChange={(e) => setSelectedPlaylist(e.target.value)}
                className="w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-[var(--radius-md)] bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all text-base appearance-none"
              >
                <option value="">
                  {playlistsLoading ? "Chargement des playlists..." : "Choisis une playlist..."}
                </option>
                {spotifyPlaylists.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.tracks} titres)
                  </option>
                ))}
              </select>
              <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <button
              type="submit"
              disabled={loading || !selectedPlaylist}
              className="px-7 py-3 sm:py-3.5 rounded-[var(--radius-md)] bg-accent text-white font-semibold text-sm hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-accent/15 whitespace-nowrap"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Spinner /> Analyse...
                </span>
              ) : (
                "Analyser"
              )}
            </button>
          </div>
        ) : platform === "spotify" ? (
          /* Spotify non connecté : juste le bouton de connexion */
          <div className="text-center py-4">
            <p className="text-sm text-muted mb-4">
              Connecte-toi à Spotify pour choisir une playlist.
            </p>
          </div>
        ) : (
          /* Deezer : champ URL */
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={
                  platform === "deezer"
                    ? "Lien de la playlist Deezer..."
                    : "Lien de la playlist Spotify..."
                }
                className="w-full px-4 sm:px-5 py-3 sm:py-3.5 pr-10 rounded-[var(--radius-md)] bg-surface border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all text-base"
              />
              {url && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-border/50 text-muted hover:bg-border hover:text-foreground flex items-center justify-center transition-colors text-xs"
                  title="Effacer"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="px-7 py-3 sm:py-3.5 rounded-[var(--radius-md)] bg-accent text-white font-semibold text-sm hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-accent/15 whitespace-nowrap"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Spinner /> Analyse...
                </span>
              ) : (
                "Analyser"
              )}
            </button>
          </div>
        )}
      </form>

      {/* Error */}
      {error && (
        <div className="p-4 sm:p-5 rounded-[var(--radius-md)] bg-danger-light border border-danger/20 text-danger mb-6 sm:mb-8 relative group">
          <p className="font-semibold text-sm mb-1">Erreur</p>
          <p className="text-sm opacity-90">{error}</p>
          <button
            onClick={handleClear}
            className="absolute top-3 right-3 text-xs text-danger/60 hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
          >
            ✕ Effacer
          </button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="rounded-[var(--radius-lg)] bg-surface border border-border overflow-hidden shadow-sm">
          {/* Header */}
          <div className="p-5 sm:p-8 border-b border-border">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-muted uppercase tracking-wider font-semibold">
                {result.platform === "spotify" ? "🟢 Spotify" : "🎵 Deezer"} · Playlist
              </p>
              <button
                onClick={handleClear}
                className="text-xs text-muted hover:text-foreground transition-colors ml-2 flex-shrink-0"
                title="Nouvelle analyse"
              >
                ✕ Nouvelle analyse
              </button>
            </div>
            <p className="text-base sm:text-lg font-bold text-foreground mb-4 sm:mb-6 break-words">
              {result.playlistTitle || `Playlist ${result.playlistId}`}
            </p>
            <div className="flex items-baseline gap-3 sm:gap-4">
              <span className={`text-4xl sm:text-6xl font-extrabold tracking-tight ${getScoreColor(result.percentage)}`}>
                {result.percentage}%
              </span>
              <span className="text-muted text-xs sm:text-sm">
                {result.matchingTracks} / {result.totalTracks} titres problématiques
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-4 sm:mt-5 h-2 sm:h-2.5 bg-bg-warm rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${getBarColor(result.percentage)}`}
                style={{ width: `${Math.min(result.percentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Track details */}
          {result.matchingTrackDetails.length > 0 && (
            <div className="p-5 sm:p-8">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 sm:mb-4">
                Titres problématiques trouvés
              </h3>
              <div className="space-y-1 sm:space-y-1.5">
                {result.matchingTrackDetails.map((track, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-[var(--radius-sm)] hover:bg-bg-warm transition-colors"
                  >
                    {track.cover ? (
                      <img
                        src={track.cover}
                        alt={track.title}
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg object-cover shadow-sm flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-bg-warm border border-border flex items-center justify-center text-muted flex-shrink-0 text-xs">
                        🎵
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{track.title}</p>
                      <p className="text-xs text-muted truncate">{track.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function SpotifyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  );
}
