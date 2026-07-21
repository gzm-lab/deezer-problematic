"use client";

import { useState, useEffect, useCallback } from "react";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Artistes
  const [artists, setArtists] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newArtist, setNewArtist] = useState("");
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
        body: JSON.stringify({ name: newArtist.trim() }),
      });
      const data = await res.json();

      if (res.ok) {
        setArtists((prev) => [...prev, data.name].sort());
        setNewArtist("");
        setFeedback({ type: "success", msg: `${data.name} ajouté !` });
      } else {
        setFeedback({ type: "error", msg: data.error || "Erreur" });
      }
    } catch {
      setFeedback({ type: "error", msg: "Erreur réseau" });
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(name: string) {
    if (!confirm(`Supprimer "${name}" de la liste ?`)) return;

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
        setArtists((prev) => prev.filter((a) => a !== name));
        setFeedback({ type: "success", msg: `${name} supprimé` });
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
      <div className="max-w-sm mx-auto px-4 py-24">
        <h1 className="text-2xl font-bold text-center mb-8">Administration</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-1">
              Mot de passe admin
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
              placeholder="••••••••"
              autoFocus
            />
          </div>
          {authError && (
            <p className="text-sm text-danger">{authError}</p>
          )}
          <button
            type="submit"
            disabled={authLoading || !password}
            className="w-full py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent-hover disabled:opacity-40 transition-all"
          >
            {authLoading ? "Vérification..." : "Se connecter"}
          </button>
        </form>
      </div>
    );
  }

  // Admin panel
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Gestion des artistes</h1>
          <p className="text-sm text-muted mt-1">
            {artists.length} artiste{artists.length > 1 ? "s" : ""} dans la liste
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-lg text-sm text-muted hover:text-foreground hover:bg-surface border border-border transition-all"
        >
          Déconnexion
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`p-3 rounded-xl mb-6 text-sm ${
            feedback.type === "success"
              ? "bg-green-500/10 border border-green-500/30 text-green-400"
              : "bg-danger/10 border border-danger/30 text-danger"
          }`}
          onClick={() => setFeedback(null)}
        >
          {feedback.msg}
        </div>
      )}

      {/* Add form */}
      <form onSubmit={handleAdd} className="flex gap-3 mb-8">
        <input
          type="text"
          value={newArtist}
          onChange={(e) => setNewArtist(e.target.value)}
          placeholder="Nom de l&apos;artiste à ajouter..."
          className="flex-1 px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
        />
        <button
          type="submit"
          disabled={adding || !newArtist.trim()}
          className="px-5 py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent-hover disabled:opacity-40 transition-all"
        >
          {adding ? "..." : "Ajouter"}
        </button>
      </form>

      {/* Import CSV hint */}
      <details className="mb-8">
        <summary className="text-sm text-muted cursor-pointer hover:text-foreground transition-colors">
          📋 Importer depuis un CSV
        </summary>
        <div className="mt-3 p-4 rounded-lg bg-surface border border-border">
          <p className="text-sm text-muted mb-2">
            Pour l&apos;import en masse, ajoute les artistes un par un ou copie-colle le contenu
            de ton CSV dans le champ ci-dessus (un par ligne).
          </p>
          <textarea
            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm min-h-[120px]"
            placeholder="Artiste 1&#10;Artiste 2&#10;Artiste 3"
            onChange={async (e) => {
              const lines = e.target.value.split("\n").filter((l) => l.trim());
              if (lines.length > 0 && e.target.value.endsWith("\n")) {
                // Bulk add on double newline
              }
            }}
          />
          <button
            onClick={async () => {
              const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
              if (!textarea) return;
              const lines = textarea.value.split("\n").filter((l) => l.trim());
              if (lines.length === 0) return;
              let added = 0;
              for (const line of lines) {
                try {
                  const res = await fetch("/api/artists", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ name: line.trim() }),
                  });
                  if (res.ok) added++;
                } catch {
                  // continue
                }
              }
              textarea.value = "";
              setFeedback({ type: "success", msg: `${added} artiste(s) ajouté(s) !` });
              fetchArtists();
            }}
            className="mt-2 px-4 py-2 rounded-lg bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20 transition-colors"
          >
            Importer tout
          </button>
        </div>
      </details>

      {/* Artist list */}
      {loading ? (
        <div className="text-center py-12 text-muted">Chargement...</div>
      ) : artists.length === 0 ? (
        <div className="text-center py-12 text-muted">
          <p className="text-lg mb-2">Aucun artiste dans la liste</p>
          <p className="text-sm">Ajoute ton premier artiste ci-dessus.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {artists.map((artist) => (
            <div
              key={artist}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-surface transition-colors group"
            >
              <span className="text-sm font-medium capitalize">{artist}</span>
              <button
                onClick={() => handleDelete(artist)}
                className="px-3 py-1.5 rounded-lg text-xs text-muted hover:text-danger hover:bg-danger/10 opacity-0 group-hover:opacity-100 transition-all"
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
