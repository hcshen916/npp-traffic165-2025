from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import kpis, causes, segments, mapdata, etl, pedestrian, cms_content
from .db import MySQLPool


def create_app() -> FastAPI:
    app = FastAPI(title="Road Safety API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(kpis.router, prefix="/api", tags=["kpis"])
    app.include_router(causes.router, prefix="/api", tags=["causes"])
    app.include_router(segments.router, prefix="/api", tags=["segments"])
    app.include_router(mapdata.router, prefix="/api", tags=["map"])
    app.include_router(etl.router, prefix="/api", tags=["etl"])
    app.include_router(pedestrian.router, prefix="/api", tags=["pedestrian"])
    app.include_router(cms_content.router, prefix="/api", tags=["cms"])

    @app.get("/api/health")
    async def health():
        return {"ok": True}

    @app.on_event("startup")
    async def on_startup():
        await MySQLPool.create_pool()

    @app.on_event("shutdown")
    async def on_shutdown():
        await MySQLPool.close_pool()

    return app


app = create_app()

