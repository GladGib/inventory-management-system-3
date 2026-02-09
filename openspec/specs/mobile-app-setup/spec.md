# Mobile App Setup Specification

> **Implementation Note (2026-02-10):** The actual implementation uses **React Native with Expo** instead of Flutter. Technology mapping: Flutter → React Native/Expo, Dart → TypeScript, Riverpod → Zustand, Dio → Axios, GoRouter → Expo Router, Hive → AsyncStorage, flutter_secure_storage → expo-secure-store, Freezed → plain TS interfaces, pubspec.yaml → package.json. The behavioral requirements below remain valid; code examples are illustrative of the Flutter-era spec and should be mapped to their React Native equivalents.

## Purpose
Establish the React Native (Expo) mobile application project at `apps/mobile/` with modular architecture, state management, networking, local storage, navigation, and theming aligned with the existing web application and NestJS backend.

## Requirements

### Requirement: Flutter project initialization
The mobile project SHALL be a Flutter 3.x application using Dart, located at `apps/mobile/` within the existing monorepo.

#### Scenario: Project creation
- **WHEN** the project is initialized
- **THEN** it SHALL target Flutter 3.x with Dart 3.x
- **AND** the project root SHALL be `apps/mobile/`
- **AND** the application ID SHALL follow `com.example.inventoryms` (configurable per flavor)

#### Scenario: Minimum platform versions
- **WHEN** building for iOS
- **THEN** the minimum deployment target SHALL be iOS 14.0

#### Scenario: Android minimum SDK
- **WHEN** building for Android
- **THEN** the minimum SDK version SHALL be API level 24 (Android 7.0)

#### Scenario: Monorepo integration
- **WHEN** the project exists within the monorepo
- **THEN** it SHALL be independent of the Node.js workspace (pnpm does not manage it)
- **AND** it SHALL share no code directly with `apps/api/` or `apps/web/` at the file level
- **AND** it SHALL communicate with the backend exclusively via the REST API

### Requirement: Clean Architecture directory structure
The application SHALL follow Clean Architecture with presentation, domain, and data layers organized by feature.

#### Scenario: Core layer structure
- **WHEN** the project is scaffolded
- **THEN** `lib/core/` SHALL contain the following subdirectories:
  - `api/` for Dio HTTP client, request/response interceptors, and API endpoint constants
  - `auth/` for token management utilities and authentication state
  - `config/` for environment configuration and application constants
  - `router/` for GoRouter route definitions and navigation guards
  - `theme/` for application theme data matching the web Ant Design color system
  - `utils/` for formatters (currency, date, number), validators, and helper functions

#### Scenario: Feature layer structure
- **WHEN** the project is scaffolded
- **THEN** `lib/features/` SHALL contain feature modules, each with its own `presentation/`, `domain/`, and `data/` subdirectories:
  - `auth/` for login and biometric authentication screens
  - `dashboard/` for the mobile dashboard
  - `items/` for item lookup and detail views
  - `inventory/` for stock adjustment flows
  - `sales/` for quick sale and invoice creation
  - `notifications/` for push notification handling and notification list

#### Scenario: Feature module internal structure
- **WHEN** a feature module is created (e.g., `features/items/`)
- **THEN** it SHALL contain:
  - `presentation/` with `screens/`, `widgets/`, and `providers/` (Riverpod providers)
  - `domain/` with `models/` (Freezed data classes) and `repositories/` (abstract repository interfaces)
  - `data/` with `repositories/` (concrete implementations) and `datasources/` (API and local data sources)

#### Scenario: Shared layer structure
- **WHEN** the project is scaffolded
- **THEN** `lib/shared/` SHALL contain:
  - `widgets/` for reusable UI widgets (buttons, cards, inputs, loading indicators, empty states)
  - `models/` for shared data models used across multiple features (pagination, API response wrappers)

#### Scenario: Entry point
- **WHEN** the application starts
- **THEN** `lib/main.dart` SHALL initialize the ProviderScope (Riverpod), load environment config, initialize Hive, and launch the app

### Requirement: Complete directory tree
The project SHALL conform to the following directory layout:

