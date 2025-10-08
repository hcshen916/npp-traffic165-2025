# GCP VM 部署指南

本指南將協助您在 GCP VM 上快速部署交通事故數據系統。

## 📋 前置需求

1. 一台 GCP VM (建議規格)
   - OS: Ubuntu 20.04 LTS 或更新版本
   - CPU: 4 vCPU 以上
   - RAM: 8GB 以上
   - 磁碟: 50GB 以上
   - 網路: 允許 HTTP/HTTPS 流量

2. 已開放以下防火牆規則（GCP Console → VPC 網路 → 防火牆）
   - TCP Port 3000 (Frontend)
   - TCP Port 8000 (Backend API)
   - TCP Port 1337 (CMS Admin)

## 🚀 快速部署步驟

### 步驟 1: 連線到您的 GCP VM

```bash
gcloud compute ssh YOUR_VM_NAME --zone=YOUR_ZONE
```

或使用 SSH 連線工具。

### 步驟 2: 下載或上傳專案檔案

**方法 A: 從 Git 倉庫 clone（如果有）**
```bash
git clone YOUR_REPO_URL
cd npp-traffic165-2025
```

**方法 B: 使用 gcloud scp 上傳**
```bash
# 在本機執行
gcloud compute scp --recurse /path/to/npp-traffic165-2025 YOUR_VM_NAME:~ --zone=YOUR_ZONE
```

### 步驟 3: 建立 .env 環境變數檔案

在 VM 的專案目錄中，執行以下**其中一種方法**：

#### 方法 A: 使用腳本（推薦）

```bash
chmod +x create-env.sh
bash create-env.sh
```

#### 方法 B: 直接在 Terminal 貼上執行（單行命令）

複製以下**完整命令**到 Terminal 並執行：

```bash
cat > .env << 'EOF'
MYSQL_ROOT_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/")
MYSQL_DATABASE=traffic
MYSQL_USER=traffic_user
MYSQL_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/")
REDIS_URL=redis://redis:6379/0
ETL_SECRET=$(openssl rand -base64 32 | tr -d "=+/")
APP_KEYS=$(openssl rand -base64 32 | tr -d "=+/")
API_TOKEN_SALT=$(openssl rand -base64 32 | tr -d "=+/")
ADMIN_JWT_SECRET=$(openssl rand -base64 32 | tr -d "=+/")
JWT_SECRET=$(openssl rand -base64 32 | tr -d "=+/")
NEXT_PUBLIC_API_BASE=http://localhost:8000
NEXT_PUBLIC_CMS_BASE=http://localhost:1337
REVALIDATE_SECRET=$(openssl rand -base64 32 | tr -d "=+/")
EOF
sed -i "s/MYSQL_ROOT_PASSWORD=\$/MYSQL_ROOT_PASSWORD=$(openssl rand -base64 16 | tr -d '=+\/')/" .env
sed -i "s/MYSQL_PASSWORD=\$/MYSQL_PASSWORD=$(openssl rand -base64 16 | tr -d '=+\/')/" .env
sed -i "s/ETL_SECRET=\$/ETL_SECRET=$(openssl rand -base64 32 | tr -d '=+\/')/" .env
sed -i "s/APP_KEYS=\$/APP_KEYS=$(openssl rand -base64 32 | tr -d '=+\/')/" .env
sed -i "s/API_TOKEN_SALT=\$/API_TOKEN_SALT=$(openssl rand -base64 32 | tr -d '=+\/')/" .env
sed -i "s/ADMIN_JWT_SECRET=\$/ADMIN_JWT_SECRET=$(openssl rand -base64 32 | tr -d '=+\/')/" .env
sed -i "s/JWT_SECRET=\$/JWT_SECRET=$(openssl rand -base64 32 | tr -d '=+\/')/" .env
sed -i "s/REVALIDATE_SECRET=\$/REVALIDATE_SECRET=$(openssl rand -base64 32 | tr -d '=+\/')/" .env
echo "✅ .env 檔案建立完成！"
```

#### 方法 C: 手動建立（進階使用者）

```bash
nano .env
```

然後貼上以下內容，並自行替換所有密碼為強密碼：

