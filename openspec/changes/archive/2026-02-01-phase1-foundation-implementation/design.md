## Context

This is a greenfield project building an Inventory Management System for Malaysian SMEs. The target users are auto parts, hardware, and spare parts wholesalers who need:
- Multi-location inventory tracking
- Sales and purchase order management
- Malaysian tax compliance (SST, e-Invoice/MyInvois)
- Bilingual support (English & Bahasa Malaysia)

**Current State**: No existing codebase. Starting from scratch with modern tech stack.

**Constraints**:
- Must support multi-tenancy for SaaS deployment
- Malaysian compliance requirements (SST tax, MyInvois e-invoicing)
- Target users have varying technical sophistication
- Must work on desktop and mobile devices

## Goals / Non-Goals

**Goals:**
- Establish scalable monorepo structure for API and web applications
- Implement secure JWT-based authentication with refresh token rotation
- Create comprehensive database schema covering all inventory management domains
- Build responsive dashboard UI with enterprise-grade component library
- Set up local development environment with all required services

**Non-Goals:**
- Mobile app implementation (Phase 7)
- E-Invoice/MyInvois integration (Phase 4)
- Advanced reporting and analytics (Phase 5)
- Customer/vendor portals (Phase 6)
- Production deployment configuration

## Decisions

### 1. Monorepo with pnpm Workspaces

**Decision**: Use pnpm workspaces for monorepo management

**Alternatives Considered**:
- Turborepo: More features but adds complexity
- Nx: Powerful but steep learning curve
- Lerna: Outdated, pnpm workspaces supersedes it

**Rationale**: pnpm workspaces provides simple, fast dependency management with native workspace support. No additional tooling required. Can add Turborepo later if build caching becomes necessary.

### 2. NestJS for Backend API

**Decision**: NestJS with TypeScript for the backend

**Alternatives Considered**:
- Express.js: Too minimal, lacks structure
- Fastify: Fast but smaller ecosystem
- Hono: Lightweight but immature for enterprise

**Rationale**: NestJS provides opinionated modular architecture, built-in dependency injection, excellent TypeScript support, and first-class Swagger integration. Well-suited for enterprise applications.

### 3. Schema-based Multi-tenancy

**Decision**: Single database with organization-scoped queries (not separate schemas per tenant)

**Alternatives Considered**:
- Database per tenant: Maximum isolation but operational overhead
- Schema per tenant: Good isolation but migration complexity
- Row-level security: PostgreSQL RLS adds complexity

**Rationale**: For MVP, organization-scoped queries (WHERE organizationId = ?) provide sufficient isolation with simpler operations. All models include `organizationId` foreign key. Can migrate to schema-per-tenant later if needed.

### 4. JWT with Refresh Token Rotation

**Decision**: Short-lived access tokens (15min) with refresh token rotation stored in database

**Alternatives Considered**:
- Session-based auth: Doesn't scale well for API-first architecture
- JWT without refresh: Poor security (long-lived tokens)
- Redis for refresh tokens: Adds infrastructure complexity

**Rationale**: Refresh tokens in PostgreSQL allow revocation on logout and provide audit trail. Access tokens are short-lived to minimize exposure. Refresh token rotation prevents token reuse attacks.

### 5. Prisma ORM

**Decision**: Prisma for database access

**Alternatives Considered**:
- TypeORM: More flexible but less type-safe
- Drizzle: Newer, lighter but less mature
- Raw SQL: Maximum control but no type safety

**Rationale**: Prisma provides excellent TypeScript integration, auto-generated types, intuitive query API, and robust migration system. Schema-first approach aligns well with domain modeling.

### 6. Next.js 14 with App Router

**Decision**: Next.js 14 App Router for frontend

**Alternatives Considered**:
- Pages Router: Stable but legacy pattern
- Vite + React: No SSR by default
- Remix: Good but smaller ecosystem

**Rationale**: App Router is the future of Next.js with React Server Components support. Provides excellent developer experience, built-in routing, and SEO benefits.

### 7. Ant Design 5 for UI Components

**Decision**: Ant Design 5 with @ant-design/nextjs-registry

**Alternatives Considered**:
- shadcn/ui: Modern but requires more custom work
- MUI: Heavy bundle, complex theming
- Chakra UI: Good but less enterprise-focused

**Rationale**: Ant Design provides comprehensive enterprise-grade components (tables, forms, layouts) out of the box. Good documentation, active maintenance, and CSS-in-JS theming. The nextjs-registry package handles SSR properly.

