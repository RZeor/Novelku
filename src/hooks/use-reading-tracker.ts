'use client';

import { useEffect, useRef } from 'react';
import { analyticsApi } from '@/lib/api-client';

interface UseReadingTrackerOptions {
  novelId: number;
  chapterId: number;
  enabled: boolean; // Hanya aktif jika pengguna sudah login
}

/**
 * Hook untuk mencatat aktivitas dan estimasi durasi membaca aktif.
 * Mengelola siklus sesi, interval heartbeat 30 detik, dan event visibilitychange.
 */
export function useReadingTracker({ novelId, chapterId, enabled }: UseReadingTrackerOptions) {
  const sessionIdRef = useRef<string | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isCompletedRef = useRef<boolean>(false);
  const isStartedRef = useRef<boolean>(false);

  useEffect(() => {
    // Hanya berjalan jika tracking di-enable (pengguna terautentikasi) dan ID valid
    if (!enabled || !novelId || !chapterId || isNaN(novelId) || isNaN(chapterId)) {
      return;
    }

    // Generate Session ID unik (UUID v4)
    const sessionId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

    sessionIdRef.current = sessionId;
    isCompletedRef.current = false;
    isStartedRef.current = false;

    // Fungsi pengirim denyut heartbeat berkala
    const sendHeartbeat = async () => {
      if (
        !sessionIdRef.current ||
        isCompletedRef.current ||
        typeof document === 'undefined' ||
        document.visibilityState === 'hidden'
      ) {
        return;
      }

      try {
        const res = await analyticsApi.heartbeat(sessionIdRef.current);
        if (res.isCompleted) {
          isCompletedRef.current = true;
          if (heartbeatTimerRef.current) {
            clearInterval(heartbeatTimerRef.current);
            heartbeatTimerRef.current = null;
          }
        }
      } catch {
        // Silently fail pada network error agar tidak mengganggu pengalaman baca
      }
    };

    // Mulai sesi membaca
    const startSession = async () => {
      try {
        const res = await analyticsApi.startRead({
          sessionId,
          novelId,
          chapterId,
        });

        if (res.tracked) {
          isStartedRef.current = true;
          // Mulai heartbeat timer setiap 30 detik
          heartbeatTimerRef.current = setInterval(sendHeartbeat, 30_000);
        }
      } catch {
        // Silently fail jika terjadi kendala jaringan
      }
    };

    startSession();

    // Event listener saat tab aktif / di latar belakang
    const handleVisibilityChange = () => {
      if (typeof document === 'undefined') return;

      if (document.visibilityState === 'hidden') {
        // Tab tersembunyi: jeda heartbeat timer
        if (heartbeatTimerRef.current) {
          clearInterval(heartbeatTimerRef.current);
          heartbeatTimerRef.current = null;
        }
      } else if (document.visibilityState === 'visible') {
        // Tab aktif kembali: lanjutkan interval heartbeat jika sesi belum selesai
        if (!isCompletedRef.current && isStartedRef.current && !heartbeatTimerRef.current) {
          heartbeatTimerRef.current = setInterval(sendHeartbeat, 30_000);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // Cleanup saat unmount atau chapter berganti
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [novelId, chapterId, enabled]);
}
