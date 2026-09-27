'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { adminApi, ApiError } from '@/lib/api-client';
import { CommentResponse, PaginationMeta } from '@/types';
import Pagination from '@/components/pagination';
import {
  MessageSquare,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  BookOpen,
  User as UserIcon,
  Clock,
} from 'lucide-react';

type AdminCommentItem = CommentResponse & {
  novel: { id: number; title: string; slug: string };
};

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<AdminCommentItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchComments = useCallback(async (page: number) => {
    setIsLoading(true);
    try {
      const res = await adminApi.comments({ page, limit: 10 });
      setComments(res.items);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to load comments:', err);
      setFeedback({
        text: err instanceof ApiError ? err.message : 'Gagal memuat daftar komentar',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComments(currentPage);
  }, [fetchComments, currentPage]);

  const handleDelete = async (id: number, username: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus komentar dari "${username}"?`)) {
      return;
    }

    setDeletingId(id);
    setFeedback(null);

    try {
      const res = await adminApi.deleteComment(id);
      setFeedback({
        text: res.message || 'Komentar berhasil dihapus',
        type: 'success',
      });
      // Hapus dari state lokal
      setComments((prev) => prev.filter((c) => c.id !== id));
      if (pagination) {
        setPagination({
          ...pagination,
          total: Math.max(0, pagination.total - 1),
        });
      }
    } catch (err) {
      setFeedback({
        text: err instanceof ApiError ? err.message : 'Gagal menghapus komentar',
        type: 'error',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400">
            Moderasi Konten
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mt-0.5">
            Moderasi Komentar
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Total {pagination ? pagination.total : '...'} komentar pembaca di seluruh novel
          </p>
        </div>
      </div>

      {/* Notifikasi Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50'
              : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabel Komentar */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 font-semibold border-b border-zinc-100 dark:border-zinc-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-6">Pengguna</th>
                <th className="py-3 px-6">Novel</th>
                <th className="py-3 px-6">Isi Komentar</th>
                <th className="py-3 px-6">Waktu</th>
                <th className="py-3 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
                    <span className="text-xs text-zinc-400">Memuat komentar...</span>
                  </td>
                </tr>
              ) : comments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-zinc-400 text-xs">
                    Belum ada komentar dari pembaca.
                  </td>
                </tr>
              ) : (
                comments.map((c) => {
                  const isDeleting = deletingId === c.id;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors align-top"
                    >
                      {/* Pengguna */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-[10px]">
                            {c.user?.username?.substring(0, 2).toUpperCase() || 'U'}
                          </div>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {c.user?.username || 'Anonim'}
                          </span>
                        </div>
                      </td>

                      {/* Novel */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <Link
                          href={`/novels/${c.novelId}`}
                          target="_blank"
                          className="inline-flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-zinc-400 group-hover:text-indigo-600" />
                          <span>{c.novel?.title || `Novel #${c.novelId}`}</span>
                          <ExternalLink className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </td>

                      {/* Isi Komentar */}
                      <td className="py-4 px-6 max-w-md">
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-200 leading-relaxed font-sans">
                          {c.content}
                        </div>
                      </td>

                      {/* Waktu */}
                      <td className="py-4 px-6 text-zinc-400 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(c.createdAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Aksi */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleDelete(c.id, c.user?.username || 'Pengguna')}
                          disabled={isDeleting}
                          className="p-2 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 border border-transparent hover:border-red-200 dark:hover:border-red-900/40 transition-colors disabled:opacity-50"
                          title="Hapus Komentar"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              onPageChange={(p) => setCurrentPage(p)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
