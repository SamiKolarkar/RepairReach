import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '@/lib/logger';

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe('Development Mode (DEV = true)', () => {
    beforeEach(() => {
      vi.stubEnv('DEV', true);
    });

    it('delegates logger.debug to console.debug', () => {
      logger.debug('debug message', { key: 'val' });
      expect(console.debug).toHaveBeenCalledWith('debug message', { key: 'val' });
    });

    it('delegates logger.info to console.info', () => {
      logger.info('info message', 123);
      expect(console.info).toHaveBeenCalledWith('info message', 123);
    });

    it('delegates logger.warn to console.warn', () => {
      logger.warn('warning message');
      expect(console.warn).toHaveBeenCalledWith('warning message');
    });

    it('delegates logger.error to console.error', () => {
      const err = new Error('test error');
      logger.error('error occurred', err);
      expect(console.error).toHaveBeenCalledWith('error occurred', err);
    });

    it('delegates logger.log to console.log', () => {
      logger.log('general log');
      expect(console.log).toHaveBeenCalledWith('general log');
    });
  });

  describe('Production Mode (DEV = false)', () => {
    beforeEach(() => {
      vi.stubEnv('DEV', false);
    });

    it('suppresses logger.debug in production', () => {
      logger.debug('debug message');
      expect(console.debug).not.toHaveBeenCalled();
    });

    it('suppresses logger.info in production', () => {
      logger.info('info message');
      expect(console.info).not.toHaveBeenCalled();
    });

    it('suppresses logger.warn in production', () => {
      logger.warn('warning message');
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('suppresses logger.error in production (preventing dev tools leakage)', () => {
      logger.error('critical stack trace', new Error('secret db string'));
      expect(console.error).not.toHaveBeenCalled();
    });

    it('suppresses logger.log in production', () => {
      logger.log('general log');
      expect(console.log).not.toHaveBeenCalled();
    });
  });
});
