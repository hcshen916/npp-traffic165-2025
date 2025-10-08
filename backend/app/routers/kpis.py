from fastapi import APIRouter, Query
from ..queries import fetch_kpis
from .cms_content import fetch_kpi_data


router = APIRouter()


@router.get("/kpis")
async def get_kpis(baseline_year: int = 2020, period: str = Query("year:2024")):
    # period 解析（簡化: year:YYYY）
    year = 2024
    if period.startswith("year:"):
        try:
            year = int(period.split(":", 1)[1])
        except Exception:
            year = 2024
    
    # 優先從CMS獲取KPI數據
    cms_kpi_data = await fetch_kpi_data(year)
    
    if cms_kpi_data:
        # 使用CMS中的數據
        metrics = cms_kpi_data
    else:
        # 如果CMS中沒有數據，從資料庫計算
        metrics = await fetch_kpis(year=year, baseline_year=baseline_year)
    
    return {"period": period, "baseline_year": baseline_year, "metrics": metrics, "data_source": "cms" if cms_kpi_data else "database"}

