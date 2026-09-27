import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/auth-context';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Novelku — Platform Membaca Web Novel',
    template: '%s | Novelku',
  },
  description:
    'Platform membaca web novel modern, responsif, dan nyaman dengan fitur kustomisasi tampilan, riwayat baca, favorit, dan katalog novel lengkap.',
  keywords: [
    'novel',
    'web novel',
    'baca novel',
    'novel online',
    'novel indonesia',
    'reading platform',
    'novelku',
  ],
  authors: [{ name: 'Novelku Team' }],
  creator: 'Novelku',
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: 'https://novelku.com',
    siteName: 'Novelku',
    title: 'Novelku — Platform Membaca Web Novel',
    description:
      'Platform membaca web novel modern, responsif, dan nyaman dengan fitur kustomisasi tampilan, riwayat baca, favorit, dan katalog novel lengkap.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Novelku — Platform Membaca Web Novel',
    description:
      'Platform membaca web novel modern, responsif, dan nyaman dengan fitur kustomisasi tampilan, riwayat baca, dan katalog novel lengkap.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 font-sans">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 flex flex-col">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
