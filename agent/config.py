import os
import logging
from dotenv import load_dotenv
from codegen import ProgrammingLanguage

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database connection settings
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    logger.warning("DATABASE_URL not found in environment variables. Database monitoring will not work.")

# GitHub App settings
GITHUB_APP_ID = os.environ.get("GITHUB_APP_ID")
GITHUB_APP_CLIENT_ID = os.environ.get("GITHUB_APP_CLIENT_ID")
GITHUB_APP_CLIENT_SECRET = os.environ.get("GITHUB_APP_CLIENT_SECRET")
GITHUB_APP_PRIVATE_KEY = os.environ.get("GITHUB_APP_PRIVATE_KEY")
GITHUB_APP_WEBHOOK_SECRET = os.environ.get("GITHUB_APP_WEBHOOK_SECRET")

# Anthropic API settings
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")

# Programming language for the codebase
PROGRAMMING_LANGUAGE = ProgrammingLanguage.TYPESCRIPT  # Change as needed for your repo

# Issue monitoring settings
POLLING_INTERVAL_SECONDS = 2  # Check for new issues every 10 seconds
ERROR_RETRY_SECONDS = 30  # Wait longer after an error 