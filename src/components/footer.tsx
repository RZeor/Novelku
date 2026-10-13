'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Heart } from 'lucide-react';

export default function Footer() {
  const pathname = usePathname();

  // Sembunyikan footer di halaman khusus admin atau mode membaca chapter
  const isHidden = pathname?.startsWith('/admin') || pathname?.startsWith('/chapters/');

  if (isHidden) {
    return null;
  }

  return (
    <footer className="bg-white dark:bg-zinc-900 border-t border-zinc-200/80 dark:border-zinc-800 mt-auto transition-colors">
      <div className="w-full mx-auto px-6 lg:px-7 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-600/20">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Novel<span className="text-indigo-600 dark:text-indigo-400">ku</span>
              </span>
            </Link>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-sm leading-relaxed">
              Platform baca novel pribadi dengan desain bersih, nyaman di mata, dan pengalaman membaca bebas gangguan.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-3">
              Jelajah
            </h3>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li>
                <Link href="/novels" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Katalog Novel
                </Link>
              </li>
              <li>
                <Link href="/bookmarks" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Novel Favorit
                </Link>
              </li>
              <li>
                <Link href="/history" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Riwayat Membaca
                </Link>
              </li>
            </ul>
          </div>

          {/* Account Links */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-3">
              Akun
            </h3>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li>
                <Link href="/login" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Masuk Akun
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Daftar Baru
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <p>© {new Date().getFullYear()} Novelku. Hak Cipta Dilindungi.</p>
          <p className="flex items-center gap-1">
            Dibuat dengan <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> untuk kenyamanan membaca novel.
          </p>
        </div>
      </div>
    </footer>
  );
}
