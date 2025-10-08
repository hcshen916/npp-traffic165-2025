# 交通事故數據系統 (Traffic Accident Data System)

一個整合的交通事故數據分析與展示平台，提供事故數據的視覺化、統計分析和內容管理功能。

## 📋 系統架構

本系統採用微服務架構，包含以下服務：

| 服務 | 技術棧 | Port | 說明 |
|------|--------|------|------|
| **Frontend** | Next.js 14 | 3000 | 前端展示網站 |
| **Backend** | FastAPI | 8000 | RESTful API 服務 |
| **CMS** | Strapi 3.6 | 1337 | 內容管理系統 |
| **Database** | MySQL 8.0 | 3307 | 主要資料庫 |
| **Cache** | Redis 7 | 6380 | 快取與任務佇列 |
| **Worker** | Python RQ | - | 背景任務處理 |

## 🚀 快速開始

### 選項 1: 在 GCP VM 上部署（推薦）

**最快速的 3 步驟部署：**

1. **上傳專案到 VM**
   ```bash
   # 使用 gcloud scp（在本機執行）
   gcloud compute scp --recurse . YOUR_VM_NAME:~/npp-traffic165-2025 --zone=YOUR_ZONE
   ```

2. **建立環境變數**
   ```bash
   # SSH 連線到 VM 後執行
   cd ~/npp-traffic165-2025
   bash create-env.sh
   ```

3. **執行自動部署**
   ```bash
   sudo bash setup-gcp-vm.sh
   ```

**就這麼簡單！** 🎉

詳細說明請參閱 [GCP 部署指南](DEPLOY_GCP.md)

### 選項 2: 本機開發環境

1. **安裝必要工具**
   - Docker Desktop
   - Docker Compose

2. **建立環境變數**
   ```bash
   bash create-env.sh
   ```

3. **啟動所有服務**
   ```bash
   docker compose up -d
   ```

4. **初始化資料庫**
   ```bash
   docker exec -i traffic-mysql mysql -uroot -p$(grep MYSQL_ROOT_PASSWORD .env | cut -d '=' -f2) < init_database.sql
   ```

5. **訪問服務**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/docs
   - CMS Admin: http://localhost:1337/admin

## 📦 專案結構

```
npp-traffic165-2025/
├── backend/              # FastAPI 後端服務
│   ├── app/
│   │   ├── main.py      # 主程式入口
│   │   ├── db.py        # 資料庫連線
│   │   ├── queries.py   # SQL 查詢
│   │   └── routers/     # API 路由
│   └── requirements.txt
│
├── frontend/            # Next.js 前端應用
│   ├── app/
│   └── package.json
│
├── cms/                 # Strapi CMS
│   ├── api/            # API 定義
│   └── config/         # 配置檔案
│
├── queue/              # RQ Worker 背景任務
│   ├── worker.py
│   └── etl_processor.py
│
├── db/                 # MySQL 資料目錄
│   └── data/
│
├── docker-compose.yml  # Docker Compose 配置
├── init_database.sql   # 資料庫初始化腳本
│
└── 部署相關檔案/
    ├── setup-gcp-vm.sh          # GCP VM 自動部署腳本
    ├── create-env.sh            # 環境變數建立腳本
    ├── check-services.sh        # 服務健康檢查腳本
    ├── DEPLOY_GCP.md           # 詳細部署指南
    ├── README_DEPLOYMENT.md    # 快速部署說明
    └── QUICK_ENV_SETUP.txt     # 快速環境設定指令
```

## 🗄️ 資料庫結構

系統包含以下主要資料表：

- `accident` - 事故明細表
- `kpi_baseline` - KPI 基準年資料
- `segment_stats` - 路段統計表
- `pedestrian_accidents` - 行人事故資料表

## 🔧 常用管理命令

### 服務管理

```bash
# 啟動所有服務
docker compose up -d

# 停止所有服務
docker compose down

# 重啟特定服務
docker compose restart backend

# 查看服務狀態
docker compose ps

# 查看服務日誌
docker compose logs -f [service_name]
```

### 健康檢查

```bash
# 執行完整的服務健康檢查
bash check-services.sh
```

### 資料庫操作

```bash
# 進入 MySQL 命令列
docker exec -it traffic-mysql mysql -uroot -p

# 備份資料庫
docker exec traffic-mysql mysqldump -uroot -p$(grep MYSQL_ROOT_PASSWORD .env | cut -d '=' -f2) traffic > backup_$(date +%Y%m%d).sql

# 還原資料庫
docker exec -i traffic-mysql mysql -uroot -p$(grep MYSQL_ROOT_PASSWORD .env | cut -d '=' -f2) traffic < backup.sql
```

