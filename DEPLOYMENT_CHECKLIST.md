# 📋 GCP VM 部署清單

## ✅ 部署前檢查清單

### 1. GCP VM 準備
- [ ] 已建立 GCP VM 實例（建議: Ubuntu 20.04+, 4 vCPU, 8GB RAM）
- [ ] 可以 SSH 連線到 VM
- [ ] VM 有足夠的磁碟空間（至少 50GB）

### 2. 網路設定
- [ ] 已在 GCP 防火牆開放 Port 3000 (Frontend)
- [ ] 已在 GCP 防火牆開放 Port 8000 (Backend)
- [ ] 已在 GCP 防火牆開放 Port 1337 (CMS)

### 3. 專案檔案
- [ ] 已將專案上傳到 VM 或使用 git clone

## 📦 新增的部署檔案清單

以下是為您建立的所有部署相關檔案：

| 檔案名稱 | 說明 | 使用方式 |
|---------|------|---------|
| ✅ `setup-gcp-vm.sh` | 一鍵自動部署腳本 | `sudo bash setup-gcp-vm.sh` |
| ✅ `create-env.sh` | 環境變數建立腳本 | `bash create-env.sh` |
| ✅ `check-services.sh` | 服務健康檢查腳本 | `bash check-services.sh` |
| ✅ `.gitignore` | Git 忽略檔案設定 | 自動生效 |
| 📄 `DEPLOY_GCP.md` | 完整部署指南 | 詳細說明文檔 |
| 📄 `README_DEPLOYMENT.md` | 快速部署指南 | 精簡版說明 |
| 📄 `QUICK_ENV_SETUP.txt` | 環境設定指令集 | 複製貼上使用 |
| 📄 `README.md` | 專案主要說明 | 專案總覽 |
| 📄 `DEPLOYMENT_CHECKLIST.md` | 此清單檔案 | 檢查清單 |

## 🚀 標準部署流程

### 步驟 1: 連線到 VM
```bash
gcloud compute ssh YOUR_VM_NAME --zone=YOUR_ZONE
```

### 步驟 2: 上傳或下載專案
```bash
# 方法 A: 使用 git (如果有 repo)
git clone YOUR_REPO_URL
cd npp-traffic165-2025

# 方法 B: 使用 gcloud scp (在本機執行)
gcloud compute scp --recurse . YOUR_VM_NAME:~/npp-traffic165-2025 --zone=YOUR_ZONE
```

### 步驟 3: 建立環境變數
```bash
bash create-env.sh
```
**預期結果**: 產生包含隨機密碼的 `.env` 檔案

### 步驟 4: 執行自動部署
```bash
sudo bash setup-gcp-vm.sh
```
**預期時間**: 10-15 分鐘

### 步驟 5: 驗證部署
```bash
bash check-services.sh
```

### 步驟 6: 取得 VM IP
```bash
curl ifconfig.me
```

### 步驟 7: 訪問服務
- Frontend: `http://YOUR_VM_IP:3000`
- Backend: `http://YOUR_VM_IP:8000/docs`
- CMS: `http://YOUR_VM_IP:1337/admin`

## 📝 部署後設定

### 1. 設定 Strapi 管理員
- [ ] 訪問 `http://YOUR_VM_IP:1337/admin`
- [ ] 建立管理員帳號
- [ ] 完成初始設定

### 2. 修改環境變數（如需外部訪問）
```bash
nano .env
# 修改以下兩行
NEXT_PUBLIC_API_BASE=http://YOUR_VM_IP:8000
NEXT_PUBLIC_CMS_BASE=http://YOUR_VM_IP:1337

# 重啟前端
docker compose restart frontend
```

### 3. 驗證所有功能
- [ ] Frontend 可以正常訪問
- [ ] Backend API 文檔可以開啟
- [ ] CMS 後台可以登入
- [ ] 資料庫連線正常

## 🔍 快速指令參考

### 服務管理
```bash
# 查看服務狀態
docker compose ps

# 查看日誌
docker compose logs -f

# 重啟服務
docker compose restart [service_name]

# 停止所有服務
docker compose down

# 啟動所有服務
docker compose up -d
```

### 健康檢查
```bash
# 執行完整檢查
bash check-services.sh

# 檢查特定服務日誌
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f cms
```

### 資料庫操作
```bash
# 進入 MySQL
docker exec -it traffic-mysql mysql -uroot -p

# 備份資料庫
docker exec traffic-mysql mysqldump -uroot -p$(grep MYSQL_ROOT_PASSWORD .env | cut -d '=' -f2) traffic > backup.sql
```

## 🐛 常見問題快速解決

### 問題 1: 無法從外部訪問
**解決方案**:
1. 檢查 GCP 防火牆規則
2. 修改 `.env` 中的 URL
3. 重啟 frontend: `docker compose restart frontend`

### 問題 2: 服務無法啟動
**解決方案**:
```bash
docker compose down
docker compose up -d
docker compose logs
```

### 問題 3: 容器一直重啟
**解決方案**:
```bash
docker compose logs [service_name]
# 根據錯誤訊息修正問題
```

### 問題 4: 記憶體不足
**解決方案**:
```bash
docker system prune -a
free -h
```

## 📋 生產環境額外檢查清單

如果這是生產環境，請額外完成：

- [ ] 設定 HTTPS/SSL (使用 Nginx + Let's Encrypt)
- [ ] 設定自動備份機制
- [ ] 設定監控和告警
- [ ] 限制資料庫僅內部訪問
- [ ] 設定定期更新排程
- [ ] 準備災難復原計劃
- [ ] 文檔化所有密碼和密鑰（安全保存）
- [ ] 設定 Google Cloud Monitoring

## 🔒 安全性檢查清單

- [ ] `.env` 檔案已加入 `.gitignore`
- [ ] 所有預設密碼已更改為強密碼
- [ ] MySQL 和 Redis 僅內部訪問
- [ ] 已設定防火牆規則
- [ ] 定期備份資料庫
- [ ] SSH 設定金鑰認證（停用密碼登入）

## 📞 需要協助？

如果遇到問題，請依序檢查：

1. **查看詳細文檔**
   - [DEPLOY_GCP.md](DEPLOY_GCP.md) - 完整部署指南
   - [README_DEPLOYMENT.md](README_DEPLOYMENT.md) - 快速指南
   - [README.md](README.md) - 專案說明

2. **檢查日誌**
   ```bash
   docker compose logs
   bash check-services.sh
   ```

3. **查看系統資源**
   ```bash
   free -h
   df -h
   docker stats
   ```

---

## ✅ 部署完成確認

當以下所有項目都打勾時，表示部署成功：

- [ ] 所有 Docker 容器都在運行
- [ ] `bash check-services.sh` 顯示所有服務正常
- [ ] 可以從瀏覽器訪問 Frontend
- [ ] 可以從瀏覽器訪問 Backend API 文檔
- [ ] 可以從瀏覽器訪問 CMS 管理後台
- [ ] 已建立 CMS 管理員帳號
- [ ] 資料庫已初始化

**恭喜！您的交通事故數據系統已成功部署！** 🎉

---

**重要**: 請妥善保管 `.env` 檔案和所有密碼，切勿上傳到公開的程式碼倉庫！

