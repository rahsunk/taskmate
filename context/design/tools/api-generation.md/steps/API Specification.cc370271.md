---
timestamp: 'Mon Oct 20 2025 17:16:49 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_171649.6eb73be8.md]]'
content_id: cc3702711f1737c099f3f50cdae23923e35f53d19a5add3acb09cf077631f742
---

# API Specification: ScheduleGenerator Concept

**Purpose:** manages events and tasks for users to automatically generate a schedule that meets their needs

***

## API Endpoints

### POST /api/ScheduleGenerator/initializeSchedule

**Description:** Initializes a new schedule for a given user.

**Requirements:**

* `owner` exists

**Effects:**

* creates an empty `schedule` with `owner` as `schedule.owner`, with static attribute `scheduleID` incrementing by 1

**Request Body:**

```json
{
  "owner": "string"
}
```

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

***
