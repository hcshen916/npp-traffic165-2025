#!/bin/bash

# 服務健康檢查腳本

echo "🔍 開始檢查所有服務狀態..."
echo ""

# 檢查Docker容器狀態
echo "📦 Docker 容器狀態："
docker compose ps
echo ""

# 等待服務啟動
echo "⏳ 等待服務完全啟動..."
sleep 5
echo ""

# 檢查各服務健康狀態
SERVICES_OK=0
SERVICES_FAIL=0

# 檢查 Backend
echo "🔧 檢查 Backend API (http://localhost:8000)..."
if curl -s -f http://localhost:8000/api/health > /dev/null 2>&1; then
    echo "✅ Backend 服務正常"
    SERVICES_OK=$((SERVICES_OK + 1))
else
    echo "❌ Backend 服務異常"
    SERVICES_FAIL=$((SERVICES_FAIL + 1))
fi
echo ""

# 檢查 CMS
echo "🎨 檢查 CMS (http://localhost:1337)..."
if curl -s -f http://localhost:1337/_health > /dev/null 2>&1 || curl -s http://localhost:1337 | grep -q "strapi\|Strapi" > /dev/null 2>&1; then
    echo "✅ CMS 服務正常"
    SERVICES_OK=$((SERVICES_OK + 1))
else
    echo "❌ CMS 服務異常"
    SERVICES_FAIL=$((SERVICES_FAIL + 1))
fi
echo ""

# 檢查 Frontend
echo "🌐 檢查 Frontend (http://localhost:3000)..."
if curl -s -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend 服務正常"
    SERVICES_OK=$((SERVICES_OK + 1))
else
    echo "❌ Frontend 服務異常"
    SERVICES_FAIL=$((SERVICES_FAIL + 1))
fi
echo ""

# 檢查 MySQL
echo "🗄️  檢查 MySQL (localhost:3307)..."
if nc -z localhost 3307 > /dev/null 2>&1; then
    echo "✅ MySQL 端口正常監聽"
    SERVICES_OK=$((SERVICES_OK + 1))
else
    echo "❌ MySQL 端口無法連接"
    SERVICES_FAIL=$((SERVICES_FAIL + 1))
fi
echo ""

# 檢查 Redis
echo "💾 檢查 Redis (localhost:6380)..."
if nc -z localhost 6380 > /dev/null 2>&1; then
    echo "✅ Redis 端口正常監聽"
    SERVICES_OK=$((SERVICES_OK + 1))
else
    echo "❌ Redis 端口無法連接"
    SERVICES_FAIL=$((SERVICES_FAIL + 1))
fi
echo ""

# 總結
echo "======================================"
echo "📊 檢查結果總結"
echo "======================================"
echo "✅ 正常服務: $SERVICES_OK"
echo "❌ 異常服務: $SERVICES_FAIL"
echo ""

if [ $SERVICES_FAIL -eq 0 ]; then
    echo "🎉 所有服務運行正常！"
    echo ""
    echo "📝 訪問地址："
    echo "  • 前端首頁: http://localhost:3000"
    echo "  • 儀表板: http://localhost:3000/dashboard"
    echo "  • 部落格: http://localhost:3000/blog"
    echo "  • CMS 後台: http://localhost:1337/admin"
    echo "  • API 文件: http://localhost:8000/docs"
    exit 0
else
    echo "⚠️  有 $SERVICES_FAIL 個服務運行異常，請檢查日誌："
    echo "  docker compose logs -f [服務名稱]"
    exit 1
fi
