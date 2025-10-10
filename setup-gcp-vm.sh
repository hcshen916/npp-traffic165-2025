#!/bin/bash

################################################################################
# 交通事故數據系統 - GCP VM 部署腳本
# 此腳本將自動安裝所有依賴並啟動所有服務
################################################################################

set -e  # 遇到錯誤立即停止

echo "========================================"
echo "🚀 開始部署交通事故數據系統到 GCP VM"
echo "========================================"

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 檢查是否為 root 或有 sudo 權限
if [ "$EUID" -ne 0 ]; then 
    if ! sudo -n true 2>/dev/null; then
        echo -e "${RED}錯誤: 此腳本需要 sudo 權限${NC}"
        echo "請執行: sudo bash setup-gcp-vm.sh"
        exit 1
    fi
    SUDO="sudo"
else
    SUDO=""
fi

# 1. 更新系統套件
echo ""
echo "📦 步驟 1/7: 更新系統套件..."
$SUDO apt-get update
$SUDO apt-get upgrade -y

# 2. 安裝必要工具
echo ""
echo "🔧 步驟 2/7: 安裝必要工具..."
$SUDO apt-get install -y \
    curl \
    wget \
    git \
    ca-certificates \
    gnupg \
    lsb-release

# 3. 安裝 Docker
echo ""
echo "🐳 步驟 3/7: 安裝 Docker..."
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ Docker 已安裝，版本: $(docker --version)${NC}"
else
    echo "安裝 Docker..."
    
    # 移除舊版本
    $SUDO apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # 偵測系統類型
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
    else
        echo "無法偵測系統類型，預設使用 debian"
        OS="debian"
    fi
    
    echo "偵測到系統: $OS"
    
    # 設定 Docker 官方 GPG key
    $SUDO install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/${OS}/gpg | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    $SUDO chmod a+r /etc/apt/keyrings/docker.gpg
    
    # 設定 Docker repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${OS} \
      $(lsb_release -cs) stable" | $SUDO tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # 安裝 Docker Engine
    $SUDO apt-get update
    $SUDO apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # 啟動 Docker 服務
    $SUDO systemctl start docker
    $SUDO systemctl enable docker
    
    # 將當前使用者加入 docker 群組（避免每次都要 sudo）
    if [ -n "$SUDO_USER" ]; then
        $SUDO usermod -aG docker $SUDO_USER
        echo -e "${YELLOW}⚠️  請注意: 您需要重新登入才能在沒有 sudo 的情況下使用 Docker${NC}"
    fi
    
    echo -e "${GREEN}✓ Docker 安裝完成: $(docker --version)${NC}"
fi

# 4. 安裝 Docker Compose（獨立版本，作為備用）
echo ""
echo "📦 步驟 4/7: 確認 Docker Compose..."
if docker compose version &> /dev/null; then
    echo -e "${GREEN}✓ Docker Compose (plugin) 已可用: $(docker compose version)${NC}"
elif command -v docker-compose &> /dev/null; then
    echo -e "${GREEN}✓ Docker Compose 已安裝: $(docker-compose --version)${NC}"
else
    echo "安裝 Docker Compose 獨立版本..."
    DOCKER_COMPOSE_VERSION="v2.24.5"
    $SUDO curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    $SUDO chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✓ Docker Compose 安裝完成: $(docker-compose --version)${NC}"
fi

# 5. 檢查 .env 檔案
echo ""
echo "⚙️  步驟 5/7: 檢查環境變數設定..."
if [ ! -f .env ]; then
    echo -e "${RED}❌ 找不到 .env 檔案${NC}"
    echo ""
    echo "請先建立 .env 檔案。您可以使用以下命令快速建立："
    echo ""
    echo -e "${YELLOW}請參考 README 或執行 create-env.sh 來建立 .env 檔案${NC}"
    echo ""
    exit 1
else
    echo -e "${GREEN}✓ .env 檔案已存在${NC}"
    
    # 檢查必要的環境變數
    required_vars=("MYSQL_ROOT_PASSWORD" "MYSQL_DATABASE" "MYSQL_USER" "MYSQL_PASSWORD")
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" .env; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        echo -e "${RED}❌ .env 檔案缺少以下必要變數:${NC}"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        exit 1
    fi
fi

# 6. 建立必要的目錄
echo ""
echo "📁 步驟 6/7: 建立必要的目錄..."
mkdir -p db/data
mkdir -p cms/public/uploads
echo -e "${GREEN}✓ 目錄建立完成${NC}"

# 7. 啟動服務
echo ""
echo "🚀 步驟 7/7: 啟動所有服務..."

# 檢查磁碟空間
echo "檢查磁碟空間..."
DISK_AVAIL=$(df / | tail -1 | awk '{print $4}')
DISK_AVAIL_GB=$((DISK_AVAIL / 1024 / 1024))
echo "可用磁碟空間: ${DISK_AVAIL_GB} GB"

