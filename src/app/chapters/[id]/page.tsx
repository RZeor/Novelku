'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { chapterApi, historyApi, ApiError } from '@/lib/api-client';
import { ChapterResponse, ChapterListResponse } from '@/types';
import { formatImageUrl } from '@/lib/utils';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Settings,
  List,
  BookOpen,
  Sun,
  Moon,
  Coffee,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface ReaderPageProps {
  params: Promise<{ id: string }>;
}

type ReaderTheme = 'light' | 'dark' | 'sepia';
type FontSize = 'base' | 'lg' | 'xl' | '2xl';
type LineHeight = 'normal' | 'relaxed' | 'loose';
type ReaderWidth = 'max-w-2xl' | 'max-w-3xl' | 'max-w-4xl';

export default function ReaderPage({ params }: ReaderPageProps) {
  const resolvedParams = use(params);
  const chapterId = parseInt(resolvedParams.id, 10);
  const router = useRouter();
  const { user } = useAuth();

  const [chapter, setChapter] = useState<
    (ChapterResponse & { novel: { id: number; title: string; slug: string } }) | null
  >(null);
  const [allChapters, setAllChapters] = useState<ChapterListResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settings states (disimpan di localStorage)
  const [theme, setTheme] = useState<ReaderTheme>('light');
  const [fontSize, setFontSize] = useState<FontSize>('lg');
  const [lineHeight, setLineHeight] = useState<LineHeight>('relaxed');
  const [readerWidth, setReaderWidth] = useState<ReaderWidth>('max-w-3xl');

  // UI state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChapterDrawerOpen, setIsChapterDrawerOpen] = useState(false);

  // 1. Muat preferensi tampilan dari localStorage
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('novelku_reader_theme') as ReaderTheme;
      const savedFontSize = localStorage.getItem('novelku_reader_font_size') as FontSize;
      const savedLineHeight = localStorage.getItem('novelku_reader_line_height') as LineHeight;
      const savedWidth = localStorage.getItem('novelku_reader_width') as ReaderWidth;

      if (savedTheme) setTheme(savedTheme);
      if (savedFontSize) setFontSize(savedFontSize);
      if (savedLineHeight) setLineHeight(savedLineHeight);
      if (savedWidth) setReaderWidth(savedWidth);
    } catch {
      // Abaikan jika localStorage tidak tersedia
    }
  }, []);

  // Simpan preferensi ke localStorage
  const updateTheme = (newTheme: ReaderTheme) => {
    setTheme(newTheme);
    localStorage.setItem('novelku_reader_theme', newTheme);
  };

  const updateFontSize = (newSize: FontSize) => {
    setFontSize(newSize);
    localStorage.setItem('novelku_reader_font_size', newSize);
  };

  const updateLineHeight = (newLineHeight: LineHeight) => {
    setLineHeight(newLineHeight);
    localStorage.setItem('novelku_reader_line_height', newLineHeight);
  };

  const updateWidth = (newWidth: ReaderWidth) => {
    setReaderWidth(newWidth);
    localStorage.setItem('novelku_reader_width', newWidth);
  };

  // 2. Muat data chapter dan daftar chapter
  useEffect(() => {
    async function loadChapterData() {
      if (isNaN(chapterId)) {
        setError('ID chapter tidak valid');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const chapterData = await chapterApi.get(chapterId);
        setChapter(chapterData);
        if (typeof document !== 'undefined') {
          document.title = `Chapter ${chapterData.chapterNumber}: ${chapterData.title} — ${chapterData.novel.title} | Novelku`;
        }

        // Ambil seluruh daftar chapter dari novel ini untuk navigasi
        const chaptersList = await chapterApi.listByNovel(chapterData.novelId);
        setAllChapters(chaptersList);

        // Catat riwayat baca ke backend jika user sedang login
        if (user) {
          historyApi.record(chapterId).catch(() => {
            // Silently fail jika pencatatan riwayat gagal, jangan ganggu kenyamanan baca
          });
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setError('Chapter tidak ditemukan');
        } else {
          setError('Gagal memuat chapter novel');
        }
      } finally {
        setIsLoading(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }

    loadChapterData();
  }, [chapterId, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm text-zinc-500 font-medium">Menyiapkan chapter bacaan...</p>
      </div>
    );
  }

  if (error || !chapter) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 bg-zinc-50 dark:bg-zinc-950 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          {error || 'Chapter tidak ditemukan'}
        </h1>
        <p className="text-sm text-zinc-500 mt-2 mb-6">
          Chapter yang Anda cari mungkin telah dihapus.
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

  // Navigasi Chapter Sebelumnya dan Selanjutnya
  const currentIndex = allChapters.findIndex((c) => c.id === chapter.id);
  const prevChapter = currentIndex > 0 ? allChapters[currentIndex - 1] : null;
  const nextChapter =
    currentIndex !== -1 && currentIndex < allChapters.length - 1
      ? allChapters[currentIndex + 1]
      : null;

  // Konfigurasi Tema Warna
  const themeStyles = {
    light: 'bg-[#fafafa] text-zinc-800 border-zinc-200',
    dark: 'bg-[#0d1117] text-zinc-200 border-zinc-800',
    sepia: 'bg-[#fbf0d9] text-[#5f4b32] border-[#ebd9b6]',
  };

  const themeHeaderStyles = {
    light: 'bg-white/95 text-zinc-800 border-zinc-200/80',
    dark: 'bg-[#161b22]/95 text-zinc-200 border-zinc-800',
    sepia: 'bg-[#f4e4c1]/95 text-[#5f4b32] border-[#e2cca4]',
  };

  // Konfigurasi Ukuran Font
  const fontSizeClasses = {
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
  };

  // Konfigurasi Spasi Baris
  const lineHeightClasses = {
    normal: 'leading-normal',
    relaxed: 'leading-relaxed',
    loose: 'leading-loose',
  };

  // Format teks chapter menjadi paragraf-paragraf yang rapi
  const paragraphs = chapter.content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${themeStyles[theme]}`}>
      {/* 1. STICKY READER HEADER */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-md border-b px-4 sm:px-6 h-14 flex items-center justify-between transition-colors ${themeHeaderStyles[theme]}`}
      >
        {/* Kiri: Tombol Kembali ke Detail Novel */}
        <Link
          href={`/novels/${chapter.novelId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold hover:opacity-75 transition-opacity"
          title="Kembali ke Info Novel"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline truncate max-w-xs">{chapter.novel.title}</span>
          <span className="sm:hidden">Info Novel</span>
        </Link>

        {/* Tengah: Nomor & Judul Chapter */}
        <div className="text-center px-2 min-w-0">
          <p className="text-xs font-bold truncate max-w-[200px] sm:max-w-md">
            Chapter {chapter.chapterNumber}: {chapter.title}
          </p>
        </div>

        {/* Kanan: Tombol Pengaturan & Daftar Chapter */}
        <div className="flex items-center gap-1">
          {/* Tombol Daftar Chapter */}
          <button
            onClick={() => setIsChapterDrawerOpen(true)}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            title="Daftar Chapter"
            aria-label="Buka daftar chapter"
          >
            <List className="w-4 h-4" />
          </button>

          {/* Tombol Pengaturan Membaca */}
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            title="Pengaturan Membaca"
            aria-label="Buka pengaturan membaca"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MODAL / POPOVER PENGATURAN MEMBACA */}
      {isSettingsOpen && (
        <div className="fixed inset-0 sm:inset-auto z-50 flex items-end sm:block">
          <div
            className="fixed inset-0 bg-black/40 sm:hidden"
            onClick={() => setIsSettingsOpen(false)}
          />
          <div className="relative w-full sm:w-80 sm:fixed sm:right-6 sm:top-16 p-5 rounded-t-3xl sm:rounded-2xl shadow-2xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 animate-in fade-in slide-in-from-bottom sm:slide-in-from-top-2 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-indigo-500" />
                <span>Pengaturan Tampilan</span>
              </h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

          {/* 1. Pilihan Tema Warna */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
              Tema Warna
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => updateTheme('light')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  theme === 'light'
                    ? 'border-indigo-600 bg-white text-zinc-900 shadow-sm'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-600'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Terang</span>
              </button>

              <button
                onClick={() => updateTheme('sepia')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  theme === 'sepia'
                    ? 'border-amber-600 bg-[#fbf0d9] text-[#5f4b32] shadow-sm'
                    : 'border-amber-200 bg-[#f5e6c8] text-[#5f4b32]'
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>Sepia</span>
              </button>

              <button
                onClick={() => updateTheme('dark')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  theme === 'dark'
                    ? 'border-indigo-500 bg-zinc-950 text-white shadow-sm'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Gelap</span>
              </button>
            </div>
          </div>

          {/* 2. Ukuran Font */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
              Ukuran Font
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['base', 'lg', 'xl', '2xl'] as FontSize[]).map((size, idx) => (
                <button
                  key={size}
                  onClick={() => updateFontSize(size)}
                  className={`py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                    fontSize === size
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {idx === 0 ? 'Kecil' : idx === 1 ? 'Normal' : idx === 2 ? 'Besar' : 'Ekstra'}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Spasi Baris */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
              Spasi Baris (Line Height)
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['normal', 'relaxed', 'loose'] as LineHeight[]).map((lh, idx) => (
                <button
                  key={lh}
                  onClick={() => updateLineHeight(lh)}
                  className={`py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                    lineHeight === lh
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {idx === 0 ? 'Rapat' : idx === 1 ? 'Sedang' : 'Renggang'}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Lebar Halaman */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
              Lebar Area Baca
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['max-w-2xl', 'max-w-3xl', 'max-w-4xl'] as ReaderWidth[]).map((w, idx) => (
                <button
                  key={w}
                  onClick={() => updateWidth(w)}
                  className={`py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                    readerWidth === w
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {idx === 0 ? 'Sempit' : idx === 1 ? 'Sedang' : 'Lebar'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )}

      {/* DRAWER DAFTAR BAB */}
      {isChapterDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 p-6 flex flex-col shadow-2xl animate-in slide-in-from-right">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Daftar Chapter</span>
              </h3>
              <button
                onClick={() => setIsChapterDrawerOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-1.5">
              {allChapters.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => {
                    setIsChapterDrawerOpen(false);
                    router.push(`/chapters/${ch.id}`);
                  }}
                  className={`w-full p-3 rounded-xl text-left text-xs font-semibold transition-all flex items-center justify-between ${
                    ch.id === chapter.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <span className="truncate pr-2">
                    Chapter {ch.chapterNumber}: {ch.title}
                  </span>
                  <span className="text-[10px] opacity-75 shrink-0">
                    {ch.wordCount.toLocaleString()} kata
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. KONTEN MEMBACA UTAMA */}
      <main className={`flex-1 mx-auto px-4 sm:px-8 py-10 sm:py-16 pb-28 sm:pb-16 w-full ${readerWidth}`}>
        {/* Header Chapter */}
        <div className="text-center mb-10 pb-6 border-b border-current/10">
          <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2">
            Chapter {chapter.chapterNumber}
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3">
            {chapter.title}
          </h1>
          <p className="text-xs opacity-60">
            {chapter.wordCount.toLocaleString()} kata • Ditulis oleh {chapter.novel.title}
          </p>
        </div>

        {/* Teks Isi Chapter & Ilustrasi */}
        <article
          className={`space-y-6 ${fontSizeClasses[fontSize]} ${lineHeightClasses[lineHeight]} font-serif tracking-normal`}
        >
          {paragraphs.map((p, idx) => {
            const trimmed = p.trim();

            // 1. Cek format Markdown Image: ![alt](url)
            const mdMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
            if (mdMatch) {
              const altText = mdMatch[1]?.trim() || 'Ilustrasi Cerita';
              const imgUrl = mdMatch[2]?.trim();
              return (
                <figure key={idx} className="my-8 sm:my-12 text-center not-italic font-sans">
                  <div className="relative inline-block max-w-full overflow-hidden rounded-2xl shadow-xl border border-current/15 bg-black/5 dark:bg-white/5 transition-all">
                    <img
                      src={formatImageUrl(imgUrl)}
                      alt={altText}
                      className="max-h-[550px] w-auto max-w-full mx-auto object-contain rounded-2xl"
                      loading="lazy"
                    />
                  </div>
                  {altText && altText !== 'Ilustrasi Cerita' && (
                    <figcaption className="mt-2.5 text-xs opacity-70 italic font-sans tracking-wide">
                      {altText}
                    </figcaption>
                  )}
                </figure>
              );
            }

            // 2. Cek baris mandiri link Google Drive atau URL gambar langsung (.jpg, .png, .webp)
            const isDirectImage =
              /^https?:\/\/[^\s]+(?:\.jpg|\.jpeg|\.png|\.webp|\.gif)(?:\?[^\s]*)?$/i.test(trimmed) ||
              /^(https?:\/\/drive\.google\.com\/[^\s]+)$/i.test(trimmed);

            if (isDirectImage) {
              return (
                <figure key={idx} className="my-8 sm:my-12 text-center not-italic font-sans">
                  <div className="relative inline-block max-w-full overflow-hidden rounded-2xl shadow-xl border border-current/15 bg-black/5 dark:bg-white/5 transition-all">
                    <img
                      src={formatImageUrl(trimmed)}
                      alt="Ilustrasi Cerita"
                      className="max-h-[550px] w-auto max-w-full mx-auto object-contain rounded-2xl"
                      loading="lazy"
                    />
                  </div>
                </figure>
              );
            }

            // 3. Paragraf Teks Biasa
            return (
              <p key={idx} className="indent-6 sm:indent-8 leading-relaxed text-left sm:text-justify hyphens-auto">
                {p}
              </p>
            );
          })}
        </article>

        {/* 3. NAVIGASI CHAPTER DI BAWAH TEKS */}
        <div className="mt-16 pt-8 border-t border-current/10 flex items-center justify-between gap-4">
          {prevChapter ? (
            <Link
              href={`/chapters/${prevChapter.id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-current/20 hover:bg-current/5 text-xs font-bold transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Chapter Sebelumnya</span>
            </Link>
          ) : (
            <button
              disabled
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-current/10 opacity-30 text-xs font-bold cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Chapter Sebelumnya</span>
            </button>
          )}

          <button
            onClick={() => setIsChapterDrawerOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold opacity-70 hover:opacity-100 transition-opacity"
          >
            <List className="w-4 h-4" />
            <span>Pilih Chapter</span>
          </button>

          {nextChapter ? (
            <Link
              href={`/chapters/${nextChapter.id}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all"
            >
              <span>Chapter Selanjutnya</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <button
              disabled
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-current/10 opacity-30 text-xs font-bold cursor-not-allowed"
            >
              <span>Chapter Terakhir</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </main>

      {/* 4. MOBILE FLOATING BOTTOM TOOLBAR */}
      <nav
        aria-label="Navigasi membaca mobile"
        className={`sm:hidden fixed bottom-0 inset-x-0 z-40 border-t px-3 py-2 flex items-center justify-between backdrop-blur-md transition-colors shadow-lg ${themeHeaderStyles[theme]}`}
      >
        {prevChapter ? (
          <Link
            href={`/chapters/${prevChapter.id}`}
            className="p-2 rounded-xl hover:bg-current/10 transition-colors flex flex-col items-center gap-0.5 text-[10px] font-semibold"
            aria-label="Chapter Sebelumnya"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Sebelumnya</span>
          </Link>
        ) : (
          <button
            disabled
            className="p-2 rounded-xl opacity-30 cursor-not-allowed flex flex-col items-center gap-0.5 text-[10px] font-semibold"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Sebelumnya</span>
          </button>
        )}

        <button
          onClick={() => setIsChapterDrawerOpen(true)}
          className="p-2 rounded-xl hover:bg-current/10 transition-colors flex flex-col items-center gap-0.5 text-[10px] font-semibold"
          aria-label="Buka daftar chapter"
        >
          <List className="w-5 h-5" />
          <span>Daftar Chapter</span>
        </button>

        <button
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className="p-2 rounded-xl hover:bg-current/10 transition-colors flex flex-col items-center gap-0.5 text-[10px] font-semibold"
          aria-label="Pengaturan tampilan"
        >
          <Settings className="w-5 h-5" />
          <span>Tampilan</span>
        </button>

        {nextChapter ? (
          <Link
            href={`/chapters/${nextChapter.id}`}
            className="p-2 rounded-xl hover:bg-current/10 transition-colors flex flex-col items-center gap-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400"
            aria-label="Chapter Selanjutnya"
          >
            <ChevronRight className="w-5 h-5" />
            <span>Selanjutnya</span>
          </Link>
        ) : (
          <button
            disabled
            className="p-2 rounded-xl opacity-30 cursor-not-allowed flex flex-col items-center gap-0.5 text-[10px] font-semibold"
          >
            <ChevronRight className="w-5 h-5" />
            <span>Terakhir</span>
          </button>
        )}
      </nav>
    </div>
  );
}