### 8. TanStack Query + Zustand

**Decision**: TanStack Query for server state, Zustand for client state

**Alternatives Considered**:
- Redux Toolkit: Overkill for this use case
- SWR: Less features than TanStack Query
- Jotai: Good but Zustand is simpler for our needs

**Rationale**: TanStack Query handles caching, refetching, and server state excellently. Zustand provides lightweight client state (auth) without boilerplate. Clear separation of concerns.

## Risks / Trade-offs

### [Risk] Single-database multi-tenancy data leakage
**Mitigation**: All queries must include organizationId filter. Implement middleware to inject organization context. Add database-level constraints. Code review checklist item.

### [Risk] JWT token theft
**Mitigation**: Short access token lifetime (15min), refresh token rotation, HTTPS only, httpOnly cookies for refresh token in production.

### [Risk] Prisma cold start latency
**Mitigation**: Connection pooling via PgBouncer in production. Acceptable for MVP phase.

### [Risk] Ant Design bundle size
**Mitigation**: Use optimizePackageImports in Next.js config. Tree-shaking enabled. Monitor bundle size.

### [Trade-off] TypeScript strictness vs development speed
**Decision**: Enable strict mode. Slower initial development but prevents runtime errors and improves maintainability.

### [Trade-off] Comprehensive schema vs incremental migration
**Decision**: Define full schema upfront based on Zoho Inventory reference. Reduces migration churn but requires more upfront design.

## Architecture Diagrams

### System Overview
```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                            │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │   Next.js Web   │  │  Flutter Mobile │ (Phase 7)         │
│  │   (Port 3001)   │  │                 │                   │
│  └────────┬────────┘  └────────┬────────┘                   │
└───────────┼─────────────────────┼───────────────────────────┘
            │                     │
            ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                       API Layer                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              NestJS API (Port 3000)                  │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │   │
│  │  │  Auth   │ │  Users  │ │  Orgs   │ │ Items   │   │   │
│  │  │ Module  │ │ Module  │ │ Module  │ │ Module  │   │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ PostgreSQL  │  │    Redis    │  │    MinIO    │         │
│  │  (Port 5432)│  │ (Port 6379) │  │ (Port 9000) │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Authentication Flow
```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────▶│  Login   │────▶│  Verify  │────▶│  Issue   │
│          │     │ Request  │     │ Password │     │  Tokens  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                         │
     ┌───────────────────────────────────────────────────┘
     ▼
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Access  │     │ Refresh  │     │  Store   │
│  Token   │     │  Token   │     │ in DB    │
│ (15 min) │     │ (7 days) │     │          │
└──────────┘     └──────────┘     └──────────┘
```

## File Structure

```
inventory-management-system/
├── apps/
│   ├── api/                          # NestJS Backend
│   │   ├── src/
│   │   │   ├── main.ts               # Entry point
│   │   │   ├── app.module.ts         # Root module
│   │   │   ├── common/               # Shared utilities
│   │   │   │   ├── decorators/       # Custom decorators
│   │   │   │   ├── filters/          # Exception filters
│   │   │   │   ├── guards/           # Auth guards
│   │   │   │   └── interceptors/     # Response interceptors
│   │   │   ├── modules/
│   │   │   │   ├── auth/             # Authentication
│   │   │   │   ├── users/            # User management
│   │   │   │   └── organizations/    # Org management
│   │   │   └── prisma/               # Database service
│   │   └── prisma/
│   │       └── schema.prisma         # Database schema
│   │
│   └── web/                          # Next.js Frontend
│       └── src/
│           ├── app/                  # App Router pages
│           │   ├── (auth)/           # Auth pages
│           │   └── (dashboard)/      # Protected pages
│           ├── components/           # React components
│           │   └── layout/           # Layout components
│           ├── lib/                  # Utilities
│           ├── providers/            # React providers
│           ├── stores/               # Zustand stores
│           └── theme/                # Ant Design theme
│
├── docker/
│   └── docker-compose.yml            # Local services
├── package.json                      # Root workspace config
└── pnpm-workspace.yaml               # Workspace definition
```

## Open Questions

1. **Session Management**: Should we implement "remember me" functionality with longer refresh token expiry?
2. **Rate Limiting**: What rate limits should apply to auth endpoints vs regular API endpoints?
3. **Audit Logging**: Should we add audit logging for auth events in Phase 1 or defer to later phase?
4. **Password Policy**: What password complexity requirements should we enforce?
