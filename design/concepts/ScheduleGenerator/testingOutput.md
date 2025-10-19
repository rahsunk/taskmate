Check file:///Users/rahsunkomatsuzaki-fields/Desktop/MIT/academic/Y3/Fall/6.1040/taskmate/src/concepts/ScheduleGenerator/ScheduleGenerator.test.ts
running 3 tests from ./src/concepts/ScheduleGenerator/ScheduleGenerator.test.ts
ScheduleGeneratorConcept - Basic CRUD for Schedules, Events, and Tasks ...
  initializeSchedule: creates a new schedule ...
------- output -------
Action: initializeSchedule for owner user:Alice
Output: Created schedule ID: 0199fd8a-b105-74e7-8a23-aec6403fd86f
----- output end -----
  initializeSchedule: creates a new schedule ... ok (111ms)
  addEvent: adds an event to the schedule ...
------- output -------
Action: addEvent to schedule 0199fd8a-b105-74e7-8a23-aec6403fd86f - Team Meeting
Output: Added event ID: 0199fd8a-b16d-7edc-a7e0-067054c00cd2
----- output end -----
  addEvent: adds an event to the schedule ... ok (101ms)
  addEvent: fails if schedule does not exist ...
------- output -------
Action: addEvent to non-existent schedule nonExistent
Output: Error: Schedule with ID nonExistent not found.
----- output end -----
  addEvent: fails if schedule does not exist ... ok (19ms)
  editEvent: modifies an existing event ...
------- output -------
Action: editEvent 0199fd8a-b16d-7edc-a7e0-067054c00cd2 to new details
Output: Event edited successfully
----- output end -----
  editEvent: modifies an existing event ... ok (96ms)
  editEvent: fails if event not associated with schedule ...
------- output -------
Action: editEvent 0199fd8a-b16d-7edc-a7e0-067054c00cd2 with wrong schedule 0199fd8a-b22f-7d93-93e6-f5aedb9476ab
Output: Error: Event with ID 0199fd8a-b16d-7edc-a7e0-067054c00cd2 not found or not associated with schedule 0199fd8a-b22f-7d93-93e6-f5aedb9476ab.
----- output end -----
  editEvent: fails if event not associated with schedule ... ok (82ms)
  deleteEvent: removes an event from the schedule ...
------- output -------
Added second event ID: 0199fd8a-b294-7442-8a59-e120a4e710f2
Action: deleteEvent 0199fd8a-b16d-7edc-a7e0-067054c00cd2 from schedule 0199fd8a-b105-74e7-8a23-aec6403fd86f
Output: Event deleted successfully
----- output end -----
  deleteEvent: removes an event from the schedule ... ok (182ms)
  deleteEvent: fails if event not found or not associated ...
------- output -------
Action: deleteEvent nonExistentEvent
Output: Error: Event with ID nonExistentEvent not found or not associated with schedule 0199fd8a-b105-74e7-8a23-aec6403fd86f.
----- output end -----
  deleteEvent: fails if event not found or not associated ... ok (38ms)
  addTask: adds a task to the schedule with 0% completion ...
------- output -------
Action: addTask to schedule 0199fd8a-b105-74e7-8a23-aec6403fd86f - Project Report (0% completed)
Output: Added task ID: 0199fd8a-b370-7a5c-bc68-1752e2a95f7a
----- output end -----
  addTask: adds a task to the schedule with 0% completion ... ok (97ms)
  addTask: adds a task to the schedule with 25% completion ...
------- output -------
Action: addTask to schedule 0199fd8a-b105-74e7-8a23-aec6403fd86f - Research Paper (25% completed)
Output: Added task ID: 0199fd8a-b3d2-7ec6-aa57-cbd69dce1557
----- output end -----
  addTask: adds a task to the schedule with 25% completion ... ok (82ms)
  addTask: fails with invalid expectedCompletionTime ...
------- output -------
Action: addTask with invalid expectedCompletionTime
Output: Error: Expected completion time must be positive.
----- output end -----
  addTask: fails with invalid expectedCompletionTime ... ok (19ms)
  addTask: fails with invalid completionLevel (too high) ...
------- output -------
Action: addTask with invalid completionLevel (101)
Output: Error: Completion level must be between 0 and 100.
----- output end -----
  addTask: fails with invalid completionLevel (too high) ... ok (19ms)
  addTask: fails with invalid completionLevel (too low) ...
------- output -------
Action: addTask with invalid completionLevel (-1)
Output: Error: Completion level must be between 0 and 100.
----- output end -----
  addTask: fails with invalid completionLevel (too low) ... ok (19ms)
  editTask: modifies an existing task ...
