/**
 * Helper to escape HTML characters in dynamic strings preventing XSS vulnerabilities.
 * @param {string} str - Raw text string to escape.
 * @returns {string} Sanitized string safe for DOM interpolation.
 */
export function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
