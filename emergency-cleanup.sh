#!/bin/bash

################################################################################
# 緊急磁碟空間清理腳本
# 當 VM 磁碟空間不足時使用此腳本
################################################################################

echo "========================================"
echo "🧹 緊急磁碟空間清理"
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
    if ! sudo -n true 2>/dev/null; then
        echo -e "${RED}此腳本需要 sudo 權限${NC}"
        echo "請執行: sudo bash emergency-cleanup.sh"
        exit 1
    fi
    SUDO="sudo"
else
    SUDO=""
fi

# 顯示當前磁碟使用狀況
echo -e "${BLUE}📊 當前磁碟使用狀況:${NC}"
df -h /
echo ""

DISK_AVAIL=$(df / | tail -1 | awk '{print $4}')
DISK_AVAIL_GB=$((DISK_AVAIL / 1024 / 1024))
echo -e "可用空間: ${YELLOW}${DISK_AVAIL_GB} GB${NC}"
echo ""

# 1. 停止並移除所有 Docker 容器
echo -e "${BLUE}1️⃣  停止並移除所有 Docker 容器...${NC}"
if command -v docker &> /dev/null; then
    echo "停止所有容器..."
    $SUDO docker stop $($SUDO docker ps -aq) 2>/dev/null || true
    
    echo "移除所有容器..."
    $SUDO docker rm $($SUDO docker ps -aq) 2>/dev/null || true
    
    echo -e "${GREEN}✓ 容器清理完成${NC}"
else
    echo "Docker 未安裝，跳過"
fi
echo ""

# 2. 深度清理 Docker 資源
echo -e "${BLUE}2️⃣  深度清理 Docker 資源...${NC}"
if command -v docker &> /dev/null; then
    echo "清理所有未使用的 images, containers, volumes, networks..."
    $SUDO docker system prune -a -f --volumes
    
    echo "清理 build cache..."
    $SUDO docker builder prune -a -f
    
    echo -e "${GREEN}✓ Docker 清理完成${NC}"
    
    # 顯示 Docker 空間使用
    echo ""
    echo "Docker 磁碟使用狀況:"
    $SUDO docker system df
else
    echo "Docker 未安裝，跳過"
fi
echo ""

# 3. 清理 APT 快取
echo -e "${BLUE}3️⃣  清理 APT 套件快取...${NC}"
$SUDO apt-get clean
$SUDO apt-get autoclean
$SUDO apt-get autoremove -y
echo -e "${GREEN}✓ APT 清理完成${NC}"
echo ""

# 4. 清理系統日誌
echo -e "${BLUE}4️⃣  清理系統日誌...${NC}"
if command -v journalctl &> /dev/null; then
    echo "清理 journalctl 日誌（保留最近 3 天）..."
    $SUDO journalctl --vacuum-time=3d
    echo -e "${GREEN}✓ 日誌清理完成${NC}"
fi
echo ""

# 5. 清理臨時檔案
echo -e "${BLUE}5️⃣  清理臨時檔案...${NC}"
$SUDO rm -rf /tmp/* 2>/dev/null || true
$SUDO rm -rf /var/tmp/* 2>/dev/null || true
echo -e "${GREEN}✓ 臨時檔案清理完成${NC}"
echo ""

# 6. 清理舊的核心檔案（小心執行）
echo -e "${BLUE}6️⃣  清理舊的 Linux 核心（如果有）...${NC}"
if command -v apt-get &> /dev/null; then
    CURRENT_KERNEL=$(uname -r)
    echo "當前核心版本: $CURRENT_KERNEL"
    echo "清理舊核心..."
    $SUDO apt-get autoremove --purge -y 2>/dev/null || true
    echo -e "${GREEN}✓ 核心清理完成${NC}"
fi
echo ""

# 7. 顯示清理後的結果
echo "========================================"
echo -e "${GREEN}✅ 清理完成！${NC}"
echo "========================================"
echo ""

echo -e "${BLUE}📊 清理後磁碟使用狀況:${NC}"
df -h /
echo ""

DISK_AVAIL_AFTER=$(df / | tail -1 | awk '{print $4}')
DISK_AVAIL_AFTER_GB=$((DISK_AVAIL_AFTER / 1024 / 1024))
FREED_SPACE=$((DISK_AVAIL_AFTER_GB - DISK_AVAIL_GB))

echo -e "可用空間: ${GREEN}${DISK_AVAIL_AFTER_GB} GB${NC}"
if [ "$FREED_SPACE" -gt 0 ]; then
    echo -e "釋放空間: ${GREEN}+${FREED_SPACE} GB${NC} 🎉"
fi
echo ""

# 8. 顯示最大的目錄
echo -e "${BLUE}📁 磁碟空間使用前 10 大目錄:${NC}"
$SUDO du -h --max-depth=1 / 2>/dev/null | sort -hr | head -10
echo ""

# 9. 建議
if [ "$DISK_AVAIL_AFTER_GB" -lt 5 ]; then
    echo -e "${YELLOW}⚠️  警告: 可用空間仍然不足 5GB${NC}"
    echo ""
    echo "建議採取以下措施:"
    echo "  1. 在 GCP Console 增加磁碟大小"
    echo "  2. 刪除不必要的大型檔案"
    echo "  3. 考慮使用外部儲存（如 Google Cloud Storage）"
    echo ""
    echo "如何增加 GCP VM 磁碟大小:"
    echo "  https://cloud.google.com/compute/docs/disks/resize-persistent-disk"
    echo ""
elif [ "$DISK_AVAIL_AFTER_GB" -lt 10 ]; then
    echo -e "${YELLOW}💡 建議: 可用空間少於 10GB，建議增加磁碟大小${NC}"
    echo ""
else
    echo -e "${GREEN}✅ 磁碟空間充足，可以繼續部署！${NC}"
    echo ""
    echo "下一步:"
    echo "  sudo bash setup-gcp-vm.sh"
    echo ""
fi

