import { assert, assertEquals, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import ScheduleGeneratorConcept from "./ScheduleGeneratorConcept.ts";
import { ID } from "@utils/types.ts";

// Define enum for repetition frequency types, mirroring the implementation
enum RepeatFrequency {
  NONE = "NONE",
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
}

Deno.test("ScheduleGeneratorConcept", async (t) => {
  const [db, client] = await testDb();
  const scheduleGenerator = new ScheduleGeneratorConcept(db);

  await t.step(
    "Operational Principle: Create, populate, and generate a schedule",
    async () => {
      console.log("\n--- Testing Operational Principle ---");
      const user = "user:testPrinciple" as ID;

      // 1. Initialize a schedule for the user
      console.log(`Action: initializeSchedule for owner: ${user}`);
      const initResult = await scheduleGenerator.initializeSchedule({
        owner: user,
      });
      console.log("Result:", initResult);
      assert(!("error" in initResult), "Initialization should not fail.");
      assert(initResult.schedule, "A schedule ID should be returned.");
      const scheduleId = initResult.schedule;

      // 2. Add a recurring weekly event
      const now = new Date();
      const eventStartTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        10,
        0,
        0,
      ); // Tomorrow at 10 AM
      const eventEndTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        11,
        0,
        0,
      ); // Tomorrow at 11 AM

      console.log(
        `Action: addEvent "Weekly Standup" to schedule ${scheduleId}`,
      );
      const addEventResult = await scheduleGenerator.addEvent({
        schedule: scheduleId,
        name: "Weekly Standup",
        startTime: eventStartTime,
        endTime: eventEndTime,
        repeat: {
          frequency: RepeatFrequency.WEEKLY,
          daysOfWeek: [eventStartTime.getDay()],
        },
      });
      console.log("Result:", addEventResult);
      assert(!("error" in addEventResult), "Adding event should not fail.");
      assert(addEventResult.event, "An event ID should be returned.");

      // 3. Add a high-priority task
      const highPriorityDeadline = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 2,
        17,
        0,
        0,
      ); // Day after tomorrow 5 PM
      console.log(`Action: addTask "Finish Report" to schedule ${scheduleId}`);
      const addTask1Result = await scheduleGenerator.addTask({
        schedule: scheduleId,
        name: "Finish Report",
        deadline: highPriorityDeadline,
        expectedCompletionTime: 120, // 2 hours
        completionLevel: 0,
        priority: 90,
      });
      console.log("Result:", addTask1Result);
      assert(
        !("error" in addTask1Result),
        "Adding high-priority task should not fail.",
      );
      assert(addTask1Result.task, "A task ID should be returned.");

      // 4. Add a lower-priority task
      const lowPriorityDeadline = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 3,
        17,
        0,
        0,
      );
      console.log(`Action: addTask "Plan Project" to schedule ${scheduleId}`);
      const addTask2Result = await scheduleGenerator.addTask({
        schedule: scheduleId,
        name: "Plan Project",
        deadline: lowPriorityDeadline,
        expectedCompletionTime: 60, // 1 hour
        completionLevel: 0,
        priority: 50,
      });
      console.log("Result:", addTask2Result);
      assert(
        !("error" in addTask2Result),
        "Adding low-priority task should not fail.",
      );
      assert(addTask2Result.task, "A task ID should be returned.");

      // 5. Generate the schedule
      console.log(`Action: generateSchedule for schedule ${scheduleId}`);
      const generateResult = await scheduleGenerator.generateSchedule({
        schedule: scheduleId,
      });
      console.log("Result:", JSON.stringify(generateResult, null, 2));
      assert(
        !("error" in generateResult),
        `Schedule generation failed: ${
          "error" in generateResult ? generateResult.error : ""
        }`,
      );
      assert(
        generateResult.generatedPlan,
        "A generated plan should be returned.",
      );

      // 6. Verify the generated schedule
      const { generatedPlan } = generateResult;
      assertEquals(
        generatedPlan.length,
        3,
        "Plan should contain 1 event and 2 tasks.",
      );

      const eventInPlan = generatedPlan.find((item) =>
        item.type === "event" && item.name === "Weekly Standup"
      );
      const task1InPlan = generatedPlan.find((item) =>
        item.type === "task" && item.name === "Finish Report"
      );
      const task2InPlan = generatedPlan.find((item) =>
        item.type === "task" && item.name === "Plan Project"
      );

      assert(eventInPlan, "The weekly standup event should be in the plan.");
      assert(task1InPlan, "The high-priority task should be in the plan.");
      assert(task2InPlan, "The low-priority task should be in the plan.");

      // Check that tasks don't overlap with the event
      assert(
        task1InPlan.scheduledEndTime <= eventInPlan.scheduledStartTime ||
          task1InPlan.scheduledStartTime >= eventInPlan.scheduledEndTime,
        "High-priority task should not overlap with the event.",
      );
      console.log(
        "Principle test passed: Schedule was created, populated, and generated successfully.",
      );
    },
  );

  await t.step("Interesting Scenario 1: Edit and Delete items", async () => {
    console.log("\n--- Testing Scenario: Edit and Delete ---");
    const user = "user:testEditDelete" as ID;
    const { schedule: scheduleId } = await scheduleGenerator.initializeSchedule(
      { owner: user },
    );
    assert(scheduleId, "Schedule must be initialized");

    // Add an event and a task to be modified/deleted
    const { event: eventId } = await scheduleGenerator.addEvent({
      schedule: scheduleId,
      name: "Initial Event",
      startTime: new Date("2025-01-01T09:00:00Z"),
      endTime: new Date("2025-01-01T10:00:00Z"),
      repeat: { frequency: RepeatFrequency.NONE },
    });
    assert(eventId, "Event must be added");

    const { task: taskId } = await scheduleGenerator.addTask({
      schedule: scheduleId,
      name: "Initial Task",
      deadline: new Date("2025-01-02T17:00:00Z"),
      expectedCompletionTime: 60,
      completionLevel: 0,
      priority: 50,
    });
    assert(taskId, "Task must be added");

    // Edit the event
    console.log(`Action: editEvent ${eventId}`);
    const editEventResult = await scheduleGenerator.editEvent({
      schedule: scheduleId,
      oldEvent: eventId,
      name: "Updated Event Name",
      startTime: new Date("2025-01-01T11:00:00Z"),
      endTime: new Date("2025-01-01T12:00:00Z"),
      repeat: { frequency: RepeatFrequency.NONE },
    });
    assert(!("error" in editEventResult), "Editing event should succeed.");

    const eventDetails = await scheduleGenerator._getEventDetails({
      event: eventId,
    });
    assertEquals(eventDetails[0]?.eventDetails?.name, "Updated Event Name");
    console.log("Effect confirmed: Event name updated.");

    // Delete the task
    console.log(`Action: deleteTask ${taskId}`);
    const deleteTaskResult = await scheduleGenerator.deleteTask({
      schedule: scheduleId,
      task: taskId,
    });
    assert(!("error" in deleteTaskResult), "Deleting task should succeed.");

    const tasksAfterDelete = await scheduleGenerator._getTasksForSchedule({
      schedule: scheduleId,
    });
    assertEquals(tasksAfterDelete.length, 0);
    console.log("Effect confirmed: Task deleted from schedule.");
  });

  await t.step(
    "Interesting Scenario 2: Requirement Failures (Error Handling)",
    async () => {
      console.log("\n--- Testing Scenario: Error Handling ---");
      const user = "user:testErrors" as ID;
      const { schedule: scheduleId } = await scheduleGenerator
        .initializeSchedule({ owner: user });
      assert(scheduleId);

      // 1. Add event with start time after end time
      console.log("Action: addEvent with invalid times");
      const invalidTimeResult = await scheduleGenerator.addEvent({
        schedule: scheduleId,
        name: "Invalid Event",
        startTime: new Date("2025-01-01T12:00:00Z"),
        endTime: new Date("2025-01-01T11:00:00Z"),
        repeat: { frequency: RepeatFrequency.NONE },
      });
      assert(
        "error" in invalidTimeResult,
        "Should return an error for invalid times.",
      );
      console.log(
        "Requirement confirmed: Received error:",
        invalidTimeResult.error,
      );

      // 2. Add task with invalid priority
      console.log("Action: addTask with invalid priority");
      const invalidTaskResult = await scheduleGenerator.addTask({
        schedule: scheduleId,
        name: "Invalid Task",
        deadline: new Date("2025-01-02T17:00:00Z"),
        expectedCompletionTime: 60,
        completionLevel: 0,
        priority: 150, // Invalid
      });
      assert(
        "error" in invalidTaskResult,
        "Should return an error for invalid priority.",
      );
      console.log(
        "Requirement confirmed: Received error:",
        invalidTaskResult.error,
      );

      // 3. Delete an event that doesn't exist
      console.log("Action: deleteEvent for non-existent event");
      const nonExistentEventId = "event:fake" as ID;
      const deleteFakeResult = await scheduleGenerator.deleteEvent({
        schedule: scheduleId,
        event: nonExistentEventId,
      });
      assert(
        "error" in deleteFakeResult,
        "Should return an error for deleting a non-existent event.",
      );
      console.log(
        "Requirement confirmed: Received error:",
        deleteFakeResult.error,
      );
    },
  );

  await t.step(
    "Interesting Scenario 3: Impossible Schedule Generation",
    async () => {
      console.log("\n--- Testing Scenario: Impossible Schedule ---");
      const user = "user:testImpossible" as ID;
      const { schedule: scheduleId } = await scheduleGenerator
        .initializeSchedule({ owner: user });
      assert(scheduleId);

      // Fill the schedule with back-to-back events, leaving no time for a task
      // The implementation schedules tasks between 8 AM and 10 PM.
      const today = new Date();
      today.setDate(today.getDate() + 1); // Work with tomorrow
      const dayStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        8,
        0,
        0,
      );
      const dayEnd = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        22,
        0,
        0,
      );

      console.log(
        `Action: addEvent "All-Day Conference" to fill schedule on ${dayStart.toDateString()}`,
      );
      await scheduleGenerator.addEvent({
        schedule: scheduleId,
        name: "All-Day Conference",
        startTime: dayStart,
        endTime: dayEnd,
        repeat: { frequency: RepeatFrequency.NONE },
      });

      console.log("Action: addTask that cannot possibly fit");
      await scheduleGenerator.addTask({
        schedule: scheduleId,
        name: "Impossible Task",
        deadline: dayEnd, // Deadline is end of day
        expectedCompletionTime: 60,
        completionLevel: 0,
        priority: 100,
      });

      console.log("Action: generateSchedule (expecting failure)");
      const generateResult = await scheduleGenerator.generateSchedule({
        schedule: scheduleId,
      });
      console.log("Result:", generateResult);
      assert(
        "error" in generateResult,
        "Schedule generation should fail when there is no time.",
      );
      assertEquals(
        generateResult.error,
        "Not all tasks could be scheduled within the planning horizon or available time slots.",
      );
      console.log(
        "Requirement confirmed: Impossible schedule correctly returns an error.",
      );
    },
  );

  await t.step(
    "Interesting Scenario 4: Idempotency of Schedule Initialization",
    async () => {
      console.log("\n--- Testing Scenario: Idempotent Initialization ---");
      const user = "user:testIdempotent" as ID;

      // First initialization
      console.log(`Action: initializeSchedule for ${user} (1st time)`);
      const firstInit = await scheduleGenerator.initializeSchedule({
        owner: user,
      });
      assert(
        !("error" in firstInit) && firstInit.schedule,
        "First initialization must succeed.",
      );
      const firstScheduleId = firstInit.schedule;
      console.log("Result (1st):", firstScheduleId);

      // Second initialization for the same user
      console.log(`Action: initializeSchedule for ${user} (2nd time)`);
      const secondInit = await scheduleGenerator.initializeSchedule({
        owner: user,
      });
      assert(
        !("error" in secondInit) && secondInit.schedule,
        "Second initialization must also succeed.",
      );
      const secondScheduleId = secondInit.schedule;
      console.log("Result (2nd):", secondScheduleId);

      assertEquals(
        firstScheduleId,
        secondScheduleId,
        "Both calls to initializeSchedule for the same user should return the same schedule ID.",
      );
      console.log("Effect confirmed: Schedule initialization is idempotent.");
    },
  );

  await client.close();
});
