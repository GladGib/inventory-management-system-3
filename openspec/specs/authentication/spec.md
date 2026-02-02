# Authentication Specification

## Purpose
Provide secure JWT-based authentication for the IMS application, including user registration, login, token refresh, and session management.
## Requirements
### Requirement: User registration
The system SHALL allow new users to register with email, password, name, and organization details.

#### Scenario: Successful registration
- **WHEN** a user submits valid registration data (email, password, name, organizationName, industry)
- **THEN** the system SHALL create a new organization, user account, default warehouse, and default tax rates
- **AND** return access token, refresh token, and user details

#### Scenario: Duplicate email registration
- **WHEN** a user attempts to register with an email that already exists
- **THEN** the system SHALL return a 409 Conflict error with message "User with this email already exists"

#### Scenario: Invalid registration data
- **WHEN** a user submits registration data missing required fields
- **THEN** the system SHALL return a 400 Bad Request error with validation details

### Requirement: User login
The system SHALL allow existing users to authenticate with email and password.

#### Scenario: Successful login
- **WHEN** a user submits valid email and password
- **THEN** the system SHALL return access token, refresh token, and user details
- **AND** store the refresh token in the database with expiry date

#### Scenario: Invalid credentials
- **WHEN** a user submits incorrect email or password
- **THEN** the system SHALL return a 401 Unauthorized error with message "Invalid credentials"

#### Scenario: Inactive user login
- **WHEN** a user with INACTIVE status attempts to login
- **THEN** the system SHALL return a 401 Unauthorized error

#### Scenario: Inactive organization login
- **WHEN** a user whose organization has INACTIVE status attempts to login
- **THEN** the system SHALL return a 401 Unauthorized error

### Requirement: JWT access tokens
The system SHALL issue JWT access tokens for API authentication.

#### Scenario: Access token contents
- **WHEN** an access token is issued
- **THEN** the token payload SHALL include userId, email, organizationId, and role

#### Scenario: Access token expiry
- **WHEN** an access token is issued
- **THEN** the token SHALL expire after 15 minutes

#### Scenario: Access token validation
- **WHEN** a request includes a valid access token in the Authorization header
- **THEN** the system SHALL authenticate the request and populate the user context

### Requirement: Refresh token rotation
The system SHALL support refresh token rotation to obtain new access tokens.

#### Scenario: Successful token refresh
- **WHEN** a valid refresh token is submitted to the refresh endpoint
- **THEN** the system SHALL issue a new access token and new refresh token
- **AND** invalidate the old refresh token

#### Scenario: Expired refresh token
- **WHEN** an expired refresh token is submitted
- **THEN** the system SHALL return a 401 Unauthorized error

#### Scenario: Invalid refresh token
- **WHEN** an invalid or revoked refresh token is submitted
- **THEN** the system SHALL return a 401 Unauthorized error

### Requirement: User logout
The system SHALL allow users to logout and invalidate their refresh token.

#### Scenario: Successful logout
- **WHEN** a user submits their refresh token to the logout endpoint
- **THEN** the system SHALL revoke the refresh token in the database
- **AND** return a success response

### Requirement: Current user endpoint
The system SHALL provide an endpoint to retrieve the currently authenticated user's details.

#### Scenario: Get current user
- **WHEN** an authenticated request is made to GET /auth/me
- **THEN** the system SHALL return the user's id, email, name, role, and organization details

#### Scenario: Unauthenticated request
- **WHEN** a request without valid authentication is made to GET /auth/me
- **THEN** the system SHALL return a 401 Unauthorized error

### Requirement: Password security
The system SHALL securely hash and verify passwords.

#### Scenario: Password hashing
- **WHEN** a user registers or changes their password
- **THEN** the system SHALL hash the password using bcrypt with appropriate salt rounds

#### Scenario: Password verification
- **WHEN** a user attempts to login
- **THEN** the system SHALL verify the submitted password against the stored hash

