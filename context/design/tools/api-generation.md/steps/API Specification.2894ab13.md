---
timestamp: 'Tue Oct 21 2025 12:29:31 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251021_122931.fcb5e987.md]]'
content_id: 2894ab1325fa7653c9b9ed2defd29032cbc318754c33adf6488948dedc292906
---

# API Specification: ScheduleGenerator Concept

**Purpose:** manages events and tasks for users to automatically generate a schedule that meets their needs

***

## API Endpoints

### POST /api/ScheduleGenerator/initializeSchedule

**Description:** Creates an empty schedule for a given user owner.

**Requirements:**

* `owner` exists (this concept treats `User` as a generic ID and cannot verify its existence; a higher-level synchronization is expected to provide a valid `User` ID).

**Effects:**

* Creates an empty `schedule` with `owner` as `schedule.owner`.
* Assigns an internal, incrementing `scheduleID`.

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

***

### POST /api/ScheduleGenerator/addEvent

**Description:** Adds a new event to a specified schedule.

**Requirements:**

* `schedule` identified by `schedule` ID must exist.
* `startTime` must be before `endTime`.
* For weekly repeat events, `repeat.daysOfWeek` must contain at least one day.

**Effects:**

* Creates and returns a new event document.
* The event is linked to the specified schedule via its internal `scheduleID`.
* An internal `eventID` is incremented and assigned.
* `startTime` and `endTime` refer to both date and time.

**Request Body:**

```json
{
  "schedule": "string",
  "name": "string",
  "startTime": "string (ISO 8601 Date)",
  "endTime": "string (ISO 8601 Date)",
  "repeat": {
    "frequency": "string (NONE | DAILY | WEEKLY | MONTHLY | YEARLY)",
    "daysOfWeek": "array of number (0-6 for Sunday-Saturday, optional for non-weekly)"
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

***

### POST /api/ScheduleGenerator/editEvent

**Description:** Modifies the attributes of an existing event within a schedule.

**Requirements:**

* `oldEvent` identified by `oldEvent` ID must exist.
* `oldEvent` must be associated with the `schedule` identified by `schedule` ID.
* `startTime` must be before `endTime`.
* For weekly repeat events, `repeat.daysOfWeek` must contain at least one day.

**Effects:**

* Modifies the `oldEvent` document with the given attributes.

**Request Body:**

```json
{
  "schedule": "string",
  "oldEvent": "string",
  "name": "string",
  "startTime": "string (ISO 8601 Date)",
  "endTime": "string (ISO 8601 Date)",
  "repeat": {
    "frequency": "string (NONE | DAILY | WEEKLY | MONTHLY | YEARLY)",
    "daysOfWeek": "array of number (0-6 for Sunday-Saturday, optional for non-weekly)"
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

***

### POST /api/ScheduleGenerator/deleteEvent

**Description:** Deletes a specific event from a schedule.

**Requirements:**

* `event` identified by `event` ID must exist.
* `event` must be associated with the `schedule` identified by `schedule` ID.

**Effects:**

* Deletes the `event` document.

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

***

### POST /api/ScheduleGenerator/addTask

**Description:** Adds a new task to a specified schedule.

**Requirements:**

* `schedule` identified by `schedule` ID must exist.
* `expectedCompletionTime` must be positive.
* `priority` must be between 0 and 100 (inclusive).
* `completionLevel` must be between 0 and 100 (inclusive).

**Effects:**

* Creates and returns a new task document.
* The task is linked to the specified schedule via its internal `scheduleID`.
* An internal `taskID` is incremented and assigned.

**Request Body:**

```json
{
  "schedule": "string",
  "name": "string",
  "deadline": "string (ISO 8601 Date)",
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

***

### POST /api/ScheduleGenerator/editTask

**Description:** Modifies the attributes of an existing task within a schedule.

**Requirements:**

* `oldTask` identified by `oldTask` ID must exist.
* `oldTask` must be associated with the `schedule` identified by `schedule` ID.
* `expectedCompletionTime` must be positive.
* `priority` must be between 0 and 100 (inclusive).
* `completionLevel` must be between 0 and 100 (inclusive).

**Effects:**

* Modifies the `oldTask` document with the given attributes.

**Request Body:**

```json
{
  "schedule": "string",
  "oldTask": "string",
  "name": "string",
  "deadline": "string (ISO 8601 Date)",
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

**Description:** Deletes a specific task from a schedule.

**Requirements:**

* `task` identified by `task` ID must exist.
* `task` must be associated with the `schedule` identified by `schedule` ID.

**Effects:**

* Deletes the `task` document.

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

***

### POST /api/ScheduleGenerator/generateSchedule

**Description:** Generates an optimized schedule plan for a user based on their events and tasks.

**Requirements:**

* `schedule` identified by `schedule` ID must exist.

**Effects:**

* Retrieves all events and tasks associated with the given schedule.
* Instantiates repeating events for a planning horizon and prioritizes and schedules tasks into available time slots.
* Returns a `GeneratedSchedulePlan` containing concrete scheduled items.
* If the generation process encounters an unresolvable conflict (e.g., tasks cannot be scheduled), an error is returned.

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
      "type": "string (event | task)",
      "originalId": "string",
      "name": "string",
      "scheduledStartTime": "string (ISO 8601 Date)",
      "scheduledEndTime": "string (ISO 8601 Date)"
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

***

### POST /api/ScheduleGenerator/\_getScheduleByOwner

**Description:** Retrieves the ID of the schedule document associated with a given user owner.

**Requirements:**

* None explicitly stated, but an owner ID should be provided.

**Effects:**

* Returns the `schedule` ID.

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

***

### POST /api/ScheduleGenerator/\_getEventsForSchedule

**Description:** Retrieves an array of Event IDs that are linked to the specified schedule.

**Requirements:**

* None explicitly stated, but a schedule ID should be provided.

**Effects:**

* Returns an array of event IDs.

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
    "events": "array of string"
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

### POST /api/ScheduleGenerator/\_getTasksForSchedule

**Description:** Retrieves an array of Task IDs that are linked to the specified schedule.

**Requirements:**

* None explicitly stated, but a schedule ID should be provided.

**Effects:**

* Returns an array of task IDs.

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
    "tasks": "array of string"
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

### POST /api/ScheduleGenerator/\_getEventDetails

**Description:** Retrieves the full document details for a specific event.

**Requirements:**

* None explicitly stated, but an event ID should be provided.

**Effects:**

* Returns the event document.

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
      "startTime": "string (ISO 8601 Date)",
      "endTime": "string (ISO 8601 Date)",
      "repeat": {
        "frequency": "string (NONE | DAILY | WEEKLY | MONTHLY | YEARLY)",
        "daysOfWeek": "array of number (0-6 for Sunday-Saturday, optional for non-weekly)"
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

***

### POST /api/ScheduleGenerator/\_getTaskDetails

**Description:** Retrieves the full document details for a specific task.

**Requirements:**

* None explicitly stated, but a task ID should be provided.

**Effects:**

* Returns the task document.

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
      "deadline": "string (ISO 8601 Date)",
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

***
