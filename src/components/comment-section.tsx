'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { commentApi, ApiError } from '@/lib/api-client';
import { CommentResponse, PaginationMeta } from '@/types';
import Pagination from '@/components/pagination';
import { MessageSquare, Send, Trash2, Loader2, AlertCircle } from 'lucide-react';

interface CommentSectionProps {
  novelId: number;
}

export default function CommentSection({ novelId }: CommentSectionProps) {
  const { user } = useAuth();

  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadComments = useCallback(
    async (page: number) => {
      setIsLoading(true);
      try {
        const res = await commentApi.listByNovel(novelId, { page, limit: 10 });
        setComments(res.items);
        setPagination(res.pagination);
      } catch (err) {
        console.error('Failed to load comments:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [novelId]
  );

  useEffect(() => {
    loadComments(currentPage);
  }, [loadComments, currentPage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const newComment = await commentApi.create(novelId, content.trim());
      setContent('');
      // Tambahkan komentar baru di paling atas
      setComments((prev) => [newComment, ...prev]);
      setPagination((prev) => ({ ...prev, total: prev.total + 1 }));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Gagal mengirim komentar');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus komentar ini?')) return;

    try {
      await commentApi.delete(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Gagal menghapus komentar');
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 sm:p-8 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-6">
      {/* Header Komentar */}
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Komentar ({pagination.total})
          </h2>
        </div>
      </div>

      {/* Form Tambah Komentar */}
      {user ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="relative">
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Bagikan pendapat Anda tentang novel ini..."
              required
              maxLength={2000}
              className="w-full p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-zinc-800 resize-none transition-all"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-zinc-400">
                {content.length} / 2000 karakter
              </span>
              <button
                type="submit"
                disabled={isSubmitting || !content.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Mengirim...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim Komentar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-600 dark:text-zinc-400">
          Silakan{' '}
          <Link
            href="/login"
            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Masuk
          </Link>{' '}
          atau{' '}
          <Link
            href="/register"
            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Daftar
          </Link>{' '}
          untuk meninggalkan komentar.
        </div>
      )}

      {/* Daftar Komentar */}
      <div className="space-y-4 pt-2">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse flex gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40">
                <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-700 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-zinc-200 dark:bg-zinc-700 rounded w-1/4" />
                  <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-zinc-400 text-xs">
            Belum ada komentar untuk novel ini. Jadilah yang pertama berkomentar!
          </div>
        ) : (
          comments.map((comment) => {
            const canDelete = user && (user.id === comment.userId || user.role === 'ADMIN');

            return (
              <div
                key={comment.id}
                className="p-4 rounded-xl bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/80 flex items-start justify-between gap-3 group"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
                    {comment.user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {comment.user.username}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {new Date(comment.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-1 whitespace-pre-line leading-relaxed">
                      {comment.content}
                    </p>
                  </div>
                </div>

                {canDelete && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="p-1 text-zinc-400 hover:text-red-500 rounded transition-colors shrink-0"
                    title="Hapus komentar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}

        {/* Pagination Komentar */}
        {!isLoading && pagination.totalPages > 1 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(p) => setCurrentPage(p)}
          />
        )}
      </div>
    </div>
  );
}
