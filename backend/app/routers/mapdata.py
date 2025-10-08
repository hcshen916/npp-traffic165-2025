from fastapi import APIRouter, Query
from ..queries import fetch_map_points


router = APIRouter()


@router.get("/map/points")
async def map_points(
    category: str = "all", 
    year: int = 2024, 
    bbox: str | None = None,
    limit: int = Query(10000, le=50000)
):
    geojson = await fetch_map_points(category=category, year=year, bbox=bbox, limit=limit)
    geojson["meta"] = {"category": category, "year": year, "bbox": bbox, "limit": limit}
    return geojson

