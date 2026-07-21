"use client";

import { useState } from "react";
import { AnalysisResult } from "@/lib/types";

export default function Home() {
  const [platform, setPlatform] = useState<"deezer" | "spotify">("deezer");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    <div className="max-w-2xl mx-auto px-6 py-20">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-light text-accent text-sm font-medium mb-6">
          🎧 Beta · Deezer &amp; Spotify
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4 text-foreground leading-tight">
          Ta playlist est-elle<br />
          <span className="text-accent">problématique</span>&nbsp;?
        </h1>
        <p className="text-muted text-lg max-w-md mx-auto leading-relaxed">
          Analyse le pourcentage de titres faits par des artistes dans la liste.
        </p>
      </div>

      {/* Platform selector */}
      <div className="flex justify-center gap-3 mb-8">
        <button
          onClick={() => { setPlatform("deezer"); setResult(null); setError(null); }}
          className={`px-5 py-3 rounded-[var(--radius-md)] font-semibold text-sm transition-all ${
            platform === "deezer"
              ? "bg-accent text-white shadow-lg shadow-accent/20"
              : "bg-surface border border-border text-muted hover:text-foreground hover:border-accent/30"
          }`}
        >
          🎵 Deezer
        </button>
        <button
          onClick={() => { setPlatform("spotify"); setResult(null); setError(null); }}
          className={`px-5 py-3 rounded-[var(--radius-md)] font-semibold text-sm transition-all ${
            platform === "spotify"
              ? "bg-accent text-white shadow-lg shadow-accent/20"
              : "bg-surface border border-border text-muted hover:text-foreground hover:border-accent/30"
          }`}
        >
          🟢 Spotify
        </button>
      </div>

      {/* Input form */}
      <form onSubmit={handleAnalyze} className="mb-10">
        <div className="flex gap-3">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={
              platform === "deezer"
                ? "https://www.deezer.com/playlist/..."
                : "https://open.spotify.com/playlist/..."
            }
            className="flex-1 px-5 py-3.5 rounded-[var(--radius-md)] bg-surface border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all text-sm"
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="px-7 py-3.5 rounded-[var(--radius-md)] bg-accent text-white font-semibold text-sm hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-accent/15"
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
        <div className="p-5 rounded-[var(--radius-md)] bg-danger-light border border-danger/20 text-danger mb-8">
          <p className="font-semibold text-sm mb-1">Erreur</p>
          <p className="text-sm opacity-90">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="rounded-[var(--radius-lg)] bg-surface border border-border overflow-hidden shadow-sm">
          {/* Header */}
          <div className="p-8 border-b border-border">
            <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-3">
              {result.platform === "spotify" ? "🟢 Spotify" : "🎵 Deezer"} · Playlist
            </p>
            <p className="text-lg font-bold text-foreground mb-6">
              {result.playlistTitle || `Playlist ${result.playlistId}`}
            </p>
            <div className="flex items-baseline gap-4">
              <span className={`text-6xl font-extrabold tracking-tight ${getScoreColor(result.percentage)}`}>
                {result.percentage}%
              </span>
              <span className="text-muted text-sm">
                {result.matchingTracks} / {result.totalTracks} titres problématiques
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-5 h-2.5 bg-bg-warm rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${getBarColor(result.percentage)}`}
                style={{ width: `${Math.min(result.percentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Track details */}
          {result.matchingTrackDetails.length > 0 && (
            <div className="p-8">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">
                Titres problématiques trouvés
              </h3>
              <div className="space-y-1.5">
                {result.matchingTrackDetails.map((track, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-3 rounded-[var(--radius-sm)] hover:bg-bg-warm transition-colors"
                  >
                    {track.cover ? (
                      <img
                        src={track.cover}
                        alt={track.title}
                        className="w-11 h-11 rounded-lg object-cover shadow-sm flex-shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-bg-warm border border-border flex items-center justify-center text-muted flex-shrink-0">
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
