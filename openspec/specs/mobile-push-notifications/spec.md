# Mobile Push Notifications Specification

> **Implementation Note (2026-02-10):** The actual implementation uses **React Native with Expo** instead of Flutter. Technology mapping: Firebase Cloud Messaging (FCM) → expo-notifications (Expo Push Service), firebase_messaging → expo-notifications. The behavioral requirements below remain valid.

## Purpose
Implement push notification support for the mobile app using Expo Push Notifications, including device token registration, notification delivery for business events (low stock, sales, payments, overdue invoices), in-app notification list with read/unread state, deep linking from notifications, and user-configurable notification preferences. Requires backend infrastructure including a DeviceToken model, notification API endpoints, and a BullMQ-based notification dispatch queue.

## Requirements

### Requirement: Firebase Messaging setup (mobile)
The Flutter app SHALL integrate Firebase Cloud Messaging for receiving push notifications on both iOS and Android.

#### Scenario: Firebase initialization
- **WHEN** the app starts
- **THEN** `Firebase.initializeApp()` SHALL be called before any Firebase service is used
- **AND** `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) SHALL be included in the respective platform directories

#### Scenario: FCM token retrieval
- **WHEN** the app starts and the user is authenticated
- **THEN** the app SHALL call `FirebaseMessaging.instance.getToken()` to obtain the FCM device token
- **AND** register the token with the backend via `POST /notifications/register-device`

#### Scenario: FCM token refresh
- **WHEN** FCM rotates the device token
- **THEN** the app SHALL listen to `FirebaseMessaging.instance.onTokenRefresh`
- **AND** register the new token with the backend (replacing the old one)

#### Scenario: iOS permission request
- **WHEN** the app runs on iOS
- **THEN** it SHALL request notification permission via `FirebaseMessaging.instance.requestPermission()`
- **AND** handle the cases: authorized, denied, provisional, notDetermined

#### Scenario: Android notification channel
- **WHEN** the app runs on Android (API 26+)
- **THEN** it SHALL create a notification channel with:
  - Channel ID: `ims_notifications`
  - Channel Name: "IMS Notifications"
  - Importance: High
  - Sound: default
  - Vibration: enabled

### Requirement: Device token backend model
The backend SHALL store FCM device tokens linked to users and organizations.

#### Scenario: DeviceToken model creation
- **WHEN** the DeviceToken entity is defined
- **THEN** it SHALL have the following fields:
  ```prisma
  model DeviceToken {
    id              String    @id @default(cuid())
    userId          String
    user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
    token           String    @unique
    platform        Platform  // IOS, ANDROID
    deviceName      String?   // Optional device identifier for display
    isActive        Boolean   @default(true)
    lastUsedAt      DateTime  @default(now())
    organizationId  String
    organization    Organization @relation(fields: [organizationId], references: [id])
    createdAt       DateTime  @default(now())
    updatedAt       DateTime  @updatedAt

    @@index([userId])
    @@index([organizationId])
    @@index([token])
  }

  enum Platform {
    IOS
    ANDROID
  }
  ```

#### Scenario: Token uniqueness
- **WHEN** a device token is registered
- **THEN** the `token` field SHALL be unique across all records
- **AND** if the same token is re-registered (e.g., app reinstall), the existing record SHALL be updated (upsert)

#### Scenario: Token deactivation on logout
- **WHEN** a user logs out
- **THEN** the backend SHALL set `isActive: false` on their device token
- **AND** NOT delete the record (for audit purposes)

### Requirement: Backend notification API endpoints
The backend SHALL provide API endpoints for device registration, notification management, and sending.

#### Scenario: Register device token
- **WHEN** `POST /notifications/register-device` is called
- **THEN** it SHALL accept:
  ```json
  {
    "token": "<fcm_token>",
    "platform": "IOS" | "ANDROID",
    "deviceName": "<optional_device_name>"
  }
  ```
- **AND** upsert the DeviceToken record (update if token exists, create if new)
- **AND** set `isActive: true` and `lastUsedAt: now()`
- **AND** return 200 OK with the device token record

#### Scenario: Unregister device token
- **WHEN** `DELETE /notifications/unregister-device` is called
- **THEN** it SHALL accept `{ "token": "<fcm_token>" }` in the request body
- **AND** set `isActive: false` on the matching DeviceToken record
- **AND** return 200 OK

#### Scenario: Send notification (admin)
- **WHEN** `POST /notifications/send` is called by an admin user
- **THEN** it SHALL accept:
  ```json
  {
    "title": "<notification_title>",
    "body": "<notification_body>",
    "data": { "<key>": "<value>" },
    "target": {
      "type": "USER" | "ROLE" | "ALL",
      "userId": "<optional_user_id>",
      "role": "<optional_role>"
    }
  }
  ```
- **AND** enqueue the notification for delivery via BullMQ
- **AND** return 200 OK with a job ID

#### Scenario: Get notification history
- **WHEN** `GET /notifications` is called by an authenticated user
- **THEN** it SHALL return a paginated list of notifications for the user, ordered by `createdAt` descending
- **AND** include fields: id, type, title, body, data, isRead, readAt, createdAt
- **AND** support query parameters: `page`, `limit`, `isRead` (boolean filter)

#### Scenario: Mark notification as read
- **WHEN** `PUT /notifications/:id/read` is called
- **THEN** it SHALL set `isRead: true` and `readAt: now()` on the notification record
- **AND** return 200 OK

#### Scenario: Mark all as read
- **WHEN** `PUT /notifications/read-all` is called
- **THEN** it SHALL update all unread notifications for the user to `isRead: true`
- **AND** return 200 OK with the count of updated notifications

#### Scenario: Get unread count
- **WHEN** `GET /notifications/unread-count` is called
- **THEN** it SHALL return `{ "count": <number> }` for the authenticated user

### Requirement: Backend notification model
The backend SHALL store notification history for each user.

#### Scenario: Notification model
- **WHEN** the Notification entity is defined
- **THEN** it SHALL have:
  ```prisma
  model Notification {
    id              String    @id @default(cuid())
    userId          String
    user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
    type            NotificationType
    title           String
    body            String
    data            Json?     // Deep link data, entity references
    isRead          Boolean   @default(false)
    readAt          DateTime?
    organizationId  String
    organization    Organization @relation(fields: [organizationId], references: [id])
    createdAt       DateTime  @default(now())

    @@index([userId, isRead])
    @@index([userId, createdAt])
    @@index([organizationId])
  }

  enum NotificationType {
    LOW_STOCK
    NEW_SALES_ORDER
    PAYMENT_RECEIVED
    PO_DELIVERY_DUE
    INVOICE_OVERDUE
    EINVOICE_RESULT
    SYSTEM_ANNOUNCEMENT
  }
  ```

### Requirement: Notification types and triggers
The backend SHALL automatically generate notifications for specific business events.

#### Scenario: Low stock alert
- **WHEN** a stock adjustment or sale causes an item's `stockOnHand` to drop to or below its `reorderLevel`
- **THEN** the system SHALL create a notification for all users with ADMIN or MANAGER roles in the organization:
  - Type: `LOW_STOCK`
  - Title: "Low Stock Alert"
  - Body: "[Item Name] (SKU: [SKU]) is below reorder level. Stock: [current] / Reorder: [level]"
  - Data: `{ "screen": "/items/<itemId>", "itemId": "<itemId>" }`

#### Scenario: New sales order received
- **WHEN** a new sales order is created with status CONFIRMED (e.g., from customer portal or API)
- **THEN** the system SHALL notify the assigned salesperson (or all ADMIN/MANAGER users):
  - Type: `NEW_SALES_ORDER`
  - Title: "New Sales Order"
  - Body: "Sales Order [SO-XXXXXX] received from [Customer Name]. Total: RM [amount]"
  - Data: `{ "screen": "/sales/orders/<orderId>", "orderId": "<orderId>" }`

#### Scenario: Payment received
- **WHEN** a payment is recorded against an invoice
- **THEN** the system SHALL notify the invoice creator:
  - Type: `PAYMENT_RECEIVED`
  - Title: "Payment Received"
  - Body: "RM [amount] received for Invoice [INV-XXXXXX] from [Customer Name]"
  - Data: `{ "screen": "/sales/invoices/<invoiceId>", "invoiceId": "<invoiceId>" }`

#### Scenario: Purchase order delivery due today
- **WHEN** a scheduled job runs daily (e.g., 8:00 AM MYT)
- **THEN** the system SHALL find all POs with `expectedDate` = today and status ISSUED or PARTIALLY_RECEIVED
- **AND** create notifications for the PO creator:
  - Type: `PO_DELIVERY_DUE`
  - Title: "PO Delivery Due Today"
  - Body: "Purchase Order [PO-XXXXXX] from [Vendor Name] is expected for delivery today"
  - Data: `{ "screen": "/purchases/orders/<poId>", "poId": "<poId>" }`

#### Scenario: Invoice overdue
- **WHEN** a scheduled job runs daily
- **THEN** the system SHALL find all invoices with `dueDate` < today and status not PAID or VOID
- **AND** create notifications for the invoice creator (once per invoice, not repeated daily):
  - Type: `INVOICE_OVERDUE`
  - Title: "Invoice Overdue"
  - Body: "Invoice [INV-XXXXXX] for [Customer Name] is overdue. Amount: RM [balance]"
  - Data: `{ "screen": "/sales/invoices/<invoiceId>", "invoiceId": "<invoiceId>" }`

#### Scenario: e-Invoice validation result
- **WHEN** an e-Invoice submission receives a validation response from MyInvois
- **THEN** the system SHALL notify the invoice creator:
  - Type: `EINVOICE_RESULT`
  - Title: "e-Invoice [Validated/Rejected]"
  - Body: "e-Invoice for [INV-XXXXXX] has been [validated/rejected]. [reason if rejected]"
  - Data: `{ "screen": "/sales/invoices/<invoiceId>", "invoiceId": "<invoiceId>" }`

#### Scenario: System announcement
- **WHEN** an admin sends a system announcement via `POST /notifications/send` with target type "ALL"
- **THEN** the system SHALL create notifications for all active users in the organization:
  - Type: `SYSTEM_ANNOUNCEMENT`
  - Title: from request
  - Body: from request
  - Data: from request

### Requirement: Backend notification dispatch via BullMQ
The backend SHALL use BullMQ to queue and process notification delivery.

#### Scenario: Notification queue setup
- **WHEN** the notification module is initialized
- **THEN** it SHALL create a BullMQ queue named `notifications`
- **AND** register a processor that handles notification jobs

#### Scenario: Notification job processing
- **WHEN** a notification job is dequeued
- **THEN** the processor SHALL:
  1. Create a Notification record in the database
  2. Find all active DeviceTokens for the target user(s)
  3. Send push notifications via Firebase Admin SDK to each device token
  4. Handle failures (invalid token -> mark token as inactive, retry on transient errors)

#### Scenario: Firebase Admin SDK integration
- **WHEN** sending a push notification
- **THEN** the backend SHALL use `firebase-admin` SDK with:
  ```typescript
  admin.messaging().send({
    token: deviceToken,
    notification: {
      title: notification.title,
      body: notification.body,
    },
    data: notification.data,
    android: {
      priority: 'high',
      notification: {
        channelId: 'ims_notifications',
        sound: 'default',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: unreadCount,
        },
      },
    },
  });
  ```

#### Scenario: Invalid token handling
- **WHEN** Firebase returns `messaging/registration-token-not-registered` or `messaging/invalid-registration-token`
- **THEN** the backend SHALL set the DeviceToken's `isActive: false`
- **AND** log the token invalidation

#### Scenario: Batch sending
- **WHEN** a notification targets multiple users (e.g., all admins)
- **THEN** the backend SHALL use `admin.messaging().sendEachForMulticast()` for efficient batch delivery
- **AND** process results individually for token invalidation

### Requirement: Mobile notification bell and unread count
The mobile app SHALL display a notification bell icon with an unread count badge.

#### Scenario: Notification bell in app bar
- **WHEN** the dashboard or any main screen is displayed
- **THEN** the app bar SHALL include a bell icon on the right side

#### Scenario: Unread count badge
- **WHEN** there are unread notifications
- **THEN** the bell icon SHALL display a small red circular badge with the unread count
- **AND** the count SHALL be fetched from `GET /notifications/unread-count` on app launch and periodically (every 60 seconds)
- **AND** updated in real-time when a new push notification is received

#### Scenario: No unread notifications
- **WHEN** the unread count is zero
- **THEN** the badge SHALL NOT be displayed (bell icon only)

#### Scenario: Bell icon tap
- **WHEN** the user taps the notification bell
- **THEN** the app SHALL navigate to the notification list screen (`/notifications`)

### Requirement: Notification list screen
The app SHALL provide a dedicated screen for viewing notification history with read/unread state.

#### Scenario: Notification list layout
- **WHEN** the user navigates to `/notifications`
- **THEN** the screen SHALL display:
  - App bar with title "Notifications" and a "Mark All as Read" action button
  - A list of notifications ordered by date (newest first)
  - Pull-to-refresh support

#### Scenario: Notification tile design
- **WHEN** a notification is rendered in the list
- **THEN** each tile SHALL display:
  - An icon on the left based on notification type (color-coded):
    - LOW_STOCK: warning icon, amber
    - NEW_SALES_ORDER: shopping cart icon, blue
    - PAYMENT_RECEIVED: currency icon, green
    - PO_DELIVERY_DUE: truck icon, blue
    - INVOICE_OVERDUE: exclamation icon, red
    - EINVOICE_RESULT: document icon, blue/red based on result
    - SYSTEM_ANNOUNCEMENT: megaphone icon, purple
  - Title text (bold if unread, regular if read)
  - Body text (max 2 lines, ellipsis overflow)
  - Time ago label (e.g., "5 min ago", "2 hours ago", "Yesterday")
  - Unread indicator: blue dot on the left side (if unread)

#### Scenario: Read/unread visual state
- **WHEN** a notification is unread
- **THEN** the tile background SHALL be slightly tinted (e.g., light blue `#e6f7ff`)
- **AND** the title SHALL be bold

