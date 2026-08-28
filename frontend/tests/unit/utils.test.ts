import { describe, it, expect } from 'vitest';
import {
  formatDisplayDate,
  formatDisplayTime,
  formatScheduledSlot,
  formatDateToISO,
  getTodayISO,
} from '@/lib/dateUtils';
import { cn, generateUUID } from '@/lib/utils';

describe('Utility Functions', () => {
  describe('dateUtils', () => {
    it('formatDateToISO formats date correctly', () => {
      const d = new Date(2026, 7, 20); // August 20, 2026
      expect(formatDateToISO(d)).toBe('2026-08-20');
    });

    it('getTodayISO returns valid YYYY-MM-DD pattern', () => {
      expect(getTodayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('formatDisplayDate formats ISO date to friendly string', () => {
      expect(formatDisplayDate('2026-08-20')).toBe('Aug 20, 2026');
    });

    it('formatDisplayTime formats HH:mm string to AM/PM', () => {
      expect(formatDisplayTime('09:00')).toBe('9:00 AM');
      expect(formatDisplayTime('14:30')).toBe('2:30 PM');
    });

    it('formatScheduledSlot formats date and time range', () => {
      const result = formatScheduledSlot('2026-08-20', '09:00', '11:00');
      expect(result).toBe('Aug 20, 2026 • 9:00 AM - 11:00 AM');
    });
  });

  describe('utils', () => {
    it('cn merges conditional and conflicting tailwind classes', () => {
      const result = cn('px-4 py-2', true && 'bg-primary', false && 'hidden', 'px-6');
      expect(result).toContain('bg-primary');
      expect(result).toContain('px-6');
      expect(result).not.toContain('px-4');
    });

    it('generateUUID generates valid RFC 4122 v4 UUID string', () => {
      const uuid = generateUUID();
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });
  });
});
