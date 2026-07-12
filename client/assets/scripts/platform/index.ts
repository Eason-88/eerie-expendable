import { setPlatform } from './types';
import { WebPlatform } from './web';
import { WechatPlatform } from './wechat';

function detectWechat(): boolean {
  // Cocos WeChat build injects global `wx`.
  return typeof (globalThis as { wx?: unknown }).wx !== 'undefined';
}

/** Call once at boot before any net/save usage. */
export function bootstrapPlatform(): void {
  if (detectWechat()) {
    setPlatform(new WechatPlatform());
  } else {
    setPlatform(new WebPlatform());
  }
}
