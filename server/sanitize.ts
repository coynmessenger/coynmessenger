function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function removeControlChars(input: string): string {
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

export function sanitizeText(input: string | null | undefined): string | null {
  if (input === null || input === undefined) return null;
  if (typeof input !== 'string') return null;
  
  let cleaned = stripHtml(input);
  cleaned = removeControlChars(cleaned);
  cleaned = cleaned.trim();
  
  return cleaned || null;
}

export function sanitizeDisplayName(input: string | null | undefined): string | null {
  if (input === null || input === undefined) return null;
  if (typeof input !== 'string') return null;
  
  let cleaned = stripHtml(input);
  cleaned = escapeHtml(cleaned);
  cleaned = removeControlChars(cleaned);
  cleaned = cleaned.trim();
  cleaned = cleaned.slice(0, 100);
  
  return cleaned || null;
}

export function sanitizeUrl(input: string | null | undefined): string | null {
  if (input === null || input === undefined) return null;
  if (typeof input !== 'string') return null;
  
  const trimmed = input.trim();
  
  if (trimmed.toLowerCase().startsWith('javascript:') || 
      trimmed.toLowerCase().startsWith('data:text/html') ||
      trimmed.toLowerCase().startsWith('vbscript:')) {
    return null;
  }
  
  try {
    const url = new URL(trimmed);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return null;
    }
    return trimmed;
  } catch {
    if (trimmed.startsWith('/')) {
      return trimmed;
    }
    return null;
  }
}

export function sanitizeEmail(input: string | null | undefined): string | null {
  if (input === null || input === undefined) return null;
  if (typeof input !== 'string') return null;
  
  const trimmed = input.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(trimmed)) return null;
  if (trimmed.length > 254) return null;
  
  return trimmed;
}

export function sanitizeNumericString(input: string | number | null | undefined): string | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') {
    return isFinite(input) ? String(input) : null;
  }
  if (typeof input !== 'string') return null;
  
  const cleaned = input.replace(/[^0-9.]/g, '');
  if (cleaned && !isNaN(parseFloat(cleaned))) {
    return cleaned;
  }
  return null;
}
