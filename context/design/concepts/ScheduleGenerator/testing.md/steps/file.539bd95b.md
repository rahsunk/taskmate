---
timestamp: 'Sun Oct 19 2025 13:23:57 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_132357.e10f2c58.md]]'
content_id: 539bd95ba0aae35ed770081cc6f18433fa950d900027d29b0bbfc0eaaed2eced
---

# file: src/ScheduleGenerator/ScheduleGeneratorConcept.test.ts

```typescript
import { assertEquals, assert, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "../../utils/database.ts"; // Assuming testDb is correctly located
import ScheduleGeneratorConcept from "./ScheduleGeneratorConcept.ts";
import { ID, Empty } from "../../utils/types.ts";

// Re-declare internal types for consistency in tests, or import if exported
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

interface ScheduledItem {
    type: "event" | "task";
    originalId: Event | Task;
    name: string;
    scheduledStartTime: Date;
    scheduledEndTime: Date;
}

type GeneratedSchedulePlan = ScheduledItem[];

// Helper to create dates relative to today for consistent testing across runs
const getRelativeDate = (days: number, hours: number, minutes: number, baseDate?: Date) => {
  const date = baseDate ? new Date(baseDate) : new Date();
  date.setHours(hours, minutes, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
};

Deno.test("ScheduleGeneratorConcept - Basic CRUD for Schedules, Events, and Tasks", async (t) => {
  const [db, client] = await testDb();
  const concept = new ScheduleGeneratorConcept(db);

  const userAlice = "user:Alice" as User;
  let aliceSchedule: Schedule;
  let event1: Event;
  let event2: Event;
  let task1: Task;
  let task2: Task;

  await t.step("initializeSchedule: creates a new schedule", async () => {
    console.log(`Action: initializeSchedule for owner ${userAlice}`);
    const result = await concept.initializeSchedule({ owner: userAlice });
    assert(result.schedule, `Expected a schedule ID, but got: ${result.error}`);
    aliceSchedule = result.schedule;
    console.log(`Output: Created schedule ID: ${aliceSchedule}`);

    const fetchedSchedule = await db.collection("ScheduleGenerator.schedules").findOne({ _id: aliceSchedule });
    assert(fetchedSchedule, "Schedule should be found in DB");
    assertEquals(fetchedSchedule.owner, userAlice);
  });

  await t.step("addEvent: adds an event to the schedule", async () => {
    const startTime = getRelativeDate(1, 9, 0); // Tomorrow 9:00 AM
    const endTime = getRelativeDate(1, 10, 0); // Tomorrow 10:00 AM
    const repeat: RepeatConfig = { frequency: RepeatFrequency.NONE };

    console.log(`Action: addEvent to schedule ${aliceSchedule} - Team Meeting`);
    const result = await concept.addEvent({
      schedule: aliceSchedule,
      name: "Team Meeting",
      startTime,
      endTime,
      repeat,
    });
    assert(result.event, `Expected an event ID, but got: ${result.error}`);
    event1 = result.event;
    console.log(`Output: Added event ID: ${event1}`);

    const fetchedEvent = await concept._getEventDetails({ event: event1 });
    assert(fetchedEvent.eventDetails, "Event should be found via query");
    assertEquals(fetchedEvent.eventDetails.name, "Team Meeting");
  });

  await t.step("addEvent: fails if schedule does not exist", async () => {
    const nonExistentSchedule = "nonExistent" as Schedule;
    const startTime = getRelativeDate(0, 10, 0);
    const endTime = getRelativeDate(0, 11, 0);
    const repeat: RepeatConfig = { frequency: RepeatFrequency.NONE };

    console.log(`Action: addEvent to non-existent schedule ${nonExistentSchedule}`);
    const result = await concept.addEvent({
      schedule: nonExistentSchedule,
      name: "Ghost Meeting",
      startTime,
      endTime,
      repeat,
    });
    assert(result.error, "Expected an error for non-existent schedule");
    assertEquals(result.error, `Schedule with ID ${nonExistentSchedule} not found.`);
    console.log(`Output: Error: ${result.error}`);
  });

  await t.step("editEvent: modifies an existing event", async () => {
    const newStartTime = getRelativeDate(2, 10, 30); // Day after tomorrow 10:30 AM
    const newEndTime = getRelativeDate(2, 12, 0); // Day after tomorrow 12:00 PM
    const newRepeat: RepeatConfig = { frequency: RepeatFrequency.DAILY };

    console.log(`Action: editEvent ${event1} to new details`);
    const result = await concept.editEvent({
      schedule: aliceSchedule,
      oldEvent: event1,
      name: "Daily Standup (Edited)",
      startTime: newStartTime,
      endTime: newEndTime,
      repeat: newRepeat,
    });
    assert(!result.error, `Expected no error, but got: ${result.error}`);
    console.log("Output: Event edited successfully");

    const fetchedEvent = await concept._getEventDetails({ event: event1 });
    assert(fetchedEvent.eventDetails, "Event should be found after edit");
    assertEquals(fetchedEvent.eventDetails.name, "Daily Standup (Edited)");
    assertEquals(fetchedEvent.eventDetails.startTime.toISOString(), newStartTime.toISOString());
    assertEquals(fetchedEvent.eventDetails.repeat.frequency, RepeatFrequency.DAILY);
  });

  await t.step("editEvent: fails if event not associated with schedule", async () => {
    // Create another dummy schedule for a different user
    const otherUser = "user:Bob" as User;
    const initOtherScheduleResult = await concept.initializeSchedule({ owner: otherUser });
    assert(initOtherScheduleResult.schedule, `Failed to init other schedule: ${initOtherScheduleResult.error}`);
    const otherSchedule = initOtherScheduleResult.schedule;

    const newStartTime = getRelativeDate(0, 11, 0);
    const newEndTime = getRelativeDate(0, 11, 30);
    const repeat: RepeatConfig = { frequency: RepeatFrequency.NONE };

    console.log(`Action: editEvent ${event1} with wrong schedule ${otherSchedule}`);
    const result = await concept.editEvent({
      schedule: otherSchedule, // Wrong schedule
      oldEvent: event1,
      name: "Should Fail",
      startTime: newStartTime,
      endTime: newEndTime,
      repeat,
    });
    assert(result.error, "Expected an error for event not associated with schedule");
    console.log(`Output: Error: ${result.error}`);
  });

  await t.step("deleteEvent: removes an event from the schedule", async () => {
    // Add another event to ensure only the specified one is deleted
    const startTime2 = getRelativeDate(0, 14, 0);
    const endTime2 = getRelativeDate(0, 15, 0);
    const repeat2: RepeatConfig = { frequency: RepeatFrequency.NONE };
    const addResult = await concept.addEvent({
      schedule: aliceSchedule,
      name: "Another Event",
      startTime: startTime2,
      endTime: endTime2,
      repeat: repeat2,
    });
    event2 = addResult.event!;
    console.log(`Added second event ID: ${event2}`);

    console.log(`Action: deleteEvent ${event1} from schedule ${aliceSchedule}`);
    const result = await concept.deleteEvent({ schedule: aliceSchedule, event: event1 });
    assert(!result.error, `Expected no error, but got: ${result.error}`);
    console.log("Output: Event deleted successfully");

    const fetchedEvent = await concept._getEventDetails({ event: event1 });
    assert(fetchedEvent.error, "Deleted event should not be found");

    const eventsForSchedule = await concept._getEventsForSchedule({ schedule: aliceSchedule });
    assert(eventsForSchedule.events, "Should return event list");
    assertEquals(eventsForSchedule.events.length, 1, "Only one event should remain");
    assertEquals(eventsForSchedule.events[0], event2, "The second event should still be present");
  });

  await t.step("deleteEvent: fails if event not found or not associated", async () => {
    const nonExistentEvent = "nonExistentEvent" as Event;
    console.log(`Action: deleteEvent ${nonExistentEvent}`);
    const result = await concept.deleteEvent({ schedule: aliceSchedule, event: nonExistentEvent });
    assert(result.error, "Expected an error for non-existent event");
    assertEquals(result.error, `Event with ID ${nonExistentEvent} not found or not associated with schedule ${aliceSchedule}.`);
    console.log(`Output: Error: ${result.error}`);
  });

  await t.step("addTask: adds a task to the schedule", async () => {
    const deadline = getRelativeDate(3, 17, 0); // 3 days from now 5:00 PM
    console.log(`Action: addTask to schedule ${aliceSchedule} - Project Report`);
    const result = await concept.addTask({
      schedule: aliceSchedule,
      name: "Project Report",
      deadline,
      expectedCompletionTime: 120, // 2 hours
      priority: 80,
    });
    assert(result.task, `Expected a task ID, but got: ${result.error}`);
    task1 = result.task;
    console.log(`Output: Added task ID: ${task1}`);

    const fetchedTask = await concept._getTaskDetails({ task: task1 });
    assert(fetchedTask.taskDetails, "Task should be found via query");
    assertEquals(fetchedTask.taskDetails.name, "Project Report");
    assertEquals(fetchedTask.taskDetails.completionLevel, 0); // Verifying completionLevel is 0
  });

  await t.step("addTask: fails with invalid expectedCompletionTime", async () => {
    const deadline = getRelativeDate(0, 10, 0);
    console.log(`Action: addTask with invalid expectedCompletionTime`);
    const result = await concept.addTask({
      schedule: aliceSchedule,
      name: "Invalid Task",
      deadline,
      expectedCompletionTime: 0,
      priority: 50,
    });
    assert(result.error, "Expected an error for invalid expectedCompletionTime");
    assertEquals(result.error, "Expected completion time must be positive.");
    console.log(`Output: Error: ${result.error}`);
  });

  await t.step("editTask: modifies an existing task", async () => {
    const newDeadline = getRelativeDate(5, 17, 0); // 5 days from now 5:00 PM
    console.log(`Action: editTask ${task1} with new details`);
    const result = await concept.editTask({
      schedule: aliceSchedule,
      oldTask: task1,
      name: "Final Project Report (Edited)",
      deadline: newDeadline,
      expectedCompletionTime: 90, // 1.5 hours
      completionLevel: 50,
      priority: 95,
    });
    assert(!result.error, `Expected no error, but got: ${result.error}`);
    console.log("Output: Task edited successfully");

    const fetchedTask = await concept._getTaskDetails({ task: task1 });
    assert(fetchedTask.taskDetails, "Task should be found after edit");
    assertEquals(fetchedTask.taskDetails.name, "Final Project Report (Edited)");
    assertEquals(fetchedTask.taskDetails.deadline.toISOString(), newDeadline.toISOString());
    assertEquals(fetchedTask.taskDetails.completionLevel, 50);
  });

  await t.step("editTask: fails with invalid priority", async () => {
    const deadline = getRelativeDate(0, 10, 0);
    console.log(`Action: editTask with invalid priority`);
    const result = await concept.editTask({
      schedule: aliceSchedule,
      oldTask: task1,
      name: "Invalid Task Edit",
      deadline,
      expectedCompletionTime: 60,
      completionLevel: 0,
      priority: 101, // Invalid priority
    });
    assert(result.error, "Expected an error for invalid priority");
    assertEquals(result.error, "Priority must be between 0 and 100.");
    console.log(`Output: Error: ${result.error}`);
  });

  await t.step("deleteTask: removes a task from the schedule", async () => {
    // Add another task to ensure only the specified one is deleted
    const deadline2 = getRelativeDate(0, 17, 0);
    const addResult = await concept.addTask({
      schedule: aliceSchedule,
      name: "Another Task",
      deadline: deadline2,
      expectedCompletionTime: 30,
      priority: 70,
    });
    task2 = addResult.task!;
    console.log(`Added second task ID: ${task2}`);

    console.log(`Action: deleteTask ${task1} from schedule ${aliceSchedule}`);
    const result = await concept.deleteTask({ schedule: aliceSchedule, task: task1 });
    assert(!result.error, `Expected no error, but got: ${result.error}`);
    console.log("Output: Task deleted successfully");

    const fetchedTask = await concept._getTaskDetails({ task: task1 });
    assert(fetchedTask.error, "Deleted task should not be found");

    const tasksForSchedule = await concept._getTasksForSchedule({ schedule: aliceSchedule });
    assert(tasksForSchedule.tasks, "Should return task list");
    assertEquals(tasksForSchedule.tasks.length, 1, "Only one task should remain");
    assertEquals(tasksForSchedule.tasks[0], task2, "The second task should still be present");
  });

  await t.step("deleteTask: fails if task not found or not associated", async () => {
    const nonExistentTask = "nonExistentTask" as Task;
    console.log(`Action: deleteTask ${nonExistentTask}`);
    const result = await concept.deleteTask({ schedule: aliceSchedule, task: nonExistentTask });
    assert(result.error, "Expected an error for non-existent task");
    assertEquals(result.error, `Task with ID ${nonExistentTask} not found or not associated with schedule ${aliceSchedule}.`);
    console.log(`Output: Error: ${result.error}`);
  });

  await client.close();
});

Deno.test("ScheduleGeneratorConcept - generateSchedule operational principle and scenarios", async (t) => {
  const [db, client] = await testDb();
  const concept = new ScheduleGeneratorConcept(db);

  const userBob = "user:Bob" as User;
  let bobSchedule: Schedule;

  await t.step("Operational Principle: Generate a simple schedule", async () => {
    console.log("\n--- Operational Principle Test ---");
    const initResult = await concept.initializeSchedule({ owner: userBob });
    assert(initResult.schedule, `Failed to initialize schedule: ${initResult.error}`);
    bobSchedule = initResult.schedule;
    console.log(`Initialized schedule for ${userBob}: ${bobSchedule}`);

    // Add a daily repeating event (e.g., daily standup)
    const eventStartTime1 = getRelativeDate(1, 9, 0); // Tomorrow 9:00 AM
    const eventEndTime1 = getRelativeDate(1, 10, 0); // Tomorrow 10:00 AM
    const addEventResult1 = await concept.addEvent({
      schedule: bobSchedule,
      name: "Daily Sync",
      startTime: eventStartTime1,
      endTime: eventEndTime1,
      repeat: { frequency: RepeatFrequency.DAILY },
    });
    assert(addEventResult1.event, `Failed to add event 1: ${addEventResult1.error}`);
    const event1Id = addEventResult1.event;
    console.log(`Added daily event: ${event1Id}`);

    // Add a task with high priority and close deadline
    const taskDeadline1 = getRelativeDate(2, 17, 0); // Day after tomorrow 5:00 PM
    const addTaskResult1 = await concept.addTask({
      schedule: bobSchedule,
      name: "Prepare Presentation",
      deadline: taskDeadline1,
      expectedCompletionTime: 180, // 3 hours
      priority: 90,
    });
    assert(addTaskResult1.task, `Failed to add task 1: ${addTaskResult1.error}`);
    const task1Id = addTaskResult1.task;
    console.log(`Added high priority task: ${task1Id}`);

    // Add another task with lower priority and later deadline
    const taskDeadline2 = getRelativeDate(4, 12, 0); // 4 days from now 12:00 PM
    const addTaskResult2 = await concept.addTask({
      schedule: bobSchedule,
      name: "Review Documents",
      deadline: taskDeadline2,
      expectedCompletionTime: 60, // 1 hour
      priority: 50,
    });
    assert(addTaskResult2.task, `Failed to add task 2: ${addTaskResult2.error}`);
    const task2Id = addTaskResult2.task;
    console.log(`Added low priority task: ${task2Id}`);

    console.log(`Action: generateSchedule for ${bobSchedule}`);
    const generateResult = await concept.generateSchedule({ schedule: bobSchedule });
    assert(generateResult.generatedPlan, `Expected a generated plan, but got error: ${generateResult.error}`);
    const plan = generateResult.generatedPlan;
    console.log("Output: Generated Plan:");
    plan.forEach((item, index) => {
      console.log(
        `  ${index + 1}. ${item.type}: ${item.name} from ${item.scheduledStartTime.toLocaleString()} to ${item.scheduledEndTime.toLocaleString()}`,
      );
    });

    // Basic assertions about the plan structure and content
    assert(plan.length > 0, "Generated plan should not be empty");
    const eventCount = plan.filter(item => item.type === "event").length;
    const taskCount = plan.filter(item => item.type === "task").length;

    assert(eventCount >= 7, `Expected at least 7 event instances (daily event for 7 days), got ${eventCount}`); // Assuming 7-day horizon
    assert(taskCount >= 2, `Expected at least 2 task instances, got ${taskCount}`); // 2 tasks
    
    // Check that tasks are scheduled between DAILY_TASK_START_HOUR (8) and DAILY_TASK_END_HOUR (22)
    plan.forEach(item => {
        if (item.type === 'task') {
            const startHour = item.scheduledStartTime.getHours();
            const endHour = item.scheduledEndTime.getHours();
            const endMinutes = item.scheduledEndTime.getMinutes();

            assert(startHour >= 8, `Task '${item.name}' scheduled too early: ${startHour}h`);
            // Allow ending exactly at 22:00, but not after
            assert(endHour < 22 || (endHour === 22 && endMinutes === 0), `Task '${item.name}' scheduled too late: ${endHour}h ${endMinutes}m`);
        }
    });

    const scheduledTask1 = plan.find(item => item.originalId === task1Id);
    const scheduledTask2 = plan.find(item => item.originalId === task2Id);
    assert(scheduledTask1, "Task 1 should be scheduled");
    assert(scheduledTask2, "Task 2 should be scheduled");
    // Verify task 1 is scheduled before task 2 if free time allows, due to higher priority and sooner deadline
    if (scheduledTask1 && scheduledTask2) {
      assert(scheduledTask1.scheduledStartTime.getTime() < scheduledTask2.scheduledStartTime.getTime(), 
             "Task 1 should be scheduled before Task 2 due to priority/deadline");
    }
  });

  await t.step("Scenario 1: Conflicts and Unscheduled Tasks (Expect Error)", async () => {
    console.log("\n--- Scenario 1: Conflicts and Unscheduled Tasks ---");
    const userCharlie = "user:Charlie" as User;
    const initResult = await concept.initializeSchedule({ owner: userCharlie });
    assert(initResult.schedule, `Failed to initialize schedule: ${initResult.error}`);
    const charlieSchedule = initResult.schedule;
    console.log(`Initialized schedule for ${userCharlie}: ${charlieSchedule}`);

    // Add an event that takes up most of the available task scheduling time, daily
    const busyStartTime = getRelativeDate(0, 8, 0); // Today 8:00 AM
    const busyEndTime = getRelativeDate(0, 21, 0); // Today 9:00 PM (21:00)
    await concept.addEvent({
      schedule: charlieSchedule,
      name: "All-Day Work Block",
      startTime: busyStartTime,
      endTime: busyEndTime,
      repeat: { frequency: RepeatFrequency.DAILY },
    });
    console.log("Added daily all-day work block event (8 AM - 9 PM).");

    // Add a task that requires 2 hours. Only 1 hour (9 PM - 10 PM) is free.
    const taskDeadline = getRelativeDate(1, 23, 59); // Tomorrow end of day
    await concept.addTask({
      schedule: charlieSchedule,
      name: "Long Task for Busy Schedule",
      deadline: taskDeadline,
      expectedCompletionTime: 120, // 2 hours
      priority: 100,
    });
    console.log("Added a long task that might not fit (2 hours expected).");

    console.log(`Action: generateSchedule for ${charlieSchedule}`);
    const generateResult = await concept.generateSchedule({ schedule: charlieSchedule });
    assert(generateResult.error, "Expected an error for unscheduled tasks due to conflicts");
    assertEquals(generateResult.error, "Not all tasks could be scheduled within the planning horizon or available time slots.");
    console.log(`Output: Error: ${generateResult.error}`);
  });

  await t.step("Scenario 2: Task Prioritization Order", async () => {
    console.log("\n--- Scenario 2: Task Prioritization Order ---");
    const userDavid = "user:David" as User;
    const initResult = await concept.initializeSchedule({ owner: userDavid });
    assert(initResult.schedule, `Failed to initialize schedule: ${initResult.error}`);
    const davidSchedule = initResult.schedule;
    console.log(`Initialized schedule for ${userDavid}: ${davidSchedule}`);

    // Define base dates for tasks, ensuring they are on the same day for easier comparison
    const baseDateForTasks = getRelativeDate(1, 0, 0); // Tomorrow, start of day

    const deadlineSoon = getRelativeDate(0, 12, 0, baseDateForTasks); // Tomorrow 12:00 PM
    const deadlineLater = getRelativeDate(0, 17, 0, baseDateForTasks); // Tomorrow 5:00 PM
    const deadlineVeryLate = getRelativeDate(1, 9, 0, baseDateForTasks); // Day after tomorrow 9:00 AM

    // Task A: Highest priority, sooner deadline (partially completed)
    const addTaskA = await concept.addTask({
      schedule: davidSchedule,
      name: "Task A - High Priority, Soon Deadline, Partial",
      deadline: deadlineSoon,
      expectedCompletionTime: 60,
      completionLevel: 50, // 30 mins remaining
      priority: 100,
    });
    const taskAId = addTaskA.task!;

    // Task B: Lower priority, sooner deadline (full 60 mins)
    const addTaskB = await concept.addTask({
      schedule: davidSchedule,
      name: "Task B - Low Priority, Soon Deadline",
      deadline: deadlineSoon,
      expectedCompletionTime: 60,
      completionLevel: 0,
      priority: 10,
    });
    const taskBId = addTaskB.task!;

    // Task C: Higher priority, later deadline, longer expected time
    const addTaskC = await concept.addTask({
      schedule: davidSchedule,
      name: "Task C - High Priority, Later Deadline, Long",
      deadline: deadlineLater,
      expectedCompletionTime: 120,
      completionLevel: 0,
      priority: 90,
    });
    const taskCId = addTaskC.task!;

    // Task D: Medium priority, later deadline, shorter expected time
    const addTaskD = await concept.addTask({
      schedule: davidSchedule,
      name: "Task D - Medium Priority, Later Deadline, Short",
      deadline: deadlineLater,
      expectedCompletionTime: 30,
      completionLevel: 0,
      priority: 60,
    });
    const taskDId = addTaskD.task!;

    // Task E: Very late deadline, high priority
    const addTaskE = await concept.addTask({
      schedule: davidSchedule,
      name: "Task E - Very Late Deadline, High Priority",
      deadline: deadlineVeryLate,
      expectedCompletionTime: 60,
      completionLevel: 0,
      priority: 95,
    });
    const taskEId = addTaskE.task!;

    console.log(`Action: generateSchedule for ${davidSchedule}`);
    const generateResult = await concept.generateSchedule({ schedule: davidSchedule });
    assert(generateResult.generatedPlan, `Expected a generated plan, but got error: ${generateResult.error}`);
    const plan = generateResult.generatedPlan;
    console.log("Output: Generated Plan (tasks only):");
    const scheduledTasks = plan.filter(item => item.type === "task");
    scheduledTasks.forEach((item, index) => {
      console.log(
        `  ${index + 1}. ${item.name} from ${item.scheduledStartTime.toLocaleString()} to ${item.scheduledEndTime.toLocaleString()}`,
      );
    });

    // Check prioritization based on scheduled start times
    const findScheduledItem = (id: ID) => scheduledTasks.find(s => s.originalId === id);

    const scheduledA = findScheduledItem(taskAId);
    const scheduledB = findScheduledItem(taskBId);
    const scheduledC = findScheduledItem(taskCId);
    const scheduledD = findScheduledItem(taskDId);
    const scheduledE = findScheduledItem(taskEId);

    assert(scheduledA && scheduledB && scheduledC && scheduledD && scheduledE, "All tasks should be scheduled");

    // Order within same deadline: A (30 min remaining, P100) then B (60 min remaining, P10)
    assert(scheduledA.scheduledStartTime < scheduledB.scheduledStartTime,
           "Task A should be scheduled before Task B (sooner deadline, higher priority for effective work)");
    
    // Order between deadlines: A/B (soon deadline) before C/D (later deadline)
    assert(scheduledB.scheduledStartTime < scheduledC.scheduledStartTime,
           "Task B should be scheduled before Task C (sooner deadline)");
    
    // Order within later deadline: C (P90, long) then D (P60, short)
    assert(scheduledC.scheduledStartTime < scheduledD.scheduledStartTime,
           "Task C should be scheduled before Task D (same deadline, higher priority, longer expected time)");

    // Order for very late deadline: D before E
    assert(scheduledD.scheduledStartTime < scheduledE.scheduledStartTime,
           "Task D should be scheduled before Task E (earlier deadline)");
  });

  await t.step("Scenario 3: Repeating Events for different days & Monthly/Yearly", async () => {
    console.log("\n--- Scenario 3: Repeating Events for different days & Monthly/Yearly ---");
    const userEve = "user:Eve" as User;
    const initResult = await concept.initializeSchedule({ owner: userEve });
    assert(initResult.schedule, `Failed to initialize schedule: ${initResult.error}`);
    const eveSchedule = initResult.schedule;
    console.log(`Initialized schedule for ${userEve}: ${eveSchedule}`);

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of today

    // Add a weekly event for Monday and Wednesday
    const weeklyEventBaseDate = getRelativeDate(1, 0, 0); // Start from tomorrow to ensure it falls within horizon
    await concept.addEvent({
      schedule: eveSchedule,
      name: "Weekly Sync (Mon/Wed)",
      startTime: getRelativeDate(0, 10, 0, weeklyEventBaseDate),
      endTime: getRelativeDate(0, 11, 0, weeklyEventBaseDate),
      repeat: { frequency: RepeatFrequency.WEEKLY, daysOfWeek: [1, 3] }, // Monday and Wednesday
    });
    console.log("Added weekly event for Mon & Wed.");

    // Add a monthly event (on a specific day of the month, e.g., the 15th)
    const monthlyEventDay = 15;
    let monthlyEventStart = new Date(today.getFullYear(), today.getMonth(), monthlyEventDay, 13, 0);
    let monthlyEventEnd = new Date(today.getFullYear(), today.getMonth(), monthlyEventDay, 14, 0);
    // Adjust if the 15th is in the past for the current month
    if (monthlyEventStart < today) {
        monthlyEventStart.setMonth(monthlyEventStart.getMonth() + 1);
        monthlyEventEnd.setMonth(monthlyEventEnd.getMonth() + 1);
    }
    await concept.addEvent({
      schedule: eveSchedule,
      name: "Monthly Review",
      startTime: monthlyEventStart,
      endTime: monthlyEventEnd,
      repeat: { frequency: RepeatFrequency.MONTHLY },
    });
    console.log("Added monthly event (15th of month).");

    // Add a yearly event (e.g., Jan 1st)
    const yearlyEventMonth = 0; // January
    const yearlyEventDay = 1;
    let yearlyEventStart = new Date(today.getFullYear(), today.getMonth(), yearlyEventDay, 15, 0);
    let yearlyEventEnd = new Date(today.getFullYear(), today.getMonth(), yearlyEventDay, 16, 0);
    // Adjust if Jan 1st is in the past for this year
    if (yearlyEventStart < today) {
        yearlyEventStart.setFullYear(yearlyEventStart.getFullYear() + 1);
        yearlyEventEnd.setFullYear(yearlyEventEnd.getFullYear() + 1);
    }
    await concept.addEvent({
      schedule: eveSchedule,
      name: "Annual Performance Review",
      startTime: yearlyEventStart,
      endTime: yearlyEventEnd,
      repeat: { frequency: RepeatFrequency.YEARLY },
    });
    console.log("Added yearly event (Jan 1st).");

    console.log(`Action: generateSchedule for ${eveSchedule}`);
    const generateResult = await concept.generateSchedule({ schedule: eveSchedule });
    assert(generateResult.generatedPlan, `Expected a generated plan, but got error: ${generateResult.error}`);
    const plan = generateResult.generatedPlan;
    console.log("Output: Generated Plan (events only):");
    const scheduledEvents = plan.filter(item => item.type === "event");
    scheduledEvents.forEach((item, index) => {
      console.log(
        `  ${index + 1}. ${item.name} on ${item.scheduledStartTime.toLocaleDateString()} at ${item.scheduledStartTime.toLocaleTimeString()}`,
      );
    });

    // Verify weekly events
    let weeklyMonCount = 0;
    let weeklyWedCount = 0;
    scheduledEvents.forEach(e => {
      if (e.name === "Weekly Sync (Mon/Wed)") {
        const day = e.scheduledStartTime.getDay();
        if (day === 1) weeklyMonCount++; // Monday
        if (day === 3) weeklyWedCount++; // Wednesday
      }
    });
    // Within a 7-day horizon, assuming it starts from tomorrow, there should be at least one Monday and one Wednesday.
    assert(weeklyMonCount >= 1, `Expected at least one Monday weekly sync, got ${weeklyMonCount}`);
    assert(weeklyWedCount >= 1, `Expected at least one Wednesday weekly sync, got ${weeklyWedCount}`);

    // Verify monthly event
    let monthlyCount = 0;
    const planningHorizonEnd = getRelativeDate(7, 0, 0, today); // End of 7-day horizon
    scheduledEvents.forEach(e => {
        if (e.name === "Monthly Review") {
            monthlyCount++;
            assert(e.scheduledStartTime.getDate() === monthlyEventDay, `Monthly Review on wrong day of month: ${e.scheduledStartTime.getDate()}`);
            assert(e.scheduledStartTime >= today && e.scheduledStartTime <= planningHorizonEnd, `Monthly event (${e.scheduledStartTime}) is outside 7-day horizon [${today}, ${planningHorizonEnd}]`);
        }
    });
    // Assert there's at most one monthly event if the 15th falls within the 7-day window.
    // Given the `monthlyEventStart` adjustment, it should be either 0 or 1.
    if (monthlyEventStart >= today && monthlyEventStart <= planningHorizonEnd) {
      assertEquals(monthlyCount, 1, `Expected exactly one monthly event instance within horizon, got ${monthlyCount}`);
    } else {
      assertEquals(monthlyCount, 0, `Expected no monthly event instance within horizon, got ${monthlyCount}`);
    }

    // Verify yearly event
    let yearlyCount = 0;
    scheduledEvents.forEach(e => {
        if (e.name === "Annual Performance Review") {
            yearlyCount++;
            assert(e.scheduledStartTime.getMonth() === yearlyEventMonth && e.scheduledStartTime.getDate() === yearlyEventDay, `Yearly event on wrong date`);
            assert(e.scheduledStartTime >= today && e.scheduledStartTime <= planningHorizonEnd, `Yearly event (${e.scheduledStartTime}) is outside 7-day horizon [${today}, ${planningHorizonEnd}]`);
        }
    });
    // Assert there's at most one yearly event if Jan 1st falls within the 7-day window.
    if (yearlyEventStart >= today && yearlyEventStart <= planningHorizonEnd) {
      assertEquals(yearlyCount, 1, `Expected exactly one yearly event instance within horizon, got ${yearlyCount}`);
    } else {
      assertEquals(yearlyCount, 0, `Expected no yearly event instance within horizon, got ${yearlyCount}`);
    }
  });

  await t.step("Scenario 4: Task completionLevel and remaining time", async () => {
    console.log("\n--- Scenario 4: Task completionLevel and remaining time ---");
    const userFrank = "user:Frank" as User;
    const initResult = await concept.initializeSchedule({ owner: userFrank });
    assert(initResult.schedule, `Failed to initialize schedule: ${initResult.error}`);
    const frankSchedule = initResult.schedule;
    console.log(`Initialized schedule for ${userFrank}: ${frankSchedule}`);

    // Task 1: 50% completed, 60 minutes expected total, so 30 minutes remaining
    const task1Deadline = getRelativeDate(1, 12, 0); // Tomorrow noon
    const addTask1 = await concept.addTask({
      schedule: frankSchedule,
      name: "Partial Task",
      deadline: task1Deadline,
      expectedCompletionTime: 60,
      completionLevel: 50,
      priority: 80,
    });
    const task1Id = addTask1.task!;
    console.log(`Added Partial Task (ID: ${task1Id})`);

    // Task 2: 100% completed, should be skipped for scheduling new work, but appear as completed
    const task2Deadline = getRelativeDate(2, 12, 0); // Day after tomorrow noon
    const addTask2 = await concept.addTask({
      schedule: frankSchedule,
      name: "Completed Task",
      deadline: task2Deadline,
      expectedCompletionTime: 60,
      completionLevel: 100,
      priority: 90,
    });
    const task2Id = addTask2.task!;
    console.log(`Added Completed Task (ID: ${task2Id})`);

    console.log(`Action: generateSchedule for ${frankSchedule}`);
    const generateResult = await concept.generateSchedule({ schedule: frankSchedule });
    assert(generateResult.generatedPlan, `Expected a generated plan, but got error: ${generateResult.error}`);
    const plan = generateResult.generatedPlan;
    console.log("Output: Generated Plan (tasks only):");
    const scheduledTasks = plan.filter(item => item.type === "task");
    scheduledTasks.forEach((item, index) => {
      console.log(
        `  ${index + 1}. ${item.name} from ${item.scheduledStartTime.toLocaleString()} to ${item.scheduledEndTime.toLocaleString()}`,
      );
    });

    const scheduledPartialTask = scheduledTasks.find(t => t.originalId === task1Id);
    assert(scheduledPartialTask, "Partial Task should be scheduled");
    const durationPartialTask = (scheduledPartialTask!.scheduledEndTime.getTime() - scheduledPartialTask!.scheduledStartTime.getTime()) / (1000 * 60);
    assertEquals(durationPartialTask, 30, "Partial Task should be scheduled for its remaining 30 minutes.");

    const scheduledCompletedTask = scheduledTasks.find(t => t.originalId === task2Id);
    assert(scheduledCompletedTask, "Completed Task should appear in the plan as completed.");
    assertEquals(scheduledCompletedTask!.name, "Completed Task (Completed)");
    // For completed tasks, the scheduled start/end times might be placeholders or the deadline itself,
    // indicating no *new* work is scheduled. No duration assertion is made here for such items.

    assertEquals(scheduledTasks.length, 2, "Expected 2 tasks in the generated plan.");
  });

  await client.close();
});

// Queries specific tests
Deno.test("ScheduleGeneratorConcept - Query Actions", async (t) => {
  const [db, client] = await testDb();
  const concept = new ScheduleGeneratorConcept(db);

  const userGrace = "user:Grace" as User;
  let graceSchedule: Schedule;
  let eventG1: Event;
  let taskG1: Task;

  await t.step("_getScheduleByOwner: retrieves schedule ID for owner", async () => {
    const initResult = await concept.initializeSchedule({ owner: userGrace });
    assert(initResult.schedule, "Failed to initialize schedule");
    graceSchedule = initResult.schedule;
    console.log(`Action: _getScheduleByOwner for ${userGrace}`);
    const result = await concept._getScheduleByOwner({ owner: userGrace });
    assert(result.schedule, `Expected schedule, but got: ${result.error}`);
    assertEquals(result.schedule, graceSchedule);
    console.log(`Output: Retrieved schedule: ${result.schedule}`);

    const noScheduleResult = await concept._getScheduleByOwner({ owner: "nonExistentUser" as User });
    assert(noScheduleResult.error, "Expected error for non-existent user");
    assertEquals(noScheduleResult.error, `No schedule found for owner nonExistentUser.`);
  });

  await t.step("_getEventsForSchedule: retrieves events for a schedule", async () => {
    const startTime = getRelativeDate(0, 9, 0);
    const endTime = getRelativeDate(0, 10, 0);
    const addEventResult = await concept.addEvent({
      schedule: graceSchedule,
      name: "Event A",
      startTime,
      endTime,
      repeat: { frequency: RepeatFrequency.NONE },
    });
    eventG1 = addEventResult.event!;
    console.log(`Added event ${eventG1} to ${graceSchedule}`);

    console.log(`Action: _getEventsForSchedule for ${graceSchedule}`);
    const result = await concept._getEventsForSchedule({ schedule: graceSchedule });
    assert(result.events, `Expected events, but got: ${result.error}`);
    assertEquals(result.events.length, 1);
    assertEquals(result.events[0], eventG1);
    console.log(`Output: Retrieved events: ${result.events}`);

    const noScheduleResult = await concept._getEventsForSchedule({ schedule: "nonExistentSchedule" as Schedule });
    assert(noScheduleResult.error, "Expected error for non-existent schedule");
    assertEquals(noScheduleResult.error, `Schedule with ID nonExistentSchedule not found.`);
  });

  await t.step("_getTasksForSchedule: retrieves tasks for a schedule", async () => {
    const deadline = getRelativeDate(1, 17, 0);
    const addTaskResult = await concept.addTask({
      schedule: graceSchedule,
      name: "Task X",
      deadline,
      expectedCompletionTime: 60,
      priority: 70,
    });
    taskG1 = addTaskResult.task!;
    console.log(`Added task ${taskG1} to ${graceSchedule}`);

    console.log(`Action: _getTasksForSchedule for ${graceSchedule}`);
    const result = await concept._getTasksForSchedule({ schedule: graceSchedule });
    assert(result.tasks, `Expected tasks, but got: ${result.error}`);
    assertEquals(result.tasks.length, 1);
    assertEquals(result.tasks[0], taskG1);
    console.log(`Output: Retrieved tasks: ${result.tasks}`);

    const noScheduleResult = await concept._getTasksForSchedule({ schedule: "nonExistentSchedule" as Schedule });
    assert(noScheduleResult.error, "Expected error for non-existent schedule");
    assertEquals(noScheduleResult.error, `Schedule with ID nonExistentSchedule not found.`);
  });

  await t.step("_getEventDetails: retrieves full event details", async () => {
    console.log(`Action: _getEventDetails for ${eventG1}`);
    const result = await concept._getEventDetails({ event: eventG1 });
    assert(result.eventDetails, `Expected event details, but got: ${result.error}`);
    assertEquals(result.eventDetails._id, eventG1);
    assertEquals(result.eventDetails.name, "Event A");
    console.log(`Output: Retrieved event details: ${result.eventDetails.name}`);

    const noEventResult = await concept._getEventDetails({ event: "nonExistentEvent" as Event });
    assert(noEventResult.error, "Expected error for non-existent event");
    assertEquals(noEventResult.error, `Event with ID nonExistentEvent not found.`);
  });

  await t.step("_getTaskDetails: retrieves full task details", async () => {
    console.log(`Action: _getTaskDetails for ${taskG1}`);
    const result = await concept._getTaskDetails({ task: taskG1 });
    assert(result.taskDetails, `Expected task details, but got: ${result.error}`);
    assertEquals(result.taskDetails._id, taskG1);
    assertEquals(result.taskDetails.name, "Task X");
    console.log(`Output: Retrieved task details: ${result.taskDetails.name}`);

    const noTaskResult = await concept._getTaskDetails({ task: "nonExistentTask" as Task });
    assert(noTaskResult.error, "Expected error for non-existent task");
    assertEquals(noTaskResult.error, `Task with ID nonExistentTask not found.`);
  });

  await client.close();
});
```
