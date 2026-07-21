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
      <body className="min-h-full bg-background text-foreground">
        <header className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/" className="font-semibold text-lg tracking-tight">
              Problematic<span className="text-accent">.fyi</span>
            </a>
            <nav className="flex gap-4 text-sm text-muted">
              <a href="/" className="hover:text-foreground transition-colors">Accueil</a>
              <a href="/admin" className="hover:text-foreground transition-colors">Admin</a>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border py-4 text-center text-xs text-muted">
          Propulsé par l&apos;API Deezer ·{" "}
          <a href="https://github.com/gzm-lab/deezer-problematic" className="hover:text-foreground transition-colors">GitHub</a>
        </footer>
      </body>
    </html>
  );
}
