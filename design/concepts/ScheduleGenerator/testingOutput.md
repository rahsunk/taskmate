Check file:///Users/rahsunkomatsuzaki-fields/Desktop/MIT/academic/Y3/Fall/6.1040/taskmate/src/concepts/ScheduleGenerator/ScheduleGenerator.test.ts
running 3 tests from ./src/concepts/ScheduleGenerator/ScheduleGenerator.test.ts
ScheduleGeneratorConcept - Basic CRUD for Schedules, Events, and Tasks ...
  initializeSchedule: creates a new schedule ...
------- output -------
Action: initializeSchedule for owner user:Alice
Output: Created schedule ID: 0199febf-58e4-7d5a-9d7f-5d681a5beb1b
----- output end -----
  initializeSchedule: creates a new schedule ... ok (98ms)
  addEvent: adds an event to the schedule ...
------- output -------
Action: addEvent to schedule 0199febf-58e4-7d5a-9d7f-5d681a5beb1b - Team Meeting
Output: Added event ID: 0199febf-593d-744d-89b8-e8cd81366282
----- output end -----
  addEvent: adds an event to the schedule ... ok (88ms)
  addEvent: fails if schedule does not exist ...
------- output -------
Action: addEvent to non-existent schedule nonExistent
Output: Error: Schedule with ID nonExistent not found.
----- output end -----
  addEvent: fails if schedule does not exist ... ok (18ms)
  editEvent: modifies an existing event ...
------- output -------
Action: editEvent 0199febf-593d-744d-89b8-e8cd81366282 to new details
Output: Event edited successfully
----- output end -----
  editEvent: modifies an existing event ... ok (82ms)
  editEvent: fails if event not associated with schedule ...
------- output -------
Action: editEvent 0199febf-593d-744d-89b8-e8cd81366282 with wrong schedule 0199febf-59e8-7940-8392-e1df8c877d32
Output: Error: Event with ID 0199febf-593d-744d-89b8-e8cd81366282 not found or not associated with schedule 0199febf-59e8-7940-8392-e1df8c877d32.
----- output end -----
  editEvent: fails if event not associated with schedule ... ok (78ms)
  deleteEvent: removes an event from the schedule ...
------- output -------
Added second event ID: 0199febf-5a48-786d-924f-db7abefd4219
Action: deleteEvent 0199febf-593d-744d-89b8-e8cd81366282 from schedule 0199febf-58e4-7d5a-9d7f-5d681a5beb1b
Output: Event deleted successfully
----- output end -----
  deleteEvent: removes an event from the schedule ... ok (170ms)
  deleteEvent: fails if event not found or not associated ...
------- output -------
Action: deleteEvent nonExistentEvent
Output: Error: Event with ID nonExistentEvent not found or not associated with schedule 0199febf-58e4-7d5a-9d7f-5d681a5beb1b.
----- output end -----
  deleteEvent: fails if event not found or not associated ... ok (35ms)
  addTask: adds a task to the schedule with 0% completion ...
------- output -------
Action: addTask to schedule 0199febf-58e4-7d5a-9d7f-5d681a5beb1b - Project Report (0% completed)
Output: Added task ID: 0199febf-5b19-7d1f-92ac-4782e518fb55
----- output end -----
  addTask: adds a task to the schedule with 0% completion ... ok (91ms)
  addTask: adds a task to the schedule with 25% completion ...
------- output -------
Action: addTask to schedule 0199febf-58e4-7d5a-9d7f-5d681a5beb1b - Research Paper (25% completed)
Output: Added task ID: 0199febf-5b73-7f03-a252-a0cd2a9d1f9f
----- output end -----
  addTask: adds a task to the schedule with 25% completion ... ok (74ms)
  addTask: fails with invalid expectedCompletionTime ...
------- output -------
Action: addTask with invalid expectedCompletionTime
Output: Error: Expected completion time must be positive.
----- output end -----
  addTask: fails with invalid expectedCompletionTime ... ok (18ms)
  addTask: fails with invalid completionLevel (too high) ...
------- output -------
Action: addTask with invalid completionLevel (101)
Output: Error: Completion level must be between 0 and 100.
----- output end -----
  addTask: fails with invalid completionLevel (too high) ... ok (18ms)
  addTask: fails with invalid completionLevel (too low) ...
------- output -------
Action: addTask with invalid completionLevel (-1)
Output: Error: Completion level must be between 0 and 100.
----- output end -----
  addTask: fails with invalid completionLevel (too low) ... ok (17ms)
  editTask: modifies an existing task ...
