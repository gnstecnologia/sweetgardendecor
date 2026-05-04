import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
/* Swiper na raiz: garante CSS em produção/dev (evita carrossel “sem layout” se o chunk atrasar). */
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

export const metadata: Metadata = {
  title: 'Sweet Garden',
  description: 'Sweet Garden — modelos e composições',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
