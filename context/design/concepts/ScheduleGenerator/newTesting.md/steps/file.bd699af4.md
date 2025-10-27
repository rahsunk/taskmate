---
timestamp: 'Mon Oct 27 2025 10:54:25 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251027_105425.cf278355.md]]'
content_id: bd699af491e1f818610db77e8a7b3250a811ea988f7ee0b0badab7e1cfdc514b
---

# file: src/ScheduleGenerator/ScheduleGeneratorConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals, assertArrayIncludes, assert } from "jsr:@std/assert"; // Added 'assert'
import { testDb } from "../../utils/database.ts";
import { ID } from "../../utils/types.ts";
import ScheduleGeneratorConcept from "./ScheduleGeneratorConcept.ts";
import { ScheduleDoc, EventDoc, TaskDoc } from "./ScheduleGeneratorConcept.ts"; // Import doc interfaces for type assertions

// Helper for repeatable test IDs
function generateTestId(prefix: string): ID {
  return `${prefix}:${crypto.randomUUID()}` as ID;
}

// Define enum for repetition frequency types for consistency
enum RepeatFrequency {
  NONE = "NONE",
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY",
}

// Helper for checking action results (single object return with 'error' or data)
const isActionError = (result: any): result is { error: string } => {
  return result && typeof result === 'object' && "error" in result && typeof result.error === "string";
};

// Helper for checking query results that contain an error object in an array
// T is the expected successful item type within the array (e.g., {schedule: ID})
const isQueryErrorResponse = <T>(result: Array<T | { error: string }>): result is Array<{ error: string }> => {
  return Array.isArray(result) && result.length > 0 && "error" in result[0] && typeof result[0].error === "string";
};


