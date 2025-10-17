import {
  assert,
  assertEquals,
  assertExists,
  assertNotEquals,
  assertObjectMatch,
} from "jsr:@std/assert";
import { testDb } from "../../utils/database.ts"; // Adjust path as necessary
import { ID } from "../../utils/types.ts"; // Adjust path as necessary
import ScheduleGeneratorConcept from "./ScheduleGeneratorConcept.ts";

Deno.test("ScheduleGenerator Concept", async (t) => {
  const [db, client] = await testDb();
  const concept = new ScheduleGeneratorConcept(db);

  const userAlice = "user:Alice" as ID;
  const userBob = "user:Bob" as ID;

  await t.step(
    "initializeSchedule: should create a new schedule configuration",
    async () => {
      const result = await concept.initializeSchedule({ owner: userAlice });
      if ("error" in result) {
        throw new Error(`Failed to initialize schedule: ${result.error}`);
      }
      const scheduleId: ID = result.schedule;
      assertExists(scheduleId);

      const fetchedSchedule = await concept._getSchedule({ scheduleId });
      assert(fetchedSchedule, `fetchedSchedule is null`); // TODO
      if ("error" in fetchedSchedule) {
        throw new Error(`Failed to fetch schedule: ${fetchedSchedule.error}`);
      }
      assertExists(fetchedSchedule); // Ensure it's not null
      assertEquals(fetchedSchedule.owner, userAlice);
      assertEquals(fetchedSchedule.events.length, 0);
      assertEquals(fetchedSchedule.tasks.length, 0);
      assertEquals(fetchedSchedule.timestamp, 0); // Initial timestamp
    },
  );

  let aliceScheduleId: ID;
  let event1Id: ID;
  let task1Id: ID;

  await t.step(
    "addEvent: should add an event to an existing schedule configuration",
    async () => {
      const initResult = await concept.initializeSchedule({ owner: userAlice });
      if ("error" in initResult) {
        throw new Error(
          `Failed to initialize schedule for addEvent test: ${initResult.error}`,
        );
      }
      aliceScheduleId = initResult.schedule;

      const addEventResult = await concept.addEvent({
        schedule: aliceScheduleId,
        name: "Team Meeting",
        startTime: "09:00",
        endTime: "10:00",
        repeatTime: "Daily",
      });
      if ("error" in addEventResult) {
        throw new Error(`Failed to add event: ${addEventResult.error}`);
      }
      event1Id = addEventResult.event;
      assertExists(event1Id);

      const events = await concept._getEventsBySchedulePointer({
        schedulePointer: aliceScheduleId,
      });
      if ("error" in events) {
        throw new Error(`Failed to get events: ${events.error}`);
      }
      assertEquals(events.length, 1);
      assertObjectMatch(events[0], {
        _id: event1Id,
        name: "Team Meeting",
        schedulePointer: aliceScheduleId,
      });

      const scheduleAfterAdd = await concept._getSchedule({
        scheduleId: aliceScheduleId,
      });
      assert(scheduleAfterAdd, `scheduleAfterAdd is null`); // TODO
      if ("error" in scheduleAfterAdd) {
        throw new Error(
          `Failed to get schedule after add event: ${scheduleAfterAdd.error}`,
        );
      }
      assertExists(scheduleAfterAdd);
      assertEquals(scheduleAfterAdd.events, [event1Id]);

      // Test precondition: schedule does not exist
      const errorResult = await concept.addEvent({
        schedule: "nonExistentSchedule" as ID,
        name: "Failed Event",
        startTime: "09:00",
        endTime: "10:00",
        repeatTime: "None",
      }) as { error: string }; // TODO
      assertExists(errorResult.error);
      assertEquals(
        errorResult.error,
        "Schedule configuration with ID 'nonExistentSchedule' not found.",
      );
    },
  );

  await t.step(
    "addTask: should add a task to an existing schedule configuration",
    async () => {
      const addTaskResult = await concept.addTask({
        schedule: aliceScheduleId,
        name: "Prepare Presentation",
        deadline: "2023-11-15",
        expectedCompletionTime: 3, // hours
        priority: 80,
      });
      if ("error" in addTaskResult) {
        throw new Error(`Failed to add task: ${addTaskResult.error}`);
      }
      task1Id = addTaskResult.task;
      assertExists(task1Id);

      const tasks = await concept._getTasksBySchedulePointer({
        schedulePointer: aliceScheduleId,
      });
      if ("error" in tasks) {
        throw new Error(`Failed to get tasks: ${tasks.error}`);
      }
      assertEquals(tasks.length, 1);
      assertObjectMatch(tasks[0], {
        _id: task1Id,
        name: "Prepare Presentation",
        completionLevel: 0,
        schedulePointer: aliceScheduleId,
      });

      const scheduleAfterAdd = await concept._getSchedule({
        scheduleId: aliceScheduleId,
      });
      assert(scheduleAfterAdd, `scheduleAfterAdd is null`); // TODO
      if ("error" in scheduleAfterAdd) {
        throw new Error(
          `Failed to get schedule after add task: ${scheduleAfterAdd.error}`,
        );
      }
      assertExists(scheduleAfterAdd);
      assertEquals(scheduleAfterAdd.tasks, [task1Id]);

      // Test precondition: schedule does not exist
      const errorResult = await concept.addTask({
        schedule: "nonExistentSchedule" as ID,
        name: "Failed Task",
        deadline: "2023-11-15",
        expectedCompletionTime: 1,
        priority: 50,
      }) as { error: string }; // TODO
      assertExists(errorResult.error);
      assertEquals(
        errorResult.error,
        "Schedule configuration with ID 'nonExistentSchedule' not found.",
      );
    },
  );

  await t.step("editEvent: should modify an existing event", async () => {
    const editResult = await concept.editEvent({
      schedule: aliceScheduleId,
      oldEvent: event1Id,
      name: "Daily Scrum",
      startTime: "09:30",
      endTime: "10:00",
      repeatTime: "Daily",
    });
    if ("error" in editResult) {
      throw new Error(`Failed to edit event: ${editResult.error}`);
    }
    assertEquals(editResult, {});

    const events = await concept._getEventsBySchedulePointer({
      schedulePointer: aliceScheduleId,
    });
    if ("error" in events) {
      throw new Error(`Failed to get events after edit: ${events.error}`);
    }
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
    assertEquals(
      errorResult.error,
      `Event with ID 'nonExistentEvent' not found in schedule configuration '${aliceScheduleId}'.`,
    );
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
    if ("error" in editResult) {
      throw new Error(`Failed to edit task: ${editResult.error}`);
    }
    assertEquals(editResult, {});

    const tasks = await concept._getTasksBySchedulePointer({
      schedulePointer: aliceScheduleId,
    });
    if ("error" in tasks) {
      throw new Error(`Failed to get tasks after edit: ${tasks.error}`);
    }
    assertEquals(tasks.length, 1);
    assertObjectMatch(tasks[0], {
      name: "Finalize Report",
      deadline: "2023-11-10",
      completionLevel: 25,
    });

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
    assertEquals(
      errorResult.error,
      `Task with ID 'nonExistentTask' not found in schedule configuration '${aliceScheduleId}'.`,
    );
  });

  await t.step(
    "deleteEvent: should remove an event from the schedule configuration",
    async () => {
      const addEventResult = await concept.addEvent({
        schedule: aliceScheduleId,
        name: "Temp Event",
        startTime: "11:00",
        endTime: "12:00",
        repeatTime: "None",
      });
      if ("error" in addEventResult) {
        throw new Error(`Failed to add temp event: ${addEventResult.error}`);
      }
      const tempEventId = addEventResult.event;
      assertExists(tempEventId);

      const deleteResult = await concept.deleteEvent({
        schedule: aliceScheduleId,
        event: tempEventId,
      });
      if ("error" in deleteResult) {
        throw new Error(`Failed to delete event: ${deleteResult.error}`);
      }
      assertEquals(deleteResult, {});

      const events = await concept._getEventsBySchedulePointer({
        schedulePointer: aliceScheduleId,
      });
      if ("error" in events) {
        throw new Error(`Failed to get events after delete: ${events.error}`);
      }
      assertEquals(events.length, 1); // Only event1Id remains
      assertNotEquals(events[0]._id, tempEventId);

      const scheduleAfterDelete = await concept._getSchedule({
        scheduleId: aliceScheduleId,
      });
      assert(scheduleAfterDelete, `scheduleAfterDelete is null`); // TODO
      if ("error" in scheduleAfterDelete) {
        throw new Error(
          `Failed to get schedule after delete event: ${scheduleAfterDelete.error}`,
        );
      }
      assertExists(scheduleAfterDelete);
      assertEquals(scheduleAfterDelete.events.includes(tempEventId), false);

      // Test precondition: event not in schedule
      const errorResult = await concept.deleteEvent({
        schedule: aliceScheduleId,
        event: "anotherNonExistentEvent" as ID,
      });
      assertExists(errorResult.error);
      assertEquals(
        errorResult.error,
        `Event with ID 'anotherNonExistentEvent' not found in schedule configuration '${aliceScheduleId}'.`,
      );
    },
  );

  await t.step(
    "deleteTask: should remove a task from the schedule configuration",
    async () => {
      const addTaskResult = await concept.addTask({
        schedule: aliceScheduleId,
        name: "Temp Task",
        deadline: "2023-11-20",
        expectedCompletionTime: 2,
        priority: 60,
      });
      if ("error" in addTaskResult) {
        throw new Error(`Failed to add temp task: ${addTaskResult.error}`);
      }
      const tempTaskId = addTaskResult.task;
      assertExists(tempTaskId);

      const deleteResult = await concept.deleteTask({
        schedule: aliceScheduleId,
        task: tempTaskId,
      });
      if ("error" in deleteResult) {
        throw new Error(`Failed to delete task: ${deleteResult.error}`);
      }
      assertEquals(deleteResult, {});

      const tasks = await concept._getTasksBySchedulePointer({
        schedulePointer: aliceScheduleId,
      });
      if ("error" in tasks) {
        throw new Error(`Failed to get tasks after delete: ${tasks.error}`);
      }
      assertEquals(tasks.length, 1); // Only task1Id remains
      assertNotEquals(tasks[0]._id, tempTaskId);

      const scheduleAfterDelete = await concept._getSchedule({
        scheduleId: aliceScheduleId,
      });
      assert(scheduleAfterDelete, `scheduleAfterDelete is null`); // TODO
      if ("error" in scheduleAfterDelete) {
        throw new Error(
          `Failed to get schedule after delete task: ${scheduleAfterDelete.error}`,
        );
      }
      assertExists(scheduleAfterDelete);
      assertEquals(scheduleAfterDelete.tasks.includes(tempTaskId), false);

      // Test precondition: task not in schedule
      const errorResult = await concept.deleteTask({
        schedule: aliceScheduleId,
        task: "anotherNonExistentTask" as ID,
      });
      assertExists(errorResult.error);
      assertEquals(
        errorResult.error,
        `Task with ID 'anotherNonExistentTask' not found in schedule configuration '${aliceScheduleId}'.`,
      );
    },
  );

  await t.step(
    "generateSchedule: should create a new generated schedule and update configuration timestamp",
    async () => {
      const initialConfig = await concept._getSchedule({
        scheduleId: aliceScheduleId,
      });
      assertExists(initialConfig);
      if ("error" in initialConfig) {
        throw new Error(
          `Failed to get initial config for generation: ${initialConfig.error}`,
        );
      }
      const initialTimestamp = initialConfig.timestamp;

      const generateResult = await concept.generateSchedule({
        schedule: aliceScheduleId,
      });
      if ("error" in generateResult) {
        throw new Error(`Failed to generate schedule: ${generateResult.error}`);
      }
      const generatedScheduleId1 = generateResult.newSchedule;
      assertExists(generatedScheduleId1);

      const generatedSchedule1 = await concept._getSchedule({
        scheduleId: generatedScheduleId1,
      });
      assertExists(generatedSchedule1);
      if ("error" in generatedSchedule1) {
        throw new Error(
          `Failed to get generated schedule 1: ${generatedSchedule1.error}`,
        );
      }
      assertEquals(generatedSchedule1.owner, userAlice);
      assertEquals(generatedSchedule1.events.length, 1); // event1Id
      assertEquals(generatedSchedule1.tasks.length, 1); // task1Id
      assertEquals(generatedSchedule1.timestamp, initialTimestamp + 1); // Timestamp incremented

      const updatedConfig = await concept._getSchedule({
        scheduleId: aliceScheduleId,
      });
      assertExists(updatedConfig);
      if ("error" in updatedConfig) {
        throw new Error(
          `Failed to get updated config after generation: ${updatedConfig.error}`,
        );
      }
      assertEquals(updatedConfig.timestamp, initialTimestamp + 1); // Configuration's timestamp also incremented
    },
  );

  await t.step(
    "generateSchedule: should return error for impossible schedule scenario",
    async () => {
      // Add many events/tasks to trigger the "impossible" condition in the placeholder logic
      for (let i = 0; i < 15; i++) {
        const addEventResult = await concept.addEvent({
          schedule: aliceScheduleId,
          name: `Stress Event ${i}`,
          startTime: "10:00",
          endTime: "11:00",
          repeatTime: "None",
        });
        if ("error" in addEventResult) {
          throw new Error(
            `Failed to add stress event: ${addEventResult.error}`,
          );
        }
      }

      const errorResult = await concept.generateSchedule({
        schedule: aliceScheduleId,
      }) as { error: string }; // TODO
      assertExists(errorResult.error);
      assertEquals(
        errorResult.error,
        "Scheduling complexity too high; a feasible schedule cannot be generated with current configuration.",
      );
    },
  );

  await t.step(
    "Queries: _getEventsBySchedulePointer and _getTasksBySchedulePointer should work correctly",
    async () => {
      const bobScheduleResult = await concept.initializeSchedule({
        owner: userBob,
      });
      if ("error" in bobScheduleResult) {
        throw new Error(
          `Failed to initialize Bob's schedule: ${bobScheduleResult.error}`,
        );
      }
      const bobScheduleId = bobScheduleResult.schedule;
      assertExists(bobScheduleId);

      const bobEventResult = await concept.addEvent({
        schedule: bobScheduleId,
        name: "Bob's Event",
        startTime: "10:00",
        endTime: "11:00",
        repeatTime: "None",
      });
      if ("error" in bobEventResult) {
        throw new Error(`Failed to add Bob's event: ${bobEventResult.error}`);
      }
      const bobTaskResult = await concept.addTask({
        schedule: bobScheduleId,
        name: "Bob's Task",
        deadline: "2023-12-01",
        expectedCompletionTime: 1,
        priority: 50,
      });
      if ("error" in bobTaskResult) {
        throw new Error(`Failed to add Bob's task: ${bobTaskResult.error}`);
      }

      const bobEvents = await concept._getEventsBySchedulePointer({
        schedulePointer: bobScheduleId,
      });
      if ("error" in bobEvents) {
        throw new Error(`Failed to get Bob's events: ${bobEvents.error}`);
      }
      assertEquals(bobEvents.length, 1);
      assertEquals(bobEvents[0].name, "Bob's Event");

      const bobTasks = await concept._getTasksBySchedulePointer({
        schedulePointer: bobScheduleId,
      });
      if ("error" in bobTasks) {
        throw new Error(`Failed to get Bob's tasks: ${bobTasks.error}`);
      }
      assertEquals(bobTasks.length, 1);
      assertEquals(bobTasks[0].name, "Bob's Task");

      // Check Alice's schedule events/tasks (should have many due to prior "impossible" test)
      const aliceEvents = await concept._getEventsBySchedulePointer({
        schedulePointer: aliceScheduleId,
      });
      if ("error" in aliceEvents) {
        throw new Error(`Failed to get Alice's events: ${aliceEvents.error}`);
      }
      assertNotEquals(aliceEvents.length, 0); // Should be > 10

      const aliceTasks = await concept._getTasksBySchedulePointer({
        schedulePointer: aliceScheduleId,
      });
      if ("error" in aliceTasks) {
        throw new Error(`Failed to get Alice's tasks: ${aliceTasks.error}`);
      }
      assertNotEquals(aliceTasks.length, 0); // Should be 1 (task1Id was not deleted)
    },
  );

  // --- Principle Fulfillment Trace ---
  await t.step(
    "Trace: Principle fulfillment - Schedule Regeneration on updates",
    async () => {
      // 1. Initialize a schedule for a user.
      const traceUser = "user:TraceUser" as ID;
      const initResult = await concept.initializeSchedule({ owner: traceUser });
      if ("error" in initResult) {
        throw new Error(
          `Failed to initialize trace schedule: ${initResult.error}`,
        );
      }
      const configScheduleId = initResult.schedule;
      assertExists(configScheduleId);

      const initialConfig = await concept._getSchedule({
        scheduleId: configScheduleId,
      });
      assert(initialConfig, `initialConfig is null`); // TODO
      if ("error" in initialConfig) {
        throw new Error(
          `Failed to get initial trace config: ${initialConfig.error}`,
        );
      }
      assertExists(initialConfig);
      assertEquals(
        initialConfig.timestamp,
        0,
        "Initial config timestamp should be 0.",
      );

      // 2. Add a few events and tasks to this schedule configuration.
      const addEvent1Result = await concept.addEvent({
        schedule: configScheduleId,
        name: "Morning Standup",
        startTime: "09:00",
        endTime: "09:15",
        repeatTime: "Daily",
      });
      if ("error" in addEvent1Result) {
        throw new Error(
          `Failed to add trace event 1: ${addEvent1Result.error}`,
        );
      }
      const event1 = addEvent1Result.event;
      assertExists(event1);

      const addTask1Result = await concept.addTask({
        schedule: configScheduleId,
        name: "Review PRs",
        deadline: "2023-11-20",
        expectedCompletionTime: 2,
        priority: 70,
      });
      if ("error" in addTask1Result) {
        throw new Error(`Failed to add trace task 1: ${addTask1Result.error}`);
      }
      const task1 = addTask1Result.task;
      assertExists(task1);

      const currentConfigEvents = await concept._getEventsBySchedulePointer({
        schedulePointer: configScheduleId,
      });
      if ("error" in currentConfigEvents) {
        throw new Error(
          `Failed to get trace config events: ${currentConfigEvents.error}`,
        );
      }
      const currentConfigTasks = await concept._getTasksBySchedulePointer({
        schedulePointer: configScheduleId,
      });
      if ("error" in currentConfigTasks) {
        throw new Error(
          `Failed to get trace config tasks: ${currentConfigTasks.error}`,
        );
      }
      assertEquals(
        currentConfigEvents.length,
        1,
        "Config should have 1 event.",
      );
      assertEquals(currentConfigTasks.length, 1, "Config should have 1 task.");

      // 3. Call generateSchedule. Verify a new schedule is created with correct timestamp and references.
      const generateResult1 = await concept.generateSchedule({
        schedule: configScheduleId,
      });
      if ("error" in generateResult1) {
        throw new Error(
          `Failed to generate first trace schedule: ${generateResult1.error}`,
        );
      }
      const generatedScheduleId1 = generateResult1.newSchedule;
      assertExists(generatedScheduleId1);

      const generatedSchedule1 = await concept._getSchedule({
        scheduleId: generatedScheduleId1,
      });
      assertExists(
        generatedSchedule1,
        "First generated schedule should exist.",
      );
      if ("error" in generatedSchedule1) {
        throw new Error(
          `Failed to get first generated trace schedule: ${generatedSchedule1.error}`,
        );
      }
      assertEquals(
        generatedSchedule1.owner,
        traceUser,
        "Generated schedule owner mismatch.",
      );
      assertEquals(
        generatedSchedule1.events,
        [event1],
        "Generated schedule 1 events mismatch.",
      );
      assertEquals(
        generatedSchedule1.tasks,
        [task1],
        "Generated schedule 1 tasks mismatch.",
      );
      assertEquals(
        generatedSchedule1.timestamp,
        1,
        "Generated schedule 1 timestamp mismatch.",
      );

      const configAfterGen1 = await concept._getSchedule({
        scheduleId: configScheduleId,
      });
      assert(configAfterGen1, `configAfterGen1 is null`); // TODO
      if ("error" in configAfterGen1) {
        throw new Error(
          `Failed to get config after first generation: ${configAfterGen1.error}`,
        );
      }
      assertExists(configAfterGen1);
      assertEquals(
        configAfterGen1.timestamp,
        1,
        "Config timestamp should be 1 after first generation.",
      );

      // 4. Edit an existing event.
      const editEventResult = await concept.editEvent({
        schedule: configScheduleId,
        oldEvent: event1,
        name: "Morning Scrum (Updated)",
        startTime: "09:30",
        endTime: "09:45",
        repeatTime: "Daily",
      });
      if ("error" in editEventResult) {
        throw new Error(`Failed to edit trace event: ${editEventResult.error}`);
      }
      const updatedEvents = await concept._getEventsBySchedulePointer({
        schedulePointer: configScheduleId,
      });
      if ("error" in updatedEvents) {
        throw new Error(`Failed to get updated events: ${updatedEvents.error}`);
      }
      assertEquals(
        updatedEvents[0].name,
        "Morning Scrum (Updated)",
        "Event name should be updated.",
      );

      // 5. Delete a task.
      const deleteTaskResult = await concept.deleteTask({
        schedule: configScheduleId,
        task: task1,
      });
      if ("error" in deleteTaskResult) {
        throw new Error(
          `Failed to delete trace task: ${deleteTaskResult.error}`,
        );
      }
      const tasksAfterDelete = await concept._getTasksBySchedulePointer({
        schedulePointer: configScheduleId,
      });
      if ("error" in tasksAfterDelete) {
        throw new Error(
          `Failed to get tasks after delete: ${tasksAfterDelete.error}`,
        );
      }
      assertEquals(
        tasksAfterDelete.length,
        0,
        "Task should be deleted from config.",
      );

      // 6. Call generateSchedule again. Verify *another* new schedule is created with an *incremented* timestamp,
      //    reflecting the updated set of events and tasks from the configuration schedule.
      const generateResult2 = await concept.generateSchedule({
        schedule: configScheduleId,
      });
      if ("error" in generateResult2) {
        throw new Error(
          `Failed to generate second trace schedule: ${generateResult2.error}`,
        );
      }
      const generatedScheduleId2 = generateResult2.newSchedule;
      assertExists(generatedScheduleId2);
      assertNotEquals(
        generatedScheduleId1,
        generatedScheduleId2,
        "New generated schedule should have a different ID.",
      );

      const generatedSchedule2 = await concept._getSchedule({
        scheduleId: generatedScheduleId2,
      });
      assertExists(
        generatedSchedule2,
        "Second generated schedule should exist.",
      );
      if ("error" in generatedSchedule2) {
        throw new Error(
          `Failed to get second generated trace schedule: ${generatedSchedule2.error}`,
        );
      }
      assertEquals(
        generatedSchedule2.owner,
        traceUser,
        "Generated schedule 2 owner mismatch.",
      );
      assertEquals(
        generatedSchedule2.events.length,
        1,
        "Generated schedule 2 should have 1 event.",
      );
      assertEquals(
        generatedSchedule2.events[0],
        event1,
        "Generated schedule 2 event ID mismatch.",
      );
      assertEquals(
        generatedSchedule2.tasks.length,
        0,
        "Generated schedule 2 should have 0 tasks.",
      );
      assertEquals(
        generatedSchedule2.timestamp,
        2,
        "Generated schedule 2 timestamp mismatch.",
      ); // Timestamp incremented again

      const configAfterGen2 = await concept._getSchedule({
        scheduleId: configScheduleId,
      });
      assert(configAfterGen2, `configAfterGen2 is null`); // TODO
      if ("error" in configAfterGen2) {
        throw new Error(
          `Failed to get config after second generation: ${configAfterGen2.error}`,
        );
      }
      assertExists(configAfterGen2);
      assertEquals(
        configAfterGen2.timestamp,
        2,
        "Config timestamp should be 2 after second generation.",
      );

      // Verify the first generated schedule remains unchanged (immutability of generated outputs)
      const previousGeneratedSchedule = await concept._getSchedule({
        scheduleId: generatedScheduleId1,
      });
      assertExists(previousGeneratedSchedule);
      if ("error" in previousGeneratedSchedule) {
        throw new Error(
          `Failed to get previous generated schedule: ${previousGeneratedSchedule.error}`,
        );
      }
      assertEquals(
        previousGeneratedSchedule.tasks.length,
        1,
        "First generated schedule should retain original tasks.",
      );
      assertEquals(
        previousGeneratedSchedule.tasks[0],
        task1,
        "First generated schedule should retain original task ID.",
      );
      assertEquals(
        previousGeneratedSchedule.timestamp,
        1,
        "First generated schedule timestamp should remain 1.",
      );
    },
  );

  // Close the database connection after all tests are done
  await client.close();
});
