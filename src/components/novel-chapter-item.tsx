import React from 'react';
import Link from 'next/link';
import { NovelUpdateChapter } from '@/types';
import { formatRelativeTime } from '@/lib/utils';

interface NovelChapterItemProps {
  chapter: NovelUpdateChapter;
}

/**
 * Satu baris chapter: nama di kiri, waktu update relatif di kanan.
 * Seluruh baris clickable menuju chapter reader.
 */
export default function NovelChapterItem({ chapter }: NovelChapterItemProps) {
  return (
    <Link
      href={`/chapters/${chapter.id}`}
      className="flex items-center justify-between gap-3 min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 active:bg-zinc-300/70 dark:active:bg-zinc-700 text-zinc-800 dark:text-zinc-100 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <span className="text-xs font-medium truncate">
        {chapter.title || `Chapter ${chapter.chapterNumber}`}
      </span>
      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 shrink-0 tabular-nums">
        {formatRelativeTime(chapter.createdAt)}
      </span>
    </Link>
  );
}