**Purpose:** manages events and tasks for users to automatically generate a schedule that meets their needs.

---

## API Endpoints

### POST /api/ScheduleGenerator/initializeSchedule

**Description:** Creates an empty schedule document, associating it with the owner, and assigns an incrementing scheduleID.

**Requirements:**

* `owner` exists (this concept treats `User` as a generic ID and cannot verify its existence; a higher-level synchronization is expected to provide a valid `User` ID).

**Effects:**

* Creates an empty `schedule` with `owner` as `schedule.owner`.
* The `scheduleID` for the new schedule increments by 1.
* Returns the ID of the newly created schedule document.

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

**Description:** Creates and returns a new event document linked to the specified schedule, with the given attributes.

**Requirements:**

* The `schedule` identified by `schedule` ID must exist.
* Event start time must be before end time.
* Weekly repeat events must specify at least one day of the week if `repeat.frequency` is `WEEKLY`.

**Effects:**

* Creates and returns an event with `name` to add to the set of events in `schedule` with the given attributes.
* `eventID` increments by 1.
* `event.scheduleID` points to `schedule.scheduleID`.

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

***

### POST /api/ScheduleGenerator/editEvent

**Description:** Modifies the attributes of a specified event document.

**Requirements:**

* The `oldEvent` identified by `oldEvent` ID must exist and be associated with the `schedule` identified by `schedule` ID.
* Event start time must be before end time.
* Weekly repeat events must specify at least one day of the week if `repeat.frequency` is `WEEKLY`.

**Effects:**

* Modifies `oldEvent` in the set of `Events` in `schedule` with the given attributes.

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

***

### POST /api/ScheduleGenerator/deleteEvent

**Description:** Deletes the specified event document.

**Requirements:**

* The `event` identified by `event` ID must exist and be associated with the `schedule` identified by `schedule` ID.

**Effects:**

* Deletes the `event` in the set of `Events` in `schedule`.

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

**Description:** Creates and returns a new task document, linked to the specified schedule, with the given attributes.

**Requirements:**

* The `schedule` identified by `schedule` ID must exist.
* `expectedCompletionTime` must be positive.
* `priority` must be between 0 and 100 (inclusive).
* `completionLevel` must be between 0 and 100 (inclusive).

**Effects:**

* Returns and adds `task` with `name` to the set of `tasks` in `schedule` with the given attributes.
* `completionLevel` is set to the provided value.
* `taskID` increments by 1.
* `task.scheduleID` points to `schedule.scheduleID`.

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

***

### POST /api/ScheduleGenerator/editTask

**Description:** Modifies the attributes of the specified task document.

**Requirements:**

* The `oldTask` identified by `oldTask` ID must exist and be associated with the `schedule` identified by `schedule` ID.
* `expectedCompletionTime` must be positive.
* `priority` must be between 0 and 100 (inclusive).
* `completionLevel` must be between 0 and 100 (inclusive).

**Effects:**

* Modifies `oldTask` in the set of `Tasks` in `schedule` with the given attributes.

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

***

### POST /api/ScheduleGenerator/deleteTask

**Description:** Deletes the specified task document.

**Requirements:**

* The `task` identified by `task` ID must exist and be associated with the `schedule` identified by `schedule` ID.

**Effects:**

* Deletes `task` in the set of `Tasks` in `schedule`.

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

**Description:** Retrieves all events and tasks associated with the given schedule, instantiates repeating events for a planning horizon, and prioritizes and schedules tasks into available time slots.

**Requirements:**

* The `schedule` identified by `schedule` ID must exist.

**Effects:**

* Creates a `generatedPlan` for `schedule.owner` such that if possible, all given events start, end, and repeat as specified, and task scheduling is optimized by its attributes.
* The generated plan details concrete time slots for events and tasks.
* If doing this is not possible (e.g., due to conflicts), then return an `error`.

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

***

### GET /api/ScheduleGenerator/\_getScheduleByOwner

**Description:** Retrieves the ID of the schedule document associated with a given user owner.

**Requirements:**

* None explicitly stated, but the `owner` should correspond to an existing schedule.

**Effects:**

* Returns the schedule ID if found.

**Request Parameters:**

* `owner`: `string` (User ID)

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

### GET /api/ScheduleGenerator/\_getEventsForSchedule

**Description:** Retrieves an array of Event IDs that are linked to the specified schedule.

**Requirements:**

* The `schedule` identified by `schedule` ID must exist.

**Effects:**

* Returns an array of event IDs.

**Request Parameters:**

* `schedule`: `string` (Schedule ID)

**Success Response Body (Query):**

```json
[
  {
    "event": ["string", "string"]
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

### GET /api/ScheduleGenerator/\_getTasksForSchedule

**Description:** Retrieves an array of Task IDs that are linked to the specified schedule.

**Requirements:**

* The `schedule` identified by `schedule` ID must exist.

**Effects:**

* Returns an array of task IDs.

**Request Parameters:**

* `schedule`: `string` (Schedule ID)

**Success Response Body (Query):**

```json
[
  {
    "task": ["string", "string"]
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

### GET /api/ScheduleGenerator/\_getEventDetails

**Description:** Retrieves the full document details for a specific event.

**Requirements:**

* `event` exists.

**Effects:**

* Returns an array containing the event document.

**Request Parameters:**

* `event`: `string` (Event ID)

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

***

### GET /api/ScheduleGenerator/\_getTaskDetails

**Description:** Retrieves the full document details for a specific task.

**Requirements:**

* `task` exists.

**Effects:**

* Returns an array containing the task document.

**Request Parameters:**

* `task`: `string` (Task ID)

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

***

### GET /api/ScheduleGenerator/\_getAllSchedules

**Description:** Retrieves all schedule documents.

**Requirements:**

* None.

**Effects:**

* Returns an array of all `ScheduleDoc` objects.

**Request Parameters:**

* None.

**Success Response Body (Query):**

```json
[
  {
    "schedule": [
      {
        "_id": "string",
        "owner": "string",
        "scheduleID": "number"
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

### GET /api/ScheduleGenerator/\_getScheduleDetails

**Description:** Retrieves a specific schedule document by its ID.

**Requirements:**

* The `schedule` (ID) exists.

**Effects:**

* Returns an array containing the `ScheduleDoc` object matching the provided ID.

**Request Parameters:**

* `schedule`: `string` (Schedule ID)

**Success Response Body (Query):**

```json
[
  {
    "scheduleDetails": {
      "_id": "string",
      "owner": "string",
      "scheduleID": "number"
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

### GET /api/ScheduleGenerator/\_getAllEvents

**Description:** Retrieves all event documents.

**Requirements:**

* None.

**Effects:**

* Returns an array of all `EventDoc` objects.

**Request Parameters:**

* None.

**Success Response Body (Query):**

```json
[
  {
    "event": [
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

### GET /api/ScheduleGenerator/\_getAllTasks

**Description:** Retrieves all task documents.

**Requirements:**

* None.

**Effects:**

* Returns an array of all `TaskDoc` objects.

**Request Parameters:**

* None.

**Success Response Body (Query):**

```json
[
  {
    "task": [
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
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```
