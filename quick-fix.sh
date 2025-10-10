#!/bin/bash

################################################################################
# 快速修復腳本 - 解決常見的部署問題
# 此腳本會自動檢測並修復最常見的問題
################################################################################

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================"
echo "🚑 快速修復工具"
echo "========================================"
echo ""

# 檢查 sudo
if [ "$EUID" -ne 0 ]; then 
    if ! sudo -n true 2>/dev/null; then
        SUDO=""
        echo -e "${YELLOW}⚠️  未檢測到 sudo 權限，某些檢查可能無法執行${NC}"
    else
        SUDO="sudo"
    fi
else
    SUDO=""
fi

# Docker Compose 命令
if docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="$SUDO docker compose"
else
    COMPOSE_CMD="$SUDO docker-compose"
fi

ISSUES_FOUND=0
FIXES_APPLIED=0

echo "🔍 檢測常見問題..."
echo ""

# 1. 檢查 CMS 是否在重啟
echo "1️⃣ 檢查 CMS 容器狀態..."
CMS_STATUS=$($SUDO docker inspect -f '{{.State.Status}}' traffic-cms 2>/dev/null || echo "not_found")
CMS_RESTART_COUNT=$($SUDO docker inspect -f '{{.RestartCount}}' traffic-cms 2>/dev/null || echo "0")

if [ "$CMS_STATUS" = "restarting" ] || [ "$CMS_RESTART_COUNT" -gt 3 ]; then
    echo -e "${RED}❌ 發現問題：CMS 容器持續重啟 (重啟次數: $CMS_RESTART_COUNT)${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    
    # 檢查日誌
    LOGS=$($COMPOSE_CMD logs cms --tail=20 2>&1)
    
    # 診斷原因
    if echo "$LOGS" | grep -q "ER_NOT_SUPPORTED_AUTH_MODE"; then
        echo "   原因：MySQL 認證協議不兼容"
        echo "   修復：執行 MySQL 認證修復..."
        
        if [ -f fix-mysql-auth.sh ]; then
            bash fix-mysql-auth.sh
            FIXES_APPLIED=$((FIXES_APPLIED + 1))
        else
            echo "   請執行：bash fix-mysql-auth.sh"
        fi
    elif echo "$LOGS" | grep -q "ENOENT.*build/index.html"; then
        echo "   原因：Admin panel 未 build"
        echo "   修復：Build admin panel..."
        
        $SUDO docker exec traffic-cms npm run build
        $COMPOSE_CMD restart cms
        FIXES_APPLIED=$((FIXES_APPLIED + 1))
    elif echo "$LOGS" | grep -q "out of memory\|OOM"; then
        echo "   原因：記憶體不足"
        echo "   建議：執行 'sudo bash add-swap.sh' 增加 Swap"
    else
        echo "   無法自動判斷原因，請查看日誌："
        echo "   sudo docker compose logs cms --tail=50"
    fi
else
    echo -e "${GREEN}✓ CMS 容器狀態正常${NC}"
fi
echo ""

# 2. 檢查 MySQL 認證方式
echo "2️⃣ 檢查 MySQL 認證方式..."
if [ -f .env ]; then
    source .env
    AUTH=$($SUDO docker exec traffic-mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} -sN -e "SELECT plugin FROM mysql.user WHERE user='${MYSQL_USER}' LIMIT 1;" 2>/dev/null || echo "ERROR")
    
    if [ "$AUTH" = "caching_sha2_password" ]; then
        echo -e "${RED}❌ 發現問題：MySQL 使用不兼容的認證方式${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
        echo "   修復：執行認證修復..."
        
        if [ -f fix-mysql-auth.sh ]; then
            bash fix-mysql-auth.sh
            FIXES_APPLIED=$((FIXES_APPLIED + 1))
        fi
    elif [ "$AUTH" = "mysql_native_password" ]; then
        echo -e "${GREEN}✓ MySQL 認證方式正確${NC}"
    else
        echo -e "${YELLOW}⚠️  無法檢查 MySQL 認證方式${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  找不到 .env 檔案${NC}"
