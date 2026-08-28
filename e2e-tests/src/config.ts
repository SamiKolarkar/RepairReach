/**
 * E2E Test Suite Environment & Configuration
 * Provides centralized configuration for running tests against local/CI backend and frontend instances.
 */

export interface TestEnvironmentConfig {
  backendUrl: string;
  frontendUrl: string;
  apiBasePath: string;
  apiBaseUrl: string;
  timeoutMs: number;
  isCi: boolean;
}

export const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
export const API_BASE_PATH = process.env.API_BASE_PATH || '/api/v1/public';
export const TIMEOUT = parseInt(process.env.TIMEOUT || '10000', 10);
export const IS_CI = process.env.CI === 'true' || process.env.CI === '1';

/**
 * Returns the fully qualified public API base URL (e.g. http://localhost:8080/api/v1/public)
 */
export const API_BASE_URL = `${BACKEND_URL.replace(/\/+$/, '')}${API_BASE_PATH.startsWith('/') ? API_BASE_PATH : `/${API_BASE_PATH}`}`;

/**
 * Returns complete test configuration
 */
export function getTestConfig(): TestEnvironmentConfig {
  return {
    backendUrl: BACKEND_URL,
    frontendUrl: FRONTEND_URL,
    apiBasePath: API_BASE_PATH,
    apiBaseUrl: API_BASE_URL,
    timeoutMs: TIMEOUT,
    isCi: IS_CI,
  };
}

export default getTestConfig();
