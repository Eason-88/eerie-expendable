import type { PlatformAdapter } from './types';

export class WebPlatform implements PlatformAdapter {
  readonly kind = 'web' as const;

  getApiBaseUrl(): string {
    return 'http://127.0.0.1:8000';
  }

  storageGet(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  storageSet(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore quota / private mode
    }
  }
}
