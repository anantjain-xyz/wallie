from codegen import CodeAgent, ProgrammingLanguage
from codegen.extensions.tools.github.create_pr import create_pr
from fastapi import FastAPI, HTTPException, Depends
from helpers import create_codebase, format_ticket_message
from data import TicketRequest, PRResponse
import os
import logging
import uvicorn
from dotenv import load_dotenv
import asyncio
import asyncpg
import time
from contextlib import asynccontextmanager
from typing import List, Dict, Any, Optional
from datetime import datetime

# Import services
from .services import add_agent_comment, set_issue_in_progress

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database connection settings
POSTGRES_URL = os.environ.get("DATABASE_URL")
if not POSTGRES_URL:
    logger.warning("DATABASE_URL not found in environment variables. Database monitoring will not work.")

# Get GitHub repo from env or use default
GITHUB_REPO = os.environ.get("GITHUB_REPO", "your-username/your-repo")
PROGRAMMING_LANGUAGE = ProgrammingLanguage.TYPESCRIPT  # Change as needed for your repo

# Global variable to store the last checked timestamp
last_checked_timestamp = None

# Database connection pool
db_pool = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup: create connection pool and start background task
    global db_pool
    if POSTGRES_URL:
        try:
            db_pool = await asyncpg.create_pool(POSTGRES_URL)
            logger.info("Connected to PostgreSQL database")
            
            # Start the background task to monitor for new issues
            asyncio.create_task(monitor_issues())
        except Exception as e:
            logger.error(f"Failed to connect to database: {str(e)}")
    
    yield
    
    # Cleanup: close connection pool
    if db_pool:
        await db_pool.close()
        logger.info("Closed PostgreSQL connection pool")

# Create FastAPI app with lifespan
app = FastAPI(
    title="Codebase PR API",
    description="API that creates PRs using Codebase agent",
    version="0.1.0",
    lifespan=lifespan
)

