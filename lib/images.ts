/** Resolve slide image URL for browser (absolute or site-relative). */
export function publicImageSrc(src: string): string {
  if (!src) return '';
  if (/^blob:/i.test(src)) return src;
  if (/^https?:\/\//i.test(src)) return src;
  const raw = src.startsWith('/') ? src.slice(1) : src;
  return '/' + raw.split('/').map(encodeURIComponent).join('/');
}
