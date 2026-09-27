'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { novelApi, genreApi } from '@/lib/api-client';
import { NovelListResponse, GenreResponse, PaginationMeta } from '@/types';
import NovelCard from '@/components/novel-card';
import Pagination from '@/components/pagination';
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  BookOpen,
  Compass,
  Loader2,
  X,
} from 'lucide-react';

function NovelsCatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Ambil initial filter dari URL query parameters
  const currentSearch = searchParams.get('search') || '';
  const currentGenre = searchParams.get('genre') || '';
  const currentStatus = searchParams.get('status') || '';
  const currentSortBy = searchParams.get('sortBy') || 'createdAt';
  const currentSortOrder = searchParams.get('sortOrder') || 'desc';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // States
  const [novels, setNovels] = useState<NovelListResponse[]>([]);
  const [genres, setGenres] = useState<GenreResponse[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 12,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(currentSearch);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Load daftar genre sekali saja
  useEffect(() => {
    async function loadGenres() {
      try {
        const data = await genreApi.list();
        setGenres(data);
      } catch (err) {
        console.error('Failed to load genres:', err);
      }
    }
    loadGenres();
  }, []);

  // Update search input jika URL berubah
  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  // Update query params di URL
  const updateFilters = useCallback(
    (newParams: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(newParams).forEach(([key, value]) => {
        if (value === null || value === '' || value === undefined) {
          params.delete(key);
        } else {
          params.set(key, value.toString());
        }
      });

      // Reset ke page 1 jika filter berubah (kecuali jika parameter yang berubah adalah page)
      if (!('page' in newParams)) {
        params.delete('page');
      }

      router.push(`/novels?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Fetch data novel sesuai filter saat URL query berubah
  useEffect(() => {
    async function fetchNovels() {
      setIsLoading(true);
      try {
        const res = await novelApi.list({
          search: currentSearch || undefined,
          genre: currentGenre || undefined,
          status: currentStatus || undefined,
          sortBy: (currentSortBy as any) || 'createdAt',
          sortOrder: (currentSortOrder as any) || 'desc',
          page: currentPage,
          limit: 12,
        });

        setNovels(res.items);
        setPagination(res.pagination);
      } catch (err) {
        console.error('Failed to fetch novels:', err);
        setNovels([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchNovels();
  }, [currentSearch, currentGenre, currentStatus, currentSortBy, currentSortOrder, currentPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchInput.trim() });
  };

  const handleResetFilters = () => {
    setSearchInput('');
    router.push('/novels');
  };

  const hasActiveFilters =
    Boolean(currentSearch) ||
    Boolean(currentGenre) ||
    Boolean(currentStatus) ||
    currentSortBy !== 'createdAt';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full flex-1">
      {/* Header Halaman */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-sm font-semibold mb-2">
          <Compass className="w-4 h-4" />
          <span>Eksplorasi Novel</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          Katalog & Pencarian Novel
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Temukan novel berdasarkan judul, genre favorit, dan status rilis.
        </p>
      </div>

      {/* FILTER PANEL */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200/80 dark:border-zinc-800 shadow-sm mb-8 space-y-4">
        {/* Baris 1: Search Bar, Tombol Filter Mobile, & Tombol Reset */}
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari berdasarkan judul novel..."
              className="w-full pl-10 pr-20 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-zinc-800"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  updateFilters({ search: '' });
                }}
                className="absolute inset-y-0 right-12 pr-2 flex items-center text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              className="absolute inset-y-1 right-1 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors"
            >
              Cari
            </button>
          </form>

          <div className="flex items-center gap-2">
            {/* Tombol Toggle Filter di Mobile */}
            <button
              type="button"
              onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
              className="sm:hidden flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isMobileFilterOpen ? 'Tutup Filter' : 'Filter & Urutan'}</span>
            </button>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium transition-colors shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Baris 2: Dropdowns (Genre, Status, Sorting) — Selalu tampil di Desktop, toggle di Mobile */}
        <div
          className={`${
            isMobileFilterOpen ? 'grid' : 'hidden sm:grid'
          } grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 animate-in fade-in`}
        >
          {/* Filter Genre */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Genre
            </label>
            <select
              value={currentGenre}
              onChange={(e) => updateFilters({ genre: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Genre</option>
              {genres.map((g) => (
                <option key={g.id} value={g.slug}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Status Rilis
            </label>
            <select
              value={currentStatus}
              onChange={(e) => updateFilters({ status: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Status</option>
              <option value="ONGOING">Berjalan (Ongoing)</option>
              <option value="COMPLETED">Tamat (Completed)</option>
              <option value="HIATUS">Hiatus</option>
            </select>
          </div>

          {/* Pengurutan (Sort By) */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Urutkan Berdasarkan
            </label>
            <select
              value={`${currentSortBy}-${currentSortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                updateFilters({ sortBy, sortOrder });
              }}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="createdAt-desc">Terbaru</option>
              <option value="viewCount-desc">Paling Banyak Dilihat (Populer)</option>
              <option value="averageRating-desc">Rating Tertinggi</option>
              <option value="title-asc">Judul (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* HASIL KATALOG */}
      <div className="space-y-6">
        {/* Info Jumlah Hasil */}
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>
            {isLoading
              ? 'Memuat novel...'
              : `Menampilkan ${novels.length} dari ${pagination.total} novel ditemukan`}
          </span>
          {currentGenre && (
            <span className="font-medium text-indigo-600 dark:text-indigo-400">
              Filter Genre:{' '}
              {genres.find((g) => g.slug === currentGenre)?.name || currentGenre}
            </span>
          )}
        </div>

        {/* Grid Novel / Skeletons / Empty State */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
              >
                <div className="aspect-[3/4] bg-zinc-200 dark:bg-zinc-800" />
                <div className="p-4 space-y-2.5">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
                  <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : novels.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8">
            <BookOpen className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Tidak ada novel yang cocok
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
              Coba sesuaikan kata kunci pencarian atau bersihkan filter yang aktif.
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="mt-5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
              >
                Bersihkan Semua Filter
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {novels.map((novel) => (
              <NovelCard key={novel.id} novel={novel} />
            ))}
          </div>
        )}

        {/* PAGINATION */}
        {!isLoading && pagination.totalPages > 1 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(newPage) => updateFilters({ page: newPage })}
          />
        )}
      </div>
    </div>
  );
}

export default function NovelsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <NovelsCatalogContent />
    </Suspense>
  );
}
