# Mobile Authentication Specification

> **Implementation Note (2026-02-10):** The actual implementation uses **React Native with Expo** instead of Flutter. Technology mapping: flutter_secure_storage → expo-secure-store, LocalAuthentication (Flutter) → expo-local-authentication, Riverpod → Zustand, Dio interceptor → Axios interceptor, GoRouter → Expo Router, Hive → AsyncStorage. The behavioral requirements below remain valid.

## Purpose
Provide secure authentication for the mobile application, including email/password login, JWT token management with auto-refresh, biometric login (fingerprint/Face ID), session management, and organization context selection. Integrates with the existing NestJS backend auth endpoints (`POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`).

## Requirements

### Requirement: Login screen
The mobile app SHALL provide a login screen with email and password fields, a "Remember me" toggle, and a login button.

#### Scenario: Login screen layout
- **WHEN** the user navigates to the login screen
- **THEN** the screen SHALL display:
  - Application logo and name at the top
  - Email text field with keyboard type `emailAddress` and autocomplete hint
  - Password text field with obscured input and visibility toggle icon
  - "Remember me" toggle switch (default off)
  - "Login" primary button (full width)
  - "Forgot Password?" text link (navigates to password reset, future feature)
  - "Don't have an account? Register" text link (navigates to registration, if supported)

#### Scenario: Form validation
- **WHEN** the user taps "Login" with empty fields
- **THEN** the form SHALL display inline validation errors: "Email is required", "Password is required"

#### Scenario: Email validation
- **WHEN** the user enters an invalid email format
- **THEN** the form SHALL display "Enter a valid email address"

#### Scenario: Successful login
- **WHEN** the user submits valid credentials
- **THEN** the app SHALL call `POST /auth/login` with `{ email, password }`
- **AND** on success, store the access token and refresh token in `flutter_secure_storage`
- **AND** store user profile data in the auth state provider
- **AND** navigate to the dashboard (`/`)

#### Scenario: Remember me enabled
- **WHEN** the user enables "Remember me" and logs in successfully
- **THEN** the app SHALL persist the email address in Hive `settings` box
- **AND** pre-fill the email field on the next app launch

#### Scenario: Remember me disabled
- **WHEN** the user disables "Remember me"
- **THEN** the app SHALL NOT persist the email address
- **AND** clear any previously stored email from Hive

#### Scenario: Invalid credentials
- **WHEN** the backend returns HTTP 401 with "Invalid credentials"
- **THEN** the app SHALL display a snackbar or inline error: "Invalid email or password"

#### Scenario: Network error during login
- **WHEN** the device has no internet connectivity during login
- **THEN** the app SHALL display an error: "No internet connection. Please check your network."

#### Scenario: Server error during login
- **WHEN** the backend returns HTTP 500
- **THEN** the app SHALL display an error: "Something went wrong. Please try again later."

### Requirement: JWT token handling
The app SHALL manage JWT access tokens and refresh tokens securely, with automatic refresh on expiry.

#### Scenario: Token storage
- **WHEN** tokens are received from the backend (login or refresh)
- **THEN** the app SHALL store in `flutter_secure_storage`:
  - `access_token`: the JWT access token
  - `refresh_token`: the refresh token
  - `token_expiry`: the decoded `exp` claim from the access token (ISO 8601 string)

#### Scenario: Authorization header injection
- **WHEN** any API request is made to an authenticated endpoint
- **THEN** the Dio auth interceptor SHALL read `access_token` from `flutter_secure_storage`
- **AND** add the header `Authorization: Bearer <access_token>`

#### Scenario: Token expiry pre-check
- **WHEN** making an API request
- **THEN** the auth interceptor SHALL check if the stored `token_expiry` is within 60 seconds of the current time
- **AND** if so, proactively refresh the token BEFORE sending the request

