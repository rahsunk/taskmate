[@api-extraction-from-code](api-extraction-from-code.md)

[@ScheduleGenerator](../../concepts/ScheduleGenerator/ScheduleGenerator.md)

[@implementation](../../concepts/ScheduleGenerator/implementation.md)

[@UserAuthentication](../../concepts/UserAuthentication/UserAuthentication.md)

[@implementation](../../concepts/UserAuthentication/implementation.md)

[@Notification](../../concepts/Notification/Notification.md)

[@implementation](../../concepts/Notification/implementation.md)

[@ItemSharing](../../concepts/ItemSharing/ItemSharing.md)

[@implementation](../../concepts/ItemSharing/implementation.md)

# prompt: Now, analyze the given concept specifications  and implementations (ScheduleGenerator, UserAuthentication, Notification, ItemSharing) and generate the API documentation based on these instructions. Give given POST requests and also include GET requests to get every attribute of the state.
# response:

Below is the API documentation for the `ScheduleGenerator`, `UserAuthentication`, `Notification`, and `ItemSharing` concepts, generated according to the specified structure and rules.

---

# API Specification: ScheduleGenerator Concept

**Purpose:** manages events and tasks for users to automatically generate a schedule that meets their needs.

---

## API Endpoints

### POST /api/ScheduleGenerator/initializeSchedule

**Description:** Creates an empty schedule document, associating it with the owner, and assigns an incrementing scheduleID.

**Requirements:**
- `owner` exists (this concept treats `User` as a generic ID and cannot verify its existence; a higher-level synchronization is expected to provide a valid `User` ID).

**Effects:**
- Creates an empty `schedule` with `owner` as `schedule.owner`.
- The `scheduleID` for the new schedule increments by 1.
- Returns the ID of the newly created schedule document.

**Request Body:**
```json
{
  "owner": "string"
}
```

