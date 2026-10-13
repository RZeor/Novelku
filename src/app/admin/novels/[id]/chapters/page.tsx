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
  UploadCloud,
  Files,
  Sparkles,
} from 'lucide-react';
import { countWords } from '@/lib/utils';

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

  // Batch Modal states
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchItems, setBatchItems] = useState<
    Array<{
      id: string;
      fileName: string;
      chapterNumber: number;
      title: string;
      content: string;
      wordCount: number;
    }>
  >([]);
  const [isParsingFiles, setIsParsingFiles] = useState(false);
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

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
    setChapterTitle(`Chapter ${nextNumber}: `);
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

    // Ambil isi teks chapter eksisting
    try {
      const detail = await chapterApi.get(chapter.id);
      setManualContent(detail.content);
    } catch {
      setManualContent('');
    }

    setIsModalOpen(true);
  };

  // Helper parse nama file untuk batch upload
  const parseChapterFileName = (fileName: string, suggestedNumber: number) => {
    const baseName = fileName.replace(/\.txt$/i, '').trim();

    // Pola 1: "Chapter 1 - Judul" atau "Bab 1: Judul"
    const matchChapter = baseName.match(/^(?:chapter|bab)\s*(\d+)[\s:\-_]*(.*)$/i);
    if (matchChapter) {
      const num = parseInt(matchChapter[1], 10);
      const subTitle = matchChapter[2]?.trim();
      return {
        chapterNumber: num,
        title: subTitle ? `Chapter ${num}: ${subTitle}` : `Chapter ${num}`,
      };
    }

    // Pola 2: "01 - Judul" atau "1. Judul"
    const matchPrefix = baseName.match(/^(\d+)[\s.:\-_]+(.*)$/);
    if (matchPrefix) {
      const num = parseInt(matchPrefix[1], 10);
      const subTitle = matchPrefix[2]?.trim();
      return {
        chapterNumber: num,
        title: subTitle ? `Chapter ${num}: ${subTitle}` : `Chapter ${num}`,
      };
    }

    // Pola 3: Angka saja "01" / "12"
    const matchOnlyNumber = baseName.match(/^(\d+)$/);
    if (matchOnlyNumber) {
      const num = parseInt(matchOnlyNumber[1], 10);
      return {
        chapterNumber: num,
        title: `Chapter ${num}`,
      };
    }

    // Fallback
    return {
      chapterNumber: suggestedNumber,
      title: baseName.toLowerCase().startsWith('chapter')
        ? baseName
        : `Chapter ${suggestedNumber}: ${baseName}`,
    };
  };

  const openBatchModal = () => {
    setBatchItems([]);
    setBatchError(null);
    setIsBatchSubmitting(false);
    setIsBatchModalOpen(true);
  };

  const handleBatchFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    setIsParsingFiles(true);
    setBatchError(null);

    try {
      const validFiles = files.filter(
        (f) => f.name.toLowerCase().endsWith('.txt') && f.size <= 5 * 1024 * 1024
      );

      if (validFiles.length === 0) {
        setBatchError('Tidak ada file .txt valid yang dipilih (maksimal 5MB per file)');
        setIsParsingFiles(false);
        return;
      }

      // Natural sort agar "Chapter 2" sebelum "Chapter 10"
      validFiles.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      );

      const nextNumber =
        novel && novel.chapters.length > 0
          ? Math.max(...novel.chapters.map((c) => c.chapterNumber)) + 1
          : 1;

      const items: typeof batchItems = [];

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const content = await file.text();
        const parsed = parseChapterFileName(file.name, nextNumber + i);

        items.push({
          id: `${file.name}-${Date.now()}-${i}`,
          fileName: file.name,
          chapterNumber: parsed.chapterNumber,
          title: parsed.title,
          content,
          wordCount: countWords(content),
        });
      }

      setBatchItems(items);
    } catch {
      setBatchError('Gagal membaca beberapa file .txt');
    } finally {
      setIsParsingFiles(false);
    }
  };

  const autoRenumberBatch = () => {
    const startNum =
      novel && novel.chapters.length > 0
        ? Math.max(...novel.chapters.map((c) => c.chapterNumber)) + 1
        : 1;

    setBatchItems((prev) =>
      prev.map((item, idx) => ({
        ...item,
        chapterNumber: startNum + idx,
      }))
    );
  };

  const updateBatchItem = (id: string, field: 'chapterNumber' | 'title', value: string | number) => {
    setBatchItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const removeBatchItem = (id: string) => {
    setBatchItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleBatchSubmit = async () => {
    if (batchItems.length === 0) {
      setBatchError('Belum ada chapter yang dipilih');
      return;
    }

    // Cek duplikasi nomor di daftar
    const numbers = batchItems.map((b) => b.chapterNumber);
    const unique = new Set(numbers);
    if (unique.size !== numbers.length) {
      setBatchError('Terdapat nomor chapter yang duplikat di dalam daftar');
      return;
    }

    // Cek duplikasi terhadap DB
    const existingNumbers = new Set(novel?.chapters.map((c) => c.chapterNumber) || []);
    const duplicatesWithDb = numbers.filter((n) => existingNumbers.has(n));
    if (duplicatesWithDb.length > 0) {
      setBatchError(
        `Nomor chapter ${duplicatesWithDb.join(', ')} sudah ada pada novel ini. Ubah nomor atau gunakan tombol "Urutkan Otomatis".`
      );
      return;
    }

    setIsBatchSubmitting(true);
    setBatchError(null);

    try {
      await chapterApi.createBatch(
        novelId,
        batchItems.map((b) => ({
          chapterNumber: b.chapterNumber,
          title: b.title.trim() || `Chapter ${b.chapterNumber}`,
          content: b.content,
        }))
      );

      setIsBatchModalOpen(false);
      setBatchItems([]);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Gagal menyimpan batch chapter';
      setBatchError(msg);
    } finally {
      setIsBatchSubmitting(false);
    }
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
    if (!confirm(`Apakah Anda yakin ingin menghapus Chapter ${number}: "${title}"?`)) {
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
            Manajemen Chapter Cerita
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mt-0.5">
            {novel.title}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Penulis: {novel.author} • Total {novel.chapters.length} Chapter dipublikasikan
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={openBatchModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Tambah Banyak Chapter (.txt)</span>
          </button>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Satu Chapter</span>
          </button>
        </div>
      </div>

      {/* Tabel Chapter */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 font-semibold border-b border-zinc-100 dark:border-zinc-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-6">Chapter #</th>
                <th className="py-3 px-6">Judul Chapter</th>
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
                      Chapter {ch.chapterNumber}
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
                    Nomor Chapter *
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
                    Judul Chapter *
                  </label>
                  <input
                    type="text"
                    required
                    value={chapterTitle}
                    onChange={(e) => setChapterTitle(e.target.value)}
                    placeholder="Contoh: Chapter 1: Awal Mula"
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
                    placeholder="Ketik atau tempel teks chapter novel di sini..."
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

      {/* MODAL TAMBAH BANYAK CHAPTER (BATCH UPLOAD) */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-4xl w-full p-6 sm:p-8 border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-6 max-h-[90vh] flex flex-col">
            {/* Header Modal */}
            <div className="flex items-start justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
                    Tambah Banyak Chapter Sekaligus
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Pilih beberapa file .txt sekaligus untuk novel &ldquo;{novel.title}&rdquo;
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="p-1 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            {batchError && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400 text-xs flex items-center gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{batchError}</span>
              </div>
            )}

            {/* Body: Area Upload / Pratinjau */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-1">
              {/* Dropzone multi-file */}
              <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center hover:border-emerald-500 transition-colors relative bg-zinc-50/50 dark:bg-zinc-800/30">
                <input
                  type="file"
                  multiple
                  accept=".txt"
                  onChange={handleBatchFilesChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  disabled={isParsingFiles || isBatchSubmitting}
                />
                <div className="flex flex-col items-center">
                  <Files className="w-9 h-9 text-emerald-500 mb-2 opacity-80" />
                  <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    Pilih atau seret beberapa file .txt ke sini
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Mendukung banyak file sekaligus (Maksimal 100 file .txt per proses, maks 5MB per file)
                  </p>
                </div>
              </div>

              {isParsingFiles && (
                <div className="flex items-center justify-center gap-2 py-4 text-xs text-zinc-500">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Membaca dan memproses file teks...</span>
                </div>
              )}

              {/* Tabel Pratinjau Chapter yang Terdeteksi */}
              {batchItems.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">
                      Terdeteksi <strong className="text-zinc-900 dark:text-zinc-100">{batchItems.length} chapter</strong> siap diunggah.
                    </div>
                    <button
                      type="button"
                      onClick={autoRenumberBatch}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      title="Urutkan nomor chapter secara berurutan melanjutkan bab terakhir di novel"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Urutkan Nomor Otomatis</span>
                    </button>
                  </div>

                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
                      <thead className="bg-zinc-50 dark:bg-zinc-800/80 sticky top-0 text-zinc-500 dark:text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800 text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3 w-20"># Bab</th>
                          <th className="py-2.5 px-3">Judul Chapter</th>
                          <th className="py-2.5 px-3 w-32">Nama File</th>
                          <th className="py-2.5 px-3 w-24 text-right">Kata</th>
                          <th className="py-2.5 px-2 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {batchItems.map((item) => {
                          const existingNumbers = new Set(novel?.chapters.map((c) => c.chapterNumber) || []);
                          const isDuplicateWithDb = existingNumbers.has(item.chapterNumber);

                          return (
                            <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  min={1}
                                  value={item.chapterNumber}
                                  onChange={(e) =>
                                    updateBatchItem(item.id, 'chapterNumber', parseInt(e.target.value, 10) || 1)
                                  }
                                  className={`w-16 px-2 py-1 rounded-lg border text-center font-bold text-xs ${
                                    isDuplicateWithDb
                                      ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                                      : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800'
                                  }`}
                                  title={isDuplicateWithDb ? 'Nomor bab ini sudah ada di database' : ''}
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={item.title}
                                  onChange={(e) => updateBatchItem(item.id, 'title', e.target.value)}
                                  className="w-full px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100"
                                />
                              </td>
                              <td className="py-2 px-3 text-zinc-400 text-[11px] truncate max-w-[120px]" title={item.fileName}>
                                {item.fileName}
                              </td>
                              <td className="py-2 px-3 text-right text-zinc-500 font-mono text-[11px]">
                                {item.wordCount.toLocaleString('id-ID')}
                              </td>
                              <td className="py-2 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeBatchItem(item.id)}
                                  className="p-1 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                  title="Hapus dari daftar batch"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800 shrink-0">
              <span className="text-xs text-zinc-400">
                {batchItems.length > 0
                  ? `Total: ${batchItems.reduce((acc, c) => acc + c.wordCount, 0).toLocaleString('id-ID')} kata`
                  : 'Belum ada file dipilih'}
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  disabled={isBatchSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleBatchSubmit}
                  disabled={isBatchSubmitting || batchItems.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs flex items-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {isBatchSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Semua ({batchItems.length} Chapter)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