```
apps/mobile/
  android/
  ios/
  lib/
    core/
      api/
        api_client.dart
        api_endpoints.dart
        api_interceptors.dart
        api_exceptions.dart
      auth/
        token_manager.dart
        auth_state.dart
      config/
        env_config.dart
        app_constants.dart
      router/
        app_router.dart
        route_names.dart
        auth_guard.dart
      theme/
        app_theme.dart
        app_colors.dart
        app_text_styles.dart
      utils/
        currency_formatter.dart
        date_formatter.dart
        validators.dart
        debouncer.dart
    features/
      auth/
        presentation/
          screens/
            login_screen.dart
            biometric_setup_screen.dart
          widgets/
          providers/
            auth_provider.dart
        domain/
          models/
            user.dart
            auth_tokens.dart
            organization.dart
          repositories/
            auth_repository.dart
        data/
          repositories/
            auth_repository_impl.dart
          datasources/
            auth_remote_datasource.dart
            auth_local_datasource.dart
      dashboard/
        presentation/
          screens/
            dashboard_screen.dart
          widgets/
            kpi_card.dart
            quick_actions_grid.dart
            sales_chart_widget.dart
            alerts_section.dart
          providers/
            dashboard_provider.dart
        domain/
          models/
            dashboard_data.dart
            kpi.dart
            alert.dart
          repositories/
            dashboard_repository.dart
        data/
          repositories/
            dashboard_repository_impl.dart
          datasources/
            dashboard_remote_datasource.dart
      items/
        presentation/
          screens/
            item_list_screen.dart
            item_detail_screen.dart
          widgets/
            item_card.dart
            item_search_bar.dart
            stock_breakdown_widget.dart
          providers/
            items_provider.dart
            item_detail_provider.dart
        domain/
          models/
            item.dart
            stock_level.dart
            item_filter.dart
          repositories/
            items_repository.dart
        data/
          repositories/
            items_repository_impl.dart
          datasources/
            items_remote_datasource.dart
            items_local_datasource.dart
      inventory/
        presentation/
          screens/
            stock_adjust_screen.dart
            batch_stocktake_screen.dart
            adjustment_history_screen.dart
          widgets/
            adjustment_form.dart
            stocktake_item_row.dart
          providers/
            inventory_provider.dart
        domain/
          models/
            stock_adjustment.dart
            stocktake_entry.dart
          repositories/
            inventory_repository.dart
        data/
          repositories/
            inventory_repository_impl.dart
          datasources/
            inventory_remote_datasource.dart
            inventory_local_datasource.dart
      sales/
        presentation/
          screens/
            quick_sale_screen.dart
            sale_review_screen.dart
            receipt_screen.dart
          widgets/
            line_item_row.dart
            customer_selector.dart
            payment_method_selector.dart
          providers/
            sales_provider.dart
        domain/
          models/
            sale_draft.dart
            sale_line_item.dart
            payment.dart
          repositories/
            sales_repository.dart
        data/
          repositories/
            sales_repository_impl.dart
          datasources/
            sales_remote_datasource.dart
            sales_local_datasource.dart
      notifications/
        presentation/
          screens/
            notifications_screen.dart
          widgets/
            notification_tile.dart
            notification_badge.dart
          providers/
            notifications_provider.dart
        domain/
          models/
            notification.dart
            device_token.dart
          repositories/
            notifications_repository.dart
        data/
          repositories/
            notifications_repository_impl.dart
          datasources/
            notifications_remote_datasource.dart
            notifications_local_datasource.dart
    shared/
      widgets/
        app_button.dart
        app_card.dart
        app_text_field.dart
        loading_overlay.dart
        skeleton_loader.dart
        empty_state.dart
        error_state.dart
        offline_banner.dart
        quantity_stepper.dart
      models/
        paginated_response.dart
        api_response.dart
    main.dart
  test/
  pubspec.yaml
  analysis_options.yaml
  .env.development
  .env.staging
  .env.production
```

### Requirement: Dependencies (pubspec.yaml)
The project SHALL declare the following dependencies with compatible versions.

#### Scenario: Runtime dependencies
- **WHEN** `pubspec.yaml` is configured
- **THEN** it SHALL include:
  - `flutter_riverpod: ^2.5.0` and `riverpod_annotation: ^2.3.0` for state management
  - `dio: ^5.4.0` for HTTP networking
  - `go_router: ^14.0.0` for declarative routing
  - `hive: ^2.2.3` and `hive_flutter: ^1.1.0` for local key-value storage
  - `flutter_secure_storage: ^9.0.0` for encrypted token storage
  - `freezed_annotation: ^2.4.0` and `json_annotation: ^4.8.0` for immutable models
  - `local_auth: ^2.2.0` for biometric authentication
  - `mobile_scanner: ^5.1.0` for barcode/QR scanning
  - `fl_chart: ^0.68.0` for charts
  - `firebase_core: ^3.0.0` and `firebase_messaging: ^15.0.0` for push notifications
  - `connectivity_plus: ^6.0.0` for network status monitoring
  - `intl: ^0.19.0` for Malaysian locale formatting (ms_MY)
  - `cached_network_image: ^3.3.0` for image caching
  - `flutter_svg: ^2.0.0` for SVG icon rendering
  - `path_provider: ^2.1.0` for file system paths
  - `share_plus: ^9.0.0` for sharing PDFs/files
  - `permission_handler: ^11.3.0` for runtime permissions
  - `vibration: ^2.0.0` for haptic feedback on scan
  - `url_launcher: ^6.2.0` for opening external links