------- output -------
Action: editTask 0199fd8a-b370-7a5c-bc68-1752e2a95f7a with new details
Output: Task edited successfully
----- output end -----
  editTask: modifies an existing task ... ok (80ms)
  editTask: fails with invalid priority ...
------- output -------
Action: editTask with invalid priority
Output: Error: Priority must be between 0 and 100.
----- output end -----
  editTask: fails with invalid priority ... ok (39ms)
  deleteTask: removes a task from the schedule ...
------- output -------
Added second task ID: 0199fd8a-b4d6-7731-b726-97bb02677c3b
Action: deleteTask 0199fd8a-b370-7a5c-bc68-1752e2a95f7a from schedule 0199fd8a-b105-74e7-8a23-aec6403fd86f
Output: Task deleted successfully
----- output end -----
  deleteTask: removes a task from the schedule ... ok (183ms)
  deleteTask: fails if task not found or not associated ...
------- output -------
Action: deleteTask nonExistentTask
Output: Error: Task with ID nonExistentTask not found or not associated with schedule 0199fd8a-b105-74e7-8a23-aec6403fd86f.
----- output end -----
  deleteTask: fails if task not found or not associated ... ok (40ms)
ScheduleGeneratorConcept - Basic CRUD for Schedules, Events, and Tasks ... ok (1s)
ScheduleGeneratorConcept - generateSchedule operational principle and scenarios ...
  Operational Principle: Generate a simple schedule ...
------- output -------

--- Operational Principle Test ---
Initialized schedule for user:Bob: 0199fd8a-b7eb-761d-99ea-a193334606a0
Added daily event: 0199fd8a-b83c-7122-81d2-bfb6a6fc780d
Added high priority task: 0199fd8a-b885-731c-a884-76d79c741e6f
Added low priority task: 0199fd8a-b8cb-7d9c-ac07-96128ae9f6c0
Action: generateSchedule for 0199fd8a-b7eb-761d-99ea-a193334606a0
Output: Generated Plan:
  1. task: Prepare Presentation from 10/19/2025, 1:35:51 PM to 10/19/2025, 4:35:51 PM
  2. task: Review Documents from 10/19/2025, 4:35:51 PM to 10/19/2025, 5:35:51 PM
  3. event: Daily Sync from 10/20/2025, 9:00:00 AM to 10/20/2025, 10:00:00 AM
  4. event: Daily Sync from 10/21/2025, 9:00:00 AM to 10/21/2025, 10:00:00 AM
  5. event: Daily Sync from 10/22/2025, 9:00:00 AM to 10/22/2025, 10:00:00 AM
  6. event: Daily Sync from 10/23/2025, 9:00:00 AM to 10/23/2025, 10:00:00 AM
  7. event: Daily Sync from 10/24/2025, 9:00:00 AM to 10/24/2025, 10:00:00 AM
  8. event: Daily Sync from 10/25/2025, 9:00:00 AM to 10/25/2025, 10:00:00 AM
  9. event: Daily Sync from 10/26/2025, 9:00:00 AM to 10/26/2025, 10:00:00 AM
----- output end -----
  Operational Principle: Generate a simple schedule ... ok (368ms)
  Scenario 1: Conflicts and Unscheduled Tasks (Expect Error) ...
------- output -------

--- Scenario 1: Conflicts and Unscheduled Tasks ---
Initialized schedule for user:Charlie: 0199fd8a-b94a-724b-abda-549260eab60b
Added daily all-day work block event (8 AM - 9 PM).
Added a long task that might not fit (2 hours expected).
Action: generateSchedule for 0199fd8a-b94a-724b-abda-549260eab60b
Warning: Could not fully schedule 1 tasks for schedule 0199fd8a-b94a-724b-abda-549260eab60b:
  - Long Task for Busy Schedule (ID: 0199fd8a-b9b4-7855-8f4e-47e7408198d2, Deadline: 10/20/2025)
Output: Error: Not all tasks could be scheduled within the planning horizon or available time slots.
----- output end -----
  Scenario 1: Conflicts and Unscheduled Tasks (Expect Error) ... ok (195ms)
  Scenario 2: Task Prioritization Order ...
------- output -------

--- Scenario 2: Task Prioritization Order ---
Initialized schedule for user:David: 0199fd8a-ba0e-731a-9ddf-017958ab38c3
Action: generateSchedule for 0199fd8a-ba0e-731a-9ddf-017958ab38c3
Output: Generated Plan (tasks only):
  1. Task A - High Priority, Soon Deadline, Partial from 10/19/2025, 1:35:51 PM to 10/19/2025, 2:05:51 PM
  2. Task B - Low Priority, Soon Deadline from 10/19/2025, 2:05:51 PM to 10/19/2025, 3:05:51 PM
  3. Task C - High Priority, Later Deadline, Long from 10/19/2025, 3:05:51 PM to 10/19/2025, 5:05:51 PM
  4. Task D - Medium Priority, Later Deadline, Short from 10/19/2025, 5:05:51 PM to 10/19/2025, 5:35:51 PM
  5. Task E - Very Late Deadline, High Priority from 10/19/2025, 5:35:51 PM to 10/19/2025, 6:35:51 PM
