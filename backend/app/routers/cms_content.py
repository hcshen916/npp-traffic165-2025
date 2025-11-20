from fastapi import APIRouter, HTTPException
import aiohttp
import os
from ..cache import cache_result

router = APIRouter()

# CMS設定
CMS_BASE_URL = os.getenv("CMS_BASE_URL", "http://cms:1337")

@cache_result("homepage_settings", ttl=10)
async def fetch_homepage_settings():
    """從CMS獲取首頁設定"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{CMS_BASE_URL}/homepage-setting") as response:
                if response.status == 200:
                    return await response.json()
                elif response.status == 404:
                    # 如果沒有設定資料，返回預設值
                    return {
                        "page_title": "交通安全總覽",
                        "page_subtitle": "即時交通事故數據與分析，促進道路安全改善",
                        "kpi_section_title": "關鍵指標",
                        "kpi_section_year": "2024年",
                        "dangerous_roads_title": "最危險路段",
                        "dangerous_roads_link_text": "查看完整報告 →",
                        "dangerous_roads_custom_content": "",
                        "map_section_title": "事故分布地圖",
                        "map_section_link_text": "開啟完整地圖 →"
                    }
                else:
                    raise HTTPException(status_code=response.status, detail="Failed to fetch homepage settings")
    except Exception as e:
        # 發生錯誤時返回預設值
        return {
            "page_title": "交通安全總覽",
            "page_subtitle": "即時交通事故數據與分析，促進道路安全改善",
            "kpi_section_title": "關鍵指標",
            "kpi_section_year": "2024年",
            "dangerous_roads_title": "最危險路段",
            "dangerous_roads_link_text": "查看完整報告 →",
            "dangerous_roads_custom_content": "",
            "map_section_title": "事故分布地圖",
            "map_section_link_text": "開啟完整地圖 →"
        }

@cache_result("dashboard_settings", ttl=10)
async def fetch_dashboard_settings():
    """從CMS獲取儀表板設定"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{CMS_BASE_URL}/dashboard-setting") as response:
                if response.status == 200:
                    return await response.json()
                elif response.status == 404:
                    # 如果沒有設定資料，返回預設值
                    return {
                        "page_title": "詳細儀表板",
                        "page_subtitle": "深度分析交通事故數據與趨勢",
                        "quick_actions_title": "快速行動",
                        "kpi_overview_title": "關鍵指標概覽",
                        "pedestrian_section_title": "行人事故分析",
                        "dangerous_roads_title": "最危險路段",
                        "cause_analysis_title": "主要肇因分析",
                        "baseline_year_label": "vs 基準年",
                        "upload_data_text": "📤 上傳數據",
                        "view_map_text": "🗺️ 查看地圖",
                        "pedestrian_map_text": "🚶 行人地圖"
                    }
                else:
                    raise HTTPException(status_code=response.status, detail="Failed to fetch dashboard settings")
    except Exception as e:
        # 發生錯誤時返回預設值
        return {
            "page_title": "詳細儀表板",
            "page_subtitle": "深度分析交通事故數據與趨勢",
            "quick_actions_title": "快速行動",
            "kpi_overview_title": "關鍵指標概覽",
            "pedestrian_section_title": "行人事故分析",
            "dangerous_roads_title": "最危險路段",
            "cause_analysis_title": "主要肇因分析",
            "baseline_year_label": "vs 基準年",
            "upload_data_text": "📤 上傳數據",
            "view_map_text": "🗺️ 查看地圖",
            "pedestrian_map_text": "🚶 行人地圖"
        }

