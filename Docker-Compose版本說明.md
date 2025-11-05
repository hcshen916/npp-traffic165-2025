# Docker Compose 版本說明

## 🔍 問題說明

如果看到「❌ docker-compose 未安裝」，但網站正常運作，這是因為您使用的是 **Docker Compose V2**。

---

## 📌 兩個版本的差異

### Docker Compose V1（舊版）
```bash
docker-compose up -d      # 帶連字號 -
docker-compose ps
docker-compose logs
```

### Docker Compose V2（新版）
```bash
docker compose up -d      # 沒有連字號，是 docker 的子命令
docker compose ps
docker compose logs
```

---

## ✅ 我已經修正了腳本

新版本的 `deploy-updates.sh` 現在支援：
- ✅ Docker Compose V1 (`docker-compose`)
- ✅ Docker Compose V2 (`docker compose`)
- ✅ 自動檢測並使用正確的版本
- ✅ 支援 sudo 模式

---

## 🚀 現在可以直接執行

```bash
./deploy-updates.sh
```

腳本會自動檢測您的版本並使用正確的命令！

---

## 🔍 檢查您使用的版本

### 測試 V1（帶連字號）
```bash
docker-compose --version
# 或
sudo docker-compose --version
```

### 測試 V2（沒有連字號）
```bash
docker compose version
# 或
sudo docker compose version
```

---

## 💡 如果需要手動部署

### 使用 V1 命令
```bash
sudo docker-compose stop frontend backend cms
sudo docker-compose build frontend backend cms
sudo docker-compose up -d
sudo docker-compose ps
```

### 使用 V2 命令
```bash
sudo docker compose stop frontend backend cms
sudo docker compose build frontend backend cms
sudo docker compose up -d
sudo docker compose ps
```

---

## 📋 完整的診斷步驟

### 步驟 1：確認 Docker 版本

```bash
docker --version
# 或
sudo docker --version
```

### 步驟 2：確認 Compose 版本

```bash
# 嘗試 V1
docker-compose --version
sudo docker-compose --version

# 嘗試 V2
docker compose version
sudo docker compose version
```

### 步驟 3：檢查服務是否運行

```bash
# 使用 V1
sudo docker-compose ps

# 或使用 V2
sudo docker compose ps
```

### 步驟 4：執行更新後的部署腳本

```bash
./deploy-updates.sh
```

---

## 🎯 常見情況

### 情況 1：只有 V2（新安裝的 Docker）

**特徵：**
- `docker compose version` ✓ 可用
- `docker-compose --version` ✗ 不可用

**解決方案：** 
腳本會自動使用 `docker compose`（V2）

### 情況 2：只有 V1（舊版 Docker）

**特徵：**
- `docker-compose --version` ✓ 可用
- `docker compose version` ✗ 不可用

**解決方案：** 
腳本會自動使用 `docker-compose`（V1）

### 情況 3：兩者都有

**特徵：**
- 兩個命令都可用

**解決方案：** 
腳本會優先使用 V1（向下兼容）

### 情況 4：需要 sudo

**特徵：**
- `docker compose version` ✗ 不可用
- `sudo docker compose version` ✓ 可用

**解決方案：** 
腳本會自動使用 `sudo docker compose`

---

## 🔧 如果還是不行

### 方案 A：強制指定版本

編輯腳本開頭，手動設定：

```bash
# 在腳本開頭加入（根據您的情況選擇）

# 如果使用 V2 with sudo
DOCKER_CMD="sudo docker"
DOCKER_COMPOSE_CMD="sudo docker compose"

# 或如果使用 V1 with sudo
DOCKER_CMD="sudo docker"
DOCKER_COMPOSE_CMD="sudo docker-compose"
```

### 方案 B：創建別名（臨時解決）

```bash
# 如果您有 V2 但習慣用 V1 命令
alias docker-compose='docker compose'

# 然後執行
./deploy-updates.sh
```

### 方案 C：安裝 V1（如果只有 V2）

```bash
# Ubuntu/Debian
sudo apt-get install docker-compose

# 或使用 pip
sudo pip install docker-compose
```

---

## 📊 版本對照表

| 功能 | V1 命令 | V2 命令 |
|------|---------|---------|
| 查看版本 | `docker-compose --version` | `docker compose version` |
| 啟動服務 | `docker-compose up -d` | `docker compose up -d` |
| 停止服務 | `docker-compose stop` | `docker compose stop` |
| 查看狀態 | `docker-compose ps` | `docker compose ps` |
| 查看日誌 | `docker-compose logs` | `docker compose logs` |
| 重新構建 | `docker-compose build` | `docker compose build` |

---

## ✨ 新腳本的智能檢測

更新後的腳本會顯示：

```bash
# 如果檢測到 V1
✓ Docker Compose V1 已安裝

# 如果檢測到 V2
✓ Docker Compose V2 已安裝

# 如果兩者都沒有
❌ Docker Compose 未安裝
ℹ️  請安裝 Docker Compose：
ℹ️    方法1: sudo apt-get install docker-compose
ℹ️    方法2: 使用 Docker Compose V2 (已內建在新版 Docker)
```

---

## 🎉 總結

### 最簡單的方法

```bash
# 方法 1：直接執行更新後的腳本（推薦）
./deploy-updates.sh

# 方法 2：使用 sudo
sudo ./deploy-updates.sh

# 方法 3：手動指定命令
sudo docker compose ps           # V2
sudo docker compose up -d
```

### 腳本現在支援

- ✅ Docker Compose V1 (`docker-compose`)
- ✅ Docker Compose V2 (`docker compose`)  
- ✅ 自動檢測版本
- ✅ 自動處理 sudo
- ✅ 智能錯誤訊息

---

**現在可以放心執行部署了！** 🚀

```bash
./deploy-updates.sh
```

