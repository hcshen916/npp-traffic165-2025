#!/bin/bash

# 測試 CMS 更新和前台顯示的腳本

echo "=== 1. 檢查 CMS Homepage Settings ==="
curl -s http://34.81.244.21:1337/homepage-setting | python3 -c "import sys, json; data=json.load(sys.stdin); print(f'Page Title: {data[\"page_title\"]}'); print(f'Page Subtitle: {data[\"page_subtitle\"]}')"

echo -e "\n=== 2. 檢查 Backend API (通過緩存) ==="
curl -s http://34.81.244.21:8000/api/cms/homepage-settings | python3 -c "import sys, json; data=json.load(sys.stdin); print(f'Page Title: {data[\"settings\"][\"page_title\"]}'); print(f'Page Subtitle: {data[\"settings\"][\"page_subtitle\"]}')"

echo -e "\n=== 3. 檢查 KPI Configs ==="
curl -s http://34.81.244.21:1337/kpi-configs | python3 -c "import sys, json; data=json.load(sys.stdin); print(f'KPI Configs 數量: {len(data)}'); [print(f'  - {item.get(\"key\")}: {item.get(\"label\")}') for item in data]"

echo -e "\n=== 4. 檢查前台 HTML ==="
curl -s http://34.81.244.21:3000 | grep -o '<h1[^>]*>.*</h1>' | sed 's/<[^>]*>//g' | head -1

echo -e "\n=== 5. 觸發 Revalidate (需要 REVALIDATE_SECRET) ==="
echo "手動觸發緩存清除："
echo "curl -X POST 'http://34.81.244.21:3000/api/revalidate?secret=YOUR_SECRET' -H 'Content-Type: application/json' -d '{\"tag\":\"cms\"}'"

