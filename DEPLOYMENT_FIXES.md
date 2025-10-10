# 🔧 部署修復說明

本文檔說明為了解決部署問題所做的修改，以及如何使用新的工具腳本。

## 📋 修復的問題

### 1. MySQL 認證協議不兼容問題

**問題**：
- MySQL 8.0 預設使用 `caching_sha2_password` 認證
- Strapi 3.6.8 使用的舊版 MySQL 客戶端不支援此認證方式
- 導致 CMS 容器無法連接資料庫，持續重啟

**修復方式**：
- 修改 `docker-compose.yml` 第 17 行
- 將 MySQL 改為使用 `mysql_native_password` 認證
- 更新 `setup-gcp-vm.sh`，增加自動檢查和修正用戶認證方式的邏輯

```yaml
# 修改前
command: ["--authentication-policy=caching_sha2_password"]

# 修改後
command: ["--default-authentication-plugin=mysql_native_password"]
```

### 2. Strapi Admin Panel 未 Build 問題

**問題**：
- CMS 啟動後訪問 `/admin` 顯示 404 Not Found
- 錯誤日誌顯示 `ENOENT: no such file or directory, open '/srv/app/build/index.html'`
- Admin panel 需要先 build 才能使用

**修復方式**：
- 優化 `cms/Dockerfile`，確保 build 過程正確執行
- 增加 Node.js 記憶體限制避免 OOM
- 更新 `setup-gcp-vm.sh`，增加自動檢查和 build admin panel 的邏輯

```dockerfile
# 修改後的 Dockerfile 重點
RUN npm install  # 包含 dev dependencies 用於 build
ENV NODE_ENV=production
RUN NODE_OPTIONS="--max-old-space-size=2048" npm run build
RUN npm prune --production  # build 後移除 dev dependencies
```

### 3. 部署腳本增強

**增加的功能**：
- ✅ 自動檢測並修正 MySQL 用戶認證方式
- ✅ 自動檢查 CMS admin panel 是否已 build
- ✅ 如果未 build，自動執行 build（需要 2-5 分鐘）
- ✅ 顯示外部 IP 和完整的訪問連結
- ✅ 提供一鍵配置外部訪問的命令

## 🚀 使用方式

### 首次部署（全新安裝）

1. **建立環境變數**：
```bash
bash create-env.sh
```

2. **執行部署腳本**：
```bash
sudo bash setup-gcp-vm.sh
```

腳本會自動：
- 安裝 Docker 和 Docker Compose
- 構建並啟動所有服務
- 修正 MySQL 認證問題
- 檢查並 build CMS admin panel
- 顯示訪問連結和配置指引

### 配置外部訪問

部署完成後，執行以下命令配置外部訪問：

```bash
bash configure-external-access.sh
```

此腳本會：
- 自動取得 VM 外部 IP
- 更新 `.env` 中的 API 和 CMS 網址
- 重啟 frontend 服務
- 備份原始 `.env` 檔案

### 增加 Swap 空間（記憶體不足時）

如果 VM 記憶體不足（< 4GB），執行：

```bash
sudo bash add-swap.sh
```

此腳本會：
- 檢查當前記憶體狀況
- 互動式選擇 Swap 大小
- 建立並啟用 Swap
- 設定開機自動掛載
- 優化 Swap 使用策略

## 📝 新增的工具腳本

### 1. `configure-external-access.sh`
**用途**：自動配置外部訪問  
**使用時機**：部署完成後，需要從外部訪問時

**功能**：
- 自動取得外部 IP
- 更新 `.env` 中的 `NEXT_PUBLIC_API_BASE` 和 `NEXT_PUBLIC_CMS_BASE`
- 備份原始設定
- 重啟 frontend 服務

### 2. `add-swap.sh`
**用途**：增加系統 Swap 空間  
**使用時機**：VM 記憶體不足，CMS 或其他服務因 OOM 而重啟時

**功能**：
- 建立 Swap 檔案（2GB/4GB/8GB 可選）
- 設定開機自動掛載
- 優化 swappiness 參數

## 🔍 驗證修復是否成功

### 1. 檢查所有服務狀態

