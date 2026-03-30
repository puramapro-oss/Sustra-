import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SUTRA by Purama - Cr\u00e9ation Vid\u00e9o IA Automatis\u00e9e',
  description: "G\u00e9n\u00e8re des vid\u00e9os compl\u00e8tes avec l'IA. Script, voix, visuels, montage et publication automatiques.",
  keywords: ['vid\u00e9o IA', 'cr\u00e9ation vid\u00e9o', 'intelligence artificielle', 'SUTRA', 'Purama'],
  openGraph: {
    title: 'SUTRA by Purama',
    description: "G\u00e9n\u00e8re des vid\u00e9os compl\u00e8tes avec l'IA",
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SUTRA by Purama',
    description: "G\u00e9n\u00e8re des vid\u00e9os compl\u00e8tes avec l'IA",
  },
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
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400..800&family=Exo+2:wght@100..900&family=Orbitron:wght@400..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#0A0A0F] text-[#F8FAFC] min-h-screen antialiased font-exo2">
        {children}
      </body>
    </html>
  );
}
