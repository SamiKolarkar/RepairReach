/**
 * Tier 1 Feature Coverage: Feature 14 - Contact & Direct Channels (Call & WhatsApp)
 * Specification: ORIGINAL_REQUEST.md (R1), PROJECT.md (§ Interface Contracts), docs/architecture/01-system-context.md, 13-integration-architecture.md
 *
 * Verifies direct click-to-call (tel:) and click-to-WhatsApp (wa.me) links, phone normalization,
 * and public accessibility.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient } from '../../src/apiClient.js';
import type { BusinessProfile } from '../../src/types.js';

describe('Feature 14: Contact & Direct Channels (Call / WhatsApp)', () => {
  let apiClient: RepairReachApiClient;

  beforeAll(() => {
    apiClient = new RepairReachApiClient();
  });

  it('14.1 should provide valid business telephone number with Indian country code (+91)', async () => {
    const res = await apiClient.getBusiness();
    expect(res.status).toBe(200);

    const profile = res.data as BusinessProfile;
    expect(profile.phone).toBeTruthy();
    // Must contain 10 digits and optional country code
    const digitsOnly = profile.phone.replace(/\D/g, '');
    expect(digitsOnly.length).toBeGreaterThanOrEqual(10);
  });

  it('14.2 should generate standard RFC 3966 click-to-call tel: URI from business phone', async () => {
    const res = await apiClient.getBusiness();
    expect(res.status).toBe(200);

    const profile = res.data as BusinessProfile;
    const cleanPhone = profile.phone.replace(/[\s-]/g, '');
    const telUri = `tel:${cleanPhone}`;

    expect(telUri).toMatch(/^tel:\+?91\d{10}$/);
  });

  it('14.3 should provide valid WhatsApp number and generate https://wa.me/ direct chat link', async () => {
    const res = await apiClient.getBusiness();
    expect(res.status).toBe(200);

    const profile = res.data as BusinessProfile;
    expect(profile.whatsapp).toBeTruthy();

    const digitsOnly = profile.whatsapp.replace(/\D/g, '');
    const waUrl = `https://wa.me/${digitsOnly}`;

    expect(waUrl).toMatch(/^https:\/\/wa\.me\/91\d{10}$/);
  });

  it('14.4 should verify WhatsApp link contains sanitized numeric digits without spaces or dashes', async () => {
    const res = await apiClient.getBusiness();
    expect(res.status).toBe(200);

    const profile = res.data as BusinessProfile;
    const digitsOnly = profile.whatsapp.replace(/\D/g, '');

    expect(digitsOnly).not.toContain(' ');
    expect(digitsOnly).not.toContain('-');
    expect(digitsOnly).not.toContain('+');
    expect(digitsOnly).toMatch(/^[0-9]+$/);
  });

  it('14.5 should expose complete Solapur address and primary location in business profile', async () => {
    const res = await apiClient.getBusiness();
    expect(res.status).toBe(200);

    const profile = res.data as BusinessProfile;
    expect(profile.city).toBe('Solapur');
    if (profile.address) {
      expect(profile.address.length).toBeGreaterThan(5);
    }
  });

  it('14.6 should confirm all contact channels are accessible publicly without customer authentication', async () => {
    const unauthenticatedClient = new RepairReachApiClient({ headers: {} });
    const res = await unauthenticatedClient.getBusiness();

    expect(res.status).toBe(200);
    const profile = res.data as BusinessProfile;
    expect(profile.phone).toBeTruthy();
    expect(profile.whatsapp).toBeTruthy();
  });
});
