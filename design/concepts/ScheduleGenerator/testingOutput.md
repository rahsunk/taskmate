Check file:///Users/rahsunkomatsuzaki-fields/Desktop/MIT/academic/Y3/Fall/6.1040/taskmate/src/concepts/ScheduleGenerator/ScheduleGenerator.test.ts
running 3 tests from ./src/concepts/ScheduleGenerator/ScheduleGenerator.test.ts
ScheduleGeneratorConcept - Operational Principle ...
------- output -------

--- Test: Operational Principle ---
----- output end -----
  1. Initialize Schedule for Alice ...
------- output -------
Action: initializeSchedule({ owner: "user:Alice" })
Result: { schedule: "019a3cc7-939a-7f45-b34b-dedef62625b8" }
Query _getScheduleByOwner({ owner: "user:Alice" }): { schedule: "019a3cc7-939a-7f45-b34b-dedef62625b8" }
----- output end -----
  1. Initialize Schedule for Alice ... ok (122ms)
  2. Add Events and Tasks ...
------- output -------
Action: addEvent({ schedule: "019a3cc7-939a-7f45-b34b-dedef62625b8", name: "Daily Standup", startTime: 2025-11-01T13:00:00.000Z, endTime: 2025-11-01T14:00:00.000Z, repeat: {"frequency":"DAILY"} })
Result: { event: "019a3cc7-93fe-7fc7-b801-fc575ea382e9" }
Action: addEvent({ schedule: "019a3cc7-939a-7f45-b34b-dedef62625b8", name: "Weekly Team Meeting", startTime: 2025-11-04T19:00:00.000Z, endTime: 2025-11-04T20:00:00.000Z, repeat: {"frequency":"WEEKLY","daysOfWeek":[2]} })
Result: { event: "019a3cc7-9442-7b35-a5bd-ceac9c9fe35d" }
Action: addTask({ schedule: "019a3cc7-939a-7f45-b34b-dedef62625b8", name: "Finish Report", deadline: 2025-11-01T21:00:00.000Z, expectedCompletionTime: 120, completionLevel: 0, priority: 90 })
Result: { task: "019a3cc7-948b-7f61-abb5-c7dea4f8300f" }
Action: addTask({ schedule: "019a3cc7-939a-7f45-b34b-dedef62625b8", name: "Review PRs", deadline: 2025-11-03T17:00:00.000Z, expectedCompletionTime: 60, completionLevel: 50, priority: 50 })
Result: { task: "019a3cc7-94dd-7840-ad42-7fa0b7585a31" }
Query _getEventsForSchedule({ schedule: "019a3cc7-939a-7f45-b34b-dedef62625b8" }): { event: ["019a3cc7-93fe-7fc7-b801-fc575ea382e9","019a3cc7-9442-7b35-a5bd-ceac9c9fe35d"] }
Query _getTasksForSchedule({ schedule: "019a3cc7-939a-7f45-b34b-dedef62625b8" }): { task: ["019a3cc7-948b-7f61-abb5-c7dea4f8300f","019a3cc7-94dd-7840-ad42-7fa0b7585a31"] }
----- output end -----
  2. Add Events and Tasks ... ok (363ms)
  3. Generate Schedule and Verify Basic Content and Task Priority ...
------- output -------
Action: generateSchedule({ schedule: "019a3cc7-939a-7f45-b34b-dedef62625b8" })
Result: Generated plan with 10 items
Schedule generation verified (basic content and task deadline adherence).
----- output end -----
  3. Generate Schedule and Verify Basic Content and Task Priority ... ok (85ms)
  4. Edit an Event and Regenerate Schedule to see changes ...
------- output -------
Action: editEvent({ schedule: "019a3cc7-939a-7f45-b34b-dedef62625b8", oldEvent: "019a3cc7-93fe-7fc7-b801-fc575ea382e9", name: "Daily Standup (Short)", startTime: 2025-11-01T13:00:00.000Z, endTime: 2025-11-01T13:30:00.000Z, repeat: {"frequency":"DAILY"} })
Result: {}
Action: generateSchedule({ schedule: "019a3cc7-939a-7f45-b34b-dedef62625b8" }) (after event edit)
Event edit and schedule regeneration verified.
----- output end -----
  4. Edit an Event and Regenerate Schedule to see changes ... ok (104ms)
  5. Edit a Task to be 100% complete and Regenerate Schedule ...
