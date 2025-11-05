# 🚀 立即部署 - 快速指南

## ⚡ 最快速的方法

### 在 GCP Terminal 執行這一行命令：

```bash
cd /Users/rogershen/Documents/GitHub/npp-traffic165-2025 && ./deploy-updates.sh
```

**就這樣！** 腳本會自動處理所有事情。

---

## 📦 這次更新包含什麼？

### ✅ 已完成的改進

1. **自動更新機制** - 無需重啟
   - 緩存時間從 5 分鐘縮短為 60 秒
   - 修改 CMS 內容後最多 60 秒自動更新

2. **KPI 圖表功能** - 純 CSS/SVG 實作
   - 📋 卡片（Card）- 傳統簡潔樣式
   - 🥧 圓餅圖（Pie）- 視覺化比例
   - 📊 長條圖（Bar）- 清楚比較
   - 📈 折線圖（Line）- 顯示趨勢

3. **CMS 模型擴充**
   - KPI Config 新增 `display_type` 欄位
   - 可在後台選擇圖表類型

### ✅ 保證不會遺失的內容

- ✅ 所有資料庫資料
- ✅ CMS 中的所有內容
- ✅ 用戶帳號和權限
- ✅ 圖片和上傳檔案

---

## 📋 三個部署腳本說明

### 1. `deploy-updates.sh` ⭐ 推薦
**用途：** 完整部署所有更新，保留資料庫

```bash
./deploy-updates.sh
```

**特點：**
- ✅ 完整的環境檢查
- ✅ 自動備份配置
- ✅ 智能服務管理
- ✅ 保留所有資料
- ✅ 驗證部署結果

**適合：** 正式環境部署

---

### 2. `setup-auto-revalidate.sh`
**用途：** 設定 Webhook 自動觸發機制（選用）

```bash
./setup-auto-revalidate.sh
```

**特點：**
- 自動生成安全密鑰
- 提供 Webhook 設定資訊
- 實現 3-5 秒即時更新

**適合：** 需要即時更新的場景

---

### 3. `deploy-kpi-charts.sh`
**用途：** 快速部署並測試 KPI 圖表功能

```bash
./deploy-kpi-charts.sh
```

**特點：**
- 重啟服務
- 檢查 API 狀態
- 驗證功能

**適合：** 功能測試和驗證

---

## 🎯 部署流程

### 標準流程（推薦）

```bash
# 步驟 1：完整部署
./deploy-updates.sh

# 步驟 2：等待完成（2-5 分鐘）

# 步驟 3：驗證服務
# 訪問：http://YOUR_IP:3000

# 步驟 4：在 CMS 中建立 KPI 配置
# 訪問：http://YOUR_IP:1337/admin

# 步驟 5：測試自動更新
# 修改內容 → 等待 60 秒 → 檢查前台

# （可選）步驟 6：設定即時更新
./setup-auto-revalidate.sh
```

### 快速流程（如果趕時間）

```bash
# 一鍵部署
./deploy-updates.sh

# 等待完成後直接使用
```

---

## ⏱️ 時間預估

| 步驟 | 時間 |
|------|------|
| 執行部署腳本 | 2-5 分鐘 |
| 服務中斷時間 | 1-2 分鐘 |
| 在 CMS 建立配置 | 5-10 分鐘 |
| 設定 Webhook（可選） | 10-15 分鐘 |
| **總計** | **7-30 分鐘** |

---

## 🔍 驗證部署成功

### 快速檢查

```bash
# 檢查容器狀態
docker-compose ps

# 檢查服務健康
curl http://localhost:3000
curl http://localhost:8000/docs
curl http://localhost:1337/_health
```

### 完整驗證

1. ✅ Frontend 可訪問
2. ✅ Backend API 可訪問
3. ✅ CMS Admin 可訪問
4. ✅ KPI 配置可建立
5. ✅ 圖表正常顯示
6. ✅ 自動更新功能正常

---

## 📚 相關文件

### 必讀文件

1. **`GCP部署說明.md`** ⭐
   - 完整的部署指南
   - 故障排除
   - 回滾方法

2. **`快速開始-無需重啟更新.md`** ⭐
   - 自動更新機制說明
   - Webhook 設定指南

3. **`部署檢查清單.txt`**
   - 部署前後檢查項目
   - 快速參考

### 功能說明

4. **`KPI圖表功能使用指南.md`**
   - 4 種圖表類型詳細說明
   - CMS 配置方法
   - 範例和建議

5. **`完整解決方案總結.md`**
   - 所有問題的技術解決方案
   - 架構說明
   - 進階配置

---

## 🆘 遇到問題？

### 常見問題

**Q: 權限不足怎麼辦？**
```bash
chmod +x deploy-updates.sh
```

**Q: 服務啟動失敗？**
```bash
docker-compose logs -f [service_name]
```

**Q: 需要回滾？**
```bash
# 查看備份
ls -la backups/

# 檢查最近的備份
cat backups/YYYYMMDD_HHMMSS/containers_before.txt
```

**Q: 資料會遺失嗎？**
不會！腳本設計為只更新代碼，完整保留所有資料庫內容。

---

## 💡 小技巧

### 部署前

- ✅ 確認已連線到正確的 GCP VM
- ✅ 檢查磁碟空間是否足夠（df -h）
- ✅ 確認 Docker 正在運行

### 部署中

- ✅ 不要中斷腳本執行
- ✅ 觀察輸出訊息
- ✅ 記下任何錯誤訊息

### 部署後

- ✅ 檢查所有服務狀態
- ✅ 測試基本功能
- ✅ 在 CMS 中建立 KPI 配置
- ✅ 測試自動更新機制

---

## 🎉 部署後的效果

### 使用體驗提升

**之前：**
```
修改 CMS → 手動重啟 Frontend → 等待 30 秒 → 重新整理
```

**現在：**
```
修改 CMS → 等待 60 秒 → 重新整理 ✓
```

**設定 Webhook 後：**
```
修改 CMS → 等待 3-5 秒 → 重新整理 ✓
```

### 新功能

- 🎨 KPI 可以用不同圖表顯示
- ⚡ 內容自動更新，無需重啟
- 🔧 完全在後台控制，無需改代碼
- 📊 響應式設計，支援各種裝置

---

## 📞 獲取幫助

### 查看日誌

```bash
# 查看所有服務
docker-compose logs -f

# 查看特定服務
docker-compose logs -f frontend
```

### 檢查狀態

```bash
docker-compose ps
docker stats
```

### 參考文件

所有文件都在專案根目錄：
```bash
ls -l *.md *.txt *.sh
```

---

## ✨ 總結

### 最重要的命令

```bash
# 部署所有更新
./deploy-updates.sh

# （可選）設定即時更新
./setup-auto-revalidate.sh
```

### 記住這些要點

1. ✅ 資料完全安全，不會遺失
2. ✅ 部署時間 2-5 分鐘
3. ✅ 無需重啟即可更新內容
4. ✅ 新增 4 種 KPI 圖表類型
5. ✅ 自動備份，可以回滾

---

## 🚀 準備好了嗎？

### 立即開始部署：

```bash
cd /Users/rogershen/Documents/GitHub/npp-traffic165-2025
./deploy-updates.sh
```

### 或使用完整指令：

```bash
cd /Users/rogershen/Documents/GitHub/npp-traffic165-2025 && ./deploy-updates.sh
```

**就這麼簡單！** 🎉

---

**祝部署順利！如有任何問題，請參考 `GCP部署說明.md`**

