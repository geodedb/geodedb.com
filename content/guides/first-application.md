---
title: "Building Your First Application"
description: "Step-by-step guide to building your first Geode graph database application"
weight: 3
tags: ["tutorial", "application", "beginner", "crud", "parameterized-queries"]
categories: ["guides", "getting-started"]
keywords:
  - Geode application
  - graph database application
  - CRUD operations
  - parameterized queries
  - error handling
  - Geode tutorial
---

<!-- CANARY: REQ=REQ-DOCS-003; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Building Your First Application

This guide walks you through building a complete application with Geode. You'll learn how to set up a project, connect to the database, design a data model, perform CRUD operations, and handle errors properly.

## What We're Building

We'll build a simple **Task Management System** that demonstrates:

- Creating nodes (tasks, users, projects)
- Establishing relationships (assignments, ownership)
- Parameterized queries for security
- CRUD operations
- Transaction handling
- Error handling best practices

## Prerequisites

Before starting, ensure you have:

- Geode server running (see [Installation Guide](/guides/installation/))
- Your preferred programming language environment set up
- Basic understanding of graph concepts

Verify Geode is running:

```bash
geode ping localhost:3141
```

---

## Project Setup

Set up your project structure for each language.

{{< tabs >}}
{{< tab "Go" >}}
```bash
# Create project
mkdir geode-tasks && cd geode-tasks
go mod init geode-tasks

# Install dependencies
go get geodedb.com/geode

# Create project structure
mkdir -p cmd/server internal/{models,repository}
touch cmd/server/main.go
touch internal/models/models.go
touch internal/repository/repository.go
```

**Project Structure**:
```
geode-tasks/
├── go.mod
├── go.sum
├── cmd/
│   └── server/
│       └── main.go
└── internal/
    ├── models/
    │   └── models.go
    └── repository/
        └── repository.go
```
{{< /tab >}}
{{< tab "Python" >}}
```bash
# Create project
mkdir geode-tasks && cd geode-tasks
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install geode-client

# Create project structure
mkdir -p src/models src/repository tests
touch src/__init__.py
touch src/models/__init__.py src/models/models.py
touch src/repository/__init__.py src/repository/repository.py
touch src/main.py
touch tests/__init__.py tests/test_repository.py
```

**Project Structure**:
```
geode-tasks/
├── venv/
├── src/
│   ├── __init__.py
│   ├── main.py
│   ├── models/
│   │   ├── __init__.py
│   │   └── models.py
│   └── repository/
│       ├── __init__.py
│       └── repository.py
└── tests/
    ├── __init__.py
    └── test_repository.py
```
{{< /tab >}}
{{< tab "Rust" >}}
```bash
# Create project
cargo new geode-tasks
cd geode-tasks

# Add dependencies to Cargo.toml
cat >> Cargo.toml << 'EOF'
[dependencies]
geode-client = "0.18"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
thiserror = "1"
chrono = { version = "0.4", features = ["serde"] }
EOF

# Create project structure
mkdir -p src/{models,repository}
touch src/models/mod.rs src/repository/mod.rs
```

**Project Structure**:
```
geode-tasks/
├── Cargo.toml
├── Cargo.lock
└── src/
    ├── main.rs
    ├── models/
    │   └── mod.rs
    └── repository/
        └── mod.rs
```
{{< /tab >}}
{{< tab "Node.js" >}}
```bash
# Create project
mkdir geode-tasks && cd geode-tasks
npm init -y

# Install dependencies
npm install @geodedb/client

# For TypeScript support
npm install -D typescript @types/node ts-node
npx tsc --init

# Create project structure
mkdir -p src/{models,repository}
touch src/index.ts
touch src/models/index.ts
touch src/repository/index.ts
```

**Project Structure**:
```
geode-tasks/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── models/
    │   └── index.ts
    └── repository/
        └── index.ts
```
{{< /tab >}}
{{< tab "Zig" >}}
```bash
# Create project
mkdir geode-tasks && cd geode-tasks
zig init

# Create project structure
mkdir -p src/{models,repository}
touch src/models.zig src/repository.zig

# Add geode-client to build.zig.zon (see Installation Guide)
```

**Project Structure**:
```
geode-tasks/
├── build.zig
├── build.zig.zon
└── src/
    ├── main.zig
    ├── models.zig
    └── repository.zig
```
{{< /tab >}}
{{< /tabs >}}

---

## Connecting to Geode

Establish a connection to your Geode server.

{{< tabs >}}
{{< tab "Go" >}}
```go
// internal/repository/repository.go
package repository

import (
    "context"
    "database/sql"
    "fmt"
    "time"

    _ "geodedb.com/geode"
)

type Repository struct {
    db *sql.DB
}

func NewRepository(host string, port int) (*Repository, error) {
    connStr := fmt.Sprintf("%s:%d", host, port)
    db, err := sql.Open("geode", connStr)
    if err != nil {
        return nil, fmt.Errorf("failed to open connection: %w", err)
    }

    // Configure connection pool
    db.SetMaxOpenConns(25)
    db.SetMaxIdleConns(5)
    db.SetConnMaxLifetime(5 * time.Minute)

    // Verify connection
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    if err := db.PingContext(ctx); err != nil {
        return nil, fmt.Errorf("failed to ping database: %w", err)
    }

    return &Repository{db: db}, nil
}

func (r *Repository) Close() error {
    return r.db.Close()
}

func (r *Repository) DB() *sql.DB {
    return r.db
}
```

**Usage**:
```go
// cmd/server/main.go
package main

import (
    "log"
    "geode-tasks/internal/repository"
)

func main() {
    repo, err := repository.NewRepository("localhost", 3141)
    if err != nil {
        log.Fatalf("Failed to connect: %v", err)
    }
    defer repo.Close()

    log.Println("Connected to Geode!")
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
# src/repository/repository.py
from contextlib import asynccontextmanager
from geode_client import Client, Connection
from typing import AsyncIterator

class Repository:
    def __init__(self, host: str = "localhost", port: int = 3141):
        self.client = Client(
            host=host,
            port=port,
            skip_verify=True  # Set to False in production with proper certs
        )

    @asynccontextmanager
    async def connection(self) -> AsyncIterator[Connection]:
        """Get a connection from the pool."""
        async with self.client.connection() as conn:
            yield conn

    async def ping(self) -> bool:
        """Test connectivity."""
        async with self.connection() as conn:
            result = await conn.ping()
            return result is not None
```

**Usage**:
```python
# src/main.py
import asyncio
from repository.repository import Repository

async def main():
    repo = Repository("localhost", 3141)

    if await repo.ping():
        print("Connected to Geode!")
    else:
        print("Failed to connect")

if __name__ == "__main__":
    asyncio.run(main())
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
// src/repository/mod.rs
use geode_client::{Client, Connection, GeodeError};
use std::sync::Arc;

pub struct Repository {
    client: Arc<Client>,
}

impl Repository {
    pub fn new(host: &str, port: u16) -> Self {
        let client = Client::new(host, port).skip_verify(true);
        Repository {
            client: Arc::new(client),
        }
    }

    pub async fn connect(&self) -> Result<Connection, GeodeError> {
        self.client.connect().await
    }

    pub async fn ping(&self) -> Result<bool, GeodeError> {
        let mut conn = self.connect().await?;
        conn.ping().await?;
        Ok(true)
    }
}
```

**Usage**:
```rust
// src/main.rs
mod repository;

use repository::Repository;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let repo = Repository::new("127.0.0.1", 3141);

    if repo.ping().await? {
        println!("Connected to Geode!");
    }

    Ok(())
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
// src/repository/index.ts
import { createClient, GeodeClient } from '@geodedb/client';

export class Repository {
    private client: GeodeClient | null = null;
    private connectionString: string;

    constructor(host: string = 'localhost', port: number = 3141) {
        this.connectionString = `geode://${host}:${port}`;
    }

    async connect(): Promise<void> {
        this.client = await createClient(this.connectionString);
    }

    async close(): Promise<void> {
        if (this.client) {
            await this.client.close();
            this.client = null;
        }
    }

    async ping(): Promise<boolean> {
        if (!this.client) {
            throw new Error('Not connected');
        }
        const result = await this.client.ping();
        return result !== null;
    }

    getClient(): GeodeClient {
        if (!this.client) {
            throw new Error('Not connected');
        }
        return this.client;
    }
}
```

**Usage**:
```typescript
// src/index.ts
import { Repository } from './repository';

async function main() {
    const repo = new Repository('localhost', 3141);
    await repo.connect();

    if (await repo.ping()) {
        console.log('Connected to Geode!');
    }

    await repo.close();
}

main().catch(console.error);
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
// src/repository.zig
const std = @import("std");
const geode = @import("geode_client");

pub const Repository = struct {
    allocator: std.mem.Allocator,
    client: geode.GeodeClient,
    connected: bool,

    pub fn init(allocator: std.mem.Allocator, host: []const u8, port: u16) Repository {
        return Repository{
            .allocator = allocator,
            .client = geode.GeodeClient.init(allocator, host, port, true),
            .connected = false,
        };
    }

    pub fn deinit(self: *Repository) void {
        self.client.deinit();
    }

    pub fn connect(self: *Repository) !void {
        try self.client.connect();
        try self.client.sendHello("geode-tasks", "1.0.0");
        _ = try self.client.receiveMessage(30000);
        self.connected = true;
    }

    pub fn ping(self: *Repository) !bool {
        if (!self.connected) return error.NotConnected;
        try self.client.sendPing();
        _ = try self.client.receiveMessage(30000);
        return true;
    }

    pub fn getClient(self: *Repository) *geode.GeodeClient {
        return &self.client;
    }
};
```

**Usage**:
```zig
// src/main.zig
const std = @import("std");
const Repository = @import("repository.zig").Repository;

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var repo = Repository.init(allocator, "localhost", 3141);
    defer repo.deinit();

    try repo.connect();

    if (try repo.ping()) {
        std.debug.print("Connected to Geode!\n", .{});
    }
}
```
{{< /tab >}}
{{< /tabs >}}

---

## Creating a Data Model

Define your data model using GQL schema concepts.

### Schema Design

Our task management system has the following entities:

```gql
// Users - people who use the system
(:User {
  id: STRING,           // Unique identifier
  email: STRING,        // Email address (unique)
  name: STRING,         // Display name
  created_at: INTEGER   // Unix timestamp
})

