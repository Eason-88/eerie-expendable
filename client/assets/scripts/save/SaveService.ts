import type { PlatformAdapter } from '../platform/types';

export const SAVE_SCHEMA_VERSION = 1;

export interface SaveData {
  schema_version: number;
  version: number;
  level_id: string;
  checkpoint: string;
  client_updated_at?: string;
  data: Record<string, unknown>;
}

export function defaultSave(): SaveData {
  return {
    schema_version: SAVE_SCHEMA_VERSION,
    version: 1,
    level_id: 'level_01',
    checkpoint: 'intro',
    client_updated_at: new Date().toISOString(),
    data: {
      pigCleared: false,
      ritualCleared: false,
      settings: { voEnabled: true, difficulty: 'normal' },
    },
  };
}

/** Local + cloud save service for Cocos (mirrors web-preview SaveService). */
export class SaveService {
  private readonly platform: PlatformAdapter;
  private readonly apiBase: string;
  private token: string | null = null;
  save: SaveData = defaultSave();

  constructor(platform: PlatformAdapter) {
    this.platform = platform;
    this.apiBase = platform.getApiBaseUrl().replace(/\/$/, '');
    const raw = platform.storageGet('eerie.save.v1');
    if (raw) {
      try {
        this.save = { ...defaultSave(), ...JSON.parse(raw) };
      } catch {
        this.save = defaultSave();
      }
    }
  }

  private persistLocal() {
    this.save.client_updated_at = new Date().toISOString();
    this.platform.storageSet('eerie.save.v1', JSON.stringify(this.save));
  }

  async devLogin(deviceId: string, displayName = '黑鹰7号') {
    const res = await fetch(`${this.apiBase}/api/v1/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId, display_name: displayName }),
    });
    if (!res.ok) throw new Error('dev_login_failed');
    const data = (await res.json()) as { access_token: string };
    this.token = data.access_token;
    this.platform.storageSet('eerie.token.v1', data.access_token);
    return data;
  }

  async wechatLogin(code: string, displayName = '黑鹰7号') {
    const res = await fetch(`${this.apiBase}/api/v1/auth/wechat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, display_name: displayName }),
    });
    if (!res.ok) throw new Error('wechat_login_failed');
    const data = (await res.json()) as { access_token: string };
    this.token = data.access_token;
    this.platform.storageSet('eerie.token.v1', data.access_token);
    return data;
  }

  patch(checkpoint: string, dataPatch: Record<string, unknown> = {}) {
    this.save = {
      ...this.save,
      checkpoint,
      data: { ...this.save.data, ...dataPatch },
    };
    this.persistLocal();
  }

  async push(): Promise<{ conflict: boolean }> {
    if (!this.token) this.token = this.platform.storageGet('eerie.token.v1');
    const res = await fetch(`${this.apiBase}/api/v1/saves/current`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(this.save),
    });
    if (!res.ok) throw new Error('push_failed');
    const remote = (await res.json()) as SaveData & { conflict?: boolean; data: Record<string, unknown> };
    this.save = {
      schema_version: remote.schema_version,
      version: remote.version,
      level_id: remote.level_id,
      checkpoint: remote.checkpoint,
      client_updated_at: remote.client_updated_at,
      data: remote.data,
    };
    this.persistLocal();
    return { conflict: Boolean(remote.conflict) };
  }

  async pull(): Promise<SaveData> {
    if (!this.token) this.token = this.platform.storageGet('eerie.token.v1');
    const res = await fetch(`${this.apiBase}/api/v1/saves/current`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) throw new Error('pull_failed');
    const remote = (await res.json()) as SaveData;
    if ((remote.version ?? 0) >= (this.save.version ?? 0)) {
      this.save = {
        schema_version: remote.schema_version,
        version: remote.version,
        level_id: remote.level_id,
        checkpoint: remote.checkpoint,
        client_updated_at: remote.client_updated_at,
        data: remote.data,
      };
      this.persistLocal();
    }
    return this.save;
  }
}
