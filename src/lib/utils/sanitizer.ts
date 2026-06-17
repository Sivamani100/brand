import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitizes HTML string using DOMPurify
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html);
}

/**
 * Sanitizes plain text (strips all HTML tags)
 */
export function sanitizeText(text: string): string {
  if (!text) return "";
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

/**
 * Validates whether a URL starts with http:// or https://
 */
export function isValidUrl(url: string): boolean {
  if (!url) return false;
  return /^https?:\/\/[^\s$.?#].[^\s]*$/i.test(url);
}

/**
 * Returns a sanitized URL, fallback to empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (isValidUrl(trimmed)) {
    return trimmed;
  }
  return "";
}
