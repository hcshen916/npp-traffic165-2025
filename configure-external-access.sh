#!/bin/bash

################################################################################
# 配置外部訪問腳本
# 此腳本會自動更新 .env 檔案，將 localhost 改為外部 IP
################################################################################

set -e

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "========================================"
echo "🌐 配置外部訪問設定"
echo "========================================"
echo ""

# 檢查 .env 檔案是否存在
if [ ! -f .env ]; then
    echo -e "${RED}❌ 錯誤: 找不到 .env 檔案${NC}"
    echo "請先執行 create-env.sh 建立環境變數檔案"
    exit 1
fi

# 取得外部 IP
echo "🔍 正在取得 VM 外部 IP..."
EXTERNAL_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo "")

if [ -z "$EXTERNAL_IP" ]; then
    echo -e "${RED}❌ 無法自動取得外部 IP${NC}"
    echo ""
    read -p "請手動輸入外部 IP: " EXTERNAL_IP
    
    if [ -z "$EXTERNAL_IP" ]; then
        echo -e "${RED}❌ 未輸入 IP，取消操作${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ 外部 IP: $EXTERNAL_IP${NC}"
echo ""

# 備份原始 .env 檔案
echo "📦 備份原始 .env 檔案..."
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo -e "${GREEN}✓ 備份完成${NC}"
echo ""

# 更新 .env 檔案
echo "✏️  更新 .env 檔案..."

# 更新 NEXT_PUBLIC_API_BASE
if grep -q "NEXT_PUBLIC_API_BASE=" .env; then
    sed -i "s|NEXT_PUBLIC_API_BASE=.*|NEXT_PUBLIC_API_BASE=http://$EXTERNAL_IP:8000|g" .env
    echo -e "${GREEN}✓ 更新 NEXT_PUBLIC_API_BASE${NC}"
else
    echo "NEXT_PUBLIC_API_BASE=http://$EXTERNAL_IP:8000" >> .env
    echo -e "${GREEN}✓ 新增 NEXT_PUBLIC_API_BASE${NC}"
fi

# 更新 NEXT_PUBLIC_CMS_BASE
if grep -q "NEXT_PUBLIC_CMS_BASE=" .env; then
    sed -i "s|NEXT_PUBLIC_CMS_BASE=.*|NEXT_PUBLIC_CMS_BASE=http://$EXTERNAL_IP:1337|g" .env
    echo -e "${GREEN}✓ 更新 NEXT_PUBLIC_CMS_BASE${NC}"
else
    echo "NEXT_PUBLIC_CMS_BASE=http://$EXTERNAL_IP:1337" >> .env
    echo -e "${GREEN}✓ 新增 NEXT_PUBLIC_CMS_BASE${NC}"
fi

echo ""
echo "📋 更新後的設定："
grep "NEXT_PUBLIC" .env

echo ""
echo "🔄 重啟 Frontend 服務以套用變更..."

# 檢查 Docker Compose 命令
if docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo -e "${RED}❌ 找不到 docker compose 命令${NC}"
    exit 1
fi

# 重啟 frontend
sudo $COMPOSE_CMD restart frontend

echo ""
echo "⏳ 等待 Frontend 重新啟動..."
sleep 10

echo ""
echo "========================================"
echo -e "${GREEN}✅ 配置完成！${NC}"
echo "========================================"
echo ""
echo "🌍 您現在可以從外部訪問："
echo ""
echo "  • 前端網站: http://$EXTERNAL_IP:3000"
echo "  • API 文檔:  http://$EXTERNAL_IP:8000/docs"
echo "  • CMS 後台:  http://$EXTERNAL_IP:1337/admin"
echo ""
echo "📝 備份檔案已保存為 .env.backup.*"
echo ""
echo "⚠️  重要提醒："
echo "  1. 確保 GCP 防火牆已開放 ports 3000, 8000, 1337"
echo "  2. 首次訪問 CMS 需要建立管理員帳號"
echo ""

