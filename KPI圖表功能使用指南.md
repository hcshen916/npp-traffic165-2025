# KPI 圖表功能使用指南

## 功能概述

系統現在支援 **4 種 KPI 顯示模式**，完全使用純 CSS 和 SVG 實作，無需額外安裝套件：

1. **Card（卡片）** - 原始的卡片樣式
2. **Pie（圓餅圖）** - 圓形圖表，適合顯示佔比
3. **Bar（長條圖）** - 水平長條圖，適合比較數值
4. **Line（折線圖）** - 趨勢線圖，適合顯示變化

## 實作方式

✅ **完全使用現有框架**
- 純 CSS 和 SVG，無需安裝新套件
- 響應式設計，自動適配不同螢幕
- 支援動畫效果
- 顏色主題可配置

## 後台設定步驟

### 步驟 1：重啟 CMS 服務（套用新模型）

由於我們更新了 KPI Config 模型，需要重啟 CMS：

```bash
docker-compose restart cms
```

等待約 30 秒，讓 Strapi 重新載入模型。

### 步驟 2：登入 Strapi CMS

訪問：http://34.81.244.21:1337/admin

### 步驟 3：建立 KPI 配置

進入 **Content Manager** > **KPI Configuration** > **Create New Entry**

#### 範例 1：總死亡人數（使用卡片）

```
Key: fatal_total
Label: 總死亡人數
Description: 當年度交通事故總死亡人數
Icon: 🚨
Display Order: 1
Is Active: ✓ (勾選)
Unit: 人
Color Scheme: danger
Display Type: card
```

#### 範例 2：行人死亡人數（使用圓餅圖）

```
Key: fatal_ped
Label: 行人死亡人數
Description: 當年度行人交通事故死亡人數
Icon: 🚶
Display Order: 2
Is Active: ✓ (勾選)
Unit: 人
Color Scheme: danger
Display Type: pie
```

#### 範例 3：兒少死亡人數（使用長條圖）

```
Key: fatal_minor
Label: 兒少死亡人數
Description: 當年度18歲以下交通事故死亡人數
Icon: 👶
Display Order: 3
Is Active: ✓ (勾選)
Unit: 人
Color Scheme: warning
Display Type: bar
```

### 步驟 4：儲存並發布

點擊 **Save** 儲存設定。

### 步驟 5：清除前台緩存

有三種方式：

#### 方式 A：重啟 Frontend 服務（推薦）

```bash
docker-compose restart frontend
```

#### 方式 B：等待緩存過期

等待 5 分鐘，緩存會自動過期並重新載入。

#### 方式 C：使用 Revalidate API

```bash
curl -X POST 'http://34.81.244.21:3000/api/revalidate?secret=YOUR_SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"tag":"cms"}'
```

## 顯示類型說明

### 1. Card（卡片）

**適合場景：**
- 簡潔的數據展示
- 強調當前數值
- 快速瀏覽

**顯示內容：**
- 標題和圖標
- 當前數值（大字）
- 變化百分比（上升/下降）
- 基準值

**視覺效果：**
```
┌─────────────────────────┐
│ 總死亡人數          🚨  │
│ 3,085 人               │
│ ↗ 5.2%    vs 基準年    │
│ 基準值: 2,932          │
└─────────────────────────┘
```

### 2. Pie（圓餅圖）

**適合場景：**
- 顯示當前值與基準值的比例
- 視覺化佔比關係
- 強調整體與部分

**顯示內容：**
- 標題和圖標
- 圓形圖表（當前值 vs 基準值）
- 中心顯示當前數值
- 圖例說明
- 變化百分比

**視覺效果：**
```
┌─────────────────────────┐
│ 行人死亡人數        🚶  │
│      ╱───╲             │
│    ╱       ╲           │
│   │  3,085  │          │
│    ╲   人   ╱          │
│      ╲───╱             │
│ ■ 當前  ■ 基準         │
│ ↗ 增加 5.2%            │
└─────────────────────────┘
```

### 3. Bar（長條圖）

**適合場景：**
- 直觀比較兩個數值
- 清楚顯示差距大小
- 並排比較

**顯示內容：**
- 標題和圖標
- 當前值長條（深色）
- 基準值長條（淺色）
- 具體數值標示
- 變化百分比

**視覺效果：**
```
┌─────────────────────────┐
│ 兒少死亡人數        👶  │
│ 當前值  ████████ 3,085  │
│ 基準值  ██████   2,932  │
│                         │
│ ↗ 增加 5.2%            │
└─────────────────────────┘
```

### 4. Line（折線圖）

**適合場景：**
- 顯示趨勢變化
- 強調增減方向
- 時間序列數據

**顯示內容：**
- 標題和圖標
- 折線圖（基準點到當前點）
- 兩端數值標示
- 變化百分比

**視覺效果：**
```
┌─────────────────────────┐
│ 總死亡人數          🚨  │
│     基準    當前        │
│      ●────────●         │
│                         │
│ 2,932      3,085        │
│ ↗ 增加 5.2%            │
└─────────────────────────┘
```

