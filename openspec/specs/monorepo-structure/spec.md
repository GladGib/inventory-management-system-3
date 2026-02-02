# Monorepo Structure Specification

## Purpose
Define the pnpm workspaces monorepo structure containing the NestJS API, Next.js web frontend, and shared packages with consistent tooling configuration.
## Requirements
### Requirement: Pnpm workspaces configuration
The system SHALL use pnpm workspaces to manage a monorepo containing multiple applications and shared packages.

#### Scenario: Workspace packages discovery
- **WHEN** running `pnpm install` at the repository root
- **THEN** pnpm SHALL discover and install dependencies for all packages in `apps/*` and `packages/*`

#### Scenario: Filtered script execution
- **WHEN** running `pnpm --filter @ims/api run dev`
- **THEN** the command SHALL execute only in the `apps/api` package

### Requirement: Backend application package
The system SHALL provide a NestJS backend application at `apps/api` with package name `@ims/api`.

#### Scenario: API development server
- **WHEN** running `pnpm dev:api`
- **THEN** the NestJS development server SHALL start on port 3000

#### Scenario: API build
- **WHEN** running `pnpm build:api`
- **THEN** the system SHALL compile TypeScript and output to `apps/api/dist`

### Requirement: Frontend application package
The system SHALL provide a Next.js frontend application at `apps/web` with package name `@ims/web`.

#### Scenario: Web development server
- **WHEN** running `pnpm dev:web`
- **THEN** the Next.js development server SHALL start on port 3001

#### Scenario: Web build
- **WHEN** running `pnpm build:web`
- **THEN** the system SHALL compile and output to `apps/web/.next`

### Requirement: Root workspace scripts
The root package.json SHALL provide convenience scripts for common operations across all packages.

#### Scenario: Parallel development
- **WHEN** running `pnpm dev`
- **THEN** both API and web development servers SHALL start concurrently

#### Scenario: Full build
- **WHEN** running `pnpm build`
- **THEN** all packages SHALL be built in dependency order

### Requirement: Docker Compose development environment
The system SHALL provide a Docker Compose configuration for local development services.

#### Scenario: Start development services
- **WHEN** running `docker-compose up -d`
- **THEN** PostgreSQL, Redis, MinIO, and Mailpit services SHALL start and be accessible

#### Scenario: PostgreSQL availability
- **WHEN** Docker services are running
- **THEN** PostgreSQL SHALL be accessible on port 5432 with database `ims_dev`

#### Scenario: Redis availability
- **WHEN** Docker services are running
- **THEN** Redis SHALL be accessible on port 6379

### Requirement: Environment configuration
The system SHALL use environment variables for configuration with `.env` files.

#### Scenario: Environment template
- **WHEN** a developer clones the repository
- **THEN** `.env.example` SHALL document all required environment variables

#### Scenario: Local environment
- **WHEN** `.env` file exists
- **THEN** the application SHALL load configuration from this file

