'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { adminApi, novelApi } from '@/lib/api-client';
import { AnalyticsResponse, NovelListResponse } from '@/types';
import {
  TrendingUp,
  Calendar,
  Filter,
  RotateCw,
  Loader2,
  AlertCircle,
  BookOpen,
} from 'lucide-react';
import {
  AnalyticsKpiCards,
  AnalyticsDailyTrendsChart,
  AnalyticsPopularNovelsTable,
} from '@/components/admin/analytics-charts';

type PeriodType = '7d' | '30d' | 'custom';

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [novels, setNovels] = useState<NovelListResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [period, setPeriod] = useState<PeriodType>('7d');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [novelId, setNovelId] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<'activities' | 'uniqueReaders'>('activities');

  // Load daftar novel untuk dropdown filter
  useEffect(() => {
    async function loadNovels() {
      try {
        const res = await novelApi.list({ limit: 100, sortBy: 'title', sortOrder: 'asc' });
        setNovels(res.items);
      } catch (err) {
        console.error('Failed to load novels list for filter:', err);
      }
    }
    loadNovels();
  }, []);

  // Fetch data analytics
  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Validasi periode kustom
      if (period === 'custom') {
        if (!startDate || !endDate) {
          setError('Silakan pilih tanggal mulai dan tanggal selesai');
          setIsLoading(false);
          return;
        }
        if (startDate > endDate) {
          setError('Tanggal mulai tidak boleh melampaui tanggal selesai');
          setIsLoading(false);
          return;
        }
      }

      const res = await adminApi.analytics({
        period,
        startDate: period === 'custom' ? startDate : undefined,
        endDate: period === 'custom' ? endDate : undefined,
        novelId,
        sortBy,
      });

      setData(res);
    } catch (err: unknown) {
      console.error('Failed to fetch analytics:', err);
      const msg = err instanceof Error ? err.message : 'Gagal memuat data statistik';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [period, startDate, endDate, novelId, sortBy]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="space-y-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Analitik Platform</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Statistik Pembaca
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Pantau aktivitas membaca, pembaca terdaftar unik, dan durasi aktif membaca novel.
          </p>
        </div>

        {/* Refresh Button */}
        <div>
          <button
            onClick={() => fetchAnalytics()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-wrap items-center gap-4">
        {/* Period Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 text-xs">
          <button
            onClick={() => setPeriod('7d')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all ${
              period === '7d'
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            7 Hari Terakhir
          </button>
          <button
            onClick={() => setPeriod('30d')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all ${
              period === '30d'
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            30 Hari Terakhir
          </button>
          <button
            onClick={() => setPeriod('custom')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all ${
              period === 'custom'
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            Rentang Kustom
          </button>
        </div>

        {/* Custom Date Pickers */}
        {period === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800/80 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none text-xs focus:outline-hidden text-zinc-800 dark:text-zinc-200"
              />
            </div>
            <span className="text-zinc-400 font-medium">s/d</span>
            <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800/80 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none text-xs focus:outline-hidden text-zinc-800 dark:text-zinc-200"
              />
            </div>
            <button
              onClick={() => fetchAnalytics()}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-xs transition-colors"
            >
              Terapkan
            </button>
          </div>
        )}

        {/* Novel Filter Dropdown */}
        <div className="flex items-center gap-2 ml-auto">
          <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <select
            value={novelId ?? ''}
            onChange={(e) => {
              const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
              setNovelId(val);
            }}
            className="text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 px-3 py-1.5 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 max-w-xs truncate"
          >
            <option value="">Semua Novel (Global)</option>
            {novels.map((n) => (
              <option key={n.id} value={n.id}>
                {n.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-center gap-3 text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* LOADING STATE */}
      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3" />
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
              </div>
            ))}
          </div>
          <div className="h-72 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 animate-pulse flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 opacity-60" />
          </div>
        </div>
      ) : data ? (
        <div className="space-y-8">
          {/* Active Filter Info Banner */}
          <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center justify-between px-1">
            <span>
              Menampilkan data periode: <strong className="text-zinc-700 dark:text-zinc-300">{data.startDate}</strong> s/d{' '}
              <strong className="text-zinc-700 dark:text-zinc-300">{data.endDate}</strong> (WIB)
            </span>
            {data.novelFilter && (
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                Difilter untuk 1 Novel
              </span>
            )}
          </div>

          {/* 1. KPI Cards */}
          <AnalyticsKpiCards summary={data.summary} />

          {/* 2. Daily Trends SVG Chart */}
          <AnalyticsDailyTrendsChart data={data.dailyTrends} />

          {/* 3. Popular Novels Table */}
          <AnalyticsPopularNovelsTable
            novels={data.popularNovels}
            sortBy={sortBy}
            onSortChange={(newSort) => setSortBy(newSort)}
          />
        </div>
      ) : null}
    </div>
  );
}
