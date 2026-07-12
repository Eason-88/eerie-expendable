import { _decorator, Component } from 'cc';
import { bootstrapPlatform } from '../platform';
import { getPlatform } from '../platform/types';

const { ccclass } = _decorator;

/** Boot entry: platform detect + optional health ping. */
@ccclass('BootStrap')
export class BootStrap extends Component {
  async start() {
    bootstrapPlatform();
    const platform = getPlatform();
    const base = platform.getApiBaseUrl();

    try {
      const response = await fetch(`${base}/health`);
      const data = (await response.json()) as { status?: string };
      console.info(`[BootStrap] API health: ${data.status ?? response.status} via ${platform.kind}`);
    } catch (error) {
      console.warn('[BootStrap] API unreachable (ok for offline preview)', error);
    }
  }
}
