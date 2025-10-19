---
timestamp: 'Sun Oct 19 2025 17:59:54 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_175954.3351427e.md]]'
content_id: 697e9840dcc8861356a0001cfcdde22fb20bebfb131e3822a1384fb157352f89
---

# concept: ScheduleGenerator (Updated Specification)

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
