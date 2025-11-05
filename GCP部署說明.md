# GCP 部署說明

## 🚀 快速部署

### 在 GCP Terminal 執行

```bash
cd /Users/rogershen/Documents/GitHub/npp-traffic165-2025
./deploy-updates.sh
```

就這麼簡單！腳本會自動處理所有事情。

---

## 📋 部署腳本功能

### ✅ 會做的事

1. **檢查環境**
   - Docker 是否安裝並運行
   - 是否在正確的目錄

2. **備份當前狀態**
   - 自動備份配置檔案
   - 記錄容器狀態

3. **停止應用服務**
   - 停止 Frontend、Backend、CMS
   - **保持資料庫運行**（不會丟失資料）

4. **重新構建服務**
   - Frontend（包含緩存優化和 KPI 圖表）
   - Backend（包含緩存優化）
   - CMS（包含新模型）

5. **啟動所有服務**
   - 按正確順序啟動
   - 等待服務就緒

6. **驗證部署**
   - 檢查所有服務是否正常
   - 顯示服務網址

### ❌ 不會做的事

- ❌ 不會刪除資料庫
- ❌ 不會清空資料
- ❌ 不會修改現有的 CMS 內容
- ❌ 不會改變資料庫密碼或配置

---

## ⏱️ 部署時間

- **總時長**：約 2-5 分鐘
- **服務中斷**：約 1-2 分鐘

部署過程中，網站會短暫無法訪問，但資料完全安全。

---

## 📝 部署前準備（如果使用 Git）

### 選項 A：已經在本地機器上傳代碼

如果您已經將變更 push 到 Git：

```bash
# 在 GCP Terminal
cd /Users/rogershen/Documents/GitHub/npp-traffic165-2025
git pull
./deploy-updates.sh
```

### 選項 B：直接在 GCP 上修改

如果變更已經在 GCP 伺服器上：

```bash
# 在 GCP Terminal
cd /Users/rogershen/Documents/GitHub/npp-traffic165-2025
./deploy-updates.sh
```

---

## 🔍 詳細步驟說明

### 步驟 1：連線到 GCP

```bash
# 使用 SSH 連線到您的 GCP VM
# 或直接在 GCP Console 開啟 Terminal
```

### 步驟 2：進入專案目錄

```bash
cd /Users/rogershen/Documents/GitHub/npp-traffic165-2025
```

### 步驟 3：確認檔案已更新

```bash
# 檢查重要檔案是否存在
ls -l deploy-updates.sh
ls -l frontend/app/components/KpiCharts.tsx

# 查看緩存時間是否已修改
grep "revalidate: 60" frontend/app/page.tsx
```

### 步驟 4：執行部署腳本

```bash
./deploy-updates.sh
```

### 步驟 5：等待完成

腳本會顯示每個步驟的進度：
- [1/8] 檢查環境 ✓
- [2/8] 備份當前配置 ✓
- [3/8] 檢查代碼更新 ✓
- [4/8] 停止應用服務 ✓
- [5/8] 重新構建服務 ✓
- [6/8] 啟動所有服務 ✓
- [7/8] 等待服務就緒 ✓
- [8/8] 驗證部署 ✓

---

## 🔧 故障排除

### 問題 1：權限不足

**錯誤訊息：**
```
Permission denied
```

**解決方法：**
```bash
chmod +x deploy-updates.sh
./deploy-updates.sh
```

### 問題 2：Docker 未運行

**錯誤訊息：**
```
❌ Docker 未運行
```

**解決方法：**
```bash
sudo systemctl start docker
# 或
sudo service docker start
```

### 問題 3：容器無法啟動

**檢查日誌：**
```bash
# 查看特定服務的日誌
docker-compose logs frontend
docker-compose logs backend
docker-compose logs cms

# 查看所有日誌
docker-compose logs
```

### 問題 4：服務無法連線

**檢查容器狀態：**
```bash
docker-compose ps
```

**重啟特定服務：**
```bash
docker-compose restart frontend
docker-compose restart backend
docker-compose restart cms
```

### 問題 5：資料庫連線錯誤

**檢查資料庫：**
```bash
docker-compose ps db
docker-compose logs db
```

**重啟資料庫（謹慎）：**
```bash
docker-compose restart db
```

---

## 📊 驗證部署成功

### 方法 1：使用腳本提供的網址

部署完成後，腳本會顯示：

