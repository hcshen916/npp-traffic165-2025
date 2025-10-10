# 🔧 故障排除指南

本文檔提供常見問題的診斷和解決方案。

## 📋 目錄

- [快速診斷](#快速診斷)
- [CMS 無法啟動](#cms-無法啟動)
- [無法從外部訪問](#無法從外部訪問)
- [服務持續重啟](#服務持續重啟)
- [記憶體不足](#記憶體不足)
- [磁碟空間不足](#磁碟空間不足)

---

## 🚑 快速診斷

### 使用自動診斷工具

```bash
# 快速修復（自動檢測並修復常見問題）
bash quick-fix.sh

# 完整健康檢查
bash check-services.sh

# 詳細診斷
bash diagnose.sh
```

### 手動檢查清單

```bash
# 1. 檢查所有容器狀態
sudo docker compose ps

# 2. 檢查服務日誌
sudo docker compose logs --tail=50

# 3. 檢查系統資源
free -h              # 記憶體
df -h                # 磁碟
top                  # CPU
```

---

## 🔴 CMS 無法啟動

### 症狀

- CMS 容器持續重啟
- 訪問 `http://YOUR_IP:1337/admin` 顯示無法連接
- 日誌顯示 `ER_NOT_SUPPORTED_AUTH_MODE`

### 診斷

```bash
# 檢查 CMS 狀態
sudo docker compose ps cms

# 查看 CMS 日誌
sudo docker compose logs cms --tail=50

# 檢查 MySQL 認證方式
source .env
sudo docker exec traffic-mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} \
  -e "SELECT user, host, plugin FROM mysql.user WHERE user='${MYSQL_USER}';"
```

### 解決方案

#### 方案 1：使用自動修復腳本（推薦）

```bash
# 一鍵修復 MySQL 認證問題
bash fix-mysql-auth.sh
```

#### 方案 2：手動修復

```bash
# 1. 停止 CMS
sudo docker compose stop cms

# 2. 修正 MySQL 認證
source .env
sudo docker exec traffic-mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} << EOF
ALTER USER '${MYSQL_USER}'@'%' IDENTIFIED WITH mysql_native_password BY '${MYSQL_PASSWORD}';
FLUSH PRIVILEGES;
EOF

# 3. 啟動 CMS
sudo docker compose start cms

# 4. 等待並檢查
sleep 30
sudo docker compose logs cms --tail=20
```

#### 方案 3：如果還是失敗

可能是 Admin Panel 未 build：

```bash
# Build admin panel
sudo docker exec traffic-cms npm run build

# 重啟 CMS
sudo docker compose restart cms
```

---

## 🌐 無法從外部訪問

### 症狀

- VM 內部可以訪問 (localhost)
- 外部瀏覽器無法訪問 IP
- 連接超時或拒絕連接

### 診斷

```bash
# 1. 檢查服務是否在監聽
sudo netstat -tulnp | grep -E ":(3000|8000|1337)"

# 2. 測試內部訪問
curl -I http://localhost:3000
curl -I http://localhost:8000
curl -I http://localhost:1337

# 3. 檢查外部 IP
curl ifconfig.me
```

### 解決方案

#### 步驟 1：配置外部訪問

```bash
# 自動配置
bash configure-external-access.sh
```

#### 步驟 2：檢查 GCP 防火牆

在 GCP Console:
1. 前往 **VPC 網路** → **防火牆**
2. 確認有規則允許 TCP ports 3000, 8000, 1337
3. 來源 IP 範圍應為 `0.0.0.0/0`

或使用命令：

```bash
# 創建防火牆規則
gcloud compute firewall-rules create allow-traffic-app \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp:3000,tcp:8000,tcp:1337 \
  --source-ranges=0.0.0.0/0 \
  --description="允許交通事故數據系統訪問"

# 檢查規則
gcloud compute firewall-rules list --filter="name:allow-traffic-app"
```

#### 步驟 3：驗證配置

```bash
# 檢查 .env 是否使用外部 IP
grep NEXT_PUBLIC .env

# 應該顯示外部 IP，而不是 localhost
# NEXT_PUBLIC_API_BASE=http://YOUR_EXTERNAL_IP:8000
# NEXT_PUBLIC_CMS_BASE=http://YOUR_EXTERNAL_IP:1337
```

---

## 🔄 服務持續重啟

### 症狀

- 容器狀態顯示 `Restarting`
- RestartCount 持續增加
- 服務無法穩定運行

### 診斷

```bash
# 檢查重啟次數
sudo docker inspect traffic-cms --format='RestartCount: {{.RestartCount}}'

# 查看詳細日誌
sudo docker compose logs cms --tail=100

# 檢查系統資源
free -h
df -h
```

### 常見原因與解決方案

#### 1. MySQL 認證錯誤

**症狀**: 日誌顯示 `ER_NOT_SUPPORTED_AUTH_MODE`

**解決**: 
```bash
bash fix-mysql-auth.sh
```

#### 2. 記憶體不足 (OOM)

**症狀**: 日誌顯示 `out of memory` 或系統日誌有 `killed process`

**診斷**:
```bash
# 檢查 OOM 記錄
dmesg | grep -i "killed process"
sudo journalctl --since "1 hour ago" | grep -i "out of memory"
```

**解決**:
```bash
# 增加 Swap
sudo bash add-swap.sh
```

#### 3. Admin Panel 未 Build

**症狀**: 日誌顯示 `ENOENT: no such file or directory, open '/srv/app/build/index.html'`

**解決**:
```bash
sudo docker exec traffic-cms npm run build
sudo docker compose restart cms
```

#### 4. 連接資料庫失敗

**症狀**: 日誌顯示 `Connection refused` 或 `Can't connect to MySQL`

**解決**:
```bash
# 檢查 MySQL 是否正常
sudo docker compose ps mysql

# 重啟 MySQL 和 CMS
sudo docker compose restart mysql
sleep 10
sudo docker compose restart cms
```

---

## 💾 記憶體不足

### 症狀

- 服務啟動緩慢或失敗
- 容器被 OOM Killer 殺掉
- `free -h` 顯示可用記憶體很少

### 解決方案

#### 1. 增加 Swap 空間

```bash
# 使用自動腳本
sudo bash add-swap.sh

# 驗證
free -h
swapon --show
```

#### 2. 手動創建 Swap

```bash
# 創建 4GB Swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 永久啟用
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 優化 Swap 使用
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
```

#### 3. 優化容器資源使用

停用暫時不需要的服務：

```bash
# 如果不需要 CMS 後台管理
sudo docker compose stop cms

# 如果不需要 Worker
sudo docker compose stop worker
```

#### 4. 升級 VM 規格

建議升級到：
- **e2-standard-2**: 2 vCPU, 8GB RAM
- **e2-standard-4**: 4 vCPU, 16GB RAM

---

## 💿 磁碟空間不足

### 症狀

- 容器無法啟動
- Build 失敗
- `df -h` 顯示磁碟使用率 > 90%

### 解決方案

#### 1. 清理 Docker 資源

```bash
# 清理未使用的 images, containers, volumes
sudo docker system prune -a -f

# 清理 build cache
sudo docker builder prune -a -f

# 檢查清理後的空間
sudo docker system df
df -h
```

#### 2. 清理系統日誌

```bash
# 清理 7 天前的日誌
sudo journalctl --vacuum-time=7d

# 清理大於 500MB 的日誌
sudo journalctl --vacuum-size=500M
```

#### 3. 清理 APT 快取

```bash
sudo apt-get clean
sudo apt-get autoclean
sudo apt-get autoremove -y
```

#### 4. 找出大型檔案

```bash
# 找出最大的目錄
sudo du -h --max-depth=1 / 2>/dev/null | sort -hr | head -20

# 找出大於 100MB 的檔案
sudo find / -type f -size +100M 2>/dev/null
```

---

## 🔍 進階診斷

### 查看容器內部狀態

```bash
# 進入容器
sudo docker exec -it traffic-cms sh

# 在容器內執行
ls -la /srv/app/build/     # 檢查 build 目錄
ps aux                     # 檢查進程
df -h                      # 檢查容器內磁碟
```

### 檢查網路連接

```bash
# 測試容器間網路
sudo docker exec traffic-cms ping mysql -c 3

# 檢查 DNS 解析
sudo docker exec traffic-cms nslookup mysql

# 查看網路詳情
sudo docker network inspect npp-traffic165-2025_traffic-network
```

### 檢查環境變數

```bash
# 查看容器環境變數
sudo docker exec traffic-cms env | grep DATABASE

# 檢查 .env 檔案
cat .env | grep -v "PASSWORD\|SECRET"
```

---

## 📞 獲取幫助

如果上述方法都無法解決問題：

1. **收集診斷資訊**:
   ```bash
   bash diagnose.sh > diagnosis.txt
   sudo docker compose logs > docker-logs.txt
   ```

2. **檢查關鍵資訊**:
   - VM 規格 (CPU, RAM, 磁碟)
   - Docker 版本: `docker --version`
   - Compose 版本: `docker compose version`
   - 錯誤日誌完整內容

3. **參考文檔**:
   - [部署修復說明](DEPLOYMENT_FIXES.md)
   - [GCP 部署指南](DEPLOY_GCP.md)

---

## 🛠️ 工具腳本速查

| 腳本 | 用途 | 何時使用 |
|------|------|----------|
| `quick-fix.sh` | 自動檢測並修復常見問題 | 發現任何問題時 |
| `fix-mysql-auth.sh` | 修復 MySQL 認證問題 | CMS 無法連接資料庫 |
| `configure-external-access.sh` | 配置外部訪問 | 無法從外部訪問 |
| `add-swap.sh` | 增加 Swap 空間 | 記憶體不足 |
| `check-services.sh` | 健康檢查 | 定期檢查 |
| `diagnose.sh` | 詳細診斷 | 需要完整診斷資訊 |

---

**最後更新**: 2025-10-10