#### Scenario: Dev dependencies
- **WHEN** `pubspec.yaml` is configured
- **THEN** devDependencies SHALL include:
  - `build_runner: ^2.4.0` for code generation
  - `freezed: ^2.5.0` for immutable class generation
  - `json_serializable: ^6.7.0` for JSON serialization code generation
  - `riverpod_generator: ^2.4.0` for Riverpod provider generation
  - `flutter_lints: ^4.0.0` or `very_good_analysis: ^6.0.0` for lint rules
  - `mockito: ^5.4.0` and `build_runner` for test mocking
  - `flutter_test` (SDK) for widget and unit testing

### Requirement: State management with Riverpod 2.x
The application SHALL use Riverpod 2.x with code generation for all state management.

#### Scenario: Provider scope
- **WHEN** the app starts
- **THEN** `main.dart` SHALL wrap `MaterialApp.router` in a `ProviderScope`

#### Scenario: Feature providers
- **WHEN** a feature needs state management
- **THEN** it SHALL define providers in its `presentation/providers/` directory
- **AND** use `@riverpod` annotation with code generation where applicable

#### Scenario: Async data
- **WHEN** fetching data from the API
- **THEN** providers SHALL use `AsyncValue<T>` to represent loading, data, and error states

#### Scenario: State notifiers
- **WHEN** a feature requires mutable state with actions (e.g., sale cart)
- **THEN** it SHALL use `Notifier` or `AsyncNotifier` classes

### Requirement: HTTP client (Dio)
The application SHALL use Dio as the HTTP client with interceptors for authentication, logging, and error handling.

#### Scenario: Base configuration
- **WHEN** the Dio client is initialized
- **THEN** it SHALL read the base URL from environment configuration
- **AND** set default timeouts: connect 15s, receive 30s, send 30s
- **AND** set `Content-Type: application/json` as the default header

#### Scenario: Auth interceptor
- **WHEN** a request is made to an authenticated endpoint
- **THEN** the interceptor SHALL read the access token from `flutter_secure_storage`
- **AND** attach it as `Authorization: Bearer <token>`

#### Scenario: Token refresh interceptor
- **WHEN** a response returns HTTP 401
- **THEN** the interceptor SHALL attempt to refresh the token using the stored refresh token via `POST /auth/refresh`
- **AND** retry the original request with the new access token
- **AND** if refresh also fails, clear tokens and navigate to the login screen

#### Scenario: Error interceptor
- **WHEN** a network error or non-2xx response is received
- **THEN** the interceptor SHALL transform it into a typed `ApiException` with status code, message, and optional validation errors

#### Scenario: Logging interceptor
- **WHEN** running in debug mode
- **THEN** the interceptor SHALL log request method, URL, headers, and response status to the console

### Requirement: Local storage
The application SHALL use Hive for general offline caching and flutter_secure_storage for sensitive credentials.

#### Scenario: Hive initialization
- **WHEN** the app starts
- **THEN** Hive SHALL be initialized with `await Hive.initFlutter()`
- **AND** register all type adapters for cached models

#### Scenario: Hive boxes
- **WHEN** caching data locally
- **THEN** the app SHALL use separate Hive boxes:
  - `items_cache` for recently viewed items
  - `scan_history` for barcode scan history
  - `offline_queue` for pending offline operations
  - `settings` for user preferences

#### Scenario: Secure storage for tokens
- **WHEN** storing authentication tokens
- **THEN** the app SHALL use `flutter_secure_storage` with platform-specific encryption
- **AND** store `access_token`, `refresh_token`, and `token_expiry` as separate keys

#### Scenario: Offline queue
- **WHEN** the device is offline and the user performs a write operation (stock adjustment, sale)
- **THEN** the operation SHALL be serialized and stored in the `offline_queue` Hive box
- **AND** synced automatically when connectivity is restored

### Requirement: Navigation with GoRouter
The application SHALL use GoRouter for declarative, URL-based routing with authentication guards.

