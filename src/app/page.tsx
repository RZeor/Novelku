'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { novelApi, genreApi, historyApi } from '@/lib/api-client';
import {
  NovelListResponse,
  UpdatedNovelResponse,
  GenreResponse,
  ReadingHistoryResponse,
} from '@/types';
import NovelCard from '@/components/novel-card';
import NovelUpdateCard from '@/components/novel-update-card';
import { formatImageUrl } from '@/lib/utils';
import {
  BookOpen,
  Search,
  TrendingUp,
  Sparkles,
  Layers,
  ArrowRight,
  Clock,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [latestNovels, setLatestNovels] = useState<NovelListResponse[]>([]);
  const [updatedNovels, setUpdatedNovels] = useState<UpdatedNovelResponse[]>([]);
  const [popularNovels, setPopularNovels] = useState<NovelListResponse[]>([]);
  const [genres, setGenres] = useState<GenreResponse[]>([]);
  const [recentHistory, setRecentHistory] = useState<ReadingHistoryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHomeData() {
      setIsLoading(true);
      try {
        const [latestRes, updatesRes, popularRes, genresRes] = await Promise.all([
          novelApi.list({ sortBy: 'createdAt', sortOrder: 'desc', limit: 8 }),
          novelApi.updates(8),
          novelApi.list({ sortBy: 'viewCount', sortOrder: 'desc', limit: 4 }),
          genreApi.list(),
        ]);

        setLatestNovels(latestRes.items);
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

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/novels?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col space-y-12 pb-16">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/70 via-white to-transparent dark:from-indigo-950/20 dark:via-zinc-950 dark:to-transparent border-b border-zinc-100 dark:border-zinc-900 py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-6 border border-indigo-200/50 dark:border-indigo-800/50">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pengalaman Membaca Novel Tanpa Gangguan</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight mb-4">
            Temukan & Nikmati Kisah <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">
              Favorit Anda di Novelku
            </span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            Platform membaca novel pribadi dengan tampilan yang bersih, nyaman untuk mata, dan kemudahan mengatur pengalaman membaca Anda.
          </p>

          {/* Hero Search Bar */}
          <form
            onSubmit={handleHeroSearch}
            className="max-w-xl mx-auto flex items-center bg-white dark:bg-zinc-900 rounded-2xl p-1.5 border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-indigo-500/5"
          >
            <div className="pl-3.5 text-zinc-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul novel impian Anda..."
              className="flex-1 px-3 py-2.5 bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors shadow-sm shadow-indigo-600/20"
            >
              Cari
            </button>
          </form>

          {/* Quick Stats or Tags */}
          <div className="mt-8 flex items-center justify-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            <span>Populer:</span>
            {genres.slice(0, 4).map((g) => (
              <Link
                key={g.id}
                href={`/novels?genre=${g.slug}`}
                className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors underline-offset-4 hover:underline"
              >
                {g.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-14">
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

            <div className="grid grid-cols-1 sm:grid-cols-4 lg:grid-cols-5 gap-4">
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

        {/* 3. SECTION NOVEL TERBARU */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                Novel Terbaru
              </h2>
            </div>
            <Link
              href="/novels"
              className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>Lihat Semua</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
                >
                  <div className="aspect-[3/4] bg-zinc-200 dark:bg-zinc-800" />
                  <div className="p-4 space-y-2.5">
                    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
                    <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : latestNovels.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <BookOpen className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
              <p className="text-zinc-600 dark:text-zinc-400 font-medium">
                Belum ada novel yang dipublikasikan.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {latestNovels.map((novel) => (
                <NovelCard key={novel.id} novel={novel} />
              ))}
            </div>
          )}
        </section>

        {/* 4. SECTION NOVEL POPULER */}
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

            <div className="grid grid-cols-1 sm:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {popularNovels.map((novel) => (
                <NovelCard key={novel.id} novel={novel} />
              ))}
            </div>
          </section>
        )}

        {/* 5. SECTION NOVEL UPDATE (hanya novel yang baru dapat chapter baru) */}
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

            <div className="grid grid-cols-1 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-4 gap-4 sm:gap-6">
              {updatedNovels.map((novel) => (
                <NovelUpdateCard key={novel.id} novel={novel} />
              ))}
            </div>
          </section>
        )}

        {/* 6. SECTION JELAJAH GENRE */}
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
