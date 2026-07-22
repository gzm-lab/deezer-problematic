import type { Metadata } from "next";
import { getArtistsDetailed } from "@/lib/blob";
import { ArtistLevel } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Liste des artistes — Problematic.fyi",
  description: "Consulte la liste des artistes problématiques.",
};

const LEVEL_LABELS: Record<ArtistLevel, string> = {
  plaintes: "⚠️ Plaintes",
  condamné: "🚫 Condamné",
  "non lieu": "✅ Non-lieu",
};

const LEVEL_COLORS: Record<ArtistLevel, string> = {
  plaintes: "bg-warning-light text-warning border border-warning/20",
  condamné: "bg-danger-light text-danger border border-danger/20",
  "non lieu": "bg-success-light text-success border border-success/20",
};

export default async function ArtistsPage() {
  const entries = await getArtistsDetailed();
  const artists = entries.sort((a, b) => a.name.localeCompare(b.name));

  const stats = {
    total: artists.length,
    condamné: artists.filter((a) => a.level === "condamné").length,
    plaintes: artists.filter((a) => a.level === "plaintes").length,
    nonlieu: artists.filter((a) => a.level === "non lieu").length,
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div className="text-center mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
          Artistes problématiques
        </h1>
        <p className="text-muted text-sm sm:text-base max-w-md mx-auto">
          Liste consultative — {stats.total} artistes référencés
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-danger-light border border-danger/20 rounded-[var(--radius-md)] p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-danger">{stats.condamné}</p>
          <p className="text-xs text-danger/70 mt-1">Condamné</p>
        </div>
        <div className="bg-warning-light border border-warning/20 rounded-[var(--radius-md)] p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-warning">{stats.plaintes}</p>
          <p className="text-xs text-warning/70 mt-1">Plaintes</p>
        </div>
        <div className="bg-success-light border border-success/20 rounded-[var(--radius-md)] p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-success">{stats.nonlieu}</p>
          <p className="text-xs text-success/70 mt-1">Non-lieu</p>
        </div>
      </div>

      {/* Liste */}
      {artists.length === 0 ? (
        <div className="text-center py-16 bg-surface rounded-[var(--radius-lg)] border border-border">
          <p className="text-foreground font-semibold">Aucun artiste pour le moment.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border overflow-hidden">
          {artists.map((artist, i) => (
            <div
              key={artist.name}
              className={`flex items-center justify-between p-3 sm:p-4 ${
                i < artists.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <span className="text-sm font-medium text-foreground capitalize">
                {artist.name}
              </span>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${LEVEL_COLORS[artist.level]}`}
              >
                {LEVEL_LABELS[artist.level]}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-muted mt-8">
        Cette liste est mise à jour par l&apos;administration.
      </p>
    </div>
  );
}