## 顏色主題

系統支援 4 種顏色主題：

| 主題 | 用途 | 顏色 |
|------|------|------|
| danger | 危險、警告數據 | 紅色系 🔴 |
| warning | 需注意數據 | 黃色系 🟡 |
| info | 一般資訊 | 藍色系 🔵 |
| success | 正向數據 | 綠色系 🟢 |

## 配置建議

### 推薦配置組合

**方案 A：全部使用卡片（簡潔）**
```
fatal_total → card
fatal_ped → card
fatal_minor → card
```

**方案 B：混合使用（豐富）**
```
fatal_total → bar (比較明顯)
fatal_ped → pie (視覺化比例)
fatal_minor → line (趨勢明確)
```

**方案 C：主次分明**
```
fatal_total → pie (主要指標，圓餅圖吸引注意)
fatal_ped → bar (次要指標，長條圖清晰)
fatal_minor → card (輔助指標，卡片簡潔)
```

## 技術細節

### 數據來源

KPI 數據有兩個來源（按優先順序）：

1. **資料庫計算**（主要來源）
   - API：`/api/kpis`
   - 自動從資料庫統計
   - 即時更新

2. **CMS 手動輸入**（備用來源）
   - Content Type：`kpi-data`
   - 可手動覆蓋資料庫數值
   - 適合特殊情況或調整

### 緩存機制

- **Next.js ISR**：300 秒（5 分鐘）
- **Backend API**：300 秒（5 分鐘）
- **建議**：開發階段可縮短為 60 秒

### 響應式設計

圖表會自動適配不同螢幕尺寸：
- 桌面：每行最多 3 個
- 平板：每行 2 個
- 手機：每行 1 個

## 疑難排解

### Q1: 新增 KPI Config 後前台沒顯示？

**檢查清單：**
1. ✓ Key 是否與資料庫中的 metric key 一致？
2. ✓ Is Active 是否已勾選？
3. ✓ 是否已清除前台緩存？
4. ✓ 資料庫中是否有對應的 KPI 數據？

**解決方法：**
```bash
# 1. 檢查 API 是否返回資料
curl http://34.81.244.21:8000/api/cms/kpi-configs

# 2. 檢查 KPI 數據
curl http://34.81.244.21:8000/api/kpis

# 3. 清除緩存
docker-compose restart frontend
```

### Q2: 圖表顯示不正常？

**可能原因：**
- 瀏覽器緩存：強制重新整理（Ctrl+Shift+R / Cmd+Shift+R）
- 數據異常：檢查 current 和 baseline 是否為有效數字

### Q3: 如何修改圖表樣式？

編輯檔案：`frontend/app/components/KpiCharts.tsx`

可調整：
- 顏色（colors）
- 尺寸（width, height, radius）
- 字體（fontSize, fontWeight）
- 動畫（transition）

### Q4: 能否自訂更多顯示類型？

可以！在 `KpiCharts.tsx` 中新增 case：

```typescript
switch (displayType) {
  case 'pie': return <PieChart ... />
  case 'bar': return <BarChart ... />
  case 'line': return <LineChart ... />
  case 'custom': return <CustomChart ... />  // 新增自訂類型
  default: return <KpiCard ... />
}
```

然後在 CMS 模型中新增對應的 enum 值。

## 測試步驟

### 完整測試流程

```bash
# 1. 重啟 CMS（套用新模型）
docker-compose restart cms

# 2. 在 CMS 中建立 3 個 KPI 配置
# （透過瀏覽器操作）

# 3. 檢查 API 是否返回配置
curl http://34.81.244.21:8000/api/cms/kpi-configs | python3 -m json.tool

# 4. 重啟前台
docker-compose restart frontend

# 5. 訪問前台檢查
open http://34.81.244.21:3000
```

## 進階功能

### 未來可擴充的功能

1. **互動式圖表**
   - Hover 顯示詳細資訊
   - Click 展開詳細數據

2. **動態數據**
   - 即時更新
   - WebSocket 推送

3. **匯出功能**
   - 下載為圖片
   - 匯出為 PDF

4. **更多圖表類型**
   - 堆疊長條圖
   - 區域圖
   - 雷達圖

## 總結

✅ **已實作功能：**
- 4 種顯示模式（卡片、圓餅圖、長條圖、折線圖）
- 純 CSS/SVG 實作，無需額外套件
- 響應式設計
- 顏色主題可配置
- 後台完全可控

✅ **優點：**
- 輕量化，不增加打包大小
- 效能優異
- 易於維護和客製化
- 完全在現有框架下實現

⚠️ **限制：**
- 圖表較為簡化，不如專業圖表庫豐富
- 不支援複雜的互動功能
- 不支援多數據系列

**建議：**
- 一般使用情況下，現有實作已足夠
- 如需更複雜的圖表，可考慮引入 Recharts 或 Chart.js

