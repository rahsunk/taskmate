---
timestamp: 'Thu Oct 30 2025 11:02:07 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251030_110207.27b49008.md]]'
content_id: 3706fabd5d0f6fb970f95da5a4828a44420c8a773abf39ba8db181d1c39dd240
---

# API Specification: Notification Concept

**Purpose:** Provides a system to configure, send, and track email notifications for users about specific items, allowing users to customize daily delivery times.

***

## API Endpoints

### POST /api/Notification/createNotificationConfig

**Description:** Creates a new notification configuration for a user and a target item.

**Requirements:**

* `owner` exists (as a valid ID string; actual existence check is external to this concept).
* All required parameters (`owner`, `email`, `targetItem`, `notificationType`, `dailyTime`, `emailSubjectTemplate`, `emailBodyTemplate`, `isEnabled`) must be provided and valid.
* `emailSubjectTemplate`, `emailBodyTemplate` must be strings, and `isEnabled` must be a boolean.
* `dailyTime` must be in "HH:MM" format.

**Effects:**

* Creates and returns a new `NotificationSetting` document with a fresh `_id` and all provided attributes.

**Request Body:**

```json
{
  "owner": "string",
  "email": "string",
  "targetItem": "string",
  "notificationType": "string",
  "dailyTime": "string (HH:MM, e.g., '14:30')",
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

**Description:** Modifies an existing notification configuration.

**Requirements:**

* `settingID` exists (i.e., found in `NotificationSettings` collection).
* All required parameters for editing must be provided and valid.
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
  "dailyTime": "string (HH:MM, e.g., '14:30')",
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
* There exists a `NotificationSettings` entry with the same `owner`, `targetItem`, and `notificationType`, and has `isEnabled` set to true.
* `contextData` is a valid dictionary/object.

**Effects:**

* Finds the specified `NotificationSettings`.
* Uses its `emailSubjectTemplate`, `emailBodyTemplate`, `email`, and `contextData` to send the email to `settings.email`.
* Creates a `SentNotification` entry to record the attempt, `timestamp`, `wasSent` (true if success, false otherwise), and an optional `errorMessage`.
* Returns the `SentNotification` on success, or an `error` if no matching and enabled setting was found or email delivery fails.

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
    "timestamp": "string (ISO Date)",
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

**Description:** Retrieves an array of notification settings configured for a specific user.

**Requirements:**

* `true`

**Effects:**

* Retrieves an array of `NotificationSetting` objects belonging to the user.

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
        "dailyTime": "string",
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

### POST /api/Notification/\_getNotificationSettingDetails

**Description:** Retrieves an array containing the specific notification setting object.

**Requirements:**

* `settingID` exists.

**Effects:**

* Retrieves an array containing the specific `NotificationSetting` object.

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
    "setting": [
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

### POST /api/Notification/\_getAllNotificationSettings

**Description:** Retrieves an array of all notification setting documents.

**Requirements:**

* `true`

**Effects:**

* Retrieves an array of all `NotificationSetting` objects.

**Request Body:**

```json
{}
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
        "dailyTime": "string",
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

**Description:** Retrieves an array of sent notification log documents associated with a specific setting.

**Requirements:**

* `true`

**Effects:**

* Retrieves an array of `SentNotification` objects associated with the setting.

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
        "timestamp": "string (ISO Date)",
        "wasSent": "boolean",
        "errorMessage"?: "string"
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

### POST /api/Notification/\_getSentNotificationDetails

**Description:** Retrieves an array containing the specific sent notification log object.

**Requirements:**

* `sentNotificationID` exists.

**Effects:**

* Retrieves an array containing the specific `SentNotification` object.

**Request Body:**

```json
{
  "sentNotificationID": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "sentNotification": [
      {
        "_id": "string",
        "settingID": "string",
        "timestamp": "string (ISO Date)",
        "wasSent": "boolean",
        "errorMessage"?: "string"
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

### POST /api/Notification/\_getAllSentNotifications

**Description:** Retrieves an array of all sent notification log documents.

**Requirements:**

* `true`

**Effects:**

* Retrieves an array of all `SentNotification` objects.

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "sentNotifications": [
      {
        "_id": "string",
        "settingID": "string",
        "timestamp": "string (ISO Date)",
        "wasSent": "boolean",
        "errorMessage"?: "string"
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

**Description:** Returns an array containing the matching notification setting if found and enabled, otherwise an empty array.

**Requirements:**

* `true`

**Effects:**

* Returns an array containing the matching `NotificationSetting` if found and enabled, otherwise an empty array.

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
    "setting": [
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