#### Scenario: Mark as read on tap
- **WHEN** the user taps a notification tile
- **THEN** the app SHALL:
  1. Call `PUT /notifications/:id/read`
  2. Update the local state to reflect read status
  3. Navigate to the screen specified in the notification's `data.screen` field (deep link)
  4. Decrement the unread count badge

#### Scenario: Mark all as read
- **WHEN** the user taps "Mark All as Read" in the app bar
- **THEN** the app SHALL call `PUT /notifications/read-all`
- **AND** update all visible notifications to read state
- **AND** set the unread count badge to 0

#### Scenario: Pagination
- **WHEN** the user scrolls to the bottom of the notification list
- **THEN** the app SHALL fetch the next page via `GET /notifications?page=N&limit=20`

#### Scenario: Empty notifications
- **WHEN** there are no notifications
- **THEN** the screen SHALL display an empty state:
  - Bell icon illustration
  - Text: "No notifications yet"
  - Subtitle: "You'll see alerts and updates here"

### Requirement: Deep linking from push notifications
The app SHALL navigate to the relevant screen when a push notification is tapped.

#### Scenario: Foreground notification
- **WHEN** a push notification is received while the app is in the foreground
- **THEN** the app SHALL:
  1. Display an in-app banner/snackbar at the top showing the notification title and body
  2. The banner SHALL be tappable to navigate to the deep link target
  3. The banner SHALL auto-dismiss after 5 seconds
  4. Increment the unread count badge

