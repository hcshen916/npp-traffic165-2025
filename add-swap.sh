#!/bin/bash

################################################################################
# 增加 Swap 空間腳本
# 此腳本會建立 swap 檔案以增加虛擬記憶體
################################################################################

set -e

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "========================================"
echo "💾 增加系統 Swap 空間"
echo "========================================"
echo ""

# 檢查是否有 sudo 權限
if [ "$EUID" -ne 0 ]; then 
    if ! sudo -n true 2>/dev/null; then
        echo -e "${RED}錯誤: 此腳本需要 sudo 權限${NC}"
        echo "請執行: sudo bash add-swap.sh"
        exit 1
    fi
    SUDO="sudo"
else
    SUDO=""
fi

# 1. 檢查當前記憶體狀況
echo "📊 當前記憶體狀況："
echo ""
free -h
echo ""

# 2. 檢查是否已有 swap
echo "🔍 檢查現有 Swap..."
CURRENT_SWAP=$($SUDO swapon --show 2>/dev/null || echo "")

if [ -n "$CURRENT_SWAP" ]; then
    echo -e "${YELLOW}⚠️  系統已有 Swap:${NC}"
    echo "$CURRENT_SWAP"
    echo ""
    read -p "是否要增加更多 Swap？(y/n): " CONTINUE
    
    if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
        echo "取消操作"
        exit 0
    fi
fi

# 3. 選擇 Swap 大小
echo ""
echo "請選擇要建立的 Swap 大小："
echo "  1) 2GB  (適合 2GB RAM 的 VM)"
echo "  2) 4GB  (適合 4GB RAM 的 VM，推薦)"
echo "  3) 8GB  (適合 8GB+ RAM 的 VM)"
echo "  4) 自訂大小"
echo ""
read -p "請選擇 (1-4): " CHOICE

case $CHOICE in
    1)
        SWAP_SIZE="2G"
        ;;
    2)
        SWAP_SIZE="4G"
        ;;
    3)
        SWAP_SIZE="8G"
        ;;
    4)
        read -p "請輸入大小（例如: 3G）: " SWAP_SIZE
        ;;
    *)
        echo -e "${RED}無效選擇，使用預設 2G${NC}"
        SWAP_SIZE="2G"
        ;;
esac

echo ""
echo "將建立 $SWAP_SIZE 的 Swap 空間"
echo ""

# 4. 檢查磁碟空間
DISK_AVAIL=$(df / | tail -1 | awk '{print $4}')
DISK_AVAIL_GB=$((DISK_AVAIL / 1024 / 1024))

echo "可用磁碟空間: ${DISK_AVAIL_GB} GB"

SWAP_SIZE_NUM=$(echo $SWAP_SIZE | sed 's/G//')
if [ "$DISK_AVAIL_GB" -lt "$SWAP_SIZE_NUM" ]; then
    echo -e "${RED}❌ 錯誤: 磁碟空間不足以建立 $SWAP_SIZE Swap${NC}"
    exit 1
fi

# 5. 建立 Swap 檔案
SWAP_FILE="/swapfile_$(date +%Y%m%d_%H%M%S)"

echo ""
echo "📝 建立 Swap 檔案: $SWAP_FILE"
echo "這可能需要幾分鐘..."
$SUDO fallocate -l $SWAP_SIZE $SWAP_FILE

if [ ! -f $SWAP_FILE ]; then
    echo -e "${YELLOW}⚠️  fallocate 失敗，使用 dd 建立...${NC}"
    $SUDO dd if=/dev/zero of=$SWAP_FILE bs=1M count=$((SWAP_SIZE_NUM * 1024)) status=progress
fi

# 6. 設定權限
echo ""
echo "🔒 設定檔案權限..."
$SUDO chmod 600 $SWAP_FILE

# 7. 設定 Swap
echo ""
echo "⚙️  設定 Swap..."
$SUDO mkswap $SWAP_FILE

# 8. 啟用 Swap
echo ""
echo "✅ 啟用 Swap..."
$SUDO swapon $SWAP_FILE

# 9. 設定開機自動掛載
echo ""
echo "📌 設定開機自動掛載..."
if ! grep -q "$SWAP_FILE" /etc/fstab; then
    echo "$SWAP_FILE none swap sw 0 0" | $SUDO tee -a /etc/fstab
    echo -e "${GREEN}✓ 已加入 /etc/fstab${NC}"
else
    echo -e "${YELLOW}⚠️  /etc/fstab 已包含此 Swap 設定${NC}"
fi

# 10. 優化 Swap 使用策略
echo ""
echo "⚙️  優化 Swap 使用策略..."
$SUDO sysctl vm.swappiness=10
if ! grep -q "vm.swappiness" /etc/sysctl.conf; then
    echo "vm.swappiness=10" | $SUDO tee -a /etc/sysctl.conf
fi

# 11. 驗證結果
echo ""
echo "========================================"
echo -e "${GREEN}✅ Swap 設定完成！${NC}"
echo "========================================"
echo ""
echo "📊 更新後的記憶體狀況："
echo ""
free -h
echo ""
echo "💾 Swap 詳細資訊："
$SUDO swapon --show
echo ""
echo "✅ 系統已增加 $SWAP_SIZE 的虛擬記憶體"
echo ""
echo "📝 提示："
echo "  • Swap 檔案位置: $SWAP_FILE"
echo "  • Swappiness 設定為 10 (僅在必要時使用 Swap)"
echo "  • 開機會自動掛載"
echo ""

