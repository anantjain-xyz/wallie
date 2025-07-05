# Wallie System Architecture

## Overview
Wallie is a local-first issue tracking application that provides offline functionality with real-time synchronization. It follows a distributed architecture pattern where each client maintains a local database (PGlite) that stays synchronized with a central PostgreSQL database via ElectricSQL.

## System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        FE[React Frontend]
        PG[PGlite Database]
        EP[Electric Sync Plugin]
        
        FE --> PG
        PG --> EP
    end
    
    subgraph "Server Layer"
        PS[Proxy Server<br/>:3002]
        WS[Write Server<br/>:3001]
        AS[API Server<br/>:3003]
        CS[Cron Server]
        ES[Electric Sync Service<br/>:3000]
        
        PS --> ES
        WS --> DB
        AS --> DB
        CS --> DB
    end
    
    subgraph "Database Layer"
        DB[(PostgreSQL Database)]
    end
    
    subgraph "External Services"
        GA[GitHub App]
        ST[Stripe]
        CL[Clerk Auth]
        AG[Python Agent]
        E2B[E2B Sandbox]
    end
    
    subgraph "Infrastructure"
        DC[Docker Compose]
        TS[Tailscale Funnel]
    end
    
    %% Client to Server connections
    EP -.->|Sync Requests| PS
    FE -->|Write Operations| WS
    FE -->|API Calls| AS
    
    %% External integrations
    AS <--> GA
    AS <--> ST
    AS <--> CL
    AG <--> DB
    AG <--> E2B
    
    %% Infrastructure
    DC -.->|Manages| DB
    DC -.->|Manages| ES
    TS -.->|Exposes| AS
    
    %% Styling
    classDef clientLayer fill:#e1f5fe
    classDef serverLayer fill:#f3e5f5
    classDef databaseLayer fill:#e8f5e8
    classDef externalLayer fill:#fff3e0
    classDef infraLayer fill:#fce4ec
    
    class FE,PG,EP clientLayer
    class PS,WS,AS,CS,ES serverLayer
    class DB databaseLayer
    class GA,ST,CL,AG,E2B externalLayer
    class DC,TS infraLayer
