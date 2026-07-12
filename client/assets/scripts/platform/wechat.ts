import type { PlatformAdapter } from './types';

/**
 * WeChat mini-game adapter stub.
 * Phase 3: wx.login → POST /api/v1/auth/wechat with code.
 */
export class WechatPlatform implements PlatformAdapter {
  readonly kind = 'wechat' as const;

  getApiBaseUrl(): string {
    // Replace with production API host before release.
    return 'https://api.example.com';
  }

  storageGet(key: string): string | null {
    // return wx.getStorageSync(key) ?? null;
    return null;
  }

  storageSet(key: string, value: string): void {
    // wx.setStorageSync(key, value);
    void key;
    void value;
  }

  vibrateShort(): void {
    // wx.vibrateShort({})
  }

  /** Returns wx.login code for backend exchange. */
  async loginCode(): Promise<string> {
    // return await new Promise((resolve, reject) => wx.login({ success: (r) => resolve(r.code), fail: reject }));
    return 'wx_mock_code';
  }
}
