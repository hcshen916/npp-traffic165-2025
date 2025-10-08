from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from typing import Optional
import pandas as pd
import io
from ..db import MySQLPool
from ..cache import cache_result, invalidate_cache_group

router = APIRouter()

async def create_pedestrian_table():
    """創建行人事故資料表"""
    pool = await MySQLPool.create_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            # 創建主表格
            await cur.execute("""
                CREATE TABLE IF NOT EXISTS pedestrian_accidents (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    accident_type VARCHAR(50) NOT NULL COMMENT '事故類別名稱',
                    occur_datetime DATETIME NOT NULL COMMENT '發生時間_年月日時分',
                    longitude DECIMAL(10, 7) NOT NULL COMMENT '經度',
                    latitude DECIMAL(10, 7) NOT NULL COMMENT '緯度',
                    death_count INT DEFAULT 0 COMMENT '死亡人數',
                    injury_count INT DEFAULT 0 COMMENT '受傷人數',
                    vehicle_main_type VARCHAR(100) COMMENT 'Rank1_車種大類',
                    vehicle_sub_type VARCHAR(100) COMMENT 'Rank1_車種子類',
                    pedestrian_gender VARCHAR(10) COMMENT '行人_性別',
                    pedestrian_age DECIMAL(5,1) COMMENT '行人_年齡',
                    location TEXT COMMENT '發生地點',
                    police_station VARCHAR(100) COMMENT '承辦警局',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    
                    INDEX idx_occur_datetime (occur_datetime),
                    INDEX idx_location_coords (latitude, longitude),
                    INDEX idx_accident_type (accident_type)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """)
            
            # 檢查並創建年份索引（適用於 MySQL 8.0+）
            try:
                # 檢查MySQL版本是否支援函數索引
                await cur.execute("SELECT VERSION()")
                version = await cur.fetchone()
                if version and version[0].split('.')[0] >= '8':
                    await cur.execute("""
                        CREATE INDEX IF NOT EXISTS idx_year ON pedestrian_accidents ((YEAR(occur_datetime)))
                    """)
            except Exception:
                # 如果不支援函數索引，則忽略
                pass

