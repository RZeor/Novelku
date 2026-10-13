'use client';

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { FeaturedNovelResponse } from '@/types';
import { formatImageUrl } from '@/lib/utils';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Star,
  Eye,
  Library,
  ArrowRight,
} from 'lucide-react';

interface HeroCarouselProps {
  novels: FeaturedNovelResponse[];
}

const AUTO_SLIDE_MS = 5000;

// Batas panjang sinopsis yang ditampilkan di slider (mencegah
// deskripsi panjang merusak layout).
const SYNOPSIS_MAX = 220;

/**
 * Ambil potongan sinopsis yang bersih: buang whitespace berlebih,
 * buang baris "Read more"/"Collapse", lalu potong di batas kata.
 */
function buildSynopsis(description: string | null): string {
  if (!description) return '';
  const cleaned = description
    .replace(/\s*Read more\s*/gi, ' ')
    .replace(/\s*Collapse\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length <= SYNOPSIS_MAX) return cleaned;

  const truncated = cleaned.slice(0, SYNOPSIS_MAX);
  const lastSpace = truncated.lastIndexOf(' ');
  return `${truncated.slice(0, lastSpace > 0 ? lastSpace : SYNOPSIS_MAX)}…`;
}

const STATUS_LABEL: Record<string, string> = {
  ONGOING: 'Berjalan',
  COMPLETED: 'Tamat',
  HIATUS: 'Hiatus',
};

// ------------------------------------------------------------
// Hooks subscribe ke sistem eksternal (media query & visibilitas tab)
// memakai useSyncExternalStore — menghindari setState di dalam effect
// dan otomatis membersihkan listener saat unmount.
// ------------------------------------------------------------

