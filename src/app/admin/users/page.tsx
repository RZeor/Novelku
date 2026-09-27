'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { adminApi, ApiError } from '@/lib/api-client';
import { UserResponse, PaginationMeta } from '@/types';
import { useAuth } from '@/context/auth-context';
import Pagination from '@/components/pagination';
import {
  Users,
  Search,
  Shield,
  UserCheck,
  UserX,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  User as UserIcon,
} from 'lucide-react';

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<UserResponse[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchUsers = useCallback(async (page: number, search: string) => {
    setIsLoading(true);
    try {
      const res = await adminApi.users({
        page,
        limit: 10,
        search: search.trim() || undefined,
      });
      setUsers(res.items);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to load users:', err);
      setFeedback({
        text: err instanceof ApiError ? err.message : 'Gagal memuat data pengguna',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(currentPage, activeSearch);
  }, [fetchUsers, currentPage, activeSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setActiveSearch(searchQuery);
  };

  const handleToggleStatus = async (user: UserResponse) => {
    if (user.id === currentUser?.id) {
      setFeedback({
        text: 'Anda tidak dapat mengubah status akun Anda sendiri.',
        type: 'error',
      });
      return;
    }

    const actionText = user.isActive ? 'menonaktifkan' : 'mengaktifkan kembali';
    if (!confirm(`Apakah Anda yakin ingin ${actionText} pengguna "${user.username}"?`)) {
      return;
    }

    setActionLoadingId(user.id);
    setFeedback(null);

    try {
      const res = await adminApi.updateUserStatus(user.id, !user.isActive);
      setFeedback({
        text: res.message || `Status ${user.username} berhasil diperbarui`,
        type: 'success',
      });
      // Update data di state lokal
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: !user.isActive } : u))
      );
    } catch (err) {
      setFeedback({
        text: err instanceof ApiError ? err.message : 'Gagal memperbarui status pengguna',
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400">
            Manajemen Sistem
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mt-0.5">
            Kelola Pengguna
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Total {pagination ? pagination.total : '...'} pengguna terdaftar di Novelku
          </p>
        </div>

        {/* Form Pencarian */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-sm w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Cari username atau email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors shrink-0"
          >
            Cari
          </button>
        </form>
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

      {/* Tabel Pengguna */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 font-semibold border-b border-zinc-100 dark:border-zinc-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-6">Pengguna</th>
                <th className="py-3 px-6">Peran (Role)</th>
                <th className="py-3 px-6">Status Akun</th>
                <th className="py-3 px-6">Tanggal Bergabung</th>
                <th className="py-3 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
                    <span className="text-xs text-zinc-400">Memuat data pengguna...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-zinc-400 text-xs">
                    Tidak ada data pengguna ditemukan.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  const isBusy = actionLoadingId === u.id;

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      {/* Avatar & Username/Email */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                            {u.username.substring(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                                {u.username}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-semibold border border-indigo-200/60 dark:border-indigo-800">
                                  Anda
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-zinc-400 block">{u.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Peran (Role) */}
                      <td className="py-4 px-6">
                        {u.role === 'ADMIN' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                            <Shield className="w-3 h-3" />
                            <span>Administrator</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                            <UserIcon className="w-3 h-3" />
                            <span>Pembaca</span>
                          </span>
                        )}
                      </td>

                      {/* Status Akun */}
                      <td className="py-4 px-6">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Aktif</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200/60 dark:border-red-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span>Nonaktif</span>
                          </span>
                        )}
                      </td>

                      {/* Tanggal Bergabung */}
                      <td className="py-4 px-6 text-zinc-400">
                        {new Date(u.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Aksi */}
                      <td className="py-4 px-6 text-right">
                        {isCurrent ? (
                          <span className="text-[11px] text-zinc-400 italic">Akun Saat Ini</span>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={isBusy}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs transition-colors ${
                              u.isActive
                                ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-900/40'
                                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-900/40'
                            } disabled:opacity-50`}
                          >
                            {isBusy ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : u.isActive ? (
                              <UserX className="w-3.5 h-3.5" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5" />
                            )}
                            <span>{u.isActive ? 'Nonaktifkan' : 'Aktifkan'}</span>
                          </button>
                        )}
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
