---
timestamp: 'Fri Oct 17 2025 15:57:32 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_155732.7b5d0456.md]]'
content_id: 45216f17fcc6ebb41691f931a88a0eb6f5a4a7c4746c442c9ad37b4633c6576b
---

# file: src/schedulegenerator/ScheduleGeneratorConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals, assertObjectMatch } from "jsr:@std/assert";
import { testDb } from "../../utils/database.ts"; // Adjust path as necessary
import { ID } from "../../utils/types.ts"; // Adjust path as necessary
import ScheduleGeneratorConcept from "./ScheduleGeneratorConcept.ts";

Deno.test("ScheduleGenerator Concept", async (t) => {
  const [db, client] = await testDb();
  const concept = new ScheduleGeneratorConcept(db);

  const userAlice = "user:Alice" as ID;
  const userBob = "user:Bob" as ID;

  await t.step("initializeSchedule: should create a new schedule configuration", async () => {
    const result = await concept.initializeSchedule({ owner: userAlice });
    assertExists(result.schedule);
    const scheduleId = result.schedule as ID;

    const fetchedSchedule = await concept._getSchedule({ scheduleId });
    assertExists(fetchedSchedule);
    assertEquals((fetchedSchedule as any).owner, userAlice);
    assertEquals((fetchedSchedule as any).events.length, 0);
    assertEquals((fetchedSchedule as any).tasks.length, 0);
    assertEquals((fetchedSchedule as any).timestamp, 0); // Initial timestamp
  });

  let aliceScheduleId: ID;
  let event1Id: ID;
  let task1Id: ID;

  await t.step("addEvent: should add an event to an existing schedule configuration", async () => {
    const initResult = await concept.initializeSchedule({ owner: userAlice });
    assertExists(initResult.schedule);
    aliceScheduleId = initResult.schedule as ID;

    const addEventResult = await concept.addEvent({
      schedule: aliceScheduleId,
      name: "Team Meeting",
      startTime: "09:00",
      endTime: "10:00",
      repeatTime: "Daily",
    });
    assertExists(addEventResult.event);
    event1Id = addEventResult.event as ID;

    const events = await concept._getEventsBySchedulePointer({ schedulePointer: aliceScheduleId });
    assertEquals(events.length, 1);
    assertObjectMatch(events[0], { _id: event1Id, name: "Team Meeting", schedulePointer: aliceScheduleId });

    const scheduleAfterAdd = await concept._getSchedule({ scheduleId: aliceScheduleId });
    assertExists(scheduleAfterAdd);
    assertEquals((scheduleAfterAdd as any).events, [event1Id]);

    // Test precondition: schedule does not exist
    const errorResult = await concept.addEvent({
      schedule: "nonExistentSchedule" as ID,
      name: "Failed Event",
      startTime: "09:00",
      endTime: "10:00",
      repeatTime: "None",
    });
    assertExists(errorResult.error);
  });

  await t.step("addTask: should add a task to an existing schedule configuration", async () => {
    const addTaskResult = await concept.addTask({
      schedule: aliceScheduleId,
      name: "Prepare Presentation",
      deadline: "2023-11-15",
      expectedCompletionTime: 3, // hours
      priority: 80,
    });
    assertExists(addTaskResult.task);
    task1Id = addTaskResult.task as ID;

    const tasks = await concept._getTasksBySchedulePointer({ schedulePointer: aliceScheduleId });
    assertEquals(tasks.length, 1);
    assertObjectMatch(tasks[0], { _id: task1Id, name: "Prepare Presentation", completionLevel: 0, schedulePointer: aliceScheduleId });

    const scheduleAfterAdd = await concept._getSchedule({ scheduleId: aliceScheduleId });
    assertExists(scheduleAfterAdd);
    assertEquals((scheduleAfterAdd as any).tasks, [task1Id]);

    // Test precondition: schedule does not exist
    const errorResult = await concept.addTask({
      schedule: "nonExistentSchedule" as ID,
      name: "Failed Task",
      deadline: "2023-11-15",
      expectedCompletionTime: 1,
      priority: 50,
    });
    assertExists(errorResult.error);
  });

  await t.step("editEvent: should modify an existing event", async () => {
    const editResult = await concept.editEvent({
      schedule: aliceScheduleId,
      oldEvent: event1Id,
      name: "Daily Scrum",
      startTime: "09:30",
      endTime: "10:00",
      repeatTime: "Daily",
    });
    assertEquals(editResult, {});

    const events = await concept._getEventsBySchedulePointer({ schedulePointer: aliceScheduleId });
    assertEquals(events.length, 1);
    assertObjectMatch(events[0], { name: "Daily Scrum", startTime: "09:30" });

    // Test precondition: event not in schedule
    const errorResult = await concept.editEvent({
      schedule: aliceScheduleId,
      oldEvent: "nonExistentEvent" as ID,
      name: "Should Fail",
      startTime: "11:00",
      endTime: "12:00",
      repeatTime: "None",
    });
    assertExists(errorResult.error);
  });

  await t.step("editTask: should modify an existing task", async () => {
    const editResult = await concept.editTask({
      schedule: aliceScheduleId,
      oldTask: task1Id,
      name: "Finalize Report",
      deadline: "2023-11-10",
      expectedCompletionTime: 5,
      completionLevel: 25,
      priority: 90,
    });
    assertEquals(editResult, {});

    const tasks = await concept._getTasksBySchedulePointer({ schedulePointer: aliceScheduleId });
    assertEquals(tasks.length, 1);
    assertObjectMatch(tasks[0], { name: "Finalize Report", deadline: "2023-11-10", completionLevel: 25 });

    // Test precondition: task not in schedule
    const errorResult = await concept.editTask({
      schedule: aliceScheduleId,
      oldTask: "nonExistentTask" as ID,
      name: "Should Fail",
      deadline: "2023-11-11",
      expectedCompletionTime: 1,
      completionLevel: 0,
      priority: 50,
    });
    assertExists(errorResult.error);
  });

  await t.step("deleteEvent: should remove an event from the schedule configuration", async () => {
    const addEventResult = await concept.addEvent({
      schedule: aliceScheduleId,
      name: "Temp Event",
      startTime: "11:00",
      endTime: "12:00",
      repeatTime: "None",
    });
    assertExists(addEventResult.event);
    const tempEventId = addEventResult.event as ID;

    const deleteResult = await concept.deleteEvent({ schedule: aliceScheduleId, event: tempEventId });
    assertEquals(deleteResult, {});

    const events = await concept._getEventsBySchedulePointer({ schedulePointer: aliceScheduleId });
    assertEquals(events.length, 1); // Only event1Id remains
    assertNotEquals(events[0]._id, tempEventId);

    const scheduleAfterDelete = await concept._getSchedule({ scheduleId: aliceScheduleId });
    assertExists(scheduleAfterDelete);
    assertEquals((scheduleAfterDelete as any).events.includes(tempEventId), false);

    // Test precondition: event not in schedule
    const errorResult = await concept.deleteEvent({ schedule: aliceScheduleId, event: "anotherNonExistentEvent" as ID });
    assertExists(errorResult.error);
  });

  await t.step("deleteTask: should remove a task from the schedule configuration", async () => {
    const addTaskResult = await concept.addTask({
      schedule: aliceScheduleId,
      name: "Temp Task",
      deadline: "2023-11-20",
      expectedCompletionTime: 2,
      priority: 60,
    });
    assertExists(addTaskResult.task);
    const tempTaskId = addTaskResult.task as ID;

    const deleteResult = await concept.deleteTask({ schedule: aliceScheduleId, task: tempTaskId });
    assertEquals(deleteResult, {});

    const tasks = await concept._getTasksBySchedulePointer({ schedulePointer: aliceScheduleId });
    assertEquals(tasks.length, 1); // Only task1Id remains
    assertNotEquals(tasks[0]._id, tempTaskId);

    const scheduleAfterDelete = await concept._getSchedule({ scheduleId: aliceScheduleId });
    assertExists(scheduleAfterDelete);
    assertEquals((scheduleAfterDelete as any).tasks.includes(tempTaskId), false);

    // Test precondition: task not in schedule
    const errorResult = await concept.deleteTask({ schedule: aliceScheduleId, task: "anotherNonExistentTask" as ID });
    assertExists(errorResult.error);
  });

  await t.step("generateSchedule: should create a new generated schedule and update configuration timestamp", async () => {
    const initialConfig = await concept._getSchedule({ scheduleId: aliceScheduleId });
    assertExists(initialConfig);
    const initialTimestamp = initialConfig.timestamp;

    const generateResult = await concept.generateSchedule({ schedule: aliceScheduleId });
    assertExists(generateResult.newSchedule);
    const generatedScheduleId1 = generateResult.newSchedule as ID;

    const generatedSchedule1 = await concept._getSchedule({ scheduleId: generatedScheduleId1 });
    assertExists(generatedSchedule1);
    assertEquals(generatedSchedule1.owner, userAlice);
    assertEquals(generatedSchedule1.events.length, 1); // event1Id
    assertEquals(generatedSchedule1.tasks.length, 1); // task1Id
    assertEquals(generatedSchedule1.timestamp, initialTimestamp + 1); // Timestamp incremented

    const updatedConfig = await concept._getSchedule({ scheduleId: aliceScheduleId });
    assertExists(updatedConfig);
    assertEquals(updatedConfig.timestamp, initialTimestamp + 1); // Configuration's timestamp also incremented
  });

  await t.step("generateSchedule: should return error for impossible schedule scenario", async () => {
    // Add many events/tasks to trigger the "impossible" condition in the placeholder logic
    for (let i = 0; i < 15; i++) {
      await concept.addEvent({
        schedule: aliceScheduleId,
        name: `Event ${i}`,
        startTime: "10:00",
        endTime: "11:00",
        repeatTime: "None",
      });
    }

    const errorResult = await concept.generateSchedule({ schedule: aliceScheduleId });
    assertExists(errorResult.error);
    assertEquals(errorResult.error, "Scheduling complexity too high; a feasible schedule cannot be generated with current configuration.");
  });

  await t.step("Queries: _getEventsBySchedulePointer and _getTasksBySchedulePointer should work correctly", async () => {
    const bobScheduleResult = await concept.initializeSchedule({ owner: userBob });
    assertExists(bobScheduleResult.schedule);
    const bobScheduleId = bobScheduleResult.schedule as ID;

    await concept.addEvent({ schedule: bobScheduleId, name: "Bob's Event", startTime: "10:00", endTime: "11:00", repeatTime: "None" });
    await concept.addTask({ schedule: bobScheduleId, name: "Bob's Task", deadline: "2023-12-01", expectedCompletionTime: 1, priority: 50 });

    const bobEvents = await concept._getEventsBySchedulePointer({ schedulePointer: bobScheduleId });
    assertEquals(bobEvents.length, 1);
    assertEquals(bobEvents[0].name, "Bob's Event");

    const bobTasks = await concept._getTasksBySchedulePointer({ schedulePointer: bobScheduleId });
    assertEquals(bobTasks.length, 1);
    assertEquals(bobTasks[0].name, "Bob's Task");

    // Check Alice's schedule events/tasks (should have many due to prior "impossible" test)
    const aliceEvents = await concept._getEventsBySchedulePointer({ schedulePointer: aliceScheduleId });
    assertNotEquals(aliceEvents.length, 0); // Should be > 10

    const aliceTasks = await concept._getTasksBySchedulePointer({ schedulePointer: aliceScheduleId });
    assertNotEquals(aliceTasks.length, 0); // Should be 1 (task1Id was not deleted)
  });

  // --- Principle Fulfillment Trace ---
  await t.step("Trace: Principle fulfillment - Schedule Regeneration on updates", async () => {
    // 1. Initialize a schedule for a user.
    const traceUser = "user:TraceUser" as ID;
    const initResult = await concept.initializeSchedule({ owner: traceUser });
    assertExists(initResult.schedule);
    const configScheduleId = initResult.schedule as ID;
    const initialConfig = await concept._getSchedule({ scheduleId: configScheduleId });
    assertEquals(initialConfig?.timestamp, 0, "Initial config timestamp should be 0.");

    // 2. Add a few events and tasks to this schedule configuration.
    const addEvent1Result = await concept.addEvent({
      schedule: configScheduleId,
      name: "Morning Standup", startTime: "09:00", endTime: "09:15", repeatTime: "Daily",
    });
    assertExists(addEvent1Result.event);
    const event1 = addEvent1Result.event as ID;

    const addTask1Result = await concept.addTask({
      schedule: configScheduleId,
      name: "Review PRs", deadline: "2023-11-20", expectedCompletionTime: 2, priority: 70,
    });
    assertExists(addTask1Result.task);
    const task1 = addTask1Result.task as ID;

    const currentConfigEvents = await concept._getEventsBySchedulePointer({ schedulePointer: configScheduleId });
    const currentConfigTasks = await concept._getTasksBySchedulePointer({ schedulePointer: configScheduleId });
    assertEquals(currentConfigEvents.length, 1, "Config should have 1 event.");
    assertEquals(currentConfigTasks.length, 1, "Config should have 1 task.");

    // 3. Call generateSchedule. Verify a new schedule is created with correct timestamp and references.
    const generateResult1 = await concept.generateSchedule({ schedule: configScheduleId });
    assertExists(generateResult1.newSchedule);
    const generatedScheduleId1 = generateResult1.newSchedule as ID;

    const generatedSchedule1 = await concept._getSchedule({ scheduleId: generatedScheduleId1 });
    assertExists(generatedSchedule1, "First generated schedule should exist.");
    assertEquals(generatedSchedule1.owner, traceUser, "Generated schedule owner mismatch.");
    assertEquals(generatedSchedule1.events, [event1], "Generated schedule 1 events mismatch.");
    assertEquals(generatedSchedule1.tasks, [task1], "Generated schedule 1 tasks mismatch.");
    assertEquals(generatedSchedule1.timestamp, 1, "Generated schedule 1 timestamp mismatch.");

    const configAfterGen1 = await concept._getSchedule({ scheduleId: configScheduleId });
    assertEquals(configAfterGen1?.timestamp, 1, "Config timestamp should be 1 after first generation.");

    // 4. Edit an existing event.
    await concept.editEvent({
      schedule: configScheduleId,
      oldEvent: event1,
      name: "Morning Scrum (Updated)", startTime: "09:30", endTime: "09:45", repeatTime: "Daily",
    });
    const updatedEvent = (await concept._getEventsBySchedulePointer({ schedulePointer: configScheduleId}))[0];
    assertEquals(updatedEvent.name, "Morning Scrum (Updated)", "Event name should be updated.");

    // 5. Delete a task.
    await concept.deleteTask({ schedule: configScheduleId, task: task1 });
    const tasksAfterDelete = await concept._getTasksBySchedulePointer({ schedulePointer: configScheduleId });
    assertEquals(tasksAfterDelete.length, 0, "Task should be deleted from config.");

    // 6. Call generateSchedule again. Verify *another* new schedule is created with an *incremented* timestamp,
    //    reflecting the updated set of events and tasks from the configuration schedule.
    const generateResult2 = await concept.generateSchedule({ schedule: configScheduleId });
    assertExists(generateResult2.newSchedule);
    const generatedScheduleId2 = generateResult2.newSchedule as ID;
    assertNotEquals(generatedScheduleId1, generatedScheduleId2, "New generated schedule should have a different ID.");

    const generatedSchedule2 = await concept._getSchedule({ scheduleId: generatedScheduleId2 });
    assertExists(generatedSchedule2, "Second generated schedule should exist.");
    assertEquals(generatedSchedule2.owner, traceUser, "Generated schedule 2 owner mismatch.");
    assertEquals(generatedSchedule2.events.length, 1, "Generated schedule 2 should have 1 event.");
    assertEquals(generatedSchedule2.events[0], event1, "Generated schedule 2 event ID mismatch.");
    assertEquals(generatedSchedule2.tasks.length, 0, "Generated schedule 2 should have 0 tasks.");
    assertEquals(generatedSchedule2.timestamp, 2, "Generated schedule 2 timestamp mismatch."); // Timestamp incremented again

    const configAfterGen2 = await concept._getSchedule({ scheduleId: configScheduleId });
    assertEquals(configAfterGen2?.timestamp, 2, "Config timestamp should be 2 after second generation.");

    // Verify the first generated schedule remains unchanged (immutability of generated outputs)
    const previousGeneratedSchedule = await concept._getSchedule({ scheduleId: generatedScheduleId1 });
    assertExists(previousGeneratedSchedule);
    assertEquals(previousGeneratedSchedule.tasks.length, 1, "First generated schedule should retain original tasks.");
    assertEquals(previousGeneratedSchedule.tasks[0], task1, "First generated schedule should retain original task ID.");
    assertEquals(previousGeneratedSchedule.timestamp, 1, "First generated schedule timestamp should remain 1.");
  });

  // Close the database connection after all tests are done
  await client.close();
});
```
