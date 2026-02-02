# authorization Specification

## Purpose
TBD - created by archiving change phase1-foundation-implementation. Update Purpose after archive.
## Requirements
### Requirement: Role-based access control
The system SHALL enforce role-based access control with four roles: ADMIN, MANAGER, STAFF, VIEWER.

#### Scenario: Role hierarchy
- **WHEN** evaluating permissions
- **THEN** ADMIN SHALL have all permissions
- **AND** MANAGER SHALL have permissions for day-to-day operations
- **AND** STAFF SHALL have permissions for transaction entry
- **AND** VIEWER SHALL have read-only access

### Requirement: JWT authentication guard
The system SHALL provide a JwtAuthGuard that validates JWT tokens on protected routes.

#### Scenario: Valid token access
- **WHEN** a request includes a valid JWT in the Authorization header as "Bearer <token>"
- **THEN** the guard SHALL allow the request to proceed
- **AND** populate the request with user context

#### Scenario: Missing token
- **WHEN** a request to a protected route lacks an Authorization header
- **THEN** the guard SHALL return 401 Unauthorized

#### Scenario: Invalid token
- **WHEN** a request includes an invalid or malformed JWT
- **THEN** the guard SHALL return 401 Unauthorized

### Requirement: Roles guard
The system SHALL provide a RolesGuard that restricts route access based on user roles.

#### Scenario: Authorized role access
- **WHEN** a user with an authorized role accesses a protected route
- **THEN** the guard SHALL allow the request to proceed

#### Scenario: Unauthorized role access
- **WHEN** a user attempts to access a route requiring a role they don't have
- **THEN** the guard SHALL return 403 Forbidden

### Requirement: Roles decorator
The system SHALL provide a @Roles() decorator to specify required roles for routes.

#### Scenario: Single role requirement
- **WHEN** a route is decorated with @Roles('ADMIN')
- **THEN** only users with ADMIN role SHALL access the route

#### Scenario: Multiple role requirement
- **WHEN** a route is decorated with @Roles('ADMIN', 'MANAGER')
- **THEN** users with either ADMIN or MANAGER role SHALL access the route

### Requirement: Current user decorator
The system SHALL provide a @CurrentUser() decorator to access the authenticated user in route handlers.

#### Scenario: Access full user
- **WHEN** using @CurrentUser() without parameters
- **THEN** the decorator SHALL return the complete user object from the request

#### Scenario: Access user property
- **WHEN** using @CurrentUser('organizationId')
- **THEN** the decorator SHALL return only the specified property from the user object

### Requirement: Organization data isolation
The system SHALL ensure users can only access data belonging to their organization.

#### Scenario: Query scoping
- **WHEN** a user queries for resources (items, contacts, orders, etc.)
- **THEN** the system SHALL automatically filter results to the user's organizationId

#### Scenario: Cross-organization access attempt
- **WHEN** a user attempts to access a resource belonging to another organization
- **THEN** the system SHALL return 404 Not Found (not 403 to prevent enumeration)

