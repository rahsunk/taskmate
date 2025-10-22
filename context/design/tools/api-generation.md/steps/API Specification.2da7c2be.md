---
timestamp: 'Mon Oct 20 2025 17:16:49 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_171649.6eb73be8.md]]'
content_id: 2da7c2beed10e7eff6ad3671878b33862cc9428418a4e726fb118f3f18ca938c
---

# API Specification: Notification Concept

**Purpose:** Provides a system to configure, send, and track email notifications for users about specific items, allowing users to customize daily delivery times

***

## API Endpoints

### POST /api/Notification/createNotificationConfig

**Description:** Creates a new notification configuration for a user and a target item.

**Requirements:**

* `owner` exists

**Effects:**

* Creates and returns a new `NotificationSettings` for `owner` with the given attributes, with `settingID` incrementing by 1

**Request Body:**

```json
{
  "owner": "string",
  "email": "string",
  "targetItem": "string",
  "notificationType": "string",
  "dailyTime": "string",
  "emailSubjectTemplate": "string",
  "emailBodyTemplate": "string",
  "isEnabled": "boolean"
}
```

**Success Response Body (Action):**

```json
{
  "setting": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Notification/editNotificationConfig

**Description:** Modifies an existing notification configuration.

**Requirements:**

* `setting` exists

**Effects:**

* Modifies `setting` with the given attributes

**Request Body:**

```json
{
  "setting": "string",
  "email": "string",
  "targetItem": "string",
  "notificationType": "string",
  "dailyTime": "string",
  "emailSubjectTemplate": "string",
  "emailBodyTemplate": "string",
  "isEnabled": "boolean"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Notification/deleteNotificationConfig

**Description:** Deletes a notification configuration and all associated sent notifications.

**Requirements:**

* `setting` exists

**Effects:**

* Deletes `setting` from `NotificationSettings` and all associated `SentNotifications`

**Request Body:**

```json
{
  "setting": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Notification/sendNotification

**Description:** Sends an email notification to the user based on a matching configuration and logs the attempt.

**Requirements:**

* `owner` exists and there exists a `NotificationSettings` entry with the same `owner`, `targetItem`, and `notificationType`, and has `isEnabled` set to true, and `contextData` is valid

**Effects:**

* Finds the specified `settings` of type `NotificationSettings`, and uses `settings.emailSubjectTemplate`, `settings.emailBodyTemplate, settings.email`, and `contextData` to send the email to `settings.email`. Creates a `SentNotification` entry to record the attempt, `timestamp`, and `wasSent` (true if success, false otherwise) with `sentNotificationID` incrementing by 1. Returns `sentNotification` on success, or an `error` if no matching and enabled setting was found or email delivery fails.

**Request Body:**

```json
{
  "owner": "string",
  "targetItem": "string",
  "notificationType": "string",
  "contextData": "object"
}
```

**Success Response Body (Action):**

```json
{
  "sentNotification": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
