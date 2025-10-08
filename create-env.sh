#!/bin/bash

################################################################################
# 快速建立 .env 檔案的腳本
# 此腳本會生成隨機密鑰並建立完整的 .env 檔案
################################################################################

echo "========================================"
echo "📝 建立環境變數檔案 (.env)"
echo "========================================"

# 檢查 .env 是否已存在
if [ -f .env ]; then
    echo "⚠️  .env 檔案已存在！"
    read -p "是否要覆蓋現有的 .env 檔案? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "取消操作。"
        exit 0
    fi
    # 備份現有的 .env
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "✓ 已備份現有 .env 檔案"
fi

# 生成隨機字串的函數
generate_random_string() {
    local length=${1:-32}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# 生成隨機十六進位字串
generate_hex_string() {
    local length=${1:-32}
    openssl rand -hex $((length / 2))
}

echo ""
echo "正在生成隨機密鑰..."

# 生成所有需要的密鑰
MYSQL_ROOT_PASSWORD=$(generate_random_string 16)
MYSQL_PASSWORD=$(generate_random_string 16)
ETL_SECRET=$(generate_random_string 32)
APP_KEYS=$(generate_random_string 32)
API_TOKEN_SALT=$(generate_random_string 32)
ADMIN_JWT_SECRET=$(generate_random_string 32)
JWT_SECRET=$(generate_random_string 32)
REVALIDATE_SECRET=$(generate_random_string 32)

# 建立 .env 檔案
cat > .env << EOF
# ==================== MySQL 資料庫設定 ====================
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
MYSQL_DATABASE=traffic
MYSQL_USER=traffic_user
MYSQL_PASSWORD=${MYSQL_PASSWORD}

# ==================== Redis 設定 ====================
REDIS_URL=redis://redis:6379/0

# ==================== Backend (FastAPI) 設定 ====================
ETL_SECRET=${ETL_SECRET}

# ==================== Strapi CMS 設定 ====================
# 這些密鑰用於加密和驗證，請妥善保管
APP_KEYS=${APP_KEYS}
API_TOKEN_SALT=${API_TOKEN_SALT}
ADMIN_JWT_SECRET=${ADMIN_JWT_SECRET}
JWT_SECRET=${JWT_SECRET}

# ==================== Frontend (Next.js) 設定 ====================
# 如果要從外部訪問，請將 localhost 改為您的 VM 外部 IP 或網域
NEXT_PUBLIC_API_BASE=http://localhost:8000
NEXT_PUBLIC_CMS_BASE=http://localhost:1337
REVALIDATE_SECRET=${REVALIDATE_SECRET}
EOF

echo ""
echo "========================================"
echo "✅ .env 檔案建立完成！"
echo "========================================"
echo ""
echo "📋 生成的設定摘要:"
echo "  • 資料庫名稱: traffic"
echo "  • 資料庫使用者: traffic_user"
echo "  • 所有密碼和密鑰已自動生成"
echo ""
echo "⚠️  重要提醒:"
echo "1. .env 檔案包含敏感資訊，請勿上傳到 Git"
echo "2. 如需從外部訪問，請修改 NEXT_PUBLIC_API_BASE 和 NEXT_PUBLIC_CMS_BASE"
echo "   例如: NEXT_PUBLIC_API_BASE=http://YOUR_VM_IP:8000"
echo "3. 請妥善保管此 .env 檔案"
echo ""
echo "📝 下一步:"
echo "   執行 sudo bash setup-gcp-vm.sh 來完成系統部署"
echo ""

