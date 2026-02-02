# Frontend Layout Specification

## Purpose
Provide the dashboard layout structure with responsive sidebar navigation, header with user actions, breadcrumbs, and content area using Ant Design components.
## Requirements
### Requirement: Dashboard layout structure
The system SHALL provide a dashboard layout with sidebar, header, and content area.

#### Scenario: Layout composition
- **WHEN** a user accesses any dashboard page
- **THEN** the page SHALL display a fixed sidebar on the left, sticky header at the top, and scrollable content area

#### Scenario: Responsive sidebar
- **WHEN** the sidebar collapse button is clicked
- **THEN** the sidebar SHALL collapse to icon-only mode (80px width)
- **AND** the content area SHALL expand to fill available space

### Requirement: Sidebar navigation
The system SHALL provide hierarchical navigation in the sidebar.

#### Scenario: Navigation menu items
- **WHEN** the sidebar is rendered
- **THEN** it SHALL display menu items for: Dashboard, Items (with submenu), Inventory (with submenu), Sales (with submenu), Purchases (with submenu), Contacts (with submenu), Reports, Settings

#### Scenario: Active route highlighting
- **WHEN** a user navigates to a page
- **THEN** the corresponding menu item SHALL be highlighted as active
- **AND** parent menu SHALL be expanded if the active item is in a submenu

#### Scenario: Menu item links
- **WHEN** a user clicks a menu item
- **THEN** the application SHALL navigate to the corresponding route

### Requirement: Application header
The system SHALL provide a header with user context and actions.

#### Scenario: Header content
- **WHEN** the header is rendered
- **THEN** it SHALL display: notification bell with badge, help button, and user dropdown menu

#### Scenario: User dropdown menu
- **WHEN** the user clicks on their profile in the header
- **THEN** a dropdown SHALL appear with options: My Profile, Settings, Sign Out

#### Scenario: Sign out action
- **WHEN** the user clicks "Sign Out" in the dropdown
- **THEN** the system SHALL logout the user and redirect to the login page

### Requirement: Application branding
The system SHALL display consistent branding in the sidebar.

#### Scenario: Logo display
- **WHEN** the sidebar is expanded
- **THEN** it SHALL display "IMS Pro" as the application name

#### Scenario: Collapsed logo
- **WHEN** the sidebar is collapsed
- **THEN** it SHALL display "IMS" as shortened branding

### Requirement: Page container
The system SHALL provide consistent page styling.

#### Scenario: Page background
- **WHEN** a dashboard page is rendered
- **THEN** the content area SHALL have a light gray background (#f5f5f5)

#### Scenario: Page padding
- **WHEN** a dashboard page is rendered
- **THEN** the content SHALL have 24px padding on all sides

### Requirement: Ant Design theming
The system SHALL apply a custom Ant Design theme.

#### Scenario: Primary color
- **WHEN** the application renders
- **THEN** the primary color SHALL be #1890ff (Ant Design blue)

#### Scenario: Font family
- **WHEN** the application renders
- **THEN** the font family SHALL be "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"

#### Scenario: Border radius
- **WHEN** components render
- **THEN** the default border radius SHALL be 6px

### Requirement: TanStack Query integration
The system SHALL use TanStack Query for server state management.

#### Scenario: Query client configuration
- **WHEN** the application initializes
- **THEN** a QueryClient SHALL be configured with: 1 minute stale time, 5 minute garbage collection time, 1 retry, no refetch on window focus

#### Scenario: DevTools availability
- **WHEN** running in development mode
- **THEN** React Query DevTools SHALL be available for debugging

