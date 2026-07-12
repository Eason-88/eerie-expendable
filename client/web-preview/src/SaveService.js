/** Local + cloud save for phase 3 (web-preview). */
const SAVE_KEY = "eerie.save.v1";
const TOKEN_KEY = "eerie.token.v1";
const DEVICE_KEY = "eerie.device.v1";

const SCHEMA_VERSION = 1;

export function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = `web-${crypto.randomUUID?.() ?? String(Date.now())}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function defaultSave() {
  return {
    schema_version: SCHEMA_VERSION,
    version: 1,
    level_id: "level_01",
    checkpoint: "intro",
    client_updated_at: new Date().toISOString(),
    data: {
      pigCleared: false,
      ritualCleared: false,
      settings: { voEnabled: true, difficulty: "normal" },
    },
  };
}

export function loadLocalSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    return { ...defaultSave(), ...JSON.parse(raw) };
  } catch {
    return defaultSave();
  }
}

export function writeLocalSave(save) {
  const next = {
    ...save,
    client_updated_at: new Date().toISOString(),
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(next));
  return next;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class SaveService {
  constructor(apiBase = "http://127.0.0.1:8000") {
    this.apiBase = apiBase.replace(/\/$/, "");
    this.save = loadLocalSave();
    this.remoteConfig = null;
    this.user = null;
    this.status = "idle";
  }

  async bootstrap() {
    await this.fetchRemoteConfig();
    await this.devLogin();
    await this.pullAndMerge();
    return this.save;
  }

  async fetchRemoteConfig() {
    try {
      const res = await fetch(`${this.apiBase}/api/v1/config/client`);
      if (res.ok) this.remoteConfig = await res.json();
    } catch {
      this.remoteConfig = null;
    }
  }

  async devLogin() {
    const res = await fetch(`${this.apiBase}/api/v1/auth/dev-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device_id: getDeviceId(),
        display_name: "黑鹰7号",
      }),
    });
    if (!res.ok) throw new Error("dev_login_failed");
    const data = await res.json();
    setToken(data.access_token);
    this.user = data;
    return data;
  }

  _headers() {
    const token = getToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  patchLocal( partialCheckpoint, dataPatch = {}) {
    this.save = writeLocalSave({
      ...this.save,
      checkpoint: partialCheckpoint ?? this.save.checkpoint,
      data: { ...this.save.data, ...dataPatch },
    });
    return this.save;
  }

  async push() {
    this.status = "pushing";
    const body = {
      schema_version: this.save.schema_version ?? SCHEMA_VERSION,
      version: this.save.version ?? 1,
      level_id: this.save.level_id ?? "level_01",
      checkpoint: this.save.checkpoint,
      client_updated_at: this.save.client_updated_at,
      data: this.save.data ?? {},
    };
    const res = await fetch(`${this.apiBase}/api/v1/saves/current`, {
      method: "PUT",
      headers: this._headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      this.status = "error";
      throw new Error("push_failed");
    }
    const remote = await res.json();
    if (remote.conflict) {
      // Server wins on conflict
      this.save = writeLocalSave({
        schema_version: remote.schema_version,
        version: remote.version,
        level_id: remote.level_id,
        checkpoint: remote.checkpoint,
        client_updated_at: remote.client_updated_at,
        data: remote.data,
      });
      this.status = "conflict_server_wins";
      return { conflict: true, save: this.save };
    }
    this.save = writeLocalSave({
      schema_version: remote.schema_version,
      version: remote.version,
      level_id: remote.level_id,
      checkpoint: remote.checkpoint,
      client_updated_at: remote.client_updated_at,
      data: remote.data,
    });
    this.status = "synced";
    return { conflict: false, save: this.save };
  }

  async pullAndMerge() {
    this.status = "pulling";
    const res = await fetch(`${this.apiBase}/api/v1/saves/current`, {
      headers: this._headers(),
    });
    if (!res.ok) {
      this.status = "local_only";
      return this.save;
    }
    const remote = await res.json();
    const local = loadLocalSave();

    // Prefer newer version; tie-break with client_updated_at
    if ((remote.version ?? 0) > (local.version ?? 0)) {
      this.save = writeLocalSave({
        schema_version: remote.schema_version,
        version: remote.version,
        level_id: remote.level_id,
        checkpoint: remote.checkpoint,
        client_updated_at: remote.client_updated_at,
        data: remote.data,
      });
    } else if ((remote.version ?? 0) < (local.version ?? 0)) {
      this.save = local;
      await this.push();
    } else {
      this.save = local;
    }
    this.status = "synced";
    return this.save;
  }
}