if [ "$DISK_AVAIL_GB" -lt 5 ]; then
    echo -e "${YELLOW}⚠️  警告: 磁碟空間不足 5GB，執行深度清理...${NC}"
    
    # 停止所有容器
    echo "停止所有容器..."
    $SUDO docker stop $($SUDO docker ps -aq) 2>/dev/null || true
    
    # 移除所有容器
    echo "移除所有容器..."
    $SUDO docker rm $($SUDO docker ps -aq) 2>/dev/null || true
    
    # 深度清理 Docker 資源
    echo "深度清理 Docker 資源（包含 volumes、images、cache）..."
    $SUDO docker system prune -a -f --volumes
    
    # 清理 apt 快取
    echo "清理 APT 快取..."
    $SUDO apt-get clean
    $SUDO apt-get autoclean
    $SUDO apt-get autoremove -y
    
    # 再次檢查空間
    DISK_AVAIL_AFTER=$(df / | tail -1 | awk '{print $4}')
    DISK_AVAIL_AFTER_GB=$((DISK_AVAIL_AFTER / 1024 / 1024))
    echo "清理後可用空間: ${DISK_AVAIL_AFTER_GB} GB"
    
    if [ "$DISK_AVAIL_AFTER_GB" -lt 3 ]; then
        echo -e "${RED}❌ 錯誤: 磁碟空間仍然不足！${NC}"
        echo "請增加 VM 磁碟大小或手動清理檔案"
        echo ""
        echo "磁碟使用狀況:"
        df -h /
        echo ""
        echo "大型目錄:"
        $SUDO du -h --max-depth=1 / 2>/dev/null | sort -hr | head -10
        exit 1
    fi
else
    # 停止可能正在運行的舊容器
    echo "停止舊容器..."
    $SUDO docker compose down 2>/dev/null || $SUDO docker-compose down 2>/dev/null || true
    
    # 清理未使用的 Docker 資源
    echo "清理 Docker 資源..."
    $SUDO docker system prune -f
fi

# 構建並啟動服務
echo "構建並啟動服務..."
if docker compose version &> /dev/null; then
    $SUDO docker compose up -d --build
else
    $SUDO docker-compose up -d --build
fi

# 8. 等待服務啟動
echo ""
echo "⏳ 等待服務啟動..."
sleep 10

# 9. 檢查服務狀態
echo ""
echo "📊 檢查服務狀態..."
if docker compose version &> /dev/null; then
    $SUDO docker compose ps
else
    $SUDO docker-compose ps
fi

# 10. 初始化資料庫
echo ""
echo "🗄️  初始化資料庫..."
if [ -f init_database.sql ]; then
    echo "等待 MySQL 完全啟動..."
    sleep 20
    
    # 從 .env 讀取資料庫密碼
    source .env
    
    echo "執行資料庫初始化腳本..."
    $SUDO docker exec -i traffic-mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} < init_database.sql
    
    echo -e "${GREEN}✓ 資料庫初始化完成${NC}"
else
    echo -e "${YELLOW}⚠️  找不到 init_database.sql，跳過資料庫初始化${NC}"
fi

# 10.5 修正 MySQL 用戶認證（確保 Strapi 可以連接）
echo ""
echo "🔐 確認 MySQL 用戶認證方式..."
# 從 .env 讀取變數
source .env

# 檢查並修正用戶認證
echo "檢查 MySQL 用戶 ${MYSQL_USER} 的認證方式..."
AUTH_PLUGIN=$($SUDO docker exec traffic-mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} -sN -e "SELECT plugin FROM mysql.user WHERE user='${MYSQL_USER}' LIMIT 1;" 2>/dev/null || echo "")

if [ "$AUTH_PLUGIN" = "caching_sha2_password" ]; then
    echo "偵測到不兼容的認證方式，正在修正為 mysql_native_password..."
    $SUDO docker exec traffic-mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} -e "ALTER USER '${MYSQL_USER}'@'%' IDENTIFIED WITH mysql_native_password BY '${MYSQL_PASSWORD}'; FLUSH PRIVILEGES;" 2>/dev/null
    echo -e "${GREEN}✓ MySQL 用戶認證方式已修正${NC}"
elif [ "$AUTH_PLUGIN" = "mysql_native_password" ]; then
    echo -e "${GREEN}✓ MySQL 用戶認證方式正確${NC}"
else
    echo -e "${YELLOW}⚠️  無法確認 MySQL 用戶認證方式（可能是首次部署，容器還在啟動中）${NC}"
fi

# 10.6 檢查並修復 CMS Admin Panel
echo ""
echo "🎨 檢查 Strapi CMS Admin Panel..."
sleep 5

# 檢查 CMS 容器狀態
CMS_STATUS=$($SUDO docker inspect -f '{{.State.Status}}' traffic-cms 2>/dev/null || echo "not_found")

