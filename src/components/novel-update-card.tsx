import React from 'react';
import Link from 'next/link';
import { UpdatedNovelResponse } from '@/types';
import NovelCover from '@/components/novel-cover';
import NovelChapterList from '@/components/novel-chapter-list';

interface NovelUpdateCardProps {
  novel: UpdatedNovelResponse;
}

/**
 * Kartu novel untuk section "Novel Update".
 * Cover besar → badge UP + judul → daftar chapter (rounded dark rows).
 * Seluruh data berasal dari props (tidak ada data hard-code).
 */
export default function NovelUpdateCard({ novel }: NovelUpdateCardProps) {
  return (
    <article className="flex flex-col gap-3 p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
      {/* Cover → detail novel */}
      <Link
        href={`/novels/${novel.id}`}
        className="group block rounded-xl overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <NovelCover
          src={novel.coverImage}
          alt={novel.title}
          imgClassName="group-hover:scale-105 transition-transform duration-500"
        />
      </Link>

      {/* Badge UP + Judul */}
      <div className="flex items-start gap-2 px-0.5">
        <span className="mt-0.5 shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-md bg-red-500 text-white text-[10px] font-bold leading-none tracking-wide">
          UP
        </span>
        <Link
          href={`/novels/${novel.id}`}
          className="text-lg font-semibold leading-snug text-zinc-900 dark:text-zinc-50 line-clamp-2 hover:text-red-500 dark:hover:text-red-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
        >
          {novel.title}
        </Link>
      </div>

      {/* Daftar chapter terbaru */}
      <NovelChapterList chapters={novel.recentChapters} />
    </article>
  );
}