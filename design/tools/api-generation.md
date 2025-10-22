[@api-extraction-from-code](api-extraction-from-code.md)

[@ScheduleGenerator](../concepts/ScheduleGenerator/ScheduleGenerator.md)

[@implementation](../concepts/ScheduleGenerator/implementation.md)

[@UserAuthentication](../concepts/UserAuthentication/UserAuthentication.md)

[@implementation](../concepts/UserAuthentication/implementation.md)

[@Notification](../concepts/Notification/Notification.md)

[@implementation](../concepts/Notification/implementation.md)

[@ItemSharing](../concepts/ItemSharing/ItemSharing.md)

[@implementation](../concepts/ItemSharing/implementation.md)

# prompt: Now, analyze the given concept specifications  and implementations (ScheduleGenerator, UserAuthentication, Notification, ItemSharing) and generate the API documentation based on these instructions.
# response:

Here is the API documentation for the `ScheduleGenerator`, `UserAuthentication`, `Notification`, and `ItemSharing` concepts, generated according to your instructions.

---

# API Specification: ScheduleGenerator Concept

**Purpose:** manages events and tasks for users to automatically generate a schedule that meets their needs.

---

## API Endpoints

### POST /api/ScheduleGenerator/initializeSchedule

**Description:** Creates an empty schedule document, associating it with the owner, and assigning an incrementing scheduleID.

**Requirements:**
- `owner` exists (this concept treats `User` as a generic ID and cannot verify its existence; a higher-level synchronization is expected to provide a valid `User` ID).

**Effects:**
- Creates an empty `schedule` with `owner` as `schedule.owner`, with static attribute `scheduleID` incrementing by 1.

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

**Description:** Creates and returns a new event document, linked to the specified schedule, with the given attributes.

**Requirements:**
- The `schedule` identified by `schedule` ID must exist.

**Effects:**
- Creates and returns an event with `name` to add to the set of events in `schedule` with the given attributes, and `eventID` incrementing by 1, and `event.scheduleID` being `schedule.scheduleID`.

