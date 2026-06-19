/**
 * Safely formats a date string into a localized format.
 * Guarantees no RangeError or date parsing crashes.
 */
export function safeFormatDate(
  dateStr: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
  fallback: string = 'N/A'
): string {
  if (!dateStr) return fallback;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return fallback;
    }
    return d.toLocaleDateString(undefined, options);
  } catch (err) {
    console.error('Error formatting date:', err, dateStr);
    return fallback;
  }
}