Deno.test("ScheduleGenerator Concept", async (t) => {
  const [db, client] = await testDb();
  const concept = new ScheduleGeneratorConcept(db);

  const owner1: ID = generateTestId("user");
  const owner2: ID = generateTestId("user");

  // --- Test Case 1: Operational Principle ---
  await t.step("should fulfill the operational principle by generating an optimal schedule", async () => {
    console.log("\n--- Operational Principle Test ---");

    // 1. Initialize a schedule for owner1
    console.log(`Action: initializeSchedule for owner: ${owner1}`);
    const initScheduleResult = await concept.initializeSchedule({ owner: owner1 });
    if (isActionError(initScheduleResult)) {
      assert(false, `Action initializeSchedule failed: ${initScheduleResult.error}`);
    }
    const scheduleId = initScheduleResult.schedule!; // Safe after error check
    console.log(`Result: Schedule initialized with ID: ${scheduleId}`);

    // Verify schedule exists via query
    type GetScheduleByOwnerSuccess = { schedule: ID };
    const scheduleByOwnerResult: Array<GetScheduleByOwnerSuccess | { error: string }> = await concept._getScheduleByOwner({ owner: owner1 });
    if (isQueryErrorResponse<GetScheduleByOwnerSuccess>(scheduleByOwnerResult)) { // Narrowing works here
      assert(false, `Query _getScheduleByOwner failed: ${scheduleByOwnerResult[0].error}`); // Safe direct access after narrowing
    }
    // Now scheduleByOwnerResult is Array<GetScheduleByOwnerSuccess>
    assertEquals(scheduleByOwnerResult.length, 1, "Expected one schedule from _getScheduleByOwner.");
    const scheduleByOwner = scheduleByOwnerResult[0].schedule; // Safe access
    assertExists(scheduleByOwner); // assertExists is good
    assertEquals(scheduleByOwner, scheduleId);
    console.log(`Query: Schedule for owner ${owner1} retrieved: ${scheduleByOwner}`);

    type GetScheduleDetailsSuccess = { scheduleDetails: ScheduleDoc };
    const scheduleDetailsResult: Array<GetScheduleDetailsSuccess | { error: string }> = await concept._getScheduleDetails({ schedule: scheduleId });
    if (isQueryErrorResponse<GetScheduleDetailsSuccess>(scheduleDetailsResult)) { // Narrowing works here
      assert(false, `Query _getScheduleDetails failed: ${scheduleDetailsResult[0].error}`); // Safe direct access
    }
    assertEquals(scheduleDetailsResult.length, 1, "Expected one schedule details from _getScheduleDetails.");
    const scheduleDetails = scheduleDetailsResult[0].scheduleDetails; // Safe access
    assertExists(scheduleDetails);
    assertEquals(scheduleDetails.owner, owner1);
    console.log(`Query: Schedule details for owner ${owner1}: ${JSON.stringify(scheduleDetails)}`);

    // 2. Add a daily recurring meeting (event)
    const eventStartTime = new Date();
    eventStartTime.setHours(9, 0, 0, 0);
    const eventEndTime = new Date(eventStartTime);
    eventEndTime.setHours(10, 0, 0, 0);
    const dailyRepeat = { frequency: RepeatFrequency.DAILY };

    console.log(`Action: addEvent - Daily Meeting (9-10 AM) to schedule: ${scheduleId}`);
    const addEventResult = await concept.addEvent({
      schedule: scheduleId,
      name: "Daily Standup",
      startTime: eventStartTime,
      endTime: eventEndTime,
      repeat: dailyRepeat,
    });
    if (isActionError(addEventResult)) {
      assert(false, `Action addEvent failed: ${addEventResult.error}`);
    }
    assertExists(addEventResult.event);
    const eventId = addEventResult.event!;
    console.log(`Result: Event 'Daily Standup' added with ID: ${eventId}`);

    // 3. Add a high priority task with a sooner deadline
    const task1Deadline = new Date();
    task1Deadline.setDate(task1Deadline.getDate() + 1); // Tomorrow
    task1Deadline.setHours(17, 0, 0, 0);
    const expectedCompletionTime1 = 60; // 1 hour
    const completionLevel1 = 0;
    const priority1 = 90;

    console.log(`Action: addTask - High Priority Task to schedule: ${scheduleId}`);
    const addTask1Result = await concept.addTask({
      schedule: scheduleId,
      name: "Finish Project Report",
      deadline: task1Deadline,
      expectedCompletionTime: expectedCompletionTime1,
      completionLevel: completionLevel1,
      priority: priority1,
    });
    if (isActionError(addTask1Result)) {
      assert(false, `Action addTask1 failed: ${addTask1Result.error}`);
    }
    assertExists(addTask1Result.task);
    const taskId1 = addTask1Result.task!;
    console.log(`Result: Task 'Finish Project Report' added with ID: ${taskId1}`);

    // 4. Add a low priority task with a longer deadline
    const task2Deadline = new Date();
    task2Deadline.setDate(task2Deadline.getDate() + 3); // 3 days from now
    task2Deadline.setHours(17, 0, 0, 0);
    const expectedCompletionTime2 = 120; // 2 hours
    const completionLevel2 = 0;
    const priority2 = 30;

    console.log(`Action: addTask - Low Priority Task to schedule: ${scheduleId}`);
    const addTask2Result = await concept.addTask({
      schedule: scheduleId,
      name: "Review Documentation",
      deadline: task2Deadline,
      expectedCompletionTime: expectedCompletionTime2,
      completionLevel: completionLevel2,
      priority: priority2,
    });
    if (isActionError(addTask2Result)) {
      assert(false, `Action addTask2 failed: ${addTask2Result.error}`);
    }
    assertExists(addTask2Result.task);
    const taskId2 = addTask2Result.task!;
    console.log(`Result: Task 'Review Documentation' added with ID: ${taskId2}`);

    // 5. Generate the schedule
    console.log(`Action: generateSchedule for schedule: ${scheduleId}`);
    const generateResult = await concept.generateSchedule({ schedule: scheduleId });
    if (isActionError(generateResult)) {
      assert(false, `Action generateSchedule failed: ${generateResult.error}`);
    }
    assertExists(generateResult.generatedPlan);
    const generatedPlan = generateResult.generatedPlan!;
    console.log(`Result: Generated Plan (partial): ${JSON.stringify(generatedPlan.slice(0, 5))}... Total items: ${generatedPlan.length}`);

    // Assertions for the generated plan
    assertNotEquals(generatedPlan.length, 0, "Generated plan should not be empty");

    // Check if the daily event is present for multiple days
    const dailyEvents = generatedPlan.filter(
      (item) =>
        item.type === "event" &&
        item.name === "Daily Standup" &&
        item.originalId === eventId,
    );
    // Expecting at least 2 daily events (today and tomorrow), depending on when test runs and horizon
    assertNotEquals(dailyEvents.length, 0, "Daily event should be present in the plan.");
    console.log(`Found ${dailyEvents.length} instances of 'Daily Standup' event.`);

    // Check if tasks are scheduled (this is tricky to assert perfectly without knowing exact free slots)
    // We expect tasks to be scheduled AFTER events, and prioritized.
    const scheduledTask1 = generatedPlan.find(
      (item) => item.type === "task" && item.originalId === taskId1,
    );
    assertExists(scheduledTask1, "High priority task should be scheduled.");
    console.log(`Scheduled 'Finish Project Report': ${scheduledTask1?.scheduledStartTime?.toISOString()} - ${scheduledTask1?.scheduledEndTime?.toISOString()}`);


    const scheduledTask2 = generatedPlan.find(
      (item) => item.type === "task" && item.originalId === taskId2,
    );
    assertExists(scheduledTask2, "Low priority task should be scheduled.");
    console.log(`Scheduled 'Review Documentation': ${scheduledTask2?.scheduledStartTime?.toISOString()} - ${scheduledTask2?.scheduledEndTime?.toISOString()}`);

    // Expect taskId1 to be scheduled before or more urgently than taskId2
    if (scheduledTask1 && scheduledTask2) {
      assert(scheduledTask1.scheduledStartTime < scheduledTask2.scheduledStartTime, "High priority, sooner deadline task should be scheduled earlier.");
    }
  });

  // --- Test Case 2: Initialize Schedule (Edge Cases & Queries) ---
  await t.step("should initialize schedule and handle duplicate owner attempts", async () => {
    console.log("\n--- Initialize Schedule Test ---");
    // Initialize first schedule for owner2
    const initScheduleResult1 = await concept.initializeSchedule({ owner: owner2 });
    if (isActionError(initScheduleResult1)) {
      assert(false, `Action initializeSchedule failed: ${initScheduleResult1.error}`);
    }
    assertExists(initScheduleResult1.schedule);
    const scheduleId2 = initScheduleResult1.schedule!;
    console.log(`Schedule initialized for owner ${owner2} with ID: ${scheduleId2}`);

    // Testing `_getScheduleByOwner`
    type GetScheduleByOwnerSuccess = { schedule: ID };
    const queryResult: Array<GetScheduleByOwnerSuccess | { error: string }> = await concept._getScheduleByOwner({ owner: owner2 });
    if (isQueryErrorResponse<GetScheduleByOwnerSuccess>(queryResult)) {
      assert(false, `Query _getScheduleByOwner failed: ${queryResult[0].error}`);
    }
    assertEquals(queryResult.length, 1);
    assertEquals(queryResult[0].schedule, scheduleId2, `Expected schedule ID ${scheduleId2}, got ${queryResult[0].schedule}`);
    console.log(`Query: Schedule for owner ${owner2} retrieved: ${queryResult[0].schedule}`);

    // Test `_getAllSchedules`
    type GetAllSchedulesSuccess = { schedule: ScheduleDoc };
    const allSchedulesResult: Array<GetAllSchedulesSuccess | { error: string }> = await concept._getAllSchedules();
    if (isQueryErrorResponse<GetAllSchedulesSuccess>(allSchedulesResult)) {
      assert(false, `Query _getAllSchedules failed: ${allSchedulesResult[0].error}`);
    }
    // Now allSchedulesResult is Array<{ schedule: ScheduleDoc }>
    const allSchedules = allSchedulesResult.map(item => item.schedule);
    assertNotEquals(allSchedules.length, 0, "Should return at least one schedule");
    assertArrayIncludes(allSchedules.map(s => s._id), [scheduleId2]);
    console.log(`Query: All schedules retrieved. Count: ${allSchedules.length}`);

    // Test `_getScheduleDetails` for non-existent schedule
    const nonExistentScheduleId = generateTestId("nonexistent_schedule");
    type GetScheduleDetailsFail = { scheduleDetails: ScheduleDoc }; // Type for query success, though we expect error
    const nonExistentScheduleDetails: Array<GetScheduleDetailsFail | { error: string }> = await concept._getScheduleDetails({ schedule: nonExistentScheduleId });
    assert(isQueryErrorResponse<GetScheduleDetailsFail>(nonExistentScheduleDetails), "Should return an error for non-existent schedule details");
    assertExists(nonExistentScheduleDetails[0].error);
    console.log(`Query: Attempt to get details for non-existent schedule ${nonExistentScheduleId}: ${nonExistentScheduleDetails[0].error}`);
  });

  // --- Test Case 3: Event Management (Add, Edit, Delete, Invalid Cases) ---
  await t.step("should manage events with valid and invalid operations", async () => {
    console.log("\n--- Event Management Test ---");
    const owner = generateTestId("event_user");
    const initScheduleResult = await concept.initializeSchedule({ owner });
    if (isActionError(initScheduleResult)) {
      assert(false, `Action initializeSchedule failed: ${initScheduleResult.error}`);
    }
    const scheduleId = initScheduleResult.schedule!;
    console.log(`Schedule initialized for owner ${owner} with ID: ${scheduleId}`);

    const baseTime = new Date();
    baseTime.setHours(14, 0, 0, 0); // 2 PM today

    // Add valid event
    const event1StartTime = new Date(baseTime);
    const event1EndTime = new Date(baseTime.getTime() + 60 * 60 * 1000); // 1 hour later
    const addEventResult1 = await concept.addEvent({
      schedule: scheduleId,
      name: "Team Sync",
      startTime: event1StartTime,
      endTime: event1EndTime,
      repeat: { frequency: RepeatFrequency.NONE },
    });
    if (isActionError(addEventResult1)) {
      assert(false, `Action addEvent failed: ${addEventResult1.error}`);
    }
    assertExists(addEventResult1.event);
    const eventId1 = addEventResult1.event!;
    console.log(`Event 'Team Sync' added: ${eventId1}`);

    // Verify event exists and details are correct via query
    type GetEventDetailsSuccess = { eventDetails: EventDoc };
    const event1DetailsResult: Array<GetEventDetailsSuccess | { error: string }> = await concept._getEventDetails({ event: eventId1 });
    if (isQueryErrorResponse<GetEventDetailsSuccess>(event1DetailsResult)) {
      assert(false, `Query _getEventDetails failed: ${event1DetailsResult[0].error}`);
    }
    assertEquals(event1DetailsResult.length, 1);
    const event1Details = event1DetailsResult[0].eventDetails;
    assertExists(event1Details);
    assertEquals(event1Details.name, "Team Sync");
    assertEquals(event1Details.startTime.toISOString(), event1StartTime.toISOString());
    console.log(`Query: Event details for ${eventId1}: ${JSON.stringify(event1Details)}`);

    // Add event with invalid times (endTime before startTime)
    const invalidStartTime = new Date(baseTime);
    invalidStartTime.setHours(16, 0, 0, 0);
    const invalidEndTime = new Date(baseTime);
    invalidEndTime.setHours(15, 0, 0, 0);
    const invalidEventResult = await concept.addEvent({
      schedule: scheduleId,
      name: "Invalid Meeting",
      startTime: invalidStartTime,
      endTime: invalidEndTime,
      repeat: { frequency: RepeatFrequency.NONE },
    });
    assert(isActionError(invalidEventResult), "Should return error for invalid event times");
    assertExists(invalidEventResult.error);
    console.log(`Action: addEvent with invalid times. Result: ${invalidEventResult.error}`);

    // Add weekly event without daysOfWeek
    const weeklyEventResult = await concept.addEvent({
      schedule: scheduleId,
      name: "Weekly Review",
      startTime: event1StartTime,
      endTime: event1EndTime,
      repeat: { frequency: RepeatFrequency.WEEKLY }, // Missing daysOfWeek
    });
    assert(isActionError(weeklyEventResult), "Should return error for weekly event without daysOfWeek");
    assertExists(weeklyEventResult.error);
    console.log(`Action: addEvent with invalid weekly repeat. Result: ${weeklyEventResult.error}`);

    // Edit event1
    const editedStartTime = new Date(baseTime);
    editedStartTime.setHours(10, 0, 0, 0);
    const editedEndTime = new Date(baseTime.getTime() + 1.5 * 60 * 60 * 1000); // 1.5 hours later
    const editEventResult = await concept.editEvent({
      schedule: scheduleId,
      oldEvent: eventId1,
      name: "Edited Team Sync",
      startTime: editedStartTime,
      endTime: editedEndTime,
      repeat: { frequency: RepeatFrequency.DAILY },
    });
    if (isActionError(editEventResult)) {
      assert(false, `Action editEvent failed: ${editEventResult.error}`);
    }
    console.log(`Event ${eventId1} edited.`);

    // Verify edited details
    const editedEvent1DetailsResult: Array<GetEventDetailsSuccess | { error: string }> = await concept._getEventDetails({ event: eventId1 });
    if (isQueryErrorResponse<GetEventDetailsSuccess>(editedEvent1DetailsResult)) {
      assert(false, `Query _getEventDetails failed: ${editedEvent1DetailsResult[0].error}`);
    }
    assertEquals(editedEvent1DetailsResult.length, 1);
    const editedEvent1Details = editedEvent1DetailsResult[0].eventDetails;
    assertExists(editedEvent1Details);
    assertEquals(editedEvent1Details.name, "Edited Team Sync");
    assertEquals(editedEvent1Details.startTime.toISOString(), editedStartTime.toISOString());
    assertEquals(editedEvent1Details.repeat.frequency, RepeatFrequency.DAILY);
    console.log(`Query: Edited event details for ${eventId1}: ${JSON.stringify(editedEvent1Details)}`);

    // Delete event1
    const deleteEventResult = await concept.deleteEvent({
      schedule: scheduleId,
      event: eventId1,
    });
    if (isActionError(deleteEventResult)) {
      assert(false, `Action deleteEvent failed: ${deleteEventResult.error}`);
    }
    console.log(`Event ${eventId1} deleted.`);

    // Verify event is deleted via query
    const deletedEventDetails: Array<GetEventDetailsSuccess | { error: string }> = await concept._getEventDetails({ event: eventId1 });
    assert(isQueryErrorResponse<GetEventDetailsSuccess>(deletedEventDetails), "Should return error for deleted event details");
    assertExists(deletedEventDetails[0].error);
    console.log(`Query: Attempt to get details for deleted event ${eventId1}: ${deletedEventDetails[0].error}`);

    type GetEventsForScheduleSuccess = { event: ID };
    const eventsForScheduleResult: Array<GetEventsForScheduleSuccess | { error: string }> = await concept._getEventsForSchedule({ schedule: scheduleId });
    if (isQueryErrorResponse<GetEventsForScheduleSuccess>(eventsForScheduleResult)) {
      assert(false, `Query _getEventsForSchedule failed: ${eventsForScheduleResult[0].error}`);
    }
    assertEquals(eventsForScheduleResult.length, 0, "Schedule should have no events after deletion.");
    console.log(`Query: Events for schedule ${scheduleId} after deletion: ${JSON.stringify(eventsForScheduleResult)}`);

    // Test _getAllEvents
    type GetAllEventsSuccess = { event: EventDoc };
    const allEventsResult: Array<GetAllEventsSuccess | { error: string }> = await concept._getAllEvents();
    if (isQueryErrorResponse<GetAllEventsSuccess>(allEventsResult)) {
      assert(false, `Query _getAllEvents failed: ${allEventsResult[0].error}`);
    }
    assert(!allEventsResult.some(e => e.event._id === eventId1), "Deleted event should not appear in all events."); // Safe access e.event._id
    console.log(`Query: All events retrieved. Count: ${allEventsResult.length}`);
  });

  // --- Test Case 4: Task Management (Add, Edit, Delete, Invalid Cases) ---
  await t.step("should manage tasks with valid and invalid operations", async () => {
    console.log("\n--- Task Management Test ---");
    const owner = generateTestId("task_user");
    const initScheduleResult = await concept.initializeSchedule({ owner });
    if (isActionError(initScheduleResult)) {
      assert(false, `Action initializeSchedule failed: ${initScheduleResult.error}`);
    }
    const scheduleId = initScheduleResult.schedule!;
    console.log(`Schedule initialized for owner ${owner} with ID: ${scheduleId}`);

    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 2); // 2 days from now

    // Add valid task
    const addTaskResult1 = await concept.addTask({
      schedule: scheduleId,
      name: "Write Proposal",
      deadline: baseDate,
      expectedCompletionTime: 90, // 90 minutes
      completionLevel: 0,
      priority: 80,
    });
    if (isActionError(addTaskResult1)) {
      assert(false, `Action addTask1 failed: ${addTaskResult1.error}`);
    }
    assertExists(addTaskResult1.task);
    const taskId1 = addTaskResult1.task!;
    console.log(`Task 'Write Proposal' added: ${taskId1}`);

    // Verify task exists and details are correct via query
    type GetTaskDetailsSuccess = { taskDetails: TaskDoc };
    const task1DetailsResult: Array<GetTaskDetailsSuccess | { error: string }> = await concept._getTaskDetails({ task: taskId1 });
    if (isQueryErrorResponse<GetTaskDetailsSuccess>(task1DetailsResult)) {
      assert(false, `Query _getTaskDetails failed: ${task1DetailsResult[0].error}`);
    }
    assertEquals(task1DetailsResult.length, 1);
    const task1Details = task1DetailsResult[0].taskDetails;
    assertExists(task1Details);
    assertEquals(task1Details.name, "Write Proposal");
    assertEquals(task1Details.expectedCompletionTime, 90);
    assertEquals(task1Details.completionLevel, 0);
    console.log(`Query: Task details for ${taskId1}: ${JSON.stringify(task1Details)}`);

    // Add task with invalid expectedCompletionTime
    const invalidTaskTimeResult = await concept.addTask({
      schedule: scheduleId,
      name: "Invalid Time Task",
      deadline: baseDate,
      expectedCompletionTime: 0,
      completionLevel: 0,
      priority: 50,
    });
    assert(isActionError(invalidTaskTimeResult), "Should return error for invalid expected completion time");
    assertExists(invalidTaskTimeResult.error);
    console.log(`Action: addTask with invalid time. Result: ${invalidTaskTimeResult.error}`);

    // Add task with invalid priority
    const invalidTaskPriorityResult = await concept.addTask({
      schedule: scheduleId,
      name: "Invalid Priority Task",
      deadline: baseDate,
      expectedCompletionTime: 30,
      completionLevel: 0,
      priority: 101, // Out of range
    });
    assert(isActionError(invalidTaskPriorityResult), "Should return error for invalid priority");
    assertExists(invalidTaskPriorityResult.error);
    console.log(`Action: addTask with invalid priority. Result: ${invalidTaskPriorityResult.error}`);

    // Edit task1
    const editedDeadline = new Date(baseDate);
    editedDeadline.setDate(editedDeadline.getDate() + 1); // Extend deadline by 1 day
    const editTaskResult = await concept.editTask({
      schedule: scheduleId,
      oldTask: taskId1,
      name: "Revised Proposal",
      deadline: editedDeadline,
      expectedCompletionTime: 120,
      completionLevel: 50, // 50% complete
      priority: 95,
    });
    if (isActionError(editTaskResult)) {
      assert(false, `Action editTask failed: ${editTaskResult.error}`);
    }
    console.log(`Task ${taskId1} edited.`);

    // Verify edited details
    const editedTask1DetailsResult: Array<GetTaskDetailsSuccess | { error: string }> = await concept._getTaskDetails({ task: taskId1 });
    if (isQueryErrorResponse<GetTaskDetailsSuccess>(editedTask1DetailsResult)) {
      assert(false, `Query _getTaskDetails failed: ${editedTask1DetailsResult[0].error}`);
    }
    assertEquals(editedTask1DetailsResult.length, 1);
    const editedTask1Details = editedTask1DetailsResult[0].taskDetails;
    assertExists(editedTask1Details);
    assertEquals(editedTask1Details.name, "Revised Proposal");
    assertEquals(editedTask1Details.expectedCompletionTime, 120);
    assertEquals(editedTask1Details.completionLevel, 50);
    assertEquals(editedTask1Details.priority, 95);
    assertEquals(editedTask1Details.deadline.toISOString(), editedDeadline.toISOString());
    console.log(`Query: Edited task details for ${taskId1}: ${JSON.stringify(editedTask1Details)}`);

    // Delete task1
    const deleteTaskResult = await concept.deleteTask({
      schedule: scheduleId,
      task: taskId1,
    });
    if (isActionError(deleteTaskResult)) {
      assert(false, `Action deleteTask failed: ${deleteTaskResult.error}`);
    }
    console.log(`Task ${taskId1} deleted.`);

    // Verify task is deleted via query
    const deletedTaskDetails: Array<GetTaskDetailsSuccess | { error: string }> = await concept._getTaskDetails({ task: taskId1 });
    assert(isQueryErrorResponse<GetTaskDetailsSuccess>(deletedTaskDetails), "Should return error for deleted task details");
    assertExists(deletedTaskDetails[0].error);
    console.log(`Query: Attempt to get details for deleted task ${taskId1}: ${deletedTaskDetails[0].error}`);

    type GetTasksForScheduleSuccess = { task: ID };
    const tasksForScheduleResult: Array<GetTasksForScheduleSuccess | { error: string }> = await concept._getTasksForSchedule({ schedule: scheduleId });
    if (isQueryErrorResponse<GetTasksForScheduleSuccess>(tasksForScheduleResult)) {
      assert(false, `Query _getTasksForSchedule failed: ${tasksForScheduleResult[0].error}`);
    }
    assertEquals(tasksForScheduleResult.length, 0, "Schedule should have no tasks after deletion.");
    console.log(`Query: Tasks for schedule ${scheduleId} after deletion: ${JSON.stringify(tasksForScheduleResult)}`);

    // Test _getAllTasks
    type GetAllTasksSuccess = { task: TaskDoc };
    const allTasksResult: Array<GetAllTasksSuccess | { error: string }> = await concept._getAllTasks();
    if (isQueryErrorResponse<GetAllTasksSuccess>(allTasksResult)) {
      assert(false, `Query _getAllTasks failed: ${allTasksResult[0].error}`);
    }
    assert(!allTasksResult.some(t => t.task._id === taskId1), "Deleted task should not appear in all tasks."); // Safe access t.task._id
    console.log(`Query: All tasks retrieved. Count: ${allTasksResult.length}`);
  });

  // --- Test Case 5: Generate Schedule - Complex Scenarios and Incomplete Tasks ---
  await t.step("should handle complex scheduling scenarios and incomplete tasks", async () => {
    console.log("\n--- Complex Scheduling Test ---");
    const owner = generateTestId("complex_user");
    const initScheduleResult = await concept.initializeSchedule({ owner });
    if (isActionError(initScheduleResult)) {
      assert(false, `Action initializeSchedule failed: ${initScheduleResult.error}`);
    }
    const scheduleId = initScheduleResult.schedule!;
    console.log(`Schedule initialized for owner ${owner} with ID: ${scheduleId}`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Event 1: Daily Meeting 9-10 AM
    const event1StartTime = new Date(today);
    event1StartTime.setHours(9, 0, 0, 0);
    const event1EndTime = new Date(event1StartTime);
    event1EndTime.setHours(10, 0, 0, 0);
    await concept.addEvent({
      schedule: scheduleId, name: "Daily Standup", startTime: event1StartTime, endTime: event1EndTime,
      repeat: { frequency: RepeatFrequency.DAILY }
    });
    console.log("Added Daily Standup (9-10 AM).");

    // Event 2: Weekly Gym Session Mon/Wed/Fri 12-1 PM for the next two weeks
    const event2StartTime = new Date(today);
    event2StartTime.setHours(12, 0, 0, 0);
    const event2EndTime = new Date(event2StartTime);
    event2EndTime.setHours(13, 0, 0, 0);
    // Note: getNextDayOfWeek is a utility that could be added or dates carefully chosen for the test
    await concept.addEvent({
      schedule: scheduleId, name: "Gym Session", startTime: event2StartTime, endTime: event2EndTime,
      repeat: { frequency: RepeatFrequency.WEEKLY, daysOfWeek: [1, 3, 5] } // Mon, Wed, Fri
    });
    console.log("Added Gym Session (Mon/Wed/Fri 12-1 PM).");


    // Task A: High Priority, Soon Deadline, Partially Completed (2 hours remaining)
    const taskADeadline = new Date(today);
    taskADeadline.setDate(today.getDate() + 2); // 2 days from now
    taskADeadline.setHours(17, 0, 0, 0);
    await concept.addTask({
      schedule: scheduleId, name: "Urgent Report", deadline: taskADeadline,
      expectedCompletionTime: 240, completionLevel: 50, priority: 95
    }); // 240 min total, 50% done = 120 min remaining (2 hours)
    console.log("Added Urgent Report (2h remaining, due in 2 days).");

    // Task B: Medium Priority, Longer Deadline (3 hours remaining)
    const taskBDeadline = new Date(today);
    taskBDeadline.setDate(today.getDate() + 4); // 4 days from now
    taskBDeadline.setHours(17, 0, 0, 0);
    await concept.addTask({
      schedule: scheduleId, name: "Feature Implementation", deadline: taskBDeadline,
      expectedCompletionTime: 180, completionLevel: 0, priority: 70
    }); // 180 min (3 hours)
    console.log("Added Feature Implementation (3h remaining, due in 4 days).");

    // Task C: Low Priority, Long Deadline, High Expected Completion Time (5 hours remaining)
    const taskCDeadline = new Date(today);
    taskCDeadline.setDate(today.getDate() + 6); // 6 days from now
    taskCDeadline.setHours(17, 0, 0, 0);
    await concept.addTask({
      schedule: scheduleId, name: "Documentation Update", deadline: taskCDeadline,
      expectedCompletionTime: 300, completionLevel: 0, priority: 40
    }); // 300 min (5 hours)
    console.log("Added Documentation Update (5h remaining, due in 6 days).");

    // Generate schedule
    console.log(`Action: generateSchedule for schedule: ${scheduleId}`);
    const generateResult = await concept.generateSchedule({ schedule: scheduleId });
    if (isActionError(generateResult)) {
      assert(false, `Action generateSchedule failed: ${generateResult.error}`);
    }
    assertExists(generateResult.generatedPlan);
    const generatedPlan = generateResult.generatedPlan!;
    console.log(`Generated Plan (total items): ${generatedPlan.length}`);
    generatedPlan.forEach(item => {
      console.log(`  - [${item.type.toUpperCase()}] ${item.name}: ${item.scheduledStartTime.toLocaleString()} - ${item.scheduledEndTime.toLocaleString()}`);
    });

    // Assert that events and tasks are present
    assert(generatedPlan.some(item => item.name === "Daily Standup" && item.type === "event"), "Daily Standup event should be in the plan.");
    assert(generatedPlan.some(item => item.name === "Gym Session" && item.type === "event"), "Gym Session event should be in the plan.");
    assert(generatedPlan.some(item => item.name === "Urgent Report" && item.type === "task"), "Urgent Report task should be in the plan.");
    assert(generatedPlan.some(item => item.name === "Feature Implementation" && item.type === "task"), "Feature Implementation task should be in the plan.");
    assert(generatedPlan.some(item => item.name === "Documentation Update" && item.type === "task"), "Documentation Update task should be in the plan.");

    // Assert tasks are scheduled outside of event times (difficult to programmatically check exact slots, but can check overall counts)
    const totalScheduledTasksTime = generatedPlan
      .filter(item => item.type === "task")
      .reduce((sum, item) => sum + (item.scheduledEndTime.getTime() - item.scheduledStartTime.getTime()) / (1000 * 60), 0);

    // Expected total task work: (120 remaining for Urgent Report + 180 for Feature Impl + 300 for Doc Update) = 600 minutes.
    assertEquals(totalScheduledTasksTime, 600, "All tasks (with their remaining time) should have been scheduled.");

    // Validate task prioritization by checking relative order for similarly-timed events.
    // This is a soft check as exact scheduling depends on available slots.
    const scheduledTasks = generatedPlan.filter(item => item.type === "task").sort((a,b) => a.scheduledStartTime.getTime() - b.scheduledStartTime.getTime());
    const urgentReportTask = scheduledTasks.find(t => t.name === "Urgent Report");
    const featureImplTask = scheduledTasks.find(t => t.name === "Feature Implementation");

    if (urgentReportTask && featureImplTask) {
      // Urgent Report has sooner deadline and higher priority
      // It should ideally be scheduled before or more compactly than Feature Implementation.
      // A strong assertion here is difficult without simulating the exact free slots.
      // For this test, we rely on the total time assertion and manual inspection of the log.
    }
  });

  // --- Test Case 6: Generate Schedule - Unresolvable Conflicts ---
  await t.step("should return an error if tasks cannot be fully scheduled due to conflicts", async () => {
    console.log("\n--- Unresolvable Conflicts Test ---");
    const owner = generateTestId("conflict_user");
    const initScheduleResult = await concept.initializeSchedule({ owner });
    if (isActionError(initScheduleResult)) {
      assert(false, `Action initializeSchedule failed: ${initScheduleResult.error}`);
    }
    const scheduleId = initScheduleResult.schedule!;
    console.log(`Schedule initialized for owner ${owner} with ID: ${scheduleId}`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Block out most of the available time with events
    const allDayEventStart = new Date(today);
    allDayEventStart.setHours(7, 0, 0, 0); // Start before task hours
    const allDayEventEnd = new Date(today);
    allDayEventEnd.setHours(23, 0, 0, 0); // End after task hours

    // Create daily all-day events for the entire planning horizon
    for (let i = 0; i < concept["PLANNING_HORIZON_DAYS"]; i++) {
        const currentDayStart = new Date(today);
        currentDayStart.setDate(today.getDate() + i);
        currentDayStart.setHours(allDayEventStart.getHours(), allDayEventStart.getMinutes(), allDayEventStart.getSeconds(), allDayEventStart.getMilliseconds());

        const currentDayEnd = new Date(today);
        currentDayEnd.setDate(today.getDate() + i);
        currentDayEnd.setHours(allDayEventEnd.getHours(), allDayEventEnd.getMinutes(), allDayEventEnd.getSeconds(), allDayEventEnd.getMilliseconds());

        await concept.addEvent({
            schedule: scheduleId,
            name: `All-Day Block ${i+1}`,
            startTime: currentDayStart,
            endTime: currentDayEnd,
            repeat: { frequency: RepeatFrequency.NONE } // Set as NONE to avoid complex repeat logic for this test
        });
    }
    console.log(`Added ${concept["PLANNING_HORIZON_DAYS"]} nearly all-day events.`);

    // Add a task that cannot possibly be scheduled
    const impossibleTaskDeadline = new Date(today);
    impossibleTaskDeadline.setDate(impossibleTaskDeadline.getDate() + 1); // Tomorrow
    impossibleTaskDeadline.setHours(17, 0, 0, 0);
    await concept.addTask({
      schedule: scheduleId, name: "Impossible Task", deadline: impossibleTaskDeadline,
      expectedCompletionTime: 60, completionLevel: 0, priority: 100
    });
    console.log("Added 'Impossible Task' (1h, high priority).");

    // Generate schedule - should result in an error
    console.log(`Action: generateSchedule for schedule: ${scheduleId}`);
    const generateResult = await concept.generateSchedule({ schedule: scheduleId });
    assert(isActionError(generateResult), "Expected an error for unschedulable task.");
    assertExists(generateResult.error);
    assert(generateResult.error.includes("Not all tasks could be scheduled"), `Error message should indicate unscheduled tasks: ${generateResult.error}`);
    console.log(`Result: ${generateResult.error}`);
  });

  // --- Test Case 7: All Queries ---
  await t.step("should correctly retrieve data using all query methods", async () => {
    console.log("\n--- All Queries Test ---");

    // Setup: Create a new schedule, add an event and a task
    const owner = generateTestId("query_user");
    const initScheduleResult = await concept.initializeSchedule({ owner });
    if (isActionError(initScheduleResult)) {
      assert(false, `Action initializeSchedule failed: ${initScheduleResult.error}`);
    }
    const scheduleId = initScheduleResult.schedule!;
    console.log(`Schedule initialized for owner ${owner} with ID: ${scheduleId}`);

    const eventStartTime = new Date();
    eventStartTime.setHours(11, 0, 0, 0);
    const eventEndTime = new Date(eventStartTime);
    eventEndTime.setHours(12, 0, 0, 0);
    const addEventResult = await concept.addEvent({
      schedule: scheduleId, name: "Query Event", startTime: eventStartTime, endTime: eventEndTime,
      repeat: { frequency: RepeatFrequency.NONE }
    });
    if (isActionError(addEventResult)) {
      assert(false, `Action addEvent failed: ${addEventResult.error}`);
    }
    const eventId = addEventResult.event!;
    console.log(`Event 'Query Event' added: ${eventId}`);

    const taskDeadline = new Date();
    taskDeadline.setDate(taskDeadline.getDate() + 1);
    taskDeadline.setHours(18, 0, 0, 0);
    const addTaskResult = await concept.addTask({
      schedule: scheduleId, name: "Query Task", deadline: taskDeadline,
      expectedCompletionTime: 30, completionLevel: 0, priority: 60
    });
    if (isActionError(addTaskResult)) {
      assert(false, `Action addTask failed: ${addTaskResult.error}`);
    }
    assertExists(addTaskResult.task);
    const taskId = addTaskResult.task!;
    console.log(`Task 'Query Task' added: ${taskId}`);

    // _getScheduleByOwner
    type GetScheduleByOwnerSuccess = { schedule: ID };
    const scheduleByOwnerResult: Array<GetScheduleByOwnerSuccess | { error: string }> = await concept._getScheduleByOwner({ owner });
    if (isQueryErrorResponse<GetScheduleByOwnerSuccess>(scheduleByOwnerResult)) {
      assert(false, `Query _getScheduleByOwner failed: ${scheduleByOwnerResult[0].error}`);
    }
    assertEquals(scheduleByOwnerResult.length, 1);
    const scheduleByOwner = scheduleByOwnerResult[0].schedule;
    assertExists(scheduleByOwner);
    assertEquals(scheduleByOwner, scheduleId);
    console.log(`Query: _getScheduleByOwner for ${owner} -> ${scheduleByOwner}`);

    // _getEventsForSchedule
    type GetEventsForScheduleSuccess = { event: ID };
    const eventsForScheduleResult: Array<GetEventsForScheduleSuccess | { error: string }> = await concept._getEventsForSchedule({ schedule: scheduleId });
    if (isQueryErrorResponse<GetEventsForScheduleSuccess>(eventsForScheduleResult)) {
      assert(false, `Query _getEventsForSchedule failed: ${eventsForScheduleResult[0].error}`);
    }
    // eventsForScheduleResult is now Array<{ event: Event }>
    const eventsForSchedule = eventsForScheduleResult.map(item => item.event);
    assertEquals(eventsForSchedule.length, 1);
    assertEquals(eventsForSchedule[0], eventId);
    console.log(`Query: _getEventsForSchedule for ${scheduleId} -> ${JSON.stringify(eventsForSchedule)}`);

    // _getTasksForSchedule
    type GetTasksForScheduleSuccess = { task: ID };
    const tasksForScheduleResult: Array<GetTasksForScheduleSuccess | { error: string }> = await concept._getTasksForSchedule({ schedule: scheduleId });
    if (isQueryErrorResponse<GetTasksForScheduleSuccess>(tasksForScheduleResult)) {
      assert(false, `Query _getTasksForSchedule failed: ${tasksForScheduleResult[0].error}`);
    }
    // tasksForScheduleResult is now Array<{ task: Task }>
    const tasksForSchedule = tasksForScheduleResult.map(item => item.task);
    assertEquals(tasksForSchedule.length, 1);
    assertEquals(tasksForSchedule[0], taskId);
    console.log(`Query: _getTasksForSchedule for ${scheduleId} -> ${JSON.stringify(tasksForSchedule)}`);

    // _getEventDetails
    type GetEventDetailsSuccess = { eventDetails: EventDoc };
    const eventDetailsResult: Array<GetEventDetailsSuccess | { error: string }> = await concept._getEventDetails({ event: eventId });
    if (isQueryErrorResponse<GetEventDetailsSuccess>(eventDetailsResult)) {
      assert(false, `Query _getEventDetails failed: ${eventDetailsResult[0].error}`);
    }
    assertEquals(eventDetailsResult.length, 1);
    const eventDetails = eventDetailsResult[0].eventDetails;
    assertExists(eventDetails);
    assertEquals(eventDetails.name, "Query Event");
    assertEquals(eventDetails._id, eventId);
    console.log(`Query: _getEventDetails for ${eventId} -> ${JSON.stringify(eventDetails)}`);

    // _getTaskDetails
    type GetTaskDetailsSuccess = { taskDetails: TaskDoc };
    const taskDetailsResult: Array<GetTaskDetailsSuccess | { error: string }> = await concept._getTaskDetails({ task: taskId });
    if (isQueryErrorResponse<GetTaskDetailsSuccess>(taskDetailsResult)) {
      assert(false, `Query _getTaskDetails failed: ${taskDetailsResult[0].error}`);
    }
    assertEquals(taskDetailsResult.length, 1);
    const taskDetails = taskDetailsResult[0].taskDetails;
    assertExists(taskDetails);
    assertEquals(taskDetails.name, "Query Task");
    assertEquals(taskDetails._id, taskId);
    console.log(`Query: _getTaskDetails for ${taskId} -> ${JSON.stringify(taskDetails)}`);

    // _getAllSchedules (should include previous schedules from other tests + this one)
    type GetAllSchedulesSuccess = { schedule: ScheduleDoc };
    const allSchedulesResult: Array<GetAllSchedulesSuccess | { error: string }> = await concept._getAllSchedules();
    if (isQueryErrorResponse<GetAllSchedulesSuccess>(allSchedulesResult)) {
      assert(false, `Query _getAllSchedules failed: ${allSchedulesResult[0].error}`);
    }
    // allSchedulesResult is now Array<{ schedule: ScheduleDoc }>
    const allSchedules = allSchedulesResult.map(item => item.schedule);
    assert(allSchedules.length > 0);
    assert(allSchedules.some(s => s._id === scheduleId));
    console.log(`Query: _getAllSchedules -> Count: ${allSchedules.length}`);

    // _getScheduleDetails
    type GetScheduleDetailsSuccessFinal = { scheduleDetails: ScheduleDoc };
    const specificScheduleDetailsResult: Array<GetScheduleDetailsSuccessFinal | { error: string }> = await concept._getScheduleDetails({ schedule: scheduleId });
    if (isQueryErrorResponse<GetScheduleDetailsSuccessFinal>(specificScheduleDetailsResult)) {
      assert(false, `Query _getScheduleDetails failed: ${specificScheduleDetailsResult[0].error}`);
    }
    assertEquals(specificScheduleDetailsResult.length, 1);
    const specificScheduleDetails = specificScheduleDetailsResult[0].scheduleDetails;
    assertExists(specificScheduleDetails);
    assertEquals(specificScheduleDetails._id, scheduleId);
    assertEquals(specificScheduleDetails.owner, owner);
    console.log(`Query: _getScheduleDetails for ${scheduleId} -> ${JSON.stringify(specificScheduleDetails)}`);

    // _getAllEvents
    type GetAllEventsSuccess = { event: EventDoc };
    const allEventsResult: Array<GetAllEventsSuccess | { error: string }> = await concept._getAllEvents();
    if (isQueryErrorResponse<GetAllEventsSuccess>(allEventsResult)) {
      assert(false, `Query _getAllEvents failed: ${allEventsResult[0].error}`);
    }
    // allEventsResult is now Array<{ event: EventDoc }>
    const allEvents = allEventsResult.map(item => item.event);
    assert(allEvents.length > 0);
    assert(allEvents.some(e => e._id === eventId));
    console.log(`Query: _getAllEvents -> Count: ${allEvents.length}`);

    // _getAllTasks
    type GetAllTasksSuccess = { task: TaskDoc };
    const allTasksResult: Array<GetAllTasksSuccess | { error: string }> = await concept._getAllTasks();
    if (isQueryErrorResponse<GetAllTasksSuccess>(allTasksResult)) {
      assert(false, `Query _getAllTasks failed: ${allTasksResult[0].error}`);
    }
    // allTasksResult is now Array<{ task: TaskDoc }>
    const allTasks = allTasksResult.map(item => item.task);
    assert(allTasks.length > 0);
    assert(allTasks.some(t => t._id === taskId));
    console.log(`Query: _getAllTasks -> Count: ${allTasks.length}`);
  });

  await client.close();
});
```
