```
Check file:///Users/rahsunkomatsuzaki-fields/Desktop/MIT/academic/Y3/Fall/6.1040/taskmate/src/concepts/ScheduleGenerator/ScheduleGenerator.test.ts
running 1 test from ./src/concepts/ScheduleGenerator/ScheduleGenerator.test.ts
ScheduleGeneratorConcept ...
  Operational Principle: Create, populate, and generate a schedule ...
------- output -------

--- Testing Operational Principle ---
Action: initializeSchedule for owner: user:testPrinciple
Result: { schedule: "019a51f4-b340-7285-b6d7-442ba9e26ea6" }
Action: addEvent "Weekly Standup" to schedule 019a51f4-b340-7285-b6d7-442ba9e26ea6
Result: { event: "019a51f4-b39b-727a-bb22-c21356b724ae" }
Action: addTask "Finish Report" to schedule 019a51f4-b340-7285-b6d7-442ba9e26ea6
Result: { task: "019a51f4-b3fe-78c5-95bf-281472cbebe5" }
Action: addTask "Plan Project" to schedule 019a51f4-b340-7285-b6d7-442ba9e26ea6
Result: { task: "019a51f4-b45b-7208-b098-8ceea86c8b33" }
Action: generateSchedule for schedule 019a51f4-b340-7285-b6d7-442ba9e26ea6
Result: {
  "scheduleId": "019a51f4-b340-7285-b6d7-442ba9e26ea6",
  "generatedPlan": [
    {
      "type": "task",
      "originalId": "019a51f4-b3fe-78c5-95bf-281472cbebe5",
      "name": "Finish Report",
      "scheduledStartTime": "2025-11-05T13:00:00.000Z",
      "scheduledEndTime": "2025-11-05T15:00:00.000Z"
    },
    {
      "type": "event",
      "originalId": "019a51f4-b39b-727a-bb22-c21356b724ae",
      "name": "Weekly Standup",
      "scheduledStartTime": "2025-11-05T15:00:00.000Z",
      "scheduledEndTime": "2025-11-05T16:00:00.000Z"
    },
    {
      "type": "task",
      "originalId": "019a51f4-b45b-7208-b098-8ceea86c8b33",
      "name": "Plan Project",
      "scheduledStartTime": "2025-11-05T16:00:00.000Z",
      "scheduledEndTime": "2025-11-05T17:00:00.000Z"
    }
  ]
}
Principle test passed: Schedule was created, populated, and generated successfully.
----- output end -----
  Operational Principle: Create, populate, and generate a schedule ... ok (487ms)
  Interesting Scenario 1: Edit and Delete items ...
------- output -------

--- Testing Scenario: Edit and Delete ---
Action: editEvent 019a51f4-b54a-7f03-90e6-a60b336c72cc
Effect confirmed: Event name updated.
Action: deleteTask 019a51f4-b589-728f-a430-42954f741d43
Effect confirmed: Task deleted from schedule.
----- output end -----
  Interesting Scenario 1: Edit and Delete items ... ok (384ms)
  Interesting Scenario 2: Requirement Failures (Error Handling) ...
------- output -------

--- Testing Scenario: Error Handling ---
Action: addEvent with invalid times
Requirement confirmed: Received error: Event start time must be before end time.
Action: addTask with invalid priority
Requirement confirmed: Received error: Priority must be between 0 and 100.
Action: deleteEvent for non-existent event
Requirement confirmed: Received error: Event with ID event:fake not found or not associated with schedule 019a51f4-b68b-7708-a657-7756ef8cef37.
----- output end -----
  Interesting Scenario 2: Requirement Failures (Error Handling) ... ok (146ms)
  Interesting Scenario 3: Impossible Schedule Generation ...
------- output -------

--- Testing Scenario: Impossible Schedule ---
Action: addEvent "All-Day Conference" to fill schedule on Wed Nov 05 2025
Action: addTask that cannot possibly fit
Action: generateSchedule (expecting failure)
Warning: Could not fully schedule 1 tasks for schedule 019a51f4-b724-7e39-ae8b-fdaf149c872b:
  - Impossible Task (ID: 019a51f4-b7a7-79cd-a93c-8ac761f52260, Deadline: 11/5/2025)
Result: {
  error: "Not all tasks could be scheduled within the planning horizon or available time slots."
}
Requirement confirmed: Impossible schedule correctly returns an error.
----- output end -----
  Interesting Scenario 3: Impossible Schedule Generation ... ok (309ms)
  Interesting Scenario 4: Idempotency of Schedule Initialization ...
------- output -------

--- Testing Scenario: Idempotent Initialization ---
Action: initializeSchedule for user:testIdempotent (1st time)
Result (1st): 019a51f4-b852-7e65-93ee-42eff51f918e
Action: initializeSchedule for user:testIdempotent (2nd time)
Result (2nd): 019a51f4-b852-7e65-93ee-42eff51f918e
Effect confirmed: Schedule initialization is idempotent.
----- output end -----
  Interesting Scenario 4: Idempotency of Schedule Initialization ... ok (82ms)
ScheduleGeneratorConcept ... ok (1s)

ok | 1 passed (5 steps) | 0 failed (1s)
```
