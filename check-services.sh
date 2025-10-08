#!/bin/bash

################################################################################
# 服務健康檢查腳本
# 此腳本會檢查所有服務是否正常運行
################################################################################

echo "========================================"
echo "🔍 檢查交通事故數據系統服務狀態"
echo "========================================"
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 檢查函數
check_service() {
    local service_name=$1
    local port=$2
    local path=${3:-""}
    
    echo -n "檢查 $service_name (Port $port)... "
    
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:$port$path | grep -q "200\|301\|302"; then
        echo -e "${GREEN}✓ 正常${NC}"
        return 0
    else
        echo -e "${RED}✗ 異常${NC}"
        return 1
    fi
}

# 檢查 Docker 是否運行
echo -e "${BLUE}1. 檢查 Docker 狀態${NC}"
if systemctl is-active --quiet docker 2>/dev/null || docker ps &>/dev/null; then
    echo -e "${GREEN}✓ Docker 正在運行${NC}"
else
    echo -e "${RED}✗ Docker 未運行${NC}"
    exit 1
fi
echo ""

# 檢查容器狀態
echo -e "${BLUE}2. 檢查容器狀態${NC}"
if command -v docker compose &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

CONTAINERS=$($COMPOSE_CMD ps -q 2>/dev/null | wc -l)
RUNNING=$($COMPOSE_CMD ps --filter "status=running" -q 2>/dev/null | wc -l)

echo "總容器數: $CONTAINERS"
echo "運行中容器: $RUNNING"

if [ "$CONTAINERS" -eq 0 ]; then
    echo -e "${RED}✗ 沒有找到任何容器，請先執行 setup-gcp-vm.sh${NC}"
    exit 1
elif [ "$RUNNING" -lt "$CONTAINERS" ]; then
    echo -e "${YELLOW}⚠️  部分容器未運行${NC}"
    $COMPOSE_CMD ps
else
    echo -e "${GREEN}✓ 所有容器都在運行${NC}"
fi
echo ""

# 等待服務啟動
echo -e "${BLUE}3. 等待服務完全啟動...${NC}"
sleep 3
echo ""

# 檢查各個服務
echo -e "${BLUE}4. 檢查服務可用性${NC}"

# MySQL
echo -n "檢查 MySQL... "
if docker exec traffic-mysql mysqladmin ping -h localhost --silent 2>/dev/null; then
    echo -e "${GREEN}✓ 正常${NC}"
else
    echo -e "${RED}✗ 異常${NC}"
fi

# Redis
echo -n "檢查 Redis... "
if docker exec traffic-redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
    echo -e "${GREEN}✓ 正常${NC}"
else
    echo -e "${RED}✗ 異常${NC}"
fi

# Backend API
check_service "Backend API" "8000" "/docs"

# CMS
check_service "Strapi CMS" "1337" "/admin"

# Frontend
check_service "Frontend" "3000" "/"

echo ""

# 顯示詳細資訊
echo -e "${BLUE}5. 服務資訊${NC}"
VM_IP=$(hostname -I | awk '{print $1}')
EXTERNAL_IP=$(curl -s ifconfig.me 2>/dev/null || echo "無法取得")

echo ""
echo "📍 內部 IP: $VM_IP"
echo "🌐 外部 IP: $EXTERNAL_IP"
echo ""
echo "🔗 服務連結:"
echo "  • Frontend:    http://$VM_IP:3000"
echo "  • Backend API: http://$VM_IP:8000/docs"
echo "  • CMS Admin:   http://$VM_IP:1337/admin"
echo ""

if [ "$EXTERNAL_IP" != "無法取得" ]; then
    echo "🌍 外部訪問連結:"
    echo "  • Frontend:    http://$EXTERNAL_IP:3000"
    echo "  • Backend API: http://$EXTERNAL_IP:8000/docs"
    echo "  • CMS Admin:   http://$EXTERNAL_IP:1337/admin"
    echo ""
fi

# 顯示容器資源使用狀況
echo -e "${BLUE}6. 容器資源使用狀況${NC}"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null

echo ""
echo "========================================"
echo -e "${GREEN}✅ 檢查完成${NC}"
echo "========================================"
echo ""
echo "📝 常用命令:"
echo "  • 查看即時日誌: docker compose logs -f"
echo "  • 重啟服務:     docker compose restart"
echo "  • 查看狀態:     docker compose ps"
echo ""

