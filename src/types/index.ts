// ============================================================
// Novelku — Shared TypeScript Types
// ============================================================

import { Role, NovelStatus } from '@/generated/prisma/enums';

// Re-export Prisma enums for convenience
export { Role, NovelStatus };

// ============================================================
// User Types
// ============================================================

/** User data returned by API (password excluded) */
export interface UserResponse {
  id: number;
  username: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
}

// ============================================================
// Novel Types
// ============================================================

export interface NovelResponse {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  author: string;
  coverImage: string | null;
  status: NovelStatus;
  totalChapters: number;
  viewCount: number;
  averageRating: number;
  ratingCount: number;
  genres: GenreResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NovelListResponse {
  id: number;
  title: string;
  slug: string;
  author: string;
  coverImage: string | null;
  status: NovelStatus;
  totalChapters: number;
  viewCount: number;
  averageRating: number;
  ratingCount: number;
  genres: GenreResponse[];
  createdAt: Date;
}

/** Ringkasan chapter terbaru untuk kartu Novel Update */
export interface NovelUpdateChapter {
  id: number;
  chapterNumber: number;
  title: string;
  createdAt: Date;
}

/** Novel yang baru mendapat update chapter (untuk homepage) */
export interface UpdatedNovelResponse extends NovelListResponse {
  lastChapterNumber: number | null;
  lastUpdatedAt: Date | null;
  recentChapters: NovelUpdateChapter[];
}

// ============================================================
// Genre Types
// ============================================================

export interface GenreResponse {
  id: number;
  name: string;
  slug: string;
}

// ============================================================
// Chapter Types
// ============================================================

export interface ChapterResponse {
  id: number;
  novelId: number;
  chapterNumber: number;
  title: string;
  content: string;
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChapterListResponse {
  id: number;
  novelId: number;
  chapterNumber: number;
  title: string;
  wordCount: number;
  createdAt: Date;
}

// ============================================================
// Comment Types
// ============================================================

export interface CommentResponse {
  id: number;
  userId: number;
  novelId: number;
  content: string;
  createdAt: Date;
  user: {
    id: number;
    username: string;
  };
}

// ============================================================
// Interaction Types
// ============================================================

export interface LikeResponse {
  id: number;
  userId: number;
  novelId: number;
  createdAt: Date;
}

export interface RatingResponse {
  id: number;
  userId: number;
  novelId: number;
  value: number;
  createdAt: Date;
  updatedAt: Date;
  averageRating?: number;
  ratingCount?: number;
}

export interface BookmarkResponse {
  id: number;
  userId: number;
  novelId: number;
  createdAt: Date;
  novel?: NovelListResponse;
}

export interface ReadingHistoryResponse {
  id: number;
  userId: number;
  novelId: number;
  chapterId: number;
  lastReadAt: Date;
  novel?: {
    id: number;
    title: string;
    slug: string;
    coverImage: string | null;
  };
  chapter?: {
    id: number;
    chapterNumber: number;
    title: string;
  };
}

// ============================================================
// Pagination Types
// ============================================================

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

// ============================================================
// Admin Dashboard Types
// ============================================================

export interface DashboardStats {
  totalUsers: number;
  totalNovels: number;
  totalChapters: number;
  totalLikes: number;
  totalComments: number;
  totalRatings: number;
}
