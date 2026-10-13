'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Users,
  Clock,
  Timer,
  Hourglass,
  BookOpen,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react';
import { AnalyticsSummary, DailyTrendItem, PopularNovelAnalytics } from '@/types';
import NovelCover from '@/components/novel-cover';

// ============================================================
// Format Waktu Helper
// ============================================================
function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0 dtk';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours} jam ${minutes > 0 ? `${minutes} mnt` : ''}`.trim();
  }
  if (minutes > 0) {
    return `${minutes} mnt ${remainingSeconds > 0 ? `${remainingSeconds} dtk` : ''}`.trim();
  }
  return `${remainingSeconds} dtk`;
}

// ============================================================
// 1. KPI SUMMARY CARDS
// ============================================================
interface KpiCardsProps {
  summary: AnalyticsSummary;
}

export function AnalyticsKpiCards({ summary }: KpiCardsProps) {
  const cards = [
    {
      title: 'Total Aktivitas Membaca',
      value: summary.totalActivities.toLocaleString('id-ID'),
      subtitle: 'Sesi valid terverifikasi',
      icon: Activity,
      color:
        'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/50',
    },
    {
      title: 'Pembaca Unik',
      value: summary.uniqueReaders.toLocaleString('id-ID'),
      subtitle: 'Pengguna terdaftar unik',
      icon: Users,
      color:
        'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50',
    },
    {
      title: 'Estimasi Total Durasi',
      value: formatDuration(summary.totalDurationSeconds),
      subtitle: 'Akumulasi waktu aktif',
      icon: Clock,
      color:
        'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-900/50',
    },
    {
      title: 'Rata-rata Durasi / Sesi',
      value: formatDuration(summary.averageDurationPerSession),
      subtitle: 'Dari sesi berdurasi > 0',
      icon: Timer,
      color:
        'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50',
    },
    {
      title: 'Rata-rata Durasi / Pembaca',
      value: formatDuration(summary.averageDurationPerReader),
      subtitle: 'Waktu per akun pembaca',
      icon: Hourglass,
      color:
        'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50',
    },
    {
      title: 'Sesi Aktif Dihitung',
      value: summary.activeSessionsCount.toLocaleString('id-ID'),
      subtitle: 'Sesi dengan heartbeat valid',
      icon: BookOpen,
      color:
        'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex items-start justify-between transition-all"
          >
            <div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {c.title}
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-2">
                {c.value}
              </p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
                {c.subtitle}
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${c.color}`}
            >
              <Icon className="w-6 h-6" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// 2. DAILY TRENDS SVG CHART
// ============================================================
interface DailyChartProps {
  data: DailyTrendItem[];
}

export function AnalyticsDailyTrendsChart({ data }: DailyChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 border border-zinc-200/80 dark:border-zinc-800 text-center text-zinc-500 text-sm">
        Tidak ada data aktivitas untuk periode ini.
      </div>
    );
  }

  // Cari nilai maksimum untuk normalisasi skala Y
  const maxActivities = Math.max(...data.map((d) => d.activities), 0);
  const maxReaders = Math.max(...data.map((d) => d.uniqueReaders), 0);
  const maxValue = Math.max(maxActivities, maxReaders, 5);

  // Dimensi SVG
  const width = 800;
  const height = 300;
  const paddingX = 40;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingTop - paddingBottom;

  const pointsCount = data.length;
  const stepX = pointsCount > 1 ? chartWidth / (pointsCount - 1) : chartWidth;

  const getY = (val: number) => {
    return height - paddingBottom - (val / maxValue) * chartHeight;
  };

  const getX = (idx: number) => {
    return paddingX + (pointsCount > 1 ? idx * stepX : chartWidth / 2);
  };

  // Bangun path SVG untuk Aktivitas (Indigo)
  const activitiesPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.activities)}`)
    .join(' ');

  // Bangun area gradient SVG untuk Aktivitas
  const activitiesArea =
    pointsCount > 1
      ? `${activitiesPath} L ${getX(pointsCount - 1)} ${height - paddingBottom} L ${getX(0)} ${
          height - paddingBottom
        } Z`
      : '';

  // Bangun path SVG untuk Pembaca Unik (Emerald)
  const readersPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.uniqueReaders)}`)
    .join(' ');

  const activePoint = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-6">
      {/* Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Tren Aktivitas Harian
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Perbandingan aktivitas membaca dan pembaca unik per hari (WIB)
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 text-xs font-medium">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-indigo-600 dark:bg-indigo-500" />
            <span className="text-zinc-700 dark:text-zinc-300">Aktivitas Membaca</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-zinc-700 dark:text-zinc-300">Pembaca Unik</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative overflow-hidden w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none overflow-visible"
        >
          <defs>
            <linearGradient id="activitiesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines horizontal */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = height - paddingBottom - pct * chartHeight;
            const val = Math.round(pct * maxValue);
            return (
              <g key={i}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="currentColor"
                  className="text-zinc-100 dark:text-zinc-800"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 10}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[10px] fill-zinc-400 dark:fill-zinc-600 font-mono"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Area fill for activities */}
          {activitiesArea && (
            <path d={activitiesArea} fill="url(#activitiesGradient)" />
          )}

          {/* Path Line: Aktivitas Membaca */}
          <path
            d={activitiesPath}
            fill="none"
            stroke="#4f46e5"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Path Line: Pembaca Unik */}
          <path
            d={readersPath}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Titik & Interaktivitas Hover */}
          {data.map((d, idx) => {
            const cx = getX(idx);
            const cyAct = getY(d.activities);
            const cyRead = getY(d.uniqueReaders);
            const isHovered = hoverIndex === idx;

            return (
              <g
                key={idx}
                className="cursor-pointer"
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
              >
                {/* Vertical hover line indicator */}
                {isHovered && (
                  <line
                    x1={cx}
                    y1={paddingTop}
                    x2={cx}
                    y2={height - paddingBottom}
                    stroke="#a1a1aa"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Point Aktivitas */}
                <circle
                  cx={cx}
                  cy={cyAct}
                  r={isHovered ? 5.5 : 3.5}
                  fill="#4f46e5"
                  className="transition-all"
                />

                {/* Point Pembaca Unik */}
                <circle
                  cx={cx}
                  cy={cyRead}
                  r={isHovered ? 5.5 : 3.5}
                  fill="#10b981"
                  className="transition-all"
                />

                {/* Invisible hit target for hover */}
                <rect
                  x={cx - stepX / 2}
                  y={paddingTop}
                  width={stepX}
                  height={chartHeight + paddingBottom}
                  fill="transparent"
                />

                {/* Label X-axis (tanggal) */}
                {(pointsCount <= 14 || idx % Math.ceil(pointsCount / 10) === 0) && (
                  <text
                    x={cx}
                    y={height - paddingBottom + 20}
                    textAnchor="middle"
                    className="text-[10px] fill-zinc-400 dark:fill-zinc-500 font-mono"
                  >
                    {d.date.substring(5)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip saat Hover */}
        {activePoint && hoverIndex !== null && (
          <div
            className="absolute z-10 pointer-events-none transform -translate-x-1/2 bg-zinc-900 dark:bg-zinc-800 text-white rounded-xl px-3.5 py-2 shadow-xl border border-zinc-700/60 text-xs transition-all space-y-1"
            style={{
              left: `${(getX(hoverIndex) / width) * 100}%`,
              top: '10px',
            }}
          >
            <p className="font-semibold text-zinc-300 text-[11px] border-b border-zinc-700/60 pb-1">
              Tanggal: {activePoint.date} (WIB)
            </p>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-indigo-400">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                Aktivitas:
              </span>
              <span className="font-bold">{activePoint.activities}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Pembaca Unik:
              </span>
              <span className="font-bold">{activePoint.uniqueReaders}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 3. POPULAR NOVELS TABLE
// ============================================================
interface PopularNovelsTableProps {
  novels: PopularNovelAnalytics[];
  sortBy: 'activities' | 'uniqueReaders';
  onSortChange: (newSort: 'activities' | 'uniqueReaders') => void;
}

export function AnalyticsPopularNovelsTable({
  novels,
  sortBy,
  onSortChange,
}: PopularNovelsTableProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Novel Terpopuler dalam Periode Ini
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Peringkat novel berdasarkan sesi membaca dan pembaca aktif terdaftar
          </p>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Urutkan:
          </span>
          <div className="inline-flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1 border border-zinc-200/80 dark:border-zinc-700/60 text-xs">
            <button
              onClick={() => onSortChange('activities')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                sortBy === 'activities'
                  ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Aktivitas
            </button>
            <button
              onClick={() => onSortChange('uniqueReaders')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                sortBy === 'uniqueReaders'
                  ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Pembaca Unik
            </button>
          </div>
        </div>
      </div>

      {novels.length === 0 ? (
        <div className="py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">
          Belum ada aktivitas membaca untuk novel pada periode ini.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 text-xs text-zinc-400 dark:text-zinc-500">
                <th className="py-3 px-3 font-semibold w-12 text-center">#</th>
                <th className="py-3 px-3 font-semibold">Novel</th>
                <th className="py-3 px-3 font-semibold text-right">Aktivitas</th>
                <th className="py-3 px-3 font-semibold text-right">Pembaca Unik</th>
                <th className="py-3 px-3 font-semibold text-right">Total Durasi</th>
                <th className="py-3 px-3 font-semibold w-16 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {novels.map((novel, index) => (
                <tr
                  key={novel.novelId}
                  className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  <td className="py-3.5 px-3 text-center font-bold text-xs text-zinc-400">
                    {index + 1}
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-14 rounded-lg overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-800">
                        <NovelCover
                          src={novel.coverImage}
                          alt={novel.title}
                          className="w-full h-full"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                          {novel.title}
                        </p>
                        <p className="text-xs text-zinc-400 truncate">
                          /novels/{novel.slug}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                    {novel.activities.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3.5 px-3 text-right font-semibold text-blue-600 dark:text-blue-400">
                    {novel.uniqueReaders.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3.5 px-3 text-right font-medium text-zinc-600 dark:text-zinc-300">
                    {formatDuration(novel.totalDurationSeconds)}
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <Link
                      href={`/novels/${novel.novelId}`}
                      target="_blank"
                      className="inline-flex p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                      title="Lihat Detail Novel"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
