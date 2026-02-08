/**
 * Malaysian formatting utilities for the IMS application.
 * Handles currency, dates, phone numbers, and Malaysian state data.
 */

// ============================================
// CURRENCY
// ============================================

/**
 * Format a number as Malaysian Ringgit (MYR) currency.
 *
 * @param amount - The numeric amount to format
 * @returns Formatted string like "RM 1,234.56"
 *
 * @example
 * ```ts
 * formatCurrency(1234.5)   // "RM 1,234.50"
 * formatCurrency(0)        // "RM 0.00"
 * formatCurrency(-500)     // "-RM 500.00"
 * ```
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);

  if (isNaN(num)) return 'RM 0.00';

  const isNegative = num < 0;
  const absFormatted = Math.abs(num).toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return isNegative ? `-RM ${absFormatted}` : `RM ${absFormatted}`;
}

/**
 * Format currency without the "RM" prefix (for use in tables, inputs).
 */
export function formatAmount(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);

  if (isNaN(num)) return '0.00';

  return num.toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ============================================
// DATES
// ============================================

/**
 * Format a date in Malaysian DD/MM/YYYY format.
 *
 * @param date - Date string, Date object, or timestamp
 * @returns Formatted string like "07/02/2026"
 *
 * @example
 * ```ts
 * formatDate('2026-02-07')               // "07/02/2026"
 * formatDate(new Date(2026, 1, 7))       // "07/02/2026"
 * ```
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';

  const d = date instanceof Date ? date : new Date(date);

  if (isNaN(d.getTime())) return '-';

  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Format a date with time in Malaysian DD/MM/YYYY HH:mm format.
 *
 * @param date - Date string, Date object, or timestamp
 * @returns Formatted string like "07/02/2026 14:30"
 *
 * @example
 * ```ts
 * formatDateTime('2026-02-07T14:30:00Z') // "07/02/2026 14:30"
 * ```
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-';

  const d = date instanceof Date ? date : new Date(date);

  if (isNaN(d.getTime())) return '-';

  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Format a date as relative time (e.g., "2 hours ago", "3 days ago").
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '-';

  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '-';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;

  return formatDate(d);
}

// ============================================
// PHONE NUMBERS
// ============================================

/**
 * Format a Malaysian phone number for display.
 *
 * @param phone - Phone number string (e.g., "+60123456789")
 * @returns Formatted string like "+60 12-345 6789"
 *
 * @example
 * ```ts
 * formatPhone('+60123456789')  // "+60 12-345 6789"
 * formatPhone('+6031234567')   // "+60 3-1234 567"
 * ```
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-';

  // Remove all non-digit characters except leading +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Malaysian mobile: +60 1X-XXX XXXX
  const mobileMatch = cleaned.match(/^\+?60(1\d)(\d{3,4})(\d{4})$/);
  if (mobileMatch) {
    return `+60 ${mobileMatch[1]}-${mobileMatch[2]} ${mobileMatch[3]}`;
  }

  // Malaysian landline: +60 X-XXXX XXXX
  const landlineMatch = cleaned.match(/^\+?60(\d)(\d{4})(\d{3,4})$/);
  if (landlineMatch) {
    return `+60 ${landlineMatch[1]}-${landlineMatch[2]} ${landlineMatch[3]}`;
  }

  // Return as-is if no pattern matches
  return phone;
}

// ============================================
// POSTCODE VALIDATION
// ============================================

/**
 * Validate a Malaysian postcode (must be exactly 5 digits).
 *
 * @param code - The postcode string to validate
 * @returns true if the postcode is valid, false otherwise
 *
 * @example
 * ```ts
 * validatePostcode('50000')  // true
 * validatePostcode('1234')   // false
 * validatePostcode('AB123')  // false
 * ```
 */
export function validatePostcode(code: string | null | undefined): boolean {
  if (!code) return false;
  return /^\d{5}$/.test(code);
}

// ============================================
// MALAYSIAN STATES
// ============================================

export interface MalaysianState {
  /** State code (e.g., "JHR", "KUL") */
  code: string;
  /** English name */
  name: string;
  /** Bahasa Malaysia name */
  nameMalay: string;
}

/**
 * Complete list of Malaysian states and federal territories.
 */
export const MALAYSIAN_STATES: MalaysianState[] = [
  { code: 'JHR', name: 'Johor', nameMalay: 'Johor' },
  { code: 'KDH', name: 'Kedah', nameMalay: 'Kedah' },
  { code: 'KTN', name: 'Kelantan', nameMalay: 'Kelantan' },
  { code: 'MLK', name: 'Malacca', nameMalay: 'Melaka' },
  { code: 'NSN', name: 'Negeri Sembilan', nameMalay: 'Negeri Sembilan' },
  { code: 'PHG', name: 'Pahang', nameMalay: 'Pahang' },
  { code: 'PRK', name: 'Perak', nameMalay: 'Perak' },
  { code: 'PLS', name: 'Perlis', nameMalay: 'Perlis' },
  { code: 'PNG', name: 'Penang', nameMalay: 'Pulau Pinang' },
  { code: 'SBH', name: 'Sabah', nameMalay: 'Sabah' },
  { code: 'SWK', name: 'Sarawak', nameMalay: 'Sarawak' },
  { code: 'SGR', name: 'Selangor', nameMalay: 'Selangor' },
  { code: 'TRG', name: 'Terengganu', nameMalay: 'Terengganu' },
  { code: 'KUL', name: 'Kuala Lumpur', nameMalay: 'Kuala Lumpur' },
  { code: 'PJY', name: 'Putrajaya', nameMalay: 'Putrajaya' },
  { code: 'LBN', name: 'Labuan', nameMalay: 'Labuan' },
];

/**
 * Get a Malaysian state by its code.
 */
export function getStateByCode(code: string): MalaysianState | undefined {
  return MALAYSIAN_STATES.find((s) => s.code === code);
}

/**
 * Get state display name based on locale.
 */
export function getStateName(code: string, locale: 'en' | 'ms' = 'en'): string {
  const state = getStateByCode(code);
  if (!state) return code;
  return locale === 'ms' ? state.nameMalay : state.name;
}

// ============================================
// MISC FORMATTERS
// ============================================

/**
 * Format a percentage value for display.
 */
export function formatPercentage(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (isNaN(num)) return '0%';
  return `${num.toFixed(2)}%`;
}

/**
 * Format a number with thousands separators.
 */
export function formatNumber(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-MY');
}

/**
 * Truncate a string with ellipsis.
 */
export function truncate(str: string | null | undefined, maxLength: number = 50): string {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return `${str.substring(0, maxLength)}...`;
}