#### Scenario: Background notification tap
- **WHEN** the user taps a push notification from the system tray (app in background)
- **THEN** `FirebaseMessaging.onMessageOpenedApp` SHALL handle the event
- **AND** parse the `data.screen` field from the notification payload
- **AND** navigate to the specified route via GoRouter (e.g., `/items/abc123`)

#### Scenario: Terminated app notification tap
- **WHEN** the user taps a push notification that launches the app from terminated state
- **THEN** `FirebaseMessaging.getInitialMessage()` SHALL be checked on app startup
- **AND** if a notification is found, the app SHALL navigate to the deep link target after authentication

#### Scenario: Deep link route mapping
- **WHEN** a notification contains a `data.screen` field
- **THEN** the app SHALL map it to GoRouter routes:
  - `/items/<id>` -> Item detail screen
  - `/sales/orders/<id>` -> Sales order detail (future, show item detail for now)
  - `/sales/invoices/<id>` -> Invoice detail (future, navigate to dashboard for now)
  - `/purchases/orders/<id>` -> PO detail (future, navigate to dashboard for now)
  - Unknown routes -> Dashboard

### Requirement: Notification settings
The app SHALL allow users to configure which notification types they receive.

#### Scenario: Settings screen section
- **WHEN** the user navigates to Settings -> Notifications
- **THEN** the screen SHALL display toggle switches for each notification type:
  - Low Stock Alerts: on/off (default: on)
  - Sales Order Notifications: on/off (default: on)
  - Payment Notifications: on/off (default: on)
  - PO Delivery Reminders: on/off (default: on)
  - Invoice Overdue Alerts: on/off (default: on)
  - e-Invoice Updates: on/off (default: on)
  - System Announcements: on/off (default: on, cannot disable)