------- output -------
Action: editTask 0199febf-5b19-7d1f-92ac-4782e518fb55 with new details
Output: Task edited successfully
----- output end -----
  editTask: modifies an existing task ... ok (83ms)
  editTask: fails with invalid priority ...
------- output -------
Action: editTask with invalid priority
Output: Error: Priority must be between 0 and 100.
----- output end -----
  editTask: fails with invalid priority ... ok (37ms)
  deleteTask: removes a task from the schedule ...
------- output -------
Added second task ID: 0199febf-5c6c-75af-b252-dde77b863243
Action: deleteTask 0199febf-5b19-7d1f-92ac-4782e518fb55 from schedule 0199febf-58e4-7d5a-9d7f-5d681a5beb1b
Output: Task deleted successfully
----- output end -----
  deleteTask: removes a task from the schedule ... ok (167ms)
  deleteTask: fails if task not found or not associated ...
------- output -------
Action: deleteTask nonExistentTask
Output: Error: Task with ID nonExistentTask not found or not associated with schedule 0199febf-58e4-7d5a-9d7f-5d681a5beb1b.
----- output end -----
  deleteTask: fails if task not found or not associated ... ok (35ms)
ScheduleGeneratorConcept - Basic CRUD for Schedules, Events, and Tasks ... ok (1s)
ScheduleGeneratorConcept - generateSchedule operational principle and scenarios ...
  Operational Principle: Generate a simple schedule ...
------- output -------

--- Operational Principle Test ---
Initialized schedule for user:Bob: 0199febf-5f6a-7ed4-91f9-4957cf968674
Added daily event: 0199febf-5fba-7dcd-abcd-46e9be613cf6
Added high priority task: 0199febf-6003-72c7-b912-2324968592ce
Added low priority task: 0199febf-6049-703d-9d0b-45b98b1c2218
Action: generateSchedule for 0199febf-5f6a-7ed4-91f9-4957cf968674
Output: Generated Plan:
 1. task: Review Documents from 10/19/2025, 7:12:59 PM to 10/19/2025, 8:12:59 PM
 2. event: Daily Sync from 10/20/2025, 9:00:00 AM to 10/20/2025, 10:00:00 AM
 3. task: Prepare Presentation from 10/20/2025, 10:00:00 AM to 10/20/2025, 1:00:00 PM
 4. event: Daily Sync from 10/21/2025, 9:00:00 AM to 10/21/2025, 10:00:00 AM
 5. event: Daily Sync from 10/22/2025, 9:00:00 AM to 10/22/2025, 10:00:00 AM
 6. event: Daily Sync from 10/23/2025, 9:00:00 AM to 10/23/2025, 10:00:00 AM
 7. event: Daily Sync from 10/24/2025, 9:00:00 AM to 10/24/2025, 10:00:00 AM
 8. event: Daily Sync from 10/25/2025, 9:00:00 AM to 10/25/2025, 10:00:00 AM
 9. event: Daily Sync from 10/26/2025, 9:00:00 AM to 10/26/2025, 10:00:00 AM
----- output end -----
  Operational Principle: Generate a simple schedule ... ok (346ms)
  Scenario 1: Conflicts and Unscheduled Tasks (Expect Error) ...
------- output -------

--- Scenario 1: Conflicts and Unscheduled Tasks ---
Initialized schedule for user:Charlie: 0199febf-60b6-7c8e-b94d-c7ab77be0b9a
Added daily all-day work block event (8 AM - 9 PM).
Added a long task that might not fit (2 hours expected).
Action: generateSchedule for 0199febf-60b6-7c8e-b94d-c7ab77be0b9a
Warning: Could not fully schedule 1 tasks for schedule 0199febf-60b6-7c8e-b94d-c7ab77be0b9a:
  - Long Task for Busy Schedule (ID: 0199febf-6127-751a-8db0-f5ec8bba076b, Deadline: 10/20/2025)
Output: Error: Not all tasks could be scheduled within the planning horizon or available time slots.
----- output end -----
  Scenario 1: Conflicts and Unscheduled Tasks (Expect Error) ... ok (208ms)
  Scenario 2: Task Prioritization Order ...
------- output -------

