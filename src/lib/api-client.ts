/**
 * Novelku — Unified API Client
 * Mengelola semua request HTTP dari frontend ke endpoint Next.js API Routes.
 * Menyediakan error handling terpusat, type safety lengkap, dan integrasi cookie credentials.
 */

import {
  UserResponse,
  NovelResponse,
  NovelListResponse,
  UpdatedNovelResponse,
  GenreResponse,
  ChapterResponse,
  ChapterListResponse,
  CommentResponse,
  RatingResponse,
  BookmarkResponse,
  ReadingHistoryResponse,
  PaginatedResponse,
  DashboardStats,
} from '@/types';

// ============================================================
// Custom API Error Class
// ============================================================

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ============================================================
// Core Fetch Wrapper
// ============================================================

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  // Default headers (kecuali jika mengirim FormData)
  const isFormData = options.body instanceof FormData;
  const headers = new Headers(options.headers || {});

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'same-origin', // Mengirimkan httpOnly cookie secara otomatis
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage = data?.message || getDefaultErrorMessage(response.status);
      throw new ApiError(errorMessage, response.status);
    }

    // Backend selalu mengembalikan format { success: true, data: ... }
    return data.data as T;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError('Gagal terhubung ke server. Periksa koneksi internet Anda.', 500);
  }
}

function getDefaultErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Permintaan tidak valid (Bad Request)';
    case 401:
      return 'Anda harus login terlebih dahulu';
    case 403:
      return 'Anda tidak memiliki akses ke sumber daya ini';
    case 404:
      return 'Data tidak ditemukan';
    case 409:
      return 'Data sudah ada atau terjadi konflik';
    case 500:
      return 'Terjadi kesalahan pada server';
    default:
      return `Terjadi kesalahan (Kode: ${status})`;
  }
}

// ============================================================
// 1. AUTH API
// ============================================================

