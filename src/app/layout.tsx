import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Problematic.fyi — Analyse tes playlists",
  description: "Découvre le pourcentage de titres problématiques dans tes playlists Deezer et Spotify.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-bg text-foreground">
        <header className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
            <a href="/" className="font-bold text-lg tracking-tight text-foreground">
              Problematic<span className="text-accent">.fyi</span>
            </a>
            <nav className="flex gap-5 text-sm text-muted font-medium">
              <a href="/" className="hover:text-foreground transition-colors">Accueil</a>
              <a href="/admin" className="hover:text-foreground transition-colors">Admin</a>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border py-5 text-center text-xs text-muted bg-bg-warm/50">
          Propulsé par Deezer &amp; Spotify ·{" "}
          <a href="https://github.com/gzm-lab/deezer-problematic" className="text-accent hover:text-accent-hover transition-colors font-medium">GitHub</a>
        </footer>
      </body>
    </html>
  );
}
