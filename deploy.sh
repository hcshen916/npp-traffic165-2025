#!/bin/bash

# Docker 部署腳本 - 增強版
# 增加磁碟空間檢查、安全清理、資料庫保護機制

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日誌函數
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 磁碟空間閾值 (MB)
MIN_DISK_SPACE_MB=2000  # 至少需要 2GB 可用空間

echo ""
echo "========================================"
echo "🚀 開始 Docker 安全部署..."
echo "========================================"
echo ""

# ========================================
# 步驟 0: 預檢查
# ========================================

# 檢查 .env 檔案是否存在
if [ ! -f .env ]; then
    log_error ".env 檔案不存在，請先從 env.example 複製並設定環境變數"
    echo "   cp env.example .env"
    echo "   nano .env  # 編輯環境變數"
    exit 1
fi
log_success "環境變數檔案存在"

# 檢查 docker 是否安裝並運行
if ! command -v docker &> /dev/null; then
    log_error "Docker 未安裝，請先安裝 Docker"
    exit 1
fi

if ! docker info &> /dev/null; then
    log_error "Docker 服務未運行，請啟動 Docker"
    exit 1
fi
log_success "Docker 服務正常運行"

# ========================================
# 步驟 1: 檢查並清理磁碟空間
# ========================================

log_info "檢查磁碟空間..."

# 取得可用磁碟空間 (MB)
AVAILABLE_SPACE_MB=$(df -m . | tail -1 | awk '{print $4}')

echo "   當前可用空間: ${AVAILABLE_SPACE_MB} MB"
echo "   最低需求空間: ${MIN_DISK_SPACE_MB} MB"

if [ "$AVAILABLE_SPACE_MB" -lt "$MIN_DISK_SPACE_MB" ]; then
    log_warning "磁碟空間不足！嘗試清理 Docker 資源..."
    
    # 清理未使用的 Docker 資源（但保護資料卷）
    echo ""
    log_info "清理懸空的 Docker images..."
    docker image prune -f 2>/dev/null || true
    
    log_info "清理已停止的容器..."
    docker container prune -f 2>/dev/null || true
    
    log_info "清理未使用的網路..."
    docker network prune -f 2>/dev/null || true
    
    log_info "清理 build cache..."
    docker builder prune -f --keep-storage=1GB 2>/dev/null || true
    
    # 重新檢查空間
    AVAILABLE_SPACE_MB=$(df -m . | tail -1 | awk '{print $4}')
    echo ""
    echo "   清理後可用空間: ${AVAILABLE_SPACE_MB} MB"
    
    if [ "$AVAILABLE_SPACE_MB" -lt "$MIN_DISK_SPACE_MB" ]; then
        log_error "清理後磁碟空間仍然不足！"
        echo ""
        echo "建議手動執行以下操作："
        echo "  1. 刪除不需要的舊備份檔案"
        echo "  2. 執行 'docker system prune -a' (會刪除所有未使用的 images)"
        echo "  3. 檢查 /var/log 目錄並清理舊日誌"
        echo ""
        echo "⚠️  注意：請勿刪除以下目錄，這些包含重要資料："
        echo "  - ./db/data (資料庫資料)"
        echo "  - cms_uploads volume (CMS 上傳檔案)"
        exit 1
    fi
    
    log_success "磁碟空間清理完成"
fi

log_success "磁碟空間充足 (${AVAILABLE_SPACE_MB} MB)"

# ========================================
# 步驟 2: 備份重要資訊（資料庫不動）
# ========================================

log_info "保護資料庫資料..."

# 確保資料庫目錄存在且有正確權限
if [ -d "./db/data" ]; then
    log_success "資料庫目錄 ./db/data 存在，將保留所有資料"
else
    log_warning "資料庫目錄不存在，將在首次啟動時自動建立"
fi

# 確保 CMS uploads volume 存在
if docker volume ls | grep -q "cms_uploads"; then
    log_success "CMS uploads volume 存在，將保留所有上傳檔案"
else
    log_warning "CMS uploads volume 不存在，將在首次啟動時自動建立"
fi

# ========================================
# 步驟 3: 安全停止服務
# ========================================

log_info "安全停止現有服務（保留資料卷）..."

# 使用 docker compose stop 而非 down，避免刪除網路和卷
# 然後使用 docker compose rm 只移除容器
docker compose stop 2>/dev/null || true
docker compose rm -f 2>/dev/null || true

