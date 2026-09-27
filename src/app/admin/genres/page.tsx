'use client';

import React, { useEffect, useState } from 'react';
import { genreApi, ApiError } from '@/lib/api-client';
import { GenreResponse } from '@/types';
import { Layers, Plus, Edit2, Trash2, X, Loader2, AlertCircle } from 'lucide-react';

export default function AdminGenresPage() {
  const [genres, setGenres] = useState<GenreResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal / Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGenre, setEditingGenre] = useState<GenreResponse | null>(null);
  const [genreName, setGenreName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadGenres = async () => {
    setIsLoading(true);
    try {
      const data = await genreApi.list();
      setGenres(data);
    } catch (err) {
      console.error('Failed to load genres:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGenres();
  }, []);

  const openCreateModal = () => {
    setEditingGenre(null);
    setGenreName('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (genre: GenreResponse) => {
    setEditingGenre(genre);
    setGenreName(genre.name);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!genreName.trim()) {
      setFormError('Nama genre wajib diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingGenre) {
        await genreApi.update(editingGenre.id, { name: genreName.trim() });
      } else {
        await genreApi.create({ name: genreName.trim() });
      }
      setIsModalOpen(false);
      loadGenres();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Terjadi kesalahan saat menyimpan genre');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus genre "${name}"?`)) return;

    try {
      await genreApi.delete(id);
      loadGenres();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Gagal menghapus genre');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Kelola Genre
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Daftar kategori cerita yang digunakan untuk mengelompokkan novel.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Genre Baru</span>
        </button>
      </div>

      {/* Tabel Genre */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 font-semibold border-b border-zinc-100 dark:border-zinc-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-6">ID</th>
                <th className="py-3 px-6">Nama Genre</th>
                <th className="py-3 px-6">Slug (URL)</th>
                <th className="py-3 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={4} className="py-4 px-6">
                      <div className="h-5 bg-zinc-100 dark:bg-zinc-800 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : genres.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-zinc-400 text-xs">
                    Belum ada genre yang terdaftar.
                  </td>
                </tr>
              ) : (
                genres.map((genre) => (
                  <tr key={genre.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3.5 px-6 font-mono text-zinc-400">#{genre.id}</td>
                    <td className="py-3.5 px-6 font-bold text-zinc-900 dark:text-zinc-100">
                      {genre.name}
                    </td>
                    <td className="py-3.5 px-6 font-mono text-zinc-500 text-[11px]">
                      {genre.slug}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(genre)}
                          className="p-1.5 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                          title="Edit Genre"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(genre.id, genre.name)}
                          className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                          title="Hapus Genre"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TAMBAH / EDIT GENRE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {editingGenre ? 'Edit Genre' : 'Tambah Genre Baru'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nama Genre *
                </label>
                <input
                  type="text"
                  required
                  value={genreName}
                  onChange={(e) => setGenreName(e.target.value)}
                  placeholder="Contoh: Mystery, Isekai, Thriller"
                  className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingGenre ? 'Simpan Perubahan' : 'Tambah Genre'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
