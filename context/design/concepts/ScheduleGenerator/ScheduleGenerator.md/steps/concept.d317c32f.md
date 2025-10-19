---
timestamp: 'Sun Oct 19 2025 12:23:36 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_122336.d918adbb.md]]'
content_id: d317c32fe23779a6af7e2770dfbfa4eec2caae0e5d7addbef934123619398b8a
---

# concept: ScheduleGenerator

* **concept** ScheduleGenerator\[User, Time, RepeatTime, Date, Percent]
* **purpose** manages events and tasks for users to automatically generate a schedule that meets their needs
* **principle** Given a set of events and tasks, an optimal schedule for the user is created. When events and tasks are updated and removed, the schedule is regenerated
* **state**
  * a set of `Schedules` with
    * an `owner` of type `User`
    * a `scheduleID` of type `Number` (static attribute, initially -1)
    * a set of `Events`
    * a set of `Tasks`
  * a set of `Events` with
    * a `name` of type `String`
    * an `eventID` of type `Number` (static attribute, initially -1)
    * a `scheduleID` of type `Number`
    * a `startTime` of type `Date`
    * an `endTime` of type `Date`
    * a `repeatDate of type `RepeatDate\`
  * a set of `Tasks` with
    * a `name` of type `String`
    * a `taskID` of type `Number` (static attribute, initially -1)
    * a `scheduleID` of type `Number`
    * a `deadline` of type `Date`
    * an `expectedCompletionTime` of type `Number`
    * a `completionLevel` of type `Percent`
    * a `priority` of type `Percent`
* **actions**
  * `initializeSchedule(owner: User): (schedule: Schedule)`
    * **requires**: `owner` exists
    * **effects**: creates an empty `schedule` with `owner` as `schedule.owner`, with static attribute `scheduleID` incrementing by 1
  * `addEvent(schedule: Schedule, name: String, startTime: Date, endTime: Date, repeatDate: RepeatDate): (event: Event)`
    * **requires**: `schedule` exists
    * **effects**: creates and returns an event with `name` to add to the set of events in the `schedule` with the given attributes, and `eventID` incrementing by 1, and `event.scheduleID` being `schedule.scheduleID`
  * `editEvent(schedule: Schedule, oldEvent: Event, name: String, startTime: Date, endTime: Date, repeatDate: RepeatDate)`
    * **requires**: `oldEvent` is in the set of `Events` of `schedule`
    * **effects**: modifies `oldEvent` in the set of `Events` in `schedule` with the given attributes
  * `deleteEvent(schedule: Schedule, event: Event)`
    * **requires**: `event` is in the set of `Events` of `schedule`
    * **effects**: deletes the `event` in the set of `Events` in `schedule`
  * `addTask(schedule: Schedule, name: String, deadline: Date, expectedCompletionTime: Number, priority: Percent): (task: Task)`
    * **requires**: `schedule` exists
    * **effects**: returns and adds `task` with `name` to the set of `tasks` in `schedule` with the given attributes and 0% for `completionLevel`, and `taskID` incrementing by 1, and `task.scheduleID` being `schedule.scheduleID`
  * `editTask(schedule: Schedule, name: String, oldTask: Task, deadline: Date, expectedCompletionTime: Number, completionLevel: Percent priority: Percent)`
    * **requires**: `oldTask` is in the set of `Tasks` of `schedule`
    * **effects**: modifies `oldTask` in the set of `Tasks` in `schedule` with the given attributes
  * `deleteTask(schedule: Schedule, task: Task)`
    * **requires**: `task` is in the set of `Tasks` of `schedule`
    * **effects**: deletes `task` in the set of `Tasks` in `schedule`
  * `generateSchedule(schedule: Schedule): (newSchedule: Schedule | error: Error)`
    * **requires**: `schedule` exists
    * **effects**: Creates `newSchedule` for `schedule.owner` such that if possible, all given events start, end, and repeat as specified, and task scheduling is optimized by its attributes. Generally, tasks with a sooner deadline, higher priority level, higher expectedCompletionTime, and higher completionTime are scheduled first. If doing this is not possible, then return an `error`.
