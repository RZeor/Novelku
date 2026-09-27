'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { historyApi } from '@/lib/api-client';
import { ReadingHistoryResponse, PaginationMeta } from '@/types';
import Pagination from '@/components/pagination';
import {
  History,
  BookOpen,
  ArrowRight,
  Compass,
  Clock,
  Loader2,
  Lock,
} from 'lucide-react';

function HistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isAuthLoading } = useAuth();

  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const [histories, setHistories] = useState<ReadingHistoryResponse[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 12,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = useCallback(async (page: number) => {
    setIsLoading(true);
    try {
      const res = await historyApi.list({ page, limit: 12 });
      setHistories(res.items);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to load reading history:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadHistory(currentPage);
    } else if (!isAuthLoading) {
      setIsLoading(false);
    }
  }, [user, isAuthLoading, currentPage, loadHistory]);

  // Jika belum login
  if (!isAuthLoading && !user) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-100 dark:border-indigo-900/50">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Masuk untuk Melihat Riwayat Baca
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 mb-6">
          Riwayat bacaan Anda disimpan secara otomatis agar Anda dapat melanjutkan membaca kapan saja.
        </p>
        <Link
          href="/login?redirect=/history"
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
            <History className="w-4 h-4" />
            <span>Aktivitas Membaca</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Riwayat Membaca ({pagination.total})
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Bab-bab yang baru saja Anda buka dan baca
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
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
            >
              <div className="w-16 h-20 bg-zinc-200 dark:bg-zinc-800 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3" />
                <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : histories.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8 max-w-lg mx-auto">
          <History className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Belum ada riwayat membaca
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-6">
            Mulai membaca salah satu novel favorit Anda sekarang, dan bab terakhir akan tersimpan otomatis di sini.
          </p>
          <Link
            href="/novels"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors"
          >
            <Compass className="w-4 h-4" />
            <span>Mulai Membaca</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {histories.map((h) => (
            <div
              key={h.id}
              className="bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-5 border border-zinc-200/80 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              {/* Info Novel & Chapter */}
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-14 h-18 rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0">
                  {h.novel?.coverImage ? (
                    <img
                      src={h.novel.coverImage}
                      alt={h.novel.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400">
                      <BookOpen className="w-6 h-6" />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <Link
                    href={`/novels/${h.novelId}`}
                    className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate block"
                  >
                    {h.novel?.title || 'Novel'}
                  </Link>
                  <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-0.5">
                    Bab {h.chapter?.chapterNumber}: {h.chapter?.title}
                  </p>
                  <p className="text-[11px] text-zinc-400 flex items-center gap-1 mt-1.5">
                    <Clock className="w-3 h-3" />
                    <span>
                      Dibaca pada{' '}
                      {new Date(h.lastReadAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <Link
                  href={`/chapters/${h.chapterId}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  <span>Lanjutkan Membaca</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
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
          onPageChange={(p) => router.push(`/history?page=${p}`)}
        />
      )}
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <HistoryContent />
    </Suspense>
  );
}
