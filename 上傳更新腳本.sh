#!/bin/bash

################################################################################
# 快速上傳更新後的部署腳本到 GCP VM
################################################################################

echo "========================================"
echo "📤 上傳更新後的部署腳本到 GCP VM"
echo "========================================"
echo ""

# 檢查參數
if [ -z "$1" ] || [ -z "$2" ]; then
    echo "使用方式: bash 上傳更新腳本.sh VM_NAME ZONE"
    echo ""
    echo "範例:"
    echo "  bash 上傳更新腳本.sh my-vm-instance us-central1-a"
    echo ""
    exit 1
fi

VM_NAME=$1
ZONE=$2

echo "🎯 目標 VM: $VM_NAME"
echo "🌍 Zone: $ZONE"
echo ""

# 上傳腳本
echo "📤 上傳 setup-gcp-vm.sh..."
gcloud compute scp setup-gcp-vm.sh ${VM_NAME}:~/npp-traffic165-2025/ --zone=${ZONE}

echo "📤 上傳 create-env.sh..."
gcloud compute scp create-env.sh ${VM_NAME}:~/npp-traffic165-2025/ --zone=${ZONE}

echo "📤 上傳 check-services.sh..."
gcloud compute scp check-services.sh ${VM_NAME}:~/npp-traffic165-2025/ --zone=${ZONE}

echo ""
echo "✅ 上傳完成！"
echo ""
echo "接下來請 SSH 到 VM 並執行:"
echo "  cd ~/npp-traffic165-2025"
echo "  sudo bash setup-gcp-vm.sh"
echo ""