------- output -------
Action: editTask({ schedule: "019a3cc7-939a-7f45-b34b-dedef62625b8", oldTask: "019a3cc7-948b-7f61-abb5-c7dea4f8300f", name: "Finish Report", deadline: 2025-11-01T21:00:00.000Z, expectedCompletionTime: 120, completionLevel: 100, priority: 90 })
Result: {}
Action: generateSchedule({ schedule: "019a3cc7-939a-7f45-b34b-dedef62625b8" }) (after task completion edit)
Task completion edit and schedule regeneration verified.
----- output end -----
  5. Edit a Task to be 100% complete and Regenerate Schedule ... ok (132ms)
  6. Delete a Task and Regenerate Schedule to confirm removal ...
------- output -------
Action: deleteTask({ schedule: "019a3cc7-939a-7f45-b34b-dedef62625b8", task: "019a3cc7-94dd-7840-ad42-7fa0b7585a31" })
Result: {}
Action: generateSchedule({ schedule: "019a3cc7-939a-7f45-b34b-dedef62625b8" }) (after task delete)
Task deletion and schedule regeneration verified.
----- output end -----
  6. Delete a Task and Regenerate Schedule to confirm removal ... ok (104ms)
ScheduleGeneratorConcept - Operational Principle ... ok (1s)
ScheduleGeneratorConcept - Error and Edge Cases ...
------- output -------

--- Test: Error and Edge Cases ---
----- output end -----
  1. Initialize schedule, then try to initialize again for the same user ...
------- output -------
Action: initializeSchedule({ owner: "user:Bob" })
Result: { schedule: "019a3cc7-99a9-7678-aa7b-e6bf9b12c0ee" }
Action: initializeSchedule({ owner: "user:Bob" }) (again)
Result: { schedule: "019a3cc7-99a9-7678-aa7b-e6bf9b12c0ee" }
----- output end -----
  1. Initialize schedule, then try to initialize again for the same user ... ok (111ms)
  2. Add Event with invalid times ...
------- output -------
Action: addEvent({ schedule: "019a3cc7-99a9-7678-aa7b-e6bf9b12c0ee", name: "Invalid Event", startTime: 2025-11-01T14:00:00.000Z, endTime: 2025-11-01T13:00:00.000Z, repeat: {"frequency":"NONE"} })
Result: { error: "Event start time must be before end time." }
----- output end -----
  2. Add Event with invalid times ... ok (19ms)
  3. Add Event with WEEKLY repeat missing daysOfWeek ...
------- output -------
Action: addEvent({ schedule: "019a3cc7-99a9-7678-aa7b-e6bf9b12c0ee", name: "Invalid Weekly Event", startTime: 2025-11-01T14:00:00.000Z, endTime: 2025-11-01T15:00:00.000Z, repeat: {"frequency":"WEEKLY"} })
Result: { error: "Weekly repeat events must specify at least one day of the week (0=Sunday, 6=Saturday)." }
----- output end -----
  3. Add Event with WEEKLY repeat missing daysOfWeek ... ok (19ms)
  4. Add Task with invalid expectedCompletionTime ...
------- output -------
Action: addTask({ schedule: "019a3cc7-99a9-7678-aa7b-e6bf9b12c0ee", name: "Invalid Task", deadline: 2025-11-02T22:00:00.000Z, expectedCompletionTime: 0, completionLevel: 0, priority: 50 })
Result: { error: "Expected completion time must be positive." }
----- output end -----
  4. Add Task with invalid expectedCompletionTime ... ok (33ms)
  5. Add Task with invalid priority ...
