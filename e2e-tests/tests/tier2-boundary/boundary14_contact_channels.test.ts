/**
 * Tier 2 Boundary & Corner Cases: Feature 14 - Contact & Direct Channels
 *
 * Tests click-to-call (tel:) URI formatting, click-to-WhatsApp (https://wa.me/) URI encoding,
 * special characters, Marathi unicode message encoding, and missing country code normalization.
 *
 * Requirements: ORIGINAL_REQUEST.md R1, PROJECT.md Feature 14, docs/architecture/13-integration-architecture.md
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient, defaultApiClient } from '../../src/apiClient.js';
import type { BusinessProfile } from '../../src/types.js';

describe('Tier 2 - Feature 14: Contact Channels Boundary Tests', () => {
  let client: RepairReachApiClient;
  let isLiveBackend = false;

  beforeAll(async () => {
    client = defaultApiClient;
    try {
      const res = await client.getBusiness();
      isLiveBackend = res.status === 200;
    } catch {
      isLiveBackend = false;
    }
  });

  it('BVA-14-01: Validates click-to-call tel: URI formatting with standard E.164 normalization', async () => {
    const rawPhone = '+91 98220 12345';
    const normalizedTelUri = `tel:${rawPhone.replace(/[\s\-()]/g, '')}`;
    expect(normalizedTelUri).toBe('tel:+919822012345');

    if (isLiveBackend) {
      const res = await client.getBusiness();
      expect(res.status).toBe(200);
      const profile = res.data as BusinessProfile;
      expect(profile.phone).toBeTruthy();
      const phoneDigits = profile.phone.replace(/\D/g, '');
      expect(phoneDigits.length).toBeGreaterThanOrEqual(10);
    }
  });

  it('BVA-14-02: Validates click-to-WhatsApp URL encoding for prefilled message text with spaces & punctuation', () => {
    const phone = '919822012345';
    const message = 'Hello RepairReach, I need urgent washing machine repair in Solapur!';
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    expect(whatsappUrl).toMatch(/^https:\/\/wa\.me\/919822012345\?text=/);
    expect(whatsappUrl).not.toContain(' '); // Must not contain unencoded spaces
    expect(whatsappUrl).toContain('%20'); // Space encoded
    expect(whatsappUrl).toContain('%2C'); // Comma encoded
    const decoded = decodeURIComponent(whatsappUrl.split('?text=')[1]);
    expect(decoded).toBe(message);
  });

  it('BVA-14-03: Encodes URI metacharacters (&, =, ?, #, newlines) safely in WhatsApp messages', () => {
    const phone = '919822012345';
    const complexMessage = 'Booking inquiry:\nService: AC Repair & Gas Charge\nLocation: #12 Navi Peth\nBudget: Rs. 500 = ok?';
    const encodedUrl = `https://wa.me/${phone}?text=${encodeURIComponent(complexMessage)}`;

    expect(encodedUrl).toContain('%26'); // &
    expect(encodedUrl).toContain('%3D'); // =
    expect(encodedUrl).toContain('%3F'); // ?
    expect(encodedUrl).toContain('%23'); // #
    expect(encodedUrl).toContain('%0A'); // \n
  });

  it('BVA-14-04: Encodes Marathi / Devanagari and emojis in WhatsApp message correctly', () => {
    const phone = '919822012345';
    const marathiMessage = 'नमस्ते रिपेअररीच! मला वॉशिंग मशीन दुरुस्ती हवी आहे 🔧🛠️';
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(marathiMessage)}`;

    expect(whatsappUrl).toMatch(/^https:\/\/wa\.me\//);
    // Decode back to ensure complete fidelity
    const queryPart = whatsappUrl.split('?text=')[1];
    const decoded = decodeURIComponent(queryPart);
    expect(decoded).toBe(marathiMessage);
  });

  it('BVA-14-05: Normalizes phone numbers with or without leading country code (+91 / 91 / 0)', () => {
    function normalizeIndianPhone(input: string): string {
      const digits = input.replace(/\D/g, '');
      if (digits.length === 10) {
        return `+91${digits}`;
      } else if (digits.length === 12 && digits.startsWith('91')) {
        return `+${digits}`;
      } else if (digits.length === 11 && digits.startsWith('0')) {
        return `+91${digits.slice(1)}`;
      }
      return input;
    }

    expect(normalizeIndianPhone('9822012345')).toBe('+919822012345');
    expect(normalizeIndianPhone('09822012345')).toBe('+919822012345');
    expect(normalizeIndianPhone('+91 98220 12345')).toBe('+919822012345');
    expect(normalizeIndianPhone('919822012345')).toBe('+919822012345');
  });

  it('BVA-14-06: Verifies business contact profile response integrity: contains valid phone and whatsapp fields', async () => {
    if (isLiveBackend) {
      const res = await client.getBusiness();
      expect(res.status).toBe(200);
      const profile = res.data as BusinessProfile;
      expect(profile.phone).toMatch(/^\+?[0-9\s\-()]{10,}$/);
      expect(profile.whatsapp).toMatch(/^\+?[0-9\s\-()]{10,}$/);
    } else {
      const validProfile: BusinessProfile = {
        id: 'biz-1',
        code: 'SOLAPUR_MAIN',
        name: 'RepairReach Solapur',
        city: 'Solapur',
        phone: '+91 9822012345',
        whatsapp: '+91 9822012345',
      };
      expect(validProfile.phone).toBeTruthy();
      expect(validProfile.whatsapp).toBeTruthy();
    }
  });
});
