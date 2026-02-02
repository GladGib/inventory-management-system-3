## ADDED Requirements

### Requirement: Login page
The system SHALL provide a login page for user authentication.

#### Scenario: Login form fields
- **WHEN** the login page is rendered
- **THEN** it SHALL display form fields for email and password with a "Sign In" button

#### Scenario: Successful login
- **WHEN** a user submits valid credentials
- **THEN** the system SHALL authenticate the user, store tokens in localStorage, and redirect to /dashboard

#### Scenario: Failed login
- **WHEN** a user submits invalid credentials
- **THEN** the system SHALL display an error message "Invalid email or password"

#### Scenario: Login page links
- **WHEN** the login page is rendered
- **THEN** it SHALL display links to "Forgot password?" and "Create an account"

### Requirement: Registration page
The system SHALL provide a registration page for new users.

#### Scenario: Registration form fields
- **WHEN** the registration page is rendered
- **THEN** it SHALL display form fields for: name, email, company name, industry (dropdown), password, confirm password

#### Scenario: Industry options
- **WHEN** the industry dropdown is rendered
- **THEN** it SHALL display options: Auto Parts, Hardware, Spare Parts, General

#### Scenario: Successful registration
- **WHEN** a user submits valid registration data
- **THEN** the system SHALL create the account, store tokens, and redirect to /dashboard

#### Scenario: Password validation
- **WHEN** a user enters a password
- **THEN** the system SHALL require minimum 8 characters

#### Scenario: Password confirmation
- **WHEN** the password and confirm password fields don't match
- **THEN** the system SHALL display "Passwords do not match" error

### Requirement: Auth page styling
The system SHALL provide consistent styling for authentication pages.

#### Scenario: Auth container
- **WHEN** an auth page is rendered
- **THEN** it SHALL display centered content with a gradient background (purple to blue)

#### Scenario: Auth card
- **WHEN** an auth page is rendered
- **THEN** the form SHALL be contained in a white card with rounded corners and shadow

### Requirement: Protected route handling
The system SHALL protect dashboard routes from unauthenticated access.

#### Scenario: Unauthenticated access
- **WHEN** an unauthenticated user attempts to access a dashboard route
- **THEN** the system SHALL redirect to /login

#### Scenario: Authenticated access to auth pages
- **WHEN** an authenticated user attempts to access /login or /register
- **THEN** the system SHALL redirect to /dashboard

#### Scenario: Loading state
- **WHEN** the auth state is being determined
- **THEN** the system SHALL display a loading spinner

### Requirement: Token storage
The system SHALL store authentication tokens in localStorage.

#### Scenario: Token persistence
- **WHEN** a user successfully authenticates
- **THEN** the system SHALL store accessToken and refreshToken in localStorage

#### Scenario: Token retrieval
- **WHEN** the API client makes a request
- **THEN** it SHALL retrieve the accessToken from localStorage and include it in the Authorization header

#### Scenario: Token cleanup on logout
- **WHEN** a user logs out
- **THEN** the system SHALL remove accessToken and refreshToken from localStorage

### Requirement: Auth state management
The system SHALL manage authentication state with Zustand.

#### Scenario: User state
- **WHEN** the auth store is accessed
- **THEN** it SHALL provide: user object (or null), isLoading boolean, setUser function, logout function

#### Scenario: State persistence
- **WHEN** the page is refreshed
- **THEN** the auth store SHALL restore the user state from localStorage

### Requirement: API client interceptors
The system SHALL handle authentication automatically in API requests.

#### Scenario: Request interceptor
- **WHEN** an API request is made
- **THEN** the system SHALL automatically add the Authorization header with the access token

#### Scenario: Token refresh on 401
- **WHEN** an API request returns 401 Unauthorized
- **THEN** the system SHALL attempt to refresh the token and retry the original request

#### Scenario: Refresh failure handling
- **WHEN** token refresh fails
- **THEN** the system SHALL clear tokens and redirect to /login
