# PROMT — Plan • Run • Optimise Management Tool

### Project Management Support Platform for Daily Project Operations

## Overview

This repository contains a **web-based Project Management Support Platform** designed to support the **daily operational workflow of a Project Manager**. The system provides a centralized and structured environment for managing projects, tasks, teams, and project funding in a consistent and traceable manner.

The application was developed as part of an **engineering diploma thesis** and emphasizes **clear domain separation, deterministic business logic, and scalable system architecture**. The design reflects real-world project execution processes rather than abstract task tracking.

 > 📄 Polish version: see [README.pl.md](./README.pl.md)

---

## System Scope

The platform covers the full lifecycle of project execution:

- project initialization and planning
- task definition and assignment
- funding-driven task generation
- progress monitoring and reporting
- project completion and archiving

All core activities are performed within a single, integrated system.

---

## Domain Model

The system is built around three primary domain entities:

- **Project**\
  Represents the main working context. Projects aggregate tasks, funding sources, timelines, and team members.

- **Task**\
  Atomic execution units assigned to users. Tasks may be manually created or automatically generated based on funding requirements.

- **Funding**\
  Represents formal sources of requirements and constraints. Funding entities influence project structure and can define predefined task templates.

These entities form a coherent and extensible domain model.

---

## Key Features

- Project lifecycle management
- Task and subtask management
- Automatic task generation based on funding definitions
- Multiple data presentation modes:
  - list views
  - Kanban boards
  - timeline / schedule views
- Team and responsibility management
- Filtering, sorting, and pagination of datasets
- Progress and risk monitoring
- Authentication and access control

---

## Architecture

The application follows a **layered architecture**, ensuring separation of concerns and maintainability:

- **Frontend**\
  Single Page Application (SPA) responsible for data presentation and user interaction.

- **Backend**\
  REST-based API implementing business logic, validation, and domain rules.

- **Database**\
  Relational data store ensuring data integrity and transactional consistency.

The system is designed for scalability and further extension.

---

## Technology Stack

### Frontend

- **JavaScript / TypeScript** — strongly typed client-side logic
- **React** — component-based UI architecture
- **SPA architecture** — state-driven rendering and client-side routing
- **HTTP client layer** — typed communication with backend API

### Backend

- **Python** — primary backend language
- **Django** — core backend framework
- **Django REST Framework (DRF)** — RESTful API layer
- **Modular application structure** — separation of domains and services
- **Authentication & authorization layer** — access control and role-based permissions

### Database

- **PostgreSQL** — relational database engine
- **Explicit relational schema** — enforced data integrity and constraints
- **Transactional consistency** — ACID-compliant operations

### Tooling & Quality

- **Git** — version control system
- **Automated testing** — unit, integration, and end-to-end tests
- **Environment-based configuration** — development and production separation

> Detailed technology choices and architectural justification are described in the accompanying technical documentation.

---

## Documentation

This project is based on an **engineering diploma thesis**, which includes:

- analysis of existing project management tools (e.g. Asana, Jira, ClickUp)
- system architecture and domain modeling
- database design
- user interface description
- testing methodology and results

---

## Installation and Setup (Docker)

### Requirements

Before running the application, make sure you have installed:

- Docker Desktop (Windows / macOS) or Docker Engine (Linux)
- WSL2 (for Windows)
- Git (optional, for cloning the repository)

---

### 1. Clone the repository

```bash
git clone <repo_url>
cd PROMT---PlanRunOptimiseManagementTool
```

---

### 2. Environment configuration

Create a `.env` file in the root directory of the project:

```env
# Security
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost

# Database (PostgreSQL)
DB_NAME=promt_db
DB_USER=promt_user
DB_PASSWORD=promt_password
DB_HOST=db
DB_PORT=5432

# Admin account
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@example.com
DJANGO_SUPERUSER_PASSWORD=admin123
```

---

### 3. Run the application

Start all services (backend, frontend, database):

```bash
docker compose up --build
```

The application will automatically:

- apply database migrations
- create the default admin user

---

### 4. Access the application

| Service          | URL                          |
|------------------|------------------------------|
| Backend (Django) | http://localhost:8000        |
| Admin panel      | http://localhost:8000/admin  |
| Frontend (React) | http://localhost:5173        |

---

### Database access (PostgreSQL)

The application uses a PostgreSQL database running inside a Docker container.

Connection details (based on `.env`):

- Host (from host machine): `localhost`
- Port: `5433`
- Database: `DB_NAME`
- User: `DB_USER`
- Password: `DB_PASSWORD`

You can connect using tools such as:

- DBeaver
- TablePlus
- pgAdmin

Official PostgreSQL website:
https://www.postgresql.org/download/

---

### 5. Seed test data

To populate the database with demo data:

```bash
docker compose exec backend python manage.py seed
```

Reset and regenerate demo data:

```bash
docker compose exec backend python manage.py seed --reset
```

---

### 6. Useful commands

#### Migrations
```bash
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate
```

#### Create superuser
```bash
docker compose exec backend python manage.py createsuperuser
```

#### Django shell
```bash
docker compose exec backend python manage.py shell
```

#### Logs
```bash
docker compose logs
docker compose logs backend
docker compose logs db
```

---

### 7. Stop the application

```bash
docker compose down
```

---

### 8. Reset environment (remove database)

```bash
docker compose down -v
docker compose up --build
```

---

### 9. Troubleshooting

#### Docker is not running (Windows)

Check:

```bash
docker version
wsl -l -v
```

Expected state:
- docker-desktop → Running
- Ubuntu → Running

---

#### Backend cannot connect to database

Verify `.env` configuration:

```env
DB_HOST=db
DB_PORT=5432
```

---

### Notes

- Database data is stored in a Docker volume (`postgres_data`) and persists across container restarts
- All backend operations should be executed via `docker compose exec backend`
- The project uses a containerized architecture — no need to install dependencies locally

## Author - Dev

**Marek Turkowicz 2026**
---

## QA Team
Marek Turkowicz

Jakub Jakacki

Jakub Kazimiruk

Emilia Nodzewska

Konrad Orzechowski

---
