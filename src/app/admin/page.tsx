"use client";

import { useState, useEffect, useCallback } from "react";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

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
        setArtists((prev) => prev.filter((a) => a !== name));
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
              className="w-full px-5 py-3.5 rounded-[var(--radius-md)] bg-surface border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all text-sm"
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

  // Admin panel
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des artistes</h1>
          <p className="text-sm text-muted mt-1">
            {artists.length} artiste{artists.length > 1 ? "s" : ""} dans la liste
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

      <form onSubmit={handleAdd} className="flex gap-3 mb-10">
        <input
          type="text"
          value={newArtist}
          onChange={(e) => setNewArtist(e.target.value)}
          placeholder="Nom de l&apos;artiste à ajouter..."
          className="flex-1 px-5 py-3.5 rounded-[var(--radius-md)] bg-surface border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all text-sm"
        />
        <button
          type="submit"
          disabled={adding || !newArtist.trim()}
          className="px-6 py-3.5 rounded-[var(--radius-md)] bg-accent text-white font-semibold text-sm hover:bg-accent-hover disabled:opacity-40 transition-all shadow-lg shadow-accent/15"
        >
          {adding ? "..." : "Ajouter"}
        </button>
      </form>

      <details className="mb-10 group">
        <summary className="text-sm text-muted cursor-pointer hover:text-foreground transition-colors font-medium">
          📋 Importer en masse
        </summary>
        <div className="mt-4 p-5 rounded-[var(--radius-md)] bg-surface border border-border">
          <textarea
            id="bulkImport"
            className="w-full px-4 py-3 rounded-[var(--radius-sm)] bg-bg-warm border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 text-sm min-h-[100px] resize-y"
            placeholder="Artiste 1&#10;Artiste 2&#10;Artiste 3"
          />
          <button
            onClick={async () => {
              const textarea = document.getElementById("bulkImport") as HTMLTextAreaElement;
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
                } catch { /* skip */ }
              }
              textarea.value = "";
              setFeedback({ type: "success", msg: `${added} artiste(s) ajouté(s) !` });
              fetchArtists();
            }}
            className="mt-3 px-5 py-2.5 rounded-[var(--radius-sm)] bg-accent-light text-accent text-sm font-semibold hover:bg-accent/15 transition-colors"
          >
            Tout importer
          </button>
        </div>
      </details>

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
              key={artist}
              className={`flex items-center justify-between p-4 hover:bg-bg-warm transition-colors group ${
                i < artists.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <span className="text-sm font-medium text-foreground capitalize">{artist}</span>
              <button
                onClick={() => handleDelete(artist)}
                className="px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium text-muted hover:text-danger hover:bg-danger-light opacity-0 group-hover:opacity-100 transition-all"
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
