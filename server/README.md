# Server（FastAPI）

诡异弃子后端。虚拟环境目录固定为 **`venv/`**（已 gitignore）。

## 启动

```powershell
cd server
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- 探活：http://127.0.0.1:8000/health  
- Swagger：http://127.0.0.1:8000/docs  

## 测试 / 规范

```powershell
pytest -q
ruff check app tests
```
