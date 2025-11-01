---
timestamp: 'Fri Oct 31 2025 19:55:33 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251031_195533.745ebb86.md]]'
content_id: 6fa206acb874467c5ae6fd45e2c65a22738329ec1055701eb9846ddd9a84ab3a
---

# response:

```typescript
// file: src/ScheduleGenerator/ScheduleGeneratorConcept.test.ts
import { Collection, Db } from "npm:mongodb";
import { assertEquals, assertExists, assert, assertArrayIncludes } from "jsr:@std/assert";
import { testDb } from "../../utils/database.ts";
import ScheduleGeneratorConcept from "./ScheduleGeneratorConcept.ts";
import { ID } from "../../utils/types.ts";

// Re-declare types used in the concept for consistency in tests.
// These are primarily for making assertions clearer.
type User = ID;
type Schedule = ID;
type Event = ID;
type Task = ID;
type Percent = number;

enum RepeatFrequency {
  NONE = "NONE",
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY",
}

interface RepeatConfig {
  frequency: RepeatFrequency;
  daysOfWeek?: number[];
}

// Interfaces matching the Concept's internal document structure for clearer assertions
interface ScheduleDoc {
  _id: Schedule;
  owner: User;
  scheduleID: number;
}

interface EventDoc {
  _id: Event;
  name: string;
  eventID: number;
  scheduleID: number;
  startTime: Date;
  endTime: Date;
  repeat: RepeatConfig;
}

interface TaskDoc {
  _id: Task;
  name: string;
  taskID: number;
  scheduleID: number;
  deadline: Date;
  expectedCompletionTime: number;
  completionLevel: Percent;
  priority: Percent;
}

interface ScheduledItem {
  type: "event" | "task";
  originalId: Event | Task;
  name: string;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
}

Deno.test("ScheduleGeneratorConcept", async (t) => {
  let db: Db;
  let client: any; // MongoClient type is not directly exported for some reason in this setup.
  let concept: ScheduleGeneratorConcept;

  Deno.test.beforeAll(async () => {
    [db, client] = await testDb();
    concept = new ScheduleGeneratorConcept(db);
    console.log("Database and Concept initialized for tests.");
  });

  Deno.test.afterAll(async () => {
    await client.close();
    console.log("Database client closed after all tests.");
  });

  // Helper to ensure Date objects are always passed and received correctly
  // Month is 1-indexed for convenience
  const createDate = (
    year: number,
    month: number,
    day: number,
    hour: number = 0,
    minute: number = 0,
    second: number = 0,
  ) => new Date(year, month - 1, day, hour, minute, second);

  // Helper to advance date by N days
  const addDays = (date: Date, days: number): Date => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
  };

  // --- Operational Principle Test ---
  await t.step("Operational Principle: Full scheduling lifecycle", async () => {
    console.log("\n--- Operational Principle Test: Full scheduling lifecycle ---");

    const owner1 = "user:Alice" as User;

    // 1. Initialize schedule
    console.log("Action: initializeSchedule for owner:", owner1);
    const initResult = await concept.initializeSchedule({ owner: owner1 });
    assertExists(initResult.schedule, "Expected schedule to be initialized");
    const scheduleId = initResult.schedule!;
    console.log("Result: Initialized schedule _id:", scheduleId);

    // 2. Add events
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day for consistent planning horizon relative dates

    const event1Date = addDays(today, 1); // Tomorrow
    const event1StartTime = createDate(event1Date.getFullYear(), event1Date.getMonth() + 1, event1Date.getDate(), 9, 0);
    const event1EndTime = createDate(event1Date.getFullYear(), event1Date.getMonth() + 1, event1Date.getDate(), 10, 0);
    
    const event2Date = addDays(today, 3); // A few days from now, Monday if today is Friday/Saturday
    event2Date.setDate(event2Date.getDate() + (1 - event2Date.getDay() + 7) % 7); // Ensure it's a Monday
    const event2StartTime = createDate(event2Date.getFullYear(), event2Date.getMonth() + 1, event2Date.getDate(), 11, 0);
    const event2EndTime = createDate(event2Date.getFullYear(), event2Date.getMonth() + 1, event2Date.getDate(), 12, 0);

    console.log("Action: addEvent - Daily Standup (Daily)");
    const addEvent1Result = await concept.addEvent({
      schedule: scheduleId,
      name: "Daily Standup",
      startTime: event1StartTime, // Base time
      endTime: event1EndTime,
      repeat: { frequency: RepeatFrequency.DAILY },
    });
    assertExists(addEvent1Result.event, "Expected Daily Standup event to be added");
    const event1Id = addEvent1Result.event!;
    console.log("Result: Added event 1 (Daily Standup):", event1Id);

    console.log("Action: addEvent - Weekly Review (Weekly on Monday)");
    const addEvent2Result = await concept.addEvent({
      schedule: scheduleId,
      name: "Weekly Review",
      startTime: event2StartTime, // Base time (Monday)
      endTime: event2EndTime,
      repeat: { frequency: RepeatFrequency.WEEKLY, daysOfWeek: [1] }, // Monday is 1
    });
    assertExists(addEvent2Result.event, "Expected Weekly Review event to be added");
    const event2Id = addEvent2Result.event!;
    console.log("Result: Added event 2 (Weekly Review):", event2Id);

    // 3. Add tasks
    const task1Deadline = addDays(today, 2); // Sooner deadline
    const task2Deadline = addDays(today, 4); // Later deadline
    const task3Deadline = addDays(today, 2); // Same deadline as Task 1, lower priority

    console.log("Action: addTask - Prepare presentation (High Priority, Soon Deadline)");
    const addTask1Result = await concept.addTask({
      schedule: scheduleId,
      name: "Prepare presentation",
      deadline: task1Deadline,
      expectedCompletionTime: 120, // 2 hours
      completionLevel: 0,
      priority: 90,
    });
    assertExists(addTask1Result.task, "Expected task 1 to be added");
    const task1Id = addTask1Result.task!;
    console.log("Result: Added task 1 (Prepare presentation):", task1Id);

    console.log("Action: addTask - Write report (Medium Priority, Later Deadline)");
    const addTask2Result = await concept.addTask({
      schedule: scheduleId,
      name: "Write report",
      deadline: task2Deadline,
      expectedCompletionTime: 180, // 3 hours
      completionLevel: 0,
      priority: 70,
    });
    assertExists(addTask2Result.task, "Expected task 2 to be added");
    const task2Id = addTask2Result.task!;
    console.log("Result: Added task 2 (Write report):", task2Id);
    
    console.log("Action: addTask - Respond to emails (Lower Priority, Same Deadline as Task 1)");
    const addTask3Result = await concept.addTask({
      schedule: scheduleId,
      name: "Respond to emails",
      deadline: task3Deadline,
      expectedCompletionTime: 60, // 1 hour
      completionLevel: 0,
      priority: 60,
    });
    assertExists(addTask3Result.task, "Expected task 3 to be added");
    const task3Id = addTask3Result.task!;
    console.log("Result: Added task 3 (Respond to emails):", task3Id);

    // 4. Generate schedule for the first time
    console.log("\nAction: generateSchedule (initial)");
    const generateResult1 = await concept.generateSchedule({ schedule: scheduleId });
    assertExists(generateResult1.generatedPlan, "Expected a generated plan");
    assert(!generateResult1.error, `Expected no error, but got: ${generateResult1.error}`);
    assert(generateResult1.generatedPlan!.length > 0, "Expected generated plan to contain items");
    const initialPlan = generateResult1.generatedPlan!;
    console.log("Result: Initial Generated Plan (first 5 items):\n", initialPlan.slice(0, 5).map(item => ({...item, scheduledStartTime: item.scheduledStartTime.toLocaleString(), scheduledEndTime: item.scheduledEndTime.toLocaleString()})), "\n...");
    
    const taskNamesInPlan = initialPlan.filter(item => item.type === 'task').map(item => item.name);
    assertArrayIncludes(taskNamesInPlan, ["Prepare presentation", "Write report", "Respond to emails"], "Expected all tasks to be in the initial plan.");

    // Simple check for task prioritization: Task 1 (Prepare presentation) should be scheduled before Task 3 (Respond to emails) due to higher priority with same deadline
    const task1Item = initialPlan.find(item => item.originalId === task1Id);
    const task3Item = initialPlan.find(item => item.originalId === task3Id);
    assertExists(task1Item);
    assertExists(task3Item);
    assert(task1Item.scheduledStartTime <= task3Item.scheduledStartTime, "Expected Task 1 to start at or before Task 3 due to higher priority.");

    // 5. Edit an event - change its time
    const newEvent2StartTime = createDate(event2Date.getFullYear(), event2Date.getMonth() + 1, event2Date.getDate(), 14, 0); // New time for Weekly Review
    const newEvent2EndTime = createDate(event2Date.getFullYear(), event2Date.getMonth() + 1, event2Date.getDate(), 15, 0);
    console.log("\nAction: editEvent - Change Weekly Review time for event:", event2Id);
    const editEventResult = await concept.editEvent({
      schedule: scheduleId,
      oldEvent: event2Id,
      name: "Weekly Review (New Time)",
      startTime: newEvent2StartTime,
      endTime: newEvent2EndTime,
      repeat: { frequency: RepeatFrequency.WEEKLY, daysOfWeek: [1] }, // Monday is 1
    });
    assertEquals(editEventResult, {}, "Expected event to be edited successfully");
    console.log("Result: Event 2 edited.");

    // 6. Edit a task - update completion level
    const newTask1Completion = 50; // Progress to 50%
    console.log("Action: editTask - Update 'Prepare presentation' completion level for task:", task1Id);
    const editTaskResult = await concept.editTask({
      schedule: scheduleId,
      oldTask: task1Id,
      name: "Prepare presentation",
      deadline: task1Deadline,
      expectedCompletionTime: 120,
      completionLevel: newTask1Completion,
      priority: 90,
    });
    assertEquals(editTaskResult, {}, "Expected task to be edited successfully");
    console.log("Result: Task 1 completion level updated to", newTask1Completion, "%");

    // 7. Regenerate schedule
    console.log("\nAction: generateSchedule (after edit)");
    const generateResult2 = await concept.generateSchedule({ schedule: scheduleId });
    assertExists(generateResult2.generatedPlan, "Expected a regenerated plan");
    assert(!generateResult2.error, `Expected no error, but got: ${generateResult2.error}`);
    assert(generateResult2.generatedPlan!.length > 0, "Expected regenerated plan to contain items");
    const regeneratedPlan = generateResult2.generatedPlan!;
    console.log("Result: Regenerated Plan (first 5 items):\n", regeneratedPlan.slice(0,5).map(item => ({...item, scheduledStartTime: item.scheduledStartTime.toLocaleString(), scheduledEndTime: item.scheduledEndTime.toLocaleString()})), "\n...");

    // Verify the edited event's time slot has changed if present for its scheduled day
    const updatedEvent2InPlan = regeneratedPlan.find(item => item.originalId === event2Id && item.type === 'event' && item.scheduledStartTime.getDay() === 1); // For a Monday
    if (updatedEvent2InPlan) {
      assertEquals(updatedEvent2InPlan.scheduledStartTime.getHours(), newEvent2StartTime.getHours(), "Expected updated event start hour in regenerated plan");
      assertEquals(updatedEvent2InPlan.scheduledEndTime.getHours(), newEvent2EndTime.getHours(), "Expected updated event end hour in regenerated plan");
    } else {
        console.warn("Weekly Review event (Monday) was not found in the regenerated plan for its scheduled day. This might be expected if the planning horizon does not cover the next Monday relative to current `today` in tests, or if it ended up being filtered out.");
    }
    
    // Verify tasks are re-prioritized/re-scheduled based on new completion level
    const task1InRegeneratedPlan = regeneratedPlan.find(item => item.originalId === task1Id);
    assertExists(task1InRegeneratedPlan, "Expected Task 1 to still be in the plan.");
    // Detailed verification of re-prioritization is complex, but its presence and lack of error is a good sign.

    // 8. Delete a task
    console.log("\nAction: deleteTask - Delete 'Write report' task:", task2Id);
    const deleteTaskResult = await concept.deleteTask({ schedule: scheduleId, task: task2Id });
    assertEquals(deleteTaskResult, {}, "Expected task to be deleted successfully");
    console.log("Result: Task 2 deleted.");

    // 9. Regenerate schedule again
    console.log("\nAction: generateSchedule (after delete)");
    const generateResult3 = await concept.generateSchedule({ schedule: scheduleId });
    assertExists(generateResult3.generatedPlan, "Expected a final regenerated plan");
    assert(!generateResult3.error, `Expected no error, but got: ${generateResult3.error}`);
    const finalPlan = generateResult3.generatedPlan!;
    console.log("Result: Final Generated Plan (first 5 items):\n", finalPlan.slice(0,5).map(item => ({...item, scheduledStartTime: item.scheduledStartTime.toLocaleString(), scheduledEndTime: item.scheduledEndTime.toLocaleString()})), "\n...");

    const deletedTaskInFinalPlan = finalPlan.find(item => item.originalId === task2Id);
    assertEquals(deletedTaskInFinalPlan, undefined, "Expected deleted task not to be in the final plan");

    const remainingTaskNames = finalPlan.filter(item => item.type === 'task').map(item => item.name);
    assertArrayIncludes(remainingTaskNames, ["Prepare presentation", "Respond to emails"], "Expected only remaining tasks in the final plan.");

    console.log("--- Operational Principle Test Completed Successfully ---");
  });

  // --- Additional Interesting Scenarios ---

  await t.step("Scenario 1: Initialize schedule for existing user (idempotency)", async () => {
    console.log("\n--- Scenario 1: Initialize schedule for existing user ---");
    const owner = "user:Bob" as User;

    console.log("Action: initializeSchedule for new owner:", owner);
    const initResult1 = await concept.initializeSchedule({ owner });
    assertExists(initResult1.schedule, "Expected a new schedule to be initialized");
    const scheduleId1 = initResult1.schedule!;
    console.log("Result: First initialization, schedule ID:", scheduleId1);

    console.log("Action: initializeSchedule again for the same owner:", owner);
    const initResult2 = await concept.initializeSchedule({ owner });
    assertExists(initResult2.schedule, "Expected an existing schedule to be returned");
    const scheduleId2 = initResult2.schedule!;
    console.log("Result: Second initialization, schedule ID:", scheduleId2);

    assertEquals(
      scheduleId1,
      scheduleId2,
      "Expected the same schedule ID for the same owner on re-initialization",
    );
    console.log("Scenario 1 Completed Successfully: initializeSchedule is idempotent for owner.");
  });

  await t.step("Scenario 2: Event and Task CRUD operations and error handling", async () => {
    console.log("\n--- Scenario 2: Event and Task CRUD operations and error handling ---");
    const owner = "user:Charlie" as User;
    const initResult = await concept.initializeSchedule({ owner });
    assertExists(initResult.schedule);
    const scheduleId = initResult.schedule!;
    console.log("Initialized schedule for Charlie:", scheduleId);

    // Test addEvent with invalid dates (end before start)
    console.log("Action: addEvent (invalid dates: end before start)");
    const invalidEventResult = await concept.addEvent({
      schedule: scheduleId,
      name: "Invalid Event",
      startTime: createDate(2023, 1, 1, 10, 0),
      endTime: createDate(2023, 1, 1, 9, 0), // End before start
      repeat: { frequency: RepeatFrequency.NONE },
    });
    assertExists(invalidEventResult.error, "Expected error for invalid event times");
    console.log("Result (error):", invalidEventResult.error);

    // Test addEvent with invalid weekly repeat config (empty daysOfWeek)
    console.log("Action: addEvent (invalid weekly repeat: empty daysOfWeek)");
    const invalidWeeklyEventResult = await concept.addEvent({
      schedule: scheduleId,
      name: "Invalid Weekly Event",
      startTime: createDate(2023, 1, 1, 10, 0),
      endTime: createDate(2023, 1, 1, 11, 0),
      repeat: { frequency: RepeatFrequency.WEEKLY, daysOfWeek: [] }, // Empty daysOfWeek
    });
    assertExists(invalidWeeklyEventResult.error, "Expected error for empty daysOfWeek in weekly repeat");
    console.log("Result (error):", invalidWeeklyEventResult.error);

    // Test addTask with invalid expectedCompletionTime (zero)
    console.log("Action: addTask (invalid expectedCompletionTime: zero)");
    const invalidTaskResult1 = await concept.addTask({
      schedule: scheduleId,
      name: "Invalid Task Duration",
      deadline: createDate(2023, 12, 1),
      expectedCompletionTime: 0, // Zero duration
      completionLevel: 0,
      priority: 50,
    });
    assertExists(invalidTaskResult1.error, "Expected error for zero expectedCompletionTime");
    console.log("Result (error):", invalidTaskResult1.error);

    // Test addTask with invalid completionLevel (> 100)
    console.log("Action: addTask (invalid completionLevel: > 100)");
    const invalidTaskResult2 = await concept.addTask({
      schedule: scheduleId,
      name: "Invalid Task Completion",
      deadline: createDate(2023, 12, 1),
      expectedCompletionTime: 60,
      completionLevel: 101, // > 100%
      priority: 50,
    });
    assertExists(invalidTaskResult2.error, "Expected error for completionLevel > 100");
    console.log("Result (error):", invalidTaskResult2.error);

    // Add a valid event and task
    console.log("Action: addEvent (valid)");
    const validEventResult = await concept.addEvent({
      schedule: scheduleId,
      name: "Morning Meeting",
      startTime: createDate(2023, 11, 15, 9, 0),
      endTime: createDate(2023, 11, 15, 9, 30),
      repeat: { frequency: RepeatFrequency.NONE },
    });
    assertExists(validEventResult.event);
    const eventId = validEventResult.event!;
    console.log("Result: Added valid event:", eventId);

    console.log("Action: addTask (valid)");
    const validTaskResult = await concept.addTask({
      schedule: scheduleId,
      name: "Project Planning",
      deadline: createDate(2023, 11, 17, 18, 0),
      expectedCompletionTime: 240, // 4 hours
      completionLevel: 25, // 25% done
      priority: 80,
    });
    assertExists(validTaskResult.task);
    const taskId = validTaskResult.task!;
    console.log("Result: Added valid task:", taskId);

    // Test deleting non-existent event
    console.log("Action: deleteEvent (non-existent)");
    const deleteNonExistentEventResult = await concept.deleteEvent({ schedule: scheduleId, event: "non-existent-event" as Event });
    assertExists(deleteNonExistentEventResult.error, "Expected error for deleting non-existent event");
    console.log("Result (error):", deleteNonExistentEventResult.error);

    // Delete the valid event
    console.log("Action: deleteEvent (valid)");
    const deleteValidEventResult = await concept.deleteEvent({ schedule: scheduleId, event: eventId });
    assertEquals(deleteValidEventResult, {}, "Expected successful deletion of event");
    console.log("Result: Valid event deleted.");

    // Verify event is gone using query
    const getEventsResult = await concept._getEventDetails({ event: eventId });
    assertExists(getEventsResult.error, "Expected error when getting details of deleted event");
    console.log("Result: Verified event is deleted.");

    console.log("Scenario 2 Completed Successfully.");
  });

  await t.step("Scenario 3: Schedule Generation with conflicts and full utilization", async () => {
    console.log("\n--- Scenario 3: Schedule Generation with conflicts and full utilization ---");
    const owner = "user:Diana" as User;
    const initResult = await concept.initializeSchedule({ owner });
    assertExists(initResult.schedule);
    const scheduleId = initResult.schedule!;
    console.log("Initialized schedule for Diana:", scheduleId);

    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = addDays(today, 1);
    const dayAfterTomorrow = addDays(today, 2);

    // Event 1: Daily all-day meeting (to block out all task time)
    // The `today` in generateSchedule is relative. For consistent testing, ensure these events are in the future from now.
    const allDayEventStart = createDate(tomorrow.getFullYear(), tomorrow.getMonth() + 1, tomorrow.getDate(), 8, 0); // Start tomorrow 8 AM
    const allDayEventEnd = createDate(tomorrow.getFullYear(), tomorrow.getMonth() + 1, tomorrow.getDate(), 22, 0); // End tomorrow 10 PM

    console.log("Action: addEvent - All-day meeting (Daily)");
    const allDayEventResult = await concept.addEvent({
      schedule: scheduleId,
      name: "All-day Work Meeting",
      startTime: allDayEventStart,
      endTime: allDayEventEnd,
      repeat: { frequency: RepeatFrequency.DAILY },
    });
    assertExists(allDayEventResult.event);
    console.log("Result: Added all-day event.");

    // Task 1: A short task
    console.log("Action: addTask - Quick Check");
    const addTask1Result = await concept.addTask({
      schedule: scheduleId,
      name: "Quick Check",
      deadline: tomorrow,
      expectedCompletionTime: 30, // 30 mins
      completionLevel: 0,
      priority: 60,
    });
    assertExists(addTask1Result.task);
    console.log("Result: Added short task.");

    // Generate schedule - expect an error because the event blocks all available task time for tomorrow
    console.log("Action: generateSchedule (with conflict)");
    const generateConflictResult = await concept.generateSchedule({ schedule: scheduleId });
    assertExists(generateConflictResult.error, "Expected error because no time for tasks due to all-day event");
    console.log("Result (error):", generateConflictResult.error);

    // Delete the blocking event
    console.log("Action: deleteEvent - Delete All-day Work Meeting");
    await concept.deleteEvent({ schedule: scheduleId, event: allDayEventResult.event! });
    console.log("Result: Deleted all-day event.");

    // Add multiple tasks that will fill up the day
    console.log("Action: addTask - Multiple tasks to fill a day");
    // Assume 8 AM to 10 PM is 14 hours = 840 minutes for tasks per day
    // Task 2: 300 mins
    const addTask2Result = await concept.addTask({
      schedule: scheduleId,
      name: "Big Project Part 1",
      deadline: dayAfterTomorrow,
      expectedCompletionTime: 300,
      completionLevel: 0,
      priority: 85,
    });
    assertExists(addTask2Result.task);
    // Task 3: 300 mins
    const addTask3Result = await concept.addTask({
      schedule: scheduleId,
      name: "Big Project Part 2",
      deadline: dayAfterTomorrow,
      expectedCompletionTime: 300,
      completionLevel: 0,
      priority: 80,
    });
    assertExists(addTask3Result.task);
    // Task 4: 200 mins
    const addTask4Result = await concept.addTask({
      schedule: scheduleId,
      name: "Documentation Review",
      deadline: dayAfterTomorrow,
      expectedCompletionTime: 200,
      completionLevel: 0,
      priority: 70,
    });
    assertExists(addTask4Result.task);
    console.log("Result: Added multiple tasks for full utilization.");


    // Generate schedule again - should succeed now and fully utilize time
    console.log("Action: generateSchedule (full utilization)");
    const generateFullUtilResult = await concept.generateSchedule({ schedule: scheduleId });
    assertExists(generateFullUtilResult.generatedPlan, "Expected successful schedule generation");
    assert(!generateFullUtilResult.error, `Expected no error, but got: ${generateFullUtilResult.error}`);
    const fullUtilPlan = generateFullUtilResult.generatedPlan!;
    console.log("Result: Generated Plan (first 5 items):\n", fullUtilPlan.slice(0,5).map(item => ({...item, scheduledStartTime: item.scheduledStartTime.toLocaleString(), scheduledEndTime: item.scheduledEndTime.toLocaleString()})), "\n...");
    
    const scheduledTaskItems = fullUtilPlan.filter(item => item.type === 'task');
    assertEquals(scheduledTaskItems.length, 4, "Expected all 4 tasks to be scheduled.");

    // Verify task prioritization
    // Quick Check (tomorrow deadline) should be first task generally.
    // Among others (dayAfterTomorrow deadline): P1 (85), P2 (80), Doc (70).
    const taskIdsInOrder: ID[] = [];
    const quickCheckTaskDetails = await concept._getTaskDetails({task: addTask1Result.task!});
    if (quickCheckTaskDetails.taskDetails) taskIdsInOrder.push(quickCheckTaskDetails.taskDetails[0]._id);
    const bigProject1Details = await concept._getTaskDetails({task: addTask2Result.task!});
    if (bigProject1Details.taskDetails) taskIdsInOrder.push(bigProject1Details.taskDetails[0]._id);
    const bigProject2Details = await concept._getTaskDetails({task: addTask3Result.task!});
    if (bigProject2Details.taskDetails) taskIdsInOrder.push(bigProject2Details.taskDetails[0]._id);
    const docReviewDetails = await concept._getTaskDetails({task: addTask4Result.task!});
    if (docReviewDetails.taskDetails) taskIdsInOrder.push(docReviewDetails.taskDetails[0]._id);

    // This is a simplified check for relative order, assuming sufficient free slots.
    // The core idea is that tasks with earlier deadlines come first, then higher priority.
    // Quick Check (tomorrow deadline) should appear before any dayAfterTomorrow tasks.
    const qcTaskItem = scheduledTaskItems.find(item => item.originalId === addTask1Result.task!);
    assertExists(qcTaskItem, "Quick Check task should be present.");

    const dayAfterTomorrowTasks = scheduledTaskItems.filter(item => {
      const taskDoc = [addTask2Result.task!, addTask3Result.task!, addTask4Result.task!].includes(item.originalId as Task);
      return taskDoc;
    });

    if (qcTaskItem) {
      for (const otherTask of dayAfterTomorrowTasks) {
        assert(qcTaskItem.scheduledStartTime < otherTask.scheduledStartTime, "Expected Quick Check to start before tasks with later deadlines.");
      }
    }
    
    console.log("Scenario 3 Completed Successfully.");
  });

  await t.step("Scenario 4: Queries for schedule components", async () => {
    console.log("\n--- Scenario 4: Queries for schedule components ---");
    const owner = "user:Eve" as User;
    const initResult = await concept.initializeSchedule({ owner });
    assertExists(initResult.schedule);
    const scheduleId = initResult.schedule!;
    console.log("Initialized schedule for Eve:", scheduleId);

    const eventName = "Evening Class";
    const taskName = "Read Book Chapter";
    const startTime = createDate(2023, 11, 20, 18, 0);
    const endTime = createDate(2023, 11, 20, 20, 0);
    const deadline = createDate(2023, 11, 22, 23, 59);

    const addEventResult = await concept.addEvent({
      schedule: scheduleId,
      name: eventName,
      startTime,
      endTime,
      repeat: { frequency: RepeatFrequency.WEEKLY, daysOfWeek: [1, 3] }, // Mon, Wed (1, 3)
    });
    assertExists(addEventResult.event);
    const eventId = addEventResult.event!;
    console.log("Added event:", eventId);

    const addTaskResult = await concept.addTask({
      schedule: scheduleId,
      name: taskName,
      deadline,
      expectedCompletionTime: 90,
      completionLevel: 0,
      priority: 75,
    });
    assertExists(addTaskResult.task);
    const taskId = addTaskResult.task!;
    console.log("Added task:", taskId);

    // Query 1: _getScheduleByOwner
    console.log("Query: _getScheduleByOwner for owner:", owner);
    const getSchedByOwnerResult = await concept._getScheduleByOwner({ owner });
    assertExists(getSchedByOwnerResult.schedule);
    assertEquals(getSchedByOwnerResult.schedule, scheduleId, "Expected to retrieve correct schedule ID by owner");
    console.log("Result: Found schedule _id:", getSchedByOwnerResult.schedule);

    // Query 2: _getEventsForSchedule
    console.log("Query: _getEventsForSchedule for schedule:", scheduleId);
    const getEventsResult = await concept._getEventsForSchedule({ schedule: scheduleId });
    assertExists(getEventsResult.event);
    assertArrayIncludes(getEventsResult.event!, [eventId], "Expected to find added event ID");
    assertEquals(getEventsResult.event!.length, 1, "Expected only one event");
    console.log("Result: Found event _ids:", getEventsResult.event);

    // Query 3: _getTasksForSchedule
    console.log("Query: _getTasksForSchedule for schedule:", scheduleId);
    const getTasksResult = await concept._getTasksForSchedule({ schedule: scheduleId });
    assertExists(getTasksResult.task);
    assertArrayIncludes(getTasksResult.task!, [taskId], "Expected to find added task ID");
    assertEquals(getTasksResult.task!.length, 1, "Expected only one task");
    console.log("Result: Found task _ids:", getTasksResult.task);

    // Query 4: _getEventDetails
    console.log("Query: _getEventDetails for event:", eventId);
    const getEventDetailsResult = await concept._getEventDetails({ event: eventId });
    assertExists(getEventDetailsResult.eventDetails);
    assertEquals(getEventDetailsResult.eventDetails![0].name, eventName, "Expected correct event name");
    assertEquals(getEventDetailsResult.eventDetails![0].startTime.toISOString(), startTime.toISOString(), "Expected correct event start time");
    console.log("Result: Event details:", getEventDetailsResult.eventDetails![0].name);

    // Query 5: _getTaskDetails
    console.log("Query: _getTaskDetails for task:", taskId);
    const getTaskDetailsResult = await concept._getTaskDetails({ task: taskId });
    assertExists(getTaskDetailsResult.taskDetails);
    assertEquals(getTaskDetailsResult.taskDetails![0].name, taskName, "Expected correct task name");
    assertEquals(getTaskDetailsResult.taskDetails![0].deadline.toISOString(), deadline.toISOString(), "Expected correct task deadline");
    console.log("Result: Task details:", getTaskDetailsResult.taskDetails![0].name);

    // Query 6: _getAllSchedules
    console.log("Query: _getAllSchedules");
    const getAllSchedulesResult = await concept._getAllSchedules();
    assertExists(getAllSchedulesResult.schedule);
    assert(getAllSchedulesResult.schedule!.length >= 1, "Expected at least one schedule");
    const currentScheduleDoc = getAllSchedulesResult.schedule!.find(s => s._id === scheduleId);
    assertExists(currentScheduleDoc, "Expected to find Eve's schedule in all schedules");
    console.log("Result: Retrieved all schedules (includes Eve's):", currentScheduleDoc?._id);

    // Query 7: _getScheduleDetails
    console.log("Query: _getScheduleDetails for schedule:", scheduleId);
    const getScheduleDetailsResult = await concept._getScheduleDetails({ schedule: scheduleId });
    assertExists(getScheduleDetailsResult.scheduleDetails);
    assertEquals(getScheduleDetailsResult.scheduleDetails![0].owner, owner, "Expected correct owner in schedule details");
    console.log("Result: Schedule details for", getScheduleDetailsResult.scheduleDetails![0].owner, ":", getScheduleDetailsResult.scheduleDetails![0]._id);

    // Query 8: _getAllEvents
    console.log("Query: _getAllEvents");
    const getAllEventsResult = await concept._getAllEvents();
    assertExists(getAllEventsResult.event);
    assert(getAllEventsResult.event!.length >= 1, "Expected at least one event");
    const currentEventDoc = getAllEventsResult.event!.find(e => e._id === eventId);
    assertExists(currentEventDoc, "Expected to find Eve's event in all events");
    console.log("Result: Retrieved all events (includes Eve's):", currentEventDoc?._id);

    // Query 9: _getAllTasks
    console.log("Query: _getAllTasks");
    const getAllTasksResult = await concept._getAllTasks();
    assertExists(getAllTasksResult.task);
    assert(getAllTasksResult.task!.length >= 1, "Expected at least one task");
    const currentTaskDoc = getAllTasksResult.task!.find(t => t._id === taskId);
    assertExists(currentTaskDoc, "Expected to find Eve's task in all tasks");
    console.log("Result: Retrieved all tasks (includes Eve's):", currentTaskDoc?._id);

    console.log("Scenario 4 Completed Successfully.");
  });

  await t.step("Scenario 5: Advanced scheduling - task completion levels and deadlines", async () => {
    console.log("\n--- Scenario 5: Advanced scheduling - task completion levels and deadlines ---");
    const owner = "user:Frank" as User;
    const initResult = await concept.initializeSchedule({ owner });
    assertExists(initResult.schedule);
    const scheduleId = initResult.schedule!;
    console.log("Initialized schedule for Frank:", scheduleId);

    const today = new Date();
    today.setHours(0,0,0,0);
    const futureDate1 = addDays(today, 3); // Soon deadline
    const futureDate2 = addDays(today, 4); // Later deadline

    // Task A: High priority, soon deadline, low completion (more remaining work)
    console.log("Action: addTask - Task A (High Priority, Soon Deadline, Low Completion)");
    const taskAResult = await concept.addTask({
      schedule: scheduleId,
      name: "Task A - Review Architecture",
      deadline: futureDate1,
      expectedCompletionTime: 180, // 3 hours
      completionLevel: 10, // 90% remaining (162 minutes)
      priority: 95,
    });
    assertExists(taskAResult.task);
    const taskAId = taskAResult.task!;
    console.log("Result: Added Task A:", taskAId);

    // Task B: Medium priority, later deadline, high completion (less remaining work)
    console.log("Action: addTask - Task B (Medium Priority, Later Deadline, High Completion)");
    const taskBResult = await concept.addTask({
      schedule: scheduleId,
      name: "Task B - Refactor Legacy Code",
      deadline: futureDate2,
      expectedCompletionTime: 240, // 4 hours
      completionLevel: 80, // Only 20% remaining (48 minutes)
      priority: 60,
    });
    assertExists(taskBResult.task);
    const taskBId = taskBResult.task!;
    console.log("Result: Added Task B:", taskBId);

    // Task C: Low priority, soon deadline, medium completion
    console.log("Action: addTask - Task C (Low Priority, Soon Deadline, Medium Completion)");
    const taskCResult = await concept.addTask({
      schedule: scheduleId,
      name: "Task C - Write Test Cases",
      deadline: futureDate1,
      expectedCompletionTime: 120, // 2 hours
      completionLevel: 50, // 50% remaining (60 minutes)
      priority: 40,
    });
    assertExists(taskCResult.task);
    const taskCId = taskCResult.task!;
    console.log("Result: Added Task C:", taskCId);

    console.log("\nAction: generateSchedule (prioritization test)");
    const generateResult = await concept.generateSchedule({ schedule: scheduleId });
    assertExists(generateResult.generatedPlan, "Expected a generated plan");
    assert(!generateResult.error, `Expected no error, but got: ${generateResult.error}`);
    const plan = generateResult.generatedPlan!;
    console.log("Result: Generated Plan (tasks only, first 5 items):\n", plan.filter(item => item.type === 'task').slice(0,5).map(item => ({...item, scheduledStartTime: item.scheduledStartTime.toLocaleString(), scheduledEndTime: item.scheduledEndTime.toLocaleString()})), "\n...");

    // Verify task ordering based on current logic (deadline, priority, expectedCompletionTime, completionLevel)
    // Task A: Deadline futureDate1, Priority 95, Remaining 162 min
    // Task B: Deadline futureDate2, Priority 60, Remaining 48 min
    // Task C: Deadline futureDate1, Priority 40, Remaining 60 min

    // Expected scheduling order logic:
    // 1. Sooner deadline first: Tasks A and C have deadline `futureDate1`. Task B has `futureDate2`.
    //    So A and C should be prioritized over B.
    // 2. Among A and C (same deadline), Task A has priority 95, Task C has priority 40.
    //    So Task A should come before Task C.
    // Thus, overall A -> C -> B (simplified for general order).

    const scheduledTasks = plan.filter(item => item.type === 'task');
    assertEquals(scheduledTasks.length, 3, "Expected all 3 tasks to be scheduled");

    const taskAInPlan = scheduledTasks.find(item => item.originalId === taskAId);
    const taskBInPlan = scheduledTasks.find(item => item.originalId === taskBId);
    const taskCInPlan = scheduledTasks.find(item => item.originalId === taskCId);

    assertExists(taskAInPlan);
    assertExists(taskBInPlan);
    assertExists(taskCInPlan);

    // A should start before C (due to priority, same deadline)
    assert(taskAInPlan.scheduledStartTime <= taskCInPlan.scheduledStartTime, "Expected Task A to start at or before Task C due to higher priority.");

    // A and C (earlier deadline) should start before B (later deadline)
    assert(taskAInPlan.scheduledStartTime <= taskBInPlan.scheduledStartTime, "Expected Task A to start at or before Task B due to earlier deadline.");
    assert(taskCInPlan.scheduledStartTime <= taskBInPlan.scheduledStartTime, "Expected Task C to start at or before Task B due to earlier deadline.");
    
    console.log("Scenario 5 Completed Successfully: Tasks prioritized and scheduled correctly.");
  });

  await t.step("Scenario 6: Event Overlap and Task Scheduling Around Events", async () => {
    console.log("\n--- Scenario 6: Event Overlap and Task Scheduling Around Events ---");
    const owner = "user:Grace" as User;
    const initResult = await concept.initializeSchedule({ owner });
    assertExists(initResult.schedule);
    const scheduleId = initResult.schedule!;
    console.log("Initialized schedule for Grace:", scheduleId);

    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = addDays(today, 1);

    // Event 1: Morning meeting
    const event1Start = createDate(tomorrow.getFullYear(), tomorrow.getMonth() + 1, tomorrow.getDate(), 9, 0);
    const event1End = createDate(tomorrow.getFullYear(), tomorrow.getMonth() + 1, tomorrow.getDate(), 10, 0);
    console.log("Action: addEvent - Event 1 (9-10 AM)");
    const addEvent1Result = await concept.addEvent({
      schedule: scheduleId, name: "Meeting A", startTime: event1Start, endTime: event1End, repeat: { frequency: RepeatFrequency.NONE }
    });
    assertExists(addEvent1Result.event);
    const event1Id = addEvent1Result.event!;

    // Event 2: Overlapping event
    const event2Start = createDate(tomorrow.getFullYear(), tomorrow.getMonth() + 1, tomorrow.getDate(), 9, 30);
    const event2End = createDate(tomorrow.getFullYear(), tomorrow.getMonth() + 1, tomorrow.getDate(), 10, 30);
    console.log("Action: addEvent - Event 2 (9:30-10:30 AM, overlapping)");
    const addEvent2Result = await concept.addEvent({
      schedule: scheduleId, name: "Meeting B (Overlap)", startTime: event2Start, endTime: event2End, repeat: { frequency: RepeatFrequency.NONE }
    });
    assertExists(addEvent2Result.event);
    const event2Id = addEvent2Result.event!;

    // Task: Needs 1 hour, deadline is end of tomorrow
    const taskDeadline = createDate(tomorrow.getFullYear(), tomorrow.getMonth() + 1, tomorrow.getDate(), 23, 0);
    console.log("Action: addTask - Task 1 (1 hour)");
    const addTaskResult = await concept.addTask({
      schedule: scheduleId, name: "Short Task", deadline: taskDeadline, expectedCompletionTime: 60, completionLevel: 0, priority: 50
    });
    assertExists(addTaskResult.task);
    const taskId = addTaskResult.task!;

    console.log("\nAction: generateSchedule (with overlapping events and task)");
    const generateResult = await concept.generateSchedule({ schedule: scheduleId });
    assertExists(generateResult.generatedPlan, "Expected a generated plan");
    assert(!generateResult.error, `Expected no error, but got: ${generateResult.error}`);
    const plan = generateResult.generatedPlan!;
    console.log("Result: Generated Plan (first 5 items for tomorrow):\n", plan.filter(item => item.scheduledStartTime.getDate() === tomorrow.getDate()).slice(0,5).map(item => ({...item, scheduledStartTime: item.scheduledStartTime.toLocaleString(), scheduledEndTime: item.scheduledEndTime.toLocaleString()})), "\n...");

    // Verify both events are in the plan (they are allowed to overlap)
    const event1InPlan = plan.find(item => item.originalId === event1Id);
    const event2InPlan = plan.find(item => item.originalId === event2Id);
    assertExists(event1InPlan, "Event 1 should be in the plan.");
    assertExists(event2InPlan, "Event 2 should be in the plan.");

    // Verify task is scheduled around the events
    const taskInPlan = plan.find(item => item.originalId === taskId);
    assertExists(taskInPlan, "Task should be in the plan.");
    
    // Check if task is scheduled outside of the combined event block (9:00 - 10:30)
    // Available time: 8:00-9:00, 10:30-22:00
    const taskScheduledStartHour = taskInPlan.scheduledStartTime.getHours();
    const taskScheduledEndHour = taskInPlan.scheduledEndTime.getHours();
    
    // The task should start either before 9 AM or after 10:30 AM on that day.
    assert(
      (taskScheduledStartHour < 9 && taskInPlan.scheduledEndTime.getHours() <= 9) || // Before 9 AM slot
      (taskScheduledStartHour >= 10 && taskScheduledStartHour >= 11 && taskScheduledEndHour <= 22), // After 10:30 AM slot (roughly 11 AM start)
      `Task should be scheduled outside the 9:00-10:30 event block. Scheduled: ${taskInPlan.scheduledStartTime.toLocaleString()} - ${taskInPlan.scheduledEndTime.toLocaleString()}`
    );
    console.log("Task scheduled start:", taskInPlan.scheduledStartTime.toLocaleString(), "end:", taskInPlan.scheduledEndTime.toLocaleString());

    console.log("Scenario 6 Completed Successfully.");
  });
});
```
