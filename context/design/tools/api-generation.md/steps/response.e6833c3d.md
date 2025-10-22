---
timestamp: 'Mon Oct 20 2025 17:18:56 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_171856.5e7a25a1.md]]'
content_id: e6833c3d1338c5a437597f10ecfe8ed703fb7d327e3a5a2b42036c12ae2709e8
---

# response:

Okay, here are the API specifications, separated into individual Markdown files for each concept.

***

**File: `API_Specification_ScheduleGenerator.md`**

````markdown
# API Specification: ScheduleGenerator Concept

**Purpose:** manages events and tasks for users to automatically generate a schedule that meets their needs

---

## API Endpoints

### POST /api/ScheduleGenerator/initializeSchedule

**Description:** Initializes a new schedule for a given user.

**Requirements:**
- `owner` exists

**Effects:**
- creates an empty `schedule` with `owner` as `schedule.owner`, with static attribute `scheduleID` incrementing by 1

**Request Body:**
```json
{
  "owner": "string"
}
````

**Success Response Body (Action):**

```json
{
  "schedule": "number"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ScheduleGenerator/addEvent

**Description:** Adds a new event to an existing schedule.

**Requirements:**

* `schedule` exists

**Effects:**

* creates and returns an event with `name` to add to the set of events in `schedule` with the given attributes, and `eventID` incrementing by 1, and `event.scheduleID` being `schedule.scheduleID`

**Request Body:**

```json
{
  "schedule": "number",
  "name": "string",
  "startTime": "string",
  "endTime": "string",
  "repeat": "object"
}
```

**Success Response Body (Action):**

```json
{
  "event": "number"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ScheduleGenerator/editEvent

**Description:** Modifies an existing event in a schedule.

**Requirements:**

* `oldEvent` is in the set of `Events` of `schedule`

**Effects:**

* modifies `oldEvent` in the set of `Events` in `schedule` with the given attributes

**Request Body:**

```json
{
  "schedule": "number",
  "oldEvent": "number",
  "name": "string",
  "startTime": "string",
  "endTime": "string",
  "repeat": "object"
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

### POST /api/ScheduleGenerator/deleteEvent

**Description:** Deletes an event from a schedule.

**Requirements:**

* `event` is in the set of `Events` of `schedule`

**Effects:**

* deletes the `event` in the set of `Events` in `schedule`

**Request Body:**

```json
{
  "schedule": "number",
  "event": "number"
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

### POST /api/ScheduleGenerator/addTask

**Description:** Adds a new task to an existing schedule.

**Requirements:**

* `schedule` exists
* `completionLevel` is between 0 and 100 (inclusive)

**Effects:**

* returns and adds `task` with `name` to the set of `tasks` in `schedule` with the given attributes, with the given `completionLevel`, and `taskID` incrementing by 1, and `task.scheduleID` being `schedule.scheduleID`

**Request Body:**

```json
{
  "schedule": "number",
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
  "task": "number"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ScheduleGenerator/editTask

**Description:** Modifies an existing task in a schedule.

**Requirements:**

* `oldTask` is in the set of `Tasks` of `schedule`

**Effects:**

* modifies `oldTask` in the set of `Tasks` in `schedule` with the given attributes

**Request Body:**

```json
{
  "schedule": "number",
  "oldTask": "number",
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

***

### POST /api/ScheduleGenerator/deleteTask

**Description:** Deletes a task from a schedule.

**Requirements:**

* `task` is in the set of `Tasks` of `schedule`

**Effects:**

* deletes `task` in the set of `Tasks` in `schedule`

**Request Body:**

```json
{
  "schedule": "number",
  "task": "number"
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

### POST /api/ScheduleGenerator/generateSchedule

**Description:** Generates an optimal schedule plan based on existing events and tasks for a given schedule.

**Requirements:**

* `schedule` exists

**Effects:**

* Creates `generatedPlan` for `schedule.owner` such that if possible, all given events start, end, and repeat as specified, and task scheduling is optimized by its attributes. Generally, tasks with a sooner deadline, higher priority level, higher expectedCompletionTime, and higher completionLevel are scheduled first. The generated plan details concrete time slots for events and tasks. If doing this is not possible (e.g., due to conflicts), then return an `error`.

**Request Body:**

```json
{
  "schedule": "number"
}
```

**Success Response Body (Action):**

```json
{
  "scheduleId": "number",
  "generatedPlan": "object"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

````

---
**File: `API_Specification_UserAuthentication.md`**
```markdown
# API Specification: UserAuthentication Concept

**Purpose:** limit access to known users and find users by name

---

## API Endpoints

### POST /api/UserAuthentication/register

**Description:** Registers a new user with a username and password.

**Requirements:**
- no `User` with `username` exists

**Effects:**
- create and return a new `User` with the given `username` and `password`

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
````

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

***

### POST /api/UserAuthentication/authenticate

**Description:** Authenticates a user with the provided username and password.

**Requirements:**

* `User` with the same `username` and `password` exists

**Effects:**

* grants access to the `User` associated with that `username` and `password`

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

***

### POST /api/UserAuthentication/changePassword

**Description:** Changes the password for an existing user.

**Requirements:**

* `user` exists and `user.password` is equal to `oldPassword`

**Effects:**

* `password` for `user` is changed to `newPassword`.

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

***

### POST /api/UserAuthentication/deleteAccount

**Description:** Deletes a user account.

**Requirements:**

* `user` exists

**Effects:**

* `user` is removed from the state

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

````

---
**File: `API_Specification_Notification.md`**
```markdown
# API Specification: Notification Concept

**Purpose:** Provides a system to configure, send, and track email notifications for users about specific items, allowing users to customize daily delivery times

---

## API Endpoints

### POST /api/Notification/createNotificationConfig

**Description:** Creates a new notification configuration for a user and a target item.

**Requirements:**
- `owner` exists

**Effects:**
- Creates and returns a new `NotificationSettings` for `owner` with the given attributes, with `settingID` incrementing by 1

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
````

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

````

---
**File: `API_Specification_ItemSharing.md`**
```markdown
# API Specification: ItemSharing Concept

**Purpose:** Allows collaborative modification of an item's mutable properties by managing invited participants, their acceptance to collaborate, and the lifecycle of proposed and confirmed changes to those properties.

---

## API Endpoints

### POST /api/ItemSharing/makeItemShareable

**Description:** Registers an external item to be shareable, establishing its owner.

**Requirements:**
- `externalItemID` exists from an external concept
- `owner` exists
- `externalItemID` is not already registered for sharing

**Effects:**
- creates and returns a new `sharedItem` with `sharedItemID` increments by 1. `sharedItem` is initialized with the given `externalItemID` and `owner` while `participants`, `acceptedParticipants`, and `changeRequests` are initialized as empty sets.

**Request Body:**
```json
{
  "owner": "string",
  "externalItemID": "string"
}
````

**Success Response Body (Action):**

```json
{
  "sharedItem": "number"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ItemSharing/shareItemWith

**Description:** Invites a user to participate in sharing an item.

**Requirements:**

* `sharedItem` exists
* `targetUser` exists
* `targetUser` is not already in `sharedItem.participants`

**Effects:**

* adds `targetUser` to `sharedItem.participants`

**Request Body:**

```json
{
  "sharedItem": "number",
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

***

### POST /api/ItemSharing/unshareItemWith

**Description:** Revokes a user's invitation or participation in sharing an item.

**Requirements:**

* `sharedItem` exists
* `targetUser` is in `sharedItem.participants`

**Effects:**

* removes `targetUser` from `sharedItem.participants` and from `sharedItem.acceptedParticipants` if they are in that set. Deletes any `ChangeRequests` made by `targetUser` for `sharedItem`

**Request Body:**

```json
{
  "sharedItem": "number",
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

***

### POST /api/ItemSharing/acceptToCollaborate

**Description:** A user accepts to collaborate on a shared item.

**Requirements:**

* `sharedItem` exists
* `user` is in `sharedItem.participants`
* `user` is not already in `sharedItem.acceptedParticipants`

**Effects:**

* adds `user` to `sharedItem.acceptedParticipants`

**Request Body:**

```json
{
  "sharedItem": "number",
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

***

### POST /api/ItemSharing/rejectCollaboration

**Description:** A user rejects collaboration on a shared item, also removing their participation.

**Requirements:**

* `sharedItem` exists
* `user` is in `sharedItem.participants`

**Effects:**

* removes `user` from `sharedItem.participants` and, if present, from `sharedItem.acceptedParticipants`. Deletes any `ChangeRequests` made by `user` for this `sharedItem`

**Request Body:**

```json
{
  "sharedItem": "number",
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

***

### POST /api/ItemSharing/requestChange

**Description:** A participant proposes changes to an item's properties.

**Requirements:**

* `sharedItem` exists
* `requester` exists
* `requester` is in `sharedItem.acceptedParticipants`

**Effects:**

* creates and returns a new `changeRequest` for `sharedItem` with the `requester` and the proposed `requestedProperties`, with `requestID` incrementing. Adds `changeRequest` to `sharedItem.changeRequests`.

**Request Body:**

```json
{
  "sharedItem": "number",
  "requester": "string",
  "requestedProperties": "object"
}
```

**Success Response Body (Action):**

```json
{
  "changeRequest": "number"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ItemSharing/confirmChange

**Description:** The owner confirms a proposed change request.

**Requirements:**

* `sharedItem` exists
* `owner` is `sharedItem.owner`
* `request` is in `sharedItem.changeRequests`

**Effects:**

* Deletes `request` from `sharedItem.changeRequests`

**Request Body:**

```json
{
  "owner": "string",
  "sharedItem": "number",
  "request": "number"
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

### POST /api/ItemSharing/rejectChange

**Description:** The owner rejects a proposed change request.

**Requirements:**

* `sharedItem` exists
* `owner` is `sharedItem.owner`
* `request` is in `sharedItem.changeRequests`

**Effects:**

* deletes `request` from `sharedItem.changeRequests`

**Request Body:**

```json
{
  "owner": "string",
  "sharedItem": "number",
  "request": "number"
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

```
```
