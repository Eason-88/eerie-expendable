# Client（Cocos Creator 3）

本目录目标工程：**诡异弃子 / Eerie Expendable** 微信小游戏客户端。

## 当前状态

| 阶段 | 内容 | 路径 |
|------|------|------|
| 0 | 跟拍 / 平台适配 / Boot | `assets/scripts/` |
| 1 | 战斗测试关 | `web-preview/arena.html` |
| 2 | 第一关三幕战役 | `web-preview/index.html` |
| 3 | 云存档 / 登录 / 远程配置 | `SaveService` + FastAPI |
| 2–3 | 叙事 / 异象 / 存档脚手架 | `narrative/` `horror/` `save/` `net/` |

## 快速玩

```powershell
cd client\web-preview
python -m http.server 5173
```

- 第一关：http://127.0.0.1:5173  
- 战斗场：http://127.0.0.1:5173/arena.html  

详见 `docs/阶段2-验收说明.md`。
