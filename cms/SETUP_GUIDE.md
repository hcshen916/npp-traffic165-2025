# Strapi CMS 設定指南

## 🚀 首次設定流程

### 1. 建立管理員帳號
1. 瀏覽器打開 `http://localhost:1337/admin`
2. 首次進入會要求建立管理員帳號
3. 填寫資訊並點擊「Let's start」

### 2. 建立 Content Types

#### 📝 建立 Post (文章)
1. 左側選單：`Content-Type Builder`
2. 點擊 `+ Create new collection type`
3. Display name: `Post`
4. API ID: `post` (自動產生)
5. 點擊 `Continue`

**新增以下欄位：**

**Text 欄位:**
- Field name: `title`
- Type: Short text
- Advanced settings: Required ✓

**UID 欄位:**
- Field name: `slug`
- Type: UID
- Attached field: title
- Advanced settings: Required ✓

**Text 欄位:**
- Field name: `excerpt`
- Type: Long text

**Rich Text 欄位:**
- Field name: `content`
- Type: Rich text (Markdown)

**Media 欄位:**
- Field name: `cover`
- Type: Media
- Select allowed types: Images
- Advanced settings: Single media

6. 點擊 `Save` 儲存 Content Type

#### 👤 建立 Author (作者) - 可選
1. 建立新的 Collection Type: `Author`
2. 新增欄位：
   - `name` (Short text, Required)
   - `bio` (Long text)
   - `avatar` (Media, Single)

#### 🏷️ 建立 Category (分類) - 可選
1. 建立新的 Collection Type: `Category`
2. 新增欄位：
   - `name` (Short text, Required)
   - `slug` (UID, from name)
   - `description` (Long text)

### 3. 設定 API 權限 ⚠️ **重要**

**這步驟是讓前端能讀取資料的關鍵！**

1. 左側選單：`Settings` → `Users & Permissions Plugin` → `Roles`
2. 點擊 `Public` 角色
3. 在 Permissions 區域找到 `Post` 並勾選：
   - ✅ `find` (查看列表)
   - ✅ `findOne` (查看單筆)
4. 如果有建立其他 Content Types，也要勾選相同權限：
   - Author: ✅ find, ✅ findOne
   - Category: ✅ find, ✅ findOne
5. 點擊右上角 `Save`

### 4. 新增測試文章

1. 左側選單：`Content Manager`
2. 選擇 `Collection Types` → `Post`
3. 點擊 `+ Create new entry`
4. 填寫內容：
   ```
   Title: 交通安全政策新趨勢
   Slug: traffic-safety-trends (自動產生)
   Excerpt: 探討最新的交通安全政策與數據分析
   Content: ## 內容標題
   
   這裡是文章的詳細內容...
   
   ### 政策重點
   - 加強行人保護
   - 改善道路設計
   - 提升駕駛教育
   ```
5. 點擊右上角 `Save`
6. **重要：點擊 `Publish` 發布文章**

### 5. 驗證 API 是否正常

打開瀏覽器測試以下 API：
- 文章列表：`http://localhost:1337/api/posts`
- 應該看到 JSON 格式的資料，不是 "Not Found"

### 6. 設定 Webhook (自動更新前端)

1. `Settings` → `Webhooks`
2. 點擊 `+ Create new webhook`
3. 填寫設定：
   - **Name**: `Frontend Revalidate`
   - **URL**: `http://frontend:3000/api/revalidate?secret=changeme`
   - **Events**: 勾選所有 Entry 相關事件
   - **Headers**: `Content-Type: application/json`
4. 點擊 `Save`

## 🔍 故障排除

### 前端顯示「無法載入文章」
1. 確認 Post Content Type 已建立
2. 確認 Public 權限已設定 (find, findOne)
3. 確認至少有一篇已發布的文章
4. 測試 API：`http://localhost:1337/api/posts`

### API 回傳 403 錯誤
- 檢查 Public 角色權限設定
- 確認有勾選 find 和 findOne

### API 回傳空陣列
- 確認文章已點擊 Publish 發布
- Draft 狀態的文章不會出現在公開 API

### 前端沒有自動更新
- 檢查 Webhook 設定
- 手動觸發更新：
  ```bash
  curl -X POST "http://localhost:3000/api/revalidate?secret=changeme" \
    -H "Content-Type: application/json" \
    -d '{"tag":"blog"}'
  ```

## ✅ 完成檢查清單

- [ ] 建立管理員帳號
- [ ] 建立 Post Content Type (包含 title, slug, excerpt, content 欄位)
- [ ] 設定 Public 權限 (Post: find, findOne)
- [ ] 新增並發布至少一篇測試文章
- [ ] 測試 API: `http://localhost:1337/api/posts` 有回傳資料
- [ ] 前端 `http://localhost:3000/blog` 顯示後台文章
- [ ] 設定 Webhook 自動更新前端

完成以上步驟後，你就可以在 Strapi 後台管理文章，並且會自動同步到前端網站！
