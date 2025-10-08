import os
import uuid
import httpx
from datetime import datetime
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from redis import Redis
from rq import Queue
from pydantic import BaseModel
from ..cache import invalidate_cache_group

router = APIRouter()

# Redis & RQ setup
redis_client = Redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"))
etl_queue = Queue("etl", connection=redis_client)


class ETLIngestPayload(BaseModel):
    upload_id: int
    file_url: str
    source: str = "manual"
    year: int
    month: int | None = None
    sha256: str | None = None
    revalidate: bool = True


@router.post("/etl/ingest")
async def etl_ingest(payload: ETLIngestPayload, secret: str | None = None):
    expected = os.getenv("ETL_SECRET")
    if expected and secret != expected:
        raise HTTPException(status_code=401, detail="invalid secret")
    
    # Generate task ID
    task_id = f"etl_{payload.year}{payload.month or ''}_{uuid.uuid4().hex[:8]}"
    
    # Queue ETL job
    try:
        job = etl_queue.enqueue(
            'etl_processor.process_accident_data',
            payload.model_dump(),
            job_id=task_id,
            job_timeout=1800  # 30 minutes
        )
        
        return {
            "task_id": task_id,
            "status": "queued",
            "upload_id": payload.upload_id,
            "queued_at": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to queue job: {str(e)}")


@router.get("/etl/status/{task_id}")
async def etl_status(task_id: str):
    try:
        job = etl_queue.fetch_job(task_id)
        if not job:
            return {"task_id": task_id, "status": "not_found"}
        
        status_map = {
            "started": "running",
            "finished": "success", 
            "failed": "failed",
            "deferred": "queued",
            "scheduled": "queued"
        }
        
        status = status_map.get(job.status, job.status)
        
        result = {
            "task_id": task_id,
            "status": status,
            "created_at": job.created_at.isoformat() if job.created_at else None,
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "ended_at": job.ended_at.isoformat() if job.ended_at else None
        }
        
        # Add progress info if available
        if hasattr(job, 'meta') and job.meta:
            result.update(job.meta)
        
        # Add result if completed
        if job.status == "finished" and job.result:
            result["result"] = job.result
        elif job.status == "failed" and job.exc_info:
            result["error"] = str(job.exc_info)
            
        return result
    except Exception as e:
        return {"task_id": task_id, "status": "error", "error": str(e)}


@router.post("/etl/rollback")
async def etl_rollback(run_id: str):
    # TODO: Implement rollback logic
    # This would involve:
    # 1. Finding the specific ETL run
    # 2. Reverting data changes 
    # 3. Restoring previous state
    # 4. Clearing caches
    
    # For now, just clear caches as a basic rollback
    cleared_kpis = invalidate_cache_group("kpis")
    cleared_segments = invalidate_cache_group("segments") 
    cleared_map = invalidate_cache_group("map")
    
    return {
        "ok": True,
        "run_id": run_id,
        "cache_cleared": {
            "kpis": cleared_kpis,
            "segments": cleared_segments,
            "map": cleared_map
        },
        "message": "Cache cleared, full rollback not yet implemented"
    }


@router.post("/etl/upload")
async def etl_upload(
    file: UploadFile = File(...),
    year: int = Form(...),
    month: int = Form(None),
    source: str = Form("manual"),
    secret: str = Form(None)
):
    """Direct file upload endpoint for testing"""
    expected = os.getenv("ETL_SECRET")
    if expected and secret != expected:
        raise HTTPException(status_code=401, detail="invalid secret")
    
    if not file.filename.endswith(('.csv', '.json', '.geojson')):
        raise HTTPException(status_code=400, detail="Unsupported file type")
    
    # Save file temporarily
    import tempfile
    import shutil
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as tmp:
        shutil.copyfileobj(file.file, tmp)
        temp_path = tmp.name
    
    # Create mock payload for processing
    payload = {
        "upload_id": 0,
        "file_url": f"file://{temp_path}",
        "source": source,
        "year": year,
        "month": month,
        "revalidate": True
    }
    
    # Generate task ID and queue
    task_id = f"etl_{year}{month or ''}_{uuid.uuid4().hex[:8]}"
    
    try:
        job = etl_queue.enqueue(
            'etl_processor.process_accident_data',
            payload,
            job_id=task_id,
            job_timeout=1800
        )
        
        return {
            "task_id": task_id,
            "status": "queued",
            "filename": file.filename,
            "file_size": file.size,
            "queued_at": datetime.now().isoformat()
        }
    except Exception as e:
        # Clean up temp file on error
        os.unlink(temp_path)
        raise HTTPException(status_code=500, detail=f"Failed to queue job: {str(e)}")


@router.delete("/etl/cache")
async def clear_etl_cache(cache_group: str = "all"):
    """Clear ETL-related caches"""
    if cache_group == "all":
        cleared_kpis = invalidate_cache_group("kpis")
        cleared_segments = invalidate_cache_group("segments")
        cleared_map = invalidate_cache_group("map")
        return {
            "cleared": {
                "kpis": cleared_kpis,
                "segments": cleared_segments,
                "map": cleared_map
            }
        }
    else:
        cleared = invalidate_cache_group(cache_group)
        return {"cleared": {cache_group: cleared}}

