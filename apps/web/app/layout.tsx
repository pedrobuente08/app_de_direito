import type { Metadata } from 'next';
import { GeistMono } from 'geist/font/mono';
import '@fontsource/fraunces/400.css';
import '@fontsource/fraunces/500.css';
import '@fontsource/fraunces/600.css';
import '@fontsource/fraunces/700.css';
import '@fontsource/hanken-grotesk/400.css';
import '@fontsource/hanken-grotesk/500.css';
import '@fontsource/hanken-grotesk/600.css';
import '@fontsource/hanken-grotesk/700.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pauta',
  description: 'Gestão jurídica para advogado autônomo e escritório pequeno',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${GeistMono.variable} font-sans antialiased`}
        style={
          {
            '--font-display': 'Fraunces, serif',
            '--font-sans': 'Hanken Grotesk, sans-serif',
            '--font-mono': `${GeistMono.style.fontFamily}, monospace`,
          } as React.CSSProperties
        }
      >
        <div className="pauta-grain" aria-hidden />
        {children}
      </body>
    </html>
  );
}
