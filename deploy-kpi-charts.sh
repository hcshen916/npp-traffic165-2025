#!/bin/bash

# KPI 圖表功能部署腳本
# 用途：一鍵部署 KPI 圖表功能並清除緩存

set -e

echo "=========================================="
echo "  KPI 圖表功能部署腳本"
echo "=========================================="
echo ""

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 檢查 Docker 是否運行
echo -e "${YELLOW}[1/6] 檢查 Docker 狀態...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker 未運行，請先啟動 Docker${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker 運行中${NC}"
echo ""

# 重啟 CMS（套用新模型）
echo -e "${YELLOW}[2/6] 重啟 CMS 服務（套用新的 KPI Config 模型）...${NC}"
docker-compose restart cms
echo -e "${GREEN}✓ CMS 已重啟${NC}"
echo "⏳ 等待 30 秒讓 Strapi 完全啟動..."
sleep 30
echo ""

# 檢查 CMS 是否可訪問
echo -e "${YELLOW}[3/6] 檢查 CMS API...${NC}"
if curl -s http://34.81.244.21:1337/homepage-setting > /dev/null; then
    echo -e "${GREEN}✓ CMS API 正常${NC}"
else
    echo -e "${RED}❌ CMS API 無法訪問${NC}"
    echo "請檢查 CMS 服務是否正常啟動"
fi
echo ""

# 重啟 Frontend（清除緩存）
echo -e "${YELLOW}[4/6] 重啟 Frontend 服務（清除緩存）...${NC}"
docker-compose restart frontend
echo -e "${GREEN}✓ Frontend 已重啟${NC}"
echo "⏳ 等待 30 秒讓 Next.js 完全啟動..."
sleep 30
echo ""

# 檢查 API
echo -e "${YELLOW}[5/6] 驗證 API 端點...${NC}"
echo ""

echo "📍 Homepage Settings:"
curl -s http://34.81.244.21:1337/homepage-setting | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f'  ✓ Page Title: {data.get(\"page_title\", \"N/A\")}')
    print(f'  ✓ Page Subtitle: {data.get(\"page_subtitle\", \"N/A\")}')
except:
    print('  ❌ 無法解析 JSON')
" 2>/dev/null || echo "  ⚠️  無法取得資料（這是正常的，可能需要在 CMS 中設定）"
echo ""

echo "📍 KPI Configs:"
kpi_count=$(curl -s http://34.81.244.21:1337/kpi-configs | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
echo "  當前 KPI 配置數量: $kpi_count"
if [ "$kpi_count" -eq "0" ]; then
    echo -e "  ${YELLOW}⚠️  尚未建立 KPI 配置${NC}"
    echo "  📝 請依照以下步驟在 CMS 中建立 KPI 配置："
    echo "     1. 訪問 http://34.81.244.21:1337/admin"
    echo "     2. 進入 Content Manager > KPI Configuration"
    echo "     3. 建立至少一個 KPI 配置"
else
    echo -e "  ${GREEN}✓ 已有 $kpi_count 個 KPI 配置${NC}"
fi
echo ""

echo "📍 Backend API:"
curl -s http://34.81.244.21:8000/api/cms/homepage-settings > /dev/null && echo -e "  ${GREEN}✓ Homepage Settings API 正常${NC}" || echo -e "  ${RED}❌ Homepage Settings API 異常${NC}"
curl -s http://34.81.244.21:8000/api/cms/kpi-configs > /dev/null && echo -e "  ${GREEN}✓ KPI Configs API 正常${NC}" || echo -e "  ${RED}❌ KPI Configs API 異常${NC}"
echo ""

# 檢查前台
echo -e "${YELLOW}[6/6] 檢查前台網站...${NC}"
if curl -s http://34.81.244.21:3000 > /dev/null; then
    echo -e "${GREEN}✓ 前台網站可訪問${NC}"
    echo ""
    echo "📱 前台標題："
    curl -s http://34.81.244.21:3000 | grep -o '<h1[^>]*>.*</h1>' | sed 's/<[^>]*>//g' | head -1 || echo "  無法取得標題"
else
    echo -e "${RED}❌ 前台網站無法訪問${NC}"
fi
echo ""

echo "=========================================="
echo -e "${GREEN}部署完成！${NC}"
echo "=========================================="
echo ""
echo "📋 後續步驟："
echo ""
echo "1️⃣  在 CMS 中建立 KPI 配置（如果尚未建立）"
echo "   - 訪問：http://34.81.244.21:1337/admin"
echo "   - 進入：Content Manager > KPI Configuration"
echo "   - 建立配置，參考：KPI圖表功能使用指南.md"
echo ""
echo "2️⃣  驗證前台顯示"
echo "   - 訪問：http://34.81.244.21:3000"
echo "   - 檢查 KPI 是否正確顯示"
echo ""
echo "3️⃣  （可選）設定 Webhook 自動清除緩存"
echo "   - Strapi Admin > Settings > Webhooks"
echo "   - 參考：CMS更新問題診斷與解決方案.md"
echo ""
echo "📚 完整文件："
echo "   - 完整解決方案總結.md"
echo "   - KPI圖表功能使用指南.md"
echo "   - CMS更新問題診斷與解決方案.md"
echo ""
echo "=========================================="