--- Scenario 2: Task Prioritization Order ---
Initialized schedule for user:David: 0199febf-6187-77a0-baf3-9f435d1b0382
Action: generateSchedule for 0199febf-6187-77a0-baf3-9f435d1b0382
Output: Generated Plan (tasks only):
 1. Task A - High Priority, Soon Deadline, Partial from 10/19/2025, 7:12:59 PM to 10/19/2025, 7:42:59 PM
 2. Task B - Low Priority, Soon Deadline from 10/19/2025, 7:42:59 PM to 10/19/2025, 8:42:59 PM
 3. Task D - Medium Priority, Later Deadline, Short from 10/19/2025, 8:42:59 PM to 10/19/2025, 9:12:59 PM
 4. Task C - High Priority, Later Deadline, Long from 10/20/2025, 8:00:00 AM to 10/20/2025, 10:00:00 AM
 5. Task E - Very Late Deadline, High Priority from 10/20/2025, 10:00:00 AM to 10/20/2025, 11:00:00 AM
----- output end -----
  Scenario 2: Task Prioritization Order ... ok (368ms)
  Scenario 3: Repeating Events for different days & Monthly/Yearly ...
------- output -------

--- Scenario 3: Repeating Events for different days & Monthly/Yearly ---
Initialized schedule for user:Eve: 0199febf-62fb-78f2-a7fc-dfd780da8edc
Added weekly event for Mon & Wed.
Added monthly event (15th of month).
Added yearly event (Jan 1st).
Action: generateSchedule for 0199febf-62fb-78f2-a7fc-dfd780da8edc
Output: Generated Plan (events only):
 1. Weekly Sync (Mon/Wed) on 10/20/2025 at 10:00:00 AM
 2. Weekly Sync (Mon/Wed) on 10/22/2025 at 10:00:00 AM
----- output end -----
  Scenario 3: Repeating Events for different days & Monthly/Yearly ... ok (262ms)
  Scenario 4: Task completionLevel and remaining time ...
------- output -------

--- Scenario 4: Task completionLevel and remaining time ---
Initialized schedule for user:Frank: 0199febf-63fe-782b-aabc-ae29988d342f
Added Partial Task (ID: 0199febf-6435-7e1e-866d-73e210f7b75b)
Added Completed Task (ID: 0199febf-646e-708f-9c0d-edb242385998)
Action: generateSchedule for 0199febf-63fe-782b-aabc-ae29988d342f
Output: Generated Plan (tasks only):
 1. Partial Task from 10/19/2025, 7:13:00 PM to 10/19/2025, 7:43:00 PM
 2. Completed Task (Completed) from 10/21/2025, 12:00:00 PM to 10/21/2025, 12:00:00 PM
----- output end -----
  Scenario 4: Task completionLevel and remaining time ... ok (207ms)
ScheduleGeneratorConcept - generateSchedule operational principle and scenarios ... ok (1s)
ScheduleGeneratorConcept - Query Actions ...
  _getScheduleByOwner: retrieves schedule ID for owner ...
------- output -------
Action: _getScheduleByOwner for user:Grace
Output: Retrieved schedule: 0199febf-66e9-7c9e-99ac-8e183e4308a6
----- output end -----
  _getScheduleByOwner: retrieves schedule ID for owner ... ok (110ms)
  _getEventsForSchedule: retrieves events for a schedule ...
------- output -------
Added event 0199febf-6756-7ed9-9084-5fffcda9e7a9 to 0199febf-66e9-7c9e-99ac-8e183e4308a6
Action: _getEventsForSchedule for 0199febf-66e9-7c9e-99ac-8e183e4308a6
Output: Retrieved events: 0199febf-6756-7ed9-9084-5fffcda9e7a9
----- output end -----
  _getEventsForSchedule: retrieves events for a schedule ... ok (126ms)
  _getTasksForSchedule: retrieves tasks for a schedule ...
------- output -------
Added task 0199febf-67d8-70a1-931d-9792a7d2d6a7 to 0199febf-66e9-7c9e-99ac-8e183e4308a6
Action: _getTasksForSchedule for 0199febf-66e9-7c9e-99ac-8e183e4308a6
Output: Retrieved tasks: 0199febf-67d8-70a1-931d-9792a7d2d6a7
----- output end -----
  _getTasksForSchedule: retrieves tasks for a schedule ... ok (124ms)
  _getEventDetails: retrieves full event details ...
------- output -------
Action: _getEventDetails for 0199febf-6756-7ed9-9084-5fffcda9e7a9
Output: Retrieved event details: Event A
----- output end -----
  _getEventDetails: retrieves full event details ... ok (34ms)
  _getTaskDetails: retrieves full task details ...
------- output -------
Action: _getTaskDetails for 0199febf-67d8-70a1-931d-9792a7d2d6a7
Output: Retrieved task details: Task X
----- output end -----
  _getTaskDetails: retrieves full task details ... ok (40ms)
ScheduleGeneratorConcept - Query Actions ... ok (957ms)

ok | 3 passed (26 steps) | 0 failed (4s)
