'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api-client';
import { DashboardStats } from '@/types';
import {
  Users,
  BookOpen,
  FileText,
  Heart,
  MessageSquare,
  Star,
  PlusCircle,
  Layers,
  ArrowUpRight,
  Loader2,
  TrendingUp,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      setIsLoading(true);
      try {
        const data = await adminApi.dashboard();
        setStats(data);
      } catch (err) {
        console.error('Failed to load admin stats:', err);
        setError('Gagal memuat data statistik dashboard');
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, []);

  const statCards = [
    {
      title: 'Total Pengguna',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50',
      href: '/admin/users',
    },
    {
      title: 'Total Novel',
      value: stats?.totalNovels || 0,
      icon: BookOpen,
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/50',
      href: '/admin/novels',
    },
    {
      title: 'Total Chapter',
      value: stats?.totalChapters || 0,
      icon: FileText,
      color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-900/50',
      href: '/admin/novels',
    },
    {
      title: 'Total Suka (Likes)',
      value: stats?.totalLikes || 0,
      icon: Heart,
      color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50',
    },
    {
      title: 'Total Komentar',
      value: stats?.totalComments || 0,
      icon: MessageSquare,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50',
      href: '/admin/comments',
    },
    {
      title: 'Total Rating Diberikan',
      value: stats?.totalRatings || 0,
      icon: Star,
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-1">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Ringkasan Sistem</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          Dashboard Administrator
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Pantau statistik dan aktivitas platform Novelku secara real-time.
        </p>
      </div>

      {/* STATS GRID */}
      {isLoading ? (
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
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {statCards.map((card, idx) => {
            const Icon = card.icon;

            const Content = (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200/80 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    {card.title}
                  </p>
                  <p className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-2">
                    {card.value.toLocaleString()}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            );

            return card.href ? (
              <Link key={idx} href={card.href} className="block group">
                {Content}
              </Link>
            ) : (
              <div key={idx}>{Content}</div>
            );
          })}
        </div>
      )}

      {/* QUICK ACTIONS SECTION */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
          Aksi Cepat & Navigasi
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/admin/novels"
            className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 transition-colors">
                  Kelola Novel
                </p>
                <p className="text-[11px] text-zinc-400">Tambah & edit cerita</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-indigo-600 transition-colors" />
          </Link>

          <Link
            href="/admin/genres"
            className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 transition-colors">
                  Kelola Genre
                </p>
                <p className="text-[11px] text-zinc-400">Kategori novel</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-indigo-600 transition-colors" />
          </Link>

          <Link
            href="/admin/users"
            className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 transition-colors">
                  Kelola Pengguna
                </p>
                <p className="text-[11px] text-zinc-400">Status & akun pembaca</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-indigo-600 transition-colors" />
          </Link>

          <Link
            href="/admin/comments"
            className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 transition-colors">
                  Moderasi Komentar
                </p>
                <p className="text-[11px] text-zinc-400">Tinjau ulasan pembaca</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-indigo-600 transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  );
}
