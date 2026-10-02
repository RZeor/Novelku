'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { novelApi, genreApi, ApiError } from '@/lib/api-client';
import { NovelListResponse, GenreResponse, PaginationMeta, NovelStatus } from '@/types';
import Pagination from '@/components/pagination';
import { formatImageUrl } from '@/lib/utils';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Search,
  Layers,
  FileText,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export default function AdminNovelsPage() {
  const [novels, setNovels] = useState<NovelListResponse[]>([]);
  const [genres, setGenres] = useState<GenreResponse[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNovelId, setEditingNovelId] = useState<number | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formAuthor, setFormAuthor] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCoverImage, setFormCoverImage] = useState('');
  const [formStatus, setFormStatus] = useState<NovelStatus>('ONGOING');
  const [formGenreIds, setFormGenreIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = useCallback(async (page: number, query: string = '') => {
    setIsLoading(true);
    try {
      const [novelsRes, genresRes] = await Promise.all([
        novelApi.list({ page, limit: 10, search: query || undefined }),
        genreApi.list(),
      ]);
      setNovels(novelsRes.items);
      setPagination(novelsRes.pagination);
      setGenres(genresRes);
    } catch (err) {
      console.error('Failed to load novels:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(currentPage, search);
  }, [loadData, currentPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadData(1, search);
  };

  const openCreateModal = () => {
    setEditingNovelId(null);
    setFormTitle('');
    setFormAuthor('');
    setFormDescription('');
    setFormCoverImage('');
    setFormStatus('ONGOING');
    setFormGenreIds([]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = async (novel: NovelListResponse) => {
    setEditingNovelId(novel.id);
    setFormTitle(novel.title);
    setFormAuthor(novel.author);
    setFormCoverImage(novel.coverImage || '');
    setFormStatus(novel.status);
    setFormGenreIds(novel.genres.map((g) => g.id));
    setFormError(null);

    // Ambil detail lengkap termasuk description
    try {
      const detail = await novelApi.get(novel.id);
      setFormDescription(detail.description || '');
    } catch {
      setFormDescription('');
    }

    setIsModalOpen(true);
  };

  const handleGenreToggle = (genreId: number) => {
    setFormGenreIds((prev) =>
      prev.includes(genreId) ? prev.filter((id) => id !== genreId) : [...prev, genreId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formTitle.trim() || !formAuthor.trim()) {
      setFormError('Judul dan nama penulis wajib diisi');
      return;
    }

    setIsSubmitting(true);
    const formattedCover = formCoverImage.trim() ? formatImageUrl(formCoverImage.trim()) : undefined;

    try {
      if (editingNovelId) {
        // Update
        await novelApi.update(editingNovelId, {
          title: formTitle.trim(),
          author: formAuthor.trim(),
          description: formDescription.trim(),
          coverImage: formattedCover,
          status: formStatus,
          genreIds: formGenreIds,
        });
      } else {
        // Create
        await novelApi.create({
          title: formTitle.trim(),
          author: formAuthor.trim(),
          description: formDescription.trim(),
          coverImage: formattedCover,
          status: formStatus,
          genreIds: formGenreIds,
        });
      }

      setIsModalOpen(false);
      loadData(currentPage, search);
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Terjadi kesalahan saat menyimpan novel');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus novel "${title}"? Seluruh chapter dan komentarnya juga akan terhapus.`)) {
      return;
    }

    try {
      await novelApi.delete(id);
      loadData(currentPage, search);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Gagal menghapus novel');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Kelola Novel
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Tambah, edit, dan kelola seluruh judul novel pada platform.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Novel Baru</span>
        </button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative max-w-md">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari novel berdasarkan judul..."
          className="w-full pl-10 pr-20 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
        />
        <button
          type="submit"
          className="absolute right-1.5 top-1.5 px-3 py-1 bg-indigo-600 text-white rounded-lg text-[11px] font-medium"
        >
          Cari
        </button>
      </form>

      {/* Tabel Novel */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 font-semibold border-b border-zinc-100 dark:border-zinc-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Novel</th>
                <th className="py-3 px-4">Penulis</th>
                <th className="py-3 px-4">Genre</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Chapter</th>
                <th className="py-3 px-4 text-center">Dilihat</th>
                <th className="py-3 px-4 text-center">Rating</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="py-4 px-4">
                      <div className="h-6 bg-zinc-100 dark:bg-zinc-800 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : novels.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400 text-xs">
                    Belum ada novel yang terdaftar.
                  </td>
                </tr>
              ) : (
                novels.map((novel) => (
                  <tr key={novel.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                    {/* Cover & Judul */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-14 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0">
                          {novel.coverImage ? (
                            <img src={formatImageUrl(novel.coverImage)} alt={novel.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-400">
                              <BookOpen className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 max-w-xs">
                          <Link
                            href={`/novels/${novel.id}`}
                            className="font-bold text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 line-clamp-1"
                          >
                            {novel.title}
                          </Link>
                          <span className="text-[10px] text-zinc-400">ID: {novel.id}</span>
                        </div>
                      </div>
                    </td>

                    {/* Penulis */}
                    <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-200">
                      {novel.author}
                    </td>

                    {/* Genre */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {novel.genres.map((g) => (
                          <span
                            key={g.id}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium"
                          >
                            {g.name}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          novel.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : novel.status === 'HIATUS'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400'
                        }`}
                      >
                        {novel.status}
                      </span>
                    </td>

                    {/* Chapter */}
                    <td className="py-3 px-4 text-center font-bold text-zinc-900 dark:text-zinc-100">
                      {novel.totalChapters}
                    </td>

                    {/* Views */}
                    <td className="py-3 px-4 text-center font-medium">
                      {novel.viewCount.toLocaleString()}
                    </td>

                    {/* Rating */}
                    <td className="py-3 px-4 text-center font-bold text-amber-500">
                      ★ {Number(novel.averageRating).toFixed(1)}
                    </td>

                    {/* Aksi */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Tombol Kelola Chapter */}
                        <Link
                          href={`/admin/novels/${novel.id}/chapters`}
                          className="p-1.5 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
                          title="Kelola Chapter & Upload TXT"
                        >
                          <FileText className="w-4 h-4" />
                        </Link>

                        {/* Tombol Edit */}
                        <button
                          onClick={() => openEditModal(novel)}
                          className="p-1.5 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                          title="Edit Novel"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Tombol Hapus */}
                        <button
                          onClick={() => handleDelete(novel.id, novel.title)}
                          className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                          title="Hapus Novel"
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

        {/* Pagination */}
        {!isLoading && pagination.totalPages > 1 && (
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-center">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(p) => setCurrentPage(p)}
            />
          </div>
        )}
      </div>

      {/* MODAL TAMBAH / EDIT NOVEL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {editingNovelId ? 'Edit Data Novel' : 'Tambah Novel Baru'}
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
              {/* Judul Novel */}
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Judul Novel *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Contoh: Petualangan di Dunia Sihir"
                  className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Penulis & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Nama Penulis *
                  </label>
                  <input
                    type="text"
                    required
                    value={formAuthor}
                    onChange={(e) => setFormAuthor(e.target.value)}
                    placeholder="Nama penulis novel"
                    className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Status Rilis
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as NovelStatus)}
                    className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ONGOING">Berjalan (Ongoing)</option>
                    <option value="COMPLETED">Tamat (Completed)</option>
                    <option value="HIATUS">Hiatus</option>
                  </select>
                </div>
              </div>

              {/* Cover Image URL & Preview */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300">
                    URL Gambar Cover (Opsional)
                  </label>
                  {formCoverImage && formCoverImage.includes('drive.google.com') && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Link Google Drive Terdeteksi
                    </span>
                  )}
                </div>
                <div className="flex gap-3 items-start">
                  <input
                    type="url"
                    value={formCoverImage}
                    onChange={(e) => setFormCoverImage(e.target.value)}
                    placeholder="https://drive.google.com/... atau URL gambar lainnya"
                    className="flex-1 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {formCoverImage && (
                    <div className="w-14 h-18 rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700 shadow-sm relative">
                      <img
                        src={formatImageUrl(formCoverImage)}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                        onLoad={(e) => (e.currentTarget.style.display = 'block')}
                      />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Mendukung link share Google Drive (pastikan akses publik), Unsplash, Imgur, atau link gambar lainnya.
                </p>
              </div>

              {/* Pilihan Genre */}
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Genre (Pilih satu atau lebih)
                </label>
                <div className="flex flex-wrap gap-2">
                  {genres.map((g) => {
                    const isSelected = formGenreIds.includes(g.id);
                    return (
                      <button
                        type="button"
                        key={g.id}
                        onClick={() => handleGenreToggle(g.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {g.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sinopsis */}
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Sinopsis / Deskripsi
                </label>
                <textarea
                  rows={4}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Tuliskan sinopsis atau ringkasan cerita..."
                  className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
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
                  <span>{editingNovelId ? 'Simpan Perubahan' : 'Terbitkan Novel'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
