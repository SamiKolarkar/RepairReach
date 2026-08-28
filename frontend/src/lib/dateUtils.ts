/**
 * Formats a Date object to YYYY-MM-DD string
 */
export function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns today's date in YYYY-MM-DD format
 */
export function getTodayISO(): string {
  return formatDateToISO(new Date());
}

/**
 * Formats a date string (YYYY-MM-DD or ISO timestamp) to a friendly display string (e.g. "Oct 24, 2026")
 */
export function formatDisplayDate(dateStr: string): string {
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Formats time from ISO timestamp or HH:mm string to "10:00 AM" format
 */
export function formatDisplayTime(timeStr: string): string {
  try {
    if (timeStr.includes('T')) {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return timeStr;
      return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
    // Handle "HH:mm" or "HH:mm:ss"
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h, 10);
    const minute = m || '00';
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
  } catch {
    return timeStr;
  }
}

/**
 * Formats scheduled date and time range into Stitch display format (e.g. "Aug 20, 2026 • 11:00 AM - 1:00 PM")
 */
export function formatScheduledSlot(date: string, startTime: string, endTime: string): string {
  const dateFormatted = formatDisplayDate(date);
  const startFormatted = formatDisplayTime(startTime);
  const endFormatted = formatDisplayTime(endTime);
  return `${dateFormatted} • ${startFormatted} - ${endFormatted}`;
}
