---
timestamp: 'Mon Oct 27 2025 07:10:03 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251027_071003.df913b09.md]]'
content_id: 7ccc199b68e1f34f0d13c3ea70bc4efe34cdcd21001db1a7b0fdcfce63645a8f
---

# concept: ScheduleGenerator (Final Updated Specification)

* **concept** ScheduleGenerator\[User, Date, Percent]
* **purpose** manages events and tasks for users to automatically generate a schedule that meets their needs
* **principle** Given a set of events and tasks, an optimal schedule for the user is created. When events and tasks are updated and removed, the schedule is regenerated
* **state**
  * a set of `Schedules` with
    * an `owner` of type `User`
    * a `scheduleID` of type `Number` (static attribute, initially -1)
  * a set of `Events` with
    * a `name` of type `String`
    * an `eventID` of type `Number` (static attribute, initially -1)
    * a `scheduleID` of type `Number`
    * a `startTime` of type `Date`
    * an `endTime` of type `Date`
    * a `repeat` of type `RepeatConfig`
  * a set of `Tasks` with
    * a `name` of type `String`
    * a `taskID` of type `Number` (static attribute, initially -1)
    * a `scheduleID` of type `Number`
    * a `deadline` of type `Date`
    * an `expectedCompletionTime` of type `Number` (in minutes)
    * a `completionLevel` of type `Percent`
    * a `priority` of type `Percent`
* **actions**
  * `initializeSchedule(owner: User): (schedule: Schedule)`
    * **requires**: `owner` exists
    * **effects**: creates an empty `schedule` with `owner` as `schedule.owner`, with static attribute `scheduleID` incrementing by 1
  * `addEvent(schedule: Schedule, name: String, startTime: Date, endTime: Date, repeat: RepeatConfig): (event: Event)`
    * **requires**: `schedule` exists
    * **effects**: creates and returns an event with `name` to add to the set of events in `schedule` with the given attributes, and `eventID` incrementing by 1, and `event.scheduleID` being `schedule.scheduleID`
  * `editEvent(schedule: Schedule, oldEvent: Event, name: String, startTime: Date, endTime: Date, repeat: RepeatConfig)`
    * **requires**: `oldEvent` is in the set of `Events` of `schedule`
    * **effects**: modifies `oldEvent` in the set of `Events` in `schedule` with the given attributes
  * `deleteEvent(schedule: Schedule, event: Event)`
    * **requires**: `event` is in the set of `Events` of `schedule`
    * **effects**: deletes the `event` in the set of `Events` in `schedule`
  * `addTask(schedule: Schedule, name: String, deadline: Date, expectedCompletionTime: Number, completionLevel: Percent, priority: Percent): (task: Task)`
    * **requires**: `schedule` exists, `completionLevel` is between 0 and 100 (inclusive)
    * **effects**: returns and adds `task` with `name` to the set of `tasks` in `schedule` with the given attributes, with the given `completionLevel`, and `taskID` incrementing by 1, and `task.scheduleID` being `schedule.scheduleID`
  * `editTask(schedule: Schedule, oldTask: Task, name: String, deadline: Date, expectedCompletionTime: Number, completionLevel: Percent, priority: Percent)`
    * **requires**: `oldTask` is in the set of `Tasks` of `schedule`
    * **effects**: modifies `oldTask` in the set of `Tasks` in `schedule` with the given attributes
  * `deleteTask(schedule: Schedule, task: Task)`
    * **requires**: `task` is in the set of `Tasks` of `schedule`
    * **effects**: deletes `task` in the set of `Tasks` in `schedule`
  * `generateSchedule(schedule: Schedule): (scheduleId: Schedule, generatedPlan: GeneratedSchedulePlan | error: Error)`
    * **requires**: `schedule` exists
    * **effects**: Creates `generatedPlan` for `schedule.owner` such that if possible, all given events start, end, and repeat as specified, and task scheduling is optimized by its attributes. Generally, tasks with a sooner deadline, higher priority level, higher expectedCompletionTime, and higher completionLevel are scheduled first. The generated plan details concrete time slots for events and tasks. If doing this is not possible (e.g., due to conflicts), then return an `error`.
* **queries** (All queries return an array of dictionaries. An error is returned as `[{error: String}]`)
  * `_getScheduleByOwner (owner: User): (schedule: Schedule)`
    * **requires**: `true`
    * **effects**: Returns an array `[{schedule: ID}]` for the schedule document associated with a given user owner, or `[{error: String}]` if not found.
  * `_getEventsForSchedule (schedule: Schedule): (event: Event)`
    * **requires**: `schedule` exists
    * **effects**: Returns an array of dictionaries, each `[{event: ID}]`, for all Event IDs linked to the specified schedule, or `[{error: String}]` if the schedule does not exist.
  * `_getTasksForSchedule (schedule: Schedule): (task: Task)`
    * **requires**: `schedule` exists
    * **effects**: Returns an array of dictionaries, each `[{task: ID}]`, for all Task IDs linked to the specified schedule, or `[{error: String}]` if the schedule does not exist.
  * `_getEventDetails (event: Event): (eventDetails: EventDoc)`
    * **requires**: `event` exists
    * **effects**: Returns an array `[{eventDetails: EventDoc}]` for a specific event, or `[{error: String}]` if the event is not found.
  * `_getTaskDetails (task: Task): (taskDetails: TaskDoc)`
    * **requires**: `task` exists
    * **effects**: Returns an array `[{taskDetails: TaskDoc}]` for a specific task, or `[{error: String}]` if the task is not found.
  * `_getAllSchedules (): (schedule: ScheduleDoc)`
    * **requires**: `true`
    * **effects**: Returns an array of dictionaries, each `[{schedule: ScheduleDoc}]`, for all schedule documents.
  * `_getScheduleDetails (schedule: Schedule): (scheduleDetails: ScheduleDoc)`
    * **requires**: `schedule` exists
    * **effects**: Returns an array `[{scheduleDetails: ScheduleDoc}]` for the schedule matching the provided ID, or `[{error: String}]` if not found.
  * `_getAllEvents (): (event: EventDoc)`
    * **requires**: `true`
    * **effects**: Returns an array of dictionaries, each `[{event: EventDoc}]`, for all event documents.
  * `_getAllTasks (): (task: TaskDoc)`
    * **requires**: `true`
    * **effects**: Returns an array of dictionaries, each `[{task: TaskDoc}]`, for all task documents.

***