```

## Data Model

```mermaid
erDiagram
    WORKSPACE {
        uuid id PK
        text name
        text url
        text avatar_url
        text[] allowlisted_domains
        text tier
        timestamptz current_billing_cycle_start_date
        int successful_agent_runs_this_cycle
        timestamptz created
        timestamptz modified
    }
    
    APP_USER {
        uuid id PK
        text email
        text username
        text full_name
        text profile_picture
        uuid workspace_id FK
        timestamptz created
        timestamptz modified
    }
    
    ISSUE {
        uuid id PK
        text title
        text description
        text priority
        text status
        text kanbanorder
        uuid creator_id FK
        uuid workspace_id FK
        uuid assignee_id FK
        uuid github_repository_id FK
        int estimate
        int external_id
        text plan
        text design
        timestamptz created
        timestamptz modified
    }
    
    COMMENT {
        uuid id PK
        text body
        uuid creator_id FK
        uuid issue_id FK
        uuid workspace_id FK
        timestamptz created
        timestamptz modified
    }
    
    GITHUB_INSTALLATION {
        uuid id PK
        int github_installation_id
        uuid workspace_id FK
        text github_app_id
        timestamptz created
        timestamptz modified
    }
    
    GITHUB_REPOSITORY {
        uuid id PK
        text name
        text full_name
        text programming_language
        uuid github_installation_id FK
        uuid workspace_id FK
        timestamptz created
        timestamptz modified
    }
    
    GITHUB_BRANCH {
        uuid id PK
        text name
        text sha
        uuid github_repository_id FK
        uuid workspace_id FK
        timestamptz created
        timestamptz modified
    }
    
    ISSUE_LINK {
        uuid id PK
        uuid source_issue_id FK
        uuid target_issue_id FK
        text link_type
        uuid workspace_id FK
        timestamptz created
        timestamptz modified
    }
    
    AGENT_RUN {
        uuid id PK
        uuid issue_id FK
        uuid app_user_id FK
        uuid workspace_id FK
        timestamptz start_time
        timestamptz end_time
        text model_provider
        text model_name
        text status
        timestamptz created
        timestamptz modified
    }
    
    AGENT_RUN_MESSAGE {
        uuid id PK
        uuid agent_run_id FK
        uuid workspace_id FK
        text message
        text type
        timestamptz created
        timestamptz modified
    }
    
    WORKSPACE_SECRETS {
        uuid id PK
        uuid workspace_id FK
        text key
        text encrypted_value
        timestamptz created
        timestamptz modified
    }
    
    WORKSPACE ||--o{ APP_USER : contains
    WORKSPACE ||--o{ ISSUE : contains
    WORKSPACE ||--o{ COMMENT : contains
    WORKSPACE ||--o{ GITHUB_INSTALLATION : has
    WORKSPACE ||--o{ GITHUB_REPOSITORY : contains
    WORKSPACE ||--o{ GITHUB_BRANCH : contains
    WORKSPACE ||--o{ ISSUE_LINK : contains
    WORKSPACE ||--o{ AGENT_RUN : contains
    WORKSPACE ||--o{ AGENT_RUN_MESSAGE : contains
    WORKSPACE ||--o{ WORKSPACE_SECRETS : contains
    
    APP_USER ||--o{ ISSUE : creates
    APP_USER ||--o{ COMMENT : creates
    APP_USER ||--o{ AGENT_RUN : initiates
    APP_USER ||--o{ ISSUE : assigned_to
    
    ISSUE ||--o{ COMMENT : has
    ISSUE ||--o{ AGENT_RUN : triggers
    ISSUE ||--o{ ISSUE_LINK : source
    ISSUE ||--o{ ISSUE_LINK : target
    
    GITHUB_INSTALLATION ||--o{ GITHUB_REPOSITORY : contains
    GITHUB_REPOSITORY ||--o{ GITHUB_BRANCH : has
    GITHUB_REPOSITORY ||--o{ ISSUE : linked_to
    
    AGENT_RUN ||--o{ AGENT_RUN_MESSAGE : produces
```

## Component Interactions

```mermaid
sequenceDiagram
    participant U as User
    participant FE as React Frontend
    participant PG as PGlite
    participant PS as Proxy Server
    participant WS as Write Server
    participant AS as API Server
    participant ES as Electric Sync
    participant DB as PostgreSQL
    participant AG as Python Agent
    
    %% Initial sync
    Note over FE,DB: Application Startup
    FE->>PG: Initialize local database
    PG->>PS: Request sync shapes
    PS->>ES: Forward sync request
    ES->>DB: Query data
    DB-->>ES: Return data
    ES-->>PS: Stream data
    PS-->>PG: Sync data
    
    %% User creates issue
    Note over U,AG: Issue Creation & Processing
    U->>FE: Create new issue
    FE->>PG: Insert issue locally
    PG->>WS: Send write operation
    WS->>DB: Insert issue
    DB-->>WS: Confirm write
    WS-->>PG: Confirm sync
    
    %% Agent processes issue
    AG->>DB: Poll for new issues
    DB-->>AG: Return new issue
    AG->>AS: Get GitHub token
    AS-->>AG: Return token
    AG->>E2B: Execute code
    E2B-->>AG: Return results
    AG->>GitHub: Create PR
    GitHub-->>AG: PR created
    AG->>DB: Update issue status
    
    %% Sync back to client
    ES->>PS: Broadcast changes
    PS->>PG: Sync updates
    PG->>FE: Notify UI
    FE->>U: Show updated issue
```

## Data Flow Patterns

```mermaid
flowchart TD
    subgraph "Write Path"
        W1[User Action] --> W2[Local PGlite Update]
        W2 --> W3[Write Server]
        W3 --> W4[PostgreSQL]
        W4 --> W5[Electric Sync]
        W5 --> W6[Broadcast to Clients]
    end
    
    subgraph "Read Path"
        R1[User Query] --> R2[Local PGlite Query]
        R2 --> R3[Instant Response]
    end
    
    subgraph "Sync Path"
        S1[Electric Sync Service] --> S2[Proxy Server]
        S2 --> S3[PGlite Sync Plugin]
        S3 --> S4[Local Database Update]
        S4 --> S5[UI Refresh]
    end
    
    subgraph "Conflict Resolution"
        C1[Server Change] --> C2[Check Local Modifications]
        C2 --> C3{Conflict?}
        C3 -->|Yes| C4[Merge Strategy]
        C3 -->|No| C5[Apply Change]
        C4 --> C6[Update Local State]
        C5 --> C6
    end
    
    subgraph "Agent Workflow"
        A1[Issue Created] --> A2[Agent Monitors DB]
        A2 --> A3[Process Issue]
        A3 --> A4[Execute Code in E2B]
        A4 --> A5[Create GitHub PR]
        A5 --> A6[Update Issue Status]
    end
    
    %% Styling
    classDef writeFlow fill:#ffebee
    classDef readFlow fill:#e8f5e8
    classDef syncFlow fill:#e3f2fd
    classDef conflictFlow fill:#fff3e0
    classDef agentFlow fill:#f3e5f5
    
    class W1,W2,W3,W4,W5,W6 writeFlow
    class R1,R2,R3 readFlow
    class S1,S2,S3,S4,S5 syncFlow
    class C1,C2,C3,C4,C5,C6 conflictFlow
    class A1,A2,A3,A4,A5,A6 agentFlow
```

## Key Features

### Local-First Architecture
- **PGlite**: In-browser SQL database for offline functionality
- **Electric Sync**: Real-time bidirectional synchronization
- **Conflict Resolution**: Automatic merging of concurrent changes
- **Optimistic Updates**: Immediate UI feedback before server confirmation

### GitHub Integration
- **GitHub App**: OAuth-based repository access
- **Webhook Integration**: Real-time updates from GitHub
- **PR Creation**: Automated pull request generation via AI agent
- **Repository Management**: Multi-repository support per workspace

### AI Agent System
- **Python Agent**: Autonomous issue processing
- **E2B Integration**: Secure code execution environment
- **Multi-model Support**: Configurable AI model providers
- **Workspace Isolation**: Tenant-specific agent runs

### Security & Authentication
- **Clerk Integration**: User authentication and management
- **Workspace Isolation**: Multi-tenant data separation
- **Rate Limiting**: API protection across all servers
- **Encryption**: Secure storage of sensitive data

### Scalability Features
- **Horizontal Scaling**: Multiple server instances
- **Caching**: Efficient data synchronization
- **Database Optimization**: Indexed queries and FTS
- **Resource Management**: Configurable limits and tiers

## Technology Stack

### Frontend
- **React 18**: Component-based UI framework
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Vite**: Fast build tooling

### Backend
- **Node.js**: JavaScript runtime
- **Hono**: Lightweight web framework
- **PostgreSQL**: Primary database
- **ElectricSQL**: Real-time sync service

### Infrastructure
- **Docker Compose**: Local development environment
- **Tailscale**: Secure networking for webhooks
- **Stripe**: Payment processing
- **Clerk**: Authentication service

### AI/ML
- **Python Agent**: Custom AI processing
- **E2B**: Code execution sandbox
- **Multi-provider**: Support for various LLM providers

This architecture provides a robust, scalable foundation for a local-first collaborative issue tracking system with advanced AI capabilities.