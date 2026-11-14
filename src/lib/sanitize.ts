import sanitizeHtml from 'sanitize-html';

export function sanitizeChapterContent(content: string): string {
  return sanitizeHtml(content, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  });
}
