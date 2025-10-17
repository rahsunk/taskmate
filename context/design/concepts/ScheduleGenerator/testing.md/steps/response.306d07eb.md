---
timestamp: 'Fri Oct 17 2025 15:35:34 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_153534.5d4d46b0.md]]'
content_id: 306d07eb88ddc201054a941f89ab931cf87f61dfce0f8feb3f39005add4e9096
---

# response:

```typescript
// file: src/schedulegenerator/ScheduleGeneratorConcept.test.ts

import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "../../utils/database.ts"; // Adjust path as necessary
import { ID } from "../../utils/types.ts"; // Adjust path as necessary
import ScheduleGeneratorConcept from "./ScheduleGeneratorConcept.ts";
import { EventDoc, ScheduleDoc, TaskDoc } from "./ScheduleGeneratorConcept.ts"; // Import doc types for better type safety

// Define dummy IDs for users
const userA = "user:Alice" as ID;
const userB = "user:Bob" as ID;

Deno.test("Principle: Create, add, generate, edit, delete, regenerate schedule", async () => {
  const [db, client] = await testDb();
  const concept = new ScheduleGeneratorConcept(db);

  try {
    console.log("\n--- Principle Fulfillment Test ---");

    // 1. Initialize a schedule for userA
    console.log("Action: Initializing schedule for userA...");
    const initResult = await concept.initializeSchedule({ owner: userA });
    assertNotEquals("error" in initResult, true, `initializeSchedule failed: ${initResult.error}`);
    const { schedule: userAScheduleId } = initResult as { schedule: ID };
    assertExists(userAScheduleId, "Schedule ID should be returned.");
    console.log(`Result: Schedule created with ID: ${userAScheduleId}`);

    const fetchedScheduleResult = await concept._getSchedule({ scheduleId: userAScheduleId });
    assertNotEquals("error" in fetchedScheduleResult, true, `_getSchedule failed: ${fetchedScheduleResult.error}`);
    const fetchedSchedule = fetchedScheduleResult as ScheduleDoc; // Type assertion after error check
    assertExists(fetchedSchedule, "Initial schedule should exist.");
    assertEquals(fetchedSchedule.owner, userA, "Schedule owner should be userA.");
    assertEquals(fetchedSchedule.timestamp, 0, "Initial timestamp should be 0.");
    assertEquals(fetchedSchedule.events.length, 0, "Initially no events.");
    assertEquals(fetchedSchedule.tasks.length, 0, "Initially no tasks.");

    // 2. Add a couple of events
    console.log("Action: Adding Event 1...");
    const addE1Result = await concept.addEvent({
      schedule: userAScheduleId,
      name: "Team Meeting",
      startTime: "09:00",
      endTime: "10:00",
      repeatTime: "Daily",
    });
    assertNotEquals("error" in addE1Result, true, `addEvent (E1) failed: ${addE1Result.error}`);
    const { event: event1Id } = addE1Result as { event: ID };
    assertExists(event1Id, "Event 1 ID should be returned.");
    console.log(`Result: Event 1 created with ID: ${event1Id}`);

    console.log("Action: Adding Event 2...");
    const addE2Result = await concept.addEvent({
      schedule: userAScheduleId,
      name: "Project Review",
      startTime: "11:00",
      endTime: "12:00",
      repeatTime: "Weekly",
    });
    assertNotEquals("error" in addE2Result, true, `addEvent (E2) failed: ${addE2Result.error}`);
    const { event: event2Id } = addE2Result as { event: ID };
    assertExists(event2Id, "Event 2 ID should be returned.");
    console.log(`Result: Event 2 created with ID: ${event2Id}`);

    const eventsResult = await concept._getScheduleEvents({ schedule: userAScheduleId });
    assertNotEquals("error" in eventsResult, true, `_getScheduleEvents failed: ${eventsResult.error}`);
    let events = eventsResult as EventDoc[]; // Type assertion
    assertEquals(events.length, 2, "There should be 2 events in the schedule.");
    assertEquals(events.some(e => e._id === event1Id), true, "Event 1 should be present.");
    assertEquals(events.some(e => e._id === event2Id), true, "Event 2 should be present.");

    // 3. Add a couple of tasks
    console.log("Action: Adding Task 1...");
    const addT1Result = await concept.addTask({
      schedule: userAScheduleId,
      name: "Write Report",
      deadline: "2024-07-31",
      expectedCompletionTime: 4,
      priority: 90,
    });
    assertNotEquals("error" in addT1Result, true, `addTask (T1) failed: ${addT1Result.error}`);
    const { task: task1Id } = addT1Result as { task: ID };
    assertExists(task1Id, "Task 1 ID should be returned.");
    console.log(`Result: Task 1 created with ID: ${task1Id}`);

    console.log("Action: Adding Task 2...");
    const addT2Result = await concept.addTask({
      schedule: userAScheduleId,
      name: "Prepare Presentation",
      deadline: "2024-08-05",
      expectedCompletionTime: 2,
      priority: 70,
    });
    assertNotEquals("error" in addT2Result, true, `addTask (T2) failed: ${addT2Result.error}`);
    const { task: task2Id } = addT2Result as { task: ID };
    assertExists(task2Id, "Task 2 ID should be returned.");
    console.log(`Result: Task 2 created with ID: ${task2Id}`);

    const tasksResult = await concept._getScheduleTasks({ schedule: userAScheduleId });
    assertNotEquals("error" in tasksResult, true, `_getScheduleTasks failed: ${tasksResult.error}`);
    let tasks = tasksResult as TaskDoc[]; // Type assertion
    assertEquals(tasks.length, 2, "There should be 2 tasks in the schedule.");
    assertEquals(tasks.some(t => t._id === task1Id), true, "Task 1 should be present.");
    assertEquals(tasks.some(t => t._id === task2Id), true, "Task 2 should be present.");

    // 4. Generate the schedule (first time)
    console.log("Action: Generating schedule for the first time...");
    const genS1Result = await concept.generateSchedule({ schedule: userAScheduleId });
    assertNotEquals("error" in genS1Result, true, `generateSchedule (1st) failed: ${genS1Result.error}`);
    const { newSchedule: generatedSchedule1Id } = genS1Result as { newSchedule: ID };
    assertExists(generatedSchedule1Id, "Generated schedule ID should be returned.");
    console.log(`Result: Generated schedule 1 created with ID: ${generatedSchedule1Id}`);

    const genSchedule1Result = await concept._getSchedule({ scheduleId: generatedSchedule1Id });
    assertNotEquals("error" in genSchedule1Result, true, `_getSchedule failed: ${genSchedule1Result.error}`);
    const genSchedule1 = genSchedule1Result as ScheduleDoc; // Type assertion
    assertExists(genSchedule1, "Generated schedule 1 should exist.");
    assertEquals(genSchedule1.owner, userA, "Generated schedule 1 owner should be userA.");
    assertEquals(genSchedule1.timestamp, 1, "Generated schedule 1 timestamp should be 1.");
    assertEquals(genSchedule1.events.length, 2, "Generated schedule 1 should reference 2 events.");
    assertEquals(genSchedule1.tasks.length, 2, "Generated schedule 1 should reference 2 tasks.");

    // 5. Edit an event
    console.log("Action: Editing Event 1 (name and time)...");
    const editE1Result = await concept.editEvent({
      schedule: userAScheduleId,
      oldEvent: event1Id,
      name: "Revised Team Meeting",
      startTime: "09:30",
      endTime: "10:30",
      repeatTime: "Daily",
    });
    assertNotEquals("error" in editE1Result, true, `editEvent failed: ${editE1Result.error}`);
    console.log("Result: Event 1 edited.");

    const updatedEventsResult = await concept._getScheduleEvents({ schedule: userAScheduleId });
    assertNotEquals("error" in updatedEventsResult, true, `_getScheduleEvents failed: ${updatedEventsResult.error}`);
    events = updatedEventsResult as EventDoc[]; // Re-assign with type assertion
    const editedEvent = events.find(e => e._id === event1Id);
    assertExists(editedEvent, "Edited event should still exist.");
    assertEquals(editedEvent.name, "Revised Team Meeting", "Event 1 name should be updated.");
    assertEquals(editedEvent.startTime, "09:30", "Event 1 start time should be updated.");

    // 6. Delete a task
    console.log("Action: Deleting Task 2...");
    const delT2Result = await concept.deleteTask({ schedule: userAScheduleId, task: task2Id });
    assertNotEquals("error" in delT2Result, true, `deleteTask failed: ${delT2Result.error}`);
    console.log("Result: Task 2 deleted.");

    const tasksAfterDeleteResult = await concept._getScheduleTasks({ schedule: userAScheduleId });
    assertNotEquals("error" in tasksAfterDeleteResult, true, `_getScheduleTasks failed: ${tasksAfterDeleteResult.error}`);
    tasks = tasksAfterDeleteResult as TaskDoc[]; // Re-assign with type assertion
    assertEquals(tasks.length, 1, "There should now be 1 task left in the schedule.");
    assertEquals(tasks.some(t => t._id === task2Id), false, "Task 2 should be deleted.");

    // 7. Generate schedule again (second time)
    console.log("Action: Generating schedule for the second time...");
    const genS2Result = await concept.generateSchedule({ schedule: userAScheduleId });
    assertNotEquals("error" in genS2Result, true, `generateSchedule (2nd) failed: ${genS2Result.error}`);
    const { newSchedule: generatedSchedule2Id } = genS2Result as { newSchedule: ID };
    assertExists(generatedSchedule2Id, "Second generated schedule ID should be returned.");
    console.log(`Result: Generated schedule 2 created with ID: ${generatedSchedule2Id}`);

    const genSchedule2Result = await concept._getSchedule({ scheduleId: generatedSchedule2Id });
    assertNotEquals("error" in genSchedule2Result, true, `_getSchedule failed: ${genSchedule2Result.error}`);
    const genSchedule2 = genSchedule2Result as ScheduleDoc; // Type assertion
    assertExists(genSchedule2, "Generated schedule 2 should exist.");
    assertEquals(genSchedule2.owner, userA, "Generated schedule 2 owner should be userA.");
    assertEquals(genSchedule2.timestamp, 2, "Generated schedule 2 timestamp should be 2."); // Incrementing again
    assertEquals(genSchedule2.events.length, 2, "Generated schedule 2 should reference 2 events (one edited).");
    assertEquals(genSchedule2.tasks.length, 1, "Generated schedule 2 should reference 1 task (one deleted).");

    console.log("--- Principle Fulfillment Test Complete ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: initializeSchedule creates a valid schedule", async () => {
  const [db, client] = await testDb();
  const concept = new ScheduleGeneratorConcept(db);

  try {
    console.log("\n--- initializeSchedule Test ---");
    const initResult = await concept.initializeSchedule({ owner: userB });
    assertNotEquals("error" in initResult, true, `initializeSchedule failed unexpectedly: ${initResult.error}`);
    const { schedule: newScheduleId } = initResult as { schedule: ID };
    assertExists(newScheduleId, "A new schedule ID should be returned.");

    const newScheduleResult = await concept._getSchedule({ scheduleId: newScheduleId });
    assertNotEquals("error" in newScheduleResult, true, `_getSchedule failed: ${newScheduleResult.error}`);
    const newSchedule = newScheduleResult as ScheduleDoc; // Type assertion
    assertExists(newSchedule, "The newly created schedule should be retrievable.");
    assertEquals(newSchedule.owner, userB, "The owner should match the input user.");
    assertEquals(newSchedule.events.length, 0, "New schedule should have no events initially.");
    assertEquals(newSchedule.tasks.length, 0, "New schedule should have no tasks initially.");
    assertEquals(newSchedule.timestamp, 0, "New schedule should have timestamp 0.");
    console.log("Result: Schedule initialized successfully.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: addEvent requires an existing schedule", async () => {
  const [db, client] = await testDb();
  const concept = new ScheduleGeneratorConcept(db);
  const nonExistentScheduleId = "schedule:fake" as ID;

  try {
    console.log("\n--- addEvent Requirements Test ---");
    console.log(`Action: Attempting to add event to non-existent schedule ${nonExistentScheduleId}...`);
    const result = await concept.addEvent({
      schedule: nonExistentScheduleId,
      name: "Fake Event",
      startTime: "09:00",
      endTime: "10:00",
      repeatTime: "None",
    });
    assertEquals("error" in result, true, "Adding an event to a non-existent schedule should fail.");
    assertEquals((result as { error: string }).error, `Schedule with ID '${nonExistentScheduleId}' not found.`, "Correct error message expected.");
    console.log("Result: Failed as expected.");

    // Verify success case for an existing schedule
    const initResult = await concept.initializeSchedule({ owner: userA });
    assertNotEquals("error" in initResult, true, `initializeSchedule failed: ${initResult.error}`);
    const { schedule: existingScheduleId } = initResult as { schedule: ID };
    console.log(`Action: Adding event to existing schedule ${existingScheduleId}...`);
    const successResult = await concept.addEvent({
      schedule: existingScheduleId,
      name: "Real Event",
      startTime: "10:00",
      endTime: "11:00",
      repeatTime: "Daily",
    });
    assertEquals("error" in successResult, false, "Adding to an existing schedule should succeed.");
    const eventsResult = await concept._getScheduleEvents({ schedule: existingScheduleId });
    assertNotEquals("error" in eventsResult, true, `_getScheduleEvents failed: ${eventsResult.error}`);
    const events = eventsResult as EventDoc[]; // Type assertion
    assertEquals(events.length, 1, "One event should be added.");
    assertEquals(events[0].name, "Real Event", "Event name should match.");
    console.log("Result: Succeeded as expected.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: editEvent requirements and success", async () => {
  const [db, client] = await testDb();
  const concept = new ScheduleGeneratorConcept(db);

  try {
    console.log("\n--- editEvent Requirements Test ---");
    const initResult = await concept.initializeSchedule({ owner: userA });
    assertNotEquals("error" in initResult, true, `initializeSchedule failed: ${initResult.error}`);
    const { schedule: scheduleId } = initResult as { schedule: ID };

    const addEventResult = await concept.addEvent({
      schedule: scheduleId,
      name: "Old Name",
      startTime: "08:00",
      endTime: "09:00",
      repeatTime: "None",
    });
    assertNotEquals("error" in addEventResult, true, `addEvent failed: ${addEventResult.error}`);
    const { event: eventId } = addEventResult as { event: ID };

    const nonExistentEventId = "event:fake" as ID;
    const anotherScheduleId = "schedule:another" as ID;
    await concept.initializeSchedule({ owner: userB }); // Create another schedule

    console.log(`Action: Attempting to edit non-existent event ${nonExistentEventId}...`);
    let result = await concept.editEvent({
      schedule: scheduleId,
      oldEvent: nonExistentEventId,
      name: "New Name",
      startTime: "13:00",
      endTime: "14:00",
      repeatTime: "Daily",
    });
    assertEquals("error" in result, true, "Editing a non-existent event should fail.");
    console.log("Result: Failed as expected (non-existent event).");

    console.log(`Action: Attempting to edit event from a non-existent schedule '${anotherScheduleId}'...`);
    result = await concept.editEvent({
      schedule: anotherScheduleId, // Incorrect schedule (non-existent)
      oldEvent: eventId,
      name: "New Name",
      startTime: "13:00",
      endTime: "14:00",
      repeatTime: "Daily",
    });
    assertEquals("error" in result, true, "Editing an event with a non-existent schedule should fail.");
    assertEquals((result as { error: string }).error, `Schedule with ID '${anotherScheduleId}' not found.`, "Expected schedule not found error for wrong schedule ID.");
    console.log("Result: Failed as expected (non-existent schedule).");

    // Correct usage
    console.log(`Action: Successfully editing event ${eventId}...`);
    const successResult = await concept.editEvent({
      schedule: scheduleId,
      oldEvent: eventId,
      name: "Updated Meeting",
      startTime: "09:30",
      endTime: "10:30",
      repeatTime: "Weekly",
    });
    assertEquals("error" in successResult, false, `Successful edit failed: ${successResult.error}`);
    console.log("Result: Succeeded as expected.");

    const updatedEventsResult = await concept._getScheduleEvents({ schedule: scheduleId });
    assertNotEquals("error" in updatedEventsResult, true, `_getScheduleEvents failed: ${updatedEventsResult.error}`);
    const updatedEvents = updatedEventsResult as EventDoc[]; // Type assertion
    const updatedEvent = updatedEvents.find(e => e._id === eventId);
    assertExists(updatedEvent, "Edited event should still exist.");
    assertEquals(updatedEvent.name, "Updated Meeting", "Event name should be updated.");
    assertEquals(updatedEvent.startTime, "09:30", "Event start time should be updated.");
    assertEquals(updatedEvent.repeatTime, "Weekly", "Event repeat time should be updated.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: deleteEvent requirements and success", async () => {
  const [db, client] = await testDb();
  const concept = new ScheduleGeneratorConcept(db);

  try {
    console.log("\n--- deleteEvent Requirements Test ---");
    const initResult = await concept.initializeSchedule({ owner: userA });
    assertNotEquals("error" in initResult, true, `initializeSchedule failed: ${initResult.error}`);
    const { schedule: scheduleId } = initResult as { schedule: ID };

    const addEventToDeleteResult = await concept.addEvent({
      schedule: scheduleId,
      name: "Event to Delete",
      startTime: "10:00",
      endTime: "11:00",
      repeatTime: "None",
    });
    assertNotEquals("error" in addEventToDeleteResult, true, `addEvent failed: ${addEventToDeleteResult.error}`);
    const { event: eventToDeleteId } = addEventToDeleteResult as { event: ID };

    const addOtherEventResult = await concept.addEvent({
      schedule: scheduleId,
      name: "Other Event",
      startTime: "12:00",
      endTime: "13:00",
      repeatTime: "None",
    });
    assertNotEquals("error" in addOtherEventResult, true, `addEvent failed: ${addOtherEventResult.error}`);
    const { event: otherEventId } = addOtherEventResult as { event: ID };

    const nonExistentEventId = "event:fake" as ID;
    const anotherScheduleId = "schedule:another" as ID;
    await concept.initializeSchedule({ owner: userB }); // Create another schedule

    console.log(`Action: Attempting to delete non-existent event ${nonExistentEventId}...`);
    let result = await concept.deleteEvent({ schedule: scheduleId, event: nonExistentEventId });
    assertEquals("error" in result, true, "Deleting a non-existent event should fail.");
    console.log("Result: Failed as expected (non-existent event).");

    console.log(`Action: Attempting to delete event from a non-existent schedule '${anotherScheduleId}'...`);
    result = await concept.deleteEvent({ schedule: anotherScheduleId, event: eventToDeleteId }); // Event is not in this schedule
    assertEquals("error" in result, true, "Deleting an event with a non-existent schedule should fail.");
    assertEquals((result as { error: string }).error, `Schedule with ID '${anotherScheduleId}' not found.`, "Expected schedule not found error for wrong schedule ID.");
    console.log("Result: Failed as expected (non-existent schedule).");

    // Correct usage
    console.log(`Action: Successfully deleting event ${eventToDeleteId}...`);
    const successResult = await concept.deleteEvent({ schedule: scheduleId, event: eventToDeleteId });
    assertEquals("error" in successResult, false, `Successful delete failed: ${successResult.error}`);
    console.log("Result: Succeeded as expected.");

    const eventsAfterDeleteResult = await concept._getScheduleEvents({ schedule: scheduleId });
    assertNotEquals("error" in eventsAfterDeleteResult, true, `_getScheduleEvents failed: ${eventsAfterDeleteResult.error}`);
    const eventsAfterDelete = eventsAfterDeleteResult as EventDoc[]; // Type assertion
    assertEquals(eventsAfterDelete.length, 1, "Only one event should remain after deletion.");
    assertEquals(eventsAfterDelete[0]._id, otherEventId, "The correct event should remain.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: addTask requirements and success", async () => {
  const [db, client] = await testDb();
  const concept = new ScheduleGeneratorConcept(db);
  const nonExistentScheduleId = "schedule:fake" as ID;

  try {
    console.log("\n--- addTask Requirements Test ---");
    console.log(`Action: Attempting to add task to non-existent schedule ${nonExistentScheduleId}...`);
    const result = await concept.addTask({
      schedule: nonExistentScheduleId,
      name: "Fake Task",
      deadline: "2024-12-31",
      expectedCompletionTime: 1,
      priority: 50,
    });
    assertEquals("error" in result, true, "Adding a task to a non-existent schedule should fail.");
    assertEquals((result as { error: string }).error, `Schedule with ID '${nonExistentScheduleId}' not found.`, "Correct error message expected.");
    console.log("Result: Failed as expected.");

    // Verify success case for an existing schedule
    const initResult = await concept.initializeSchedule({ owner: userA });
    assertNotEquals("error" in initResult, true, `initializeSchedule failed: ${initResult.error}`);
    const { schedule: existingScheduleId } = initResult as { schedule: ID };
    console.log(`Action: Adding task to existing schedule ${existingScheduleId}...`);
    const successResult = await concept.addTask({
      schedule: existingScheduleId,
      name: "Real Task",
      deadline: "2024-07-30",
      expectedCompletionTime: 3,
      priority: 80,
    });
    assertEquals("error" in successResult, false, "Adding to an existing schedule should succeed.");
    const tasksResult = await concept._getScheduleTasks({ schedule: existingScheduleId });
    assertNotEquals("error" in tasksResult, true, `_getScheduleTasks failed: ${tasksResult.error}`);
    const tasks = tasksResult as TaskDoc[]; // Type assertion
    assertEquals(tasks.length, 1, "One task should be added.");
    assertEquals(tasks[0].name, "Real Task", "Task name should match.");
    assertEquals(tasks[0].completionLevel, 0, "Initial completion level should be 0.");
    console.log("Result: Succeeded as expected.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: editTask requirements and success", async () => {
  const [db, client] = await testDb();
  const concept = new ScheduleGeneratorConcept(db);

  try {
    console.log("\n--- editTask Requirements Test ---");
    const initResult = await concept.initializeSchedule({ owner: userA });
    assertNotEquals("error" in initResult, true, `initializeSchedule failed: ${initResult.error}`);
    const { schedule: scheduleId } = initResult as { schedule: ID };

    const addTaskResult = await concept.addTask({
      schedule: scheduleId,
      name: "Old Task Name",
      deadline: "2024-07-20",
      expectedCompletionTime: 5,
      priority: 60,
    });
    assertNotEquals("error" in addTaskResult, true, `addTask failed: ${addTaskResult.error}`);
    const { task: taskId } = addTaskResult as { task: ID };

    const nonExistentTaskId = "task:fake" as ID;
    const anotherScheduleId = "schedule:another" as ID;
    await concept.initializeSchedule({ owner: userB }); // Create another schedule

    console.log(`Action: Attempting to edit non-existent task ${nonExistentTaskId}...`);
    let result = await concept.editTask({
      schedule: scheduleId,
      oldTask: nonExistentTaskId,
      name: "New Task Name",
      deadline: "2024-07-25",
      expectedCompletionTime: 3,
      completionLevel: 50,
      priority: 70,
    });
    assertEquals("error" in result, true, "Editing a non-existent task should fail.");
    console.log("Result: Failed as expected (non-existent task).");

    console.log(`Action: Attempting to edit task from a non-existent schedule '${anotherScheduleId}'...`);
    result = await concept.editTask({
      schedule: anotherScheduleId, // Incorrect schedule (non-existent)
      oldTask: taskId,
      name: "New Task Name",
      deadline: "2024-07-25",
      expectedCompletionTime: 3,
      completionLevel: 50,
      priority: 70,
    });
    assertEquals("error" in result, true, "Editing a task with a non-existent schedule should fail.");
    assertEquals((result as { error: string }).error, `Schedule with ID '${anotherScheduleId}' not found.`, "Expected schedule not found error for wrong schedule ID.");
    console.log("Result: Failed as expected (non-existent schedule).");


    // Correct usage
    console.log(`Action: Successfully editing task ${taskId}...`);
    const successResult = await concept.editTask({
      schedule: scheduleId,
      oldTask: taskId,
      name: "Updated Task",
      deadline: "2024-08-01",
      expectedCompletionTime: 2,
      completionLevel: 75,
      priority: 95,
    });
    assertEquals("error" in successResult, false, `Successful edit failed: ${successResult.error}`);
    console.log("Result: Succeeded as expected.");

    const updatedTasksResult = await concept._getScheduleTasks({ schedule: scheduleId });
    assertNotEquals("error" in updatedTasksResult, true, `_getScheduleTasks failed: ${updatedTasksResult.error}`);
    const updatedTasks = updatedTasksResult as TaskDoc[]; // Type assertion
    const updatedTask = updatedTasks.find(t => t._id === taskId);
    assertExists(updatedTask, "Edited task should still exist.");
    assertEquals(updatedTask.name, "Updated Task", "Task name should be updated.");
    assertEquals(updatedTask.deadline, "2024-08-01", "Task deadline should be updated.");
    assertEquals(updatedTask.completionLevel, 75, "Task completion level should be updated.");
    assertEquals(updatedTask.priority, 95, "Task priority should be updated.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: deleteTask requirements and success", async () => {
  const [db, client] = await testDb();
  const concept = new ScheduleGeneratorConcept(db);

  try {
    console.log("\n--- deleteTask Requirements Test ---");
    const initResult = await concept.initializeSchedule({ owner: userA });
    assertNotEquals("error" in initResult, true, `initializeSchedule failed: ${initResult.error}`);
    const { schedule: scheduleId } = initResult as { schedule: ID };

    const addTaskToDeleteResult = await concept.addTask({
      schedule: scheduleId,
      name: "Task to Delete",
      deadline: "2024-07-20",
      expectedCompletionTime: 5,
      priority: 60,
    });
    assertNotEquals("error" in addTaskToDeleteResult, true, `addTask failed: ${addTaskToDeleteResult.error}`);
    const { task: taskToDeleteId } = addTaskToDeleteResult as { task: ID };

    const addOtherTaskResult = await concept.addTask({
      schedule: scheduleId,
      name: "Other Task",
      deadline: "2024-07-25",
      expectedCompletionTime: 3,
      priority: 70,
    });
    assertNotEquals("error" in addOtherTaskResult, true, `addTask failed: ${addOtherTaskResult.error}`);
    const { task: otherTaskId } = addOtherTaskResult as { task: ID };

    const nonExistentTaskId = "task:fake" as ID;
    const anotherScheduleId = "schedule:another" as ID;
    await concept.initializeSchedule({ owner: userB }); // Create another schedule

    console.log(`Action: Attempting to delete non-existent task ${nonExistentTaskId}...`);
    let result = await concept.deleteTask({ schedule: scheduleId, task: nonExistentTaskId });
    assertEquals("error" in result, true, "Deleting a non-existent task should fail.");
    console.log("Result: Failed as expected (non-existent task).");

    console.log(`Action: Attempting to delete task from a non-existent schedule '${anotherScheduleId}'...`);
    result = await concept.deleteTask({ schedule: anotherScheduleId, task: taskToDeleteId }); // Task is not in this schedule
    assertEquals("error" in result, true, "Deleting a task with a non-existent schedule should fail.");
    assertEquals((result as { error: string }).error, `Schedule with ID '${anotherScheduleId}' not found.`, "Expected schedule not found error for wrong schedule ID.");
    console.log("Result: Failed as expected (non-existent schedule).");

    // Correct usage
    console.log(`Action: Successfully deleting task ${taskToDeleteId}...`);
    const successResult = await concept.deleteTask({ schedule: scheduleId, task: taskToDeleteId });
    assertEquals("error" in successResult, false, `Successful delete failed: ${successResult.error}`);
    console.log("Result: Succeeded as expected.");

    const tasksAfterDeleteResult = await concept._getScheduleTasks({ schedule: scheduleId });
    assertNotEquals("error" in tasksAfterDeleteResult, true, `_getScheduleTasks failed: ${tasksAfterDeleteResult.error}`);
    const tasksAfterDelete = tasksAfterDeleteResult as TaskDoc[]; // Type assertion
    assertEquals(tasksAfterDelete.length, 1, "Only one task should remain after deletion.");
    assertEquals(tasksAfterDelete[0]._id, otherTaskId, "The correct task should remain.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: generateSchedule error conditions and success", async () => {
  const [db, client] = await testDb();
  const concept = new ScheduleGeneratorConcept(db);

  try {
    console.log("\n--- generateSchedule Error Conditions Test ---");
    const nonExistentScheduleId = "schedule:fake" as ID;

    console.log(`Action: Attempting to generate schedule for non-existent schedule ${nonExistentScheduleId}...`);
    let result = await concept.generateSchedule({ schedule: nonExistentScheduleId });
    assertEquals("error" in result, true, "Generating a schedule for a non-existent schedule should fail.");
    assertEquals((result as { error: string }).error, `Schedule with ID '${nonExistentScheduleId}' not found.`, "Correct error message expected.");
    console.log("Result: Failed as expected (non-existent schedule).");

    // Test artificial "too many events and tasks" error condition
    const initResult = await concept.initializeSchedule({ owner: userA });
    assertNotEquals("error" in initResult, true, `initializeSchedule failed: ${initResult.error}`);
    const { schedule: scheduleId } = initResult as { schedule: ID };

    // Add more than 5 events
    for (let i = 0; i < 6; i++) {
      const addEventResult = await concept.addEvent({
        schedule: scheduleId,
        name: `Event ${i}`,
        startTime: `0${i}:00`,
        endTime: `0${i + 1}:00`,
        repeatTime: "Daily",
      });
      assertNotEquals("error" in addEventResult, true, `addEvent failed: ${addEventResult.error}`);
    }
    // Add more than 5 tasks
    for (let i = 0; i < 6; i++) {
      const addTaskResult = await concept.addTask({
        schedule: scheduleId,
        name: `Task ${i}`,
        deadline: `2024-07-2${i}`,
        expectedCompletionTime: 1,
        priority: 50,
      });
      assertNotEquals("error" in addTaskResult, true, `addTask failed: ${addTaskResult.error}`);
    }

    console.log("Action: Attempting to generate schedule with too many events/tasks (should trigger artificial error)...");
    result = await concept.generateSchedule({ schedule: scheduleId });
    assertEquals("error" in result, true, "Generating schedule should fail due to artificial condition.");
    assertEquals((result as { error: string }).error, "Too many events and tasks; a feasible schedule cannot be generated at this time.", "Correct error message expected for 'too many events/tasks'.");
    console.log("Result: Failed as expected (artificial error).");

    // Test successful generation with fewer items
    const initCharlieScheduleResult = await concept.initializeSchedule({ owner: "user:Charlie" as ID });
    assertNotEquals("error" in initCharlieScheduleResult, true, `initializeSchedule failed: ${initCharlieScheduleResult.error}`);
    const { schedule: userCScheduleId } = initCharlieScheduleResult as { schedule: ID };

    const addEventCharlieResult = await concept.addEvent({ schedule: userCScheduleId, name: "Single Event", startTime: "10:00", endTime: "11:00", repeatTime: "None" });
    assertNotEquals("error" in addEventCharlieResult, true, `addEvent failed: ${addEventCharlieResult.error}`);

    const addTaskCharlieResult = await concept.addTask({ schedule: userCScheduleId, name: "Single Task", deadline: "2024-08-01", expectedCompletionTime: 1, priority: 50 });
    assertNotEquals("error" in addTaskCharlieResult, true, `addTask failed: ${addTaskCharlieResult.error}`);


    console.log("Action: Successfully generating schedule with fewer items...");
    const successResult = await concept.generateSchedule({ schedule: userCScheduleId });
    assertEquals("error" in successResult, false, `Successful generation failed: ${successResult.error}`);
    const { newSchedule: generatedScheduleId } = successResult as { newSchedule: ID };
    assertExists(generatedScheduleId, "A new schedule ID should be returned.");

    const generatedScheduleResult = await concept._getSchedule({ scheduleId: generatedScheduleId });
    assertNotEquals("error" in generatedScheduleResult, true, `_getSchedule failed: ${generatedScheduleResult.error}`);
    const generatedSchedule = generatedScheduleResult as ScheduleDoc; // Type assertion
    assertExists(generatedSchedule, "The generated schedule should exist.");
    assertEquals(generatedSchedule.timestamp, 1, "Timestamp should be incremented.");
    assertEquals(generatedSchedule.events.length, 1, "Generated schedule should reference 1 event.");
    assertEquals(generatedSchedule.tasks.length, 1, "Generated schedule should reference 1 task.");
    console.log("Result: Succeeded as expected.");
  } finally {
    await client.close();
  }
});
```
