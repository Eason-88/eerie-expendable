# 诡异弃子 / Eerie Expendable

叙事向恐怖射击微信小游戏。你是呼号「黑鹰7号」的反恐精英——对讲机只能接收，森林里尽是异象，最终被总部标为弃子、遭友军清剿。

| | |
|---|---|
| 中文名 | 诡异弃子 |
| 英文名 | Eerie Expendable |
| 仓库 | [Eason-88/eerie-expendable](https://github.com/Eason-88/eerie-expendable) |
| 客户端 | Cocos Creator 3（Web 预览 → 微信小游戏） |
| 后端 | FastAPI（`server/venv`） |
| 视角 | 伪 3D 第三人称跟拍 |

## 快速启动（阶段 0）

**后端**

```powershell
cd server
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

探活：http://127.0.0.1:8000/health

**伪 3D 镜头预览（临时）**

```powershell
cd client\web-preview
python -m http.server 5173
```

打开：http://127.0.0.1:5173 （WASD 移动）

正式 Cocos 工程步骤见 [`client/README.md`](client/README.md)。

## 文档

- [开发计划](docs/开发计划.md)
- [阶段 0 验收说明](docs/阶段0-验收说明.md)

## 视觉参考

- 主参考（伪 3D）：`assets/view-pseudo-3d.png`
- 对比：`assets/view-topdown.png`、`assets/view-isometric-45.png`
