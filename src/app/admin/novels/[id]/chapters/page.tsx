'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { novelApi, chapterApi, ApiError } from '@/lib/api-client';
import { NovelResponse, ChapterListResponse } from '@/types';
import {
  ArrowLeft,
  BookOpen,
  Plus,
  Upload,
  FileText,
  Edit2,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  FileCheck,
  CheckCircle2,
} from 'lucide-react';

interface AdminChaptersPageProps {
  params: Promise<{ id: string }>;
}

export default function AdminChaptersPage({ params }: AdminChaptersPageProps) {
  const resolvedParams = use(params);
  const novelId = parseInt(resolvedParams.id, 10);

  const [novel, setNovel] = useState<(NovelResponse & { chapters: ChapterListResponse[] }) | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState<number | null>(null);
  const [chapterNumber, setChapterNumber] = useState<number>(1);
  const [chapterTitle, setChapterTitle] = useState('');
  const [contentType, setContentType] = useState<'upload' | 'manual'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [manualContent, setManualContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (isNaN(novelId)) return;
    setIsLoading(true);
    try {
      const data = await novelApi.get(novelId);
      setNovel(data);
    } catch (err) {
      console.error('Failed to load novel chapters:', err);
    } finally {
      setIsLoading(false);
    }
  }, [novelId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setEditingChapterId(null);
    // Sarankan nomor chapter berikutnya secara otomatis
    const nextNumber = novel && novel.chapters.length > 0
      ? Math.max(...novel.chapters.map((c) => c.chapterNumber)) + 1
      : 1;

    setChapterNumber(nextNumber);
    setChapterTitle(`Bab ${nextNumber}: `);
    setContentType('upload');
    setSelectedFile(null);
    setManualContent('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = async (chapter: ChapterListResponse) => {
    setEditingChapterId(chapter.id);
    setChapterNumber(chapter.chapterNumber);
    setChapterTitle(chapter.title);
    setContentType('manual');
    setSelectedFile(null);
    setFormError(null);

    // Ambil isi teks bab eksisting
    try {
      const detail = await chapterApi.get(chapter.id);
      setManualContent(detail.content);
    } catch {
      setManualContent('');
    }

    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFormError(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Validasi ekstensi
    if (!file.name.endsWith('.txt')) {
      setFormError('Hanya file berformat .txt yang diperbolehkan');
      setSelectedFile(null);
      return;
    }

    // Validasi ukuran (maksimal 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setFormError('Ukuran file maksimal 5MB');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!chapterTitle.trim()) {
      setFormError('Judul chapter wajib diisi');
      return;
    }

    if (chapterNumber < 1) {
      setFormError('Nomor chapter harus angka positif');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingChapterId) {
        // Update Chapter
        if (contentType === 'upload' && selectedFile) {
          const formData = new FormData();
          formData.append('chapterNumber', chapterNumber.toString());
          formData.append('title', chapterTitle.trim());
          formData.append('file', selectedFile);
          await chapterApi.update(editingChapterId, formData);
        } else {
          await chapterApi.update(editingChapterId, {
            chapterNumber,
            title: chapterTitle.trim(),
            content: manualContent.trim() || undefined,
          });
        }
      } else {
        // Create Chapter
        if (contentType === 'upload') {
          if (!selectedFile) {
            setFormError('Silakan pilih file .txt terlebih dahulu');
            setIsSubmitting(false);
            return;
          }

          const formData = new FormData();
          formData.append('chapterNumber', chapterNumber.toString());
          formData.append('title', chapterTitle.trim());
          formData.append('file', selectedFile);
          await chapterApi.create(novelId, formData);
        } else {
          if (!manualContent.trim()) {
            setFormError('Isi teks chapter wajib diisi');
            setIsSubmitting(false);
            return;
          }

          await chapterApi.create(novelId, {
            chapterNumber,
            title: chapterTitle.trim(),
            content: manualContent.trim(),
          });
        }
      }

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Terjadi kesalahan saat menyimpan chapter');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, number: number, title: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus Bab ${number}: "${title}"?`)) {
      return;
    }

    try {
      await chapterApi.delete(id);
      loadData();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Gagal menghapus chapter');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
        <p className="text-xs text-zinc-400">Memuat daftar chapter...</p>
      </div>
    );
  }

  if (!novel) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-zinc-500">Novel tidak ditemukan.</p>
        <Link href="/admin/novels" className="text-indigo-600 text-xs font-semibold hover:underline mt-2 inline-block">
          Kembali ke Daftar Novel
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <Link
        href="/admin/novels"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Kembali ke Kelola Novel</span>
      </Link>

      {/* Header Info Novel */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400">
            Manajemen Bab Cerita
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mt-0.5">
            {novel.title}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Penulis: {novel.author} • Total {novel.chapters.length} Bab dipublikasikan
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Chapter Baru</span>
        </button>
      </div>

      {/* Tabel Chapter */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 font-semibold border-b border-zinc-100 dark:border-zinc-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-6">Bab #</th>
                <th className="py-3 px-6">Judul Bab</th>
                <th className="py-3 px-6 text-center">Jumlah Kata</th>
                <th className="py-3 px-6">Tanggal Rilis</th>
                <th className="py-3 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {novel.chapters.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400 text-xs">
                    Belum ada chapter untuk novel ini. Klik tombol "Tambah Chapter Baru" di atas.
                  </td>
                </tr>
              ) : (
                novel.chapters.map((ch) => (
                  <tr key={ch.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3.5 px-6 font-bold text-zinc-900 dark:text-zinc-100">
                      Bab {ch.chapterNumber}
                    </td>
                    <td className="py-3.5 px-6 font-semibold text-zinc-900 dark:text-zinc-100">
                      <Link
                        href={`/chapters/${ch.id}`}
                        target="_blank"
                        className="hover:text-indigo-600 transition-colors"
                      >
                        {ch.title}
                      </Link>
                    </td>
                    <td className="py-3.5 px-6 text-center font-mono">
                      {ch.wordCount.toLocaleString()} kata
                    </td>
                    <td className="py-3.5 px-6 text-zinc-400">
                      {new Date(ch.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(ch)}
                          className="p-1.5 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                          title="Edit Chapter"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(ch.id, ch.chapterNumber, ch.title)}
                          className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                          title="Hapus Chapter"
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

      {/* MODAL TAMBAH / EDIT CHAPTER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {editingChapterId ? 'Edit Chapter' : 'Tambah Chapter Baru'}
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
              {/* Nomor & Judul Chapter */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Nomor Bab *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={chapterNumber}
                    onChange={(e) => setChapterNumber(parseInt(e.target.value, 10) || 1)}
                    className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Judul Bab *
                  </label>
                  <input
                    type="text"
                    required
                    value={chapterTitle}
                    onChange={(e) => setChapterTitle(e.target.value)}
                    placeholder="Contoh: Bab 1: Awal Mula"
                    className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Tab Pilihan Metode Konten: Upload TXT atau Ketik Manual */}
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Metode Input Konten
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setContentType('upload')}
                    className={`py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      contentType === 'upload'
                        ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-zinc-500'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload File .txt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setContentType('manual')}
                    className={`py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      contentType === 'manual'
                        ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-zinc-500'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Tulis / Paste Manual</span>
                  </button>
                </div>
              </div>

              {/* Pilihan 1: Upload File .txt */}
              {contentType === 'upload' ? (
                <div className="space-y-2">
                  <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center hover:border-indigo-500 transition-colors relative">
                    <input
                      type="file"
                      accept=".txt"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    {selectedFile ? (
                      <div className="flex flex-col items-center">
                        <FileCheck className="w-8 h-8 text-emerald-500 mb-2" />
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">
                          {selectedFile.name}
                        </p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {(selectedFile.size / 1024).toFixed(1)} KB • Klik untuk mengganti file
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="w-8 h-8 text-zinc-400 mb-2" />
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">
                          Pilih atau seret file .txt ke sini
                        </p>
                        <p className="text-[11px] text-zinc-400 mt-1">
                          Hanya format .txt (Maksimal 5MB)
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    File .txt akan otomatis dibaca oleh backend dan jumlah kata akan dikalkulasi secara instan.
                  </p>
                </div>
              ) : (
                /* Pilihan 2: Tulis / Paste Manual */
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Isi Teks Cerita *
                  </label>
                  <textarea
                    rows={8}
                    required={contentType === 'manual'}
                    value={manualContent}
                    onChange={(e) => setManualContent(e.target.value)}
                    placeholder="Ketik atau tempel teks bab novel di sini..."
                    className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-serif leading-relaxed"
                  />
                  <span className="text-[11px] text-zinc-400">
                    Estimasi kata: {manualContent.trim() ? manualContent.trim().split(/\s+/).length : 0} kata
                  </span>
                </div>
              )}

              {/* Submit Buttons */}
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
                  <span>{editingChapterId ? 'Simpan Perubahan' : 'Terbitkan Chapter'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
