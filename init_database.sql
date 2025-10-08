-- 交通事故數據系統 - 資料庫初始化腳本
-- 使用資料庫: traffic

USE traffic;

-- ==================== 主要資料表 ====================

-- 1. 事故明細表
CREATE TABLE IF NOT EXISTS `accident` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '事故ID',
    `occur_dt` DATETIME NOT NULL COMMENT '發生時間',
    `year` INT GENERATED ALWAYS AS (YEAR(occur_dt)) STORED COMMENT '年份',
    `month` TINYINT GENERATED ALWAYS AS (MONTH(occur_dt)) STORED COMMENT '月份',
    `day` TINYINT GENERATED ALWAYS AS (DAY(occur_dt)) STORED COMMENT '日期',
    `county` VARCHAR(20) DEFAULT NULL COMMENT '縣市',
    `town` VARCHAR(50) DEFAULT NULL COMMENT '鄉鎮',
    `lat` DECIMAL(9,6) DEFAULT NULL COMMENT '緯度',
    `lng` DECIMAL(9,6) DEFAULT NULL COMMENT '經度',
    `severity` ENUM('fatal','injury','property') DEFAULT 'property' COMMENT '嚴重程度',
    `victim_type` VARCHAR(20) DEFAULT NULL COMMENT '被害者類型',
    `age_group` VARCHAR(10) DEFAULT NULL COMMENT '年齡組別',
    `vehicle_type` VARCHAR(20) DEFAULT NULL COMMENT '車輛類型',
    `cause_primary` VARCHAR(100) DEFAULT NULL COMMENT '主要肇因',
    `cause_primary_rank` TINYINT DEFAULT NULL COMMENT '肇因排名',
    `accident_category` VARCHAR(50) DEFAULT NULL COMMENT '事故型態',
    `road_segment_id` BIGINT DEFAULT NULL COMMENT '道路網段ID',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
    
    INDEX `idx_occur_dt` (`occur_dt`),
    INDEX `idx_year_month` (`year`, `month`),
    INDEX `idx_county` (`county`),
    INDEX `idx_severity` (`severity`),
    INDEX `idx_victim_type` (`victim_type`),
    INDEX `idx_location` (`lat`, `lng`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='事故明細表';

-- 2. KPI 基準年資料表
CREATE TABLE IF NOT EXISTS `kpi_baseline` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `metric` VARCHAR(50) NOT NULL COMMENT 'KPI指標名稱',
    `baseline_year` INT NOT NULL COMMENT '基準年份',
    `value` INT NOT NULL COMMENT '基準值',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
    
    UNIQUE KEY `uk_metric_year` (`metric`, `baseline_year`),
    INDEX `idx_baseline_year` (`baseline_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='KPI基準年資料';

-- 3. 路段統計表
CREATE TABLE IF NOT EXISTS `segment_stats` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `road_segment_id` BIGINT NOT NULL COMMENT '道路網段ID',
    `county` VARCHAR(20) NOT NULL COMMENT '縣市',
    `year` INT DEFAULT NULL COMMENT '年份(NULL表示全年度)',
    `fatal_count` INT DEFAULT 0 COMMENT '死亡事故數',
    `injury_count` INT DEFAULT 0 COMMENT '受傷事故數',
    `property_count` INT DEFAULT 0 COMMENT '財損事故數',
    `fatal_rate_per_km` DECIMAL(10,4) DEFAULT 0 COMMENT '每公里死亡率',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
    
    INDEX `idx_segment` (`road_segment_id`),
    INDEX `idx_county_year` (`county`, `year`, `fatal_count` DESC),
    INDEX `idx_fatal_count` (`fatal_count` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='路段統計表';

-- 4. 行人事故資料表
CREATE TABLE IF NOT EXISTS `pedestrian_accidents` (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '行人事故ID',
    `accident_type` VARCHAR(50) NOT NULL COMMENT '事故類別名稱',
    `occur_datetime` DATETIME NOT NULL COMMENT '發生時間',
    `longitude` DECIMAL(10, 7) NOT NULL COMMENT '經度',
    `latitude` DECIMAL(10, 7) NOT NULL COMMENT '緯度',
    `death_count` INT DEFAULT 0 COMMENT '死亡人數',
    `injury_count` INT DEFAULT 0 COMMENT '受傷人數',
    `vehicle_main_type` VARCHAR(100) DEFAULT NULL COMMENT '車種大類',
    `vehicle_sub_type` VARCHAR(100) DEFAULT NULL COMMENT '車種子類',
    `pedestrian_gender` VARCHAR(10) DEFAULT NULL COMMENT '行人性別',
    `pedestrian_age` DECIMAL(5,1) DEFAULT NULL COMMENT '行人年齡',
    `location` TEXT DEFAULT NULL COMMENT '發生地點',
    `police_station` VARCHAR(100) DEFAULT NULL COMMENT '承辦警局',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
    
    INDEX `idx_occur_datetime` (`occur_datetime`),
    INDEX `idx_location_coords` (`latitude`, `longitude`),
    INDEX `idx_accident_type` (`accident_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='行人事故資料表';

-- ==================== 初始化基礎資料 ====================

-- 插入 KPI 基準年資料（2020年作為基準）
INSERT IGNORE INTO `kpi_baseline` (`metric`, `baseline_year`, `value`) VALUES
('fatal_total', 2020, 2972),
('fatal_ped', 2020, 289),
('fatal_minor', 2020, 123);

-- 插入示例路段統計資料
INSERT IGNORE INTO `segment_stats` (`road_segment_id`, `county`, `year`, `fatal_count`, `injury_count`, `property_count`) VALUES
(1, '台北市', 2024, 15, 120, 350),
(2, '新北市', 2024, 22, 180, 420),
(3, '桃園市', 2024, 18, 150, 380),
(4, '台中市', 2024, 20, 160, 400),
(5, '高雄市', 2024, 17, 140, 360);

-- ==================== 查看已建立的表 ====================
SHOW TABLES;

-- 顯示訊息
SELECT '資料庫初始化完成！' AS status;
SELECT CONCAT('已建立 ', COUNT(*), ' 張資料表') AS table_count
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'traffic';
