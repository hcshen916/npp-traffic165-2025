#!/bin/bash

################################################################################
# 診斷腳本 - 當容器無法啟動時使用
################################################################################

echo "========================================"
echo "🔍 系統診斷工具"
echo "========================================"
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 檢查 sudo 權限
if [ "$EUID" -ne 0 ]; then 
    if sudo -n true 2>/dev/null; then
        SUDO="sudo"
    else
        echo -e "${YELLOW}⚠️  建議使用 sudo 執行此腳本以獲得完整資訊${NC}"
        echo "執行: sudo bash diagnose.sh"
        echo ""
        SUDO=""
    fi
else
    SUDO=""
fi

# 1. 檢查 Docker 服務
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}1️⃣  Docker 服務狀態${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
if systemctl is-active --quiet docker 2>/dev/null; then
    echo -e "${GREEN}✓ Docker 服務正在運行${NC}"
    $SUDO systemctl status docker --no-pager | head -10
else
    echo -e "${RED}✗ Docker 服務未運行${NC}"
    echo "嘗試啟動 Docker..."
    $SUDO systemctl start docker
fi
echo ""

# 2. 檢查所有 Docker 容器
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}2️⃣  所有 Docker 容器狀態${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
ALL_CONTAINERS=$($SUDO docker ps -a -q 2>/dev/null | wc -l)
RUNNING_CONTAINERS=$($SUDO docker ps -q 2>/dev/null | wc -l)

echo "總容器數: $ALL_CONTAINERS"
echo "運行中: $RUNNING_CONTAINERS"
echo "停止/錯誤: $((ALL_CONTAINERS - RUNNING_CONTAINERS))"
echo ""

if [ "$ALL_CONTAINERS" -gt 0 ]; then
    echo "容器列表:"
    $SUDO docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
else
    echo -e "${RED}⚠️  系統中沒有任何容器${NC}"
fi
echo ""

# 3. 檢查 docker-compose.yml
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}3️⃣  檢查 docker-compose.yml${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
if [ -f docker-compose.yml ]; then
    echo -e "${GREEN}✓ docker-compose.yml 存在${NC}"
    echo ""
    echo "定義的服務:"
    grep "^  [a-z]" docker-compose.yml | grep -v "#" | sed 's/:$//' | sed 's/^  /  - /'
else
    echo -e "${RED}✗ 找不到 docker-compose.yml${NC}"
    echo "當前目錄: $(pwd)"
fi
echo ""

# 4. 檢查 .env 檔案
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}4️⃣  檢查 .env 環境變數檔案${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
if [ -f .env ]; then
    echo -e "${GREEN}✓ .env 檔案存在${NC}"
    echo ""
    echo "環境變數數量: $(grep -c "=" .env)"
    echo "關鍵變數檢查:"
    for var in MYSQL_ROOT_PASSWORD MYSQL_DATABASE MYSQL_USER MYSQL_PASSWORD; do
        if grep -q "^${var}=" .env; then
            echo -e "  ${GREEN}✓${NC} $var"
        else
            echo -e "  ${RED}✗${NC} $var (缺少)"
        fi
    done
else
    echo -e "${RED}✗ 找不到 .env 檔案${NC}"
    echo "請先執行: bash create-env.sh"
fi
echo ""

# 5. 檢查磁碟空間
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}5️⃣  磁碟空間${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
df -h / | tail -1 | awk '{
    avail=$4
    gsub(/G/, "", avail)
    if (avail+0 < 5) 
        print "⚠️  可用空間: " $4 " (不足 5GB，可能導致容器啟動失敗)"
    else 
        print "✓ 可用空間: " $4
}'
echo ""
echo "Docker 磁碟使用:"
$SUDO docker system df 2>/dev/null || echo "無法取得 Docker 磁碟資訊"
echo ""

# 6. 檢查 Docker Compose 命令
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}6️⃣  Docker Compose 狀態${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
if $SUDO docker compose version &> /dev/null; then
    echo -e "${GREEN}✓ docker compose (plugin) 可用${NC}"
    $SUDO docker compose version
    COMPOSE_CMD="$SUDO docker compose"
elif command -v docker-compose &> /dev/null; then
    echo -e "${GREEN}✓ docker-compose 可用${NC}"
    docker-compose --version
    COMPOSE_CMD="$SUDO docker-compose"
else
    echo -e "${RED}✗ 找不到 docker compose${NC}"
    COMPOSE_CMD=""
fi
echo ""

# 7. 檢查專案容器（如果 COMPOSE_CMD 可用）
if [ -n "$COMPOSE_CMD" ] && [ -f docker-compose.yml ]; then
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BLUE}7️⃣  專案容器狀態 (docker-compose)${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    
    PROJECT_CONTAINERS=$($COMPOSE_CMD ps -q 2>/dev/null | wc -l)
    echo "專案容器數: $PROJECT_CONTAINERS"
    echo ""
    
    if [ "$PROJECT_CONTAINERS" -gt 0 ]; then
        echo "專案容器詳情:"
        $COMPOSE_CMD ps
        echo ""
    else
        echo -e "${YELLOW}⚠️  沒有找到專案容器${NC}"
        echo ""
        echo "嘗試獲取最近的錯誤日誌..."
        $COMPOSE_CMD logs --tail=50 2>/dev/null || echo "無法取得日誌"
    fi
    echo ""
fi

# 8. 檢查連接埠佔用
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}8️⃣  關鍵連接埠檢查${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
for port in 3000 8000 1337 3306 6379; do
    if $SUDO netstat -tuln 2>/dev/null | grep -q ":$port "; then
        echo -e "${GREEN}✓${NC} Port $port 有程式在監聽"
    else
        echo -e "${YELLOW}○${NC} Port $port 未被使用"
    fi
done
echo ""

# 9. 最近的 Docker 錯誤
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}9️⃣  最近的 Docker 系統日誌${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
if command -v journalctl &> /dev/null; then
    echo "最近 20 條 Docker 相關日誌:"
    $SUDO journalctl -u docker --no-pager -n 20 2>/dev/null || echo "無法取得 journalctl 日誌"
else
    echo "journalctl 不可用，跳過"
fi
echo ""

# 10. 建議動作
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}🔧 建議的診斷命令${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""
echo "如果容器啟動失敗，請依序執行以下命令:"
echo ""
echo "1️⃣  查看完整的容器日誌:"
echo "   sudo docker compose logs"
echo ""
echo "2️⃣  查看特定服務的日誌:"
echo "   sudo docker compose logs mysql"
echo "   sudo docker compose logs backend"
echo "   sudo docker compose logs frontend"
echo "   sudo docker compose logs cms"
echo ""
echo "3️⃣  重新啟動容器:"
echo "   sudo docker compose down"
echo "   sudo docker compose up -d"
echo ""
echo "4️⃣  如果磁碟空間不足:"
echo "   sudo bash emergency-cleanup.sh"
echo ""
echo "5️⃣  完整重新部署:"
echo "   sudo bash setup-gcp-vm.sh"
echo ""

echo "========================================"
echo -e "${GREEN}✅ 診斷完成${NC}"
echo "========================================"
echo ""