// Projects - containers for tasks
(:Project {
  id: STRING,           // Unique identifier
  name: STRING,         // Project name
  description: STRING,  // Project description
  created_at: INTEGER   // Unix timestamp
})

// Tasks - work items
(:Task {
  id: STRING,           // Unique identifier
  title: STRING,        // Task title
  description: STRING,  // Task details
  status: STRING,       // pending, in_progress, completed
  priority: INTEGER,    // 1=low, 2=medium, 3=high
  due_date: INTEGER,    // Unix timestamp (optional)
  created_at: INTEGER,  // Unix timestamp
  updated_at: INTEGER   // Unix timestamp
})

// Relationships
(:User)-[:OWNS]->(:Project)           // User owns projects
(:User)-[:ASSIGNED_TO]->(:Task)       // User is assigned to tasks
(:Project)-[:CONTAINS]->(:Task)       // Projects contain tasks
(:Task)-[:DEPENDS_ON]->(:Task)        // Tasks can depend on other tasks
```

### Model Definitions

{{< tabs >}}
{{< tab "Go" >}}
```go
// internal/models/models.go
package models

import "time"

type User struct {
    ID        string    `json:"id"`
    Email     string    `json:"email"`
    Name      string    `json:"name"`
    CreatedAt time.Time `json:"created_at"`
}

type Project struct {
    ID          string    `json:"id"`
    Name        string    `json:"name"`
    Description string    `json:"description"`
    OwnerID     string    `json:"owner_id"`
    CreatedAt   time.Time `json:"created_at"`
}

type Task struct {
    ID          string     `json:"id"`
    Title       string     `json:"title"`
    Description string     `json:"description"`
    Status      TaskStatus `json:"status"`
    Priority    Priority   `json:"priority"`
    DueDate     *time.Time `json:"due_date,omitempty"`
    ProjectID   string     `json:"project_id"`
    AssigneeID  *string    `json:"assignee_id,omitempty"`
    CreatedAt   time.Time  `json:"created_at"`
    UpdatedAt   time.Time  `json:"updated_at"`
}

type TaskStatus string

const (
    StatusPending    TaskStatus = "pending"
    StatusInProgress TaskStatus = "in_progress"
    StatusCompleted  TaskStatus = "completed"
)

type Priority int

const (
    PriorityLow    Priority = 1
    PriorityMedium Priority = 2
    PriorityHigh   Priority = 3
)
```
{{< /tab >}}
{{< tab "Python" >}}
```python
# src/models/models.py
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional
import uuid

class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

class Priority(int, Enum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3

@dataclass
class User:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    email: str = ""
    name: str = ""
    created_at: datetime = field(default_factory=datetime.now)

@dataclass
class Project:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    description: str = ""
    owner_id: str = ""
    created_at: datetime = field(default_factory=datetime.now)

@dataclass
class Task:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    title: str = ""
    description: str = ""
    status: TaskStatus = TaskStatus.PENDING
    priority: Priority = Priority.MEDIUM
    due_date: Optional[datetime] = None
    project_id: str = ""
    assignee_id: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
// src/models/mod.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TaskStatus {
    Pending,
    InProgress,
    Completed,
}