```
🌐 服務網址：
  Frontend: http://localhost:3000
  Backend API: http://localhost:8000/docs
  CMS Admin: http://localhost:1337/admin
```

在瀏覽器中開啟這些網址進行測試。

### 方法 2：手動檢查

```bash
# 檢查 Frontend
curl http://localhost:3000

# 檢查 Backend API
curl http://localhost:8000/docs

# 檢查 CMS
curl http://localhost:1337/_health

# 檢查容器狀態
docker-compose ps
```

### 方法 3：檢查緩存時間是否生效

```bash
# 查看 Frontend 日誌，確認啟動時間
docker-compose logs frontend | grep "Ready"

# 在 CMS 中修改標題，等待 60 秒後檢查前台
```

---

## 🎯 部署後的下一步

### 1. 在 CMS 中建立 KPI 配置

```
訪問：http://YOUR_GCP_IP:1337/admin
進入：Content Manager > KPI Configuration
建立配置，選擇 display_type（card/pie/bar/line）
```

### 2. 驗證前台顯示

```
訪問：http://YOUR_GCP_IP:3000
檢查：
  - 標題是否顯示
  - KPI 是否以正確的圖表形式顯示
```

### 3. 測試自動更新

```
在 CMS 中修改標題
等待 60 秒
重新整理前台
確認標題已更新（無需重啟）
```

### 4. （可選）設定 Webhook 即時更新

```bash
./setup-auto-revalidate.sh
```

這樣可以做到 3-5 秒即時更新。

---

## 📁 備份位置

每次部署都會自動備份：

```
backups/YYYYMMDD_HHMMSS/
  ├── docker-compose.yml
  ├── containers_before.txt
  └── containers_after.txt
```

如果需要回滾，可以參考這些備份。

---

## 🔄 回滾到之前的版本

### 如果部署失敗需要回滾

```bash
# 1. 查看備份
ls -la backups/

# 2. 找到最近的備份目錄
cd backups/YYYYMMDD_HHMMSS/

# 3. 比較前後差異
diff containers_before.txt containers_after.txt

# 4. 如果需要，恢復配置檔案
cp docker-compose.yml ../../

# 5. 重新部署
cd ../..
docker-compose up -d --build
```

---

## 📞 獲取幫助

### 查看完整文件

```bash
ls -l *.md
```

相關文件：
- `快速開始-無需重啟更新.md` - 自動更新說明
- `KPI圖表功能使用指南.md` - KPI 圖表詳細說明
- `完整解決方案總結.md` - 所有問題的解決方案
- `自動更新設定指南.md` - Webhook 設定指南

### 查看日誌

```bash
# 實時查看所有日誌
docker-compose logs -f

# 查看特定服務
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f cms

# 查看最近 100 行
docker-compose logs --tail=100 frontend
```

### 檢查資源使用

```bash
# 檢查 Docker 資源使用
docker stats

# 檢查磁碟空間
df -h

# 清理未使用的 Docker 資源
docker system prune -a
```

---

## ⚡ 常用命令

### 啟動服務

```bash
docker-compose up -d
```

### 停止服務

```bash
docker-compose stop
```

### 重啟服務

```bash
docker-compose restart
```

### 查看狀態

```bash
docker-compose ps
```

### 查看日誌

```bash
docker-compose logs -f [service_name]
```

### 進入容器

```bash
docker-compose exec frontend sh
docker-compose exec backend bash
```

---

## 🎉 總結

### 部署流程

1. ✅ 連線到 GCP
2. ✅ 進入專案目錄
3. ✅ 執行 `./deploy-updates.sh`
4. ✅ 等待 2-5 分鐘
5. ✅ 驗證服務正常
6. ✅ 完成！

### 關鍵特性

- ✅ **保留資料**：所有資料庫內容完整保留
- ✅ **自動備份**：每次部署自動備份配置
- ✅ **智能等待**：自動等待服務就緒
- ✅ **完整驗證**：自動檢查所有服務健康狀態
- ✅ **詳細日誌**：清楚顯示每個步驟的進度

### 更新內容

- ✅ 緩存時間從 5 分鐘縮短為 60 秒
- ✅ 新增 KPI 圖表功能（4 種顯示模式）
- ✅ CMS 模型自動更新
- ✅ 支援自動更新機制

---

**準備好了嗎？執行這個命令開始部署：**

```bash
./deploy-updates.sh
```

**就這麼簡單！** 🚀