fi
echo ""

# 3. 檢查記憶體使用
echo "3️⃣ 檢查系統記憶體..."
if command -v free &> /dev/null; then
    MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    SWAP_TOTAL=$(free -m | awk 'NR==3{print $2}')
    
    if [ "$MEM_USAGE" -gt 85 ] && [ "$SWAP_TOTAL" -eq 0 ]; then
        echo -e "${RED}❌ 發現問題：記憶體使用率高 (${MEM_USAGE}%) 且未啟用 Swap${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
        echo "   建議：執行 'sudo bash add-swap.sh' 增加 Swap"
    elif [ "$MEM_USAGE" -gt 90 ]; then
        echo -e "${YELLOW}⚠️  記憶體使用率高 (${MEM_USAGE}%)${NC}"
        echo "   建議：考慮升級 VM 或增加 Swap"
    else
        echo -e "${GREEN}✓ 記憶體使用正常 (${MEM_USAGE}%)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  無法檢查記憶體${NC}"
fi
echo ""

# 4. 檢查磁碟空間
echo "4️⃣ 檢查磁碟空間..."
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 85 ]; then
    echo -e "${RED}❌ 發現問題：磁碟使用率高 (${DISK_USAGE}%)${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    echo "   建議清理："
    echo "   sudo docker system prune -a"
    echo "   sudo journalctl --vacuum-time=7d"
else
    echo -e "${GREEN}✓ 磁碟空間充足 (已使用 ${DISK_USAGE}%)${NC}"
fi
echo ""

# 5. 檢查外部訪問配置
echo "5️⃣ 檢查外部訪問配置..."
if [ -f .env ]; then
    API_BASE=$(grep NEXT_PUBLIC_API_BASE .env | cut -d '=' -f2)
    if echo "$API_BASE" | grep -q "localhost"; then
        echo -e "${YELLOW}⚠️  注意：API_BASE 使用 localhost，外部無法訪問${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
        echo "   修復：執行 'bash configure-external-access.sh' 配置外部訪問"
    else
        echo -e "${GREEN}✓ 外部訪問已配置${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  找不到 .env 檔案${NC}"
fi
echo ""

# 6. 檢查防火牆
echo "6️⃣ 檢查 GCP 防火牆..."
if command -v gcloud &> /dev/null; then
    FW_RULE=$(gcloud compute firewall-rules list --filter="name:allow-traffic-app" --format="value(name)" 2>/dev/null || echo "")
    if [ -z "$FW_RULE" ]; then
        echo -e "${YELLOW}⚠️  未找到防火牆規則 'allow-traffic-app'${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
        echo "   建議：在 GCP Console 開放 ports 3000, 8000, 1337"
        echo "   或執行："
        echo "   gcloud compute firewall-rules create allow-traffic-app \\"
        echo "     --direction=INGRESS --action=ALLOW \\"
        echo "     --rules=tcp:3000,tcp:8000,tcp:1337 --source-ranges=0.0.0.0/0"
    else
        echo -e "${GREEN}✓ 防火牆規則已設置 ($FW_RULE)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  未安裝 gcloud CLI，無法檢查防火牆${NC}"
    echo "   請在 GCP Console 手動確認"
fi
echo ""

# 總結
echo "========================================"
echo "📊 檢測總結"
echo "========================================"
echo ""
echo "發現問題: $ISSUES_FOUND 個"
echo "已自動修復: $FIXES_APPLIED 個"
echo ""

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ 未發現問題，系統運行正常！${NC}"
elif [ $FIXES_APPLIED -gt 0 ]; then
    echo -e "${GREEN}✅ 已自動修復部分問題${NC}"
    echo ""
    echo "建議執行以下命令確認："
    echo "  bash check-services.sh"
else
    echo -e "${YELLOW}⚠️  發現問題但無法自動修復${NC}"
    echo ""
    echo "建議執行："
    echo "  bash check-services.sh    # 檢查服務狀態"
    echo "  bash diagnose.sh          # 詳細診斷"
fi

echo ""
echo "========================================"

