#!/bin/bash

# 自動更新設定腳本
# 用途：一鍵設定 Webhook 自動觸發機制

set -e

echo "=========================================="
echo "  自動更新設定腳本"
echo "=========================================="
echo ""

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}此腳本將幫助您設定自動更新機制，讓 CMS 修改後前台自動更新${NC}"
echo ""

# 步驟 1：生成密鑰
echo -e "${YELLOW}[1/5] 生成 REVALIDATE_SECRET...${NC}"
SECRET=$(openssl rand -base64 32)
echo -e "${GREEN}✓ 已生成密鑰：${NC}"
echo -e "${BLUE}$SECRET${NC}"
echo ""

# 步驟 2：檢查 docker-compose.yml
echo -e "${YELLOW}[2/5] 檢查 docker-compose.yml...${NC}"
if grep -q "REVALIDATE_SECRET" docker-compose.yml; then
    echo -e "${YELLOW}⚠️  docker-compose.yml 中已有 REVALIDATE_SECRET${NC}"
    echo "是否要更新為新的密鑰？(y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        # 更新密鑰
        sed -i.backup "s/REVALIDATE_SECRET=.*/REVALIDATE_SECRET=$SECRET/" docker-compose.yml
        echo -e "${GREEN}✓ 已更新密鑰${NC}"
    else
        # 讀取現有密鑰
        SECRET=$(grep "REVALIDATE_SECRET=" docker-compose.yml | cut -d'=' -f2)
        echo -e "${GREEN}✓ 使用現有密鑰${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  docker-compose.yml 中未設定 REVALIDATE_SECRET${NC}"
    echo ""
    echo "請手動編輯 docker-compose.yml，在 frontend 服務的 environment 中加入："
    echo ""
    echo -e "${BLUE}  environment:"
    echo "    - NEXT_PUBLIC_API_BASE=http://backend:8000/api"
    echo "    - NEXT_PUBLIC_CMS_BASE=http://cms:1337"
    echo -e "    - REVALIDATE_SECRET=$SECRET  ${YELLOW}# 👈 加入這行${NC}"
    echo ""
    echo "按 Enter 繼續（確認已手動加入）..."
    read
fi
echo ""

# 步驟 3：提供 Webhook 設定資訊
echo -e "${YELLOW}[3/5] Webhook 設定資訊${NC}"
echo ""
echo -e "${GREEN}請在 Strapi Admin 中設定以下 Webhooks：${NC}"
echo ""
echo "=========================================="
echo -e "${BLUE}Webhook 1: Homepage Settings${NC}"
echo "=========================================="
echo "Name: Revalidate Homepage"
echo "Url:  http://frontend:3000/api/revalidate?secret=$SECRET"
echo "Events: Entry > Create, Update, Delete"
echo "Content Type: homepage-setting"
echo ""
echo "=========================================="
echo -e "${BLUE}Webhook 2: KPI Configs${NC}"
echo "=========================================="
echo "Name: Revalidate KPI Configs"
echo "Url:  http://frontend:3000/api/revalidate?secret=$SECRET"
echo "Events: Entry > Create, Update, Delete"
echo "Content Type: kpi-config"
echo ""
echo "=========================================="
echo -e "${BLUE}Webhook 3: Dashboard Settings${NC}"
echo "=========================================="
echo "Name: Revalidate Dashboard"
echo "Url:  http://frontend:3000/api/revalidate?secret=$SECRET"
echo "Events: Entry > Create, Update, Delete"
echo "Content Type: dashboard-setting"
echo ""
echo "=========================================="
echo ""
echo -e "${YELLOW}設定步驟：${NC}"
echo "1. 訪問：http://34.81.244.21:1337/admin"
echo "2. 進入：Settings > Webhooks"
echo "3. 點擊：Add new webhook"
echo "4. 填寫上述資訊（複製貼上）"
echo "5. 點擊：Save"
echo "6. 點擊：Trigger 測試"
echo ""
echo "按 Enter 繼續（確認已設定 Webhooks）..."
read
echo ""

# 步驟 4：更新緩存時間（可選）
echo -e "${YELLOW}[4/5] 是否要縮短緩存時間？${NC}"
echo "當前緩存時間：300 秒（5 分鐘）"
echo "建議縮短為：60 秒（1 分鐘）"
echo ""
echo "這樣即使 Webhook 失敗，也會在 1 分鐘內自動更新"
echo ""
echo "是否縮短緩存時間？(y/n)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "正在更新 frontend/app/page.tsx..."
    sed -i.backup 's/revalidate: 300/revalidate: 60/g' frontend/app/page.tsx
    echo -e "${GREEN}✓ 已更新 Frontend 緩存時間為 60 秒${NC}"
    
    echo "正在更新 backend/app/routers/cms_content.py..."
    sed -i.backup 's/ttl=300/ttl=60/g' backend/app/routers/cms_content.py
    echo -e "${GREEN}✓ 已更新 Backend 緩存時間為 60 秒${NC}"
else
    echo -e "${YELLOW}⚠️  保持原有緩存時間（300 秒）${NC}"
fi
echo ""

# 步驟 5：重啟服務
echo -e "${YELLOW}[5/5] 重啟服務以套用變更...${NC}"
echo ""
echo "需要重啟以下服務："
echo "  - frontend（套用 REVALIDATE_SECRET）"
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "  - backend（套用新的緩存時間）"
fi
echo ""
echo "是否現在重啟？(y/n)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "正在重啟服務..."
    docker-compose up -d --build frontend backend
    echo -e "${GREEN}✓ 服務已重啟${NC}"
    echo "⏳ 等待 30 秒讓服務完全啟動..."
    sleep 30
else
    echo -e "${YELLOW}⚠️  請記得稍後手動重啟：${NC}"
    echo "docker-compose up -d --build frontend backend"
fi
echo ""

# 完成
echo "=========================================="
echo -e "${GREEN}✅ 設定完成！${NC}"
echo "=========================================="
echo ""
echo -e "${BLUE}測試自動更新：${NC}"
echo ""
echo "1. 訪問 CMS：http://34.81.244.21:1337/admin"
echo "2. 修改 Homepage Setting 中的標題"
echo "3. 點擊 Save"
echo "4. 等待 3-5 秒"
echo "5. 重新整理前台：http://34.81.244.21:3000"
echo "6. 應該會看到新標題！"
echo ""
echo -e "${YELLOW}如果沒有立即更新：${NC}"
echo "  - 檢查 Webhook 是否設定正確（Strapi > Settings > Webhooks）"
echo "  - 點擊 Trigger 測試 Webhook"
echo "  - 查看回應是否為 {\"revalidated\": true}"
echo "  - 最多等待 60 秒（緩存過期時間）"
echo ""
echo -e "${GREEN}從現在開始，您在 CMS 中的任何修改都會自動反映到前台！${NC}"
echo ""
echo "=========================================="
echo ""
echo "📚 更多資訊請參考：自動更新設定指南.md"
echo ""

