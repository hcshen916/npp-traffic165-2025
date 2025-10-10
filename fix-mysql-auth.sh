#!/bin/bash

################################################################################
# MySQL 認證方式修復腳本
# 此腳本專門用於修正 MySQL 認證協議不兼容問題
################################################################################

set -e

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================"
echo "🔧 MySQL 認證方式修復工具"
echo "========================================"
echo ""

# 檢查是否有 sudo 權限
if [ "$EUID" -ne 0 ]; then 
    if ! sudo -n true 2>/dev/null; then
        echo -e "${RED}錯誤: 此腳本需要 sudo 權限${NC}"
        echo "請執行: sudo bash fix-mysql-auth.sh"
        exit 1
    fi
    SUDO="sudo"
else
    SUDO=""
fi

# 檢查 Docker Compose 命令
if docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="$SUDO docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="$SUDO docker-compose"
else
    echo -e "${RED}❌ 找不到 docker compose 命令${NC}"
    exit 1
fi

# 檢查 .env 檔案
if [ ! -f .env ]; then
    echo -e "${RED}❌ 找不到 .env 檔案${NC}"
    echo "請確認您在專案根目錄執行此腳本"
    exit 1
fi

# 1. 檢查 MySQL 容器狀態
echo "1️⃣ 檢查 MySQL 容器狀態..."
if ! $SUDO docker ps | grep -q traffic-mysql; then
    echo -e "${RED}❌ MySQL 容器未運行${NC}"
    echo ""
    echo "嘗試啟動 MySQL..."
    $COMPOSE_CMD up -d mysql
    sleep 10
fi

MYSQL_STATUS=$($SUDO docker inspect -f '{{.State.Status}}' traffic-mysql 2>/dev/null || echo "not_found")
if [ "$MYSQL_STATUS" != "running" ]; then
    echo -e "${RED}❌ MySQL 容器狀態異常: $MYSQL_STATUS${NC}"
    exit 1
fi
echo -e "${GREEN}✓ MySQL 容器正在運行${NC}"
echo ""

# 2. 等待 MySQL 就緒
echo "2️⃣ 等待 MySQL 就緒..."
MAX_WAIT=30
WAIT_COUNT=0
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    if $SUDO docker exec traffic-mysql mysqladmin ping -h localhost --silent 2>/dev/null; then
        echo -e "${GREEN}✓ MySQL 已就緒${NC}"
        break
    fi
    WAIT_COUNT=$((WAIT_COUNT + 1))
    echo -ne "   等待中... $WAIT_COUNT/$MAX_WAIT\r"
    sleep 2
done
echo ""

if [ $WAIT_COUNT -eq $MAX_WAIT ]; then
    echo -e "${RED}❌ MySQL 無法就緒${NC}"
    exit 1
fi
echo ""

# 3. 讀取環境變數
echo "3️⃣ 讀取環境變數..."
source .env

if [ -z "$MYSQL_ROOT_PASSWORD" ] || [ -z "$MYSQL_USER" ] || [ -z "$MYSQL_PASSWORD" ]; then
    echo -e "${RED}❌ 環境變數不完整${NC}"
    echo "請確認 .env 中包含 MYSQL_ROOT_PASSWORD, MYSQL_USER, MYSQL_PASSWORD"
    exit 1
fi

echo "MySQL User: $MYSQL_USER"
echo -e "${GREEN}✓ 環境變數已載入${NC}"
echo ""

# 4. 檢查當前認證方式
echo "4️⃣ 檢查當前認證方式..."
CURRENT_AUTH=$($SUDO docker exec traffic-mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} -sN -e "SELECT plugin FROM mysql.user WHERE user='${MYSQL_USER}' LIMIT 1;" 2>/dev/null || echo "ERROR")

if [ "$CURRENT_AUTH" = "ERROR" ]; then
    echo -e "${RED}❌ 無法查詢用戶認證方式${NC}"
    echo "可能的原因："
    echo "  1. MySQL root 密碼錯誤"
    echo "  2. 用戶 ${MYSQL_USER} 不存在"
    echo ""
    echo "顯示所有用戶："
    $SUDO docker exec traffic-mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} -e "SELECT user, host, plugin FROM mysql.user;" 2>/dev/null || echo "無法連接"
    exit 1
fi

echo "當前認證方式: ${CURRENT_AUTH}"
echo ""

# 5. 判斷是否需要修正
if [ "$CURRENT_AUTH" = "mysql_native_password" ]; then
    echo -e "${GREEN}✅ 認證方式已經正確，無需修正！${NC}"
    echo ""
    
    # 檢查 CMS 是否正常
    echo "檢查 CMS 容器狀態..."
    CMS_STATUS=$($SUDO docker inspect -f '{{.State.Status}}' traffic-cms 2>/dev/null || echo "not_found")
    echo "CMS 狀態: $CMS_STATUS"
    
    if [ "$CMS_STATUS" = "restarting" ]; then
        echo ""
        echo -e "${YELLOW}⚠️  CMS 容器正在重啟，這可能是其他問題${NC}"
        echo ""
        echo "查看 CMS 日誌："
        $COMPOSE_CMD logs cms --tail=30
    elif [ "$CMS_STATUS" = "running" ]; then
        echo -e "${GREEN}✓ CMS 也正常運行${NC}"
    fi
    
    exit 0