**Success Response Body (Action):**
```json
{
  "schedule": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/ScheduleGenerator/addEvent

**Description:** Creates and returns a new event document linked to the specified schedule, with the given attributes.

**Requirements:**
- The `schedule` identified by `schedule` ID must exist.
- Event start time must be before end time.
- Weekly repeat events must specify at least one day of the week if `repeat.frequency` is `WEEKLY`.

**Effects:**
- Creates and returns an event with `name` to add to the set of events in `schedule` with the given attributes.
- `eventID` increments by 1.
- `event.scheduleID` points to `schedule.scheduleID`.

**Request Body:**
```json
{
  "schedule": "string",
  "name": "string",
  "startTime": "string (ISO Date, e.g., '2023-10-27T10:00:00.000Z')",
  "endTime": "string (ISO Date, e.g., '2023-10-27T11:00:00.000Z')",
  "repeat": {
    "frequency": "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY",
    "daysOfWeek"?: [0, 1, 2, 3, 4, 5, 6]
  }
}
```

**Success Response Body (Action):**
```json
{
  "event": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/ScheduleGenerator/editEvent

**Description:** Modifies the attributes of a specified event document.

**Requirements:**
- The `oldEvent` identified by `oldEvent` ID must exist and be associated with the `schedule` identified by `schedule` ID.
- Event start time must be before end time.
- Weekly repeat events must specify at least one day of the week if `repeat.frequency` is `WEEKLY`.

**Effects:**
- Modifies `oldEvent` in the set of `Events` in `schedule` with the given attributes.

**Request Body:**
```json
{
  "schedule": "string",
  "oldEvent": "string",
  "name": "string",
  "startTime": "string (ISO Date, e.g., '2023-10-27T10:00:00.000Z')",
  "endTime": "string (ISO Date, e.g., '2023-10-27T11:00:00.000Z')",
  "repeat": {
    "frequency": "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY",
    "daysOfWeek"?: [0, 1, 2, 3, 4, 5, 6]
  }
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

### POST /api/ScheduleGenerator/deleteEvent

**Description:** Deletes the specified event document.

**Requirements:**
- The `event` identified by `event` ID must exist and be associated with the `schedule` identified by `schedule` ID.

**Effects:**
- Deletes the `event` in the set of `Events` in `schedule`.

**Request Body:**
```json
{
  "schedule": "string",
  "event": "string"
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

### POST /api/ScheduleGenerator/addTask

**Description:** Creates and returns a new task document, linked to the specified schedule, with the given attributes.

**Requirements:**
- The `schedule` identified by `schedule` ID must exist.
- `expectedCompletionTime` must be positive.
- `priority` must be between 0 and 100 (inclusive).
- `completionLevel` must be between 0 and 100 (inclusive).

**Effects:**
- Returns and adds `task` with `name` to the set of `tasks` in `schedule` with the given attributes.
- `completionLevel` is set to the provided value.
- `taskID` increments by 1.
- `task.scheduleID` points to `schedule.scheduleID`.

**Request Body:**
```json
{
  "schedule": "string",
  "name": "string",
  "deadline": "string (ISO Date, e.g., '2023-10-27T17:00:00.000Z')",
  "expectedCompletionTime": "number",
  "completionLevel": "number",
  "priority": "number"
}
```

**Success Response Body (Action):**
```json
{
  "task": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/ScheduleGenerator/editTask

**Description:** Modifies the attributes of the specified task document.

**Requirements:**
- The `oldTask` identified by `oldTask` ID must exist and be associated with the `schedule` identified by `schedule` ID.
- `expectedCompletionTime` must be positive.
- `priority` must be between 0 and 100 (inclusive).
- `completionLevel` must be between 0 and 100 (inclusive).

**Effects:**
- Modifies `oldTask` in the set of `Tasks` in `schedule` with the given attributes.

**Request Body:**
```json
{
  "schedule": "string",
  "oldTask": "string",
  "name": "string",
  "deadline": "string (ISO Date, e.g., '2023-10-27T17:00:00.000Z')",
  "expectedCompletionTime": "number",
  "completionLevel": "number",
  "priority": "number"
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

### POST /api/ScheduleGenerator/deleteTask

**Description:** Deletes the specified task document.

**Requirements:**
- The `task` identified by `task` ID must exist and be associated with the `schedule` identified by `schedule` ID.

**Effects:**
- Deletes `task` in the set of `Tasks` in `schedule`.

**Request Body:**
```json
{
  "schedule": "string",
  "task": "string"
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

### POST /api/ScheduleGenerator/generateSchedule

**Description:** Retrieves all events and tasks associated with the given schedule, instantiates repeating events for a planning horizon, and prioritizes and schedules tasks into available time slots.

**Requirements:**
- The `schedule` identified by `schedule` ID must exist.

**Effects:**
- Creates a `generatedPlan` for `schedule.owner` such that if possible, all given events start, end, and repeat as specified, and task scheduling is optimized by its attributes.
- The generated plan details concrete time slots for events and tasks.
- If doing this is not possible (e.g., due to conflicts), then return an `error`.

**Request Body:**
```json
{
  "schedule": "string"
}
```

**Success Response Body (Action):**
```json
{
  "scheduleId": "string",
  "generatedPlan": [
    {
      "type": "event" | "task",
      "originalId": "string",
      "name": "string",
      "scheduledStartTime": "string (ISO Date)",
      "scheduledEndTime": "string (ISO Date)"
    }
  ]
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### GET /api/ScheduleGenerator/_getScheduleByOwner

**Description:** Retrieves the ID of the schedule document associated with a given user owner.

**Requirements:**
- None explicitly stated, but the `owner` should correspond to an existing schedule.

**Effects:**
- Returns the schedule ID if found.

**Request Parameters:**
- `owner`: `string` (User ID)

**Success Response Body (Query):**
```json
[
  {
    "schedule": "string"
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

### GET /api/ScheduleGenerator/_getEventsForSchedule

**Description:** Retrieves an array of Event IDs that are linked to the specified schedule.

**Requirements:**
- The `schedule` identified by `schedule` ID must exist.

**Effects:**
- Returns an array of event IDs.

**Request Parameters:**
- `schedule`: `string` (Schedule ID)

**Success Response Body (Query):**
```json
[
  {
    "events": ["string", "string"]
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

### GET /api/ScheduleGenerator/_getTasksForSchedule

**Description:** Retrieves an array of Task IDs that are linked to the specified schedule.

**Requirements:**
- The `schedule` identified by `schedule` ID must exist.

**Effects:**
- Returns an array of task IDs.

**Request Parameters:**
- `schedule`: `string` (Schedule ID)

**Success Response Body (Query):**
```json
[
  {
    "tasks": ["string", "string"]
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

### GET /api/ScheduleGenerator/_getEventDetails

**Description:** Retrieves the full document details for a specific event.

**Requirements:**
- `event` exists.

**Effects:**
- Returns the event document.

**Request Parameters:**
- `event`: `string` (Event ID)

**Success Response Body (Query):**
```json
[
  {
    "eventDetails": {
      "_id": "string",
      "name": "string",
      "eventID": "number",
      "scheduleID": "number",
      "startTime": "string (ISO Date)",
      "endTime": "string (ISO Date)",
      "repeat": {
        "frequency": "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY",
        "daysOfWeek"?: [0, 1, 2, 3, 4, 5, 6]
      }
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

---

### GET /api/ScheduleGenerator/_getTaskDetails

**Description:** Retrieves the full document details for a specific task.

**Requirements:**
- `task` exists.

**Effects:**
- Returns the task document.

**Request Parameters:**
- `task`: `string` (Task ID)

**Success Response Body (Query):**
```json
[
  {
    "taskDetails": {
      "_id": "string",
      "name": "string",
      "taskID": "number",
      "scheduleID": "number",
      "deadline": "string (ISO Date)",
      "expectedCompletionTime": "number",
      "completionLevel": "number",
      "priority": "number"
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

---

### GET /api/ScheduleGenerator/schedules

**Description:** Retrieves all schedule documents.

**Requirements:**
- None.

**Effects:**
- Returns an array of all `ScheduleDoc` objects.

**Request Parameters:**
- None.

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "owner": "string",
    "scheduleID": "number"
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

### GET /api/ScheduleGenerator/schedules/{scheduleId}

**Description:** Retrieves a specific schedule document by its ID.

**Requirements:**
- The `scheduleId` exists.

**Effects:**
- Returns the `ScheduleDoc` object matching the provided ID.

**Request Parameters:**
- `scheduleId`: `string` (Schedule ID, part of URL path)

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "owner": "string",
    "scheduleID": "number"
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

### GET /api/ScheduleGenerator/events

**Description:** Retrieves all event documents.

**Requirements:**
- None.

**Effects:**
- Returns an array of all `EventDoc` objects.

**Request Parameters:**
- None.

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "name": "string",
    "eventID": "number",
    "scheduleID": "number",
    "startTime": "string (ISO Date)",
    "endTime": "string (ISO Date)",
    "repeat": {
      "frequency": "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY",
      "daysOfWeek"?: [0, 1, 2, 3, 4, 5, 6]
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

---

### GET /api/ScheduleGenerator/events/{eventId}

**Description:** Retrieves a specific event document by its ID.

**Requirements:**
- The `eventId` exists.

**Effects:**
- Returns the `EventDoc` object matching the provided ID.

**Request Parameters:**
- `eventId`: `string` (Event ID, part of URL path)

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "name": "string",
    "eventID": "number",
    "scheduleID": "number",
    "startTime": "string (ISO Date)",
    "endTime": "string (ISO Date)",
    "repeat": {
      "frequency": "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY",
      "daysOfWeek"?: [0, 1, 2, 3, 4, 5, 6]
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

---

### GET /api/ScheduleGenerator/tasks

**Description:** Retrieves all task documents.

**Requirements:**
- None.

**Effects:**
- Returns an array of all `TaskDoc` objects.

**Request Parameters:**
- None.

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "name": "string",
    "taskID": "number",
    "scheduleID": "number",
    "deadline": "string (ISO Date)",
    "expectedCompletionTime": "number",
    "completionLevel": "number",
    "priority": "number"
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

### GET /api/ScheduleGenerator/tasks/{taskId}

**Description:** Retrieves a specific task document by its ID.

**Requirements:**
- The `taskId` exists.

**Effects:**
- Returns the `TaskDoc` object matching the provided ID.

**Request Parameters:**
- `taskId`: `string` (Task ID, part of URL path)

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "name": "string",
    "taskID": "number",
    "scheduleID": "number",
    "deadline": "string (ISO Date)",
    "expectedCompletionTime": "number",
    "completionLevel": "number",
    "priority": "number"
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

# API Specification: UserAuthentication Concept

**Purpose:** limit access to known users and find users by name.

---

## API Endpoints

### POST /api/UserAuthentication/register

**Description:** Registers a new user with a unique username and password.

**Requirements:**
- No `User` with `username` already exists.

**Effects:**
- Creates and returns a new `User` with the given `username` and `password`.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**
```json
{
  "user": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/UserAuthentication/authenticate

**Description:** Authenticates a user by checking if the provided username and password match an existing user.

**Requirements:**
- A `User` with the same `username` and `password` exists.

**Effects:**
- Grants access to the `User` associated with that `username` and `password`.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**
```json
{
  "user": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/UserAuthentication/changePassword

**Description:** Allows an authenticated user to change their password.

**Requirements:**
- `user` exists.
- `user.password` is equal to `oldPassword`.
- `newPassword` must be different from `oldPassword`.

**Effects:**
- `password` for `user` is changed to `newPassword`.

**Request Body:**
```json
{
  "user": "string",
  "oldPassword": "string",
  "newPassword": "string"
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

### POST /api/UserAuthentication/deleteAccount

**Description:** Deletes a user account from the system.

**Requirements:**
- `user` exists.

**Effects:**
- `user` is removed from the state.

**Request Body:**
```json
{
  "user": "string"
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

### GET /api/UserAuthentication/_getUserByUsername

**Description:** Returns the user ID associated with a username if found.

**Requirements:**
- None explicitly stated.

**Effects:**
- Returns the user ID if found, otherwise an empty object.

**Request Parameters:**
- `username`: `string`

**Success Response Body (Query):**
```json
[
  {
    "user": "string"
  }
]
```
*(Note: If no user is found, an empty array `[]` would be returned as per the general query rule, or an empty object `{}` as per the implementation's success case, which is then wrapped in an array for consistency with the prompt's query response body template.)*

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### GET /api/UserAuthentication/_checkUserExists

**Description:** Returns true if the user with the given ID exists, false otherwise.

**Requirements:**
- None.

**Effects:**
- Returns a boolean indicating if the user exists.

**Request Parameters:**
- `user`: `string` (User ID)

**Success Response Body (Query):**
```json
[
  {
    "exists": "boolean"
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

### GET /api/UserAuthentication/users

**Description:** Retrieves all user documents.

**Requirements:**
- None.

**Effects:**
- Returns an array of all `UsersDocument` objects.

**Request Parameters:**
- None.

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "username": "string",
    "password": "string"
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

### GET /api/UserAuthentication/users/{userId}

**Description:** Retrieves a specific user document by its ID.

**Requirements:**
- The `userId` exists.

**Effects:**
- Returns the `UsersDocument` object matching the provided ID.

**Request Parameters:**
- `userId`: `string` (User ID, part of URL path)

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "username": "string",
    "password": "string"
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

# API Specification: Notification Concept

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

### GET /api/Notification/_getNotificationSettingsForUser

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

### GET /api/Notification/_getSentNotificationsForSetting

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

### GET /api/Notification/_getEnabledSetting

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

---

# API Specification: ItemSharing Concept

**Purpose:** Allows collaborative modification of an item's mutable properties by managing invited participants, their acceptance to collaborate, and the lifecycle of proposed and confirmed changes to those properties.

---

## API Endpoints

### POST /api/ItemSharing/makeItemShareable

**Description:** Makes an external item shareable, creating a new shared item record.

**Requirements:**
- `externalItemID` exists from an external concept.
- `owner` exists (external to this concept).
- `externalItemID` is not already registered for sharing.

**Effects:**
- Creates and returns a new `sharedItem` document.
- `sharedItemID` increments by 1.
- `sharedItem` is initialized with the given `externalItemID` and `owner`.
- `participants`, `acceptedParticipants`, and `changeRequests` are initialized as empty sets.

**Request Body:**
```json
{
  "owner": "string",
  "externalItemID": "string"
}
```

**Success Response Body (Action):**
```json
{
  "sharedItem": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/ItemSharing/shareItemWith

**Description:** Invites a target user to participate in changes to a shared item.

**Requirements:**
- `sharedItem` exists.
- `targetUser` exists (external to this concept).
- `targetUser` is not already in `sharedItem.participants`.

**Effects:**
- Adds `targetUser` to `sharedItem.participants`.

**Request Body:**
```json
{
  "sharedItem": "string",
  "targetUser": "string"
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

### POST /api/ItemSharing/unshareItemWith

**Description:** Removes a user's participation from a shared item.

**Requirements:**
- `sharedItem` exists.
- `targetUser` is in `sharedItem.participants`.

**Effects:**
- Removes `targetUser` from `sharedItem.participants`.
- Removes `targetUser` from `sharedItem.acceptedParticipants` if they are in that set.
- Deletes any `ChangeRequests` made by `targetUser` for `sharedItem` and removes their IDs from `sharedItem.changeRequests`.

**Request Body:**
```json
{
  "sharedItem": "string",
  "targetUser": "string"
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

### POST /api/ItemSharing/acceptToCollaborate

**Description:** Allows an invited user to accept collaboration on a shared item.

**Requirements:**
- `sharedItem` exists.
- `user` is in `sharedItem.participants`.
- `user` is not already in `sharedItem.acceptedParticipants`.

**Effects:**
- Adds `user` to `sharedItem.acceptedParticipants`.

**Request Body:**
```json
{
  "sharedItem": "string",
  "user": "string"
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

### POST /api/ItemSharing/rejectCollaboration

**Description:** Allows a participant to reject collaboration on a shared item, also removing them from participation.

**Requirements:**
- `sharedItem` exists.
- `user` is in `sharedItem.participants`.

**Effects:**
- Removes `user` from `sharedItem.participants`.
- Removes `user` from `sharedItem.acceptedParticipants` if present.
- Deletes any `ChangeRequests` made by `user` for this `sharedItem` and removes their IDs from `sharedItem.changeRequests`.

**Request Body:**
```json
{
  "sharedItem": "string",
  "user": "string"
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

### POST /api/ItemSharing/requestChange

**Description:** A participant proposes changes to an item's properties by creating a change request.

**Requirements:**
- `sharedItem` exists.
- `requester` exists (external to this concept).
- `requester` is in `sharedItem.acceptedParticipants`.

**Effects:**
- Creates and returns a new `changeRequest` for `sharedItem` with the `requester` and the proposed `requestedProperties`.
- `requestID` increments by 1.
- Adds `changeRequest` to `sharedItem.changeRequests`.

**Request Body:**
```json
{
  "sharedItem": "string",
  "requester": "string",
  "requestedProperties": {
    "property1": "any",
    "property2": "any"
  }
}
```

**Success Response Body (Action):**
```json
{
  "changeRequest": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/ItemSharing/confirmChange

**Description:** The owner confirms a proposed change request.

**Requirements:**
- `sharedItem` exists.
- `owner` is `sharedItem.owner`.
- `request` exists and is in `sharedItem.changeRequests`.

**Effects:**
- Deletes `request` from `sharedItem.changeRequests` and removes the `ChangeRequest` document itself.
- (Note: The actual application of properties to the external item is done by a concept sync, external to this API).

**Request Body:**
```json
{
  "owner": "string",
  "sharedItem": "string",
  "request": "string"
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

### POST /api/ItemSharing/rejectChange

**Description:** The owner rejects a proposed change request.

**Requirements:**
- `sharedItem` exists.
- `owner` is `sharedItem.owner`.
- `request` exists and is in `sharedItem.changeRequests`.

**Effects:**
- Deletes `request` from `sharedItem.changeRequests` and removes the `ChangeRequest` document itself.

**Request Body:**
```json
{
  "owner": "string",
  "sharedItem": "string",
  "request": "string"
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

### GET /api/ItemSharing/sharedItems

**Description:** Retrieves all shared item documents.

**Requirements:**
- None.

**Effects:**
- Returns an array of all `SharedItemDoc` objects.

**Request Parameters:**
- None.

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "sharedItemID": "number",
    "externalItemID": "string",
    "owner": "string",
    "participants": ["string"],
    "acceptedParticipants": ["string"],
    "changeRequests": ["string"]
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

### GET /api/ItemSharing/sharedItems/{sharedItemId}

**Description:** Retrieves a specific shared item document by its ID.

**Requirements:**
- The `sharedItemId` exists.

**Effects:**
- Returns the `SharedItemDoc` object matching the provided ID.

**Request Parameters:**
- `sharedItemId`: `string` (Shared Item ID, part of URL path)

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "sharedItemID": "number",
    "externalItemID": "string",
    "owner": "string",
    "participants": ["string"],
    "acceptedParticipants": ["string"],
    "changeRequests": ["string"]
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

### GET /api/ItemSharing/changeRequests

**Description:** Retrieves all change request documents.

**Requirements:**
- None.

**Effects:**
- Returns an array of all `ChangeRequestDoc` objects.

**Request Parameters:**
- None.

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "requestID": "number",
    "sharedItemPointer": "string",
    "requester": "string",
    "requestedProperties": {
      "property1": "any",
      "property2": "any"
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

---

### GET /api/ItemSharing/changeRequests/{changeRequestId}

**Description:** Retrieves a specific change request document by its ID.

**Requirements:**
- The `changeRequestId` exists.

**Effects:**
- Returns the `ChangeRequestDoc` object matching the provided ID.

**Request Parameters:**
- `changeRequestId`: `string` (Change Request ID, part of URL path)

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "requestID": "number",
    "sharedItemPointer": "string",
    "requester": "string",
    "requestedProperties": {
      "property1": "any",
      "property2": "any"
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