```bash
bash check-services.sh
```

或

```bash
sudo docker compose ps
```

所有容器應該顯示 `Up` 狀態。

### 2. 檢查 CMS 日誌

```bash
sudo docker compose logs cms --tail=50
```

應該看到類似訊息：
```
[2025-xx-xx] info Project information
[2025-xx-xx] info Server started
```

不應該出現：
- `ER_NOT_SUPPORTED_AUTH_MODE`（認證錯誤）
- `ENOENT: no such file or directory, open '/srv/app/build/index.html'`（admin 未 build）

### 3. 訪問 CMS 後台

在瀏覽器訪問：
```
http://YOUR_EXTERNAL_IP:1337/admin
```

應該看到 Strapi 管理員註冊頁面（首次訪問）或登入頁面。

## 🆘 問題排除

### 問題 1：CMS 仍然無法啟動

**檢查記憶體**：
```bash
free -h
```

如果可用記憶體 < 1GB，執行：
```bash
sudo bash add-swap.sh
```

然後重啟 CMS：
```bash
sudo docker compose restart cms
```

### 問題 2：無法從外部訪問

**檢查 GCP 防火牆**：
1. 前往 GCP Console → VPC 網路 → 防火牆
2. 確認有規則允許 tcp:3000,8000,1337

**或使用命令建立**：
```bash
gcloud compute firewall-rules create allow-traffic-app \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp:3000,tcp:8000,tcp:1337 \
  --source-ranges=0.0.0.0/0
```

**檢查 .env 設定**：
```bash
grep "NEXT_PUBLIC" .env
```

應該顯示外部 IP，而不是 localhost。

### 問題 3：Admin Panel 仍然 404

**手動 build**：
```bash
sudo docker exec traffic-cms npm run build
```

**檢查 build 結果**：
```bash
sudo docker exec traffic-cms ls -la /srv/app/build/
```

應該看到 `index.html` 等文件。

## 📊 系統需求

### 最低需求
- **CPU**: 2 vCPU
- **RAM**: 4GB + 2GB Swap
- **磁碟**: 30GB

### 建議配置
- **CPU**: 4 vCPU
- **RAM**: 8GB
- **磁碟**: 50GB

### GCP VM 機型建議
- **最低**: e2-medium (2 vCPU, 4GB) + Swap
- **建議**: e2-standard-2 (2 vCPU, 8GB)
- **最佳**: e2-standard-4 (4 vCPU, 16GB)

## 🔄 更新現有部署

如果您已經部署過舊版本，要更新到修復版本：

```bash
# 1. 備份現有資料
sudo docker exec traffic-mysql mysqldump -uroot -p${MYSQL_ROOT_PASSWORD} --all-databases > backup.sql

# 2. 停止所有服務
sudo docker compose down

# 3. 拉取最新代碼
git pull

# 4. 重新構建並啟動
sudo docker compose up -d --build

# 5. 等待服務啟動
sleep 30

# 6. 執行配置腳本
bash configure-external-access.sh

# 7. 檢查狀態
bash check-services.sh
```

## 📚 相關文檔

- `DEPLOY_GCP.md` - 完整部署指南
- `README_DEPLOYMENT.md` - 快速部署指南
- `check-services.sh` - 服務健康檢查腳本
- `diagnose.sh` - 診斷腳本

## ✅ 修改清單

| 文件 | 修改內容 | 目的 |
|------|---------|------|
| `docker-compose.yml` | MySQL 認證方式改為 mysql_native_password | 修復 CMS 無法連接資料庫 |
| `cms/Dockerfile` | 優化 build 流程，增加記憶體限制 | 確保 admin panel 正確 build |
| `setup-gcp-vm.sh` | 增加認證檢查和 admin build 邏輯 | 自動化修復常見問題 |
| `configure-external-access.sh` | 新增 | 簡化外部訪問配置 |
| `add-swap.sh` | 新增 | 解決記憶體不足問題 |
| `DEPLOYMENT_FIXES.md` | 新增 | 說明修改內容和使用方式 |

---

**最後更新**: 2025-10-10  
**適用版本**: v1.1+

