"""Tool for committing changes to disk."""

from typing import ClassVar

from pydantic import Field

from codegen.sdk.core.codebase import Codebase

from .observation import Observation


class CommitObservation(Observation):
    """Response from committing changes to disk."""

    message: str = Field(
        description="Message describing the commit result",
    )

    str_template: ClassVar[str] = "{message}"


def commit(codebase: Codebase) -> CommitObservation:
    """Commit any pending changes to disk.

    Args:
        codebase: The codebase to operate on

    Returns:
        CommitObservation containing commit status
    """
    try:
        try:
            import os
            import subprocess
            
            repo_root = codebase._op.git_cli.working_dir if hasattr(codebase, '_op') and hasattr(codebase._op, 'git_cli') else None
            
            if repo_root and os.path.exists(os.path.join(repo_root, '.codegen')):
                subprocess.run(['git', 'rm', '--cached', '-r', '.codegen'], cwd=repo_root, stderr=subprocess.PIPE, check=False)
        except Exception as git_error:
            pass
            
        codebase.commit()
        return CommitObservation(
            status="success",
            message="Changes committed to disk",
        )
    except Exception as e:
        return CommitObservation(
            status="error",
            error=f"Failed to commit changes: {e!s}",
            message="Failed to commit changes",
        )
