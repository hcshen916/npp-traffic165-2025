# CMS 更新問題診斷與解決方案

## 問題總結

經過詳細檢查，發現以下問題：

### 1. **前台標題沒有更新** ✅ 已找到原因

**問題現象：**
- CMS 中設定：`page_title: "台灣交通安全體檢"`
- 前台顯示：`"交通安全總覽"` (預設值)

**原因：**
- **Next.js 緩存問題**：前台使用 ISR (Incremental Static Regeneration)，設定為 300 秒（5分鐘）緩存
- 後台 API 也有 300 秒緩存
- 需要手動觸發 revalidate 或等待緩存過期

### 2. **KPI 配置為空** ✅ 已找到原因

**問題現象：**
- 前台顯示 "尚無資料"
- API 返回 `[]` 空陣列

**原因：**
- CMS 後台沒有建立任何 KPI Config 資料
- 需要在 Strapi CMS 中手動新增 KPI 配置

### 3. **使用的 CMS 內容類型**

- **首頁 (`/page.tsx`)** 使用：`Homepage Settings` (單一類型)
- **儀表板** (目前無對應頁面) 會使用：`Dashboard Settings` (單一類型)

---

## 解決方案

### 方案 1：手動清除前台緩存（立即生效）

#### 方法 A：重啟 Frontend 容器

```bash
docker-compose restart frontend
```

#### 方法 B：使用 Revalidate API（推薦）

```bash
# 需要先確認 REVALIDATE_SECRET 環境變數
curl -X POST 'http://34.81.244.21:3000/api/revalidate?secret=YOUR_SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"tag":"cms"}'
```

#### 方法 C：等待緩存自動過期（5分鐘）

### 方案 2：在 CMS 中建立 KPI 配置

#### 步驟：
1. 登入 Strapi CMS：http://34.81.244.21:1337/admin
2. 進入 **Content Manager** > **KPI Configuration**
3. 新增以下三個 KPI 配置：

**KPI 1：總死亡人數**
```json
{
  "key": "fatal_total",
  "label": "總死亡人數",
  "description": "當年度交通事故總死亡人數",
  "icon": "🚨",
  "display_order": 1,
  "is_active": true,
  "unit": "人",
  "color_scheme": "danger"
}
```

**KPI 2：行人死亡人數**
```json
{
  "key": "fatal_ped",
  "label": "行人死亡人數",
  "description": "當年度行人交通事故死亡人數",
  "icon": "🚶",
  "display_order": 2,
  "is_active": true,
  "unit": "人",
  "color_scheme": "danger"
}
```

**KPI 3：兒少死亡人數**
```json
{
  "key": "fatal_minor",
  "label": "兒少死亡人數",
  "description": "當年度18歲以下交通事故死亡人數",
  "icon": "👶",
  "display_order": 3,
  "is_active": true,
  "unit": "人",
  "color_scheme": "danger"
}
```

4. 儲存後，清除前台緩存

### 方案 3：優化緩存機制（長期解決方案）

#### 3.1 設定 Revalidate Secret

在 `.env` 或 `docker-compose.yml` 中設定：

```yaml
frontend:
  environment:
    - REVALIDATE_SECRET=your-secret-key-here
```

#### 3.2 在 CMS 中設定 Webhook（自動清除緩存）

1. 進入 Strapi Admin > Settings > Webhooks
2. 新增 Webhook：
   - **Name**: Revalidate Frontend
   - **Url**: `http://frontend:3000/api/revalidate?secret=YOUR_SECRET`
   - **Events**: 
     - `homepage-setting.update`
     - `kpi-config.create`
     - `kpi-config.update`
     - `kpi-config.delete`
3. 測試 Webhook 是否正常運作

#### 3.3 縮短緩存時間（開發階段）

修改 `frontend/app/page.tsx`：

```typescript
// 開發階段可以縮短為 60 秒
next: { revalidate: 60, tags: ['cms'] }

// 正式環境建議 300 秒（5分鐘）
next: { revalidate: 300, tags: ['cms'] }
```

---

## 圖表功能評估

### 可行性分析

✅ **技術上可行**，可以使用以下方案：

#### 方案 A：使用 Recharts（推薦）

**優點：**
- React 原生圖表庫
- 輕量、易用
- 支援圓餅圖、長條圖、折線圖
- 響應式設計

**實作步驟：**
1. 安裝套件：`npm install recharts`
2. 在 KPI Config 中新增 `display_type` 欄位
3. 建立不同的圖表組件
4. 根據 `display_type` 渲染對應的圖表

#### 方案 B：使用 Chart.js

**優點：**
- 功能強大
- 社群支援完善
- 動畫效果豐富

**缺點：**
- 檔案較大
- 配置較複雜

### CMS 模型擴充

需要在 `kpi-config.settings.json` 中新增：

```json
{
  "display_type": {
    "type": "enumeration",
    "enum": ["card", "pie_chart", "bar_chart", "line_chart"],
    "default": "card",
    "description": "顯示類型"
  },
  "chart_config": {
    "type": "json",
    "description": "圖表額外配置 (JSON)"
  }
}
```

---

## 測試步驟

### 1. 測試 CMS 資料是否正確

```bash
# 測試 Homepage Settings
curl http://34.81.244.21:1337/homepage-setting

# 測試 KPI Configs
curl http://34.81.244.21:1337/kpi-configs
```

### 2. 測試 Backend API

```bash
# 測試 Homepage Settings API
curl http://34.81.244.21:8000/api/cms/homepage-settings

# 測試 KPI Configs API
curl http://34.81.244.21:8000/api/cms/kpi-configs
```

### 3. 測試前台顯示

```bash
# 檢查前台 HTML 中的標題
curl http://34.81.244.21:3000 | grep -o '<h1[^>]*>.*</h1>'
```

### 4. 測試 Revalidate

```bash
# 清除緩存
curl -X POST 'http://34.81.244.21:3000/api/revalidate?secret=YOUR_SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"tag":"cms"}'

# 等待幾秒後重新檢查
curl http://34.81.244.21:3000 | grep -o '<h1[^>]*>.*</h1>'
```

---

## 常見問題

### Q1: 為什麼修改 CMS 後前台沒有立即更新？

**A**: Next.js 使用 ISR（增量靜態再生成）機制，預設緩存 300 秒。需要：
1. 等待緩存過期（5分鐘）
2. 手動觸發 revalidate
3. 重啟 Frontend 容器

### Q2: 如何確認 Revalidate Secret？

**A**: 檢查環境變數：
```bash
docker-compose exec frontend env | grep REVALIDATE
```

### Q3: KPI 數據來源是什麼？

**A**: 有兩個來源：
1. **資料庫計算**：從 `kpis` API 獲取實際統計數據
2. **CMS 手動輸入**：從 `kpi-data` Content Type 手動設定

### Q4: Dashboard Settings 要在哪裡使用？

**A**: 目前首頁使用 Homepage Settings。如果要建立獨立的 Dashboard 頁面，可以：
1. 建立 `frontend/app/dashboard/page.tsx`
2. 使用 `dashboard-settings` API

---

## 下一步行動

### 立即執行：
1. ✅ 清除前台緩存（方案 1）
2. ✅ 在 CMS 中建立 KPI 配置（方案 2）
3. ✅ 測試前台是否正常顯示

### 短期優化：
1. 設定 Revalidate Secret
2. 建立 CMS Webhook 自動清除緩存
3. 建立測試腳本定期檢查

### 長期規劃：
1. 評估圖表功能需求
2. 擴充 KPI Config 模型
3. 實作多種 KPI 顯示模式

