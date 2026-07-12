# Client（Cocos Creator 3）

本目录目标工程：**诡异弃子 / Eerie Expendable** 微信小游戏客户端。

## 当前状态

| 阶段 | 内容 | 路径 |
|------|------|------|
| 0 | 跟拍相机 / 平台适配 / Boot | `assets/scripts/` |
| 1 | 战斗测试关（可通关） | `web-preview/` |
| 1 | Cocos 战斗脚本脚手架 | `assets/scripts/combat|level|ui|core` |

> `web-preview` 用于在未安装 Cocos 时验收手感；正式客户端仍以 Cocos 为准。

## 阶段 1 快速玩

```powershell
cd client\web-preview
python -m http.server 5173
```

打开 http://127.0.0.1:5173 — 详见 [`docs/阶段1-验收说明.md`](../docs/阶段1-验收说明.md)。

## Cocos 正式工程

1. 安装 Cocos Creator 3.8+。
2. 新建 3D 项目到本目录（或拷入 `assets/scripts`）。
3. 挂载：`PlayerMotor`、`WeaponController`、`CoverUser`、`EnemyAI`、`LevelStateMachine`、`CombatHud`、`ThirdPersonCamera`、`BootStrap`。
4. Preview in Browser。
