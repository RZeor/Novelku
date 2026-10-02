import React from 'react';
import { BookOpen } from 'lucide-react';
import { formatImageUrl } from '@/lib/utils';

interface NovelCoverProps {
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
}

/**
 * Cover novel dengan aspect ratio portrait dan fallback konsisten.
 * Reusable — dipakai kartu Novel Update (dan berpotensi komponen lain).
 */
export default function NovelCover({ src, alt, className = '', imgClassName = '' }: NovelCoverProps) {
  return (
    <div
      className={`relative aspect-[3/4] w-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 ${className}`}
    >
      {src ? (
        <img
          src={formatImageUrl(src)}
          alt={alt}
          loading="lazy"
          className={`w-full h-full object-cover ${imgClassName}`}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 text-center text-zinc-400 dark:text-zinc-600">
          <BookOpen className="w-8 h-8" />
          <span className="text-xs font-medium line-clamp-2">{alt}</span>
        </div>
      )}
    </div>
  );
}