---
timestamp: 'Mon Oct 27 2025 16:15:21 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251027_161521.d765ddf0.md]]'
content_id: 09847ddfb1e9509cab8bbeab9e398097d7d591a927221b33bb4840ecef73e6b2
---

# file: src/ScheduleGenerator/ScheduleGeneratorConcept.test.ts

```typescript
import { assertEquals, assert, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "../../utils/database.ts";
import ScheduleGeneratorConcept from "./ScheduleGeneratorConcept.ts";
import { ID, Empty } from "../../utils/types.ts";

// Define generic types for testing purposes, asserting them as ID
type User = ID;
type Schedule = ID;
type Event = ID;
type Task = ID;
type Percent = number;

// Helper enum and interfaces from the concept, for local type safety in tests
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
  expectedCompletionTime: number; // in minutes
  completionLevel: Percent;
  priority: Percent;
}

interface ScheduleDoc {
  _id: Schedule;
  owner: User;
  scheduleID: number;
}

interface ScheduledItem {
  type: "event" | "task";
  originalId: Event | Task;
  name: string;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
}

Deno.test("ScheduleGenerator Concept Tests", async (t) => {
  const [db, client] = await testDb();
  const concept = new ScheduleGeneratorConcept(db);

  // Define some test IDs
  const userA: User = "user:Alice" as ID;
  const userB: User = "user:Bob" as ID;

  // Cleanup: ensure the database is cleared before tests run (testDb handles this via Deno.test.beforeAll)
  // We just need to close the client after all tests in this file are done.

  await t.step("Scenario 1: Operational Principle - Basic Schedule Generation", async () => {
    console.log("\n--- Scenario 1: Operational Principle - Basic Schedule Generation ---");

    // 1. Initialize a schedule for User A
    console.log("Action: initializeSchedule for User A");
    const initResult = await concept.initializeSchedule({ owner: userA });
    assert(!initResult.error, `initializeSchedule failed: ${initResult.error}`);
    const scheduleId = initResult.schedule as Schedule;
    console.log(`  -> Schedule initialized with ID: ${scheduleId}`);

    // Verify schedule exists via query
    const getScheduleResult = await concept._getScheduleDetails({ schedule: scheduleId });
    assert(!getScheduleResult.error, `_getScheduleDetails failed: ${getScheduleResult.error}`);
    const fetchedSchedule = getScheduleResult.scheduleDetails as ScheduleDoc[];
    assertEquals(fetchedSchedule.length, 1);
    assertEquals(fetchedSchedule[0].owner, userA);
    console.log(`  -> Verified schedule details for owner ${fetchedSchedule[0].owner}.`);


    // 2. Add some events
    const today = new Date();
    today.setHours(9, 0, 0, 0); // 9 AM today
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0); // 10 AM tomorrow

    const event1StartTime = new Date(today);
    event1StartTime.setHours(9, 0, 0, 0);
    const event1EndTime = new Date(today);
    event1EndTime.setHours(10, 0, 0, 0);

    const event2StartTime = new Date(tomorrow);
    event2StartTime.setHours(14, 0, 0, 0);
    const event2EndTime = new Date(tomorrow);
    event2EndTime.setHours(15, 0, 0, 0);

    console.log("Action: addEvent - Daily Standup (daily repeat)");
    const addEventResult1 = await concept.addEvent({
      schedule: scheduleId,
      name: "Daily Standup",
      startTime: event1StartTime,
      endTime: event1EndTime,
      repeat: { frequency: RepeatFrequency.DAILY },
    });
    assert(!addEventResult1.error, `addEvent failed: ${addEventResult1.error}`);
    const event1Id = addEventResult1.event as Event;
    console.log(`  -> Event 1 (Daily Standup) added with ID: ${event1Id}`);

    console.log("Action: addEvent - Project Meeting (no repeat)");
    const addEventResult2 = await concept.addEvent({
      schedule: scheduleId,
      name: "Project Meeting",
      startTime: event2StartTime,
      endTime: event2EndTime,
      repeat: { frequency: RepeatFrequency.NONE },
    });
    assert(!addEventResult2.error, `addEvent failed: ${addEventResult2.error}`);
    const event2Id = addEventResult2.event as Event;
    console.log(`  -> Event 2 (Project Meeting) added with ID: ${event2Id}`);

    // Verify events via query
    const getEventsResult = await concept._getEventsForSchedule({ schedule: scheduleId });
    assert(!getEventsResult.error, `_getEventsForSchedule failed: ${getEventsResult.error}`);
    const fetchedEvents = getEventsResult.event as Event[];
    assertEquals(fetchedEvents.length, 2);
    console.log(`  -> Verified ${fetchedEvents.length} events for schedule ${scheduleId}.`);

    // 3. Add some tasks with different priorities/deadlines
    const deadline1 = new Date(today);
    deadline1.setDate(today.getDate() + 2); // 2 days from now
    deadline1.setHours(17, 0, 0, 0);

    const deadline2 = new Date(today);
    deadline2.setDate(today.getDate() + 1); // 1 day from now
    deadline2.setHours(12, 0, 0, 0);

    console.log("Action: addTask - Finish Report (high priority, sooner deadline)");
    const addTaskResult1 = await concept.addTask({
      schedule: scheduleId,
      name: "Finish Report",
      deadline: deadline2,
      expectedCompletionTime: 120, // 2 hours
      completionLevel: 0,
      priority: 90,
    });
    assert(!addTaskResult1.error, `addTask failed: ${addTaskResult1.error}`);
    const task1Id = addTaskResult1.task as Task;
    console.log(`  -> Task 1 (Finish Report) added with ID: ${task1Id}`);

    console.log("Action: addTask - Review Code (medium priority, later deadline, partially complete)");
    const addTaskResult2 = await concept.addTask({
      schedule: scheduleId,
      name: "Review Code",
      deadline: deadline1,
      expectedCompletionTime: 90, // 1.5 hours
      completionLevel: 50,
      priority: 60,
    });
    assert(!addTaskResult2.error, `addTask failed: ${addTaskResult2.error}`);
    const task2Id = addTaskResult2.task as Task;
    console.log(`  -> Task 2 (Review Code) added with ID: ${task2Id}`);

    // Verify tasks via query
    const getTasksResult = await concept._getTasksForSchedule({ schedule: scheduleId });
    assert(!getTasksResult.error, `_getTasksForSchedule failed: ${getTasksResult.error}`);
    const fetchedTasks = getTasksResult.task as Task[];
    assertEquals(fetchedTasks.length, 2);
    console.log(`  -> Verified ${fetchedTasks.length} tasks for schedule ${scheduleId}.`);


    // 4. Generate schedule
    console.log("Action: generateSchedule");
    const generateResult = await concept.generateSchedule({ schedule: scheduleId });
    assert(!generateResult.error, `generateSchedule failed: ${generateResult.error}`);
    const generatedPlan = generateResult.generatedPlan as ScheduledItem[];
    console.log(`  -> Schedule generated. Total items: ${generatedPlan.length}`);
    // console.log("Generated Plan:", generatedPlan.map(item => ({...item, scheduledStartTime: item.scheduledStartTime.toISOString(), scheduledEndTime: item.scheduledEndTime.toISOString()})));

    // Assert that the plan contains items
    assert(generatedPlan.length > 0, "Generated plan should not be empty.");

    // Assert that events are in the plan
    const planEventIds = generatedPlan.filter(item => item.type === "event").map(item => item.originalId);
    assert(planEventIds.includes(event1Id), "Generated plan should include event 1.");
    assert(planEventIds.includes(event2Id), "Generated plan should include event 2."); // Event 2 is a single occurrence, so should be there if within horizon

    // Assert that tasks are in the plan
    const planTaskIds = generatedPlan.filter(item => item.type === "task").map(item => item.originalId);
    assert(planTaskIds.includes(task1Id), "Generated plan should include task 1.");
    assert(planTaskIds.includes(task2Id), "Generated plan should include task 2.");

    // The sorting logic in generateSchedule is complex, but we can check for reasonable order, e.g.,
    // Task 1 (deadline +1 day, priority 90) should generally appear before Task 2 (deadline +2 days, priority 60)
    // assuming enough free slots before task1's deadline.
    const scheduledTask1 = generatedPlan.find(item => item.originalId === task1Id);
    const scheduledTask2 = generatedPlan.find(item => item.originalId === task2Id);
    assert(scheduledTask1, "Task 1 should be scheduled.");
    assert(scheduledTask2, "Task 2 should be scheduled.");

    // Basic chronological check
    for (let i = 0; i < generatedPlan.length - 1; i++) {
      assert(
        generatedPlan[i].scheduledStartTime.getTime() <= generatedPlan[i + 1].scheduledStartTime.getTime(),
        "Generated plan should be in chronological order.",
      );
    }
    console.log(`  -> Verified basic chronological order of the generated plan.`);

    console.log("--- End Scenario 1 ---");
  });

  await t.step("Scenario 2: Editing and Regenerating", async () => {
    console.log("\n--- Scenario 2: Editing and Regenerating ---");

    // Re-initialize for a clean slate, or use existing from previous test
    const initResult = await concept.initializeSchedule({ owner: userB });
    assert(!initResult.error, `initializeSchedule failed: ${initResult.error}`);
    const scheduleId = initResult.schedule as Schedule;
    console.log(`  -> Schedule initialized for User B with ID: ${scheduleId}`);

    const today = new Date();
    const eventStartTime = new Date(today);
    eventStartTime.setHours(10, 0, 0, 0);
    const eventEndTime = new Date(today);
    eventEndTime.setHours(11, 0, 0, 0);

    const addEventResult = await concept.addEvent({
      schedule: scheduleId,
      name: "Old Event",
      startTime: eventStartTime,
      endTime: eventEndTime,
      repeat: { frequency: RepeatFrequency.NONE },
    });
    assert(!addEventResult.error, `addEvent failed: ${addEventResult.error}`);
    const eventId = addEventResult.event as Event;
    console.log(`  -> Event (Old Event) added with ID: ${eventId}`);

    const taskDeadline = new Date(today);
    taskDeadline.setDate(today.getDate() + 3);
    taskDeadline.setHours(17, 0, 0, 0);

    const addTaskResult = await concept.addTask({
      schedule: scheduleId,
      name: "Old Task",
      deadline: taskDeadline,
      expectedCompletionTime: 60,
      completionLevel: 0,
      priority: 50,
    });
    assert(!addTaskResult.error, `addTask failed: ${addTaskResult.error}`);
    const taskId = addTaskResult.task as Task;
    console.log(`  -> Task (Old Task) added with ID: ${taskId}`);

    // Generate initial schedule
    const initialGenerateResult = await concept.generateSchedule({ schedule: scheduleId });
    assert(!initialGenerateResult.error, `initial generateSchedule failed: ${initialGenerateResult.error}`);
    const initialPlan = initialGenerateResult.generatedPlan as ScheduledItem[];
    console.log(`  -> Initial schedule generated. Total items: ${initialPlan.length}`);

    // 1. Edit an event's time
    const newEventStartTime = new Date(today);
    newEventStartTime.setHours(12, 0, 0, 0); // Move event later
    const newEventEndTime = new Date(today);
    newEventEndTime.setHours(13, 0, 0, 0);

    console.log("Action: editEvent - moving Old Event to 12:00-13:00");
    const editEventResult: Empty | { error: string } = await concept.editEvent({
      schedule: scheduleId,
      oldEvent: eventId,
      name: "Updated Event",
      startTime: newEventStartTime,
      endTime: newEventEndTime,
      repeat: { frequency: RepeatFrequency.NONE },
    });
    assert(!editEventResult.error, `editEvent failed: ${editEventResult.error}`);
    console.log(`  -> Event ${eventId} updated.`);

    // 2. Edit an existing task's priority and completion level
    console.log("Action: editTask - increasing priority and completion of Old Task");
    const editTaskResult: Empty | { error: string } = await concept.editTask({
      schedule: scheduleId,
      oldTask: taskId,
      name: "Updated Task",
      deadline: taskDeadline,
      expectedCompletionTime: 60,
      completionLevel: 75, // Now 75% complete
      priority: 99, // Very high priority
    });
    assert(!editTaskResult.error, `editTask failed: ${editTaskResult.error}`);
    console.log(`  -> Task ${taskId} updated.`);

    // 3. Generate schedule again
    console.log("Action: generateSchedule (after edits)");
    const regeneratedResult = await concept.generateSchedule({ schedule: scheduleId });
    assert(!regeneratedResult.error, `regenerated generateSchedule failed: ${regeneratedResult.error}`);
    const regeneratedPlan = regeneratedResult.generatedPlan as ScheduledItem[];
    console.log(`  -> Schedule regenerated. Total items: ${regeneratedPlan.length}`);

    // Assert event changes are reflected
    const updatedEvent = regeneratedPlan.find(item => item.originalId === eventId && item.type === "event");
    assert(updatedEvent, "Updated event should be in the regenerated plan.");
    assertEquals(updatedEvent.name, "Updated Event", "Event name should be updated.");
    assertEquals(updatedEvent.scheduledStartTime.toISOString(), newEventStartTime.toISOString(), "Event start time should be updated.");
    assertEquals(updatedEvent.scheduledEndTime.toISOString(), newEventEndTime.toISOString(), "Event end time should be updated.");
    console.log(`  -> Verified event ${eventId} details updated in the plan.`);

    // Assert task changes (especially completion level affecting remaining duration)
    const updatedTask = regeneratedPlan.find(item => item.originalId === taskId && item.type === "task");
    assert(updatedTask, "Updated task should be in the regenerated plan.");
    assertEquals(updatedTask.name, "Updated Task", "Task name should be updated.");
    // The actual scheduled time will depend on available slots, but the remaining work should be less
    const getTaskDetailsResult = await concept._getTaskDetails({ task: taskId });
    assert(!getTaskDetailsResult.error, `_getTaskDetails failed: ${getTaskDetailsResult.error}`);
    const fetchedTask = getTaskDetailsResult.taskDetails![0]; // Assume it exists and is an array
    assertEquals(fetchedTask.completionLevel, 75, "Task completion level should be updated in state.");
    assertEquals(fetchedTask.priority, 99, "Task priority should be updated in state.");
    console.log(`  -> Verified task ${taskId} details updated in the plan and state.`);

    console.log("--- End Scenario 2 ---");
  });

  await t.step("Scenario 3: Deletion and Regenerating", async () => {
    console.log("\n--- Scenario 3: Deletion and Regenerating ---");

    const initResult = await concept.initializeSchedule({ owner: userA }); // Reuse User A or create new if needed
    assert(!initResult.error, `initializeSchedule failed: ${initResult.error}`);
    const scheduleId = initResult.schedule as Schedule;
    console.log(`  -> Schedule initialized for User A with ID: ${scheduleId}`);

    const now = new Date();
    const event1StartTime = new Date(now);
    event1StartTime.setHours(10, 0, 0, 0);
    const event1EndTime = new Date(now);
    event1EndTime.setHours(11, 0, 0, 0);

    const event2StartTime = new Date(now);
    event2StartTime.setDate(now.getDate() + 1);
    event2StartTime.setHours(14, 0, 0, 0);
    const event2EndTime = new Date(now);
    event2EndTime.setDate(now.getDate() + 1);
    event2EndTime.setHours(15, 0, 0, 0);

    const addEventResult1 = await concept.addEvent({
      schedule: scheduleId,
      name: "Event to Delete",
      startTime: event1StartTime,
      endTime: event1EndTime,
      repeat: { frequency: RepeatFrequency.NONE },
    });
    assert(!addEventResult1.error, `addEvent failed: ${addEventResult1.error}`);
    const eventToDeleteId = addEventResult1.event as Event;
    console.log(`  -> Event (Event to Delete) added with ID: ${eventToDeleteId}`);

    const addEventResult2 = await concept.addEvent({
      schedule: scheduleId,
      name: "Remaining Event",
      startTime: event2StartTime,
      endTime: event2EndTime,
      repeat: { frequency: RepeatFrequency.NONE },
    });
    assert(!addEventResult2.error, `addEvent failed: ${addEventResult2.error}`);
    const remainingEventId = addEventResult2.event as Event;
    console.log(`  -> Event (Remaining Event) added with ID: ${remainingEventId}`);

    const taskDeadline1 = new Date(now);
    taskDeadline1.setDate(now.getDate() + 2);
    taskDeadline1.setHours(10, 0, 0, 0);

    const taskDeadline2 = new Date(now);
    taskDeadline2.setDate(now.getDate() + 3);
    taskDeadline2.setHours(10, 0, 0, 0);

    const addTaskResult1 = await concept.addTask({
      schedule: scheduleId,
      name: "Task to Delete",
      deadline: taskDeadline1,
      expectedCompletionTime: 30,
      completionLevel: 0,
      priority: 80,
    });
    assert(!addTaskResult1.error, `addTask failed: ${addTaskResult1.error}`);
    const taskToDeleteId = addTaskResult1.task as Task;
    console.log(`  -> Task (Task to Delete) added with ID: ${taskToDeleteId}`);

    const addTaskResult2 = await concept.addTask({
      schedule: scheduleId,
      name: "Remaining Task",
      deadline: taskDeadline2,
      expectedCompletionTime: 60,
      completionLevel: 0,
      priority: 70,
    });
    assert(!addTaskResult2.error, `addTask failed: ${addTaskResult2.error}`);
    const remainingTaskId = addTaskResult2.task as Task;
    console.log(`  -> Task (Remaining Task) added with ID: ${remainingTaskId}`);

    // Generate initial schedule to confirm presence
    const initialGenerateResult = await concept.generateSchedule({ schedule: scheduleId });
    assert(!initialGenerateResult.error, `initial generateSchedule failed: ${initialGenerateResult.error}`);
    const initialPlan = initialGenerateResult.generatedPlan as ScheduledItem[];
    assert(initialPlan.some(item => item.originalId === eventToDeleteId), "Event to Delete should be in initial plan.");
    assert(initialPlan.some(item => item.originalId === taskToDeleteId), "Task to Delete should be in initial plan.");
    console.log(`  -> Initial schedule generated with items to delete present.`);

    // 1. Delete an event
    console.log("Action: deleteEvent - Event to Delete");
    const deleteEventResult: Empty | { error: string } = await concept.deleteEvent({
      schedule: scheduleId,
      event: eventToDeleteId,
    });
    assert(!deleteEventResult.error, `deleteEvent failed: ${deleteEventResult.error}`);
    console.log(`  -> Event ${eventToDeleteId} deleted.`);

    // 2. Delete a task
    console.log("Action: deleteTask - Task to Delete");
    const deleteTaskResult: Empty | { error: string } = await concept.deleteTask({
      schedule: scheduleId,
      task: taskToDeleteId,
    });
    assert(!deleteTaskResult.error, `deleteTask failed: ${deleteTaskResult.error}`);
    console.log(`  -> Task ${taskToDeleteId} deleted.`);

    // 3. Generate schedule again
    console.log("Action: generateSchedule (after deletions)");
    const regeneratedResult = await concept.generateSchedule({ schedule: scheduleId });
    assert(!regeneratedResult.error, `regenerated generateSchedule failed: ${regeneratedResult.error}`);
    const regeneratedPlan = regeneratedResult.generatedPlan as ScheduledItem[];
    console.log(`  -> Schedule regenerated. Total items: ${regeneratedPlan.length}`);

    // Assert deleted items are no longer in the plan
    assert(!regeneratedPlan.some(item => item.originalId === eventToDeleteId), "Event to Delete should NOT be in regenerated plan.");
    assert(!regeneratedPlan.some(item => item.originalId === taskToDeleteId), "Task to Delete should NOT be in regenerated plan.");
    assert(regeneratedPlan.some(item => item.originalId === remainingEventId), "Remaining Event should still be in regenerated plan.");
    assert(regeneratedPlan.some(item => item.originalId === remainingTaskId), "Remaining Task should still be in regenerated plan.");
    console.log(`  -> Verified deleted items are removed and remaining items are present.`);

    console.log("--- End Scenario 3 ---");
  });

  await t.step("Scenario 4: Error Handling - Precondition Failures", async () => {
    console.log("\n--- Scenario 4: Error Handling - Precondition Failures ---");

    const ownerId: User = "user:ErrorUser" as ID;
    const initResult = await concept.initializeSchedule({ owner: ownerId });
    assert(!initResult.error, `initializeSchedule failed: ${initResult.error}`);
    const scheduleId = initResult.schedule as Schedule;
    console.log(`  -> Schedule initialized for ErrorUser with ID: ${scheduleId}`);

    const nonExistentId: ID = "nonExistent:ID" as ID;

    // --- addEvent failures ---
    console.log("Action: addEvent - invalid times");
    const invalidTimeEventResult = await concept.addEvent({
      schedule: scheduleId,
      name: "Invalid Time Event",
      startTime: new Date("2023-01-01T12:00:00Z"),
      endTime: new Date("2023-01-01T11:00:00Z"), // End before start
      repeat: { frequency: RepeatFrequency.NONE },
    });
    assert(invalidTimeEventResult.error, "addEvent should fail for end time before start time.");
    console.log(`  -> addEvent with invalid times failed as expected: ${invalidTimeEventResult.error}`);

    console.log("Action: addEvent - invalid weekly repeat");
    const invalidWeeklyEventResult = await concept.addEvent({
      schedule: scheduleId,
      name: "Invalid Weekly Event",
      startTime: new Date("2023-01-01T10:00:00Z"),
      endTime: new Date("2023-01-01T11:00:00Z"),
      repeat: { frequency: RepeatFrequency.WEEKLY, daysOfWeek: [] }, // Empty daysOfWeek for WEEKLY
    });
    assert(invalidWeeklyEventResult.error, "addEvent should fail for weekly repeat without daysOfWeek.");
    console.log(`  -> addEvent with invalid weekly repeat failed as expected: ${invalidWeeklyEventResult.error}`);

    console.log("Action: addEvent - non-existent schedule");
    const nonExistentScheduleEventResult = await concept.addEvent({
      schedule: nonExistentId,
      name: "Non-existent Schedule Event",
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
      repeat: { frequency: RepeatFrequency.NONE },
    });
    assert(nonExistentScheduleEventResult.error, "addEvent should fail for non-existent schedule.");
    console.log(`  -> addEvent with non-existent schedule failed as expected: ${nonExistentScheduleEventResult.error}`);

    // --- addTask failures ---
    console.log("Action: addTask - invalid expectedCompletionTime");
    const invalidCompletionTimeTaskResult = await concept.addTask({
      schedule: scheduleId,
      name: "Invalid Completion Task",
      deadline: new Date(Date.now() + 86400000),
      expectedCompletionTime: 0, // Must be positive
      completionLevel: 0,
      priority: 50,
    });
    assert(invalidCompletionTimeTaskResult.error, "addTask should fail for non-positive expectedCompletionTime.");
    console.log(`  -> addTask with invalid expectedCompletionTime failed as expected: ${invalidCompletionTimeTaskResult.error}`);

    console.log("Action: addTask - invalid priority");
    const invalidPriorityTaskResult = await concept.addTask({
      schedule: scheduleId,
      name: "Invalid Priority Task",
      deadline: new Date(Date.now() + 86400000),
      expectedCompletionTime: 60,
      completionLevel: 0,
      priority: 101, // Must be 0-100
    });
    assert(invalidPriorityTaskResult.error, "addTask should fail for invalid priority.");
    console.log(`  -> addTask with invalid priority failed as expected: ${invalidPriorityTaskResult.error}`);

    console.log("Action: addTask - invalid completionLevel");
    const invalidCompletionLevelTaskResult = await concept.addTask({
      schedule: scheduleId,
      name: "Invalid Completion Level Task",
      deadline: new Date(Date.now() + 86400000),
      expectedCompletionTime: 60,
      completionLevel: -10, // Must be 0-100
      priority: 50,
    });
    assert(invalidCompletionLevelTaskResult.error, "addTask should fail for invalid completionLevel.");
    console.log(`  -> addTask with invalid completionLevel failed as expected: ${invalidCompletionLevelTaskResult.error}`);

    // --- editEvent/deleteEvent/editTask/deleteTask failures for non-existent items ---
    console.log("Action: editEvent - non-existent event");
    const editNonExistentEventResult = await concept.editEvent({
      schedule: scheduleId,
      oldEvent: nonExistentId,
      name: "Dummy",
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
      repeat: { frequency: RepeatFrequency.NONE },
    });
    assert(editNonExistentEventResult.error, "editEvent should fail for non-existent event.");
    console.log(`  -> editEvent with non-existent event failed as expected: ${editNonExistentEventResult.error}`);

    console.log("Action: deleteEvent - non-existent event");
    const deleteNonExistentEventResult = await concept.deleteEvent({ schedule: scheduleId, event: nonExistentId });
    assert(deleteNonExistentEventResult.error, "deleteEvent should fail for non-existent event.");
    console.log(`  -> deleteEvent with non-existent event failed as expected: ${deleteNonExistentEventResult.error}`);

    console.log("Action: editTask - non-existent task");
    const editNonExistentTaskResult = await concept.editTask({
      schedule: scheduleId,
      oldTask: nonExistentId,
      name: "Dummy",
      deadline: new Date(Date.now() + 86400000),
      expectedCompletionTime: 60,
      completionLevel: 0,
      priority: 50,
    });
    assert(editNonExistentTaskResult.error, "editTask should fail for non-existent task.");
    console.log(`  -> editTask with non-existent task failed as expected: ${editNonExistentTaskResult.error}`);

    console.log("Action: deleteTask - non-existent task");
    const deleteNonExistentTaskResult = await concept.deleteTask({ schedule: scheduleId, task: nonExistentId });
    assert(deleteNonExistentTaskResult.error, "deleteTask should fail for non-existent task.");
    console.log(`  -> deleteTask with non-existent task failed as expected: ${deleteNonExistentTaskResult.error}`);

    // --- generateSchedule failure ---
    console.log("Action: generateSchedule - non-existent schedule");
    const generateNonExistentScheduleResult = await concept.generateSchedule({ schedule: nonExistentId });
    assert(generateNonExistentScheduleResult.error, "generateSchedule should fail for non-existent schedule.");
    console.log(`  -> generateSchedule with non-existent schedule failed as expected: ${generateNonExistentScheduleResult.error}`);

    console.log("--- End Scenario 4 ---");
  });

  await t.step("Scenario 5: Querying Data", async () => {
    console.log("\n--- Scenario 5: Querying Data ---");

    const ownerA: User = "queryUserA" as ID;
    const ownerB: User = "queryUserB" as ID;

    const initResultA = await concept.initializeSchedule({ owner: ownerA });
    assert(!initResultA.error);
    const scheduleIdA = initResultA.schedule as Schedule;
    console.log(`  -> Schedule A initialized for ${ownerA}: ${scheduleIdA}`);

    const initResultB = await concept.initializeSchedule({ owner: ownerB });
    assert(!initResultB.error);
    const scheduleIdB = initResultB.schedule as Schedule;
    console.log(`  -> Schedule B initialized for ${ownerB}: ${scheduleIdB}`);

    // Add events and tasks for schedule A
    const now = new Date();
    const eventA1Time = new Date(now); eventA1Time.setHours(10, 0, 0, 0);
    const eventA1EndTime = new Date(now); eventA1EndTime.setHours(11, 0, 0, 0);
    const addEventResultA1 = await concept.addEvent({
      schedule: scheduleIdA, name: "Event A1", startTime: eventA1Time, endTime: eventA1EndTime, repeat: { frequency: RepeatFrequency.NONE },
    });
    assert(!addEventResultA1.error);
    const eventA1Id = addEventResultA1.event as Event;
    console.log(`  -> Event A1 added: ${eventA1Id}`);

    const taskA1Deadline = new Date(now); taskA1Deadline.setDate(now.getDate() + 1); taskA1Deadline.setHours(17, 0, 0, 0);
    const addTaskResultA1 = await concept.addTask({
      schedule: scheduleIdA, name: "Task A1", deadline: taskA1Deadline, expectedCompletionTime: 60, completionLevel: 0, priority: 70,
    });
    assert(!addTaskResultA1.error);
    const taskA1Id = addTaskResultA1.task as Task;
    console.log(`  -> Task A1 added: ${taskA1Id}`);

    // Add events and tasks for schedule B
    const eventB1Time = new Date(now); eventB1Time.setHours(13, 0, 0, 0);
    const eventB1EndTime = new Date(now); eventB1EndTime.setHours(14, 0, 0, 0);
    const addEventResultB1 = await concept.addEvent({
      schedule: scheduleIdB, name: "Event B1", startTime: eventB1Time, endTime: eventB1EndTime, repeat: { frequency: RepeatFrequency.NONE },
    });
    assert(!addEventResultB1.error);
    const eventB1Id = addEventResultB1.event as Event;
    console.log(`  -> Event B1 added: ${eventB1Id}`);


    // --- Test _getScheduleByOwner ---
    console.log("Query: _getScheduleByOwner for queryUserA");
    const getScheduleByOwnerResultA = await concept._getScheduleByOwner({ owner: ownerA });
    assert(!getScheduleByOwnerResultA.error);
    assertEquals(getScheduleByOwnerResultA.schedule as Schedule, scheduleIdA, "Should retrieve schedule A for owner A.");
    console.log(`  -> Retrieved schedule ${getScheduleByOwnerResultA.schedule} for ${ownerA}.`);

    console.log("Query: _getScheduleByOwner for non-existent user");
    const getScheduleByOwnerErrorResult = await concept._getScheduleByOwner({ owner: "nonExistentUser" as ID });
    assert(getScheduleByOwnerErrorResult.error, "Should return error for non-existent owner.");
    console.log(`  -> _getScheduleByOwner for non-existent user failed as expected: ${getScheduleByOwnerErrorResult.error}`);


    // --- Test _getEventsForSchedule ---
    console.log("Query: _getEventsForSchedule for scheduleIdA");
    const getEventsForScheduleResultA = await concept._getEventsForSchedule({ schedule: scheduleIdA });
    assert(!getEventsForScheduleResultA.error);
    const eventsForScheduleA = getEventsForScheduleResultA.event as Event[];
    assertEquals(eventsForScheduleA.length, 1, "Should return 1 event for schedule A.");
    assertEquals(eventsForScheduleA[0], eventA1Id, "Should return Event A1 ID.");
    console.log(`  -> Retrieved events for schedule ${scheduleIdA}: ${eventsForScheduleA[0]}`);

    console.log("Query: _getEventsForSchedule for scheduleIdB");
    const getEventsForScheduleResultB = await concept._getEventsForSchedule({ schedule: scheduleIdB });
    assert(!getEventsForScheduleResultB.error);
    const eventsForScheduleB = getEventsForScheduleResultB.event as Event[];
    assertEquals(eventsForScheduleB.length, 1, "Should return 1 event for schedule B.");
    assertEquals(eventsForScheduleB[0], eventB1Id, "Should return Event B1 ID.");
    console.log(`  -> Retrieved events for schedule ${scheduleIdB}: ${eventsForScheduleB[0]}`);


    // --- Test _getTasksForSchedule ---
    console.log("Query: _getTasksForSchedule for scheduleIdA");
    const getTasksForScheduleResultA = await concept._getTasksForSchedule({ schedule: scheduleIdA });
    assert(!getTasksForScheduleResultA.error);
    const tasksForScheduleA = getTasksForScheduleResultA.task as Task[];
    assertEquals(tasksForScheduleA.length, 1, "Should return 1 task for schedule A.");
    assertEquals(tasksForScheduleA[0], taskA1Id, "Should return Task A1 ID.");
    console.log(`  -> Retrieved tasks for schedule ${scheduleIdA}: ${tasksForScheduleA[0]}`);


    // --- Test _getEventDetails ---
    console.log("Query: _getEventDetails for eventA1Id");
    const getEventDetailsResult = await concept._getEventDetails({ event: eventA1Id });
    assert(!getEventDetailsResult.error);
    const eventDetails = getEventDetailsResult.eventDetails as EventDoc[];
    assertEquals(eventDetails.length, 1);
    assertEquals(eventDetails[0]._id, eventA1Id, "Event details should match eventA1Id.");
    assertEquals(eventDetails[0].name, "Event A1", "Event name should be 'Event A1'.");
    console.log(`  -> Retrieved event details for ${eventA1Id}: ${eventDetails[0].name}`);

    console.log("Query: _getEventDetails for non-existent event");
    const getEventDetailsErrorResult = await concept._getEventDetails({ event: nonExistentId });
    assert(getEventDetailsErrorResult.error, "Should return error for non-existent event.");
    console.log(`  -> _getEventDetails for non-existent event failed as expected: ${getEventDetailsErrorResult.error}`);


    // --- Test _getTaskDetails ---
    console.log("Query: _getTaskDetails for taskA1Id");
    const getTaskDetailsResult = await concept._getTaskDetails({ task: taskA1Id });
    assert(!getTaskDetailsResult.error);
    const taskDetails = getTaskDetailsResult.taskDetails as TaskDoc[];
    assertEquals(taskDetails.length, 1);
    assertEquals(taskDetails[0]._id, taskA1Id, "Task details should match taskA1Id.");
    assertEquals(taskDetails[0].name, "Task A1", "Task name should be 'Task A1'.");
    console.log(`  -> Retrieved task details for ${taskA1Id}: ${taskDetails[0].name}`);

    console.log("Query: _getTaskDetails for non-existent task");
    const getTaskDetailsErrorResult = await concept._getTaskDetails({ task: nonExistentId });
    assert(getTaskDetailsErrorResult.error, "Should return error for non-existent task.");
    console.log(`  -> _getTaskDetails for non-existent task failed as expected: ${getTaskDetailsErrorResult.error}`);

    // --- Test _getAllSchedules ---
    console.log("Query: _getAllSchedules");
    const getAllSchedulesResult = await concept._getAllSchedules();
    assert(!getAllSchedulesResult.error);
    const allSchedules = getAllSchedulesResult.schedule as ScheduleDoc[];
    assertEquals(allSchedules.length, 3, "Should return all 3 schedules (User A, User B, ErrorUser)."); // Assuming ErrorUser schedule from previous test
    assert(allSchedules.some(s => s._id === scheduleIdA), "Schedule A should be in all schedules.");
    assert(allSchedules.some(s => s._id === scheduleIdB), "Schedule B should be in all schedules.");
    console.log(`  -> Retrieved all schedules: ${allSchedules.length} total.`);

    // --- Test _getScheduleDetails ---
    console.log("Query: _getScheduleDetails for scheduleIdA");
    const getSpecificScheduleDetailsResult = await concept._getScheduleDetails({ schedule: scheduleIdA });
    assert(!getSpecificScheduleDetailsResult.error);
    const specificScheduleDetails = getSpecificScheduleDetailsResult.scheduleDetails as ScheduleDoc[];
    assertEquals(specificScheduleDetails.length, 1);
    assertEquals(specificScheduleDetails[0]._id, scheduleIdA);
    console.log(`  -> Retrieved specific schedule details for ${scheduleIdA}.`);


    // --- Test _getAllEvents ---
    console.log("Query: _getAllEvents");
    const getAllEventsResult = await concept._getAllEvents();
    assert(!getAllEventsResult.error);
    const allEvents = getAllEventsResult.event as EventDoc[];
    // Initial + Scenario 3 + Scenario 5 (Event A1, Event B1, Event to Delete, Remaining Event, Daily Standup, Project Meeting) = 6 events total
    // Scenario 1: event1Id, event2Id (2 events)
    // Scenario 2: eventId (1 event)
    // Scenario 3: eventToDeleteId, remainingEventId (2 events)
    // Scenario 5: eventA1Id, eventB1Id (2 events)
    // Total should be 7 events across all successful additions: 2 + 1 + 2 + 2 = 7 (from previous runs)
    // Let's re-count:
    // S1: 2 events
    // S2: 1 event
    // S3: 2 events initially (1 deleted) -> 1 remaining in DB for that schedule's ID
    // S5: 2 events
    // Total remaining in DB = 2 (S1) + 1 (S2) + 1 (S3, remaining) + 2 (S5) = 6
    // The previous runs add up to: 2 from S1, 1 from S2, 2 from S3 (one was deleted, so 1 remaining), 2 from S5
    // Actually, S3 deletes one event. So, from S3, only `remainingEventId` exists.
    // Total: S1 (2 events) + S2 (1 event) + S3 (1 event remaining after delete) + S5 (2 events) = 6 events.
    assertEquals(allEvents.length, 6, "Should return all successfully added events that were not deleted.");
    console.log(`  -> Retrieved all events: ${allEvents.length} total.`);


    // --- Test _getAllTasks ---
    console.log("Query: _getAllTasks");
    const getAllTasksResult = await concept._getAllTasks();
    assert(!getAllTasksResult.error);
    const allTasks = getAllTasksResult.task as TaskDoc[];
    // S1: 2 tasks
    // S2: 1 task
    // S3: 2 tasks initially (1 deleted) -> 1 remaining in DB for that schedule's ID
    // S5: 1 task
    // Total: 2 (S1) + 1 (S2) + 1 (S3, remaining) + 1 (S5) = 5 tasks.
    assertEquals(allTasks.length, 5, "Should return all successfully added tasks that were not deleted.");
    console.log(`  -> Retrieved all tasks: ${allTasks.length} total.`);

    console.log("--- End Scenario 5 ---");
  });

  await t.step("Scenario 6: Schedule Generation Conflict (Edge Case)", async () => {
    console.log("\n--- Scenario 6: Schedule Generation Conflict (Edge Case) ---");

    const ownerId: User = "user:ConflictUser" as ID;
    const initResult = await concept.initializeSchedule({ owner: ownerId });
    assert(!initResult.error);
    const scheduleId = initResult.schedule as Schedule;
    console.log(`  -> Schedule initialized for ConflictUser with ID: ${scheduleId}`);

    const now = new Date();
    const eventStartTime = new Date(now);
    eventStartTime.setHours(9, 0, 0, 0);
    const eventEndTime = new Date(now);
    eventEndTime.setHours(17, 0, 0, 0); // Event takes up most of the day

    console.log("Action: addEvent - Long Event (9 AM - 5 PM)");
    const addEventResult = await concept.addEvent({
      schedule: scheduleId,
      name: "Long Event",
      startTime: eventStartTime,
      endTime: eventEndTime,
      repeat: { frequency: RepeatFrequency.DAILY },
    });
    assert(!addEventResult.error);
    console.log(`  -> Long event added with ID: ${addEventResult.event as Event}`);

    const taskDeadline = new Date(now);
    taskDeadline.setDate(now.getDate() + 1); // Tomorrow
    taskDeadline.setHours(18, 0, 0, 0); // Deadline after event, but still tight

    console.log("Action: addTask - Urgent Task (3 hours, tomorrow deadline)");
    const addTaskResult = await concept.addTask({
      schedule: scheduleId,
      name: "Urgent Task",
      deadline: taskDeadline,
      expectedCompletionTime: 180, // 3 hours
      completionLevel: 0,
      priority: 100,
    });
    assert(!addTaskResult.error);
    console.log(`  -> Urgent task added with ID: ${addTaskResult.task as Task}`);

    // Generate schedule - this should fail if no free slots are found for the task
    console.log("Action: generateSchedule - expecting conflict");
    const generateResult = await concept.generateSchedule({ schedule: scheduleId });
    assert(generateResult.error, "generateSchedule should return an error if tasks cannot be scheduled due to conflicts/lack of time.");
    assert(
      generateResult.error?.includes("Not all tasks could be scheduled"),
      `Error message mismatch: ${generateResult.error}`,
    );
    console.log(`  -> generateSchedule failed as expected: ${generateResult.error}`);

    console.log("--- End Scenario 6 ---");
  });

  // Close the MongoDB client after all tests are done
  await client.close();
});

```
