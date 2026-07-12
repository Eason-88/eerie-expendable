# Client（Cocos Creator 3）

本目录目标工程：**诡异弃子 / Eerie Expendable** 微信小游戏客户端。

## 当前状态（阶段 0）

| 内容 | 路径 | 说明 |
|------|------|------|
| Cocos 脚本脚手架 | `assets/scripts/` | 跟拍相机、移动、雾、平台适配、Boot |
| 浏览器临时预览 | `web-preview/index.html` | 本机未装 Cocos 时，用 Three.js 验收伪 3D 行走 |
| 正式 Cocos 工程 | 待用编辑器创建 | 见下方步骤 |

> `web-preview` 仅用于阶段 0 手感/镜头验收，**不是**最终客户端。正式玩法以 Cocos 为准。

## 本机安装 Cocos 后

1. 安装 [Cocos Creator 3.8+](https://www.cocos.com/creator-download)（建议 3.8.x）。
2. 用编辑器 **新建 3D 空项目**，工程路径选本仓库的 `client/`（或新建后把 `assets/scripts` 拷入其 `assets/scripts`）。
3. 新建场景 `assets/scenes/boot.scene`：
   - 地面 Plane + 若干树占位
   - Capsule / 空节点挂 `PlayerMotor`
   - Camera 挂 `ThirdPersonCamera`，`target` 指角色
   - 场景挂 `ForestFogSetup`、`BootStrap`
4. 点击 **预览 / Preview in Browser**。
5. 确认能 WASD 行走、相机跟拍、有雾；控制台可见 API health（需先启后端）。

## 平台适配

- Web：`platform/web.ts` → API `http://127.0.0.1:8000`
- 微信：`platform/wechat.ts`（阶段 3 接 `wx`）
- 启动时调用 `bootstrapPlatform()`（已在 `BootStrap`）