#### Scenario: Settings persistence
- **WHEN** the user toggles a notification preference
- **THEN** the preference SHALL be stored locally in Hive `settings` box
- **AND** synced to the backend via `PUT /notifications/preferences` (if endpoint exists)

#### Scenario: Settings affect push delivery
- **WHEN** a notification type is disabled by the user
- **THEN** the backend SHALL still create the Notification record (for in-app history)
- **BUT** SHALL NOT send the push notification to the user's devices
- **AND** the mobile app SHALL filter out disabled types from the in-app notification list (optional)

#### Scenario: Master notification toggle
- **WHEN** the user wants to disable all notifications
- **THEN** the settings screen SHALL provide a master toggle: "Enable Push Notifications"
- **AND** disabling it SHALL prevent all push deliveries (but in-app history remains)

### Requirement: Silent notifications for background data sync
The app SHALL support silent (data-only) push notifications for background data refresh.

#### Scenario: Silent notification delivery
- **WHEN** the backend sends a data-only notification (no `notification` payload, only `data`)
- **THEN** the app SHALL handle it in the background handler registered via `FirebaseMessaging.onBackgroundMessage`

#### Scenario: Background data sync trigger
- **WHEN** a silent notification with `data.type: "SYNC"` is received
- **THEN** the app SHALL refresh cached data (e.g., update cached items, refresh dashboard cache)
- **AND** NOT display any visible notification to the user