function subscribeReducedMotion(callback: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Server snapshot — selalu false (safe default). */
function getReducedMotionServerSnapshot(): boolean {
  return false;
}

function subscribeTabVisibility(callback: () => void): () => void {
  if (typeof document === 'undefined') return () => {};
  document.addEventListener('visibilitychange', callback);
  return () => document.removeEventListener('visibilitychange', callback);
}

function getTabVisibilitySnapshot(): boolean {
  if (typeof document === 'undefined') return true;
  return document.visibilityState === 'visible';
}

function getTabVisibilityServerSnapshot(): boolean {
  return true;
}

/**
 * Auto-sliding hero carousel untuk novel unggulan.
 *
 * - Ganti slide otomatis setiap 5 detik, kembali ke awal setelah slide terakhir.
 * - Navigasi manual (panah + indikator) akan mengulang ulang timer.
 * - Jeda saat hover / fokus keyboard.
 * - Jeda saat tab browser tidak aktif (Page Visibility API).
 * - Menghormati `prefers-reduced-motion` (tanpa auto-slide & tanpa transisi).
 * - Semua timer & event listener dibersihkan saat unmount.
 */
export default function HeroCarousel({ novels }: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  // Cover yang gagal dimuat -> fallback ke placeholder.
  const [brokenCovers, setBrokenCovers] = useState<Record<number, boolean>>({});

  const total = novels.length;

  // Ref agar penjadwalan ulang tidak bergantung pada identitas callback.
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Preferensi reduced motion & visibilitas tab (subscribed, bukan setState di effect).
  const reduceMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );
  const isTabVisible = useSyncExternalStore(
    subscribeTabVisibility,
    getTabVisibilitySnapshot,
    getTabVisibilityServerSnapshot
  );

  // ------------------------------------------------------------
  // Helper navigasi
  // ------------------------------------------------------------
  const goTo = useCallback((index: number) => {
    if (total === 0) return;
    setActiveIndex(((index % total) + total) % total);
  }, [total]);

  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);
  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);

  // ------------------------------------------------------------
  // Auto-slide: satu timeout yang dijadwalkan ulang tiap perubahan
  // activeIndex. Tidak membuat interval baru pada setiap render.
  // ------------------------------------------------------------
  useEffect(() => {
    if (total <= 1) return;
    if (reduceMotion || isPaused || !isTabVisible) return;

    timeoutRef.current = setTimeout(() => {
      setActiveIndex((prev) => (prev + 1) % total);
    }, AUTO_SLIDE_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [activeIndex, total, reduceMotion, isPaused, isTabVisible]);

  if (total === 0) return null;

  const statusLabel = (status: string) => STATUS_LABEL[status] ?? status;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Novel unggulan"
      className="relative overflow-hidden bg-zinc-950 text-white border-b border-zinc-800/80"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        // Hanya lanjutkan bila fokus keluar dari seluruh slider.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsPaused(false);
        }
      }}
    >
      {/* Latar dekoratif ungu/indigo yang menyatu dengan tema Novelku */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(60% 80% at 15% 20%, rgba(99,102,241,0.22) 0%, transparent 60%), radial-gradient(50% 70% at 85% 80%, rgba(139,92,246,0.18) 0%, transparent 60%)',
        }}
      />

      <div className="relative w-full mx-auto px-6 lg:px-7 py-8 sm:py-10 lg:py-12">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,240px)_1fr] lg:grid-cols-[minmax(0,300px)_1fr] gap-6 lg:gap-10 items-center">
          {/* ================= COVER ================= */}
          <div className="justify-self-center md:justify-self-start w-40 sm:w-48 md:w-full">
            <div
              className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-zinc-800 shadow-2xl shadow-indigo-950/50 ring-1 ring-white/10"
              aria-live="polite"
            >
              {novels.map((novel, index) => {
                const isActive = index === activeIndex;
                const coverSrc = novel.coverImage ? formatImageUrl(novel.coverImage) : '';
                const isBroken = brokenCovers[novel.id];
                return (
                  <div
                    key={novel.id}
                    aria-hidden={!isActive}
                    className="absolute inset-0 transition-opacity duration-500 ease-out"
                    style={{
                      opacity: isActive ? 1 : 0,
                      transitionDuration: reduceMotion ? '0ms' : undefined,
                      zIndex: isActive ? 1 : 0,
                    }}
                  >
                    {coverSrc && !isBroken ? (
                      <img
                        src={coverSrc}
                        alt={`Sampul novel ${novel.title}`}
                        loading={index === 0 ? 'eager' : 'lazy'}
                        // Mencegah layout shift: wadah sudah punya rasio 3:4.
                        className="w-full h-full object-cover"
                        onError={() =>
                          setBrokenCovers((prev) => ({ ...prev, [novel.id]: true }))
                        }
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 text-center text-zinc-500 bg-gradient-to-br from-zinc-800 to-zinc-900">
                        <BookOpen className="w-8 h-8" />
                        <span className="text-xs font-medium line-clamp-3">{novel.title}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ================= INFORMASI ================= */}
          <div className="min-w-0">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-300 text-xs font-semibold mb-4 border border-indigo-500/30">
              <Star className="w-3.5 h-3.5 fill-indigo-300 text-indigo-300" />
              <span>Novel Unggulan</span>
            </div>

            {/* Semua slide ada di DOM; hanya yang aktif yang terlihat.
                Konten dibaca pembaca layar via aria-live. */}
            <div aria-live="polite" aria-atomic="true">
              {novels.map((novel, index) => {
                const isActive = index === activeIndex;
                const synopsis = buildSynopsis(novel.description);
                return (
                  <div
                    key={novel.id}
                    aria-hidden={!isActive}
                    className="transition-opacity duration-500 ease-out"
                    style={{
                      display: isActive ? 'block' : 'none',
                    }}
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white/10 text-zinc-200 border border-white/10">
                        {statusLabel(novel.status)}
                      </span>
                      {novel.genres.slice(0, 3).map((genre) => (
                        <span
                          key={genre.id}
                          className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                        >
                          {genre.name}
                        </span>
                      ))}
                    </div>

                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight text-white line-clamp-2">
                      {novel.title}
                    </h2>

                    <p className="mt-1.5 text-sm text-zinc-400">
                      Oleh <span className="text-zinc-200 font-medium">{novel.author}</span>
                    </p>

                    {synopsis && (
                      <p className="mt-4 text-sm sm:text-base text-zinc-300/90 leading-relaxed max-w-2xl line-clamp-3">
                        {synopsis}
                      </p>
                    )}

                    {/* Statistik ringkas */}
                    <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-zinc-400">
                      <span className="inline-flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-zinc-200 font-semibold">
                          {novel.averageRating.toFixed(1)}
                        </span>
                        <span>({novel.ratingCount})</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Library className="w-3.5 h-3.5" />
                        <span>{novel.totalChapters} Chapter</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" />
                        <span>{novel.viewCount.toLocaleString('id-ID')}</span>
                      </span>
                    </div>

                    {/* Tombol aksi */}
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <Link
                        href={`/novels/${novel.id}`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-indigo-600/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>Baca Sekarang</span>
                      </Link>
                      <Link
                        href={`/novels/${novel.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/15 hover:border-white/30 hover:bg-white/5 text-sm font-medium text-zinc-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                      >
                        <span>Detail Novel</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ================= KONTROL NAVIGASI ================= */}
        {total > 1 && (
          <div className="mt-8 flex items-center justify-between gap-4">
            {/* Indikator titik */}
            <div className="flex items-center gap-2" role="tablist" aria-label="Pilih slide">
              {novels.map((novel, index) => {
                const isActive = index === activeIndex;
                return (
                  <button
                    key={novel.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`Tampilkan "${novel.title}"`}
                    onClick={() => goTo(index)}
                    className={`h-2 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
                      isActive ? 'w-7 bg-indigo-500' : 'w-2 bg-white/25 hover:bg-white/45'
                    }`}
                  />
                );
              })}
            </div>

            {/* Tombol panah */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goPrev}
                aria-label="Slide sebelumnya"
                className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Slide berikutnya"
                className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