----- output end -----
  Scenario 2: Task Prioritization Order ... ok (365ms)
  Scenario 3: Repeating Events for different days & Monthly/Yearly ...
------- output -------

--- Scenario 3: Repeating Events for different days & Monthly/Yearly ---
Initialized schedule for user:Eve: 0199fd8a-bb7a-797f-bea0-5d8c2677a9e3
Added weekly event for Mon & Wed.
Added monthly event (15th of month).
Added yearly event (Jan 1st).
Action: generateSchedule for 0199fd8a-bb7a-797f-bea0-5d8c2677a9e3
Output: Generated Plan (events only):
  1. Weekly Sync (Mon/Wed) on 10/20/2025 at 10:00:00 AM
  2. Weekly Sync (Mon/Wed) on 10/22/2025 at 10:00:00 AM
----- output end -----
  Scenario 3: Repeating Events for different days & Monthly/Yearly ... ok (251ms)
  Scenario 4: Task completionLevel and remaining time ...
------- output -------

--- Scenario 4: Task completionLevel and remaining time ---
Initialized schedule for user:Frank: 0199fd8a-bc76-72c9-8510-5be48a1da4da
Added Partial Task (ID: 0199fd8a-bcac-76a2-be3b-61b84e2de0c4)
Added Completed Task (ID: 0199fd8a-bce3-73f1-ad84-b0bcfad375b3)
Action: generateSchedule for 0199fd8a-bc76-72c9-8510-5be48a1da4da
Output: Generated Plan (tasks only):
  1. Partial Task from 10/19/2025, 1:35:52 PM to 10/19/2025, 2:05:52 PM
  2. Completed Task (Completed) from 10/21/2025, 12:00:00 PM to 10/21/2025, 12:00:00 PM
----- output end -----
  Scenario 4: Task completionLevel and remaining time ... ok (199ms)
ScheduleGeneratorConcept - generateSchedule operational principle and scenarios ... ok (1s)
ScheduleGeneratorConcept - Query Actions ...
  _getScheduleByOwner: retrieves schedule ID for owner ...
------- output -------
Action: _getScheduleByOwner for user:Grace
Output: Retrieved schedule: 0199fd8a-bf53-7377-87d2-45f24b3fe2b9
----- output end -----
  _getScheduleByOwner: retrieves schedule ID for owner ... ok (103ms)
  _getEventsForSchedule: retrieves events for a schedule ...
------- output -------
Added event 0199fd8a-bfbd-7e0c-a7b1-1f32fb5c51c9 to 0199fd8a-bf53-7377-87d2-45f24b3fe2b9
Action: _getEventsForSchedule for 0199fd8a-bf53-7377-87d2-45f24b3fe2b9
Output: Retrieved events: 0199fd8a-bfbd-7e0c-a7b1-1f32fb5c51c9
----- output end -----
  _getEventsForSchedule: retrieves events for a schedule ... ok (123ms)
  _getTasksForSchedule: retrieves tasks for a schedule ...
------- output -------
Added task 0199fd8a-c038-77e0-bd90-80c1aee1298d to 0199fd8a-bf53-7377-87d2-45f24b3fe2b9
Action: _getTasksForSchedule for 0199fd8a-bf53-7377-87d2-45f24b3fe2b9
Output: Retrieved tasks: 0199fd8a-c038-77e0-bd90-80c1aee1298d
----- output end -----
  _getTasksForSchedule: retrieves tasks for a schedule ... ok (125ms)
  _getEventDetails: retrieves full event details ...
------- output -------
Action: _getEventDetails for 0199fd8a-bfbd-7e0c-a7b1-1f32fb5c51c9
Output: Retrieved event details: Event A
----- output end -----
  _getEventDetails: retrieves full event details ... ok (34ms)
  _getTaskDetails: retrieves full task details ...
------- output -------
Action: _getTaskDetails for 0199fd8a-c038-77e0-bd90-80c1aee1298d
Output: Retrieved task details: Task X
----- output end -----
  _getTaskDetails: retrieves full task details ... ok (34ms)
ScheduleGeneratorConcept - Query Actions ... ok (939ms)

ok | 3 passed (26 steps) | 0 failed (4s)