#!/bin/bash

# 檔案清理腳本
# 用途：刪除不必要的檔案和舊備份

set -e

echo "🧹 開始清理不必要的檔案..."
echo ""

# 切換到專案目錄
cd "$(dirname "$0")"

# 初始化計數器
DELETED_COUNT=0
FREED_SPACE=0

echo "📋 將要刪除的檔案/目錄："
echo ""

# 1. 檢查並刪除舊的資料庫備份
if [ -d "db/data_backup_20250819_143946" ]; then
    SIZE=$(du -sh db/data_backup_20250819_143946 | cut -f1)
    echo "  ❌ db/data_backup_20250819_143946/ (${SIZE})"
    DELETED_COUNT=$((DELETED_COUNT + 1))
else
    echo "  ℹ️  db/data_backup_20250819_143946/ (已不存在)"
fi

# 2. 檢查並刪除重複的 Dockerfile
if [ -f "cms/Dockerfile 2" ]; then
    SIZE=$(du -sh "cms/Dockerfile 2" | cut -f1)
    echo "  ❌ cms/Dockerfile 2 (${SIZE})"
    DELETED_COUNT=$((DELETED_COUNT + 1))
else
    echo "  ℹ️  cms/Dockerfile 2 (已不存在)"
fi

# 3. 檢查並刪除重複的 build 目錄
if [ -d "cms/build 2" ]; then
    SIZE=$(du -sh "cms/build 2" | cut -f1)
    echo "  ❌ cms/build 2/ (${SIZE})"
    DELETED_COUNT=$((DELETED_COUNT + 1))
else
    echo "  ℹ️  cms/build 2/ (已不存在)"
fi

echo ""

# 如果沒有需要刪除的檔案
if [ $DELETED_COUNT -eq 0 ]; then
    echo "✅ 沒有需要清理的檔案，系統已經很乾淨了！"
    exit 0
fi

# 詢問確認
echo "⚠️  將要刪除 ${DELETED_COUNT} 個檔案/目錄"
echo ""
read -p "確定要繼續嗎？(y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 已取消清理操作"
    exit 1
fi

echo ""
echo "🗑️  開始刪除..."
echo ""

# 執行刪除
DELETED=0

# 刪除舊備份
if [ -d "db/data_backup_20250819_143946" ]; then
    echo "  刪除 db/data_backup_20250819_143946/ ..."
    rm -rf db/data_backup_20250819_143946/
    DELETED=$((DELETED + 1))
    echo "  ✅ 已刪除"
fi

# 刪除重複 Dockerfile
if [ -f "cms/Dockerfile 2" ]; then
    echo "  刪除 cms/Dockerfile 2 ..."
    rm "cms/Dockerfile 2"
    DELETED=$((DELETED + 1))
    echo "  ✅ 已刪除"
fi

# 刪除重複 build 目錄
if [ -d "cms/build 2" ]; then
    echo "  刪除 cms/build 2/ ..."
    rm -rf "cms/build 2"
    DELETED=$((DELETED + 1))
    echo "  ✅ 已刪除"
fi

echo ""
echo "🎉 清理完成！"
echo ""
echo "📊 統計："
echo "  已刪除: ${DELETED} 個檔案/目錄"
echo ""

# 顯示 CMS build 目錄資訊（不建議刪除）
echo ""
echo "ℹ️  注意事項："
echo ""
if [ -d "cms/build" ]; then
    SIZE=$(du -sh cms/build | cut -f1)
    echo "✅ cms/build/ 目錄存在 (${SIZE})"
    echo "   這是 Strapi CMS 管理後台的必要檔案"
    echo "   ⚠️  不建議刪除，刪除會導致管理後台無法訪問"
else
    echo "⚠️  cms/build/ 目錄不存在"
    echo "   CMS 管理後台可能無法訪問"
    echo "   請執行以下命令修復："
    echo "   docker compose exec cms npm run build"
    echo "   docker compose restart cms"
fi

echo ""
echo "✅ 所有清理操作已完成！"
echo ""
echo "🔍 建議執行以下命令確認系統正常："
echo "  docker compose ps"
echo "  ./test-services.sh"
