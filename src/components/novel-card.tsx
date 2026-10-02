import React from 'react';
import Link from 'next/link';
import { NovelListResponse } from '@/types';
import { Star, BookOpen, Eye } from 'lucide-react';
import { formatImageUrl } from '@/lib/utils';

interface NovelCardProps {
  novel: NovelListResponse;
}

export default function NovelCard({ novel }: NovelCardProps) {
  const statusColor =
    novel.status === 'COMPLETED'
      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      : novel.status === 'HIATUS'
      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';

  const statusLabel =
    novel.status === 'COMPLETED' ? 'Tamat' : novel.status === 'HIATUS' ? 'Hiatus' : 'Berjalan';

  return (
    <Link
      href={`/novels/${novel.id}`}
      className="group flex flex-col bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:border-indigo-500/30 dark:hover:border-indigo-500/30 transition-all duration-300"
    >
      {/* Cover Image Container */}
      <div className="relative aspect-[3/4] w-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        {novel.coverImage ? (
          <img
            src={formatImageUrl(novel.coverImage)}
            alt={novel.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 p-4 text-center">
            <BookOpen className="w-10 h-10 text-zinc-400 dark:text-zinc-600 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 line-clamp-2">
              {novel.title}
            </span>
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-2.5 left-2.5">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border backdrop-blur-md bg-white/90 dark:bg-zinc-900/90 ${statusColor}`}
          >
            {statusLabel}
          </span>
        </div>

        {/* Rating Overlay */}
        <div className="absolute bottom-2.5 right-2.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-black/75 text-amber-400 backdrop-blur-md">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>{Number(novel.averageRating).toFixed(1)}</span>
          </span>
        </div>
      </div>

      {/* Novel Info */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Genre Badges */}
          <div className="flex flex-wrap gap-1 mb-1.5">
            {novel.genres.slice(0, 2).map((genre) => (
              <span
                key={genre.id}
                className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded"
              >
                {genre.name}
              </span>
            ))}
            {novel.genres.length > 2 && (
              <span className="text-[10px] font-medium text-zinc-400 px-1">
                +{novel.genres.length - 2}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
            {novel.title}
          </h3>

          {/* Author */}
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate">
            Oleh {novel.author}
          </p>
        </div>

        {/* Meta (Chapters & Views) */}
        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-zinc-400" />
            <span>{novel.totalChapters} Chapter</span>
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3 text-zinc-400" />
            <span>{novel.viewCount.toLocaleString()}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
