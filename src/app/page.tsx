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

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-3">
          Ta playlist est-elle{" "}
          <span className="text-accent">problématique</span>&nbsp;?
        </h1>
        <p className="text-muted text-lg">
          Colle le lien d&apos;une playlist et découvre le pourcentage de titres
          faits par des artistes dans la liste.
        </p>
      </div>

      {/* Platform selector */}
      <div className="flex justify-center gap-2 mb-6">
        <button
          onClick={() => { setPlatform("deezer"); setResult(null); setError(null); }}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            platform === "deezer"
              ? "bg-accent text-white shadow-lg shadow-accent/25"
              : "bg-surface border border-border text-muted hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-2">
            🎵 Deezer
          </span>
        </button>
        <button
          onClick={() => setPlatform("spotify")}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            platform === "spotify"
              ? "bg-accent text-white shadow-lg shadow-accent/25"
              : "bg-surface border border-border text-muted hover:text-foreground opacity-60 cursor-not-allowed"
          }`}
          disabled
          title="Bientôt disponible"
        >
          <span className="flex items-center gap-2">
            🟢 Spotify <span className="text-xs opacity-70">bientôt</span>
          </span>
        </button>
      </div>

      {/* Input form */}
      <form onSubmit={handleAnalyze} className="mb-8">
        <div className="flex gap-3">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={
              platform === "deezer"
                ? "https://www.deezer.com/playlist/123456789"
                : "https://open.spotify.com/playlist/..."
            }
            className="flex-1 px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="px-6 py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-accent/20"
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
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/30 text-danger mb-6">
          <p className="font-medium">Erreur</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Spotify placeholder */}
      {platform === "spotify" && !error && (
        <div className="p-8 rounded-xl bg-surface border border-border text-center">
          <p className="text-3xl mb-2">🟢</p>
          <p className="text-muted text-lg">Spotify arrive bientôt !</p>
          <p className="text-sm text-muted mt-1">
            Pour l&apos;instant, seule l&apos;analyse Deezer est disponible.
          </p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="rounded-xl bg-surface border border-border overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <p className="text-sm text-muted mb-1">
              {result.playlistTitle || `Playlist ${result.playlistId}`}
            </p>
            <div className="flex items-baseline gap-3">
              <span
                className={`text-5xl font-bold ${
                  result.percentage > 50
                    ? "text-danger"
                    : result.percentage > 25
                    ? "text-yellow-400"
                    : "text-green-400"
                }`}
              >
                {result.percentage}%
              </span>
              <span className="text-muted">
                {result.matchingTracks} / {result.totalTracks} titres problématiques
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-3 h-2 bg-background rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  result.percentage > 50
                    ? "bg-danger"
                    : result.percentage > 25
                    ? "bg-yellow-400"
                    : "bg-green-400"
                }`}
                style={{ width: `${Math.min(result.percentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Track details */}
          {result.matchingTrackDetails.length > 0 && (
            <div className="p-6">
              <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">
                Titres problématiques trouvés
              </h3>
              <div className="space-y-2">
                {result.matchingTrackDetails.map((track, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-hover transition-colors"
                  >
                    {track.cover ? (
                      <img
                        src={track.cover}
                        alt={track.title}
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-border flex items-center justify-center text-muted text-xs">
                        🎵
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{track.title}</p>
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
