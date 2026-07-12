import type { PlatformAdapter } from './types';

/**
 * WeChat mini-game adapter stub.
 * Real wx APIs will be wired when building with WeChat toolchain (phase 3).
 */
export class WechatPlatform implements PlatformAdapter {
  readonly kind = 'wechat' as const;

  getApiBaseUrl(): string {
    // Replace with production API host before release.
    return 'https://api.example.com';
  }

  storageGet(key: string): string | null {
    // wx.getStorageSync(key)
    return null;
  }

  storageSet(key: string, value: string): void {
    // wx.setStorageSync(key, value)
    void key;
    void value;
  }

  vibrateShort(): void {
    // wx.vibrateShort({})
  }
}