fi

# 6. 執行修正
echo "5️⃣ 修正認證方式..."
echo -e "${YELLOW}將 ${MYSQL_USER} 的認證方式從 ${CURRENT_AUTH} 改為 mysql_native_password${NC}"
echo ""

# 停止 CMS（避免連接錯誤干擾）
echo "暫時停止 CMS 容器..."
$COMPOSE_CMD stop cms
echo ""

# 執行修正
echo "執行 ALTER USER 命令..."
$SUDO docker exec traffic-mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} << EOF
-- 修改用戶認證方式
ALTER USER '${MYSQL_USER}'@'%' IDENTIFIED WITH mysql_native_password BY '${MYSQL_PASSWORD}';

-- 也修正 root 用戶（以防萬一）
ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY '${MYSQL_ROOT_PASSWORD}';
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${MYSQL_ROOT_PASSWORD}';

-- 刷新權限
FLUSH PRIVILEGES;

-- 顯示修正結果
SELECT user, host, plugin FROM mysql.user WHERE user IN ('${MYSQL_USER}', 'root');
EOF

echo ""
echo -e "${GREEN}✓ 修正命令已執行${NC}"
echo ""

# 7. 驗證修正結果
echo "6️⃣ 驗證修正結果..."
sleep 2

NEW_AUTH=$($SUDO docker exec traffic-mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} -sN -e "SELECT plugin FROM mysql.user WHERE user='${MYSQL_USER}' LIMIT 1;" 2>/dev/null)

if [ "$NEW_AUTH" = "mysql_native_password" ]; then
    echo -e "${GREEN}✅ 修正成功！${NC}"
    echo "用戶 ${MYSQL_USER} 現在使用 mysql_native_password 認證"
else
    echo -e "${RED}❌ 修正失敗${NC}"
    echo "當前認證方式仍為: $NEW_AUTH"
    echo ""
    echo "可能需要重建 MySQL 容器。請執行："
    echo "  sudo docker compose down mysql"
    echo "  sudo docker compose up -d mysql"
    exit 1
fi
echo ""

# 8. 測試連接
echo "7️⃣ 測試 CMS 能否連接 MySQL..."
CONNECTION_TEST=$($COMPOSE_CMD run --rm cms mysql -h mysql -u${MYSQL_USER} -p${MYSQL_PASSWORD} -e "SELECT 'Connection OK' as status;" 2>&1 || echo "FAILED")

if echo "$CONNECTION_TEST" | grep -q "Connection OK"; then
    echo -e "${GREEN}✓ CMS 可以成功連接 MySQL${NC}"
else
    echo -e "${YELLOW}⚠️  測試連接時出現問題：${NC}"
    echo "$CONNECTION_TEST"
fi
echo ""

# 9. 重啟 CMS
echo "8️⃣ 重啟 CMS 容器..."
$COMPOSE_CMD start cms
echo ""

echo "等待 CMS 啟動（30 秒）..."
for i in {30..1}; do
    echo -ne "   $i 秒\r"
    sleep 1
done
echo ""
echo ""

# 10. 檢查最終狀態
echo "9️⃣ 檢查最終狀態..."
echo ""
echo "所有容器狀態："
$COMPOSE_CMD ps
echo ""

echo "CMS 最新日誌："
$COMPOSE_CMD logs cms --tail=30
echo ""

# 11. 完成
echo "========================================"
echo -e "${GREEN}✅ 修復流程完成！${NC}"
echo "========================================"
echo ""

# 檢查 CMS 狀態
CMS_FINAL_STATUS=$($SUDO docker inspect -f '{{.State.Status}}' traffic-cms 2>/dev/null)
if [ "$CMS_FINAL_STATUS" = "running" ]; then
    echo -e "${GREEN}🎉 CMS 容器正在運行！${NC}"
    echo ""
    echo "請在瀏覽器測試："
    EXTERNAL_IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_VM_IP")
    echo "  http://$EXTERNAL_IP:1337/admin"
elif [ "$CMS_FINAL_STATUS" = "restarting" ]; then
    echo -e "${YELLOW}⚠️  CMS 仍在重啟${NC}"
    echo ""
    echo "這可能是其他問題，請檢查："
    echo "  1. 記憶體是否足夠：free -h"
    echo "  2. CMS 日誌：sudo docker compose logs cms"
    echo "  3. 是否需要 build admin panel：sudo docker exec traffic-cms npm run build"
else
    echo -e "${RED}⚠️  CMS 狀態異常: $CMS_FINAL_STATUS${NC}"
    echo ""
    echo "請查看日誌並診斷："
    echo "  sudo docker compose logs cms --tail=50"
fi

echo ""

