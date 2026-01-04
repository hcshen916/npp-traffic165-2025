#!/bin/bash

# 安全清理腳本 - 釋放磁碟空間但保護資料庫資料
# 此腳本不會刪除資料庫資料或 CMS 上傳檔案

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "========================================"
echo "🧹 安全清理 Docker 資源"
echo "========================================"
echo ""

# 顯示目前磁碟使用情況
echo -e "${BLUE}📊 當前磁碟使用情況:${NC}"
df -h . | head -2
echo ""

# 顯示 Docker 使用情況
echo -e "${BLUE}📊 Docker 磁碟使用情況:${NC}"
docker system df
echo ""

# 警告訊息
echo -e "${YELLOW}⚠️  此腳本將清理以下資源：${NC}"
echo "   - 懸空的 Docker images (dangling images)"
echo "   - 已停止的容器"
echo "   - 未使用的網路"
echo "   - Docker build cache (保留最近 1GB)"
echo ""
echo -e "${GREEN}✅ 以下資源將被保護：${NC}"
echo "   - ./db/data 目錄 (資料庫資料)"
echo "   - cms_uploads volume (CMS 上傳檔案)"
echo "   - 正在運行的容器"
echo "   - 正在使用的 images"
echo ""

# 確認
read -p "是否繼續清理？(y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "已取消清理"
    exit 0
fi

echo ""
echo "開始清理..."
echo ""

# 清理懸空 images
echo -e "${BLUE}ℹ️  清理懸空的 images...${NC}"
DANGLING_IMAGES=$(docker images -f "dangling=true" -q 2>/dev/null | wc -l)
if [ "$DANGLING_IMAGES" -gt 0 ]; then
    docker image prune -f
    echo -e "${GREEN}   已清理 $DANGLING_IMAGES 個懸空 images${NC}"
else
    echo "   沒有懸空 images 需要清理"
fi

# 清理已停止的容器
echo -e "${BLUE}ℹ️  清理已停止的容器...${NC}"
STOPPED_CONTAINERS=$(docker ps -a -f "status=exited" -q 2>/dev/null | wc -l)
if [ "$STOPPED_CONTAINERS" -gt 0 ]; then
    docker container prune -f
    echo -e "${GREEN}   已清理 $STOPPED_CONTAINERS 個已停止容器${NC}"
else
    echo "   沒有已停止容器需要清理"
fi

# 清理未使用的網路
echo -e "${BLUE}ℹ️  清理未使用的網路...${NC}"
docker network prune -f 2>/dev/null || true
echo "   網路清理完成"

# 清理 build cache
echo -e "${BLUE}ℹ️  清理 build cache...${NC}"
docker builder prune -f --keep-storage=1GB 2>/dev/null || true
echo "   Build cache 清理完成 (保留最近 1GB)"

# 清理日誌
echo -e "${BLUE}ℹ️  截斷 Docker 容器日誌...${NC}"
CONTAINERS=$(docker ps -q 2>/dev/null)
if [ -n "$CONTAINERS" ]; then
    for container in $CONTAINERS; do
        # 截斷日誌到最後 1000 行
        LOG_PATH=$(docker inspect --format='{{.LogPath}}' "$container" 2>/dev/null)
        if [ -n "$LOG_PATH" ] && [ -f "$LOG_PATH" ]; then
            # 需要 sudo 權限來截斷日誌
            sudo truncate -s 0 "$LOG_PATH" 2>/dev/null || true
        fi
    done
    echo "   容器日誌已截斷"
else
    echo "   沒有運行中的容器"
fi

echo ""
echo "========================================"
echo -e "${GREEN}🎉 清理完成！${NC}"
echo "========================================"
echo ""

# 顯示清理後的磁碟使用情況
echo -e "${BLUE}📊 清理後磁碟使用情況:${NC}"
df -h . | head -2
echo ""

echo -e "${BLUE}📊 清理後 Docker 使用情況:${NC}"
docker system df
echo ""

# 額外建議
AVAILABLE_SPACE=$(df -m . | tail -1 | awk '{print $4}')
if [ "$AVAILABLE_SPACE" -lt 2000 ]; then
    echo -e "${YELLOW}⚠️  磁碟空間仍然較少 (${AVAILABLE_SPACE} MB)${NC}"
    echo ""
    echo "如果需要更多空間，可以考慮："
    echo "  1. 刪除舊的備份檔案"
    echo "  2. 執行 'docker system prune -a' (會刪除所有未使用的 images)"
    echo "  3. 檢查並清理 /var/log 目錄中的舊日誌"
    echo ""
    echo -e "${RED}⚠️  請勿刪除以下目錄：${NC}"
    echo "  - ./db/data (資料庫資料)"
    echo "  - cms_uploads volume (CMS 上傳檔案)"
else
    echo -e "${GREEN}✅ 磁碟空間充足 (${AVAILABLE_SPACE} MB)${NC}"
fi
echo ""

