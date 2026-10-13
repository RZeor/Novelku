'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { novelApi, genreApi, historyApi } from '@/lib/api-client';
import {
  NovelListResponse,
  UpdatedNovelResponse,
  FeaturedNovelResponse,
  GenreResponse,
  ReadingHistoryResponse,
} from '@/types';
import NovelCard from '@/components/novel-card';
import NovelUpdateCard from '@/components/novel-update-card';
import HeroCarousel from '@/components/hero-carousel';
import { formatImageUrl } from '@/lib/utils';
import {
  BookOpen,
  TrendingUp,
  Layers,
  ArrowRight,
  Clock,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();

  const [featuredNovels, setFeaturedNovels] = useState<FeaturedNovelResponse[]>([]);
  const [updatedNovels, setUpdatedNovels] = useState<UpdatedNovelResponse[]>([]);
  const [popularNovels, setPopularNovels] = useState<NovelListResponse[]>([]);
  const [genres, setGenres] = useState<GenreResponse[]>([]);
  const [recentHistory, setRecentHistory] = useState<ReadingHistoryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHomeData() {
      setIsLoading(true);
      try {
        const [featuredRes, updatesRes, popularRes, genresRes] = await Promise.all([
          novelApi.featured(5),
          novelApi.updates(8),
          novelApi.list({ sortBy: 'viewCount', sortOrder: 'desc', limit: 6 }),
          genreApi.list(),
        ]);

        setFeaturedNovels(featuredRes);
        setUpdatedNovels(updatesRes);
        setPopularNovels(popularRes.items);
        setGenres(genresRes);

        // Jika user login, ambil riwayat membaca terakhir
        if (user) {
          try {
            const historyRes = await historyApi.list({ limit: 4 });
            setRecentHistory(historyRes.items);
          } catch {
            setRecentHistory([]);
          }
        }
      } catch (err) {
        console.error('Failed to load homepage data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadHomeData();
  }, [user]);

  return (
    <div className="flex-1 flex flex-col space-y-12 pb-16">
      {/* 1. HERO SECTION — Auto-Sliding Carousel Novel Unggulan */}
      {isLoading ? (
        <section
          aria-hidden="true"
          className="relative overflow-hidden bg-zinc-950 border-b border-zinc-800/80"
        >
          <div className="w-full mx-auto px-6 lg:px-7 py-8 sm:py-10 lg:py-12">
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,240px)_1fr] lg:grid-cols-[minmax(0,300px)_1fr] gap-6 lg:gap-10 items-center">
              <div className="justify-self-center md:justify-self-start w-40 sm:w-48 md:w-full">
                <div className="aspect-[3/4] w-full rounded-2xl bg-zinc-800/80 animate-pulse" />
              </div>
              <div className="space-y-4">
                <div className="h-6 w-32 rounded-full bg-zinc-800/80 animate-pulse" />
                <div className="h-8 w-3/4 rounded-lg bg-zinc-800/80 animate-pulse" />
                <div className="h-4 w-1/3 rounded bg-zinc-800/60 animate-pulse" />
                <div className="h-16 w-full max-w-2xl rounded bg-zinc-800/50 animate-pulse" />
                <div className="h-10 w-40 rounded-xl bg-zinc-800/80 animate-pulse" />
              </div>
            </div>
          </div>
        </section>
      ) : featuredNovels.length > 0 ? (
        <HeroCarousel novels={featuredNovels} />
      ) : (
        /* Fallback bila belum ada novel (tanpa menampilkan novel fiktif) */
        <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/70 via-white to-transparent dark:from-indigo-950/20 dark:via-zinc-950 dark:to-transparent border-b border-zinc-100 dark:border-zinc-900 py-12 sm:py-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-5">
              <BookOpen className="w-7 h-7" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3">
              Selamat Datang di Novelku
            </h1>
            <p className="text-base text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto mb-6 leading-relaxed">
              Belum ada novel yang dipublikasikan. Silakan jelajahi katalog atau kembali lagi nanti untuk menemukan kisah favorit Anda.
            </p>
            <Link
              href="/novels"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-indigo-600/20"
            >
              <span>Jelajahi Katalog</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      )}

      <div className="w-full mx-auto px-6 lg:px-7 space-y-14">
        {/* 2. SECTION LANJUTKAN MEMBACA (Khusus user login dengan riwayat) */}
        {user && recentHistory.length > 0 && (
          <section className="bg-indigo-50/50 dark:bg-indigo-950/20 rounded-3xl p-6 sm:p-8 border border-indigo-100 dark:border-indigo-900/50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    Lanjutkan Membaca
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Buku yang terakhir Anda buka
                  </p>
                </div>
              </div>
              <Link
                href="/history"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Semua Riwayat</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 2xl:grid-cols-8 gap-4">
              {recentHistory.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800 flex items-center gap-3.5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-16 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0">
                    {item.novel?.coverImage ? (
                      <img
                        src={formatImageUrl(item.novel.coverImage)}
                        alt={item.novel.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-400">
                        <BookOpen className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {item.novel?.title || 'Novel'}
                    </h3>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                      Chapter {item.chapter?.chapterNumber}: {item.chapter?.title}
                    </p>
                    <Link
                      href={`/chapters/${item.chapterId}`}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 mt-2"
                    >
                      <span>Lanjut Baca</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 3. SECTION NOVEL POPULER */}
        {popularNovels.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  Novel Populer
                </h2>
              </div>
              <Link
                href="/novels?sortBy=viewCount"
                className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Lihat Selengkapnya</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 2xl:grid-cols-8 gap-4 sm:gap-6">
              {popularNovels.map((novel) => (
                <NovelCard key={novel.id} novel={novel} />
              ))}
            </div>
          </section>
        )}

        {/* 4. SECTION NOVEL UPDATE (novel yang baru mendapat chapter baru) */}
        {updatedNovels.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-amber-500" />
                <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  Novel Update
                </h2>
              </div>
              <Link
                href="/novels"
                className="text-sm font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>Lihat Semua</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6">
              {updatedNovels.map((novel) => (
                <NovelUpdateCard key={novel.id} novel={novel} />
              ))}
            </div>
          </section>
        )}

        {/* 5. SECTION JELAJAH GENRE */}
        {genres.length > 0 && (
          <section className="pt-6 border-t border-zinc-200/80 dark:border-zinc-800">
            <div className="flex items-center gap-2 mb-6">
              <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                Jelajah Berdasarkan Genre
              </h2>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {genres.map((genre) => (
                <Link
                  key={genre.id}
                  href={`/novels?genre=${genre.slug}`}
                  className="px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 hover:text-indigo-600 dark:hover:border-indigo-500 dark:hover:text-indigo-400 text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-all shadow-sm"
                >
                  {genre.name}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