if [ "$CMS_STATUS" = "running" ]; then
    echo "CMS 容器正在運行，檢查 admin build..."
    
    # 檢查 build 目錄是否存在
    BUILD_EXISTS=$($SUDO docker exec traffic-cms test -f /srv/app/build/index.html && echo "yes" || echo "no")
    
    if [ "$BUILD_EXISTS" = "no" ]; then
        echo -e "${YELLOW}⚠️  Admin panel 未 build，正在執行 build（這需要 2-5 分鐘）...${NC}"
        $SUDO docker exec traffic-cms npm run build
        echo -e "${GREEN}✓ Admin panel build 完成${NC}"
    else
        echo -e "${GREEN}✓ Admin panel 已經 build${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  CMS 容器未運行或還在啟動中，稍後可能需要手動檢查${NC}"
fi

# 11. 配置防火牆（如果使用 ufw）
echo ""
echo "🔥 配置防火牆規則..."
if command -v ufw &> /dev/null; then
    $SUDO ufw allow 3000/tcp comment "Next.js Frontend"
    $SUDO ufw allow 8000/tcp comment "FastAPI Backend"
    $SUDO ufw allow 1337/tcp comment "Strapi CMS"
    echo -e "${GREEN}✓ 防火牆規則已設定${NC}"
else
    echo -e "${YELLOW}⚠️  系統未安裝 ufw，請手動配置防火牆${NC}"
fi

# 12. 取得外部 IP
echo ""
echo "🌐 取得 VM 外部 IP..."
EXTERNAL_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo "無法取得")
INTERNAL_IP=$(hostname -I | awk '{print $1}')

# 完成
echo ""
echo "========================================"
echo -e "${GREEN}✅ 部署完成！${NC}"
echo "========================================"
echo ""
echo "📍 IP 資訊:"
echo "  • 內部 IP: $INTERNAL_IP"
echo "  • 外部 IP: $EXTERNAL_IP"
echo ""
echo "📌 服務連結 (內部訪問):"
echo "  • Frontend:  http://$INTERNAL_IP:3000"
echo "  • Backend:   http://$INTERNAL_IP:8000/docs"
echo "  • CMS Admin: http://$INTERNAL_IP:1337/admin"
echo ""

if [ "$EXTERNAL_IP" != "無法取得" ]; then
    echo "🌍 服務連結 (外部訪問):"
    echo "  • Frontend:  http://$EXTERNAL_IP:3000"
    echo "  • Backend:   http://$EXTERNAL_IP:8000/docs"
    echo "  • CMS Admin: http://$EXTERNAL_IP:1337/admin"
    echo ""
fi

echo "📝 常用命令:"
echo "  • 查看所有服務: docker compose ps"
echo "  • 查看日誌:     docker compose logs -f [service_name]"
echo "  • 重啟服務:     docker compose restart [service_name]"
echo "  • 停止所有服務: docker compose down"
echo "  • 啟動所有服務: docker compose up -d"
echo ""
echo "🔍 檢查服務狀態:"
echo "  bash check-services.sh"
echo ""
echo -e "${YELLOW}⚠️  重要提醒:${NC}"
echo ""
echo "1. 【GCP 防火牆設定】"
echo "   請在 GCP Console 開放以下 ports:"
echo "   - 前往 VPC 網路 → 防火牆"
echo "   - 建立規則允許 tcp:3000,8000,1337"
echo "   - 或執行: gcloud compute firewall-rules create allow-traffic-app \\"
echo "     --direction=INGRESS --action=ALLOW \\"
echo "     --rules=tcp:3000,tcp:8000,tcp:1337 --source-ranges=0.0.0.0/0"
echo ""
echo "2. 【外部訪問設定】"
if [ "$EXTERNAL_IP" != "無法取得" ]; then
    echo "   如需從外部訪問，請執行以下命令更新 .env:"
    echo ""
    echo "   sed -i 's|NEXT_PUBLIC_API_BASE=http://localhost:8000|NEXT_PUBLIC_API_BASE=http://$EXTERNAL_IP:8000|g' .env"
    echo "   sed -i 's|NEXT_PUBLIC_CMS_BASE=http://localhost:1337|NEXT_PUBLIC_CMS_BASE=http://$EXTERNAL_IP:1337|g' .env"
    echo "   docker compose restart frontend"
    echo ""
fi
echo "3. 【首次使用 CMS】"
echo "   訪問 http://$EXTERNAL_IP:1337/admin 建立管理員帳號"
echo ""
echo "4. 【系統資源】"
echo "   建議 VM 規格: 2 vCPU, 8GB RAM"
echo "   如果記憶體不足，可增加 Swap: bash add-swap.sh"
echo ""
echo "🎉 一切準備就緒！享受使用！"
echo ""

