---
timestamp: 'Tue Oct 21 2025 12:37:29 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251021_123729.506b79cb.md]]'
content_id: 53c4cf4140d4b297e5139d546cf51798c73c81b382a483f2723291844eba747d
---

# API Specification: Notification Concept

**Purpose:** Provides a system to configure, send, and track email notifications for users about specific items, allowing users to customize daily delivery times.

***

## API Endpoints

### POST /api/Notification/createNotificationConfig

**Description:** Creates and returns a new `NotificationSettings` for `owner` with the given attributes, with `settingID` incrementing by 1.

**Requirements:**

* `owner` exists.

**Effects:**

* Creates and returns a new `NotificationSettings` for `owner` with the given attributes, with `settingID` incrementing by 1.

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
  "setting": {
    "_id": "string",
    "owner": "string",
    "email": "string",
    "targetItem": "string",
    "notificationType": "string",
    "dailyTime": "string",
    "emailSubjectTemplate": "string",
    "emailBodyTemplate": "string",
    "isEnabled": "boolean"
  }
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

**Description:** Modifies `setting` with the given attributes.

**Requirements:**

* `setting` exists.

**Effects:**

* Modifies `setting` with the given attributes.

**Request Body:**

```json
{
  "settingID": "string",
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

**Description:** Deletes `setting` from `NotificationSettings` and all associated `SentNotifications`.

**Requirements:**

* `setting` exists.

**Effects:**

* Deletes `setting` from `NotificationSettings` and all associated `SentNotifications`.

**Request Body:**

```json
{
  "settingID": "string"
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

**Description:** Finds the specified settings of type `NotificationSettings`, and uses its templates and email to send the email to `settings.email`. Creates a `SentNotification` entry to record the attempt, `timestamp`, and `wasSent` (true if success, false otherwise) with `sentNotificationID` incrementing by 1. Returns `sentNotification` on success, or an `error` if no matching and enabled setting was found or email delivery fails.

**Requirements:**

* `owner` exists and there exists a `NotificationSettings` entry with the same `owner`, `targetItem`, and `notificationType`, and has `isEnabled` set to true, and `contextData` is valid.

**Effects:**

* Finds the specified `settings` of type `NotificationSettings`, and uses `settings.emailSubjectTemplate`, `settings.emailBodyTemplate, settings.email`, and `contextData` to send the email to `settings.email`. Creates a `SentNotification` entry to record the attempt, `timestamp`, and `wasSent` (true if success, false otherwise) with `sentNotificationID` incrementing by 1. Returns `sentNotification` on success, or an `error` if no matching and enabled setting was found or email delivery fails.

**Request Body:**

```json
{
  "owner": "string",
  "targetItem": "string",
  "notificationType": "string",
  "contextData": {
    "key": "string",
    "anotherKey": "string"
  }
}
```

**Success Response Body (Action):**

```json
{
  "sentNotification": {
    "_id": "string",
    "settingID": "string",
    "timestamp": "string",
    "wasSent": "boolean",
    "errorMessage"?: "string"
  }
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Notification/\_getNotificationSettingsForUser

**Description:** Retrieves all notification settings configured for a specific user.

**Requirements:**

* N/A

**Effects:**

* Returns an array of `NotificationSetting` objects belonging to the user.

**Request Body:**

```json
{
  "owner": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "owner": "string",
    "email": "string",
    "targetItem": "string",
    "notificationType": "string",
    "dailyTime": "string",
    "emailSubjectTemplate": "string",
    "emailBodyTemplate": "string",
    "isEnabled": "boolean"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Notification/\_getSentNotificationsForSetting

**Description:** Retrieves all sent notifications associated with a specific notification setting.

**Requirements:**

* N/A

**Effects:**

* Returns an array of `SentNotification` objects associated with the setting.

**Request Body:**

```json
{
  "settingID": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "settingID": "string",
    "timestamp": "string",
    "wasSent": "boolean",
    "errorMessage"?: "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Notification/\_getEnabledSetting

**Description:** Retrieves an enabled notification setting for a specific user, item, and notification type.

**Requirements:**

* N/A

**Effects:**

* Returns the matching `NotificationSetting` or `null` if not found/enabled.

**Request Body:**

```json
{
  "owner": "string",
  "targetItem": "string",
  "notificationType": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "setting": {
      "_id": "string",
      "owner": "string",
      "email": "string",
      "targetItem": "string",
      "notificationType": "string",
      "dailyTime": "string",
      "emailSubjectTemplate": "string",
      "emailBodyTemplate": "string",
      "isEnabled": "boolean"
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
