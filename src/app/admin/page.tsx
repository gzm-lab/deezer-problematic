"use client";

import { useState, useEffect, useCallback } from "react";
import { ArtistLevel } from "@/lib/types";

const LEVELS: ArtistLevel[] = ["plaintes", "condamné", "non lieu"];
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

interface ArtistItem {
  name: string;
  level: ArtistLevel;
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [artists, setArtists] = useState<ArtistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newArtist, setNewArtist] = useState("");
  const [newLevel, setNewLevel] = useState<ArtistLevel>("condamné");
  const [adding, setAdding] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;

  const fetchArtists = useCallback(async () => {
    try {
      const res = await fetch("/api/artists");
      const data = await res.json();
      if (data.artists) setArtists(data.artists);
    } catch {
      // silencieux
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      setAuthenticated(true);
      fetchArtists();
    } else {
      setLoading(false);
    }
  }, [token, fetchArtists]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem("admin_token", data.token);
        setAuthenticated(true);
        fetchArtists();
      } else {
        setAuthError(data.error || "Mot de passe incorrect");
      }
    } catch {
      setAuthError("Erreur réseau");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newArtist.trim()) return;

    setAdding(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/artists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newArtist.trim(), level: newLevel }),
      });
      const data = await res.json();

      if (res.ok) {
        setArtists((prev) =>
          [...prev, { name: data.name, level: data.level }].sort((a, b) =>
            a.name.localeCompare(b.name)
          )
        );
        setNewArtist("");
        setFeedback({ type: "success", msg: `${data.name} ajouté (${LEVEL_LABELS[data.level as ArtistLevel] || data.level})` });
      } else {
        setFeedback({ type: "error", msg: data.error || "Erreur" });
      }
    } catch {
      setFeedback({ type: "error", msg: "Erreur réseau" });
    } finally {
      setAdding(false);
    }
  }

  async function handleLevelChange(name: string, level: ArtistLevel) {
    try {
      const res = await fetch("/api/artists", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, level }),
      });
      const data = await res.json();

      if (res.ok) {
        setArtists((prev) =>
          prev.map((a) => (a.name === name ? { ...a, level } : a))
        );
        setFeedback({ type: "success", msg: `${name} → ${LEVEL_LABELS[level]}` });
      } else {
        setFeedback({ type: "error", msg: data.error || "Erreur" });
      }
    } catch {
      setFeedback({ type: "error", msg: "Erreur réseau" });
    }
  }

  async function handleDelete(name: string) {
    if (!confirm(`Supprimer « ${name} » de la liste ?`)) return;

    try {
      const res = await fetch("/api/artists", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();

      if (res.ok) {
        setArtists((prev) => prev.filter((a) => a.name !== name));
        setFeedback({ type: "success", msg: `« ${name} » supprimé` });
      } else {
        setFeedback({ type: "error", msg: data.error || "Erreur" });
      }
    } catch {
      setFeedback({ type: "error", msg: "Erreur réseau" });
    }
  }

  function handleLogout() {
    localStorage.removeItem("admin_token");
    setAuthenticated(false);
    setArtists([]);
  }

  // Login screen
  if (!authenticated) {
    return (
      <div className="max-w-sm mx-auto px-6 py-28">
        <h1 className="text-2xl font-bold text-center mb-2 text-foreground">Administration</h1>
        <p className="text-center text-muted text-sm mb-8">Gestion de la liste d&apos;artistes</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-3.5 rounded-[var(--radius-md)] bg-surface border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all text-base"
              placeholder="Mot de passe admin"
              autoFocus
            />
          </div>
          {authError && <p className="text-sm text-danger font-medium">{authError}</p>}
          <button
            type="submit"
            disabled={authLoading || !password}
            className="w-full py-3.5 rounded-[var(--radius-md)] bg-accent text-white font-semibold text-sm hover:bg-accent-hover disabled:opacity-40 transition-all shadow-lg shadow-accent/15"
          >
            {authLoading ? "Vérification..." : "Se connecter"}
          </button>
        </form>
      </div>
    );
  }

  // Stats
  const stats = {
    total: artists.length,
    condamné: artists.filter((a) => a.level === "condamné").length,
    plaintes: artists.filter((a) => a.level === "plaintes").length,
    nonlieu: artists.filter((a) => a.level === "non lieu").length,
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des artistes</h1>
          <p className="text-sm text-muted mt-1">
            {stats.total} artiste{stats.total > 1 ? "s" : ""} · {stats.condamné} condamné, {stats.plaintes} plaintes, {stats.nonlieu} non-lieu
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-[var(--radius-sm)] text-sm font-medium text-muted hover:text-foreground hover:bg-bg-warm border border-border transition-all"
        >
          Déconnexion
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-[var(--radius-md)] mb-6 text-sm font-medium cursor-pointer ${
            feedback.type === "success"
              ? "bg-success-light border border-success/20 text-success"
              : "bg-danger-light border border-danger/20 text-danger"
          }`}
          onClick={() => setFeedback(null)}
        >
          {feedback.msg}
        </div>
      )}

      {/* Ajouter un artiste */}
      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-8 bg-surface rounded-[var(--radius-lg)] border border-border p-4">
        <input
          type="text"
          value={newArtist}
          onChange={(e) => setNewArtist(e.target.value)}
          placeholder="Nom de l&apos;artiste..."
          className="flex-1 px-4 py-2.5 rounded-[var(--radius-sm)] bg-bg-warm border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 text-sm"
        />
        <div className="flex gap-2">
          <select
            value={newLevel}
            onChange={(e) => setNewLevel(e.target.value as ArtistLevel)}
            className="px-3 py-2.5 rounded-[var(--radius-sm)] bg-bg-warm border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABELS[l]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={adding || !newArtist.trim()}
            className="px-5 py-2.5 rounded-[var(--radius-sm)] bg-accent text-white font-semibold text-sm hover:bg-accent-hover disabled:opacity-40 transition-all"
          >
            {adding ? "..." : "Ajouter"}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="text-center py-16 text-muted text-sm">Chargement...</div>
      ) : artists.length === 0 ? (
        <div className="text-center py-16 bg-surface rounded-[var(--radius-lg)] border border-border">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-foreground font-semibold mb-1">Aucun artiste</p>
          <p className="text-sm text-muted">Ajoute ton premier artiste ci-dessus.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border overflow-hidden">
          {artists.map((artist, i) => (
            <div
              key={artist.name}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 sm:p-4 hover:bg-bg-warm transition-colors group ${
                i < artists.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-sm font-medium text-foreground capitalize truncate">
                  {artist.name}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEVEL_COLORS[artist.level]}`}>
                  {LEVEL_LABELS[artist.level]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={artist.level}
                  onChange={(e) => handleLevelChange(artist.name, e.target.value as ArtistLevel)}
                  className="px-2 py-1.5 rounded-[var(--radius-sm)] bg-bg-warm border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-accent/30 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {LEVEL_LABELS[l]}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleDelete(artist.name)}
                  className="px-2 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium text-muted hover:text-danger hover:bg-danger-light opacity-0 group-hover:opacity-100 transition-all"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
