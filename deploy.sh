#!/bin/bash

# Docker 部署腳本

set -e

echo "🚀 開始 Docker 部署..."

# 檢查 .env 檔案是否存在
if [ ! -f .env ]; then
    echo "❌ .env 檔案不存在，請先從 env.example 複製並設定環境變數"
    echo "   cp env.example .env"
    echo "   nano .env  # 編輯環境變數"
    exit 1
fi

echo "✅ 環境變數檔案存在"

# 停止現有服務
echo "🛑 停止現有服務..."
docker compose down

# 建置所有服務
echo "🔨 建置所有服務..."
docker compose build

# 啟動服務
echo "🚀 啟動所有服務..."
docker compose up -d

# 等待服務啟動
echo "⏳ 等待服務啟動..."
sleep 30

# 檢查服務狀態
echo "📊 檢查服務狀態..."
docker compose ps

# 檢查服務健康狀況
echo "🏥 檢查服務健康狀況..."

# 檢查後端
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ 後端服務正常運行"
else
    echo "❌ 後端服務無法訪問"
fi

# 檢查前端
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ 前端服務正常運行"
else
    echo "❌ 前端服務無法訪問"
fi

# 檢查 CMS
if curl -s http://localhost:1337 > /dev/null; then
    echo "✅ CMS 服務正常運行"
else
    echo "❌ CMS 服務無法訪問"
fi

echo ""
echo "🎉 部署完成！"
echo ""
echo "訪問以下網址："
echo "  前端應用: http://localhost:3000"
echo "  CMS 管理: http://localhost:1337/admin"
echo "  後端 API: http://localhost:8000"
echo "  API 文件: http://localhost:8000/docs"
echo ""
echo "如需查看日誌："
echo "  docker compose logs -f [服務名稱]"
echo ""
echo "如需停止服務："
echo "  docker compose down"
