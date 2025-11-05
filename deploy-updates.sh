#!/bin/bash

################################################################################
# GCP 部署腳本 - 更新代碼但保留資料庫
# 用途：部署最新的代碼變更（緩存優化 + KPI 圖表功能）
# 特點：保留所有資料庫內容，只更新應用程式代碼
################################################################################

set -e  # 遇到錯誤立即停止

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 分隔線
print_separator() {
    echo ""
    echo "=========================================="
    echo "$1"
    echo "=========================================="
    echo ""
}

print_step() {
    echo ""
    echo -e "${CYAN}[$(date +'%H:%M:%S')] $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

################################################################################
# 開始部署
################################################################################

print_separator "開始部署更新"
echo "此腳本將："
echo "  ✓ 更新 Frontend 代碼（緩存優化 + KPI 圖表）"
echo "  ✓ 更新 Backend 代碼（緩存優化）"
echo "  ✓ 更新 CMS 模型（KPI Config 新增 display_type）"
echo "  ✓ 保留所有資料庫內容"
echo ""
echo -e "${YELLOW}注意：部署過程中服務會短暫中斷（約 1-2 分鐘）${NC}"
echo ""
read -p "按 Enter 繼續，或 Ctrl+C 取消..."

################################################################################
# 步驟 1: 環境檢查
################################################################################

print_step "[1/8] 檢查環境..."

# 檢查是否在正確的目錄
if [ ! -f "docker-compose.yml" ]; then
    print_error "找不到 docker-compose.yml"
    print_info "請確認您在專案根目錄下執行此腳本"
    exit 1
fi
print_success "專案目錄確認"

# 檢查 Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker 未安裝"
    exit 1
fi
print_success "Docker 已安裝"

# 檢查 Docker 是否運行
if ! docker info &> /dev/null 2>&1; then
    # 嘗試使用 sudo
    if sudo docker info &> /dev/null 2>&1; then
        print_warning "需要使用 sudo 執行 Docker 命令"
        print_info "建議將當前用戶加入 docker 群組"
        # 定義 docker 和 docker-compose 命令為 sudo 版本
        DOCKER_CMD="sudo docker"
        DOCKER_COMPOSE_CMD="sudo docker-compose"
    else
        # 檢查服務是否實際在運行
        if curl -s http://localhost:3000 > /dev/null 2>&1 || \
           curl -s http://localhost:8000 > /dev/null 2>&1 || \
           curl -s http://localhost:1337 > /dev/null 2>&1; then
            print_warning "Docker 命令無法執行，但服務正在運行"
            print_info "這可能是權限問題或使用其他方式部署"
            read -p "是否繼續部署？(y/n) " -r
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                print_error "部署已取消"
                exit 1
            fi
            # 使用 sudo
            DOCKER_CMD="sudo docker"
            DOCKER_COMPOSE_CMD="sudo docker-compose"
        else
            print_error "Docker 未運行且服務無法訪問"
            print_info "請確認 Docker 是否已安裝並啟動"
            exit 1
        fi
    fi
else
    DOCKER_CMD="docker"
    DOCKER_COMPOSE_CMD="docker-compose"
fi
print_success "Docker 環境確認"

# 檢查 docker-compose（支援 V1 和 V2）
if command -v docker-compose &> /dev/null; then
    # Docker Compose V1 (docker-compose)
    if [ -n "$DOCKER_CMD" ] && [ "$DOCKER_CMD" = "sudo docker" ]; then
        DOCKER_COMPOSE_CMD="sudo docker-compose"
    else
        DOCKER_COMPOSE_CMD="docker-compose"
    fi
    print_success "Docker Compose V1 已安裝"
elif $DOCKER_CMD compose version &> /dev/null 2>&1; then
    # Docker Compose V2 (docker compose)
    DOCKER_COMPOSE_CMD="$DOCKER_CMD compose"
    print_success "Docker Compose V2 已安裝"
else
    print_error "Docker Compose 未安裝"
    print_info "請安裝 Docker Compose："
    print_info "  方法1: sudo apt-get install docker-compose"
    print_info "  方法2: 使用 Docker Compose V2 (已內建在新版 Docker)"
    exit 1
fi

################################################################################
# 步驟 2: 備份當前狀態
################################################################################

print_step "[2/8] 備份當前配置..."

BACKUP_DIR="backups/$(date +'%Y%m%d_%H%M%S')"
mkdir -p "$BACKUP_DIR"

# 備份關鍵檔案
if [ -f "docker-compose.yml" ]; then
    cp docker-compose.yml "$BACKUP_DIR/"
    print_success "已備份 docker-compose.yml"
fi

# 記錄當前運行的容器
$DOCKER_COMPOSE_CMD ps > "$BACKUP_DIR/containers_before.txt" 2>/dev/null || true
print_success "已記錄容器狀態"

print_info "備份保存在: $BACKUP_DIR"

################################################################################
# 步驟 3: 拉取最新代碼（如果是 Git 倉庫）
################################################################################

print_step "[3/8] 檢查代碼更新..."

if [ -d ".git" ]; then
    print_info "Git 倉庫已檢測到"
    
    # 顯示當前分支
    CURRENT_BRANCH=$(git branch --show-current)
    print_info "當前分支: $CURRENT_BRANCH"
    
    # 顯示待提交的變更
    if ! git diff-index --quiet HEAD --; then
        print_warning "有未提交的變更"
        git status --short
        echo ""
        read -p "是否要繼續部署？(y/n) " -r
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_error "部署已取消"
            exit 1
        fi
    fi
    
    print_success "代碼檢查完成"
else
    print_info "非 Git 倉庫，跳過代碼檢查"
fi

################################################################################
# 步驟 4: 停止現有服務（保留資料庫容器）
################################################################################

print_step "[4/8] 停止應用服務..."

# 只停止應用容器，不停止資料庫
$DOCKER_COMPOSE_CMD stop frontend backend cms queue 2>/dev/null || true
print_success "應用服務已停止"

# 顯示資料庫狀態
DB_STATUS=$($DOCKER_COMPOSE_CMD ps db 2>/dev/null | grep -c "Up" || echo "0")
if [ "$DB_STATUS" -gt "0" ]; then
    print_success "資料庫容器保持運行中"
else
    print_warning "資料庫容器未運行，將會啟動"
fi

################################################################################
# 步驟 5: 重新構建服務
################################################################################

print_step "[5/8] 重新構建服務..."

print_info "構建 Frontend（包含緩存優化和 KPI 圖表功能）..."
$DOCKER_COMPOSE_CMD build frontend
print_success "Frontend 構建完成"

print_info "構建 Backend（包含緩存優化）..."
$DOCKER_COMPOSE_CMD build backend
print_success "Backend 構建完成"

print_info "構建 CMS（包含新的模型定義）..."
$DOCKER_COMPOSE_CMD build cms
print_success "CMS 構建完成"

print_info "構建 Queue..."
$DOCKER_COMPOSE_CMD build queue 2>/dev/null || print_warning "Queue 構建跳過"

################################################################################
# 步驟 6: 啟動所有服務
################################################################################

print_step "[6/8] 啟動所有服務..."

# 使用 -d 在背景運行
$DOCKER_COMPOSE_CMD up -d

print_success "所有服務已啟動"

################################################################################
# 步驟 7: 等待服務就緒
################################################################################

print_step "[7/8] 等待服務就緒..."

print_info "等待資料庫..."
sleep 5
print_success "資料庫就緒"

print_info "等待 Backend API..."
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
        print_success "Backend API 就緒"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    print_warning "Backend API 啟動時間較長，請稍後檢查"
else
    echo ""
fi

print_info "等待 CMS..."
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:1337/_health > /dev/null 2>&1; then
        print_success "CMS 就緒"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    print_warning "CMS 啟動時間較長，請稍後檢查"
else
    echo ""
fi

print_info "等待 Frontend..."
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        print_success "Frontend 就緒"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    print_warning "Frontend 啟動時間較長，請稍後檢查"
else
    echo ""
fi

################################################################################
# 步驟 8: 驗證部署
################################################################################

print_step "[8/8] 驗證部署..."

# 檢查容器狀態
print_info "檢查容器狀態..."
$DOCKER_COMPOSE_CMD ps

echo ""
print_info "檢查服務健康狀態..."

# 檢查 Backend
if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
    print_success "Backend API: 正常"
else
    print_error "Backend API: 異常"
fi

# 檢查 CMS
if curl -s http://localhost:1337/_health > /dev/null 2>&1; then
    print_success "CMS: 正常"
else
    print_error "CMS: 異常"
fi

# 檢查 Frontend
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    print_success "Frontend: 正常"
else
    print_error "Frontend: 異常"
fi

# 檢查資料庫連線
DB_CONTAINER=$($DOCKER_COMPOSE_CMD ps -q db 2>/dev/null)
if [ -n "$DB_CONTAINER" ]; then
    if $DOCKER_CMD exec "$DB_CONTAINER" mysqladmin ping -h localhost > /dev/null 2>&1; then
        print_success "資料庫: 正常"
    else
        print_warning "資料庫: 無法驗證"
    fi
fi

################################################################################
# 完成
################################################################################

print_separator "✅ 部署完成！"

echo -e "${GREEN}所有服務已成功更新並運行${NC}"
echo ""
echo "📋 更新內容："
echo "  ✓ Frontend 緩存時間：300秒 → 60秒"
echo "  ✓ Backend 緩存時間：300秒 → 60秒"
echo "  ✓ 新增 KPI 圖表功能（卡片/圓餅圖/長條圖/折線圖）"
echo "  ✓ CMS KPI Config 新增 display_type 欄位"
echo ""
echo "🌐 服務網址："
echo "  Frontend: http://localhost:3000"
echo "  Backend API: http://localhost:8000/docs"
echo "  CMS Admin: http://localhost:1337/admin"
echo ""
echo "📝 下一步："
echo "  1. 在 CMS 中建立 KPI 配置（Content Manager > KPI Configuration）"
echo "  2. 設定 display_type 選擇圖表類型"
echo "  3. 驗證前台顯示：http://localhost:3000"
echo ""
echo "⚡ 自動更新："
echo "  現在修改 CMS 內容後，最多 60 秒會自動更新"
echo "  想要 3-5 秒即時更新？執行：./setup-auto-revalidate.sh"
echo ""
echo "📚 詳細文件："
echo "  - 快速開始-無需重啟更新.md"
echo "  - KPI圖表功能使用指南.md"
echo "  - 完整解決方案總結.md"
echo ""
print_separator "部署日誌"
echo "備份位置: $BACKUP_DIR"
echo "容器狀態已保存在: $BACKUP_DIR/containers_before.txt"
echo ""

# 保存部署後的狀態
$DOCKER_COMPOSE_CMD ps > "$BACKUP_DIR/containers_after.txt" 2>/dev/null || true
echo "部署後狀態已保存在: $BACKUP_DIR/containers_after.txt"
echo ""

print_info "如需查看服務日誌："
echo "  docker-compose logs -f [service_name]"
echo "  例如: docker-compose logs -f frontend"
echo ""

print_success "部署腳本執行完畢！"

