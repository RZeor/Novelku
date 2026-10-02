import React from 'react';
import { NovelUpdateChapter } from '@/types';
import NovelChapterItem from '@/components/novel-chapter-item';

interface NovelChapterListProps {
  chapters: NovelUpdateChapter[];
}

/**
 * Daftar chapter terbaru (rounded dark rows) untuk kartu Novel Update.
 */
export default function NovelChapterList({ chapters }: NovelChapterListProps) {
  if (chapters.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {chapters.map((chapter) => (
        <NovelChapterItem key={chapter.id} chapter={chapter} />
      ))}
    </div>
  );
}