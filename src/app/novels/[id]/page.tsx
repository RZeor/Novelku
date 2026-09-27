'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { novelApi, bookmarkApi, likeApi, ApiError } from '@/lib/api-client';
import { NovelResponse, ChapterListResponse } from '@/types';
import RatingWidget from '@/components/rating-widget';
import CommentSection from '@/components/comment-section';
import { formatImageUrl } from '@/lib/utils';
import {
  BookOpen,
  Star,
  Eye,
  Heart,
  Bookmark,
  ArrowLeft,
  Calendar,
  Layers,
  Search,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface NovelDetailProps {
  params: Promise<{ id: string }>;
}

export default function NovelDetailPage({ params }: NovelDetailProps) {
  const resolvedParams = use(params);
  const novelId = parseInt(resolvedParams.id, 10);
  const router = useRouter();
  const { user } = useAuth();

  const [novel, setNovel] = useState<(NovelResponse & { chapters: ChapterListResponse[] }) | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Interaction states
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [chapterSearch, setChapterSearch] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    async function loadNovelData() {
      if (isNaN(novelId)) {
        setError('ID novel tidak valid');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const data = await novelApi.get(novelId);
        setNovel(data);
        if (typeof document !== 'undefined') {
          document.title = `${data.title} — Novelku`;
        }

        // Jika user login, cek apakah novel ini ada di daftar bookmark
        if (user) {
          try {
            const bookmarksRes = await bookmarkApi.list({ limit: 100 });
            const bookmarked = bookmarksRes.items.some((b) => b.novelId === novelId);
            setIsBookmarked(bookmarked);
          } catch {
            // Abaikan error bookmark check
          }
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setError('Novel tidak ditemukan');
        } else {
          setError('Gagal memuat detail novel');
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadNovelData();
  }, [novelId, user]);

  // Handle Bookmark Toggle
  const handleBookmarkToggle = async () => {
    if (!user) {
      router.push(`/login?redirect=/novels/${novelId}`);
      return;
    }

    setIsActionLoading(true);
    try {
      if (isBookmarked) {
        await bookmarkApi.remove(novelId);
        setIsBookmarked(false);
      } else {
        await bookmarkApi.add(novelId);
        setIsBookmarked(true);
      }
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Gagal mengubah status bookmark');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle Like Toggle
  const handleLikeToggle = async () => {
    if (!user) {
      router.push(`/login?redirect=/novels/${novelId}`);
      return;
    }

    setIsActionLoading(true);
    try {
      if (isLiked) {
        await likeApi.unlike(novelId);
        setIsLiked(false);
      } else {
        await likeApi.like(novelId);
        setIsLiked(true);
      }
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Gagal mengubah status like');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRatingUpdated = (newAvg: number, newCount: number) => {
    if (novel) {
      setNovel({
        ...novel,
        averageRating: newAvg,
        ratingCount: newCount,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
        <p className="text-xs text-zinc-400">Memuat detail novel...</p>
      </div>
    );
  }

  if (error || !novel) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          {error || 'Novel tidak ditemukan'}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 mb-6">
          Novel yang Anda cari mungkin telah dihapus atau URL yang dituju tidak valid.
        </p>
        <Link
          href="/novels"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Katalog</span>
        </Link>
      </div>
    );
  }

  const filteredChapters = novel.chapters.filter((ch) =>
    ch.title.toLowerCase().includes(chapterSearch.toLowerCase()) ||
    ch.chapterNumber.toString().includes(chapterSearch)
  );

  const firstChapter = novel.chapters.length > 0 ? novel.chapters[0] : null;

  const statusLabel =
    novel.status === 'COMPLETED' ? 'Tamat' : novel.status === 'HIATUS' ? 'Hiatus' : 'Berjalan (Ongoing)';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full flex-1 space-y-10">
      {/* Breadcrumb / Back Link */}
      <Link
        href="/novels"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Kembali ke Katalog Novel</span>
      </Link>

      {/* 1. HERO DETAIL NOVEL */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Cover Image */}
          <div className="w-44 sm:w-56 md:w-64 mx-auto md:mx-0 shrink-0">
            <div className="aspect-[3/4] rounded-2xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden shadow-lg border border-zinc-200/80 dark:border-zinc-800 relative">
              {novel.coverImage ? (
                <img
                  src={formatImageUrl(novel.coverImage)}
                  alt={novel.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-zinc-400">
                  <BookOpen className="w-12 h-12 mb-3" />
                  <span className="text-xs font-medium">{novel.title}</span>
                </div>
              )}
            </div>
          </div>

          {/* Info & Meta */}
          <div className="flex-1 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Genres */}
              <div className="flex flex-wrap gap-1.5 justify-center md:justify-start">
                {novel.genres.map((g) => (
                  <Link
                    key={g.id}
                    href={`/novels?genre=${g.slug}`}
                    className="text-xs font-medium px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
                  >
                    {g.name}
                  </Link>
                ))}
                <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  {statusLabel}
                </span>
              </div>

              {/* Title & Author */}
              <div className="text-center md:text-left">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
                  {novel.title}
                </h1>
                <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mt-1">
                  Penulis:{' '}
                  <span className="font-semibold text-zinc-900 dark:text-zinc-200">
                    {novel.author}
                  </span>
                </p>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-3 gap-3 py-3 border-y border-zinc-100 dark:border-zinc-800">
                <div className="text-center sm:text-left">
                  <p className="text-[11px] text-zinc-400 font-medium">Rating</p>
                  <p className="text-base sm:text-lg font-bold text-amber-500 flex items-center justify-center sm:justify-start gap-1">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                    <span>{Number(novel.averageRating).toFixed(1)}</span>
                    <span className="text-xs text-zinc-400 font-normal">
                      ({novel.ratingCount})
                    </span>
                  </p>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-[11px] text-zinc-400 font-medium">Total Bab</p>
                  <p className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-center sm:justify-start gap-1">
                    <BookOpen className="w-4 h-4 text-indigo-500" />
                    <span>{novel.totalChapters}</span>
                  </p>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-[11px] text-zinc-400 font-medium">Dilihat</p>
                  <p className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-center sm:justify-start gap-1">
                    <Eye className="w-4 h-4 text-indigo-500" />
                    <span>{novel.viewCount.toLocaleString()}</span>
                  </p>
                </div>
              </div>

              {/* Synopsis / Description */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Sinopsis
                </h3>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                  {novel.description || 'Belum ada deskripsi untuk novel ini.'}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              {firstChapter ? (
                <Link
                  href={`/chapters/${firstChapter.id}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Mulai Baca (Bab 1)</span>
                </Link>
              ) : (
                <button
                  disabled
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-400 text-sm font-semibold cursor-not-allowed text-center"
                >
                  Belum ada chapter
                </button>
              )}

              <div className="flex items-center gap-2.5">
                {/* Bookmark Button */}
                <button
                  onClick={handleBookmarkToggle}
                  disabled={isActionLoading}
                  className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border transition-colors ${
                    isBookmarked
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-500 text-amber-500' : ''}`} />
                  <span>{isBookmarked ? 'Tersimpan' : 'Favorit'}</span>
                </button>

                {/* Like Button */}
                <button
                  onClick={handleLikeToggle}
                  disabled={isActionLoading}
                  className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border transition-colors ${
                    isLiked
                      ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                  <span>{isLiked ? 'Disukai' : 'Suka'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. RATING WIDGET */}
      <RatingWidget
        novelId={novel.id}
        averageRating={Number(novel.averageRating)}
        ratingCount={novel.ratingCount}
        onRatingUpdated={handleRatingUpdated}
      />

      {/* 3. DAFTAR CHAPTER */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Daftar Chapter ({novel.chapters.length})
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Pilih bab untuk mulai membaca
            </p>
          </div>

          {/* Search Chapter */}
          {novel.chapters.length > 5 && (
            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={chapterSearch}
                onChange={(e) => setChapterSearch(e.target.value)}
                placeholder="Cari nomor / judul bab..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>

        {novel.chapters.length === 0 ? (
          <div className="text-center py-12 text-zinc-400 text-xs">
            Belum ada chapter yang ditambahkan untuk novel ini.
          </div>
        ) : filteredChapters.length === 0 ? (
          <div className="text-center py-8 text-zinc-400 text-xs">
            Tidak ada chapter yang cocok dengan pencarian "{chapterSearch}".
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredChapters.map((ch) => (
              <Link
                key={ch.id}
                href={`/chapters/${ch.id}`}
                className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:border-indigo-500/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all group"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                    Bab {ch.chapterNumber}: {ch.title}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {ch.wordCount.toLocaleString()} kata •{' '}
                    {new Date(ch.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-indigo-600 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 4. KOMENTAR SECTION */}
      <CommentSection novelId={novel.id} />
    </div>
  );
}
