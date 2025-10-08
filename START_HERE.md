# 🎯 從這裡開始 - GCP VM 部署指引

## 📌 您需要的只有 3 個步驟！

### 第 1 步：上傳專案到 GCP VM

在**本機**執行（將專案上傳到 VM）：
```bash
gcloud compute scp --recurse . YOUR_VM_NAME:~/npp-traffic165-2025 --zone=YOUR_ZONE
```

或者在 **VM** 中執行（使用 git）：
```bash
git clone YOUR_REPO_URL
cd npp-traffic165-2025
```

---

### 第 2 步：建立環境變數

SSH 連線到 VM 後，在專案目錄執行：

```bash
bash create-env.sh
```

✅ 這會自動產生包含所有隨機密碼的 `.env` 檔案

---

### 第 3 步：一鍵部署

```bash
sudo bash setup-gcp-vm.sh
```

✅ 自動安裝 Docker、啟動服務、初始化資料庫（約 10-15 分鐘）

---

## 🎉 完成！

部署完成後，執行以下命令取得您的 VM IP：

```bash
curl ifconfig.me
```

然後在瀏覽器訪問：

- **前端網站**: `http://YOUR_VM_IP:3000`
- **API 文檔**: `http://YOUR_VM_IP:8000/docs`  
- **CMS 管理**: `http://YOUR_VM_IP:1337/admin`

---

## ⚠️ 重要提醒

### 1. 設定 GCP 防火牆

在 GCP Console → VPC 網路 → 防火牆規則，開放：
- TCP Port **3000** (Frontend)
- TCP Port **8000** (Backend)
- TCP Port **1337** (CMS)

### 2. 首次使用 CMS

訪問 `http://YOUR_VM_IP:1337/admin`，建立管理員帳號

### 3. 外部訪問設定（如需要）

編輯 `.env` 檔案：
```bash
nano .env
```

修改這兩行（將 localhost 改為您的 VM IP）：
```
NEXT_PUBLIC_API_BASE=http://YOUR_VM_IP:8000
NEXT_PUBLIC_CMS_BASE=http://YOUR_VM_IP:1337
```

然後重啟前端：
```bash
docker compose restart frontend
```

---

## 🔍 驗證部署是否成功

執行健康檢查：
```bash
bash check-services.sh
```

查看所有服務狀態：
```bash
docker compose ps
```

---

## 📚 需要更詳細的說明？

- **[DEPLOY_GCP.md](DEPLOY_GCP.md)** - 完整的 GCP 部署指南
- **[README_DEPLOYMENT.md](README_DEPLOYMENT.md)** - 快速部署說明  
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - 部署檢查清單
- **[README.md](README.md)** - 專案完整說明

---

## 🛠️ 常用命令

```bash
# 查看日誌
docker compose logs -f

# 重啟服務
docker compose restart [service_name]

# 停止所有服務
docker compose down

# 啟動所有服務
docker compose up -d

# 健康檢查
bash check-services.sh
```

---

## 📞 遇到問題？

1. 先執行: `bash check-services.sh`
2. 查看日誌: `docker compose logs`
3. 參考 [DEPLOY_GCP.md](DEPLOY_GCP.md) 的故障排除章節

---

**就這麼簡單！祝您部署順利！** 🚀

