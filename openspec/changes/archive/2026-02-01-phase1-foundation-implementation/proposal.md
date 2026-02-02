## Why

Build the foundational infrastructure for an Inventory Management System (IMS) targeting Malaysian SMEs in the auto parts, hardware, and spare parts wholesale market. This phase establishes the core architecture, authentication system, database schema, and frontend scaffolding that all subsequent features will build upon.

## What Changes

- **Monorepo Setup**: Initialize pnpm workspaces with `apps/api` (NestJS backend) and `apps/web` (Next.js frontend)
- **Backend Foundation**: NestJS modular architecture with JWT authentication, role-based access control, and Swagger API documentation
- **Database Schema**: Prisma ORM with 25+ models covering organizations, users, items, inventory, sales, purchases, contacts, and Malaysian tax compliance
- **Frontend Foundation**: Next.js 14 App Router with Ant Design 5, TanStack Query for state management, and Zustand for auth state
- **Development Environment**: Docker Compose setup with PostgreSQL, Redis, MinIO, and Mailpit for local development
- **Multi-tenant Architecture**: Schema-based tenant isolation with organization-scoped data access

## Capabilities

### New Capabilities

- `monorepo-structure`: Pnpm workspaces configuration with shared tooling and scripts for API and web applications
- `authentication`: JWT-based authentication with access/refresh tokens, registration, login, logout, and session management
- `authorization`: Role-based access control (RBAC) with ADMIN, MANAGER, STAFF, VIEWER roles and route guards
- `organization-management`: Multi-tenant organization setup with Malaysian business fields (SST, TIN, SSM registration)
- `database-schema`: Core Prisma schema with entities for inventory, sales, purchases, contacts, and compliance
- `frontend-layout`: Dashboard layout with collapsible sidebar navigation, header with user menu, and responsive design
- `frontend-auth`: Login/register pages with form validation and protected route handling

### Modified Capabilities

<!-- No existing capabilities to modify - this is the initial implementation -->

## Impact

- **Code Structure**: Establishes `apps/api/` and `apps/web/` directory structure that all future modules will follow
- **API Contract**: Defines base URL pattern `/api/v1/*` and response format `{ success, data, meta?, error? }`
- **Database**: Creates PostgreSQL schema with 25+ tables and establishes Prisma as the ORM
- **Authentication**: All protected routes require JWT Bearer token; refresh token rotation implemented
- **Dependencies**: Locks in core dependencies (NestJS 10, Next.js 14, Ant Design 5, Prisma 5, TanStack Query 5)
- **Development Workflow**: Docker Compose required for local development (PostgreSQL on 5432, Redis on 6379)
