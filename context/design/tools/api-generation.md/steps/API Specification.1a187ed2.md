---
timestamp: 'Mon Oct 20 2025 16:36:28 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_163628.1d1f708a.md]]'
content_id: 1a187ed2a29b2963e42bfa82be25483eab482d8aec902b552ceb400657d3197d
---

# API Specification: ScheduleGenerator Concept

**Purpose:** manages events and tasks for users to automatically generate a schedule that meets their needs

***

## API Endpoints

### POST /api/ScheduleGenerator/initializeSchedule

**Description:** Creates an empty schedule for a given user.

**Requirements:**

* `owner` exists

**Effects:**

* creates an empty `schedule` with `owner` as `schedule.owner`, with static attribute `scheduleID` incrementing by 1

**Request Body:**

```json
{
  "owner": "User"
}
```

**Success Response Body (Action):**

```json
{
  "schedule": "Schedule"
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

**Description:** Creates and adds a new event to a specified schedule.

**Requirements:**

* `schedule` exists

**Effects:**

* creates and returns an event with `name` to add to the set of events in `schedule` with the given attributes, and `eventID` incrementing by 1, and `event.scheduleID` being `schedule.scheduleID`

**Request Body:**

```json
{
  "schedule": "Schedule",
  "name": "String",
  "startTime": "Date",
  "endTime": "Date",
  "repeat": "RepeatConfig"
}
```

**Success Response Body (Action):**

```json
{
  "event": "Event"
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

**Description:** Modifies an existing event within a schedule.

**Requirements:**

* `oldEvent` is in the set of `Events` of `schedule`

**Effects:**

* modifies `oldEvent` in the set of `Events` in `schedule` with the given attributes

**Request Body:**

```json
{
  "schedule": "Schedule",
  "oldEvent": "Event",
  "name": "String",
  "startTime": "Date",
  "endTime": "Date",
  "repeat": "RepeatConfig"
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

**Description:** Deletes an event from a specified schedule.

**Requirements:**

* `event` is in the set of `Events` of `schedule`

**Effects:**

* deletes the `event` in the set of `Events` in `schedule`

**Request Body:**

```json
{
  "schedule": "Schedule",
  "event": "Event"
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

**Description:** Creates and adds a new task to a specified schedule.

**Requirements:**

* `schedule` exists
* `completionLevel` is between 0 and 100 (inclusive)

**Effects:**

* returns and adds `task` with `name` to the set of `tasks` in `schedule` with the given attributes, with the given `completionLevel`, and `taskID` incrementing by 1, and `task.scheduleID` being `schedule.scheduleID`

**Request Body:**

```json
{
  "schedule": "Schedule",
  "name": "String",
  "deadline": "Date",
  "expectedCompletionTime": "Number",
  "completionLevel": "Percent",
  "priority": "Percent"
}
```

**Success Response Body (Action):**

```json
{
  "task": "Task"
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

**Description:** Modifies an existing task within a schedule.

**Requirements:**

* `oldTask` is in the set of `Tasks` of `schedule`

**Effects:**

* modifies `oldTask` in the set of `Tasks` in `schedule` with the given attributes

**Request Body:**

```json
{
  "schedule": "Schedule",
  "oldTask": "Task",
  "name": "String",
  "deadline": "Date",
  "expectedCompletionTime": "Number",
  "completionLevel": "Percent",
  "priority": "Percent"
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

**Description:** Deletes a task from a specified schedule.

**Requirements:**

* `task` is in the set of `Tasks` of `schedule`

**Effects:**

* deletes `task` in the set of `Tasks` in `schedule`

**Request Body:**

```json
{
  "schedule": "Schedule",
  "task": "Task"
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

**Description:** Generates an optimized schedule plan for a user's events and tasks.

**Requirements:**

* `schedule` exists

**Effects:**

* Creates `generatedPlan` for `schedule.owner` such that if possible, all given events start, end, and repeat as specified, and task scheduling is optimized by its attributes. Generally, tasks with a sooner deadline, higher priority level, higher expectedCompletionTime, and higher completionLevel are scheduled first. The generated plan details concrete time slots for events and tasks. If doing this is not possible (e.g., due to conflicts), then return an `error`.

**Request Body:**

```json
{
  "schedule": "Schedule"
}
```

**Success Response Body (Action):**

```json
{
  "scheduleId": "Schedule",
  "generatedPlan": "GeneratedSchedulePlan"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```