#### Scenario: Auto-refresh on 401 response
- **WHEN** the backend returns HTTP 401 for any authenticated request
- **THEN** the Dio interceptor SHALL:
  1. Lock the request queue to prevent concurrent refresh attempts
  2. Call `POST /auth/refresh` with `{ refreshToken }` from secure storage
  3. On success, store the new access token and refresh token
  4. Retry the original failed request with the new access token
  5. Unlock the request queue

#### Scenario: Refresh token failure
- **WHEN** the refresh token request itself returns 401 or fails
- **THEN** the app SHALL clear all stored tokens and user data
- **AND** navigate to the login screen
- **AND** display a message: "Your session has expired. Please log in again."

#### Scenario: Concurrent request handling during refresh
- **WHEN** multiple requests fail with 401 simultaneously
- **THEN** only one refresh request SHALL be sent
- **AND** all queued requests SHALL be retried with the new token once refresh completes

### Requirement: Biometric login
The app SHALL support fingerprint and Face ID authentication as a convenience login method after initial password login.

#### Scenario: Biometric availability check
- **WHEN** the user logs in successfully with password for the first time
- **THEN** the app SHALL check `LocalAuthentication.canCheckBiometrics` and `LocalAuthentication.isDeviceSupported()`
- **AND** if biometrics are available, prompt: "Enable biometric login for faster access?"

#### Scenario: Biometric enrollment
- **WHEN** the user accepts biometric enrollment
- **THEN** the app SHALL:
  1. Authenticate the user biometrically to verify device enrollment
  2. Store a flag `biometric_enabled: true` in `flutter_secure_storage`
  3. Store an encrypted copy of the refresh token specifically for biometric sessions

#### Scenario: Biometric login flow
- **WHEN** the app launches and biometric is enabled
- **THEN** the login screen SHALL show a biometric icon button (fingerprint or face)
- **AND** when tapped, call `LocalAuthentication.authenticate(localizedReason: 'Log in to IMS')`
- **AND** on success, use the stored refresh token to obtain a new access token via `POST /auth/refresh`
- **AND** navigate to the dashboard

#### Scenario: Biometric authentication failure
- **WHEN** biometric authentication fails (wrong finger, cancelled)
- **THEN** the app SHALL fall back to the email/password login form
- **AND** NOT lock the user out

#### Scenario: Biometric settings toggle
- **WHEN** the user navigates to Settings
- **THEN** there SHALL be a "Biometric Login" toggle switch
- **AND** disabling it SHALL clear the biometric flag and stored biometric refresh token from secure storage

#### Scenario: Biometric not available
- **WHEN** the device does not support biometrics
- **THEN** the biometric option SHALL NOT appear on the login screen or in settings

### Requirement: Session management
The app SHALL manage user sessions with inactivity timeout and background/foreground lifecycle handling.

#### Scenario: Inactivity timeout
- **WHEN** the user has not interacted with the app for 30 minutes (configurable via `APP_INACTIVITY_TIMEOUT_MINUTES` constant)
- **THEN** the app SHALL automatically log the user out
- **AND** navigate to the login screen with message: "You have been logged out due to inactivity."

#### Scenario: Inactivity timer tracking
- **WHEN** the user performs any touch interaction or navigation
- **THEN** the inactivity timer SHALL reset to zero

#### Scenario: Background to foreground transition
- **WHEN** the app returns to the foreground after being backgrounded
- **THEN** the app SHALL:
  1. Check if the inactivity timeout has elapsed while backgrounded
  2. If elapsed, log out the user
  3. If not elapsed, check token validity by calling `GET /auth/me`
  4. If the token is invalid and refresh fails, log out the user

#### Scenario: Logout flow
- **WHEN** the user taps "Logout" in the app menu or settings
- **THEN** the app SHALL:
  1. Call `POST /auth/logout` with the refresh token (fire-and-forget, do not block on failure)
  2. Clear `access_token`, `refresh_token`, and `token_expiry` from `flutter_secure_storage`
  3. Clear user profile data from the auth state provider
  4. Clear any sensitive cached data from Hive (but retain non-sensitive settings like "Remember me" email)
  5. Navigate to the login screen
  6. Unregister the FCM device token via `DELETE /notifications/unregister-device`