**Request Body:**
```json
{
  "schedule": "string",
  "name": "string",
  "startTime": "string",
  "endTime": "string",
  "repeat": {
    "frequency": "string",
    "daysOfWeek"?: "number[]"
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

**Description:** Modifies the attributes of the specified event document.

**Requirements:**
- The `oldEvent` identified by `oldEvent` ID must exist and be associated with the `schedule` identified by `schedule` ID.

**Effects:**
- Modifies `oldEvent` in the set of `Events` in `schedule` with the given attributes.

**Request Body:**
```json
{
  "schedule": "string",
  "oldEvent": "string",
  "name": "string",
  "startTime": "string",
  "endTime": "string",
  "repeat": {
    "frequency": "string",
    "daysOfWeek"?: "number[]"
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
- `completionLevel` is between 0 and 100 (inclusive).

**Effects:**
- Returns and adds `task` with `name` to the set of `tasks` in `schedule` with the given attributes, with the given `completionLevel`, and `taskID` incrementing by 1, and `task.scheduleID` being `schedule.scheduleID`.

**Request Body:**
```json
{
  "schedule": "string",
  "name": "string",
  "deadline": "string",
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

**Effects:**
- Modifies `oldTask` in the set of `Tasks` in `schedule` with the given attributes.

**Request Body:**
```json
{
  "schedule": "string",
  "oldTask": "string",
  "name": "string",
  "deadline": "string",
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

**Description:** Retrieves all events and tasks associated with the given schedule, instantiates repeating events for a planning horizon, and prioritizes and schedules tasks into available time slots. Returns a `GeneratedSchedulePlan` containing concrete scheduled items. If the generation process encounters an unresolvable conflict, an error is returned.

**Requirements:**
- `schedule` exists.

**Effects:**
- Creates `generatedPlan` for `schedule.owner` such that if possible, all given events start, end, and repeat as specified, and task scheduling is optimized by its attributes. Generally, tasks with a sooner deadline, higher priority level, higher expectedCompletionTime, and higher completionLevel are scheduled first. The generated plan details concrete time slots for events and tasks. If doing this is not possible (e.g., due to conflicts), then return an `error`.

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
      "type": "string",
      "originalId": "string",
      "name": "string",
      "scheduledStartTime": "string",
      "scheduledEndTime": "string"
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

### POST /api/ScheduleGenerator/_getScheduleByOwner

**Description:** Retrieves the ID of the schedule document associated with a given user owner.

**Requirements:**
- N/A

**Effects:**
- Retrieves the ID of the schedule document associated with a given user owner.

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

### POST /api/ScheduleGenerator/_getEventsForSchedule

**Description:** Retrieves an array of Event IDs that are linked to the specified schedule.

**Requirements:**
- N/A

**Effects:**
- Retrieves an array of Event IDs that are linked to the specified schedule.

**Request Body:**
```json
{
  "schedule": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "event": "string"
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

### POST /api/ScheduleGenerator/_getTasksForSchedule

**Description:** Retrieves an array of Task IDs that are linked to the specified schedule.

**Requirements:**
- N/A

**Effects:**
- Retrieves an array of Task IDs that are linked to the specified schedule.

**Request Body:**
```json
{
  "schedule": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "task": "string"
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

### POST /api/ScheduleGenerator/_getEventDetails

**Description:** Retrieves the full document details for a specific event.

**Requirements:**
- N/A

**Effects:**
- Retrieves the full document details for a specific event.

**Request Body:**
```json
{
  "event": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "eventDetails": {
      "_id": "string",
      "name": "string",
      "eventID": "number",
      "scheduleID": "number",
      "startTime": "string",
      "endTime": "string",
      "repeat": {
        "frequency": "string",
        "daysOfWeek"?: "number[]"
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

### POST /api/ScheduleGenerator/_getTaskDetails

**Description:** Retrieves the full document details for a specific task.

**Requirements:**
- N/A

**Effects:**
- Retrieves the full document details for a specific task.

**Request Body:**
```json
{
  "task": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "taskDetails": {
      "_id": "string",
      "name": "string",
      "taskID": "number",
      "scheduleID": "number",
      "deadline": "string",
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

# API Specification: UserAuthentication Concept

**Purpose:** limit access to known users and find users by name.

---

## API Endpoints

### POST /api/UserAuthentication/register

**Description:** Registers a new user with a unique username and password.

**Requirements:**
- no `User` with `username` exists.

**Effects:**
- Create and return a new `User` with the given `username` and `password`.

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
- `User` with the same `username` and `password` exists.

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
- `user` exists and `user.password` is equal to `oldPassword`.

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

### POST /api/UserAuthentication/_getUserByUsername

**Description:** Returns the user ID associated with a username if found.

**Requirements:**
- N/A

**Effects:**
- Returns the user ID associated with a username if found.

**Request Body:**
```json
{
  "username": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "user": "string"
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

### POST /api/UserAuthentication/_checkUserExists

**Description:** Returns true if the user with the given ID exists, false otherwise.

**Requirements:**
- N/A

**Effects:**
- Returns true if the user with the given ID exists, false otherwise.

**Request Body:**
```json
{
  "user": "string"
}
```

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

# API Specification: Notification Concept

**Purpose:** Provides a system to configure, send, and track email notifications for users about specific items, allowing users to customize daily delivery times.

---

## API Endpoints

### POST /api/Notification/createNotificationConfig

**Description:** Creates and returns a new `NotificationSettings` for `owner` with the given attributes, with `settingID` incrementing by 1.

**Requirements:**
- `owner` exists.

**Effects:**
- Creates and returns a new `NotificationSettings` for `owner` with the given attributes, with `settingID` incrementing by 1.

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

---

### POST /api/Notification/editNotificationConfig

**Description:** Modifies `setting` with the given attributes.

**Requirements:**
- `setting` exists.

**Effects:**
- Modifies `setting` with the given attributes.

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

---

### POST /api/Notification/deleteNotificationConfig

**Description:** Deletes `setting` from `NotificationSettings` and all associated `SentNotifications`.

**Requirements:**
- `setting` exists.

**Effects:**
- Deletes `setting` from `NotificationSettings` and all associated `SentNotifications`.

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

**Description:** Finds the specified settings of type `NotificationSettings`, and uses its templates and email to send the email to `settings.email`. Creates a `SentNotification` entry to record the attempt, `timestamp`, and `wasSent` (true if success, false otherwise) with `sentNotificationID` incrementing by 1. Returns `sentNotification` on success, or an `error` if no matching and enabled setting was found or email delivery fails.

**Requirements:**
- `owner` exists and there exists a `NotificationSettings` entry with the same `owner`, `targetItem`, and `notificationType`, and has `isEnabled` set to true, and `contextData` is valid.

**Effects:**
- Finds the specified `settings` of type `NotificationSettings`, and uses `settings.emailSubjectTemplate`, `settings.emailBodyTemplate, settings.email`, and `contextData` to send the email to `settings.email`. Creates a `SentNotification` entry to record the attempt, `timestamp`, and `wasSent` (true if success, false otherwise) with `sentNotificationID` incrementing by 1. Returns `sentNotification` on success, or an `error` if no matching and enabled setting was found or email delivery fails.

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

---

### POST /api/Notification/_getNotificationSettingsForUser

**Description:** Retrieves all notification settings configured for a specific user.

**Requirements:**
- N/A

**Effects:**
- Returns an array of `NotificationSetting` objects belonging to the user.

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

---

### POST /api/Notification/_getSentNotificationsForSetting

**Description:** Retrieves all sent notifications associated with a specific notification setting.

**Requirements:**
- N/A

**Effects:**
- Returns an array of `SentNotification` objects associated with the setting.

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

---

### POST /api/Notification/_getEnabledSetting

**Description:** Retrieves an enabled notification setting for a specific user, item, and notification type.

**Requirements:**
- N/A

**Effects:**
- Returns the matching `NotificationSetting` or `null` if not found/enabled.

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

---

# API Specification: ItemSharing Concept

**Purpose:** Allows collaborative modification of an item's mutable properties by managing invited participants, their acceptance to collaborate, and the lifecycle of proposed and confirmed changes to those properties.

---

## API Endpoints

### POST /api/ItemSharing/makeItemShareable

**Description:** Creates and returns a new `sharedItem` with `sharedItemID` incremented by 1. `sharedItem` is initialized with the given `externalItemID` and `owner` while `participants`, `acceptedParticipants`, and `changeRequests` are initialized as empty sets.

**Requirements:**
- `externalItemID` exists from an external concept, `owner` exists, and `externalItemID` is not already registered for sharing.

**Effects:**
- Creates and returns a new `sharedItem` with `sharedItemID` increments by 1. `sharedItem` is initialized with the given `externalItemID` and `owner` while `participants`, `acceptedParticipants`, and `changeRequests` are initialized as empty sets.

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

**Description:** Adds `targetUser` to `sharedItem.participants`.

**Requirements:**
- `sharedItem` exists, `targetUser` exists, `targetUser` is not already in `sharedItem.participants`.

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

**Description:** Removes `targetUser` from `sharedItem.participants` and from `sharedItem.acceptedParticipants` if they are in that set. Deletes any `ChangeRequests` made by `targetUser` for `sharedItem`.

**Requirements:**
- `sharedItem` exists, `targetUser` is in `sharedItem.participants`.

**Effects:**
- Removes `targetUser` from `sharedItem.participants` and from `sharedItem.acceptedParticipants` if they are in that set. Deletes any `ChangeRequests` made by `targetUser` for `sharedItem`.

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

**Description:** Adds `user` to `sharedItem.acceptedParticipants`.

**Requirements:**
- `sharedItem` exists, `user` is in `sharedItem.participants`, `user` is not already in `sharedItem.acceptedParticipants`.

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

**Description:** Removes `user` from `sharedItem.participants` and, if present, from `sharedItem.acceptedParticipants`. Deletes any `ChangeRequests` made by `user` for this `sharedItem`.

**Requirements:**
- `sharedItem` exists, `user` is in `sharedItem.participants`.

**Effects:**
- Removes `user` from `sharedItem.participants` and, if present, from `sharedItem.acceptedParticipants`. Deletes any `ChangeRequests` made by `user` for this `sharedItem`.

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

**Description:** Creates and returns a new `changeRequest` for `sharedItem` with the `requester` and the proposed `requestedProperties`, with `requestID` incrementing by 1. Adds `changeRequest` to `sharedItem.changeRequests`.

**Requirements:**
- `sharedItem` exists, `requester` exists, `requester` is in `sharedItem.acceptedParticipants`.

**Effects:**
- Creates and returns a new `changeRequest` for `sharedItem` with the `requester` and the proposed `requestedProperties`, with `requestID` incrementing by 1. Adds `changeRequest` to `sharedItem.changeRequests`.

**Request Body:**
```json
{
  "sharedItem": "string",
  "requester": "string",
  "requestedProperties": {
    "propertyName": "any",
    "anotherProperty": "any"
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

**Description:** Deletes `request` from `sharedItem.changeRequests`. (Note: The actual application of properties to the external item is done by a concept sync).

**Requirements:**
- `sharedItem` exists, `owner` is `sharedItem.owner`, `request` is in `sharedItem.changeRequests`.

**Effects:**
- Deletes `request` from `sharedItem.changeRequests`.

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

**Description:** Deletes `request` from `sharedItem.changeRequests`.

**Requirements:**
- `sharedItem` exists, `owner` is `sharedItem.owner`, `request` is in `sharedItem.changeRequests`.

**Effects:**
- Deletes `request` from `sharedItem.changeRequests`.

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