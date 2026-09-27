'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { ratingApi, ApiError } from '@/lib/api-client';
import { Star, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface RatingWidgetProps {
  novelId: number;
  averageRating: number;
  ratingCount: number;
  onRatingUpdated: (newAvg: number, newCount: number) => void;
}

export default function RatingWidget({
  novelId,
  averageRating,
  ratingCount,
  onRatingUpdated,
}: RatingWidgetProps) {
  const { user } = useAuth();
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRate = async (value: number) => {
    if (!user) return;
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const res = await ratingApi.rate(novelId, value);
      setMessage(`Rating ${value} bintang berhasil disimpan!`);
      // Update data di parent
      onRatingUpdated(value, ratingCount + 1);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Gagal memberikan rating');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Beri Rating Novel Ini
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Bantu pembaca lain menemukan novel berkualitas
          </p>
        </div>

        {user ? (
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => {
              const isFilled =
                hoveredRating !== null ? star <= hoveredRating : star <= Math.round(averageRating);

              return (
                <button
                  key={star}
                  type="button"
                  disabled={isSubmitting}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(null)}
                  onClick={() => handleRate(star)}
                  className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                  aria-label={`Beri rating ${star} bintang`}
                >
                  <Star
                    className={`w-6 h-6 transition-all ${
                      isFilled
                        ? 'text-amber-400 fill-amber-400 scale-110'
                        : 'text-zinc-300 dark:text-zinc-700'
                    }`}
                  />
                </button>
              );
            })}
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin text-zinc-400 ml-2" />}
          </div>
        ) : (
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            <Link
              href="/login"
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Masuk
            </Link>{' '}
            untuk memberikan rating.
          </div>
        )}
      </div>

      {message && (
        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-2">
          ✓ {message}
        </p>
      )}
      {error && (
        <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-2">
          ✕ {error}
        </p>
      )}
    </div>
  );
}
