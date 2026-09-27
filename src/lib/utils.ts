// ============================================================
// Utility Functions
// ============================================================

/**
 * Generate URL-friendly slug from a string.
 * Example: "Raja Iblis Reinkarnasi" -> "raja-iblis-reinkarnasi"
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')    // Remove special characters
    .replace(/[\s_]+/g, '-')      // Replace spaces/underscores with hyphens
    .replace(/-+/g, '-')          // Remove consecutive hyphens
    .replace(/^-|-$/g, '');        // Remove leading/trailing hyphens
}

/**
 * Count words in a text string.
 */
export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

/**
 * Parse pagination parameters from search params.
 */
export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Build pagination metadata for API response.
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
}

/**
 * Format image URL.
 * Automatically converts Google Drive share links to direct high-speed CDN image URLs.
 */
export function formatImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();

  // Pattern 1: drive.google.com/file/d/{FILE_ID}
  const fileIdMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileIdMatch && fileIdMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
  }

  // Pattern 2: drive.google.com/open?id={FILE_ID} or drive.google.com/uc?...id={FILE_ID}
  const queryIdMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (trimmed.includes('drive.google.com') && queryIdMatch && queryIdMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${queryIdMatch[1]}`;
  }

  return trimmed;
}