export const authApi = {
  register: (body: { username: string; email: string; password: string }) =>
    apiFetch<{ user: UserResponse; message: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    apiFetch<{ user: UserResponse; message: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  logout: () =>
    apiFetch<{ message: string }>('/api/auth/logout', {
      method: 'POST',
    }),

  me: () =>
    apiFetch<{ user: UserResponse }>('/api/auth/me', {
      method: 'GET',
    }),
};

// ============================================================
// 2. NOVELS API
// ============================================================

export interface NovelQueryParams {
  search?: string;
  genre?: string;
  status?: string;
  sortBy?: 'createdAt' | 'title' | 'viewCount' | 'averageRating';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export const novelApi = {
  list: (params: NovelQueryParams = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.genre) query.set('genre', params.genre);
    if (params.status) query.set('status', params.status);
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());

    const queryString = query.toString();
    return apiFetch<PaginatedResponse<NovelListResponse>>(
      `/api/novels${queryString ? `?${queryString}` : ''}`,
      { method: 'GET' }
    );
  },

  updates: (limit: number = 8) =>
    apiFetch<UpdatedNovelResponse[]>(`/api/novels/updates?limit=${limit}`, {
      method: 'GET',
    }),

  get: (id: number) =>
    apiFetch<NovelResponse & { chapters: ChapterListResponse[] }>(`/api/novels/${id}`, {
      method: 'GET',
    }),

  create: (body: {
    title: string;
    description?: string;
    author: string;
    coverImage?: string;
    status?: 'ONGOING' | 'COMPLETED' | 'HIATUS';
    genreIds?: number[];
  }) =>
    apiFetch<NovelResponse>('/api/novels', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (
    id: number,
    body: Partial<{
      title: string;
      description?: string;
      author: string;
      coverImage?: string;
      status?: 'ONGOING' | 'COMPLETED' | 'HIATUS';
      genreIds?: number[];
    }>
  ) =>
    apiFetch<NovelResponse>(`/api/novels/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: (id: number) =>
    apiFetch<{ message: string }>(`/api/novels/${id}`, {
      method: 'DELETE',
    }),
};

// ============================================================
// 3. GENRES API
// ============================================================

export const genreApi = {
  list: () => apiFetch<GenreResponse[]>('/api/genres', { method: 'GET' }),

  create: (body: { name: string }) =>
    apiFetch<GenreResponse>('/api/genres', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (id: number, body: { name: string }) =>
    apiFetch<GenreResponse>(`/api/genres/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: (id: number) =>
    apiFetch<{ message: string }>(`/api/genres/${id}`, {
      method: 'DELETE',
    }),
};

// ============================================================
// 4. CHAPTERS API
// ============================================================

export const chapterApi = {
  listByNovel: (novelId: number) =>
    apiFetch<ChapterListResponse[]>(`/api/novels/${novelId}/chapters`, {
      method: 'GET',
    }),

  get: (id: number) =>
    apiFetch<ChapterResponse & { novel: { id: number; title: string; slug: string } }>(
      `/api/chapters/${id}`,
      { method: 'GET' }
    ),

  create: (novelId: number, body: FormData | { chapterNumber: number; title: string; content: string }) =>
    apiFetch<ChapterResponse>(`/api/novels/${novelId}/chapters`, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  update: (id: number, body: FormData | Partial<{ chapterNumber: number; title: string; content: string }>) =>
    apiFetch<ChapterResponse>(`/api/chapters/${id}`, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  delete: (id: number) =>
    apiFetch<{ message: string }>(`/api/chapters/${id}`, {
      method: 'DELETE',
    }),
};

// ============================================================
// 5. COMMENTS API
// ============================================================

export const commentApi = {
  listByNovel: (novelId: number, params: { page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    const queryString = query.toString();

    return apiFetch<PaginatedResponse<CommentResponse>>(
      `/api/novels/${novelId}/comments${queryString ? `?${queryString}` : ''}`,
      { method: 'GET' }
    );
  },

  create: (novelId: number, content: string) =>
    apiFetch<CommentResponse>(`/api/novels/${novelId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  delete: (id: number) =>
    apiFetch<{ message: string }>(`/api/comments/${id}`, {
      method: 'DELETE',
    }),
};

// ============================================================
// 6. LIKES API
// ============================================================

export const likeApi = {
  like: (novelId: number) =>
    apiFetch<{ message: string; liked: boolean }>(`/api/novels/${novelId}/like`, {
      method: 'POST',
    }),

  unlike: (novelId: number) =>
    apiFetch<{ message: string; liked: boolean }>(`/api/novels/${novelId}/like`, {
      method: 'DELETE',
    }),
};

// ============================================================
// 7. RATINGS API
// ============================================================

export const ratingApi = {
  rate: (novelId: number, value: number) =>
    apiFetch<RatingResponse>(`/api/novels/${novelId}/rating`, {
      method: 'POST',
      body: JSON.stringify({ value }),
    }),
};

// ============================================================
// 8. BOOKMARKS API
// ============================================================

export const bookmarkApi = {
  list: (params: { page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    const queryString = query.toString();

    return apiFetch<PaginatedResponse<BookmarkResponse>>(
      `/api/bookmarks${queryString ? `?${queryString}` : ''}`,
      { method: 'GET' }
    );
  },

  add: (novelId: number) =>
    apiFetch<{ message: string; bookmarked: boolean }>(`/api/novels/${novelId}/bookmark`, {
      method: 'POST',
    }),

  remove: (novelId: number) =>
    apiFetch<{ message: string; bookmarked: boolean }>(`/api/novels/${novelId}/bookmark`, {
      method: 'DELETE',
    }),
};

// ============================================================
// 9. READING HISTORY API
// ============================================================

export const historyApi = {
  list: (params: { page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    const queryString = query.toString();

    return apiFetch<PaginatedResponse<ReadingHistoryResponse>>(
      `/api/history${queryString ? `?${queryString}` : ''}`,
      { method: 'GET' }
    );
  },

  record: (chapterId: number) =>
    apiFetch<ReadingHistoryResponse>(`/api/chapters/${chapterId}/history`, {
      method: 'POST',
    }),
};

// ============================================================
// 10. ADMIN API
// ============================================================

export const adminApi = {
  dashboard: () =>
    apiFetch<DashboardStats>('/api/admin/dashboard', {
      method: 'GET',
    }),

  users: (params: { search?: string; page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    const queryString = query.toString();

    return apiFetch<PaginatedResponse<UserResponse>>(
      `/api/admin/users${queryString ? `?${queryString}` : ''}`,
      { method: 'GET' }
    );
  },

  updateUserStatus: (id: number, isActive: boolean) =>
    apiFetch<UserResponse & { message: string }>(`/api/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),

  comments: (params: { page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    const queryString = query.toString();

    return apiFetch<
      PaginatedResponse<
        CommentResponse & {
          novel: { id: number; title: string; slug: string };
        }
      >
    >(`/api/admin/comments${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },

  deleteComment: (id: number) =>
    apiFetch<{ message: string }>(`/api/admin/comments/${id}`, {
      method: 'DELETE',
    }),
};
