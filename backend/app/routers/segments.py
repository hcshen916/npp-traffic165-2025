from fastapi import APIRouter
from ..queries import fetch_top_segments
from .cms_content import fetch_dangerous_segments


router = APIRouter()


@router.get("/segments/top")
async def top_segments(county: str = "ALL", limit: int = 5, year: int = 2024, metric: str = "fatal_count"):
    # 優先從CMS獲取危險路段數據
    cms_segments = await fetch_dangerous_segments(year=year, county=county, limit=limit)
    
    if cms_segments:
        # 使用CMS中的數據
        items = cms_segments
        data_source = "cms"
    else:
        # 如果CMS中沒有數據，從資料庫計算
        items = await fetch_top_segments(county=county, year=year, limit=limit, metric=metric)
        data_source = "database"
    
    return {
        "filters": {"county": county, "year": year, "metric": metric}, 
        "items": items,
        "data_source": data_source
    }

