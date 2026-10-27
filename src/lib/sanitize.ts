import DOMPurify from 'isomorphic-dompurify';

export function sanitizeChapterContent(content: string): string {
  return DOMPurify.sanitize(content, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}
