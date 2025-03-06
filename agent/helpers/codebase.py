from codegen import Codebase, ProgrammingLanguage
from codegen.configs.models.secrets import SecretsConfig
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def format_issue_message(title: str, description: str | None = "", comments=None) -> str:
    """Format a ticket into a message for the agent
    
    Args:
        title: The issue title
        description: The issue description
        comments: List of comments on the issue, each with body, author_name, and created fields
    """
    message = f"""
    Here is a new ticket titled '{title}' and with the description '{description}'.
    """
    
    # Add comments if available
    if comments and len(comments) > 0:
        message += "\n\nComments on this issue:\n"
        for i, comment in enumerate(comments):
            author = comment.get('author_name', 'Unknown')
            created = comment.get('created', '')
            body = comment.get('body', '')
            message += f"\n[Comment {i+1}] {author} ({created}):\n{body}\n"
    
    message += """
    Continue to respond to this query. Use your tools to query the codebase for more context.
    When applicable include references to files and line numbers, code snippets are also encouraged.
    """
    
    return message


def create_codebase(repo_name: str, language: ProgrammingLanguage, github_token: str):
    """Create a Codebase instance from a GitHub repository"""
    # Create secrets config with GitHub token
    if not github_token:
        raise ValueError("GitHub token is required")
    
    secrets = SecretsConfig(github_token=github_token)
    
    return Codebase.from_repo(
        repo_name,
        language=language,
        secrets=secrets
    )