## 1. Monorepo Setup

- [x] 1.1 Initialize pnpm workspace with `pnpm-workspace.yaml` defining `apps/*` and `packages/*`
- [x] 1.2 Create root `package.json` with workspace scripts (dev, build, lint, test, db:*)
- [x] 1.3 Configure `.env.example` with all required environment variables
- [x] 1.4 Set up Docker Compose with PostgreSQL, Redis, MinIO, and Mailpit services

## 2. Backend Foundation

- [x] 2.1 Initialize NestJS project at `apps/api` with TypeScript configuration
- [x] 2.2 Configure `main.ts` with CORS, API versioning (`/api/v1`), ValidationPipe, and Swagger
- [x] 2.3 Create `app.module.ts` with global module imports
- [x] 2.4 Set up Prisma module with `PrismaService` for database access
- [x] 2.5 Configure path aliases (`@/` prefix) in `tsconfig.json`

## 3. Database Schema

- [x] 3.1 Create Prisma schema with Organization model (Malaysian business fields)
- [x] 3.2 Add User model with role enum (ADMIN, MANAGER, STAFF, VIEWER)
- [x] 3.3 Add RefreshToken model for authentication
- [x] 3.4 Add Item model with auto parts industry fields (partNumber, crossReferences, vehicleModels)
- [x] 3.5 Add ItemGroup and Category models for item organization
- [x] 3.6 Add Warehouse and StockLevel models for inventory tracking
- [x] 3.7 Add Batch and SerialNumber models for advanced tracking
- [x] 3.8 Add Contact model with CUSTOMER/VENDOR/BOTH types
- [x] 3.9 Add SalesOrder, SalesOrderItem, Invoice, InvoiceItem models
- [x] 3.10 Add PurchaseOrder, PurchaseOrderItem, Bill, BillItem models
- [x] 3.11 Add TaxRate model with Malaysian tax types (SST, SERVICE_TAX, EXEMPT, ZERO_RATED)
- [x] 3.12 Add PaymentTerm and PriceList models
- [x] 3.13 Add Payment model with Malaysian payment methods (FPX, DUITNOW, GRABPAY, TNG_EWALLET)
- [x] 3.14 Add StockAdjustment and InventoryTransfer models
- [x] 3.15 Run initial migration to create database tables

## 4. Authentication Module

- [x] 4.1 Create auth module structure (`auth.module.ts`, `auth.service.ts`, `auth.controller.ts`)
- [x] 4.2 Implement JWT strategy with payload validation (userId, email, organizationId, role)
- [x] 4.3 Create `JwtAuthGuard` for protecting routes
- [x] 4.4 Implement registration endpoint with organization, warehouse, and default data creation
- [x] 4.5 Implement login endpoint with password verification and token issuance
- [x] 4.6 Implement refresh token endpoint with token rotation
- [x] 4.7 Implement logout endpoint with token revocation
- [x] 4.8 Create `GET /auth/me` endpoint for current user details
- [x] 4.9 Create DTOs with class-validator decorators (RegisterDto, LoginDto, RefreshTokenDto)

## 5. Authorization Module

- [x] 5.1 Create `RolesGuard` for role-based access control
- [x] 5.2 Create `@Roles()` decorator for specifying required roles
- [x] 5.3 Create `@CurrentUser()` decorator for accessing authenticated user in handlers
- [x] 5.4 Configure guards to work together (JwtAuthGuard + RolesGuard)

## 6. Users Module

- [x] 6.1 Create users module structure
- [x] 6.2 Implement `UsersService` with findById, findByEmail methods
- [x] 6.3 Create `UsersController` with current user endpoints

## 7. Organizations Module

- [x] 7.1 Create organizations module structure
- [x] 7.2 Implement `OrganizationsService` with findById, findBySlug, update methods
- [x] 7.3 Implement getSettings and updateSettings for flexible JSON settings
- [x] 7.4 Implement getDashboardStats with aggregated counts
- [x] 7.5 Create `OrganizationsController` with current organization endpoints
- [x] 7.6 Create `UpdateOrganizationDto` with Malaysian compliance fields

## 8. Frontend Foundation

- [x] 8.1 Initialize Next.js 14 project at `apps/web` with App Router
- [x] 8.2 Configure `next.config.ts` with Ant Design transpilation and optimizations
- [x] 8.3 Configure TypeScript with path aliases (`@/` prefix)
- [x] 8.4 Set up `.env.local` with API URL configuration

## 9. Frontend Providers & State

- [x] 9.1 Create `QueryProvider` with TanStack Query configuration
- [x] 9.2 Create `AntdProvider` with ConfigProvider and theme
- [x] 9.3 Create `AuthProvider` with route protection logic
- [x] 9.4 Create auth store with Zustand (user state, persistence)
- [x] 9.5 Set up root layout with AntdRegistry and all providers

## 10. Ant Design Theming

- [x] 10.1 Create theme configuration at `src/theme/config.ts`
- [x] 10.2 Configure primary color (#1890ff) and component tokens
- [x] 10.3 Set up global styles in `globals.css`
- [x] 10.4 Configure Layout, Menu, Table, Card, Button component overrides

## 11. API Client

- [x] 11.1 Create Axios instance with base URL configuration
- [x] 11.2 Add request interceptor for Authorization header
- [x] 11.3 Add response interceptor for token refresh on 401
- [x] 11.4 Create auth service with login, register, logout, getCurrentUser methods

## 12. Layout Components

- [x] 12.1 Create Sidebar component with collapsible navigation
- [x] 12.2 Implement menu items with icons and nested submenus
- [x] 12.3 Add active route highlighting and open key management
- [x] 12.4 Create Header component with user dropdown and notifications
- [x] 12.5 Implement logout functionality in header
- [x] 12.6 Create dashboard layout combining sidebar, header, and content area

## 13. Authentication Pages

- [x] 13.1 Create login page with email/password form
- [x] 13.2 Implement login mutation with error handling
- [x] 13.3 Create registration page with all required fields
- [x] 13.4 Implement password confirmation validation
- [x] 13.5 Add industry selection dropdown
- [x] 13.6 Style auth pages with gradient background and card container

## 14. Dashboard Pages

- [x] 14.1 Create dashboard page with statistics cards
- [x] 14.2 Implement dashboard stats API integration
- [x] 14.3 Add recent activity and pending tasks lists
- [x] 14.4 Create items list page with table and mock data
- [x] 14.5 Create inventory stock summary page
- [x] 14.6 Create customers list page
- [x] 14.7 Create reports index page with category cards
- [x] 14.8 Create settings page with organization form
