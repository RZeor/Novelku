'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  Users,
  MessageSquare,
  ArrowLeft,
  LogOut,
  Shield,
  Menu,
  X,
  Loader2,
  TrendingUp,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm text-zinc-500 font-medium">Memeriksa hak akses admin...</p>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, exact: true },
    { name: 'Statistik Pembaca', href: '/admin/analytics', icon: TrendingUp },
    { name: 'Kelola Novel', href: '/admin/novels', icon: BookOpen },
    { name: 'Kelola Genre', href: '/admin/genres', icon: Layers },
    { name: 'Kelola Pengguna', href: '/admin/users', icon: Users },
    { name: 'Moderasi Komentar', href: '/admin/comments', icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen flex bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* SIDEBAR (Desktop) */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 z-30 bg-white dark:bg-zinc-900 border-r border-zinc-200/80 dark:border-zinc-800">
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-600/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight block leading-tight">
              Admin<span className="text-indigo-600 dark:text-indigo-400">ku</span>
            </span>
            <span className="text-[10px] text-zinc-400 font-medium">Panel Administrator</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname?.startsWith(item.href);

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
          <Link
            href="/"
            className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Website Utama</span>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar ({user?.username})</span>
          </button>
        </div>
      </aside>

      {/* MOBILE DRAWER SIDEBAR */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="relative w-64 bg-white dark:bg-zinc-900 h-full flex flex-col z-10 border-r border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-left">
            <div className="h-16 px-6 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-indigo-600" />
                <span className="font-bold text-sm">Admin Panel</span>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname?.startsWith(item.href);

                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
              <Link
                href="/"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Website Utama</span>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 text-left"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN ADMIN CONTENT WRAPPER */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Mobile Header Bar */}
        <header className="lg:hidden h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200/80 dark:border-zinc-800 px-4 flex items-center justify-between sticky top-0 z-20">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-bold text-sm">Admin Panel</span>
          <div className="w-8" />
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