#### Scenario: Force logout on token clear
- **WHEN** tokens are cleared for any reason (manual logout, refresh failure, inactivity)
- **THEN** all authenticated API requests in flight SHALL be cancelled
- **AND** the GoRouter redirect guard SHALL prevent navigation to any authenticated route

### Requirement: Organization context
The app SHALL support users who belong to multiple organizations by allowing organization selection after login.

#### Scenario: Single organization user
- **WHEN** the authenticated user belongs to exactly one organization
- **THEN** the app SHALL automatically set that organization as the active context
- **AND** proceed directly to the dashboard

#### Scenario: Multi-organization user
- **WHEN** the authenticated user belongs to multiple organizations
- **THEN** the app SHALL display an organization selection screen after login
- **AND** list all organizations with name and industry
- **AND** store the selected `organizationId` for use in API requests

#### Scenario: Organization switch
- **WHEN** the user wants to switch organization (from settings or profile)
- **THEN** the app SHALL show the organization selection screen
- **AND** clear cached data specific to the previous organization
- **AND** reload dashboard data for the newly selected organization

### Requirement: Offline connectivity indicator
The app SHALL display a persistent indicator when the device loses network connectivity.

#### Scenario: Offline detection
- **WHEN** the device loses internet connectivity (detected via `connectivity_plus`)
- **THEN** the app SHALL display a banner at the top of the screen: "You are offline. Some features may be unavailable."
- **AND** the banner SHALL be styled with a warning color (`#faad14` background)

#### Scenario: Online restoration
- **WHEN** connectivity is restored
- **THEN** the offline banner SHALL be dismissed
- **AND** any queued offline operations SHALL begin syncing automatically

#### Scenario: Offline-capable screens
- **WHEN** the device is offline
- **THEN** the app SHALL still allow:
  - Viewing cached items from Hive
  - Queuing stock adjustments for later sync
  - Queuing quick sales for later sync
  - Viewing scan history
- **AND** SHALL disable or show disabled state for operations requiring real-time data (e.g., creating invoices, viewing live dashboard)

### Requirement: Loading states during auth operations
The app SHALL display appropriate loading indicators during all authentication operations.

#### Scenario: Login loading
- **WHEN** the login request is in progress
- **THEN** the login button SHALL show a loading spinner and be disabled
- **AND** the form fields SHALL be disabled

#### Scenario: Biometric loading
- **WHEN** biometric verification and token refresh are in progress
- **THEN** the app SHALL display a centered loading indicator with text "Authenticating..."

#### Scenario: Token refresh loading
- **WHEN** a background token refresh is occurring
- **THEN** the app SHALL NOT show a visible loading indicator (it should be transparent to the user)
- **AND** API requests SHALL queue silently until the refresh completes

#### Scenario: Logout loading
- **WHEN** the logout process is executing
- **THEN** the app SHALL show a brief loading overlay to prevent interaction during cleanup

## Auth State Provider

```dart
// features/auth/presentation/providers/auth_provider.dart

enum AuthStatus {
  initial,
  loading,
  authenticated,
  unauthenticated,
  biometricPrompt,
  organizationSelect,
}

class AuthState {
  final AuthStatus status;
  final User? user;
  final Organization? activeOrganization;
  final List<Organization>? organizations;
  final String? errorMessage;
  final bool biometricEnabled;
}
```

## API Endpoints Used

```
POST   /auth/login                - Email/password login
POST   /auth/register             - User registration
POST   /auth/refresh              - Refresh access token
POST   /auth/logout               - Invalidate refresh token
GET    /auth/me                   - Get current user profile
```

## Secure Storage Keys

| Key                | Description                          |
|--------------------|--------------------------------------|
| `access_token`     | JWT access token                     |
| `refresh_token`    | JWT refresh token                    |
| `token_expiry`     | Access token expiration (ISO 8601)   |
| `biometric_enabled`| Whether biometric login is active    |
| `biometric_refresh`| Refresh token copy for biometric use |