@router.post("/pedestrian/upload")
async def upload_pedestrian_csv(file: UploadFile = File(...)):
    """上傳行人事故CSV檔案"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="請上傳CSV檔案")
    
    try:
        # 讀取CSV內容
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents), encoding='utf-8')
        
        # 檢查必要欄位
        required_columns = [
            '事故類別名稱', '發生時間_年月日時分', '經度', '緯度', 
            '死亡人數', '受傷人數', 'Rank1_車種大類', 'Rank1_車種子類',
            '行人_性別', '行人_年齡', '發生地點', '承辦警局'
        ]
        
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=400, 
                detail=f"缺少必要欄位: {', '.join(missing_columns)}"
            )
        
        # 確保資料表存在
        await create_pedestrian_table()
        
        # 資料處理和插入
        pool = await MySQLPool.create_pool()
        inserted_count = 0
        error_rows = []
        
        # 資料清理：處理 NaN 值
        df = df.fillna({
            '事故類別名稱': 'Unknown',
            'Rank1_車種大類': 'Unknown',
            'Rank1_車種子類': 'Unknown', 
            '行人_性別': 'Unknown',
            '發生地點': 'Unknown',
            '承辦警局': 'Unknown'
        })
        
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                for index, row in df.iterrows():
                    try:
                        # 檢查必要欄位是否為空或NaN
                        if pd.isna(row['發生時間_年月日時分']) or pd.isna(row['經度']) or pd.isna(row['緯度']):
                            error_rows.append({
                                "row": index + 1, 
                                "error": "必要欄位（時間、經度、緯度）不能為空"
                            })
                            continue
                        
                        # 資料清理和轉換
                        occur_datetime = pd.to_datetime(row['發生時間_年月日時分'])
                        
                        # 檢查經緯度是否為有效數值
                        try:
                            longitude = float(row['經度'])
                            latitude = float(row['緯度'])
                            
                            # 基本有效性檢查（去除台灣範圍限制）
                            if not (-180.0 <= longitude <= 180.0 and -90.0 <= latitude <= 90.0):
                                error_rows.append({
                                    "row": index + 1,
                                    "error": f"經緯度超出地球範圍: ({longitude}, {latitude})"
                                })
                                continue
                                
                        except (ValueError, TypeError):
                            error_rows.append({
                                "row": index + 1,
                                "error": f"經緯度格式錯誤: {row['經度']}, {row['緯度']}"
                            })
                            continue
                        
                        # 處理數值欄位
                        death_count = 0
                        injury_count = 0
                        pedestrian_age = None
                        
                        try:
                            if pd.notna(row['死亡人數']) and str(row['死亡人數']).strip():
                                death_count = int(float(row['死亡人數']))
                        except (ValueError, TypeError):
                            death_count = 0
                            
                        try:
                            if pd.notna(row['受傷人數']) and str(row['受傷人數']).strip():
                                injury_count = int(float(row['受傷人數']))
                        except (ValueError, TypeError):
                            injury_count = 0
                            
                        try:
                            if pd.notna(row['行人_年齡']) and str(row['行人_年齡']).strip():
                                age_val = float(row['行人_年齡'])
                                if 0 <= age_val <= 150:  # 合理年齡範圍
                                    pedestrian_age = age_val
                        except (ValueError, TypeError):
                            pedestrian_age = None
                        
                        # 處理字串欄位，確保不是NaN
                        def clean_string(value):
                            if pd.isna(value) or value is None:
                                return None
                            return str(value).strip() if str(value).strip() else None
                        
                        accident_type = clean_string(row['事故類別名稱']) or 'Unknown'
                        vehicle_main_type = clean_string(row['Rank1_車種大類'])
                        vehicle_sub_type = clean_string(row['Rank1_車種子類'])
                        pedestrian_gender = clean_string(row['行人_性別'])
                        location = clean_string(row['發生地點'])
                        police_station = clean_string(row['承辦警局'])
                        
                        await cur.execute("""
                            INSERT INTO pedestrian_accidents (
                                accident_type, occur_datetime, longitude, latitude,
                                death_count, injury_count, vehicle_main_type, vehicle_sub_type,
                                pedestrian_gender, pedestrian_age, location, police_station
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """, (
                            accident_type, occur_datetime, longitude, latitude,
                            death_count, injury_count, vehicle_main_type, vehicle_sub_type,
                            pedestrian_gender, pedestrian_age, location, police_station
                        ))
                        inserted_count += 1
                        
                    except Exception as e:
                        error_rows.append({"row": index + 1, "error": str(e)})
        
        # 清除相關快取
        invalidate_cache_group("pedestrian")
        
        return {
            "status": "success",
            "message": f"成功上傳 {inserted_count} 筆資料",
            "inserted_count": inserted_count,
            "total_rows": len(df),
            "errors": error_rows
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"處理檔案時發生錯誤: {str(e)}") from e

@router.get("/pedestrian/stats")
async def get_pedestrian_stats():
    """取得行人事故統計資料"""
    try:
        # 確保資料表存在
        await create_pedestrian_table()
        
        pool = await MySQLPool.create_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                # 檢查表是否存在且有資料
                await cur.execute("SHOW TABLES LIKE 'pedestrian_accidents'")
                table_exists = await cur.fetchone()
                
                if not table_exists:
                    # 表不存在，回傳空統計
                    return {
                        "summary": {
                            "total_accidents": 0,
                            "total_deaths": 0,
                            "total_injuries": 0
                        },
                        "yearly_stats": [],
                        "accident_types": []
                    }
                
                # 總計
                await cur.execute("SELECT COUNT(*) FROM pedestrian_accidents")
                total_count = (await cur.fetchone())[0]
                
                # 死亡總數
                await cur.execute("SELECT SUM(death_count) FROM pedestrian_accidents")
                total_deaths = (await cur.fetchone())[0] or 0
                
                # 受傷總數
                await cur.execute("SELECT SUM(injury_count) FROM pedestrian_accidents")
                total_injuries = (await cur.fetchone())[0] or 0
                
                # 年度統計
                await cur.execute("""
                    SELECT YEAR(occur_datetime) as year, 
                           COUNT(*) as count,
                           SUM(death_count) as deaths,
                           SUM(injury_count) as injuries
                    FROM pedestrian_accidents 
                    GROUP BY YEAR(occur_datetime) 
                    ORDER BY year DESC
                """)
                yearly_stats = await cur.fetchall()
                
                # 事故類型統計
                await cur.execute("""
                    SELECT accident_type, 
                           COUNT(*) as count,
                           SUM(death_count) as deaths
                    FROM pedestrian_accidents 
                    GROUP BY accident_type 
                    ORDER BY count DESC 
                    LIMIT 10
                """)
                type_stats = await cur.fetchall()
        
        return {
            "summary": {
                "total_accidents": total_count,
                "total_deaths": total_deaths,
                "total_injuries": total_injuries
            },
            "yearly_stats": [
                {
                    "year": row[0],
                    "accidents": row[1],
                    "deaths": row[2] or 0,
                    "injuries": row[3] or 0
                } for row in yearly_stats
            ],
            "accident_types": [
                {
                    "type": row[0],
                    "count": row[1],
                    "deaths": row[2] or 0
                } for row in type_stats
            ]
        }
    except Exception as e:
        # 如果發生錯誤，回傳空統計而不是拋出異常
        return {
            "summary": {
                "total_accidents": 0,
                "total_deaths": 0,
                "total_injuries": 0
            },
            "yearly_stats": [],
            "accident_types": [],
            "error": str(e)
        }

@cache_result("pedestrian", ttl=300)
async def fetch_pedestrian_map_points(year: Optional[int] = None, accident_type: str = "all", limit: int = 10000):
    """取得行人事故地圖點位資料"""
    pool = await MySQLPool.create_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            where_clauses = []
            params = []
            
            if year:
                where_clauses.append("YEAR(occur_datetime) = %s")
                params.append(year)
            
            if accident_type != "all":
                where_clauses.append("accident_type = %s")
                params.append(accident_type)
            
            where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
            params.append(limit)
            
            await cur.execute(f"""
                SELECT id, latitude, longitude, accident_type, occur_datetime,
                       death_count, injury_count, vehicle_main_type, vehicle_sub_type,
                       pedestrian_gender, pedestrian_age, location, police_station
                FROM pedestrian_accidents
                WHERE {where_sql}
                ORDER BY occur_datetime DESC
                LIMIT %s
            """, params)
            
            rows = await cur.fetchall()
    
    features = []
    for row in rows:
        if row[1] is not None and row[2] is not None:  # lat, lng not null
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [float(row[2]), float(row[1])]  # lng, lat
                },
                "properties": {
                    "id": row[0],
                    "accident_type": row[3],
                    "occur_datetime": row[4].strftime("%Y-%m-%d %H:%M") if row[4] else None,
                    "death_count": row[5] or 0,
                    "injury_count": row[6] or 0,
                    "vehicle_main_type": row[7],
                    "vehicle_sub_type": row[8],
                    "pedestrian_gender": row[9],
                    "pedestrian_age": row[10],
                    "location": row[11],
                    "police_station": row[12]
                }
            })
    
    return {
        "type": "FeatureCollection",
        "features": features
    }

@router.get("/pedestrian/map/points")
async def get_pedestrian_map_points(
    year: Optional[int] = Query(None),
    accident_type: str = Query("all"),
    limit: int = Query(10000, le=50000)
):
    """取得行人事故地圖點位"""
    geojson = await fetch_pedestrian_map_points(year=year, accident_type=accident_type, limit=limit)
    geojson["meta"] = {"year": year, "accident_type": accident_type, "limit": limit}
    return geojson

@router.get("/pedestrian/years")
async def get_available_years():
    """取得可用年份列表"""
    pool = await MySQLPool.create_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute("""
                SELECT DISTINCT YEAR(occur_datetime) as year 
                FROM pedestrian_accidents 
                WHERE occur_datetime IS NOT NULL
                ORDER BY year DESC
            """)
            years = [row[0] for row in await cur.fetchall()]
    
    return {"years": years}

@router.get("/pedestrian/accident-types")
async def get_accident_types():
    """取得事故類型列表"""
    pool = await MySQLPool.create_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute("""
                SELECT DISTINCT accident_type, COUNT(*) as count
                FROM pedestrian_accidents 
                GROUP BY accident_type 
                ORDER BY count DESC
            """)
            types = [{"type": row[0], "count": row[1]} for row in await cur.fetchall()]
    
    return {"accident_types": types}

def clean_location(location):
    """清理地點資訊，去除額外描述"""
    if not location:
        return "Unknown"
    
    import re
    
    # 移除常見的位置描述詞
    location = re.sub(r'前\d+\.\d+公尺.*?$', '', location)  # 移除"前0.0公尺"及後續
    location = re.sub(r'前\d+公尺.*?$', '', location)      # 移除"前0公尺"及後續
    location = re.sub(r'\d+[-\d]*號.*?$', '', location)    # 移除門牌號碼及後續（包含42-1號格式）
    location = re.sub(r'附近.*?$', '', location)           # 移除"附近"及後續
    location = re.sub(r'[東西南北]側.*?$', '', location)    # 移除方位描述
    location = re.sub(r'\s*/\s*.*$', '', location)        # 移除"/"及後續（保留第一個地點）
    
    # 移除巷弄號碼
    location = re.sub(r'\d+巷\d+[-\d]*號?', '', location)  # 處理223巷109號格式
    location = re.sub(r'\d+巷', '', location)
    
    # 清理空白
    location = re.sub(r'\s+', '', location)
    location = location.strip()
    
    return location if location else "Unknown"

@router.get("/pedestrian/dashboard-kpis")
async def get_pedestrian_dashboard_kpis():
    """取得行人事故儀表板KPI資料"""
    from datetime import datetime
    
    current_year = datetime.now().year
    target_year = current_year - 1  # 前一年
    baseline_year = 2023
    
    pool = await MySQLPool.create_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            # 目標年度行人死亡人數
            await cur.execute("""
                SELECT SUM(death_count) 
                FROM pedestrian_accidents 
                WHERE YEAR(occur_datetime) = %s
            """, (target_year,))
            target_deaths = (await cur.fetchone())[0] or 0
            
            # 基準年度行人死亡人數
            await cur.execute("""
                SELECT SUM(death_count) 
                FROM pedestrian_accidents 
                WHERE YEAR(occur_datetime) = %s
            """, (baseline_year,))
            baseline_deaths = (await cur.fetchone())[0] or 0
            
            # 計算變動百分比
            pct_change = 0.0
            if baseline_deaths > 0:
                pct_change = (target_deaths - baseline_deaths) / baseline_deaths
    
    return {
        "pedestrian_deaths": {
            "current": target_deaths,
            "baseline": baseline_deaths,
            "pct_change": pct_change,
            "target_year": target_year,
            "baseline_year": baseline_year
        }
    }

@router.get("/pedestrian/dashboard-causes")
async def get_pedestrian_dashboard_causes():
    """取得行人事故主要肇因分析"""
    from datetime import datetime
    
    current_year = datetime.now().year
    target_year = current_year - 1  # 前一年
    
    pool = await MySQLPool.create_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            # 查詢主要肇因車種組合
            await cur.execute("""
                SELECT 
                    CONCAT(COALESCE(vehicle_main_type, 'Unknown'), ' - ', COALESCE(vehicle_sub_type, 'Unknown')) as vehicle_combination,
                    COUNT(*) as count,
                    vehicle_main_type,
                    vehicle_sub_type
                FROM pedestrian_accidents 
                WHERE YEAR(occur_datetime) = %s
                GROUP BY vehicle_main_type, vehicle_sub_type 
                ORDER BY count DESC 
                LIMIT 1
            """, (target_year,))
            
            top_cause = await cur.fetchone()
            
            if not top_cause:
                return {
                    "top_vehicle_combination": "無資料",
                    "count": 0,
                    "share": 0.0,
                    "vehicle_main_type": "Unknown",
                    "vehicle_sub_type": "Unknown"
                }
            
            # 計算總事故數（同年度）
            await cur.execute("""
                SELECT COUNT(*) 
                FROM pedestrian_accidents 
                WHERE YEAR(occur_datetime) = %s
            """, (target_year,))
            total_count = (await cur.fetchone())[0] or 1
            
            share = top_cause[1] / total_count if total_count > 0 else 0.0
            
            return {
                "top_vehicle_combination": top_cause[0],
                "count": top_cause[1],
                "share": share,
                "vehicle_main_type": top_cause[2] or "Unknown",
                "vehicle_sub_type": top_cause[3] or "Unknown",
                "year": target_year
            }

@router.get("/pedestrian/dashboard-segments")
async def get_pedestrian_dashboard_segments():
    """取得行人事故危險路段排行"""
    from datetime import datetime
    
    current_year = datetime.now().year
    target_year = current_year - 1  # 前一年
    
    pool = await MySQLPool.create_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            # 查詢路段統計
            await cur.execute("""
                SELECT 
                    location,
                    COUNT(*) as total_accidents,
                    SUM(death_count) as deaths,
                    SUM(injury_count) as injuries
                FROM pedestrian_accidents 
                WHERE YEAR(occur_datetime) = %s AND location IS NOT NULL
                GROUP BY location 
                HAVING COUNT(*) > 0
                ORDER BY total_accidents DESC, deaths DESC
                LIMIT 20
            """, (target_year,))
            
            segments_raw = await cur.fetchall()
            
            # 清理地點並重新統計
            location_stats = {}
            for row in segments_raw:
                cleaned_location = clean_location(row[0])
                if cleaned_location not in location_stats:
                    location_stats[cleaned_location] = {
                        'accidents': 0,
                        'deaths': 0,
                        'injuries': 0
                    }
                location_stats[cleaned_location]['accidents'] += row[1]
                location_stats[cleaned_location]['deaths'] += row[2] or 0
                location_stats[cleaned_location]['injuries'] += row[3] or 0
            
            # 排序並取前10名
            sorted_segments = sorted(
                location_stats.items(), 
                key=lambda x: (x[1]['accidents'], x[1]['deaths']), 
                reverse=True
            )[:10]
            
            return {
                "segments": [
                    {
                        "location": location,
                        "total_accidents": stats['accidents'],
                        "deaths": stats['deaths'],
                        "injuries": stats['injuries']
                    }
                    for location, stats in sorted_segments
                ],
                "year": target_year
            }

@router.delete("/pedestrian/clear")
async def clear_pedestrian_data():
    """清除所有行人事故資料（謹慎使用）"""
    pool = await MySQLPool.create_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute("DELETE FROM pedestrian_accidents")
            affected_rows = cur.rowcount
    
    # 清除快取
    invalidate_cache_group("pedestrian")
    
    return {
        "status": "success",
        "message": f"已清除 {affected_rows} 筆資料"
    }

@router.get("/pedestrian/folium-map")
async def generate_folium_map(
    year: Optional[int] = Query(None),
    accident_type: str = Query("all")
):
    """生成增強版 Folium 地圖 HTML"""
    try:
        from .pedestrian_enhanced_map import generate_enhanced_folium_map, generate_enhanced_javascript
        import folium
        import tempfile
        import os
        
        # 生成地圖和事故資料
        m, all_accidents = await generate_enhanced_folium_map(
            year=year, 
            accident_type=accident_type,
            fetch_pedestrian_map_points=fetch_pedestrian_map_points
        )
        
        if not all_accidents:
            # 如果沒有資料，直接返回簡單地圖
            with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False, encoding='utf-8') as f:
                m.save(f.name)
                
            with open(f.name, 'r', encoding='utf-8') as file:
                html_content = file.read()
                
            os.unlink(f.name)
            
            return {
                "html": html_content,
                "data_count": 0
            }
        
        # 生成增強 JavaScript
        map_js_name = m.get_name()
        enhanced_script = generate_enhanced_javascript(all_accidents, map_js_name)
        
        # 添加 JavaScript 到地圖
        m.get_root().script.add_child(folium.Element(enhanced_script))
        
        # 添加圖層控制
        folium.LayerControl(collapsed=False).add_to(m)
        
        # 添加自定義 CSS
        custom_css = """
        <style>
        .leaflet-control-layers {
            background: rgba(255,255,255,0.95) !important;
            border-radius: 10px !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
        }
        .stats-box, .filter-box {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }
        .leaflet-control-layers-toggle {
            width: 40px !important;
            height: 40px !important;
        }
        .leaflet-control-layers-list {
            padding: 10px !important;
        }
        .leaflet-control-layers-selector {
            margin-right: 8px !important;
        }
        </style>
        """
        m.get_root().html.add_child(folium.Element(custom_css))
        
        # 生成最終 HTML
        with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False, encoding='utf-8') as f:
            m.save(f.name)
            
        with open(f.name, 'r', encoding='utf-8') as file:
            html_content = file.read()
            
        os.unlink(f.name)
        
        return {
            "html": html_content,
            "data_count": len(all_accidents)
        }
        
    except ImportError as exc:
        raise HTTPException(status_code=500, detail="Folium 套件未安裝") from exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成地圖時發生錯誤: {str(e)}") from e


