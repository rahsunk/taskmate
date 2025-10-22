---
timestamp: 'Tue Oct 21 2025 12:29:31 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251021_122931.fcb5e987.md]]'
content_id: d5b19b0f8d32613352541dd9e965f531e95d9b6eab79a158ad15ccd8143176cc
---

# API Specification: Notification Concept

**Purpose:** Provides a system to configure, send, and track email notifications for users about specific items, allowing users to customize daily delivery times

***

## API Endpoints

### POST /api/Notification/createNotificationConfig

**Description:** Creates a new notification configuration for a user and a target item.

**Requirements:**

* `owner` exists (as a valid ID string; actual existence check is external to this concept).
* All required parameters (`owner`, `email`, `targetItem`, `notificationType`, `dailyTime`, `emailSubjectTemplate`, `emailBodyTemplate`, `isEnabled`) must be present and valid.
* `emailSubjectTemplate`, `emailBodyTemplate` must be strings, and `isEnabled` must be a boolean.
* `dailyTime` must be in "HH:MM" format.

**Effects:**

* Creates and returns a new `NotificationSetting` document with a fresh unique ID (`_id`).
* Initializes the `NotificationSetting` with all provided attributes.

**Request Body:**

```json
{
  "owner": "string",
  "email": "string",
  "targetItem": "string",
  "notificationType": "string",
  "dailyTime": "string (HH:MM)",
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
    "dailyTime": "string (HH:MM)",
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

**Description:** Modifies an existing notification configuration.

**Requirements:**

* `settingID` exists (i.e., found in `NotificationSettings` collection).
* All required parameters for editing must be present and valid.
* `emailSubjectTemplate`, `emailBodyTemplate` must be strings, and `isEnabled` must be a boolean.
* `dailyTime` must be in "HH:MM" format.

**Effects:**

* Modifies the specified `NotificationSetting` document with the given attributes.

**Request Body:**

```json
{
  "settingID": "string",
  "email": "string",
  "targetItem": "string",
  "notificationType": "string",
  "dailyTime": "string (HH:MM)",
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

**Description:** Deletes a notification configuration and all its associated sent notifications.

**Requirements:**

* `settingID` exists.

**Effects:**

* Deletes the `NotificationSetting` document matching `settingID`.
* Deletes all `SentNotification` documents that reference this `settingID`.

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

**Description:** Sends an email notification based on configured settings and logs the attempt.

**Requirements:**

* `owner` exists (as a valid ID string).
* There exists a `NotificationSetting` entry with the same `owner`, `targetItem`, and `notificationType`.
* The found `NotificationSetting` must have `isEnabled` set to `true`.
* `contextData` must be a valid dictionary/object.

**Effects:**

* Finds the specified `NotificationSetting`.
* Uses its `emailSubjectTemplate`, `emailBodyTemplate`, and `email` with `contextData` to construct and "send" the email (simulated here).
* Creates a `SentNotification` entry to record the attempt, `timestamp`, `wasSent` (true for success, false for failure), and an optional `errorMessage`.
* Returns the `SentNotification` on success, or an `error` string if no matching/enabled setting was found or email delivery fails.

**Request Body:**

```json
{
  "owner": "string",
  "targetItem": "string",
  "notificationType": "string",
  "contextData": {
    "key1": "string",
    "key2": "string"
  }
}
```

**Success Response Body (Action):**

```json
{
  "sentNotification": {
    "_id": "string",
    "settingID": "string",
    "timestamp": "string (ISO 8601 Date)",
    "wasSent": "boolean",
    "errorMessage": "string (optional)"
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

* None explicitly stated, but an owner ID should be provided.

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
    "settings": [
      {
        "_id": "string",
        "owner": "string",
        "email": "string",
        "targetItem": "string",
        "notificationType": "string",
        "dailyTime": "string (HH:MM)",
        "emailSubjectTemplate": "string",
        "emailBodyTemplate": "string",
        "isEnabled": "boolean"
      }
    ]
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

* None explicitly stated, but a setting ID should be provided.

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
    "sentNotifications": [
      {
        "_id": "string",
        "settingID": "string",
        "timestamp": "string (ISO 8601 Date)",
        "wasSent": "boolean",
        "errorMessage": "string (optional)"
      }
    ]
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

* None explicitly stated, but `owner`, `targetItem`, and `notificationType` should be provided.

**Effects:**

* Returns the matching `NotificationSetting` object if found and enabled, or `null` otherwise.

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
      "dailyTime": "string (HH:MM)",
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
