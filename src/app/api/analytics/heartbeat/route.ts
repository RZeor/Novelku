import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { heartbeatSchema } from '@/lib/validations/analytics';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '@/lib/api-response';

const MAX_SESSION_DURATION_SECONDS = 10800; // 3 jam maksimal per sesi membaca

// POST /api/analytics/heartbeat — Pembaruan durasi membaca aktif (interval klien: 30 detik)
export async function POST(request: NextRequest) {
  try {
    // 1. Verifikasi pengguna login
    const { user, error } = await requireAuth();
    if (error) return error;

    // 2. Validasi body input
    const body = await request.json().catch(() => ({}));
    const parsed = heartbeatSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || 'Input tidak valid', 400);
    }

    const { sessionId } = parsed.data;

    // 3. Cari sesi di database
    const session = await prisma.readingSession.findUnique({
      where: { sessionId },
    });

    if (!session) {
      return notFoundResponse('Sesi membaca tidak ditemukan');
    }

    // 4. Validasi kepemilikan sesi
    if (session.userId !== user!.id) {
      return forbiddenResponse('Akses ditolak: Bukan pemilik sesi');
    }

    // 5. Cek apakah sesi sudah selesai sebelumnya
    if (session.isCompleted) {
      return successResponse({
        credited: 0,
        totalDuration: session.durationSeconds,
        isCompleted: true,
        message: 'Sesi membaca telah selesai atau mencapai batas maksimal',
      });
    }

    const now = new Date();
    const deltaSeconds = Math.floor(
      (now.getTime() - new Date(session.lastHeartbeat).getTime()) / 1000
    );

    // 6. Evaluasi interval selisih waktu
    // Case < 10 detik: terlalu cepat / burst request.
    // Durasi kredit = 0 dan TIDAK menggeser lastHeartbeat agar waktu acuan tidak rusak.
    if (deltaSeconds < 10) {
      return successResponse({
        credited: 0,
        totalDuration: session.durationSeconds,
        isCompleted: false,
        message: 'Heartbeat terlalu cepat diabaikan tanpa menggeser acuan waktu',
      });
    }

    let credit = 0;
    if (deltaSeconds <= 45) {
      // Normal: 10 - 45 detik -> kreditkan delta aktual dibatasi maksimal 30 detik
      credit = Math.min(deltaSeconds, 30);
    } else if (deltaSeconds <= 120) {
      // Jeda parsial / lag: 46 - 120 detik -> kreditkan flat 30 detik (1 siklus), sisanya dianggap idle
      credit = 30;
    } else {
      // Untrusted gap: > 120 detik (browser sleep / idle lama) -> kredit 0, titik acuan di-reset
      credit = 0;
    }

    // 7. Hitung sisa batas maksimum 3 jam
    const remainingToLimit = Math.max(0, MAX_SESSION_DURATION_SECONDS - session.durationSeconds);
    const allowedCredit = Math.min(credit, remainingToLimit);
    const willComplete = session.durationSeconds + allowedCredit >= MAX_SESSION_DURATION_SECONDS;

    // 8. Pembaruan atomik dengan optimistic concurrency check
    const updateResult = await prisma.readingSession.updateMany({
      where: {
        sessionId,
        userId: user!.id,
        isCompleted: false,
        lastHeartbeat: session.lastHeartbeat, // Pastikan tidak terjadi double-credit paralel
      },
      data: {
        durationSeconds: { increment: allowedCredit },
        lastHeartbeat: now,
        isCompleted: willComplete,
      },
    });

    if (updateResult.count === 0) {
      // Jika count === 0, artinya request bersamaan sudah mendahului.
      // Ambil state terbaru untuk respons yang konsisten.
      const freshSession = await prisma.readingSession.findUnique({
        where: { sessionId },
      });
      return successResponse({
        credited: 0,
        totalDuration: freshSession?.durationSeconds ?? session.durationSeconds,
        isCompleted: freshSession?.isCompleted ?? false,
      });
    }

    const finalDuration = session.durationSeconds + allowedCredit;

    return successResponse({
      credited: allowedCredit,
      totalDuration: finalDuration,
      isCompleted: willComplete,
    });
  } catch (error) {
    console.error('Heartbeat analytics error:', error);
    return serverErrorResponse('Gagal memperbarui durasi membaca');
  }
}