```env
# MySQL 資料庫設定
MYSQL_ROOT_PASSWORD=your_strong_password_here
MYSQL_DATABASE=traffic
MYSQL_USER=traffic_user
MYSQL_PASSWORD=your_strong_password_here

# Redis 設定
REDIS_URL=redis://redis:6379/0

# Backend (FastAPI) 設定
ETL_SECRET=your_random_secret_here

# Strapi CMS 設定
APP_KEYS=your_random_key_here
API_TOKEN_SALT=your_random_salt_here
ADMIN_JWT_SECRET=your_random_jwt_secret_here
JWT_SECRET=your_random_jwt_secret_here

# Frontend (Next.js) 設定
NEXT_PUBLIC_API_BASE=http://localhost:8000
NEXT_PUBLIC_CMS_BASE=http://localhost:1337
REVALIDATE_SECRET=your_random_secret_here
```

### 步驟 4: 執行自動部署腳本

```bash
chmod +x setup-gcp-vm.sh
sudo bash setup-gcp-vm.sh
```

此腳本將自動：
- ✅ 更新系統套件
- ✅ 安裝 Docker 和 Docker Compose
- ✅ 建立必要的目錄
- ✅ 啟動所有服務（MySQL, Redis, Backend, CMS, Frontend, Worker）
- ✅ 初始化資料庫
- ✅ 配置防火牆規則

**預計時間**: 10-15 分鐘（取決於網路速度）

### 步驟 5: 等待服務啟動完成

部署完成後，等待 1-2 分鐘讓所有服務完全啟動。

## 🌐 訪問您的應用

取得您的 VM 外部 IP：

```bash
curl ifconfig.me
```

然後在瀏覽器中訪問：

- **前端網站**: `http://YOUR_VM_IP:3000`
- **API 文檔**: `http://YOUR_VM_IP:8000/docs`
- **CMS 管理後台**: `http://YOUR_VM_IP:1337/admin`

## ⚙️ 設定 Strapi CMS 管理員

首次訪問 CMS 時，系統會要求您建立管理員帳號：

1. 訪問 `http://YOUR_VM_IP:1337/admin`
2. 填寫管理員資訊（姓名、Email、密碼）
3. 完成註冊後即可登入管理後台

## 🔍 常用維護命令

```bash
# 查看所有服務狀態
docker compose ps

# 查看特定服務的日誌
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f cms

# 重啟特定服務
docker compose restart backend

# 停止所有服務
docker compose down

# 重新啟動所有服務
docker compose up -d

# 重新構建並啟動（當代碼有更新時）
docker compose up -d --build
```

## 🔒 安全性建議

1. **修改 .env 中的 localhost 為實際 IP**（如需外部訪問）
   ```bash
   nano .env
   # 修改以下兩行
   NEXT_PUBLIC_API_BASE=http://YOUR_VM_IP:8000
   NEXT_PUBLIC_CMS_BASE=http://YOUR_VM_IP:1337
   
   # 然後重啟服務
   docker compose restart frontend
   ```

2. **設定 SSL/HTTPS**（生產環境必須）
   - 使用 Nginx 反向代理
   - 配置 Let's Encrypt SSL 憑證

3. **限制資料庫訪問**
   - 確保 MySQL (3306) 和 Redis (6379) 只在內部網路訪問

4. **定期備份**
   ```bash
   # 備份資料庫
   docker exec traffic-mysql mysqldump -uroot -p${MYSQL_ROOT_PASSWORD} traffic > backup_$(date +%Y%m%d).sql
   
   # 備份 .env 檔案
   cp .env .env.backup
   ```

## 🐛 故障排除

### 問題 1: 無法連線到服務

```bash
# 檢查服務狀態
docker compose ps

# 檢查 Docker 日誌
docker compose logs

# 檢查防火牆
sudo ufw status
```

### 問題 2: 資料庫連線失敗

```bash
# 檢查 MySQL 是否正常運行
docker compose logs mysql

# 進入 MySQL 容器測試連線
docker exec -it traffic-mysql mysql -uroot -p
```

### 問題 3: 記憶體不足

```bash
# 檢查系統資源
free -h
df -h

# 清理 Docker 資源
docker system prune -a
```

## 📞 需要協助？

如遇到問題，請檢查：
1. Docker 日誌: `docker compose logs -f`
2. 系統資源: `htop` 或 `top`
3. 網路連線: `netstat -tulpn`

## 🔄 更新應用程式

當代碼有更新時：

```bash
# 1. 停止服務
docker compose down

# 2. 更新代碼（如使用 git）
git pull

# 3. 重新構建並啟動
docker compose up -d --build

# 4. 檢查服務狀態
docker compose ps
```

---

**部署完成後請妥善保管 .env 檔案，切勿上傳到公開的程式碼倉庫！**

