"use client";

import { useState, useRef } from "react";
import { AnalysisResult } from "@/lib/types";

export default function Home() {
  const [platform, setPlatform] = useState<"deezer" | "spotify">("deezer");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleClear() {
    setUrl("");
    setResult(null);
    setError(null);
    inputRef.current?.focus();
  }

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, url: url.trim() }),
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
      <div className="flex justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
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

      {/* Input form */}
      <form onSubmit={handleAnalyze} className="mb-8 sm:mb-10">
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
