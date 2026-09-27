'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { bookmarkApi, ApiError } from '@/lib/api-client';
import { BookmarkResponse, PaginationMeta } from '@/types';
import Pagination from '@/components/pagination';
import {
  Bookmark,
  BookOpen,
  Trash2,
  Compass,
  ArrowRight,
  Loader2,
  Lock,
} from 'lucide-react';

function BookmarksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isAuthLoading } = useAuth();

  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const [bookmarks, setBookmarks] = useState<BookmarkResponse[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 12,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadBookmarks = useCallback(
    async (page: number) => {
      setIsLoading(true);
      try {
        const res = await bookmarkApi.list({ page, limit: 12 });
        setBookmarks(res.items);
        setPagination(res.pagination);
      } catch (err) {
        console.error('Failed to load bookmarks:', err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (user) {
      loadBookmarks(currentPage);
    } else if (!isAuthLoading) {
      setIsLoading(false);
    }
  }, [user, isAuthLoading, currentPage, loadBookmarks]);

  const handleRemoveBookmark = async (novelId: number) => {
    try {
      await bookmarkApi.remove(novelId);
      setBookmarks((prev) => prev.filter((b) => b.novelId !== novelId));
      setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Gagal menghapus bookmark');
    }
  };

  // Jika belum login
  if (!isAuthLoading && !user) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-100 dark:border-indigo-900/50">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Masuk untuk Melihat Favorit
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 mb-6">
          Simpan novel-novel terbaik Anda dan akses dengan mudah kapan saja di sini.
        </p>
        <Link
          href="/login?redirect=/bookmarks"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition-colors"
        >
          <span>Masuk Sekarang</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full flex-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-sm font-semibold mb-1">
            <Bookmark className="w-4 h-4" />
            <span>Koleksi Pribadi</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Novel Favorit ({pagination.total})
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Daftar novel yang telah Anda tandai sebagai favorit
          </p>
        </div>

        <Link
          href="/novels"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <Compass className="w-4 h-4" />
          <span>Jelajah Novel Lainnya</span>
        </Link>
      </div>

      {/* Konten */}
      {isLoading || isAuthLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse flex gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
            >
              <div className="w-20 aspect-[3/4] bg-zinc-200 dark:bg-zinc-800 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
                <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8 max-w-lg mx-auto">
          <Bookmark className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Belum ada novel favorit
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-6">
            Jelajahi katalog novel dan klik tombol "Favorit" untuk menyimpan novel yang Anda sukai.
          </p>
          <Link
            href="/novels"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors"
          >
            <Compass className="w-4 h-4" />
            <span>Buka Katalog Novel</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {bookmarks.map((b) => (
            <div
              key={b.id}
              className="group bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all flex gap-4 relative"
            >
              {/* Cover */}
              <Link
                href={`/novels/${b.novelId}`}
                className="w-20 sm:w-24 aspect-[3/4] rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0 block relative"
              >
                {b.novel?.coverImage ? (
                  <img
                    src={b.novel.coverImage}
                    alt={b.novel.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-400">
                    <BookOpen className="w-6 h-6" />
                  </div>
                )}
              </Link>

              {/* Info */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                <div>
                  <Link
                    href={`/novels/${b.novelId}`}
                    className="font-bold text-sm text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors line-clamp-2"
                  >
                    {b.novel?.title || 'Novel'}
                  </Link>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate">
                    Oleh {b.novel?.author || '-'}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-zinc-400">
                    <span>{b.novel?.totalChapters || 0} Bab</span>
                    <span>•</span>
                    <span className="text-amber-500 font-semibold">
                      ★ {Number(b.novel?.averageRating || 0).toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                  <Link
                    href={`/novels/${b.novelId}`}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <span>Detail</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    onClick={() => handleRemoveBookmark(b.novelId)}
                    className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                    title="Hapus dari favorit"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(p) => router.push(`/bookmarks?page=${p}`)}
        />
      )}
    </div>
  );
}

export default function BookmarksPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <BookmarksContent />
    </Suspense>
  );
}