#### Scenario: Stock level sync
- **WHEN** a silent notification with `data.type: "STOCK_UPDATE"` and `data.itemId` is received
- **THEN** the app SHALL update the cached stock level for that item in the Hive `items_cache`

## Backend API Endpoints (New)

```
POST   /notifications/register-device        - Register FCM device token
DELETE /notifications/unregister-device       - Unregister device token (on logout)
POST   /notifications/send                   - Send notification (admin only)
GET    /notifications                        - Get user's notification history (paginated)
GET    /notifications/unread-count           - Get unread notification count
PUT    /notifications/:id/read               - Mark single notification as read
PUT    /notifications/read-all               - Mark all notifications as read
PUT    /notifications/preferences            - Update notification preferences
GET    /notifications/preferences            - Get notification preferences
```

## Backend Database Schema (New)

```prisma
model DeviceToken {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  token           String    @unique
  platform        Platform
  deviceName      String?
  isActive        Boolean   @default(true)
  lastUsedAt      DateTime  @default(now())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([userId])
  @@index([organizationId])
}

model Notification {
  id              String           @id @default(cuid())
  userId          String
  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  type            NotificationType
  title           String
  body            String
  data            Json?
  isRead          Boolean          @default(false)
  readAt          DateTime?
  organizationId  String
  organization    Organization     @relation(fields: [organizationId], references: [id])
  createdAt       DateTime         @default(now())

  @@index([userId, isRead])
  @@index([userId, createdAt])
  @@index([organizationId])
}

model NotificationPreference {
  id              String           @id @default(cuid())
  userId          String           @unique
  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  lowStock        Boolean          @default(true)
  salesOrder      Boolean          @default(true)
  payment         Boolean          @default(true)
  poDelivery      Boolean          @default(true)
  invoiceOverdue  Boolean          @default(true)
  eInvoice        Boolean          @default(true)
  systemAnnouncement Boolean       @default(true)
  pushEnabled     Boolean          @default(true)
  organizationId  String
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
}

enum Platform {
  IOS
  ANDROID
}

enum NotificationType {
  LOW_STOCK
  NEW_SALES_ORDER
  PAYMENT_RECEIVED
  PO_DELIVERY_DUE
  INVOICE_OVERDUE
  EINVOICE_RESULT
  SYSTEM_ANNOUNCEMENT
}
```

