from typing import Any, Dict, List
from .db import MySQLPool
from .cache import cache_result


@cache_result("kpis", ttl=300)
async def fetch_kpis(year: int, baseline_year: int) -> Dict[str, Any]:
    pool = await MySQLPool.create_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            # fatal_total
            await cur.execute(
                """
                SELECT COUNT(*)
                FROM accident
                WHERE severity = 'fatal' AND YEAR(occur_dt) = %s
                """,
                (year,),
            )
            (fatal_total,) = await cur.fetchone()

            # ped / minors
            await cur.execute(
                """
                SELECT
                  SUM(victim_type = '行人') AS fatal_ped,
                  SUM(age_group IN ('0-6','7-12','13-17')) AS fatal_minor
                FROM accident
                WHERE severity = 'fatal' AND YEAR(occur_dt) = %s
                """,
                (year,),
            )
            row = await cur.fetchone() or (0, 0)
            fatal_ped, fatal_minor = row

            # baseline
            await cur.execute(
                "SELECT metric, value FROM kpi_baseline WHERE baseline_year = %s",
                (baseline_year,),
            )
            baseline_rows = await cur.fetchall() or []
            baseline_map = {m: v for (m, v) in baseline_rows}

    def pct(cur: int, base: int) -> float:
        if base in (None, 0):
            return 0.0
        return (cur - base) / float(base)

    return {
        "fatal_total": {
            "current": int(fatal_total or 0),
            "baseline": int(baseline_map.get("fatal_total") or 0),
            "pct_change": pct(int(fatal_total or 0), int(baseline_map.get("fatal_total") or 0)),
        },
        "fatal_ped": {
            "current": int(fatal_ped or 0),
            "baseline": int(baseline_map.get("fatal_ped") or 0),
            "pct_change": pct(int(fatal_ped or 0), int(baseline_map.get("fatal_ped") or 0)),
        },
        "fatal_minor": {
            "current": int(fatal_minor or 0),
            "baseline": int(baseline_map.get("fatal_minor") or 0),
            "pct_change": pct(int(fatal_minor or 0), int(baseline_map.get("fatal_minor") or 0)),
        },
    }


@cache_result("segments", ttl=300)
async def fetch_top_segments(county: str, year: int, limit: int, metric: str):
    pool = await MySQLPool.create_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT road_segment_id, county, fatal_count
                FROM segment_stats
                WHERE (%s = 'ALL' OR county = %s) AND (year IS NULL OR year = %s)
                ORDER BY fatal_count DESC
                LIMIT %s
                """,
                (county, county, year, limit),
            )
            rows = await cur.fetchall() or []
    return [
        {
            "road_segment_id": r[0],
            "county": r[1],
            "fatal_count": r[2],
        }
        for r in rows
    ]


@cache_result("map", ttl=600)
async def fetch_map_points(category: str, year: int, bbox: str = None, limit: int = 10000):
    pool = await MySQLPool.create_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            where_clauses = ["severity = 'fatal'", "YEAR(occur_dt) = %s"]
            params = [year]
            
            if category != "all":
                where_clauses.append("accident_category = %s")
                params.append(category)
            
            if bbox:
                # bbox format: "west,south,east,north"
                try:
                    west, south, east, north = map(float, bbox.split(","))
                    where_clauses.extend([
                        "lat BETWEEN %s AND %s",
                        "lng BETWEEN %s AND %s"
                    ])
                    params.extend([south, north, west, east])
                except ValueError:
                    pass
            
            where_sql = " AND ".join(where_clauses)
            params.append(limit)
            
            await cur.execute(
                f"""
                SELECT id, lat, lng, accident_category, victim_type, occur_dt
                FROM accident
                WHERE {where_sql}
                LIMIT %s
                """,
                params,
            )
            rows = await cur.fetchall() or []
    
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
                    "category": row[3],
                    "victim_type": row[4],
                    "occur_dt": row[5].isoformat() if row[5] else None
                }
            })
    
    return {
        "type": "FeatureCollection",
        "features": features
    }

