from codegen import Codebase, ProgrammingLanguage
from codegen.configs.models.secrets import SecretsConfig
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def format_issue_message(title: str, description: str | None = "") -> str:
    """Format a ticket into a message for the agent"""
    return f"""
    Here is a new ticket titled '{title}' and with the description '{description}'. Continue to respond to this query. Use your tools to query the codebase for more context.
    When applicable include references to files and line numbers, code snippets are also encouraged. Don't forget to create a pull request with your changes, use the appropriate tool to do so.
    """


def create_codebase(repo_name: str, language: ProgrammingLanguage):
    """Create a Codebase instance from a GitHub repository"""
    # Create secrets config with GitHub token
    secrets = SecretsConfig(github_token=os.environ["GITHUB_TOKEN"])
    
    return Codebase.from_repo(
        repo_name,
        language=language,
        secrets=secrets
    )