async def get_db():
    """Dependency to get a database connection from the pool"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database connection not available")
    
    async with db_pool.acquire() as connection:
        yield connection

async def monitor_issues():
    """Background task to monitor for new issues in the database"""
    global last_checked_timestamp
    
    if not db_pool:
        logger.error("Database connection pool not available. Cannot monitor issues.")
        return
    
    logger.info("Starting issue monitoring task")
    
    # Get the latest timestamp on startup
    try:
        async with db_pool.acquire() as conn:
            # Using created timestamp instead of comparing UUIDs
            result = await conn.fetchval("SELECT MAX(created) FROM issue")
            if result:
                last_checked_timestamp = result
                logger.info(f"Starting issue monitoring from timestamp: {last_checked_timestamp}")
    except Exception as e:
        logger.error(f"Error initializing issue monitoring: {str(e)}")
    
    # Continuous monitoring loop
    while True:
        try:
            await asyncio.sleep(10)  # Check every 10 seconds
            await check_for_new_issues()
        except Exception as e:
            logger.error(f"Error in issue monitoring: {str(e)}")
            await asyncio.sleep(30)  # Wait longer after an error

async def check_for_new_issues():
    """Check for new issues and process them"""
    global last_checked_timestamp
    
    try:
        async with db_pool.acquire() as conn:
            # Using created timestamp for ordering and filtering
            query = """
                SELECT i.id, i.title, i.description, i.created, i.workspace_id
                FROM issue i
                WHERE i.created > $1 OR ($1 IS NULL)
                ORDER BY i.created ASC
            """
            
            rows = await conn.fetch(query, last_checked_timestamp)
            
            if rows:
                logger.info(f"Found {len(rows)} new issues")
                
                for row in rows:
                    issue_id = row['id']
                    title = row['title']
                    description = row['description'] or ""
                    created = row['created']
                    workspace_id = row['workspace_id']
                    
                    # Process the new issue
                    logger.info(f"Processing new issue {issue_id} created at {created}: {title}")
                    
                    # Create a ticket request
                    ticket = TicketRequest(title=title, description=description)
                    
                    try:
                        # Update the issue status to in_progress
                        await set_issue_in_progress(conn, issue_id)

                        # Add a comment that the agent is working on this issue
                        await add_agent_comment(conn, issue_id, workspace_id, "I'm working on this issue and will create a PR soon.")
                        
                        # Process the ticket asynchronously
                        await process_ticket(ticket, issue_id, workspace_id)
                        
                        # Update the last checked timestamp
                        if last_checked_timestamp is None or created > last_checked_timestamp:
                            last_checked_timestamp = created
                    
                    except Exception as e:
                        logger.error(f"Error processing issue {issue_id}: {str(e)}")
                        # Add error comment if there was a problem
                        try:
                            await add_agent_comment(conn, issue_id, workspace_id, f"Error processing this issue: {str(e)}")
                        except Exception as comment_error:
                            logger.error(f"Failed to add error comment: {str(comment_error)}")
    
    except Exception as e:
        logger.error(f"Error checking for new issues: {str(e)}")

async def add_agent_comment(conn, issue_id, workspace_id, body):
    """Add a comment from the agent to the database"""
    try:
        # Get the agent user ID from the database
        agent_user_query = """
            SELECT id FROM app_user 
            WHERE username = 'wallie'
            AND workspace_id = $1
            LIMIT 1
        """
        agent_user_id = await conn.fetchval(agent_user_query, workspace_id)
        
        if not agent_user_id:
            logger.warning("Agent user not found in the database")
            # Create a new agent user
            agent_user_query = """
                INSERT INTO app_user (id, username, full_name, email, workspace_id)
                VALUES (gen_random_uuid(), 'wallie', 'Wallie', 'agent@wallie.app', $1)
                RETURNING id
            """
            agent_user_id = await conn.fetchval(agent_user_query, workspace_id)
        
        # Insert the comment
        comment_query = """
            INSERT INTO comment (id, body, creator_id, issue_id, workspace_id)
            VALUES (gen_random_uuid(), $1, $2, $3, $4)
            RETURNING id
        """
        comment_id = await conn.fetchval(comment_query, body, agent_user_id, issue_id, workspace_id)
        
        logger.info(f"Added agent comment {comment_id} to issue {issue_id}")
        return comment_id
    
    except Exception as e:
        logger.error(f"Error adding agent comment: {str(e)}")
        raise

async def process_ticket(ticket: TicketRequest, issue_id=None, workspace_id=None):
    """Process a ticket by creating a PR"""
    try:
        # This calls our existing function but in an async context
        result = await asyncio.to_thread(create_pr, ticket)
        logger.info(f"Successfully processed ticket: {ticket.title}, PR: {result.pr_url}")
        
        # If we have issue_id and workspace_id, add a comment with the PR URL
        if issue_id and workspace_id and db_pool:
            try:
                async with db_pool.acquire() as conn:
                    pr_comment = f"✅ PR created successfully: {result.pr_url}"
                    await add_agent_comment(conn, issue_id, workspace_id, pr_comment)
            except Exception as comment_error:
                logger.error(f"Failed to add PR success comment: {str(comment_error)}")
        
        return result
    except Exception as e:
        logger.error(f"Error processing ticket: {str(e)}")
        
        # If we have issue_id and workspace_id, add a comment about the error
        if issue_id and workspace_id and db_pool:
            try:
                async with db_pool.acquire() as conn:
                    error_comment = f"❌ Error creating PR: {str(e)}"
                    await add_agent_comment(conn, issue_id, workspace_id, error_comment)
            except Exception as comment_error:
                logger.error(f"Failed to add PR error comment: {str(comment_error)}")
        
        raise

def create_pr(request: TicketRequest) -> PRResponse:
    """Create a PR for a ticket using the Codebase agent"""
    if not os.environ.get("GITHUB_TOKEN"):
        raise Exception("GitHub token not configured")
    
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise Exception("Anthropic API key not configured")
    
    # Create codebase instance
    codebase = create_codebase(GITHUB_REPO, PROGRAMMING_LANGUAGE)
    
    # Format the ticket message
    query = format_ticket_message(request.title, request.description)
    
    # Create and run the agent
    agent = CodeAgent(codebase)
    agent.run(query)
    
    # Create the PR
    pr_title = request.title
    pr_body = f"Automatically generated PR for: {request.title}\n\n"
    if request.description:
        pr_body += f"Description: {request.description}"
    
    create_pr_result = create_pr(codebase, pr_title, pr_body)
    logger.info(f"PR created: {create_pr_result.model_dump_json()}")
    
    # Reset the codebase
    codebase.reset()
    
    return PRResponse(
        status="success",
        pr_url=create_pr_result.url,
        message="PR created successfully"
    )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    db_status = "connected" if db_pool else "disconnected"
    return {
        "status": "healthy",
        "database": db_status,
        "last_checked_timestamp": str(last_checked_timestamp) if last_checked_timestamp else None
    }

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)