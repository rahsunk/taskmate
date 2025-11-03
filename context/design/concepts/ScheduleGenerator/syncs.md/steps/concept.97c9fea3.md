---
timestamp: 'Mon Nov 03 2025 02:56:38 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251103_025638.faf55d4f.md]]'
content_id: 97c9fea3af35623e0470772ca20290d035e169efcca5e89166ea51a84c2abe5b
---

# concept: ScheduleGenerator

* **concept** ScheduleGenerator\[User, Time, RepeatTime, Date, Percent]
* **purpose** manages events and tasks for users to automatically generate a schedule that meets their needs
* **principle** Given a set of events and tasks, an optimal schedule for the user is created. When events and tasks are updated and removed, the schedule is regenerated
* **state**
  * a set of `Schedules` with
    * an `owner` of type `User`
    * a set of `Events`
    * a set of `Tasks`
    * a `timestamp` of type `Number` (static attribute, initially -1)
  * a set of `Events` with
    * a `name` of type `String`
    * a `schedulePointer` of type `Schedule`
    * a `startTime` of type `Time`
    * an `endTime` of type `Time`
    * a `repeatTime` of type `RepeatTime`
  * a set of `Tasks` with
    * a `name` of type `String`
    * a `schedulePointer` of type `Schedule`
    * a `deadline` of type `Date`
    * an `expectedCompletionTime` of type `Number`
    * a `completionLevel` of type `Percent`
    * a `priority` of type `Percent`
* **actions**
  * `initializeSchedule(owner: User): (schedule: Schedule)`
    * **requires**: `owner` exists
    * **effects**: creates an empty `schedule` with `owner` as `schedule.owner`, with static attribute `schedule.timestamp` incrementing by 1
  * `addEvent(schedule: Schedule, name: String, startTime: Time, endTime: Time, repeatTime: RepeatTime): (event: Event)`
    * **requires**: `schedule` exists
    * **effects**: creates and returns an event with `name` to add to the set of events in `schedule` with the given attributes, with `schedulePointer` pointing to `schedule`
  * `editEvent(schedule: Schedule, oldEvent: Event, name: String, startTime: Time, endTime: Time, repeatTime: RepeatTime)`
    * **requires**: `oldEvent` is in the set of `Events` of `schedule`
    * **effects**: modifies `oldEvent` in the set of `Events` in `schedule` with the given attributes
  * `deleteEvent(schedule: Schedule, event: Event)`
    * **requires**: `event` is in the set of `Events` of `schedule`
    * **effects**: deletes the `event` in the set of `Events` in `schedule`
  * `addTask(schedule: Schedule, name: String, deadline: Date, expectedCompletionTime: Number, priority: Percent): (task: Task)`
    * **requires**: `schedule` exists
    * **effects**: returns and adds `task` with `name` to the set of `tasks` in `schedule` with the given attributes and 0% for `completionLevel`, with `schedulePointer` pointing to `schedule`
  * `editTask(schedule: Schedule, name: String, oldTask: Task, deadline: Date, expectedCompletionTime: Number, completionLevel: Percent priority: Percent)`
    * **requires**: `oldTask` is in the set of `Tasks` of `schedule`
    * **effects**: modifies `oldTask` in the set of `Tasks` in `schedule` with the given attributes
  * `deleteTask(schedule: Schedule, task: Task)`
    * **requires**: `task` is in the set of `Tasks` of `schedule`
    * **effects**: deletes `task` in the set of `Tasks` in `schedule`
  * `generateSchedule(schedule: Schedule): (newSchedule: Schedule | e: Error)`
    * **requires**: `schedule` exists
    * **effects**: Creates `newSchedule` for `schedule.owner` such that if possible, all given events start, end, and repeat as specified, and task scheduling is optimized by its attributes. Generally, tasks with a sooner deadline, higher priority level, higher expectedCompletionTime, and higher completionTime are scheduled first. If doing this is not possible, then return an error.
