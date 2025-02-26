import asyncpg
from fastapi import HTTPException
from ..config import DATABASE_URL, logger

# Database connection pool
db_pool = None

async def init_db():
    """Initialize the database connection pool"""
    global db_pool
    if not DATABASE_URL:
        logger.error("DATABASE_URL not configured. Database functionality will not work.")
        return None
    
    try:
        db_pool = await asyncpg.create_pool(DATABASE_URL)
        logger.info("Connected to PostgreSQL database")
        return db_pool
    except Exception as e:
        logger.error(f"Failed to connect to database: {str(e)}")
        return None

async def close_db():
    """Close the database connection pool"""
    global db_pool
    if db_pool:
        await db_pool.close()
        logger.info("Closed PostgreSQL connection pool")

async def get_db():
    """Dependency to get a database connection from the pool"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database connection not available")
    
    async with db_pool.acquire() as connection:
        yield connection 