------- output -------
Action: addTask({ schedule: "019a3cc7-99a9-7678-aa7b-e6bf9b12c0ee", name: "Invalid Priority Task", deadline: 2025-11-02T22:00:00.000Z, expectedCompletionTime: 60, completionLevel: 0, priority: 150 })
Result: { error: "Priority must be between 0 and 100." }
----- output end -----
  5. Add Task with invalid priority ... ok (19ms)
  6. Add Task with invalid completionLevel ...
------- output -------
Action: addTask({ schedule: "019a3cc7-99a9-7678-aa7b-e6bf9b12c0ee", name: "Invalid Completion Task", deadline: 2025-11-02T22:00:00.000Z, expectedCompletionTime: 60, completionLevel: -10, priority: 50 })
Result: { error: "Completion level must be between 0 and 100." }
----- output end -----
  6. Add Task with invalid completionLevel ... ok (19ms)
  7. Try to edit/delete non-existent event or with wrong schedule context ...
------- output -------
Action: editEvent({ schedule: "019a3cc7-99a9-7678-aa7b-e6bf9b12c0ee", oldEvent: "nonExistentEvent123", name: "Dummy", startTime: 2025-11-01T14:00:00.000Z, endTime: 2025-11-01T15:00:00.000Z, repeat: {"frequency":"NONE"} })
Result: { error: "Event with ID nonExistentEvent123 not found or not associated with schedule 019a3cc7-99a9-7678-aa7b-e6bf9b12c0ee." }
Action: deleteEvent({ schedule: "019a3cc7-99a9-7678-aa7b-e6bf9b12c0ee", event: "nonExistentEvent123" })
Result: { error: "Event with ID nonExistentEvent123 not found or not associated with schedule 019a3cc7-99a9-7678-aa7b-e6bf9b12c0ee." }
----- output end -----
  7. Try to edit/delete non-existent event or with wrong schedule context ... ok (159ms)
  8. Try to delete event with non-existent schedule ID ...
------- output -------
Action: deleteEvent({ schedule: "nonExistentSchedule123", event: "019a3cc7-9acd-7d73-a45d-319ea80ef804" })
Result: { error: "Schedule with ID nonExistentSchedule123 not found." }
----- output end -----
  8. Try to delete event with non-existent schedule ID ... ok (19ms)
  9. Generate Schedule with impossible tasks (total time conflict) ...
------- output -------
Action: addEvent({ schedule: "019a3cc7-99a9-7678-aa7b-e6bf9b12c0ee", name: "Blocking Event", startTime: 2025-10-31T12:00:00.000Z, endTime: 2025-11-01T02:00:00.000Z, repeat: {"frequency":"NONE"} })
Result: { event: "019a3cc7-9b3b-7c34-ad4e-8c5fc3f27a94" }
Action: addTask({ schedule: "019a3cc7-99a9-7678-aa7b-e6bf9b12c0ee", name: "Impossible Task", deadline: 2025-11-01T03:00:00.000Z, expectedCompletionTime: 60, completionLevel: 0, priority: 100 })
Result: { task: "019a3cc7-9b89-77da-9c89-3b832f551e24" }
Action: generateSchedule({ schedule: "019a3cc7-99a9-7678-aa7b-e6bf9b12c0ee" })
Warning: Could not fully schedule 1 tasks for schedule 019a3cc7-99a9-7678-aa7b-e6bf9b12c0ee:
  - Impossible Task (ID: 019a3cc7-9b89-77da-9c89-3b832f551e24, Deadline: 10/31/2025)
Result: { error: "Not all tasks could be scheduled within the planning horizon or available time slots." }
----- output end -----
  9. Generate Schedule with impossible tasks (total time conflict) ... ok (397ms)
ScheduleGeneratorConcept - Error and Edge Cases ... ok (1s)
ScheduleGeneratorConcept - Query Functionality ...
------- output -------

--- Test: Query Functionality ---
Initialized schedule for Charlie: 019a3cc7-9f52-74e8-82a7-f0e203de9f8a
Added event: 019a3cc7-9f9c-7f7c-a71e-f392bef551b0
Added task: 019a3cc7-9fe7-7d5c-ad13-7ff65dca494c
----- output end -----
  1. _getScheduleByOwner (Positive & Negative) ...