@cache_result("kpi_configs", ttl=10)
async def fetch_kpi_configs():
    """從CMS獲取KPI設定"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{CMS_BASE_URL}/kpi-configs") as response:
                if response.status == 200:
                    data = await response.json()
                    # 轉換為以key為索引的字典格式
                    configs = {}
                    for item in data:
                        configs[item['key']] = item
                    return configs
                elif response.status == 404:
                    # 如果沒有設定資料，返回預設值
                    return {
                        "fatal_total": {
                            "key": "fatal_total",
                            "label": "總死亡人數",
                            "icon": "🚨",
                            "display_order": 1,
                            "unit": "人",
                            "color_scheme": "danger"
                        },
                        "fatal_ped": {
                            "key": "fatal_ped",
                            "label": "行人死亡人數",
                            "icon": "🚶",
                            "display_order": 2,
                            "unit": "人",
                            "color_scheme": "danger"
                        },
                        "fatal_minor": {
                            "key": "fatal_minor",
                            "label": "兒少死亡人數",
                            "icon": "👶",
                            "display_order": 3,
                            "unit": "人",
                            "color_scheme": "danger"
                        }
                    }
                else:
                    raise HTTPException(status_code=response.status, detail="Failed to fetch KPI configs")
    except Exception as e:
        # 發生錯誤時返回預設值
        return {
            "fatal_total": {
                "key": "fatal_total",
                "label": "總死亡人數",
                "icon": "🚨",
                "display_order": 1,
                "unit": "人",
                "color_scheme": "danger"
            },
            "fatal_ped": {
                "key": "fatal_ped",
                "label": "行人死亡人數",
                "icon": "🚶",
                "display_order": 2,
                "unit": "人",
                "color_scheme": "danger"
            },
            "fatal_minor": {
                "key": "fatal_minor",
                "label": "兒少死亡人數",
                "icon": "👶",
                "display_order": 3,
                "unit": "人",
                "color_scheme": "danger"
            }
        }

@cache_result("kpi_data", ttl=10)
async def fetch_kpi_data(year: int = 2024):
    """從CMS獲取KPI數據值"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{CMS_BASE_URL}/kpi-data?year={year}&is_active=true") as response:
                if response.status == 200:
                    data = await response.json()
                    # 轉換為以key為索引的字典格式
                    kpi_data = {}
                    for item in data:
                        kpi_data[item['key']] = {
                            "current": int(item['current_value']),
                            "baseline": int(item['baseline_value']),
                            "pct_change": float(item.get('pct_change', 0)),
                            "year": int(item['year']),
                            "baseline_year": int(item['baseline_year']),
                            "notes": item.get('notes', ''),
                            "data_source": item.get('data_source', 'manual')
                        }
                    return kpi_data
                else:
                    # 如果CMS中沒有數據，返回空字典（將使用資料庫計算）
                    return {}
    except Exception as e:
        # 發生錯誤時返回空字典（將使用資料庫計算）
        return {}

@cache_result("dangerous_segments", ttl=10)
async def fetch_dangerous_segments(year: int = 2024, county: str = "ALL", limit: int = 10):
    """從CMS獲取危險路段數據"""
    try:
        async with aiohttp.ClientSession() as session:
            # 構建查詢參數
            params = f"year={year}&is_active=true&_sort=display_order:ASC"
            if county != "ALL":
                params += f"&county={county}"
            if limit:
                params += f"&_limit={limit}"
                
            async with session.get(f"{CMS_BASE_URL}/dangerous-segments?{params}") as response:
                if response.status == 200:
                    data = await response.json()
                    # 轉換為前端期望的格式
                    segments = []
                    for item in data:
                        segments.append({
                            "road_segment_id": item.get('segment_id', ''),
                            "segment_name": item.get('segment_name', ''),
                            "county": item.get('county', ''),
                            "fatal_count": int(item.get('fatal_count', 0)),
                            "accident_count": int(item.get('accident_count', 0)),
                            "injury_count": int(item.get('injury_count', 0)),
                            "risk_level": item.get('risk_level', 'high'),
                            "status_label": item.get('status_label', '高風險'),
                            "display_order": int(item.get('display_order', 0)),
                            "notes": item.get('notes', ''),
                            "data_source": item.get('data_source', 'manual'),
                            "latitude": item.get('latitude'),
                            "longitude": item.get('longitude')
                        })
                    return segments
                else:
                    # 如果CMS中沒有數據，返回空列表（將使用資料庫計算）
                    return []
    except Exception as e:
        # 發生錯誤時返回空列表（將使用資料庫計算）
        return []

@router.get("/cms/homepage-settings")
async def get_homepage_settings():
    """獲取首頁設定"""
    settings = await fetch_homepage_settings()
    return {"settings": settings}

@router.get("/cms/dashboard-settings")
async def get_dashboard_settings():
    """獲取儀表板設定"""
    settings = await fetch_dashboard_settings()
    return {"settings": settings}

@router.get("/cms/kpi-configs")
async def get_kpi_configs():
    """獲取KPI設定"""
    configs = await fetch_kpi_configs()
    return {"configs": configs}

@router.get("/cms/kpi-data")
async def get_kpi_data(year: int = 2024):
    """獲取KPI數據值"""
    kpi_data = await fetch_kpi_data(year)
    return {"data": kpi_data, "year": year}

@router.get("/cms/dangerous-segments")
async def get_dangerous_segments(year: int = 2024, county: str = "ALL", limit: int = 10):
    """獲取危險路段數據"""
    segments = await fetch_dangerous_segments(year, county, limit)
    return {"data": segments, "year": year, "county": county, "limit": limit}
