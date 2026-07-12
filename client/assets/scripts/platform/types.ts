export type PlatformKind = 'web' | 'wechat';

export interface PlatformAdapter {
  readonly kind: PlatformKind;
  getApiBaseUrl(): string;
  storageGet(key: string): string | null;
  storageSet(key: string, value: string): void;
  vibrateShort?(): void;
}

let active: PlatformAdapter | null = null;

export function setPlatform(adapter: PlatformAdapter): void {
  active = adapter;
}

export function getPlatform(): PlatformAdapter {
  if (!active) {
    throw new Error('Platform adapter not initialized. Call bootstrapPlatform() first.');
  }
  return active;
}