#### Scenario: Route definitions
- **WHEN** the router is configured
- **THEN** it SHALL define routes for:
  - `/login` (unauthenticated)
  - `/` (dashboard, authenticated)
  - `/items` (item list)
  - `/items/:id` (item detail)
  - `/scan` (barcode scanner)
  - `/inventory/adjust` (stock adjustment)
  - `/inventory/stocktake` (batch stocktake)
  - `/sales/new` (quick sale)
  - `/notifications` (notification list)
  - `/settings` (app settings)

#### Scenario: Authentication guard
- **WHEN** navigating to an authenticated route
- **THEN** the router SHALL check for a valid token via the auth state provider
- **AND** redirect to `/login` if not authenticated

#### Scenario: Deep linking
- **WHEN** a push notification is tapped with a deep link payload
- **THEN** GoRouter SHALL navigate to the specified route (e.g., `/items/abc123`)

### Requirement: Theme matching web application
The application SHALL use a theme that visually aligns with the web application's Ant Design configuration.

#### Scenario: Primary color
- **WHEN** the theme is defined
- **THEN** `colorSchemeSeed` or primary color SHALL be `#1890ff` (Ant Design blue)

#### Scenario: Color palette
- **WHEN** the theme is defined
- **THEN** it SHALL include:
  - Primary: `#1890ff`
  - Success: `#52c41a`
  - Warning: `#faad14`
  - Error: `#ff4d4f`
  - Info: `#1890ff`
  - Sidebar dark: `#001529` (for any dark-themed elements)

#### Scenario: Typography
- **WHEN** the theme is defined
- **THEN** the default font family SHALL be `Inter` with system font fallbacks
- **AND** the font SHALL be bundled as an asset or loaded via Google Fonts

#### Scenario: Border radius
- **WHEN** the theme is defined
- **THEN** the default border radius SHALL be 6px, matching the web theme `borderRadius: 6`

#### Scenario: Light and dark mode
- **WHEN** the theme is configured
- **THEN** the app SHALL support `ThemeMode.light` as default
- **AND** optionally support `ThemeMode.dark` toggled from settings

### Requirement: Environment configuration
The application SHALL support multiple environments via compile-time configuration.

#### Scenario: Environment files
- **WHEN** the project is configured
- **THEN** it SHALL include `.env.development`, `.env.staging`, and `.env.production` files

#### Scenario: Environment variables
- **WHEN** an environment is loaded
- **THEN** it SHALL provide:
  - `API_BASE_URL` (e.g., `http://10.0.2.2:3000/api` for dev Android emulator, `http://localhost:3000/api` for iOS simulator)
  - `APP_NAME` (display name)
  - `FIREBASE_PROJECT_ID`
  - `SENTRY_DSN` (optional, for crash reporting)

#### Scenario: Flavor/build configuration
- **WHEN** building for different environments
- **THEN** the app SHALL use `--dart-define` or `--dart-define-from-file` to inject environment variables at build time
- **AND** `EnvConfig` class SHALL read these values via `String.fromEnvironment`

### Requirement: Malaysian locale support
The application SHALL support Malaysian locale for date, currency, and number formatting.

#### Scenario: Currency formatting
- **WHEN** displaying monetary values
- **THEN** the app SHALL format using `NumberFormat.currency(locale: 'ms_MY', symbol: 'RM ', decimalDigits: 2)`

#### Scenario: Date formatting
- **WHEN** displaying dates
- **THEN** the app SHALL default to `dd/MM/yyyy` format (Malaysian convention)
- **AND** support `dd MMM yyyy` for display contexts

#### Scenario: Locale initialization
- **WHEN** the app starts
- **THEN** it SHALL call `await initializeDateFormatting('ms_MY')` from the `intl` package

#### Scenario: Bilingual support
- **WHEN** the user changes language preference
- **THEN** the app SHALL support English (`en`) and Bahasa Malaysia (`ms`) via Flutter's localization framework
- **AND** use ARB files for string translations

### Requirement: Code generation workflow
The project SHALL use build_runner for Freezed, JSON serializable, and Riverpod code generation.

#### Scenario: Build command
- **WHEN** models or providers are changed
- **THEN** the developer SHALL run `dart run build_runner build --delete-conflicting-outputs`

#### Scenario: Generated files
- **WHEN** code generation runs
- **THEN** it SHALL produce `*.g.dart` (JSON serializable) and `*.freezed.dart` (Freezed) files
- **AND** these files SHALL be committed to version control

#### Scenario: Analysis options
- **WHEN** the project is configured
- **THEN** `analysis_options.yaml` SHALL include rules to ignore generated file warnings
