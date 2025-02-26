# Codebase PR API

A RESTful API that creates pull requests using the Codebase agent based on ticket information.

## Setup

1. Create a `.env` file based on the `.env.template`:

```bash
cp .env.template .env
```

2. Fill in your GitHub token, repository, and Anthropic API key in the `.env` file.

3. Create a virtual environment and install dependencies using `uv`:

```bash
# Create and activate virtual environment
uv venv
source .venv/bin/activate

# Install dependencies from pyproject.toml
uv pip install -e .
```

4. Run the application:

```bash
python app.py
```

The API will be available at http://localhost:8000

## API Endpoints

### POST /create-pr

Creates a pull request based on ticket information.

**Request body:**

```json
{
  "title": "Implement feature X",
  "description": "Add feature X to the codebase"
}
```

An example request:

```bash
curl -X POST http://localhost:8000/create-pr \
    -H "Content-Type: application/json" \
    -d '{
      "title": "Update blue color to red color",
      "description": "Update `text-blue-600` to text-red-600` in the codebase"
    }'
```

**Response:**

```json
{
  "status": "success",
  "pr_url": "https://github.com/username/repo/pull/1",
  "message": "PR created successfully"
}
```

### GET /health

Health check endpoint.

**Response:**

```json
{
  "status": "healthy"
}
```

## Environment Variables

- `GITHUB_TOKEN`: Your GitHub personal access token
- `GITHUB_REPO`: The GitHub repository to create PRs in (format: "username/repo")
- `ANTHROPIC_API_KEY`: Your Anthropic API key for the agent