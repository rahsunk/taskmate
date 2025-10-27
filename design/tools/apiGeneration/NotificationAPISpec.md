**Purpose:** Provides a system to configure, send, and track email notifications for users about specific items, allowing users to customize daily delivery times.

---

## API Endpoints

### POST /api/Notification/createNotificationConfig

**Description:** Creates a new notification configuration for a user and a target item.

**Requirements:**

- `owner` exists (as a valid ID string; actual existence check is external to this concept).
- All required parameters (`owner`, `email`, `targetItem`, `notificationType`, `dailyTime`, `emailSubjectTemplate`, `emailBodyTemplate`, `isEnabled`) must be provided and valid.
- `emailSubjectTemplate`, `emailBodyTemplate` must be strings, and `isEnabled` must be a boolean.
- `dailyTime` must be in "HH:MM" format.

**Effects:**

- Creates and returns a new `NotificationSetting` document with a fresh `_id` and all provided attributes.

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

---

### POST /api/Notification/editNotificationConfig

**Description:** Modifies an existing notification configuration.

**Requirements:**

- `settingID` exists (i.e., found in `NotificationSettings` collection).
- All required parameters for editing must be provided and valid.
- `emailSubjectTemplate`, `emailBodyTemplate` must be strings, and `isEnabled` must be a boolean.
- `dailyTime` must be in "HH:MM" format.

**Effects:**

- Modifies the specified `NotificationSetting` document with the given attributes.

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

---

### POST /api/Notification/deleteNotificationConfig

**Description:** Deletes a notification configuration and all its associated sent notifications.

**Requirements:**

- `settingID` exists.

**Effects:**

- Deletes the `NotificationSetting` document matching `settingID`.
- Deletes all `SentNotification` documents that reference this `settingID`.

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

---

### POST /api/Notification/sendNotification

**Description:** Sends an email notification based on configured settings and logs the attempt.

**Requirements:**

- `owner` exists (as a valid ID string).
- There exists a `NotificationSetting` entry with the same `owner`, `targetItem`, and `notificationType`, and has `isEnabled` set to true.
- `contextData` is a valid dictionary/object.

**Effects:**

- Finds the specified `NotificationSetting`.
- Uses its `emailSubjectTemplate`, `emailBodyTemplate`, `email`, and `contextData` to send the email to `settings.email`.
- Creates a `SentNotification` entry to record the attempt, `timestamp`, `wasSent` (true if success, false otherwise), and an optional `errorMessage`.
- Returns the `SentNotification` on success, or an `error` if no matching and enabled setting was found or email delivery fails.

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

---

### GET /api/Notification/\_getNotificationSettingsForUser

**Description:** Retrieves all notification settings configured for a specific user.

**Requirements:**

- None explicit; `owner` parameter is optional (returns empty array if not provided).

**Effects:**

- Returns an array of `NotificationSetting` objects belonging to the user.

**Request Parameters:**

- `owner`: `string` (User ID)

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

---

### GET /api/Notification/\_getSentNotificationsForSetting

**Description:** Retrieves all sent notifications associated with a specific notification setting.

**Requirements:**

- None explicit; `settingID` parameter is optional (returns empty array if not provided).

**Effects:**

- Returns an array of `SentNotification` objects associated with the setting.

**Request Parameters:**

- `settingID`: `string` (Notification Setting ID)

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "settingID": "string",
    "timestamp": "string (ISO Date)",
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

---

### GET /api/Notification/\_getEnabledSetting

**Description:** Retrieves an enabled notification setting for a specific user, item, and notification type.

**Requirements:**

- None explicit; `owner`, `targetItem`, and `notificationType` parameters are optional (returns null if not provided).

**Effects:**

- Returns the matching `NotificationSetting` or `null` if not found/enabled.

**Request Parameters:**

- `owner`: `string` (User ID)
- `targetItem`: `string` (Item ID)
- `notificationType`: `string`

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
    } | null
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### GET /api/Notification/notificationSettings

**Description:** Retrieves all notification setting documents.

**Requirements:**

- None.

**Effects:**

- Returns an array of all `NotificationSetting` objects.

**Request Parameters:**

- None.

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

---

### GET /api/Notification/notificationSettings/{settingId}

**Description:** Retrieves a specific notification setting document by its ID.

**Requirements:**

- The `settingId` exists.

**Effects:**

- Returns the `NotificationSetting` object matching the provided ID.

**Request Parameters:**

- `settingId`: `string` (Notification Setting ID, part of URL path)

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

---

### GET /api/Notification/sentNotifications

**Description:** Retrieves all sent notification log documents.

**Requirements:**

- None.

**Effects:**

- Returns an array of all `SentNotification` objects.

**Request Parameters:**

- None.

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "settingID": "string",
    "timestamp": "string (ISO Date)",
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

---

### GET /api/Notification/sentNotifications/{sentNotificationId}

**Description:** Retrieves a specific sent notification log document by its ID.

**Requirements:**

- The `sentNotificationId` exists.

**Effects:**

- Returns the `SentNotification` object matching the provided ID.

**Request Parameters:**

- `sentNotificationId`: `string` (Sent Notification ID, part of URL path)

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "settingID": "string",
    "timestamp": "string (ISO Date)",
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
