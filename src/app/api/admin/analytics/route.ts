import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-guard';
import { analyticsQuerySchema } from '@/lib/validations/analytics';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { AnalyticsResponse, DailyTrendItem, PopularNovelAnalytics } from '@/types';

// Helper: Format Date ke string YYYY-MM-DD di zona waktu WIB (UTC+7)
function formatWibDate(date: Date): string {
  // Tambah 7 jam untuk konversi UTC ke WIB
  const wibTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return wibTime.toISOString().split('T')[0];
}

// Helper: Parse string YYYY-MM-DD (WIB) ke Date UTC
function parseWibDateRange(startDateStr: string, endDateStr: string) {
  // Start: YYYY-MM-DD 00:00:00 WIB -> UTC (dikurangi 7 jam)
  const startUtc = new Date(`${startDateStr}T00:00:00+07:00`);
  // End: YYYY-MM-DD 23:59:59.999 WIB -> UTC
  const endUtc = new Date(`${endDateStr}T23:59:59.999+07:00`);
  return { startUtc, endUtc };
}

// Helper: Hasilkan seluruh array tanggal YYYY-MM-DD dalam rentang
function generateDateList(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  const curr = new Date(`${startDateStr}T00:00:00+07:00`);
  const end = new Date(`${endDateStr}T00:00:00+07:00`);

  while (curr <= end) {
    dates.push(formatWibDate(curr));
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

// GET /api/admin/analytics — Statistik Pembaca untuk Administrator
export async function GET(request: NextRequest) {
  try {
    // 1. Proteksi akses admin
    const { user, error } = await requireAdmin();
    if (error) return error;

    // 2. Parse & validasi query params
    const searchParams = request.nextUrl.searchParams;
    const rawQuery = {
      period: searchParams.get('period') || '7d',
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      novelId: searchParams.get('novelId') || undefined,
      sortBy: searchParams.get('sortBy') || 'activities',
    };

    const parsedQuery = analyticsQuerySchema.safeParse(rawQuery);
    if (!parsedQuery.success) {
      return errorResponse(parsedQuery.error.issues[0]?.message || 'Parameter tidak valid', 400);
    }

    const { period, novelId, sortBy } = parsedQuery.data;

    // 3. Tentukan rentang tanggal kalender WIB
    const now = new Date();
    const todayWibStr = formatWibDate(now);

    let startDateStr = todayWibStr;
    let endDateStr = todayWibStr;

    if (period === '7d') {
      const past7 = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      startDateStr = formatWibDate(past7);
      endDateStr = todayWibStr;
    } else if (period === '30d') {
      const past30 = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      startDateStr = formatWibDate(past30);
      endDateStr = todayWibStr;
    } else if (period === 'custom') {
      startDateStr = parsedQuery.data.startDate!;
      endDateStr = parsedQuery.data.endDate!;

      // Validasi urutan tanggal
      if (startDateStr > endDateStr) {
        return errorResponse('Tanggal mulai tidak boleh lebih besar dari tanggal selesai', 400);
      }

      // Validasi rentang maksimal 90 hari
      const diffMs =
        new Date(`${endDateStr}T00:00:00Z`).getTime() -
        new Date(`${startDateStr}T00:00:00Z`).getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 90) {
        return errorResponse('Rentang tanggal maksimal 90 hari', 400);
      }
    }

    const { startUtc, endUtc } = parseWibDateRange(startDateStr, endDateStr);

    // 4. Query Summary KPI (Database Aggregation)
    // Filter klausa
    const baseWhere = {
      startTime: {
        gte: startUtc,
        lte: endUtc,
      },
      ...(novelId ? { novelId } : {}),
    };

    const [
      totalActivities,
      uniqueReadersCountRaw,
      durationAggregate,
      activeSessionsCount,
    ] = await Promise.all([
      // Total aktivitas (COUNT sesi)
      prisma.readingSession.count({ where: baseWhere }),

      // Total pembaca unik (COUNT DISTINCT userId)
      prisma.readingSession.groupBy({
        by: ['userId'],
        where: baseWhere,
      }),

      // Total durasi (SUM durationSeconds)
      prisma.readingSession.aggregate({
        where: baseWhere,
        _sum: { durationSeconds: true },
      }),

      // Sesi aktif dengan durasi > 0
      prisma.readingSession.count({
        where: {
          ...baseWhere,
          durationSeconds: { gt: 0 },
        },
      }),
    ]);

    const uniqueReaders = uniqueReadersCountRaw.length;
    const totalDurationSeconds = durationAggregate._sum.durationSeconds || 0;

    // Hitung rata-rata durasi dengan penanganan pembagian nol
    const averageDurationPerSession =
      activeSessionsCount > 0 ? Math.round(totalDurationSeconds / activeSessionsCount) : 0;
    const averageDurationPerReader =
      uniqueReaders > 0 ? Math.round(totalDurationSeconds / uniqueReaders) : 0;

    // 5. Query Tren Harian (Daily Trends)
    // Ambil data agregat per hari (WIB) langsung dari database
    const allDateList = generateDateList(startDateStr, endDateStr);

    // Menggunakan query group by atau query raw aman dengan parameterisasi
    type DailyRow = {
      date: string;
      activities: number | bigint;
      uniqueReaders: number | bigint;
    };

    const dailyRaw = await prisma.$queryRaw<DailyRow[]>`
      SELECT 
        TO_CHAR("start_time" AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS "date",
        COUNT(*)::int AS "activities",
        COUNT(DISTINCT "user_id")::int AS "uniqueReaders"
      FROM "reading_sessions"
      WHERE "start_time" >= ${startUtc} AND "start_time" <= ${endUtc}
        AND (${novelId}::int IS NULL OR "novel_id" = ${novelId}::int)
      GROUP BY 1
      ORDER BY 1 ASC;
    `;

    // Map data database ke list kalender lengkap (isi tanggal kosong dengan 0)
    const dailyMap = new Map<string, { activities: number; uniqueReaders: number }>();
    for (const row of dailyRaw) {
      dailyMap.set(row.date, {
        activities: Number(row.activities),
        uniqueReaders: Number(row.uniqueReaders),
      });
    }

    const dailyTrends: DailyTrendItem[] = allDateList.map((d) => {
      const data = dailyMap.get(d);
      return {
        date: d,
        activities: data ? data.activities : 0,
        uniqueReaders: data ? data.uniqueReaders : 0,
      };
    });

    // 6. Query Peringkat Novel Terpopuler
    type PopularRow = {
      novelId: number;
      title: string;
      slug: string;
      coverImage: string | null;
      activities: number | bigint;
      uniqueReaders: number | bigint;
      totalDuration: number | bigint;
    };

    const popularRaw = await prisma.$queryRaw<PopularRow[]>`
      SELECT 
        s."novel_id" AS "novelId",
        n."title" AS "title",
        n."slug" AS "slug",
        n."cover_image" AS "coverImage",
        COUNT(*)::int AS "activities",
        COUNT(DISTINCT s."user_id")::int AS "uniqueReaders",
        COALESCE(SUM(s."duration_seconds"), 0)::int AS "totalDuration"
      FROM "reading_sessions" s
      JOIN "novels" n ON s."novel_id" = n."id"
      WHERE s."start_time" >= ${startUtc} AND s."start_time" <= ${endUtc}
        AND (${novelId}::int IS NULL OR s."novel_id" = ${novelId}::int)
      GROUP BY s."novel_id", n."title", n."slug", n."cover_image"
      ORDER BY 
        CASE WHEN ${sortBy} = 'uniqueReaders' THEN COUNT(DISTINCT s."user_id") ELSE COUNT(*) END DESC
      LIMIT 10;
    `;

    const popularNovels: PopularNovelAnalytics[] = popularRaw.map((row) => ({
      novelId: row.novelId,
      title: row.title,
      slug: row.slug,
      coverImage: row.coverImage,
      activities: Number(row.activities),
      uniqueReaders: Number(row.uniqueReaders),
      totalDurationSeconds: Number(row.totalDuration),
    }));

    const responseData: AnalyticsResponse = {
      period,
      startDate: startDateStr,
      endDate: endDateStr,
      novelFilter: novelId || null,
      summary: {
        totalActivities,
        uniqueReaders,
        totalDurationSeconds,
        averageDurationPerSession,
        averageDurationPerReader,
        activeSessionsCount,
      },
      dailyTrends,
      popularNovels,
    };

    return successResponse(responseData);
  } catch (error) {
    console.error('Get admin analytics error:', error);
    return serverErrorResponse('Gagal mengambil data statistik pembaca');
  }
}
