# Codebase PR Agent

A service that monitors a PostgreSQL database for new issues and automatically creates PRs using the Codebase agent.

## Features

- Monitors a PostgreSQL database for new issues
- Automatically creates PRs for new issues
- Adds comments to issues to track progress
- Provides a health check endpoint

## Project Structure

The project follows a modular structure:

```
agent/
├── __init__.py
├── main.py                # Entry point
├── config.py              # Configuration and environment variables
├── db/                    # Database-related code
│   ├── __init__.py
│   ├── connection.py      # Database connection management
│   └── queries.py         # SQL queries and database operations
├── services/              # Business logic services
│   ├── __init__.py
│   ├── issue_monitor.py   # Issue monitoring service
│   ├── comment_service.py # Comment creation and management
│   └── pr_service.py      # PR creation service
├── data/                  # Data models
│   ├── __init__.py
│   └── models.py
└── helpers/               # Helper functions
    ├── __init__.py
    └── codebase.py
```

## Environment Variables

The application uses the following environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `GITHUB_TOKEN`: GitHub token for creating PRs
- `GITHUB_REPO`: GitHub repository in the format "username/repo"
- `ANTHROPIC_API_KEY`: Anthropic API key for the Codebase agent

## Running the Application

To run the application:

```bash
python -m agent.main
```

The application will start on port 8000 and begin monitoring the database for new issues.

## API Endpoints

- `GET /health`: Health check endpoint that returns the status of the application and database connection

## Development

To set up the development environment:

1. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Create a `.env` file with the required environment variables

3. Run the application in development mode:
   ```bash
   python -m agent.main
   ```