## Backend Dependencies (New)

```json
{
  "firebase-admin": "^12.0.0",
  "@nestjs/bull": "^10.0.0",
  "bull": "^4.12.0"
}
```

## Backend Module Structure

```
apps/api/src/modules/notifications/
  notifications.module.ts
  notifications.controller.ts
  notifications.service.ts
  notifications.processor.ts       # BullMQ job processor
  dto/
    register-device.dto.ts
    send-notification.dto.ts
    update-preferences.dto.ts
  entities/
    device-token.entity.ts
    notification.entity.ts
    notification-preference.entity.ts
```

## Mobile Data Models

```dart
// features/notifications/domain/models/notification.dart

@freezed
class AppNotification with _$AppNotification {
  const factory AppNotification({
    required String id,
    required String type,        // NotificationType enum value
    required String title,
    required String body,
    Map<String, dynamic>? data,
    required bool isRead,
    DateTime? readAt,
    required DateTime createdAt,
  }) = _AppNotification;

  factory AppNotification.fromJson(Map<String, dynamic> json) =>
      _$AppNotificationFromJson(json);
}

@freezed
class DeviceTokenRegistration with _$DeviceTokenRegistration {
  const factory DeviceTokenRegistration({
    required String token,
    required String platform,    // 'IOS' or 'ANDROID'
    String? deviceName,
  }) = _DeviceTokenRegistration;

  factory DeviceTokenRegistration.fromJson(Map<String, dynamic> json) =>
      _$DeviceTokenRegistrationFromJson(json);
}

@freezed
class NotificationPreferences with _$NotificationPreferences {
  const factory NotificationPreferences({
    @Default(true) bool lowStock,
    @Default(true) bool salesOrder,
    @Default(true) bool payment,
    @Default(true) bool poDelivery,
    @Default(true) bool invoiceOverdue,
    @Default(true) bool eInvoice,
    @Default(true) bool systemAnnouncement,
    @Default(true) bool pushEnabled,
  }) = _NotificationPreferences;

  factory NotificationPreferences.fromJson(Map<String, dynamic> json) =>
      _$NotificationPreferencesFromJson(json);
}
```
