# Strapi CMS 配置

## 首次設定

1. 訪問 http://localhost:1337/admin
2. 建立管理員帳號
3. 建立以下 Content Types:

### Post (Collection Type)
- title: Text (required)
- slug: UID (required, from title)
- excerpt: Text
- content: Rich Text
- cover: Media (Single)
- publishedAt: DateTime
- category: Relation (Many-to-One with Category)
- author: Relation (Many-to-One with Author)
- tags: Relation (Many-to-Many with Tag)

### Category (Collection Type)
- name: Text (required)
- slug: UID (required, from name)
- description: Text

### Tag (Collection Type)
- name: Text (required)
- slug: UID (required, from name)

### Author (Collection Type)
- name: Text (required)
- bio: Text
- avatar: Media (Single)

### Dataset Upload (Collection Type)
- title: Text (required)
- source: Text
- period_year: Integer
- period_month: Integer
- file: Media (Single)
- sha256: Text
- notes: Text
- status: Enumeration (uploaded, validated, processed, failed)
- task_id: Text
- run_id: Text

## API 權限設定

在 Settings > Users & Permissions Plugin > Roles > Public 中：
- 啟用 Post: find, findOne
- 啟用 Category: find, findOne  
- 啟用 Tag: find, findOne
- 啟用 Author: find, findOne

## Webhook 設定

在 Settings > Webhooks 中新增：
- Name: Frontend Revalidate
- URL: http://frontend:3000/api/revalidate?secret=changeme
- Events: Entry create, Entry update, Entry publish, Entry unpublish
- Headers: Content-Type: application/json