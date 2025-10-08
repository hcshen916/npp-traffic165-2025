from fastapi import APIRouter


router = APIRouter()


@router.get("/causes/top1")
async def get_cause_top1(year: int = 2024):
    return {
        "year": year,
        "top_vehicle_type": "機車",
        "share": 0.0,
        "total_fatal_cases": 0,
    }

