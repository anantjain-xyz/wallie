from codegen import CodeAgent, ProgrammingLanguage
from codegen.extensions.tools.github.create_pr import create_pr
from fastapi import FastAPI, HTTPException
from helpers import create_codebase, format_ticket_message
from data import TicketRequest, PRResponse
import os
import logging
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Codebase PR API",
    description="API that creates PRs using Codebase agent",
    version="0.1.0",
)

# Get GitHub repo from env or use default
GITHUB_REPO = os.environ.get("GITHUB_REPO", "your-username/your-repo")
PROGRAMMING_LANGUAGE = ProgrammingLanguage.TYPESCRIPT  # Change as needed for your repo


@app.post("/create-pr", response_model=PRResponse)
async def create_pr_from_ticket(request: TicketRequest):
    """Create a PR from a ticket with title and description"""
    if not os.environ.get("GITHUB_TOKEN"):
        raise HTTPException(status_code=500, detail="GitHub token not configured")
    
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise HTTPException(status_code=500, detail="Anthropic API key not configured")
    
    try:
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
    
    except Exception as e:
        logger.error(f"Error creating PR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating PR: {str(e)}")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)