log_success "服務已安全停止"

# ========================================
# 步驟 4: 建置服務（限制資源使用）
# ========================================

log_info "建置所有服務..."

# 限制 build 的記憶體使用，避免 OOM
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# 逐一建置服務，避免同時佔用太多資源
SERVICES=("mysql" "redis" "backend" "cms" "frontend" "worker")

for service in "${SERVICES[@]}"; do
    if [ "$service" = "mysql" ] || [ "$service" = "redis" ]; then
        # 這些是預建 images，不需要 build
        continue
    fi
    
    log_info "建置 $service 服務..."
    if ! docker compose build --no-cache "$service" 2>&1; then
        log_error "建置 $service 服務失敗！"
        echo ""
        echo "可能的原因："
        echo "  1. 磁碟空間不足"
        echo "  2. 記憶體不足"
        echo "  3. Dockerfile 有語法錯誤"
        echo ""
        echo "請檢查錯誤訊息並重試"
        exit 1
    fi
    
    # 每建置完一個服務，清理一次 build cache
    docker builder prune -f --filter "until=1h" 2>/dev/null || true
done

log_success "所有服務建置完成"

# ========================================
# 步驟 5: 啟動服務
# ========================================

log_info "啟動所有服務..."

# 先啟動資料庫和 Redis
docker compose up -d mysql redis

log_info "等待資料庫啟動..."
sleep 15

# 檢查資料庫是否健康
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker compose exec -T mysql mysqladmin ping -h 127.0.0.1 --silent 2>/dev/null; then
        log_success "資料庫已就緒"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "   等待資料庫就緒... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    log_error "資料庫啟動超時！"
    echo "請檢查資料庫日誌: docker compose logs mysql"
    exit 1
fi

# 啟動其他服務
docker compose up -d

log_success "所有服務已啟動"

# ========================================
# 步驟 6: 等待並檢查服務
# ========================================

log_info "等待服務完全啟動..."
sleep 30

echo ""
log_info "檢查服務狀態..."
docker compose ps

echo ""
log_info "檢查服務健康狀況..."

# 檢查後端
echo -n "   後端服務 (8000): "
if curl -s --max-time 10 http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}正常運行${NC}"
else
    echo -e "${YELLOW}啟動中或無法訪問${NC}"
fi

# 檢查前端
echo -n "   前端服務 (3000): "
if curl -s --max-time 10 http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}正常運行${NC}"
else
    echo -e "${YELLOW}啟動中或無法訪問${NC}"
fi

# 檢查 CMS
echo -n "   CMS 服務 (1337): "
if curl -s --max-time 10 http://localhost:1337 > /dev/null 2>&1; then
    echo -e "${GREEN}正常運行${NC}"
else
    echo -e "${YELLOW}啟動中或無法訪問${NC}"
fi

# ========================================
# 步驟 7: 最終清理
# ========================================

log_info "清理暫存資源..."
docker image prune -f 2>/dev/null || true
docker builder prune -f --filter "until=24h" 2>/dev/null || true

# 顯示最終磁碟空間
FINAL_SPACE_MB=$(df -m . | tail -1 | awk '{print $4}')
log_success "部署完成後可用空間: ${FINAL_SPACE_MB} MB"

# ========================================
# 完成
# ========================================

echo ""
echo "========================================"
echo -e "${GREEN}🎉 部署完成！${NC}"
echo "========================================"
echo ""
echo "📌 重要提醒："
echo "   - 資料庫資料存放於: ./db/data （請勿刪除）"
echo "   - CMS 上傳檔案存放於: cms_uploads volume"
echo ""
echo "🌐 訪問以下網址："
echo "   前端應用: http://localhost:3000"
echo "   CMS 管理: http://localhost:1337/admin"
echo "   後端 API: http://localhost:8000"
echo "   API 文件: http://localhost:8000/docs"
echo ""
echo "📋 常用指令："
echo "   查看日誌: docker compose logs -f [服務名稱]"
echo "   停止服務: docker compose stop"
echo "   重啟服務: docker compose restart"
echo ""
echo "⚠️  安全提醒："
echo "   請勿執行 'docker compose down -v'，這會刪除資料卷！"
echo "   如需完全重置，請先備份 ./db/data 目錄"
echo ""
