from fastapi import FastAPI
from contextlib import asynccontextmanager
import uvicorn
import os
from .config import logger
from .db.connection import init_db, close_db
from .services.issue_monitor import start_issue_monitor

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for setup and cleanup"""
    # Setup: create connection pool and start background task
    db_pool = await init_db()
    if db_pool:
        # Start the issue monitoring task
        start_issue_monitor()
    
    yield
    
    # Cleanup: close connection pool
    await close_db()

# Create FastAPI app with lifespan
app = FastAPI(
    title="Codebase PR API",
    description="API that creates PRs using Codebase agent",
    version="0.1.0",
    lifespan=lifespan
)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    from .db.connection import db_pool
    from .services.issue_monitor import last_checked_timestamp
    
    db_status = "connected" if db_pool else "disconnected"
    return {
        "status": "healthy",
        "database": db_status,
        "last_checked_timestamp": str(last_checked_timestamp) if last_checked_timestamp else None
    }

if __name__ == "__main__":
    uvicorn.run("agent.main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=True) 