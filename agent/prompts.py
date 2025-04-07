def get_code_mode_prompt(title: str, description: str, comments: list[dict]):
    return f"{CODE_MODE_PROMPT_INTRO}\n{_format_issue_message(title, description, comments, is_project_mode=False)}\n{CODE_MODE_PROMPT_OUTRO}"

CODE_MODE_PROMPT_INTRO = """
The issue details are provided below.
"""

CODE_MODE_PROMPT_OUTRO = """
Continue to respond to this query. Use your tools to query the codebase for more context.
When applicable include references to files and line numbers, code snippets are also encouraged.
"""

def get_project_mode_prompt(title: str, description: str, comments: list[dict]):
    return f"{PROJECT_MODE_PROMPT_INTRO}\n{_format_issue_message(title, description, comments, is_project_mode=True)}\n{PROJECT_MODE_PROMPT_OUTRO}"

PROJECT_MODE_PROMPT_INTRO = """
However, today you are tasked with creating a comprehensive project plan for a software engineering project. Your goal is to analyze a given project description and develop a detailed plan that considers existing features and best practices in software development.
"""

PROJECT_MODE_PROMPT_OUTRO = """
Please follow these steps to create your project plan:

1. Investigate similar features: Use code search tools to identify any existing features or systems that might be similar to the proposed project.

2. Analyze the project context: Consider how the new project might integrate with or build upon existing systems.

3. Think about the product requirements: key features and functionalities, technical requirements, integration points with existing systems, and any constraints or limitations.

4. Create an Engineering Design Doc: Design the technical architecture, components, interfaces, and data models for the project.

5. Break down the project into milestones: Organize the project into significant phases or deliverables.

6. Create tasks for each milestone: For each milestone, list the necessary tasks to complete it.

7. Estimate task complexity: Assign each task a complexity score of 1, 2, or 3 story points.

Throughout this process, work through the following steps inside <project_analysis> tags in your thinking block:
- List and analyze a few similar features or systems, noting their relevance to the current project.
- Write down key points about how the new project integrates with existing systems.
- For the PRD content, list out each component and provide a brief justification for its inclusion.
- When designing the architecture, consider how components interact and why you chose specific approaches.
- When breaking down the project into milestones, list each milestone and provide a rationale for its importance.
- For each task, write down the task description followed by a brief explanation of why it's necessary.
- Justify each complexity estimate by listing factors that contribute to the task's difficulty.

It's OK for this section to be quite long as you work through these steps thoroughly.

Your final output should be structured as follows:

## Engineering Design Doc
[Describe the high-level architecture of the system]

### Key Components
[List and describe the key components of the system]

### Interfaces
[Describe the interfaces between components and/or with external systems]

### Data Structures and Relationships
[Describe the key data structures and relationships]

### Milestones
[List your milestones here, with tasks under each milestone]

#### [Milestone name]
- [Task description] *(Estimate in story points, e.g., 3 points)*
- [Task description] *(Estimate in story points, e.g., 2 points)*
- [... more tasks ...]

#### [Milestone name]
- [Task description] *(Estimate in story points, e.g., 1 point)*
- [... more tasks ...]

[... more milestones ...]

Remember, your final output should ONLY INCLUDE the Design and Milestones sections in the format above. Do not include any other introductory text or comments. Use your project analysis to think through the process, but do not include it in the final output.

IMPORTANT: While you have all tools available at your disposal, DO NOT USE ANY CODE EDITING TOOLS. Only use the tools to read and search the codebase to understand it better, but do not make any edits.
"""


def _format_issue_message(title: str, description: str | None = "", comments: list[dict] = None, is_project_mode: bool = False) -> str:
    """Format a ticket into a message for the agent
    
    Args:
        title: The issue title
        description: The issue description
        comments: List of comments on the issue, each with body, author_name, and created fields
        is_project_mode: Whether the issue is in project mode
    """

    message = f"Here is the {"project" if is_project_mode else "issue"} title:\n"
    message += f"<{'project' if is_project_mode else 'issue'}_title>\n"
    message += f"{title}\n"
    message += f"</{'project' if is_project_mode else 'issue'}_title>\n"

    # Add description if available
    if description and len(description) > 0:
        message += f"Here is the {"project" if is_project_mode else "issue"} description:\n"
        message += f"<{'project' if is_project_mode else 'issue'}_description>\n"
        message += f"{description}\n"
        message += f"</{'project' if is_project_mode else 'issue'}_description>\n"
    
    # Add comments if available
    if comments and len(comments) > 0:
        message += f"\nHere are the comments on this {"project" if is_project_mode else "issue"} so far: \n"
        message += "<comments>"
        for i, comment in enumerate(comments):
            author = comment.get('author_name', 'Unknown')
            created = comment.get('created', '')
            body = comment.get('body', '')
            message += f"\n<comment>\n{author}, ({created}):\n{body}\n</comment>\n"
        message += "</comments>\n"
    return message

