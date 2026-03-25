import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SUTRA by Purama',
  description: "Génère des vidéos complètes avec l'IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Exo+2:wght@100..900&family=Orbitron:wght@400..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#06050e] text-white min-h-screen antialiased font-exo2">
        {children}
      </body>
    </html>
  );
}