------- output -------
Query: _getScheduleByOwner({ owner: "user:Charlie" })
Result: { schedule: "019a3cc7-9f52-74e8-82a7-f0e203de9f8a" }
Query: _getScheduleByOwner({ owner: "user:NonExistent" })
Result: { error: "No schedule found for owner user:NonExistent." }
----- output end -----
  1. _getScheduleByOwner (Positive & Negative) ... ok (42ms)
  2. _getEventsForSchedule ...
------- output -------
Query: _getEventsForSchedule({ schedule: "019a3cc7-9f52-74e8-82a7-f0e203de9f8a" })
Result: { event: ["019a3cc7-9f9c-7f7c-a71e-f392bef551b0"] }
----- output end -----
  2. _getEventsForSchedule ... ok (36ms)
  3. _getTasksForSchedule ...
------- output -------
Query: _getTasksForSchedule({ schedule: "019a3cc7-9f52-74e8-82a7-f0e203de9f8a" })
Result: { task: ["019a3cc7-9fe7-7d5c-ad13-7ff65dca494c"] }
----- output end -----
  3. _getTasksForSchedule ... ok (37ms)
  4. _getEventDetails (Positive & Negative) ...
------- output -------
Query: _getEventDetails({ event: "019a3cc7-9f9c-7f7c-a71e-f392bef551b0" })
Result: { eventDetails: [{"_id":"019a3cc7-9f9c-7f7c-a71e-f392bef551b0","name":"Daily Scrum","eventID":1,"scheduleID":1,"startTime":"2025-11-01T14:00:00.000Z","endTime":"2025-11-01T15:00:00.000Z","repeat":{"frequency":"DAILY"}}] }
Query: _getEventDetails({ event: "nonExistentEventDetails" })
Result: { error: "Event with ID nonExistentEventDetails not found." }
----- output end -----
  4. _getEventDetails (Positive & Negative) ... ok (37ms)
  5. _getTaskDetails (Positive & Negative) ...
------- output -------
Query: _getTaskDetails({ task: "019a3cc7-9fe7-7d5c-ad13-7ff65dca494c" })
Result: { taskDetails: [{"_id":"019a3cc7-9fe7-7d5c-ad13-7ff65dca494c","name":"Write Docs","taskID":1,"scheduleID":1,"deadline":"2025-11-02T22:00:00.000Z","expectedCompletionTime":60,"completionLevel":0,"priority":70}] }
Query: _getTaskDetails({ task: "nonExistentTaskDetails" })
Result: { error: "Task with ID nonExistentTaskDetails not found." }
----- output end -----
  5. _getTaskDetails (Positive & Negative) ... ok (61ms)
  6. _getAllSchedules ...
------- output -------
Query: _getAllSchedules()
Result: Found 1 schedules.
----- output end -----
  6. _getAllSchedules ... ok (19ms)
  7. _getScheduleDetails (Positive & Negative) ...
------- output -------
Query: _getScheduleDetails({ schedule: "019a3cc7-9f52-74e8-82a7-f0e203de9f8a" })
Result: { scheduleDetails: [{"_id":"019a3cc7-9f52-74e8-82a7-f0e203de9f8a","owner":"user:Charlie","scheduleID":1}] }
Query: _getScheduleDetails({ schedule: "nonExistentScheduleDetails" })
Result: { error: "Schedule with ID nonExistentScheduleDetails not found." }
----- output end -----
  7. _getScheduleDetails (Positive & Negative) ... ok (37ms)
  8. _getAllEvents ...
------- output -------
Query: _getAllEvents()
Result: Found 1 events.
----- output end -----
  8. _getAllEvents ... ok (19ms)
  9. _getAllTasks ...
------- output -------
Query: _getAllTasks()
Result: Found 1 tasks.
----- output end -----
  9. _getAllTasks ... ok (19ms)
ScheduleGeneratorConcept - Query Functionality ... ok (1s)

ok | 3 passed (24 steps) | 0 failed (4s)
