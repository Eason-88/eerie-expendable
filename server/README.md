# Server（FastAPI）

诡异弃子后端。虚拟环境目录固定为 **`venv/`**（已 gitignore）。

## 启动

```powershell
cd server
.\venv\Scripts\Activate.ps1
pip install -e ".[dev]"
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- 探活：http://127.0.0.1:8000/health  
- Swagger：http://127.0.0.1:8000/docs  
- 数据库：`data/eerie.db`（自动创建）

复制 `.env.example` 为 `.env` 可改 JWT / CDN / 微信密钥。

## 测试 / 规范

```powershell
pytest -q
ruff check app tests
```
