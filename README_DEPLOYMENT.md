# 🚀 快速部署指南

## 📦 檔案說明

本專案提供以下部署相關檔案：

| 檔案名稱 | 用途 | 使用時機 |
|---------|------|---------|
| `setup-gcp-vm.sh` | 自動化部署腳本 | 在 GCP VM 上一鍵完成所有部署 |
| `create-env.sh` | 建立 .env 檔案 | 快速生成環境變數配置 |
| `DEPLOY_GCP.md` | 完整部署文檔 | 詳細的部署步驟和說明 |
| `QUICK_ENV_SETUP.txt` | 快速設定指令 | 可直接複製貼上的命令 |

## ⚡ 最快速的部署方式

在您的 GCP VM 上執行以下 3 個步驟：

### 1️⃣ 上傳專案到 VM

```bash
# 方法 A: 使用 gcloud scp（在本機執行）
gcloud compute scp --recurse /path/to/npp-traffic165-2025 YOUR_VM_NAME:~ --zone=YOUR_ZONE

# 方法 B: 使用 git clone（在 VM 執行）
git clone YOUR_REPO_URL
cd npp-traffic165-2025
```

### 2️⃣ 建立 .env 檔案

在 VM 的專案目錄內執行：

```bash
bash create-env.sh
```

或者直接貼上這個一行命令：

```bash
cat > .env << 'ENVEOF' && echo "MYSQL_ROOT_PASSWORD=$(openssl rand -base64 20 | tr -d '=+/')" >> .env && echo "MYSQL_DATABASE=traffic" >> .env && echo "MYSQL_USER=traffic_user" >> .env && echo "MYSQL_PASSWORD=$(openssl rand -base64 20 | tr -d '=+/')" >> .env && echo "REDIS_URL=redis://redis:6379/0" >> .env && echo "ETL_SECRET=$(openssl rand -base64 32 | tr -d '=+/')" >> .env && echo "APP_KEYS=$(openssl rand -base64 32 | tr -d '=+/')" >> .env && echo "API_TOKEN_SALT=$(openssl rand -base64 32 | tr -d '=+/')" >> .env && echo "ADMIN_JWT_SECRET=$(openssl rand -base64 32 | tr -d '=+/')" >> .env && echo "JWT_SECRET=$(openssl rand -base64 32 | tr -d '=+/')" >> .env && echo "NEXT_PUBLIC_API_BASE=http://localhost:8000" >> .env && echo "NEXT_PUBLIC_CMS_BASE=http://localhost:1337" >> .env && echo "REVALIDATE_SECRET=$(openssl rand -base64 32 | tr -d '=+/')" >> .env && echo "✅ .env 建立完成！" && cat .env
ENVEOF
```

### 3️⃣ 執行部署

```bash
sudo bash setup-gcp-vm.sh
```

**就這樣！** 系統會自動安裝 Docker、啟動服務、初始化資料庫。

---

## 🌐 部署完成後

### 取得您的 VM IP

```bash
curl ifconfig.me
```

### 訪問服務

- **前端網站**: `http://YOUR_VM_IP:3000`
- **API 文檔**: `http://YOUR_VM_IP:8000/docs`
- **CMS 後台**: `http://YOUR_VM_IP:1337/admin`

### 設定 CMS 管理員

第一次訪問 `http://YOUR_VM_IP:1337/admin` 時，需要建立管理員帳號。

---

## 🔧 重要配置

### 如需從外部訪問

編輯 `.env` 檔案：

```bash
nano .env
```

修改以下兩行，將 `localhost` 改為您的 VM IP：

```env
NEXT_PUBLIC_API_BASE=http://YOUR_VM_IP:8000
NEXT_PUBLIC_CMS_BASE=http://YOUR_VM_IP:1337
```

然後重啟前端服務：

```bash
docker compose restart frontend
```

### GCP 防火牆設定

確保在 GCP Console 開放以下 port：

1. 進入 **VPC 網路** → **防火牆**
2. 建立新規則：
   - 名稱: `allow-traffic-app`
   - 目標: 所有執行個體（或指定標記）
   - 來源 IP 範圍: `0.0.0.0/0`
   - 協定與連接埠: `tcp:3000,8000,1337`

---

## 📊 常用管理命令

```bash
# 查看所有服務狀態
docker compose ps

# 查看日誌
docker compose logs -f [service_name]

# 重啟特定服務
docker compose restart [service_name]

# 重新構建並啟動
docker compose up -d --build

# 停止所有服務
docker compose down
```

---

## 🆘 問題排除

### 服務無法啟動

```bash
# 查看詳細日誌
docker compose logs

# 重新啟動
docker compose down
docker compose up -d
```

### 無法從外部訪問

1. 檢查 GCP 防火牆規則是否正確
2. 確認 `.env` 中的 API URL 已改為 VM IP
3. 重啟前端服務: `docker compose restart frontend`

### 記憶體不足

```bash
# 清理 Docker 資源
docker system prune -a

# 檢查系統資源
free -h
df -h
```

---

## 📚 詳細文檔

如需更詳細的說明，請參閱：
- `DEPLOY_GCP.md` - 完整部署指南
- `QUICK_ENV_SETUP.txt` - 環境變數設定指令

---

## 🔒 安全性提醒

1. ✅ `.env` 檔案已自動加入 `.gitignore`，不會被提交到 Git
2. ✅ 所有密碼會自動生成為強隨機字串
3. ⚠️ 生產環境建議設定 HTTPS（使用 Nginx + Let's Encrypt）
4. ⚠️ 定期備份資料庫和重要檔案

---

**需要協助？** 請查看 `DEPLOY_GCP.md` 中的完整說明。