impl TaskStatus {
    pub fn as_str(&self) -> &str {
        match self {
            TaskStatus::Pending => "pending",
            TaskStatus::InProgress => "in_progress",
            TaskStatus::Completed => "completed",
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[repr(i32)]
pub enum Priority {
    Low = 1,
    Medium = 2,
    High = 3,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub email: String,
    pub name: String,
    pub created_at: DateTime<Utc>,
}

impl User {
    pub fn new(email: String, name: String) -> Self {
        User {
            id: Uuid::new_v4().to_string(),
            email,
            name,
            created_at: Utc::now(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: String,
    pub owner_id: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: String,
    pub status: TaskStatus,
    pub priority: Priority,
    pub due_date: Option<DateTime<Utc>>,
    pub project_id: String,
    pub assignee_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
// src/models/index.ts
import { v4 as uuidv4 } from 'uuid';

export enum TaskStatus {
    Pending = 'pending',
    InProgress = 'in_progress',
    Completed = 'completed',
}

export enum Priority {
    Low = 1,
    Medium = 2,
    High = 3,
}

export interface User {
    id: string;
    email: string;
    name: string;
    createdAt: Date;
}

export interface Project {
    id: string;
    name: string;
    description: string;
    ownerId: string;
    createdAt: Date;
}

export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: Priority;
    dueDate?: Date;
    projectId: string;
    assigneeId?: string;
    createdAt: Date;
    updatedAt: Date;
}

export function createUser(email: string, name: string): User {
    return {
        id: uuidv4(),
        email,
        name,
        createdAt: new Date(),
    };
}

export function createProject(name: string, description: string, ownerId: string): Project {
    return {
        id: uuidv4(),
        name,
        description,
        ownerId,
        createdAt: new Date(),
    };
}

export function createTask(
    title: string,
    description: string,
    projectId: string,
    priority: Priority = Priority.Medium
): Task {
    const now = new Date();
    return {
        id: uuidv4(),
        title,
        description,
        status: TaskStatus.Pending,
        priority,
        projectId,
        createdAt: now,
        updatedAt: now,
    };
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
// src/models.zig
const std = @import("std");

pub const TaskStatus = enum {
    pending,
    in_progress,
    completed,

    pub fn toString(self: TaskStatus) []const u8 {
        return switch (self) {
            .pending => "pending",
            .in_progress => "in_progress",
            .completed => "completed",
        };
    }
};

pub const Priority = enum(i32) {
    low = 1,
    medium = 2,
    high = 3,
};

pub const User = struct {
    id: []const u8,
    email: []const u8,
    name: []const u8,
    created_at: i64,
};

pub const Project = struct {
    id: []const u8,
    name: []const u8,
    description: []const u8,
    owner_id: []const u8,
    created_at: i64,
};

pub const Task = struct {
    id: []const u8,
    title: []const u8,
    description: []const u8,
    status: TaskStatus,
    priority: Priority,
    due_date: ?i64,
    project_id: []const u8,
    assignee_id: ?[]const u8,
    created_at: i64,
    updated_at: i64,
};

pub fn generateId(allocator: std.mem.Allocator) ![]u8 {
    var uuid: [36]u8 = undefined;
    std.crypto.random.bytes(&uuid);
    // Simple UUID-like format
    return try std.fmt.allocPrint(allocator, "{x:0>32}", .{std.crypto.random.int(u128)});
}
```
{{< /tab >}}
{{< /tabs >}}

---

## CRUD Operations with Parameterized Queries

Always use parameterized queries to prevent injection attacks and improve performance.

### Create Operations

{{< tabs >}}
{{< tab "Go" >}}
```go
// internal/repository/user_repository.go
package repository

import (
    "context"
    "fmt"
    "time"

    "geode-tasks/internal/models"
    "github.com/google/uuid"
)

func (r *Repository) CreateUser(ctx context.Context, email, name string) (*models.User, error) {
    user := &models.User{
        ID:        uuid.New().String(),
        Email:     email,
        Name:      name,
        CreatedAt: time.Now(),
    }

    _, err := r.db.ExecContext(ctx, `
        CREATE (:User {
            id: ?,
            email: ?,
            name: ?,
            created_at: ?
        })
    `, user.ID, user.Email, user.Name, user.CreatedAt.Unix())

    if err != nil {
        return nil, fmt.Errorf("failed to create user: %w", err)
    }

    return user, nil
}

func (r *Repository) CreateProject(ctx context.Context, name, description, ownerID string) (*models.Project, error) {
    project := &models.Project{
        ID:          uuid.New().String(),
        Name:        name,
        Description: description,
        OwnerID:     ownerID,
        CreatedAt:   time.Now(),
    }

    _, err := r.db.ExecContext(ctx, `
        CREATE (:Project {
            id: ?,
            name: ?,
            description: ?,
            created_at: ?
        })
    `, project.ID, project.Name, project.Description, project.CreatedAt.Unix())
    if err != nil {
        return nil, fmt.Errorf("failed to create project: %w", err)
    }

    // Create OWNS relationship
    _, err = r.db.ExecContext(ctx, `
        MATCH (u:User {id: ?})
        MATCH (p:Project {id: ?})
        CREATE (u)-[:OWNS]->(p)
    `, ownerID, project.ID)
    if err != nil {
        return nil, fmt.Errorf("failed to create ownership: %w", err)
    }

    return project, nil
}

func (r *Repository) CreateTask(ctx context.Context, title, description, projectID string, priority models.Priority) (*models.Task, error) {
    now := time.Now()
    task := &models.Task{
        ID:          uuid.New().String(),
        Title:       title,
        Description: description,
        Status:      models.StatusPending,
        Priority:    priority,
        ProjectID:   projectID,
        CreatedAt:   now,
        UpdatedAt:   now,
    }

    _, err := r.db.ExecContext(ctx, `
        CREATE (:Task {
            id: ?,
            title: ?,
            description: ?,
            status: ?,
            priority: ?,
            created_at: ?,
            updated_at: ?
        })
    `, task.ID, task.Title, task.Description, string(task.Status), int(task.Priority),
       task.CreatedAt.Unix(), task.UpdatedAt.Unix())
    if err != nil {
        return nil, fmt.Errorf("failed to create task: %w", err)
    }

    // Create CONTAINS relationship
    _, err = r.db.ExecContext(ctx, `
        MATCH (p:Project {id: ?})
        MATCH (t:Task {id: ?})
        CREATE (p)-[:CONTAINS]->(t)
    `, projectID, task.ID)
    if err != nil {
        return nil, fmt.Errorf("failed to link task to project: %w", err)
    }

    return task, nil
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
# src/repository/repository.py (continued)
from datetime import datetime
from typing import Optional
import uuid
from models.models import User, Project, Task, TaskStatus, Priority

class Repository:
    # ... previous connection code ...

    async def create_user(self, email: str, name: str) -> User:
        """Create a new user."""
        user = User(
            id=str(uuid.uuid4()),
            email=email,
            name=name,
            created_at=datetime.now()
        )

        async with self.connection() as conn:
            await conn.execute(
                """
                CREATE (:User {
                    id: $id,
                    email: $email,
                    name: $name,
                    created_at: $created_at
                })
                """,
                {
                    "id": user.id,
                    "email": user.email,
                    "name": user.name,
                    "created_at": int(user.created_at.timestamp())
                }
            )

        return user

    async def create_project(
        self, name: str, description: str, owner_id: str
    ) -> Project:
        """Create a new project with owner relationship."""
        project = Project(
            id=str(uuid.uuid4()),
            name=name,
            description=description,
            owner_id=owner_id,
            created_at=datetime.now()
        )

        async with self.connection() as conn:
            # Create project node
            await conn.execute(
                """
                CREATE (:Project {
                    id: $id,
                    name: $name,
                    description: $description,
                    created_at: $created_at
                })
                """,
                {
                    "id": project.id,
                    "name": project.name,
                    "description": project.description,
                    "created_at": int(project.created_at.timestamp())
                }
            )

            # Create OWNS relationship
            await conn.execute(
                """
                MATCH (u:User {id: $owner_id})
                MATCH (p:Project {id: $project_id})
                CREATE (u)-[:OWNS]->(p)
                """,
                {"owner_id": owner_id, "project_id": project.id}
            )

        return project

    async def create_task(
        self,
        title: str,
        description: str,
        project_id: str,
        priority: Priority = Priority.MEDIUM
    ) -> Task:
        """Create a new task in a project."""
        now = datetime.now()
        task = Task(
            id=str(uuid.uuid4()),
            title=title,
            description=description,
            status=TaskStatus.PENDING,
            priority=priority,
            project_id=project_id,
            created_at=now,
            updated_at=now
        )

        async with self.connection() as conn:
            # Create task node
            await conn.execute(
                """
                CREATE (:Task {
                    id: $id,
                    title: $title,
                    description: $description,
                    status: $status,
                    priority: $priority,
                    created_at: $created_at,
                    updated_at: $updated_at
                })
                """,
                {
                    "id": task.id,
                    "title": task.title,
                    "description": task.description,
                    "status": task.status.value,
                    "priority": task.priority.value,
                    "created_at": int(task.created_at.timestamp()),
                    "updated_at": int(task.updated_at.timestamp())
                }
            )

            # Create CONTAINS relationship
            await conn.execute(
                """
                MATCH (p:Project {id: $project_id})
                MATCH (t:Task {id: $task_id})
                CREATE (p)-[:CONTAINS]->(t)
                """,
                {"project_id": project_id, "task_id": task.id}
            )

        return task
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
// src/repository/mod.rs (continued)
use crate::models::{User, Project, Task, TaskStatus, Priority};
use std::collections::HashMap;
use geode_client::Value;
use chrono::Utc;
use uuid::Uuid;

impl Repository {
    pub async fn create_user(&self, email: String, name: String) -> Result<User, GeodeError> {
        let user = User::new(email, name);
        let mut conn = self.connect().await?;

        let mut params = HashMap::new();
        params.insert("id".to_string(), Value::string(&user.id));
        params.insert("email".to_string(), Value::string(&user.email));
        params.insert("name".to_string(), Value::string(&user.name));
        params.insert("created_at".to_string(), Value::int(user.created_at.timestamp()));

        conn.query_with_params(r#"
            CREATE (:User {
                id: $id,
                email: $email,
                name: $name,
                created_at: $created_at
            })
        "#, &params).await?;

        Ok(user)
    }

    pub async fn create_project(
        &self,
        name: String,
        description: String,
        owner_id: String,
    ) -> Result<Project, GeodeError> {
        let project = Project {
            id: Uuid::new_v4().to_string(),
            name,
            description,
            owner_id: owner_id.clone(),
            created_at: Utc::now(),
        };

        let mut conn = self.connect().await?;

        // Create project node
        let mut params = HashMap::new();
        params.insert("id".to_string(), Value::string(&project.id));
        params.insert("name".to_string(), Value::string(&project.name));
        params.insert("description".to_string(), Value::string(&project.description));
        params.insert("created_at".to_string(), Value::int(project.created_at.timestamp()));

        conn.query_with_params(r#"
            CREATE (:Project {
                id: $id,
                name: $name,
                description: $description,
                created_at: $created_at
            })
        "#, &params).await?;

        // Create OWNS relationship
        let mut rel_params = HashMap::new();
        rel_params.insert("owner_id".to_string(), Value::string(&owner_id));
        rel_params.insert("project_id".to_string(), Value::string(&project.id));

        conn.query_with_params(r#"
            MATCH (u:User {id: $owner_id})
            MATCH (p:Project {id: $project_id})
            CREATE (u)-[:OWNS]->(p)
        "#, &rel_params).await?;

        Ok(project)
    }

    pub async fn create_task(
        &self,
        title: String,
        description: String,
        project_id: String,
        priority: Priority,
    ) -> Result<Task, GeodeError> {
        let now = Utc::now();
        let task = Task {
            id: Uuid::new_v4().to_string(),
            title,
            description,
            status: TaskStatus::Pending,
            priority,
            due_date: None,
            project_id: project_id.clone(),
            assignee_id: None,
            created_at: now,
            updated_at: now,
        };

        let mut conn = self.connect().await?;

        // Create task node
        let mut params = HashMap::new();
        params.insert("id".to_string(), Value::string(&task.id));
        params.insert("title".to_string(), Value::string(&task.title));
        params.insert("description".to_string(), Value::string(&task.description));
        params.insert("status".to_string(), Value::string(task.status.as_str()));
        params.insert("priority".to_string(), Value::int(task.priority as i64));
        params.insert("created_at".to_string(), Value::int(task.created_at.timestamp()));
        params.insert("updated_at".to_string(), Value::int(task.updated_at.timestamp()));

        conn.query_with_params(r#"
            CREATE (:Task {
                id: $id,
                title: $title,
                description: $description,
                status: $status,
                priority: $priority,
                created_at: $created_at,
                updated_at: $updated_at
            })
        "#, &params).await?;

        // Create CONTAINS relationship
        let mut rel_params = HashMap::new();
        rel_params.insert("project_id".to_string(), Value::string(&project_id));
        rel_params.insert("task_id".to_string(), Value::string(&task.id));

        conn.query_with_params(r#"
            MATCH (p:Project {id: $project_id})
            MATCH (t:Task {id: $task_id})
            CREATE (p)-[:CONTAINS]->(t)
        "#, &rel_params).await?;

        Ok(task)
    }
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
// src/repository/index.ts (continued)
import { User, Project, Task, TaskStatus, Priority, createUser, createProject, createTask } from '../models';

export class Repository {
    // ... previous connection code ...

    async createUser(email: string, name: string): Promise<User> {
        const user = createUser(email, name);
        const client = this.getClient();

        await client.exec(
            `CREATE (:User {
                id: $id,
                email: $email,
                name: $name,
                created_at: $created_at
            })`,
            {
                params: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    created_at: Math.floor(user.createdAt.getTime() / 1000),
                },
            }
        );

        return user;
    }

    async createProject(name: string, description: string, ownerId: string): Promise<Project> {
        const project = createProject(name, description, ownerId);
        const client = this.getClient();

        // Create project node
        await client.exec(
            `CREATE (:Project {
                id: $id,
                name: $name,
                description: $description,
                created_at: $created_at
            })`,
            {
                params: {
                    id: project.id,
                    name: project.name,
                    description: project.description,
                    created_at: Math.floor(project.createdAt.getTime() / 1000),
                },
            }
        );

        // Create OWNS relationship
        await client.exec(
            `MATCH (u:User {id: $owner_id})
             MATCH (p:Project {id: $project_id})
             CREATE (u)-[:OWNS]->(p)`,
            {
                params: { owner_id: ownerId, project_id: project.id },
            }
        );

        return project;
    }

    async createTask(
        title: string,
        description: string,
        projectId: string,
        priority: Priority = Priority.Medium
    ): Promise<Task> {
        const task = createTask(title, description, projectId, priority);
        const client = this.getClient();

        // Create task node
        await client.exec(
            `CREATE (:Task {
                id: $id,
                title: $title,
                description: $description,
                status: $status,
                priority: $priority,
                created_at: $created_at,
                updated_at: $updated_at
            })`,
            {
                params: {
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    status: task.status,
                    priority: task.priority,
                    created_at: Math.floor(task.createdAt.getTime() / 1000),
                    updated_at: Math.floor(task.updatedAt.getTime() / 1000),
                },
            }
        );

        // Create CONTAINS relationship
        await client.exec(
            `MATCH (p:Project {id: $project_id})
             MATCH (t:Task {id: $task_id})
             CREATE (p)-[:CONTAINS]->(t)`,
            {
                params: { project_id: projectId, task_id: task.id },
            }
        );

        return task;
    }
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
// src/repository.zig (continued)
const models = @import("models.zig");

pub const Repository = struct {
    // ... previous connection code ...

    pub fn createUser(self: *Repository, email: []const u8, name: []const u8) !models.User {
        const id = try models.generateId(self.allocator);
        const created_at = std.time.timestamp();

        var params = std.json.ObjectMap.init(self.allocator);
        defer params.deinit();
        try params.put("id", .{ .string = id });
        try params.put("email", .{ .string = email });
        try params.put("name", .{ .string = name });
        try params.put("created_at", .{ .integer = created_at });

        try self.client.sendRunGql(1,
            \\CREATE (:User {
            \\    id: $id,
            \\    email: $email,
            \\    name: $name,
            \\    created_at: $created_at
            \\})
        , .{ .object = params });
        _ = try self.client.receiveMessage(30000);

        return models.User{
            .id = id,
            .email = email,
            .name = name,
            .created_at = created_at,
        };
    }

    pub fn createProject(
        self: *Repository,
        name: []const u8,
        description: []const u8,
        owner_id: []const u8,
    ) !models.Project {
        const id = try models.generateId(self.allocator);
        const created_at = std.time.timestamp();

        // Create project node
        var params = std.json.ObjectMap.init(self.allocator);
        defer params.deinit();
        try params.put("id", .{ .string = id });
        try params.put("name", .{ .string = name });
        try params.put("description", .{ .string = description });
        try params.put("created_at", .{ .integer = created_at });

        try self.client.sendRunGql(1,
            \\CREATE (:Project {
            \\    id: $id,
            \\    name: $name,
            \\    description: $description,
            \\    created_at: $created_at
            \\})
        , .{ .object = params });
        _ = try self.client.receiveMessage(30000);

        // Create OWNS relationship
        params.clearRetainingCapacity();
        try params.put("owner_id", .{ .string = owner_id });
        try params.put("project_id", .{ .string = id });

        try self.client.sendRunGql(2,
            \\MATCH (u:User {id: $owner_id})
            \\MATCH (p:Project {id: $project_id})
            \\CREATE (u)-[:OWNS]->(p)
        , .{ .object = params });
        _ = try self.client.receiveMessage(30000);

        return models.Project{
            .id = id,
            .name = name,
            .description = description,
            .owner_id = owner_id,
            .created_at = created_at,
        };
    }

    pub fn createTask(
        self: *Repository,
        title: []const u8,
        description: []const u8,
        project_id: []const u8,
        priority: models.Priority,
    ) !models.Task {
        const id = try models.generateId(self.allocator);
        const now = std.time.timestamp();

        var params = std.json.ObjectMap.init(self.allocator);
        defer params.deinit();
        try params.put("id", .{ .string = id });
        try params.put("title", .{ .string = title });
        try params.put("description", .{ .string = description });
        try params.put("status", .{ .string = "pending" });
        try params.put("priority", .{ .integer = @intFromEnum(priority) });
        try params.put("created_at", .{ .integer = now });
        try params.put("updated_at", .{ .integer = now });

        try self.client.sendRunGql(1,
            \\CREATE (:Task {
            \\    id: $id,
            \\    title: $title,
            \\    description: $description,
            \\    status: $status,
            \\    priority: $priority,
            \\    created_at: $created_at,
            \\    updated_at: $updated_at
            \\})
        , .{ .object = params });
        _ = try self.client.receiveMessage(30000);

        // Create CONTAINS relationship
        params.clearRetainingCapacity();
        try params.put("project_id", .{ .string = project_id });
        try params.put("task_id", .{ .string = id });

        try self.client.sendRunGql(2,
            \\MATCH (p:Project {id: $project_id})
            \\MATCH (t:Task {id: $task_id})
            \\CREATE (p)-[:CONTAINS]->(t)
        , .{ .object = params });
        _ = try self.client.receiveMessage(30000);

        return models.Task{
            .id = id,
            .title = title,
            .description = description,
            .status = .pending,
            .priority = priority,
            .due_date = null,
            .project_id = project_id,
            .assignee_id = null,
            .created_at = now,
            .updated_at = now,
        };
    }
};
```
{{< /tab >}}
{{< /tabs >}}

### Read Operations

{{< tabs >}}
{{< tab "Go" >}}
```go
// internal/repository/query_repository.go
package repository

import (
    "context"
    "database/sql"
    "fmt"
    "time"

    "geode-tasks/internal/models"
)

func (r *Repository) GetUserByID(ctx context.Context, id string) (*models.User, error) {
    row := r.db.QueryRowContext(ctx, `
        MATCH (u:User {id: ?})
        RETURN u.id, u.email, u.name, u.created_at
    `, id)

    var user models.User
    var createdAt int64
    err := row.Scan(&user.ID, &user.Email, &user.Name, &createdAt)
    if err == sql.ErrNoRows {
        return nil, nil
    }
    if err != nil {
        return nil, fmt.Errorf("failed to get user: %w", err)
    }

    user.CreatedAt = time.Unix(createdAt, 0)
    return &user, nil
}

func (r *Repository) GetTasksByProject(ctx context.Context, projectID string) ([]models.Task, error) {
    rows, err := r.db.QueryContext(ctx, `
        MATCH (p:Project {id: ?})-[:CONTAINS]->(t:Task)
        RETURN t.id, t.title, t.description, t.status, t.priority,
               t.created_at, t.updated_at
        ORDER BY t.priority DESC, t.created_at DESC
    `, projectID)
    if err != nil {
        return nil, fmt.Errorf("failed to query tasks: %w", err)
    }
    defer rows.Close()

    var tasks []models.Task
    for rows.Next() {
        var task models.Task
        var status string
        var priority, createdAt, updatedAt int64

        err := rows.Scan(&task.ID, &task.Title, &task.Description,
            &status, &priority, &createdAt, &updatedAt)
        if err != nil {
            return nil, fmt.Errorf("failed to scan task: %w", err)
        }

        task.Status = models.TaskStatus(status)
        task.Priority = models.Priority(priority)
        task.ProjectID = projectID
        task.CreatedAt = time.Unix(createdAt, 0)
        task.UpdatedAt = time.Unix(updatedAt, 0)
        tasks = append(tasks, task)
    }

    return tasks, nil
}

func (r *Repository) GetUserTasks(ctx context.Context, userID string) ([]models.Task, error) {
    rows, err := r.db.QueryContext(ctx, `
        MATCH (u:User {id: ?})-[:ASSIGNED_TO]->(t:Task)
        RETURN t.id, t.title, t.status, t.priority, t.due_date
        ORDER BY t.due_date ASC, t.priority DESC
    `, userID)
    if err != nil {
        return nil, fmt.Errorf("failed to query user tasks: %w", err)
    }
    defer rows.Close()

    var tasks []models.Task
    for rows.Next() {
        var task models.Task
        var status string
        var priority int64
        var dueDate sql.NullInt64

        err := rows.Scan(&task.ID, &task.Title, &status, &priority, &dueDate)
        if err != nil {
            return nil, fmt.Errorf("failed to scan task: %w", err)
        }

        task.Status = models.TaskStatus(status)
        task.Priority = models.Priority(priority)
        task.AssigneeID = &userID
        if dueDate.Valid {
            t := time.Unix(dueDate.Int64, 0)
            task.DueDate = &t
        }
        tasks = append(tasks, task)
    }

    return tasks, nil
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
# src/repository/repository.py (continued)
from typing import List, Optional

class Repository:
    # ... previous code ...

    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get a user by ID."""
        async with self.connection() as conn:
            page, _ = await conn.query(
                """
                MATCH (u:User {id: $id})
                RETURN u.id, u.email, u.name, u.created_at
                """,
                {"id": user_id}
            )

            if not page.rows:
                return None

            row = page.rows[0]
            return User(
                id=row['u.id'].as_string,
                email=row['u.email'].as_string,
                name=row['u.name'].as_string,
                created_at=datetime.fromtimestamp(row['u.created_at'].as_int)
            )

    async def get_tasks_by_project(self, project_id: str) -> List[Task]:
        """Get all tasks in a project."""
        async with self.connection() as conn:
            page, _ = await conn.query(
                """
                MATCH (p:Project {id: $project_id})-[:CONTAINS]->(t:Task)
                RETURN t.id, t.title, t.description, t.status, t.priority,
                       t.created_at, t.updated_at
                ORDER BY t.priority DESC, t.created_at DESC
                """,
                {"project_id": project_id}
            )

            tasks = []
            for row in page.rows:
                task = Task(
                    id=row['t.id'].as_string,
                    title=row['t.title'].as_string,
                    description=row['t.description'].as_string,
                    status=TaskStatus(row['t.status'].as_string),
                    priority=Priority(row['t.priority'].as_int),
                    project_id=project_id,
                    created_at=datetime.fromtimestamp(row['t.created_at'].as_int),
                    updated_at=datetime.fromtimestamp(row['t.updated_at'].as_int)
                )
                tasks.append(task)

            return tasks

    async def get_user_tasks(self, user_id: str) -> List[Task]:
        """Get all tasks assigned to a user."""
        async with self.connection() as conn:
            page, _ = await conn.query(
                """
                MATCH (u:User {id: $user_id})-[:ASSIGNED_TO]->(t:Task)
                RETURN t.id, t.title, t.status, t.priority, t.due_date
                ORDER BY t.due_date ASC, t.priority DESC
                """,
                {"user_id": user_id}
            )

            tasks = []
            for row in page.rows:
                due_date = None
                if row.get('t.due_date') and row['t.due_date'].as_int:
                    due_date = datetime.fromtimestamp(row['t.due_date'].as_int)

                task = Task(
                    id=row['t.id'].as_string,
                    title=row['t.title'].as_string,
                    status=TaskStatus(row['t.status'].as_string),
                    priority=Priority(row['t.priority'].as_int),
                    due_date=due_date,
                    assignee_id=user_id
                )
                tasks.append(task)

            return tasks
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
// src/repository/mod.rs (continued)
impl Repository {
    pub async fn get_user_by_id(&self, user_id: &str) -> Result<Option<User>, GeodeError> {
        let mut conn = self.connect().await?;

        let mut params = HashMap::new();
        params.insert("id".to_string(), Value::string(user_id));

        let (page, _) = conn.query_with_params(r#"
            MATCH (u:User {id: $id})
            RETURN u.id, u.email, u.name, u.created_at
        "#, &params).await?;

        if page.rows.is_empty() {
            return Ok(None);
        }

        let row = &page.rows[0];
        let user = User {
            id: row.get("u.id").unwrap().as_string()?,
            email: row.get("u.email").unwrap().as_string()?,
            name: row.get("u.name").unwrap().as_string()?,
            created_at: DateTime::from_timestamp(
                row.get("u.created_at").unwrap().as_int()?,
                0
            ).unwrap(),
        };

        Ok(Some(user))
    }

    pub async fn get_tasks_by_project(&self, project_id: &str) -> Result<Vec<Task>, GeodeError> {
        let mut conn = self.connect().await?;

        let mut params = HashMap::new();
        params.insert("project_id".to_string(), Value::string(project_id));

        let (page, _) = conn.query_with_params(r#"
            MATCH (p:Project {id: $project_id})-[:CONTAINS]->(t:Task)
            RETURN t.id, t.title, t.description, t.status, t.priority,
                   t.created_at, t.updated_at
            ORDER BY t.priority DESC, t.created_at DESC
        "#, &params).await?;

        let mut tasks = Vec::new();
        for row in &page.rows {
            let status = match row.get("t.status").unwrap().as_string()?.as_str() {
                "pending" => TaskStatus::Pending,
                "in_progress" => TaskStatus::InProgress,
                "completed" => TaskStatus::Completed,
                _ => TaskStatus::Pending,
            };

            let priority = match row.get("t.priority").unwrap().as_int()? {
                1 => Priority::Low,
                2 => Priority::Medium,
                3 => Priority::High,
                _ => Priority::Medium,
            };

            let task = Task {
                id: row.get("t.id").unwrap().as_string()?,
                title: row.get("t.title").unwrap().as_string()?,
                description: row.get("t.description").unwrap().as_string()?,
                status,
                priority,
                due_date: None,
                project_id: project_id.to_string(),
                assignee_id: None,
                created_at: DateTime::from_timestamp(
                    row.get("t.created_at").unwrap().as_int()?, 0
                ).unwrap(),
                updated_at: DateTime::from_timestamp(
                    row.get("t.updated_at").unwrap().as_int()?, 0
                ).unwrap(),
            };
            tasks.push(task);
        }

        Ok(tasks)
    }
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
// src/repository/index.ts (continued)
export class Repository {
    // ... previous code ...

    async getUserById(userId: string): Promise<User | null> {
        const client = this.getClient();

        const rows = await client.queryAll(
            `MATCH (u:User {id: $id})
             RETURN u.id, u.email, u.name, u.created_at`,
            { params: { id: userId } }
        );

        if (rows.length === 0) {
            return null;
        }

        const row = rows[0];
        return {
            id: row.get('u.id')?.asString ?? '',
            email: row.get('u.email')?.asString ?? '',
            name: row.get('u.name')?.asString ?? '',
            createdAt: new Date((row.get('u.created_at')?.asNumber ?? 0) * 1000),
        };
    }

    async getTasksByProject(projectId: string): Promise<Task[]> {
        const client = this.getClient();

        const rows = await client.queryAll(
            `MATCH (p:Project {id: $project_id})-[:CONTAINS]->(t:Task)
             RETURN t.id, t.title, t.description, t.status, t.priority,
                    t.created_at, t.updated_at
             ORDER BY t.priority DESC, t.created_at DESC`,
            { params: { project_id: projectId } }
        );

        return rows.map((row) => ({
            id: row.get('t.id')?.asString ?? '',
            title: row.get('t.title')?.asString ?? '',
            description: row.get('t.description')?.asString ?? '',
            status: row.get('t.status')?.asString as TaskStatus ?? TaskStatus.Pending,
            priority: row.get('t.priority')?.asNumber as Priority ?? Priority.Medium,
            projectId,
            createdAt: new Date((row.get('t.created_at')?.asNumber ?? 0) * 1000),
            updatedAt: new Date((row.get('t.updated_at')?.asNumber ?? 0) * 1000),
        }));
    }

    async getUserTasks(userId: string): Promise<Task[]> {
        const client = this.getClient();

        const rows = await client.queryAll(
            `MATCH (u:User {id: $user_id})-[:ASSIGNED_TO]->(t:Task)
             RETURN t.id, t.title, t.status, t.priority, t.due_date
             ORDER BY t.due_date ASC, t.priority DESC`,
            { params: { user_id: userId } }
        );

        return rows.map((row) => {
            const dueDateValue = row.get('t.due_date')?.asNumber;
            return {
                id: row.get('t.id')?.asString ?? '',
                title: row.get('t.title')?.asString ?? '',
                description: '',
                status: row.get('t.status')?.asString as TaskStatus ?? TaskStatus.Pending,
                priority: row.get('t.priority')?.asNumber as Priority ?? Priority.Medium,
                dueDate: dueDateValue ? new Date(dueDateValue * 1000) : undefined,
                projectId: '',
                assigneeId: userId,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
        });
    }
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
// src/repository.zig (continued)
pub const Repository = struct {
    // ... previous code ...

    pub fn getUserById(self: *Repository, user_id: []const u8) !?models.User {
        var params = std.json.ObjectMap.init(self.allocator);
        defer params.deinit();
        try params.put("id", .{ .string = user_id });

        try self.client.sendRunGql(1,
            \\MATCH (u:User {id: $id})
            \\RETURN u.id, u.email, u.name, u.created_at
        , .{ .object = params });

        const schema = try self.client.receiveMessage(30000);
        defer self.allocator.free(schema);

        try self.client.sendPull(1, 1000);
        const result = try self.client.receiveMessage(30000);
        defer self.allocator.free(result);

        // Parse JSON result and extract user
        // Implementation depends on JSON parsing library
        // Return null if no results
        return null; // Placeholder
    }

    pub fn getTasksByProject(self: *Repository, project_id: []const u8) ![]models.Task {
        var params = std.json.ObjectMap.init(self.allocator);
        defer params.deinit();
        try params.put("project_id", .{ .string = project_id });

        try self.client.sendRunGql(1,
            \\MATCH (p:Project {id: $project_id})-[:CONTAINS]->(t:Task)
            \\RETURN t.id, t.title, t.description, t.status, t.priority,
            \\       t.created_at, t.updated_at
            \\ORDER BY t.priority DESC, t.created_at DESC
        , .{ .object = params });

        const schema = try self.client.receiveMessage(30000);
        defer self.allocator.free(schema);

        try self.client.sendPull(1, 1000);
        const result = try self.client.receiveMessage(30000);
        defer self.allocator.free(result);

        // Parse JSON result and return tasks array
        var tasks = std.ArrayList(models.Task).init(self.allocator);
        // Parse result and populate tasks
        return tasks.toOwnedSlice();
    }
};
```
{{< /tab >}}
{{< /tabs >}}

### Update Operations

{{< tabs >}}
{{< tab "Go" >}}
```go
// internal/repository/update_repository.go
package repository

import (
    "context"
    "fmt"
    "time"

    "geode-tasks/internal/models"
)

func (r *Repository) UpdateTaskStatus(ctx context.Context, taskID string, status models.TaskStatus) error {
    _, err := r.db.ExecContext(ctx, `
        MATCH (t:Task {id: ?})
        SET t.status = ?, t.updated_at = ?
    `, taskID, string(status), time.Now().Unix())

    if err != nil {
        return fmt.Errorf("failed to update task status: %w", err)
    }
    return nil
}

func (r *Repository) AssignTask(ctx context.Context, taskID, userID string) error {
    // Remove existing assignment
    _, err := r.db.ExecContext(ctx, `
        MATCH (:User)-[a:ASSIGNED_TO]->(:Task {id: ?})
        DELETE a
    `, taskID)
    if err != nil {
        return fmt.Errorf("failed to remove existing assignment: %w", err)
    }

    // Create new assignment
    _, err = r.db.ExecContext(ctx, `
        MATCH (u:User {id: ?})
        MATCH (t:Task {id: ?})
        CREATE (u)-[:ASSIGNED_TO]->(t)
    `, userID, taskID)
    if err != nil {
        return fmt.Errorf("failed to assign task: %w", err)
    }

    // Update task
    _, err = r.db.ExecContext(ctx, `
        MATCH (t:Task {id: ?})
        SET t.updated_at = ?
    `, taskID, time.Now().Unix())

    return err
}

func (r *Repository) UpdateTask(ctx context.Context, task *models.Task) error {
    task.UpdatedAt = time.Now()

    _, err := r.db.ExecContext(ctx, `
        MATCH (t:Task {id: ?})
        SET t.title = ?,
            t.description = ?,
            t.status = ?,
            t.priority = ?,
            t.due_date = ?,
            t.updated_at = ?
    `, task.ID, task.Title, task.Description, string(task.Status),
       int(task.Priority), task.DueDate, task.UpdatedAt.Unix())

    if err != nil {
        return fmt.Errorf("failed to update task: %w", err)
    }
    return nil
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
# src/repository/repository.py (continued)
class Repository:
    # ... previous code ...

    async def update_task_status(self, task_id: str, status: TaskStatus) -> None:
        """Update task status."""
        async with self.connection() as conn:
            await conn.execute(
                """
                MATCH (t:Task {id: $task_id})
                SET t.status = $status, t.updated_at = $updated_at
                """,
                {
                    "task_id": task_id,
                    "status": status.value,
                    "updated_at": int(datetime.now().timestamp())
                }
            )

    async def assign_task(self, task_id: str, user_id: str) -> None:
        """Assign a task to a user."""
        async with self.connection() as conn:
            # Remove existing assignment
            await conn.execute(
                """
                MATCH (:User)-[a:ASSIGNED_TO]->(:Task {id: $task_id})
                DELETE a
                """,
                {"task_id": task_id}
            )

            # Create new assignment
            await conn.execute(
                """
                MATCH (u:User {id: $user_id})
                MATCH (t:Task {id: $task_id})
                CREATE (u)-[:ASSIGNED_TO]->(t)
                """,
                {"user_id": user_id, "task_id": task_id}
            )

            # Update task timestamp
            await conn.execute(
                """
                MATCH (t:Task {id: $task_id})
                SET t.updated_at = $updated_at
                """,
                {
                    "task_id": task_id,
                    "updated_at": int(datetime.now().timestamp())
                }
            )

    async def update_task(self, task: Task) -> None:
        """Update all task properties."""
        task.updated_at = datetime.now()

        async with self.connection() as conn:
            await conn.execute(
                """
                MATCH (t:Task {id: $id})
                SET t.title = $title,
                    t.description = $description,
                    t.status = $status,
                    t.priority = $priority,
                    t.due_date = $due_date,
                    t.updated_at = $updated_at
                """,
                {
                    "id": task.id,
                    "title": task.title,
                    "description": task.description,
                    "status": task.status.value,
                    "priority": task.priority.value,
                    "due_date": int(task.due_date.timestamp()) if task.due_date else None,
                    "updated_at": int(task.updated_at.timestamp())
                }
            )
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
// src/repository/mod.rs (continued)
impl Repository {
    pub async fn update_task_status(&self, task_id: &str, status: TaskStatus) -> Result<(), GeodeError> {
        let mut conn = self.connect().await?;

        let mut params = HashMap::new();
        params.insert("task_id".to_string(), Value::string(task_id));
        params.insert("status".to_string(), Value::string(status.as_str()));
        params.insert("updated_at".to_string(), Value::int(Utc::now().timestamp()));

        conn.query_with_params(r#"
            MATCH (t:Task {id: $task_id})
            SET t.status = $status, t.updated_at = $updated_at
        "#, &params).await?;

        Ok(())
    }

    pub async fn assign_task(&self, task_id: &str, user_id: &str) -> Result<(), GeodeError> {
        let mut conn = self.connect().await?;

        // Remove existing assignment
        let mut params = HashMap::new();
        params.insert("task_id".to_string(), Value::string(task_id));

        conn.query_with_params(r#"
            MATCH (:User)-[a:ASSIGNED_TO]->(:Task {id: $task_id})
            DELETE a
        "#, &params).await?;

        // Create new assignment
        params.insert("user_id".to_string(), Value::string(user_id));

        conn.query_with_params(r#"
            MATCH (u:User {id: $user_id})
            MATCH (t:Task {id: $task_id})
            CREATE (u)-[:ASSIGNED_TO]->(t)
        "#, &params).await?;

        // Update timestamp
        params.insert("updated_at".to_string(), Value::int(Utc::now().timestamp()));

        conn.query_with_params(r#"
            MATCH (t:Task {id: $task_id})
            SET t.updated_at = $updated_at
        "#, &params).await?;

        Ok(())
    }
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
// src/repository/index.ts (continued)
export class Repository {
    // ... previous code ...

    async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
        const client = this.getClient();

        await client.exec(
            `MATCH (t:Task {id: $task_id})
             SET t.status = $status, t.updated_at = $updated_at`,
            {
                params: {
                    task_id: taskId,
                    status,
                    updated_at: Math.floor(Date.now() / 1000),
                },
            }
        );
    }

    async assignTask(taskId: string, userId: string): Promise<void> {
        const client = this.getClient();

        // Remove existing assignment
        await client.exec(
            `MATCH (:User)-[a:ASSIGNED_TO]->(:Task {id: $task_id})
             DELETE a`,
            { params: { task_id: taskId } }
        );

        // Create new assignment
        await client.exec(
            `MATCH (u:User {id: $user_id})
             MATCH (t:Task {id: $task_id})
             CREATE (u)-[:ASSIGNED_TO]->(t)`,
            { params: { user_id: userId, task_id: taskId } }
        );

        // Update timestamp
        await client.exec(
            `MATCH (t:Task {id: $task_id})
             SET t.updated_at = $updated_at`,
            {
                params: {
                    task_id: taskId,
                    updated_at: Math.floor(Date.now() / 1000),
                },
            }
        );
    }
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
// src/repository.zig (continued)
pub const Repository = struct {
    // ... previous code ...

    pub fn updateTaskStatus(self: *Repository, task_id: []const u8, status: models.TaskStatus) !void {
        var params = std.json.ObjectMap.init(self.allocator);
        defer params.deinit();
        try params.put("task_id", .{ .string = task_id });
        try params.put("status", .{ .string = status.toString() });
        try params.put("updated_at", .{ .integer = std.time.timestamp() });

        try self.client.sendRunGql(1,
            \\MATCH (t:Task {id: $task_id})
            \\SET t.status = $status, t.updated_at = $updated_at
        , .{ .object = params });
        _ = try self.client.receiveMessage(30000);
    }

    pub fn assignTask(self: *Repository, task_id: []const u8, user_id: []const u8) !void {
        var params = std.json.ObjectMap.init(self.allocator);
        defer params.deinit();

        // Remove existing assignment
        try params.put("task_id", .{ .string = task_id });
        try self.client.sendRunGql(1,
            \\MATCH (:User)-[a:ASSIGNED_TO]->(:Task {id: $task_id})
            \\DELETE a
        , .{ .object = params });
        _ = try self.client.receiveMessage(30000);

        // Create new assignment
        try params.put("user_id", .{ .string = user_id });
        try self.client.sendRunGql(2,
            \\MATCH (u:User {id: $user_id})
            \\MATCH (t:Task {id: $task_id})
            \\CREATE (u)-[:ASSIGNED_TO]->(t)
        , .{ .object = params });
        _ = try self.client.receiveMessage(30000);

        // Update timestamp
        try params.put("updated_at", .{ .integer = std.time.timestamp() });
        try self.client.sendRunGql(3,
            \\MATCH (t:Task {id: $task_id})
            \\SET t.updated_at = $updated_at
        , .{ .object = params });
        _ = try self.client.receiveMessage(30000);
    }
};
```
{{< /tab >}}
{{< /tabs >}}

### Delete Operations

{{< tabs >}}
{{< tab "Go" >}}
```go
// internal/repository/delete_repository.go
package repository

import (
    "context"
    "fmt"
)

func (r *Repository) DeleteTask(ctx context.Context, taskID string) error {
    // Delete relationships first, then the node
    _, err := r.db.ExecContext(ctx, `
        MATCH (t:Task {id: ?})
        DETACH DELETE t
    `, taskID)

    if err != nil {
        return fmt.Errorf("failed to delete task: %w", err)
    }
    return nil
}

func (r *Repository) DeleteProject(ctx context.Context, projectID string) error {
    // Delete all tasks in the project first
    _, err := r.db.ExecContext(ctx, `
        MATCH (p:Project {id: ?})-[:CONTAINS]->(t:Task)
        DETACH DELETE t
    `, projectID)
    if err != nil {
        return fmt.Errorf("failed to delete project tasks: %w", err)
    }

    // Delete the project
    _, err = r.db.ExecContext(ctx, `
        MATCH (p:Project {id: ?})
        DETACH DELETE p
    `, projectID)
    if err != nil {
        return fmt.Errorf("failed to delete project: %w", err)
    }

    return nil
}

func (r *Repository) RemoveTaskDependency(ctx context.Context, taskID, dependsOnID string) error {
    _, err := r.db.ExecContext(ctx, `
        MATCH (t:Task {id: ?})-[d:DEPENDS_ON]->(dep:Task {id: ?})
        DELETE d
    `, taskID, dependsOnID)

    if err != nil {
        return fmt.Errorf("failed to remove dependency: %w", err)
    }
    return nil
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
# src/repository/repository.py (continued)
class Repository:
    # ... previous code ...

    async def delete_task(self, task_id: str) -> None:
        """Delete a task and its relationships."""
        async with self.connection() as conn:
            await conn.execute(
                """
                MATCH (t:Task {id: $task_id})
                DETACH DELETE t
                """,
                {"task_id": task_id}
            )

    async def delete_project(self, project_id: str) -> None:
        """Delete a project and all its tasks."""
        async with self.connection() as conn:
            # Delete all tasks in the project
            await conn.execute(
                """
                MATCH (p:Project {id: $project_id})-[:CONTAINS]->(t:Task)
                DETACH DELETE t
                """,
                {"project_id": project_id}
            )

            # Delete the project
            await conn.execute(
                """
                MATCH (p:Project {id: $project_id})
                DETACH DELETE p
                """,
                {"project_id": project_id}
            )

    async def remove_task_dependency(self, task_id: str, depends_on_id: str) -> None:
        """Remove a dependency relationship between tasks."""
        async with self.connection() as conn:
            await conn.execute(
                """
                MATCH (t:Task {id: $task_id})-[d:DEPENDS_ON]->(dep:Task {id: $depends_on_id})
                DELETE d
                """,
                {"task_id": task_id, "depends_on_id": depends_on_id}
            )
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
// src/repository/mod.rs (continued)
impl Repository {
    pub async fn delete_task(&self, task_id: &str) -> Result<(), GeodeError> {
        let mut conn = self.connect().await?;

        let mut params = HashMap::new();
        params.insert("task_id".to_string(), Value::string(task_id));

        conn.query_with_params(r#"
            MATCH (t:Task {id: $task_id})
            DETACH DELETE t
        "#, &params).await?;

        Ok(())
    }

    pub async fn delete_project(&self, project_id: &str) -> Result<(), GeodeError> {
        let mut conn = self.connect().await?;

        let mut params = HashMap::new();
        params.insert("project_id".to_string(), Value::string(project_id));

        // Delete all tasks in the project
        conn.query_with_params(r#"
            MATCH (p:Project {id: $project_id})-[:CONTAINS]->(t:Task)
            DETACH DELETE t
        "#, &params).await?;

        // Delete the project
        conn.query_with_params(r#"
            MATCH (p:Project {id: $project_id})
            DETACH DELETE p
        "#, &params).await?;

        Ok(())
    }
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
// src/repository/index.ts (continued)
export class Repository {
    // ... previous code ...

    async deleteTask(taskId: string): Promise<void> {
        const client = this.getClient();

        await client.exec(
            `MATCH (t:Task {id: $task_id})
             DETACH DELETE t`,
            { params: { task_id: taskId } }
        );
    }

    async deleteProject(projectId: string): Promise<void> {
        const client = this.getClient();

        // Delete all tasks in the project
        await client.exec(
            `MATCH (p:Project {id: $project_id})-[:CONTAINS]->(t:Task)
             DETACH DELETE t`,
            { params: { project_id: projectId } }
        );

        // Delete the project
        await client.exec(
            `MATCH (p:Project {id: $project_id})
             DETACH DELETE p`,
            { params: { project_id: projectId } }
        );
    }
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
// src/repository.zig (continued)
pub const Repository = struct {
    // ... previous code ...

    pub fn deleteTask(self: *Repository, task_id: []const u8) !void {
        var params = std.json.ObjectMap.init(self.allocator);
        defer params.deinit();
        try params.put("task_id", .{ .string = task_id });

        try self.client.sendRunGql(1,
            \\MATCH (t:Task {id: $task_id})
            \\DETACH DELETE t
        , .{ .object = params });
        _ = try self.client.receiveMessage(30000);
    }

    pub fn deleteProject(self: *Repository, project_id: []const u8) !void {
        var params = std.json.ObjectMap.init(self.allocator);
        defer params.deinit();
        try params.put("project_id", .{ .string = project_id });

        // Delete all tasks in the project
        try self.client.sendRunGql(1,
            \\MATCH (p:Project {id: $project_id})-[:CONTAINS]->(t:Task)
            \\DETACH DELETE t
        , .{ .object = params });
        _ = try self.client.receiveMessage(30000);

        // Delete the project
        try self.client.sendRunGql(2,
            \\MATCH (p:Project {id: $project_id})
            \\DETACH DELETE p
        , .{ .object = params });
        _ = try self.client.receiveMessage(30000);
    }
};
```
{{< /tab >}}
{{< /tabs >}}

---

## Error Handling

Proper error handling is crucial for production applications.

{{< tabs >}}
{{< tab "Go" >}}
```go
// internal/repository/errors.go
package repository

import (
    "errors"
    "fmt"
)

// Custom error types
var (
    ErrNotFound      = errors.New("resource not found")
    ErrDuplicate     = errors.New("resource already exists")
    ErrInvalidInput  = errors.New("invalid input")
    ErrConnection    = errors.New("database connection error")
    ErrTransaction   = errors.New("transaction error")
)

// GeodeError wraps database errors with context
type GeodeError struct {
    Op      string // Operation that failed
    Code    string // Error code from Geode
    Message string // Error message
    Err     error  // Underlying error
}

func (e *GeodeError) Error() string {
    if e.Err != nil {
        return fmt.Sprintf("%s: %s [%s]: %v", e.Op, e.Message, e.Code, e.Err)
    }
    return fmt.Sprintf("%s: %s [%s]", e.Op, e.Message, e.Code)
}

func (e *GeodeError) Unwrap() error {
    return e.Err
}

// Helper to check error types
func IsNotFound(err error) bool {
    var geodeErr *GeodeError
    if errors.As(err, &geodeErr) {
        return geodeErr.Code == "02000" // No data
    }
    return errors.Is(err, ErrNotFound)
}

func IsDuplicate(err error) bool {
    var geodeErr *GeodeError
    if errors.As(err, &geodeErr) {
        return geodeErr.Code == "23000" // Integrity constraint violation
    }
    return errors.Is(err, ErrDuplicate)
}

// Usage example
func (r *Repository) CreateUserWithErrorHandling(ctx context.Context, email, name string) (*models.User, error) {
    user, err := r.CreateUser(ctx, email, name)
    if err != nil {
        // Check for specific error types
        if strings.Contains(err.Error(), "constraint") {
            return nil, &GeodeError{
                Op:      "CreateUser",
                Code:    "23000",
                Message: "User with this email already exists",
                Err:     ErrDuplicate,
            }
        }
        return nil, &GeodeError{
            Op:      "CreateUser",
            Code:    "unknown",
            Message: "Failed to create user",
            Err:     err,
        }
    }
    return user, nil
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
# src/repository/errors.py
from typing import Optional

class GeodeError(Exception):
    """Base exception for Geode operations."""

    def __init__(
        self,
        message: str,
        code: str = "unknown",
        operation: str = "",
        cause: Optional[Exception] = None
    ):
        self.message = message
        self.code = code
        self.operation = operation
        self.cause = cause
        super().__init__(f"{operation}: {message} [{code}]")

class NotFoundError(GeodeError):
    """Resource not found."""

    def __init__(self, resource: str, identifier: str):
        super().__init__(
            message=f"{resource} with id '{identifier}' not found",
            code="02000",
            operation="query"
        )

class DuplicateError(GeodeError):
    """Resource already exists."""

    def __init__(self, resource: str, field: str, value: str):
        super().__init__(
            message=f"{resource} with {field} '{value}' already exists",
            code="23000",
            operation="create"
        )

class ConnectionError(GeodeError):
    """Database connection error."""

    def __init__(self, message: str, cause: Optional[Exception] = None):
        super().__init__(
            message=message,
            code="08000",
            operation="connect",
            cause=cause
        )

class TransactionError(GeodeError):
    """Transaction error."""

    def __init__(self, message: str, cause: Optional[Exception] = None):
        super().__init__(
            message=message,
            code="40000",
            operation="transaction",
            cause=cause
        )

# Usage example
class Repository:
    async def get_user_or_raise(self, user_id: str) -> User:
        """Get a user by ID or raise NotFoundError."""
        user = await self.get_user_by_id(user_id)
        if user is None:
            raise NotFoundError("User", user_id)
        return user

    async def create_user_safe(self, email: str, name: str) -> User:
        """Create a user with proper error handling."""
        try:
            # Check if user already exists
            async with self.connection() as conn:
                page, _ = await conn.query(
                    "MATCH (u:User {email: $email}) RETURN u",
                    {"email": email}
                )
                if page.rows:
                    raise DuplicateError("User", "email", email)

            return await self.create_user(email, name)
        except Exception as e:
            if isinstance(e, GeodeError):
                raise
            raise GeodeError(
                message=str(e),
                operation="create_user",
                cause=e
            )
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
// src/repository/errors.rs
use thiserror::Error;

#[derive(Error, Debug)]
pub enum RepositoryError {
    #[error("Resource not found: {resource} with id '{id}'")]
    NotFound { resource: String, id: String },

    #[error("Duplicate resource: {resource} with {field} '{value}' already exists")]
    Duplicate {
        resource: String,
        field: String,
        value: String,
    },

    #[error("Invalid input: {message}")]
    InvalidInput { message: String },

    #[error("Connection error: {message}")]
    Connection { message: String },

    #[error("Transaction error: {message}")]
    Transaction { message: String },

    #[error("Database error: {0}")]
    Database(#[from] GeodeError),
}

impl RepositoryError {
    pub fn not_found(resource: &str, id: &str) -> Self {
        RepositoryError::NotFound {
            resource: resource.to_string(),
            id: id.to_string(),
        }
    }

    pub fn duplicate(resource: &str, field: &str, value: &str) -> Self {
        RepositoryError::Duplicate {
            resource: resource.to_string(),
            field: field.to_string(),
            value: value.to_string(),
        }
    }
}

// Usage example
impl Repository {
    pub async fn get_user_or_error(&self, user_id: &str) -> Result<User, RepositoryError> {
        match self.get_user_by_id(user_id).await? {
            Some(user) => Ok(user),
            None => Err(RepositoryError::not_found("User", user_id)),
        }
    }

    pub async fn create_user_safe(
        &self,
        email: String,
        name: String,
    ) -> Result<User, RepositoryError> {
        // Check for existing user
        let mut conn = self.connect().await?;

        let mut params = HashMap::new();
        params.insert("email".to_string(), Value::string(&email));

        let (page, _) = conn.query_with_params(
            "MATCH (u:User {email: $email}) RETURN u",
            &params,
        ).await?;

        if !page.rows.is_empty() {
            return Err(RepositoryError::duplicate("User", "email", &email));
        }

        self.create_user(email, name).await
            .map_err(|e| RepositoryError::Database(e))
    }
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
// src/repository/errors.ts
export class GeodeError extends Error {
    constructor(
        message: string,
        public readonly code: string = 'unknown',
        public readonly operation: string = '',
        public readonly cause?: Error
    ) {
        super(`${operation}: ${message} [${code}]`);
        this.name = 'GeodeError';
    }
}

export class NotFoundError extends GeodeError {
    constructor(resource: string, id: string) {
        super(
            `${resource} with id '${id}' not found`,
            '02000',
            'query'
        );
        this.name = 'NotFoundError';
    }
}

export class DuplicateError extends GeodeError {
    constructor(resource: string, field: string, value: string) {
        super(
            `${resource} with ${field} '${value}' already exists`,
            '23000',
            'create'
        );
        this.name = 'DuplicateError';
    }
}

export class ConnectionError extends GeodeError {
    constructor(message: string, cause?: Error) {
        super(message, '08000', 'connect', cause);
        this.name = 'ConnectionError';
    }
}

// Usage example
export class Repository {
    async getUserOrThrow(userId: string): Promise<User> {
        const user = await this.getUserById(userId);
        if (!user) {
            throw new NotFoundError('User', userId);
        }
        return user;
    }

    async createUserSafe(email: string, name: string): Promise<User> {
        try {
            // Check for existing user
            const client = this.getClient();
            const existing = await client.queryAll(
                'MATCH (u:User {email: $email}) RETURN u',
                { params: { email } }
            );

            if (existing.length > 0) {
                throw new DuplicateError('User', 'email', email);
            }

            return await this.createUser(email, name);
        } catch (error) {
            if (error instanceof GeodeError) {
                throw error;
            }
            throw new GeodeError(
                error instanceof Error ? error.message : 'Unknown error',
                'unknown',
                'createUser',
                error instanceof Error ? error : undefined
            );
        }
    }
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
// src/errors.zig
const std = @import("std");

pub const RepositoryError = error{
    NotFound,
    Duplicate,
    InvalidInput,
    ConnectionFailed,
    TransactionFailed,
    QueryFailed,
    Timeout,
};

pub const ErrorInfo = struct {
    code: []const u8,
    message: []const u8,
    operation: []const u8,

    pub fn format(
        self: ErrorInfo,
        comptime fmt: []const u8,
        options: std.fmt.FormatOptions,
        writer: anytype,
    ) !void {
        _ = fmt;
        _ = options;
        try writer.print("{s}: {s} [{s}]", .{
            self.operation,
            self.message,
            self.code,
        });
    }
};

pub fn notFoundError(resource: []const u8, id: []const u8) ErrorInfo {
    var buf: [256]u8 = undefined;
    const message = std.fmt.bufPrint(&buf, "{s} with id '{s}' not found", .{ resource, id }) catch "not found";
    return ErrorInfo{
        .code = "02000",
        .message = message,
        .operation = "query",
    };
}

pub fn duplicateError(resource: []const u8, field: []const u8, value: []const u8) ErrorInfo {
    var buf: [256]u8 = undefined;
    const message = std.fmt.bufPrint(&buf, "{s} with {s} '{s}' already exists", .{ resource, field, value }) catch "duplicate";
    return ErrorInfo{
        .code = "23000",
        .message = message,
        .operation = "create",
    };
}

// Usage in repository
pub const Repository = struct {
    last_error: ?ErrorInfo = null,

    pub fn getUserOrError(self: *Repository, user_id: []const u8) !models.User {
        const user = try self.getUserById(user_id);
        if (user) |u| {
            return u;
        }
        self.last_error = notFoundError("User", user_id);
        return error.NotFound;
    }
};
```
{{< /tab >}}
{{< /tabs >}}

---

## Putting It All Together

Here's a complete example application.

{{< tabs >}}
{{< tab "Go" >}}
```go
// cmd/server/main.go
package main

import (
    "context"
    "fmt"
    "log"

    "geode-tasks/internal/models"
    "geode-tasks/internal/repository"
)

func main() {
    ctx := context.Background()

    // Connect to Geode
    repo, err := repository.NewRepository("localhost", 3141)
    if err != nil {
        log.Fatalf("Failed to connect: %v", err)
    }
    defer repo.Close()

    fmt.Println("Connected to Geode!")

    // Create a user
    user, err := repo.CreateUser(ctx, "alice@example.com", "Alice Johnson")
    if err != nil {
        log.Fatalf("Failed to create user: %v", err)
    }
    fmt.Printf("Created user: %s\n", user.Name)

    // Create a project
    project, err := repo.CreateProject(ctx, "Website Redesign", "Redesign the company website", user.ID)
    if err != nil {
        log.Fatalf("Failed to create project: %v", err)
    }
    fmt.Printf("Created project: %s\n", project.Name)

    // Create tasks
    task1, _ := repo.CreateTask(ctx, "Design mockups", "Create initial design mockups", project.ID, models.PriorityHigh)
    task2, _ := repo.CreateTask(ctx, "Review designs", "Review and approve mockups", project.ID, models.PriorityMedium)
    task3, _ := repo.CreateTask(ctx, "Implement frontend", "Build the React frontend", project.ID, models.PriorityHigh)

    fmt.Printf("Created %d tasks\n", 3)

    // Assign tasks
    _ = repo.AssignTask(ctx, task1.ID, user.ID)
    _ = repo.AssignTask(ctx, task2.ID, user.ID)

    // Update task status
    _ = repo.UpdateTaskStatus(ctx, task1.ID, models.StatusInProgress)

    // Query tasks
    tasks, err := repo.GetTasksByProject(ctx, project.ID)
    if err != nil {
        log.Fatalf("Failed to get tasks: %v", err)
    }

    fmt.Println("\nProject Tasks:")
    for _, task := range tasks {
        fmt.Printf("  - [%s] %s (Priority: %d)\n", task.Status, task.Title, task.Priority)
    }

    // Get user's assigned tasks
    userTasks, _ := repo.GetUserTasks(ctx, user.ID)
    fmt.Printf("\n%s's Tasks: %d assigned\n", user.Name, len(userTasks))

    // Cleanup (optional)
    // _ = repo.DeleteProject(ctx, project.ID)

    fmt.Println("\nApplication complete!")
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
# src/main.py
import asyncio
from repository.repository import Repository
from models.models import Priority, TaskStatus

async def main():
    # Connect to Geode
    repo = Repository("localhost", 3141)

    if not await repo.ping():
        print("Failed to connect to Geode")
        return

    print("Connected to Geode!")

    # Create a user
    user = await repo.create_user("alice@example.com", "Alice Johnson")
    print(f"Created user: {user.name}")

    # Create a project
    project = await repo.create_project(
        "Website Redesign",
        "Redesign the company website",
        user.id
    )
    print(f"Created project: {project.name}")

    # Create tasks
    task1 = await repo.create_task(
        "Design mockups",
        "Create initial design mockups",
        project.id,
        Priority.HIGH
    )
    task2 = await repo.create_task(
        "Review designs",
        "Review and approve mockups",
        project.id,
        Priority.MEDIUM
    )
    task3 = await repo.create_task(
        "Implement frontend",
        "Build the React frontend",
        project.id,
        Priority.HIGH
    )
    print(f"Created 3 tasks")

    # Assign tasks
    await repo.assign_task(task1.id, user.id)
    await repo.assign_task(task2.id, user.id)

    # Update task status
    await repo.update_task_status(task1.id, TaskStatus.IN_PROGRESS)

    # Query tasks
    tasks = await repo.get_tasks_by_project(project.id)
    print("\nProject Tasks:")
    for task in tasks:
        print(f"  - [{task.status.value}] {task.title} (Priority: {task.priority.value})")

    # Get user's assigned tasks
    user_tasks = await repo.get_user_tasks(user.id)
    print(f"\n{user.name}'s Tasks: {len(user_tasks)} assigned")

    print("\nApplication complete!")

if __name__ == "__main__":
    asyncio.run(main())
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
// src/main.rs
mod models;
mod repository;

use models::{Priority, TaskStatus};
use repository::Repository;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Connect to Geode
    let repo = Repository::new("127.0.0.1", 3141);

    if repo.ping().await? {
        println!("Connected to Geode!");
    }

    // Create a user
    let user = repo.create_user(
        "alice@example.com".to_string(),
        "Alice Johnson".to_string(),
    ).await?;
    println!("Created user: {}", user.name);

    // Create a project
    let project = repo.create_project(
        "Website Redesign".to_string(),
        "Redesign the company website".to_string(),
        user.id.clone(),
    ).await?;
    println!("Created project: {}", project.name);

    // Create tasks
    let task1 = repo.create_task(
        "Design mockups".to_string(),
        "Create initial design mockups".to_string(),
        project.id.clone(),
        Priority::High,
    ).await?;

    let task2 = repo.create_task(
        "Review designs".to_string(),
        "Review and approve mockups".to_string(),
        project.id.clone(),
        Priority::Medium,
    ).await?;

    let _task3 = repo.create_task(
        "Implement frontend".to_string(),
        "Build the React frontend".to_string(),
        project.id.clone(),
        Priority::High,
    ).await?;

    println!("Created 3 tasks");

    // Assign tasks
    repo.assign_task(&task1.id, &user.id).await?;
    repo.assign_task(&task2.id, &user.id).await?;

    // Update task status
    repo.update_task_status(&task1.id, TaskStatus::InProgress).await?;

    // Query tasks
    let tasks = repo.get_tasks_by_project(&project.id).await?;
    println!("\nProject Tasks:");
    for task in &tasks {
        println!("  - [{}] {} (Priority: {:?})",
            task.status.as_str(), task.title, task.priority);
    }

    println!("\nApplication complete!");
    Ok(())
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
// src/index.ts
import { Repository } from './repository';
import { Priority, TaskStatus } from './models';

async function main() {
    // Connect to Geode
    const repo = new Repository('localhost', 3141);
    await repo.connect();

    if (await repo.ping()) {
        console.log('Connected to Geode!');
    }

    try {
        // Create a user
        const user = await repo.createUser('alice@example.com', 'Alice Johnson');
        console.log(`Created user: ${user.name}`);

        // Create a project
        const project = await repo.createProject(
            'Website Redesign',
            'Redesign the company website',
            user.id
        );
        console.log(`Created project: ${project.name}`);

        // Create tasks
        const task1 = await repo.createTask(
            'Design mockups',
            'Create initial design mockups',
            project.id,
            Priority.High
        );
        const task2 = await repo.createTask(
            'Review designs',
            'Review and approve mockups',
            project.id,
            Priority.Medium
        );
        const task3 = await repo.createTask(
            'Implement frontend',
            'Build the React frontend',
            project.id,
            Priority.High
        );
        console.log('Created 3 tasks');

        // Assign tasks
        await repo.assignTask(task1.id, user.id);
        await repo.assignTask(task2.id, user.id);

        // Update task status
        await repo.updateTaskStatus(task1.id, TaskStatus.InProgress);

        // Query tasks
        const tasks = await repo.getTasksByProject(project.id);
        console.log('\nProject Tasks:');
        for (const task of tasks) {
            console.log(`  - [${task.status}] ${task.title} (Priority: ${task.priority})`);
        }

        // Get user's assigned tasks
        const userTasks = await repo.getUserTasks(user.id);
        console.log(`\n${user.name}'s Tasks: ${userTasks.length} assigned`);

        console.log('\nApplication complete!');
    } finally {
        await repo.close();
    }
}

main().catch(console.error);
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
// src/main.zig
const std = @import("std");
const Repository = @import("repository.zig").Repository;
const models = @import("models.zig");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    // Connect to Geode
    var repo = Repository.init(allocator, "localhost", 3141);
    defer repo.deinit();

    try repo.connect();

    if (try repo.ping()) {
        std.debug.print("Connected to Geode!\n", .{});
    }

    // Create a user
    const user = try repo.createUser("alice@example.com", "Alice Johnson");
    std.debug.print("Created user: {s}\n", .{user.name});

    // Create a project
    const project = try repo.createProject(
        "Website Redesign",
        "Redesign the company website",
        user.id,
    );
    std.debug.print("Created project: {s}\n", .{project.name});

    // Create tasks
    const task1 = try repo.createTask(
        "Design mockups",
        "Create initial design mockups",
        project.id,
        .high,
    );
    const task2 = try repo.createTask(
        "Review designs",
        "Review and approve mockups",
        project.id,
        .medium,
    );
    _ = try repo.createTask(
        "Implement frontend",
        "Build the React frontend",
        project.id,
        .high,
    );
    std.debug.print("Created 3 tasks\n", .{});

    // Assign tasks
    try repo.assignTask(task1.id, user.id);
    try repo.assignTask(task2.id, user.id);

    // Update task status
    try repo.updateTaskStatus(task1.id, .in_progress);

    // Query tasks
    const tasks = try repo.getTasksByProject(project.id);
    defer allocator.free(tasks);

    std.debug.print("\nProject Tasks:\n", .{});
    for (tasks) |task| {
        std.debug.print("  - [{s}] {s} (Priority: {d})\n", .{
            task.status.toString(),
            task.title,
            @intFromEnum(task.priority),
        });
    }

    std.debug.print("\nApplication complete!\n", .{});
}
```
{{< /tab >}}
{{< /tabs >}}

---

## Best Practices

### Security

1. **Always use parameterized queries** - Never concatenate user input into queries
2. **Validate input** - Check data types and ranges before querying
3. **Use TLS in production** - Enable proper certificate verification
4. **Implement proper authentication** - Don't store credentials in code

### Performance

1. **Create indexes** for frequently queried properties
2. **Use connection pooling** - Reuse connections instead of creating new ones
3. **Batch operations** when creating multiple nodes
4. **Limit result sets** - Always use LIMIT for large queries

### Maintainability

1. **Use a repository pattern** - Separate data access from business logic
2. **Define clear models** - Type your data structures
3. **Handle errors gracefully** - Use custom error types
4. **Write tests** - Test your repository methods

---

## Next Steps

Now that you've built your first application:

1. **Learn GQL**: Explore the [GQL Reference](/docs/gql-reference/) for advanced queries
2. **Optimize Performance**: Read [Query Optimization](/guides/query-performance/)
3. **Design Better Schemas**: Review the [Graph Modeling Guide](/guides/graph-modeling/)
4. **Deploy to Production**: See [Production Deployment](/guides/production-deployment/)
5. **Explore Examples**: Check out [Use Cases](/docs/use-cases/)

---

## Resources

- [Full Documentation](/docs/)
- [Client Library APIs](/clients/)
- [GQL Reference](/docs/gql-reference/)
- [Community Forum](https://forum.geodedb.com)

## Get Help

- [Documentation](https://docs.geodedb.com)
- [GitLab Issues](https://gitlab.com/devnw/codepros/geode/geode/-/issues)
- [Community Chat](https://chat.geodedb.com)
- [Email Support](mailto:support@geodedb.com)
