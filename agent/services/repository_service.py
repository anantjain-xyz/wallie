from codegen import ProgrammingLanguage
import logging
from uuid import UUID

logger = logging.getLogger(__name__)

async def get_repository_language(repo_id: UUID) -> ProgrammingLanguage:
    """Get the default programming language for a repository from the database.
    Falls back to None if not set."""

    from ..db.connection import db_pool
    try:
        async with db_pool.acquire() as conn:
            result = await conn.fetchrow(
                "SELECT default_programming_language FROM github_repository WHERE id = $1",
                repo_id
            )
            
            if result and result['default_programming_language']:
                try:
                    return ProgrammingLanguage[result['default_programming_language']]
                except KeyError:
                    logger.warning(f"Invalid programming language value in database: {result['default_programming_language']}")
            
            return None
    except Exception as e:
        logger.warning(f"Failed to get default programming language for repo {repo_id}: {e}")
        return None