## 📚 API 文檔

### Backend API
啟動服務後訪問: http://localhost:8000/docs

主要端點：
- `/api/accidents` - 事故資料查詢
- `/api/kpi` - KPI 數據
- `/api/segments` - 路段統計
- `/api/etl` - ETL 任務管理

### CMS API
啟動服務後訪問: http://localhost:1337/admin

內容類型：
- Posts (文章)
- Categories (分類)
- Tags (標籤)
- Authors (作者)
- Dataset Uploads (資料集上傳)

## 🔐 環境變數說明

主要環境變數（在 `.env` 檔案中設定）：

| 變數名稱 | 說明 | 範例 |
|---------|------|------|
| `MYSQL_ROOT_PASSWORD` | MySQL root 密碼 | 自動生成 |
| `MYSQL_DATABASE` | 資料庫名稱 | traffic |
| `MYSQL_USER` | 資料庫使用者 | traffic_user |
| `MYSQL_PASSWORD` | 資料庫使用者密碼 | 自動生成 |
| `ETL_SECRET` | ETL 服務密鑰 | 自動生成 |
| `APP_KEYS` | Strapi 應用密鑰 | 自動生成 |
| `NEXT_PUBLIC_API_BASE` | Backend API URL | http://localhost:8000 |
| `NEXT_PUBLIC_CMS_BASE` | CMS API URL | http://localhost:1337 |

**注意**: 生產環境請將 `localhost` 改為實際的 IP 或網域名稱。

## 🌐 GCP 部署注意事項

### 1. 防火牆設定

在 GCP Console → VPC 網路 → 防火牆規則中開放：
- TCP Port 3000 (Frontend)
- TCP Port 8000 (Backend)
- TCP Port 1337 (CMS)

### 2. 外部訪問設定

修改 `.env` 檔案：
```bash
NEXT_PUBLIC_API_BASE=http://YOUR_VM_EXTERNAL_IP:8000
NEXT_PUBLIC_CMS_BASE=http://YOUR_VM_EXTERNAL_IP:1337
```

然後重啟前端服務：
```bash
docker compose restart frontend
```

### 3. SSL/HTTPS 設定（生產環境建議）

使用 Nginx 作為反向代理並配置 Let's Encrypt SSL 憑證。

## 📊 監控與日誌

### 即時日誌

```bash
# 所有服務
docker compose logs -f

# 特定服務
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f cms
```

### 資源監控

```bash
# 查看容器資源使用狀況
docker stats

# 查看系統資源
free -h
df -h
```

## 🐛 故障排除

### 常見問題

1. **服務無法啟動**
   ```bash
   docker compose down
   docker compose up -d
   docker compose logs
   ```

2. **無法從外部訪問**
   - 檢查 GCP 防火牆規則
   - 確認 `.env` 中的 URL 設定
   - 重啟前端服務

3. **資料庫連線失敗**
   ```bash
   docker compose logs mysql
   docker compose restart mysql
   ```

4. **記憶體不足**
   ```bash
   docker system prune -a
   ```

詳細的故障排除指南請參閱 [DEPLOY_GCP.md](DEPLOY_GCP.md)

## 🔒 安全性

- ✅ 所有密碼自動生成為強隨機字串
- ✅ `.env` 檔案已加入 `.gitignore`
- ⚠️ 生產環境請務必設定 HTTPS
- ⚠️ 定期更新密碼和密鑰
- ⚠️ 限制資料庫端口僅內部訪問

## 📝 相關文檔

- [GCP 部署完整指南](DEPLOY_GCP.md) - 詳細的 GCP VM 部署步驟
- [快速部署說明](README_DEPLOYMENT.md) - 精簡版部署指南
- [環境變數設定](QUICK_ENV_SETUP.txt) - 快速設定指令
- [Strapi CMS 配置](cms/README.md) - CMS 內容類型設定
- [Strapi 設定指南](cms/SETUP_GUIDE.md) - CMS 詳細設定

## 🤝 貢獻

歡迎提出 Issue 或 Pull Request！

## 📄 授權

本專案採用 MIT 授權條款。

---

**需要協助？** 請參閱 [GCP 部署指南](DEPLOY_GCP.md) 或聯絡系統管理員。

