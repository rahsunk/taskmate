---
timestamp: 'Mon Nov 03 2025 06:42:58 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251103_064258.7711b975.md]]'
content_id: a48ae2131e054f899c1daa1a9537b84bfbce5411ddb482df6600613f0d870280
---

# response:

Okay, I understand the "overload issues" as mismatches between the `ScheduleGenerator` concept's query method return types and the expected `Requesting.respond` format (which should strictly follow the API spec's `Success Response Body (Query)` for each GET endpoint).

The main adjustments involve:

1. **`ScheduleGeneratorConcept.ts`**:
   * Ensuring all `_query` methods consistently return `Promise<Array<{ key: Type }>>` or `Promise<Array<{ key: Type[] }>>` as required, even for single results or "not found" cases (return `[]`).
   * Adjusting the `key` name within the returned objects to match the API spec (e.g., `event` instead of `events` for `_getEventsForSchedule` if the spec says `{"event": [...]}`).

2. **`ScheduleGenerator.sync.ts`**:
   * Updating `where` clauses to correctly extract data from these array-of-objects results. For example, if a query returns `[{ schedule: someId }]`, the sync needs to get `frames.at(0)![symbolVar][0].schedule` to access `someId`.
   * Updating `then` clauses to pass the correctly extracted and formatted data to `Requesting.respond`, matching the API spec.
   * Refining the error handling in `where` clauses to return a `{ error: string }` response to `Requesting.respond` when authorization fails or a required entity is not found, as implied by your API spec's Error Response Body.

Here are the updated files:

***

### 1. `src/concepts/ScheduleGenerator/ScheduleGeneratorConcept.ts` (Updated)

This version ensures all `_query` methods return an array of objects, and the keys within those objects (`event`, `task`, `schedule`, `scheduleDetails`, `eventDetails`, `taskDetails`) match the API specification's singular/plural naming precisely.

```typescript
// # file: src/concepts/ScheduleGenerator/ScheduleGeneratorConcept.ts (Updated for query return key names)

import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "../../utils/types.ts";
import { freshID } from "../../utils/database.ts";

// Declare collection prefix for MongoDB, using the concept name
const PREFIX = "ScheduleGenerator" + ".";

// Generic types as defined in the concept specification
type User = ID;
type Schedule = ID;
type Event = ID;
type Task = ID;
type Percent = number;

// Define enum for repetition frequency types
enum RepeatFrequency {
  NONE = "NONE",
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY",
}

// Interface for repeat configurations: specifies frequency and optionally days of the week for weekly repeats.
interface RepeatConfig {
  frequency: RepeatFrequency;
  // For WEEKLY repeats: array of numbers (0=Sunday, 1=Monday, ..., 6=Saturday)
  daysOfWeek?: number[];
}

/**
 * Interface for the 'Schedules' collection documents.
 * Corresponds to "a set of Schedules" in the concept state.
 */
interface ScheduleDoc {
  _id: Schedule;
  owner: User;
  scheduleID: number;
}

/**
 * Interface for the 'Events' collection documents.
 * Corresponds to "a set of Events" in the concept state.
 */
interface EventDoc {
  _id: Event;
  name: string;
  eventID: number;
  scheduleID: number;
  startTime: Date;
  endTime: Date;
  repeat: RepeatConfig;
}

/**
 * Interface for the 'Tasks' collection documents.
 * Corresponds to "a set of Tasks" in the concept state.
 */
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

/**
 * Interface for the 'Counters' collection documents.
 * Used to manage internal incrementing IDs (`scheduleID`, `eventID`, `taskID`).
 */
interface CounterDoc {
  _id: string;
  seq: number;
}

// --- Types for Generated Schedule Plan (for generateSchedule action) ---

/**
 * Represents a concrete scheduled time slot for an event or task.
 * Used in the output of `generateSchedule`.
 */
interface ScheduledItem {
  type: "event" | "task";
  originalId: Event | Task;
  name: string;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
}

type GeneratedSchedulePlan = ScheduledItem[];

/**
 * Represents an available time slot where tasks can be scheduled.
 */
interface FreeTimeSlot {
  start: Date;
  end: Date;
  durationMinutes: number;
}

// --- Utility Functions for Scheduling Algorithm ---

/**
 * Helper function to atomically get and increment a sequence number
 * for internal IDs within the concept's MongoDB counters collection.
 * This ensures unique, incrementing numerical IDs.
 * @param counters - The MongoDB collection for counters.
 * @param name - The name of the counter to increment (e.g., "scheduleID").
 * @returns {Promise<number>} - The next sequence number.
 */
async function getNextSequence(
  counters: Collection<CounterDoc>,
  name: string,
): Promise<number> {
  const result = await counters.findOneAndUpdate(
    { _id: name }, // Find the counter document by its name
    { $inc: { seq: 1 } }, // Increment the 'seq' field by 1
    { upsert: true, returnDocument: "after" }, // Create if not exists, return the updated document
  );
  // Access seq directly from result
  return result?.seq || 1;
}

/**
 * Helper to check for date equality (ignoring time).
 * @param d1
 * @param d2
 */
function isSameDay(d1: Date, d2: Date): boolean {
  // Ensure both parameters are proper Date objects
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Helper to get the difference in minutes between two dates.
 */
function getMinutesDifference(date1: Date, date2: Date): number {
  // Ensure both parameters are proper Date objects
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60);
}

/**
 * Subtracts a fixed time slot from a list of available time slots.
 * @param availableSlots - Current list of free time slots.
 * @param fixedSlotStart - Start time of the slot to subtract.
 * @param fixedSlotEnd - End time of the slot to subtract.
 * @returns {FreeTimeSlot[]} - New list of available time slots after subtraction.
 */
function subtractTimeSlot(
  availableSlots: FreeTimeSlot[],
  fixedSlotStart: Date,
  fixedSlotEnd: Date,
): FreeTimeSlot[] {
  const newSlots: FreeTimeSlot[] = [];
  for (const available of availableSlots) {
    // Case 1: Fixed slot completely outside available slot
    if (fixedSlotEnd <= available.start || fixedSlotStart >= available.end) {
      newSlots.push(available);
      continue;
    }

    // Case 2: Fixed slot completely covers available slot
    if (fixedSlotStart <= available.start && fixedSlotEnd >= available.end) {
      continue; // Available slot is completely removed
    }

    // Case 3: Fixed slot partially overlaps, leaving a segment before
    if (fixedSlotStart > available.start && fixedSlotStart < available.end) {
      newSlots.push({
        start: available.start,
        end: fixedSlotStart,
        durationMinutes: getMinutesDifference(fixedSlotStart, available.start),
      });
    }

    // Case 4: Fixed slot partially overlaps, leaving a segment after
    if (fixedSlotEnd > available.start && fixedSlotEnd < available.end) {
      newSlots.push({
        start: fixedSlotEnd,
        end: available.end,
        durationMinutes: getMinutesDifference(available.end, fixedSlotEnd),
      });
    }
  }
  return newSlots;
}

/**
 * ScheduleGeneratorConcept class implementation.
 *
 * purpose: manages events and tasks for users to automatically generate a schedule that meets their needs.
 *
 * principle: Given a set of events and tasks, an optimal schedule for the user is created.
 * When events and tasks are updated and removed, the schedule is regenerated.
 */
export default class ScheduleGeneratorConcept {
  // MongoDB collections, initialized with a concept-specific prefix
  private schedules: Collection<ScheduleDoc>;
  private events: Collection<EventDoc>;
  private tasks: Collection<TaskDoc>;
  private counters: Collection<CounterDoc>; // Dedicated collection for sequence counters

  // --- Constants for the scheduling algorithm ---
  private readonly PLANNING_HORIZON_DAYS = 7; // Generate schedule for the next 7 days
  // --- Adjusted task scheduling hours (8 AM to 10 PM) ---
  private readonly DAILY_TASK_START_HOUR = 8; // Tasks can be scheduled from 8 AM
  private readonly DAILY_TASK_END_HOUR = 22; // Tasks can be scheduled until 10 PM

  constructor(private readonly db: Db) {
    this.schedules = this.db.collection(PREFIX + "schedules");
    this.events = this.db.collection(PREFIX + "events");
    this.tasks = this.db.collection(PREFIX + "tasks");
    this.counters = this.db.collection(PREFIX + "counters");
  }

  /**
   * initializeSchedule (owner: User): (schedule: Schedule)
   *
   * requires: owner exists (this concept treats `User` as a generic ID and cannot
   *           verify its existence; a higher-level synchronization is expected
   *           to provide a valid `User` ID).
   *
   * effects: Gets or creates a schedule for the owner. Each user can only have one schedule.
   *          If the user already has a schedule, returns the existing one.
   *          Otherwise, creates an empty schedule document and assigns an incrementing `scheduleID`.
   *
   * @param {Object} params - The action parameters.
   * @param {User} params.owner - The ID of the user for whom to get/create the schedule.
   * @returns {Promise<{schedule?: Schedule; error?: string}>} - The ID of the schedule document (existing or newly created) or an error message.
   */
  async initializeSchedule({ owner }: { owner: User }): Promise<{
    schedule?: Schedule;
    error?: string;
  }> {
    // Check if the user already has a schedule
    const existingSchedule = await this.schedules.findOne({ owner });
    if (existingSchedule) {
      return { schedule: existingSchedule._id };
    }

    // Create new schedule if none exists
    const scheduleID = await getNextSequence(
      this.counters,
      "scheduleID_counter",
    );
    const newScheduleId = freshID(); // Generate a unique MongoDB _id

    const newScheduleDoc: ScheduleDoc = {
      _id: newScheduleId,
      owner,
      scheduleID,
    };

    try {
      await this.schedules.insertOne(newScheduleDoc);
      return { schedule: newScheduleDoc._id };
    } catch (e: any) {
      console.error("Error in initializeSchedule:", e);
      return { error: `Failed to initialize schedule: ${e.message}` };
    }
  }

  /**
   * addEvent (schedule: Schedule, name: String, startTime: Date, endTime: Date, repeat: RepeatConfig): (event: Event)
   *
   * requires: The `schedule` identified by `schedule` ID must exist.
   *
   * effects: Creates and returns a new event document. This event is linked to the specified
   *          schedule via its `scheduleID`. An internal `eventID` is incremented and assigned.
   *          `startTime` and `endTime` refer to both date and time.
   *
   * @param {Object} params - The action parameters.
   * @param {Schedule} params.schedule - The ID of the schedule to add the event to.
   * @param {string} params.name - The descriptive name of the event.
   * @param {Date} params.startTime - The start date and time of the event.
   * @param {Date} params.endTime - The end date and time of the event.
   * @param {RepeatConfig} params.repeat - The repetition configuration for the event.
   * @returns {Promise<{event?: Event; error?: string}>} - The ID of the newly created event document or an error message.
   */
  async addEvent({
    schedule,
    name,
    startTime,
    endTime,
    repeat,
  }: {
    schedule: Schedule;
    name: string;
    startTime: Date;
    endTime: Date;
    repeat: RepeatConfig;
  }): Promise<{ event?: Event; error?: string }> {
    // Precondition: check if the schedule exists
    const existingSchedule = await this.schedules.findOne({ _id: schedule });
    if (!existingSchedule) {
      return { error: `Schedule with ID ${schedule} not found.` };
    }

    // Basic validation for dates
    if (startTime >= endTime) {
      return { error: "Event start time must be before end time." };
    }

    // Validate repeat configuration
    if (
      repeat.frequency === RepeatFrequency.WEEKLY &&
      (!repeat.daysOfWeek || repeat.daysOfWeek.length === 0)
    ) {
      return {
        error:
          "Weekly repeat events must specify at least one day of the week (0=Sunday, 6=Saturday).",
      };
    }

    const eventID = await getNextSequence(this.counters, "eventID_counter");
    const newEventId = freshID();

    const newEventDoc: EventDoc = {
      _id: newEventId,
      name,
      eventID,
      scheduleID: existingSchedule.scheduleID, // Link event to the internal scheduleID
      startTime,
      endTime,
      repeat,
    };

    try {
      await this.events.insertOne(newEventDoc);
      return { event: newEventDoc._id };
    } catch (e: any) {
      console.error("Error in addEvent:", e);
      return { error: `Failed to add event: ${e.message}` };
    }
  }

  /**
   * editEvent (schedule: Schedule, oldEvent: Event, name: String, startTime: Date, endTime: Date, repeat: RepeatConfig)
   *
   * requires: The `oldEvent` identified by `oldEvent` ID must exist and be associated
   *           with the `schedule` identified by `schedule` ID.
   *
   * effects: Modifies the attributes of the specified event document.
   *
   * @param {Object} params - The action parameters.
   * @param {Schedule} params.schedule - The ID of the schedule containing the event.
   * @param {Event} params.oldEvent - The ID of the event document to modify.
   * @param {string} params.name - The new name for the event.
   * @param {Date} params.startTime - The new start date and time.
   * @param {Date} params.endTime - The new end date and time.
   * @param {RepeatConfig} params.repeat - The new repetition configuration.
   * @returns {Promise<Empty | {error: string}>} - An empty object on successful modification or an error message.
   */
  async editEvent({
    schedule,
    oldEvent,
    name,
    startTime,
    endTime,
    repeat,
  }: {
    schedule: Schedule;
    oldEvent: Event;
    name: string;
    startTime: Date;
    endTime: Date;
    repeat: RepeatConfig;
  }): Promise<Empty | { error: string }> {
    // Precondition: check if schedule exists
    const existingSchedule = await this.schedules.findOne({ _id: schedule });
    if (!existingSchedule) {
      return { error: `Schedule with ID ${schedule} not found.` };
    }

    // Precondition: check if oldEvent exists and is associated with the schedule
    const eventToUpdate = await this.events.findOne({
      _id: oldEvent,
      scheduleID: existingSchedule.scheduleID,
    });
    if (!eventToUpdate) {
      return {
        error:
          `Event with ID ${oldEvent} not found or not associated with schedule ${schedule}.`,
      };
    }

    // Basic validation for dates
    if (startTime >= endTime) {
      return { error: "Event start time must be before end time." };
    }

    // Validate repeat configuration
    if (
      repeat.frequency === RepeatFrequency.WEEKLY &&
      (!repeat.daysOfWeek || repeat.daysOfWeek.length === 0)
    ) {
      return {
        error:
          "Weekly repeat events must specify at least one day of the week (0=Sunday, 6=Saturday).",
      };
    }

    try {
      await this.events.updateOne(
        { _id: oldEvent },
        { $set: { name, startTime, endTime, repeat } },
      );
      return {};
    } catch (e: any) {
      console.error("Error in editEvent:", e);
      return { error: `Failed to edit event: ${e.message}` };
    }
  }

  /**
   * deleteEvent (schedule: Schedule, event: Event)
   *
   * requires: The `event` identified by `event` ID must exist and be associated
   *           with the `schedule` identified by `schedule` ID.
   *
   * effects: Deletes the specified event document.
   *
   * @param {Object} params - The action parameters.
   * @param {Schedule} params.schedule - The ID of the schedule containing the event.
   * @param {Event} params.event - The ID of the event document to delete.
   * @returns {Promise<Empty | {error: string}>} - An empty object on successful deletion or an error message.
   */
  async deleteEvent({
    schedule,
    event,
  }: {
    schedule: Schedule;
    event: Event;
  }): Promise<Empty | { error: string }> {
    // Precondition: check if schedule exists
    const existingSchedule = await this.schedules.findOne({ _id: schedule });
    if (!existingSchedule) {
      return { error: `Schedule with ID ${schedule} not found.` };
    }

    // Precondition: check if event exists and is associated with the schedule
    const eventToDelete = await this.events.findOne({
      _id: event,
      scheduleID: existingSchedule.scheduleID,
    });
    if (!eventToDelete) {
      return {
        error:
          `Event with ID ${event} not found or not associated with schedule ${schedule}.`,
      };
    }

    try {
      await this.events.deleteOne({ _id: event });
      return {};
    } catch (e: any) {
      console.error("Error in deleteEvent:", e);
      return { error: `Failed to delete event: ${e.message}` };
    }
  }

  /**
   * addTask (schedule: Schedule, name: String, deadline: Date, expectedCompletionTime: Number, completionLevel: Percent, priority: Percent): (task: Task)
   *
   * requires: The `schedule` identified by `schedule` ID must exist.
   * requires: `completionLevel` is between 0 and 100 (inclusive)
   *
   * effects: Creates and returns a new task document, linked to the specified schedule.
   *          Sets initial `completionLevel` to the provided value. An internal `taskID` is incremented and assigned.
   *
   * @param {Object} params - The action parameters.
   * @param {Schedule} params.schedule - The ID of the schedule to add the task to.
   * @param {string} params.name - The descriptive name of the task.
   * @param {Date} params.deadline - The deadline date for the task.
   * @param {number} params.expectedCompletionTime - The estimated time to complete the task (in minutes).
   * @param {Percent} params.completionLevel - The initial completion percentage of the task (0-100%).
   * @param {Percent} params.priority - The priority level of the task (0-100%).
   * @returns {Promise<{task?: Task; error?: string}>} - The ID of the newly created task document or an error message.
   */
  async addTask({
    schedule,
    name,
    deadline,
    expectedCompletionTime,
    completionLevel,
    priority,
  }: {
    schedule: Schedule;
    name: string;
    deadline: Date;
    expectedCompletionTime: number;
    completionLevel: Percent;
    priority: Percent;
  }): Promise<{ task?: Task; error?: string }> {
    // Precondition: check if schedule exists
    const existingSchedule = await this.schedules.findOne({ _id: schedule });
    if (!existingSchedule) {
      return { error: `Schedule with ID ${schedule} not found.` };
    }

    if (expectedCompletionTime <= 0) {
      return { error: "Expected completion time must be positive." };
    }
    if (priority < 0 || priority > 100) {
      return { error: "Priority must be between 0 and 100." };
    }
    // Added validation for completionLevel
    if (completionLevel < 0 || completionLevel > 100) {
      return { error: "Completion level must be between 0 and 100." };
    }

    const taskID = await getNextSequence(this.counters, "taskID_counter");
    const newTaskId = freshID();

    const newTaskDoc: TaskDoc = {
      _id: newTaskId,
      name,
      taskID,
      scheduleID: existingSchedule.scheduleID, // Link task to the internal scheduleID
      deadline,
      expectedCompletionTime,
      completionLevel: completionLevel, // Use the provided completionLevel
      priority,
    };

    try {
      await this.tasks.insertOne(newTaskDoc);
      return { task: newTaskDoc._id };
    } catch (e: any) {
      console.error("Error in addTask:", e);
      return { error: `Failed to add task: ${e.message}` };
    }
  }

  /**
   * editTask (schedule: Schedule, oldTask: Task, name: String, deadline: Date, expectedCompletionTime: Number, completionLevel: Percent priority: Percent)
   *
   * requires: The `oldTask` identified by `oldTask` ID must exist and be associated
   *           with the `schedule` identified by `schedule` ID.
   *
   * effects: Modifies the attributes of the specified task document.
   *
   * @param {Object} params - The action parameters.
   * @param {Schedule} params.schedule - The ID of the schedule containing the task.
   * @param {Task} params.oldTask - The ID of the task document to modify.
   * @param {string} params.name - The new name for the task.
   * @param {Date} params.deadline - The new deadline date.
   * @param {number} params.expectedCompletionTime - The new estimated completion time (in minutes).
   * @param {Percent} params.completionLevel - The new completion percentage.
   * @param {Percent} params.priority - The new priority level.
   * @returns {Promise<Empty | {error: string}>} - An empty object on successful modification or an error message.
   */
  async editTask({
    schedule,
    oldTask,
    name,
    deadline,
    expectedCompletionTime,
    completionLevel,
    priority,
  }: {
    schedule: Schedule;
    oldTask: Task;
    name: string;
    deadline: Date;
    expectedCompletionTime: number;
    completionLevel: Percent;
    priority: Percent;
  }): Promise<Empty | { error: string }> {
    // Precondition: check if schedule exists
    const existingSchedule = await this.schedules.findOne({ _id: schedule });
    if (!existingSchedule) {
      return { error: `Schedule with ID ${schedule} not found.` };
    }

    // Precondition: check if oldTask exists and is associated with the schedule
    const taskToUpdate = await this.tasks.findOne({
      _id: oldTask,
      scheduleID: existingSchedule.scheduleID,
    });
    if (!taskToUpdate) {
      return {
        error:
          `Task with ID ${oldTask} not found or not associated with schedule ${schedule}.`,
      };
    }

    if (expectedCompletionTime <= 0) {
      return { error: "Expected completion time must be positive." };
    }
    if (priority < 0 || priority > 100) {
      return { error: "Priority must be between 0 and 100." };
    }
    if (completionLevel < 0 || completionLevel > 100) {
      return { error: "Completion level must be between 0 and 100." };
    }

    try {
      await this.tasks.updateOne(
        { _id: oldTask },
        {
          $set: {
            name,
            deadline,
            expectedCompletionTime,
            completionLevel,
            priority,
          },
        },
      );
      return {};
    } catch (e: any) {
      console.error("Error in editTask:", e);
      return { error: `Failed to edit task: ${e.message}` };
    }
  }

  /**
   * deleteTask (schedule: Schedule, task: Task)
   *
   * requires: The `task` identified by `task` ID must exist and be associated
   *           with the `schedule` identified by `schedule` ID.
   *
   * effects: Deletes the specified task document.
   *
   * @param {Object} params - The action parameters.
   * @param {Schedule} params.schedule - The ID of the schedule containing the task.
   * @param {Task} params.task - The ID of the task document to delete.
   * @returns {Promise<Empty | {error: string}>} - An empty object on successful deletion or an error message.
   */
  async deleteTask({
    schedule,
    task,
  }: {
    schedule: Schedule;
    task: Task;
  }): Promise<Empty | { error: string }> {
    const existingSchedule = await this.schedules.findOne({ _id: schedule });
    if (!existingSchedule) {
      return { error: `Schedule with ID ${schedule} not found.` };
    }

    const taskToDelete = await this.tasks.findOne({
      _id: task,
      scheduleID: existingSchedule.scheduleID,
    });
    if (!taskToDelete) {
      return {
        error:
          `Task with ID ${task} not found or not associated with schedule ${schedule}.`,
      };
    }

    try {
      await this.tasks.deleteOne({ _id: task });
      return {};
    } catch (e: any) {
      console.error("Error in deleteTask:", e);
      return { error: `Failed to delete task: ${e.message}` };
    }
  }

  /**
   * generateSchedule (schedule: Schedule): (scheduleId: Schedule, generatedPlan: GeneratedSchedulePlan | error: Error)
   *
   * requires: The `schedule` identified by `schedule` ID must exist.
   *
   * effects: Retrieves all events and tasks associated with the given schedule.
   *          It then instantiates repeating events for a planning horizon and
   *          prioritizes and schedules tasks into available time slots.
   *          Returns a `GeneratedSchedulePlan` containing concrete scheduled items.
   *          If the generation process encounters an unresolvable conflict (e.g., tasks
   *          cannot be scheduled), an error is returned.
   *
   * @param {Object} params - The action parameters.
   * @param {Schedule} params.schedule - The ID of the schedule to generate.
   * @returns {Promise<{scheduleId?: Schedule; generatedPlan?: GeneratedSchedulePlan; error?: string}>}
   *   - The ID of the processed schedule, the generated plan, or an error message.
   */
  async generateSchedule({ schedule }: { schedule: Schedule }): Promise<{
    scheduleId?: Schedule;
    generatedPlan?: GeneratedSchedulePlan;
    error?: string;
  }> {
    const existingSchedule = await this.schedules.findOne({ _id: schedule });
    if (!existingSchedule) {
      return { error: `Schedule with ID ${schedule} not found.` };
    }

    const scheduleInternalID = existingSchedule.scheduleID;

    const events = await this.events
      .find({ scheduleID: scheduleInternalID })
      .toArray();
    const tasks = await this.tasks
      .find({ scheduleID: scheduleInternalID })
      .toArray();

    const generatedPlan: GeneratedSchedulePlan = [];
    let freeTimeSlots: FreeTimeSlot[] = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const planningEndDate = new Date();
    planningEndDate.setDate(today.getDate() + this.PLANNING_HORIZON_DAYS);
    planningEndDate.setHours(23, 59, 59, 999);

    for (
      let d = new Date(today);
      d <= planningEndDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dayStart = new Date(d);
      dayStart.setHours(this.DAILY_TASK_START_HOUR, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(this.DAILY_TASK_END_HOUR, 0, 0, 0);

      if (dayStart < dayEnd) {
        freeTimeSlots.push({
          start: dayStart,
          end: dayEnd,
          durationMinutes: getMinutesDifference(dayStart, dayEnd),
        });
      }

      for (const event of events) {
        let shouldSchedule = false;
        const eventStartTime = new Date(event.startTime);
        const eventEndTime = new Date(event.endTime);
        const eventDate = eventStartTime;

        switch (event.repeat.frequency) {
          case RepeatFrequency.NONE:
            if (isSameDay(d, eventDate)) {
              shouldSchedule = true;
            }
            break;
          case RepeatFrequency.DAILY:
            shouldSchedule = true;
            break;
          case RepeatFrequency.WEEKLY:
            if (event.repeat.daysOfWeek?.includes(d.getDay())) {
              shouldSchedule = true;
            }
            break;
            case RepeatFrequency.MONTHLY:
            if (d.getDate() === eventDate.getDate()) {
              shouldSchedule = true;
            }
            break;
            case RepeatFrequency.YEARLY:
            if (d.getDate() === eventDate.getDate() && d.getMonth() === eventDate.getMonth()) {
              shouldSchedule = true;
            }
            break;
        }

        if (shouldSchedule) {
          const scheduledEventStartTime = new Date(d);
          scheduledEventStartTime.setHours(
            eventStartTime.getHours(),
            eventStartTime.getMinutes(),
            eventStartTime.getSeconds(),
            eventStartTime.getMilliseconds(),
          );
          const scheduledEventEndTime = new Date(d);
          scheduledEventEndTime.setHours(
            eventEndTime.getHours(),
            eventEndTime.getMinutes(),
            eventEndTime.getSeconds(),
            eventEndTime.getMilliseconds(),
          );

          if (
            scheduledEventStartTime < scheduledEventEndTime &&
            scheduledEventEndTime > new Date()
          ) {
            generatedPlan.push({
              type: "event",
              originalId: event._id,
              name: event.name,
              scheduledStartTime: scheduledEventStartTime,
              scheduledEndTime: scheduledEventEndTime,
            });
            freeTimeSlots = subtractTimeSlot(
              freeTimeSlots,
              scheduledEventStartTime,
              scheduledEventEndTime,
            );
          }
        }
      }
    }

    freeTimeSlots.sort((a, b) => a.start.getTime() - b.start.getTime());
    const mergedFreeTimeSlots: FreeTimeSlot[] = [];
    if (freeTimeSlots.length > 0) {
      let currentMerged = { ...freeTimeSlots[0] };
      for (let i = 1; i < freeTimeSlots.length; i++) {
        const next = freeTimeSlots[i];
        if (currentMerged.end.getTime() + 60 * 1000 >= next.start.getTime()) {
          currentMerged.end = new Date(
            Math.max(currentMerged.end.getTime(), next.end.getTime()),
          );
          currentMerged.durationMinutes = getMinutesDifference(
            currentMerged.start,
            currentMerged.end,
          );
        } else {
          mergedFreeTimeSlots.push(currentMerged);
          currentMerged = { ...next };
        }
      }
      mergedFreeTimeSlots.push(currentMerged);
    }
    freeTimeSlots = mergedFreeTimeSlots;

    const now = new Date();
    freeTimeSlots = freeTimeSlots.filter((slot) => slot.end > now);
    freeTimeSlots = freeTimeSlots.map((slot) => ({
      ...slot,
      start: slot.start < now ? now : slot.start,
      durationMinutes: slot.start < now
        ? getMinutesDifference(now, slot.end)
        : slot.durationMinutes,
    }));
    freeTimeSlots = freeTimeSlots.filter((slot) => slot.durationMinutes > 0);

    tasks.sort((a, b) => {
      const aDeadline = new Date(a.deadline);
      const bDeadline = new Date(b.deadline);

      const deadlineDiff = aDeadline.getTime() - bDeadline.getTime();
      if (deadlineDiff !== 0) return deadlineDiff;

      const priorityDiff = b.priority - a.priority;
      if (priorityDiff !== 0) return priorityDiff;

      const ectDiff = b.expectedCompletionTime - a.expectedCompletionTime;
      if (ectDiff !== 0) return ectDiff;

      const completionDiff = b.completionLevel - a.completionLevel;
      if (completionDiff !== 0) return completionDiff;

      return 0;
    });

    const unscheduledTasks: TaskDoc[] = [];

    for (const task of tasks) {
      let taskScheduled = false;
      const remainingTaskDuration = task.expectedCompletionTime *
        (1 - task.completionLevel / 100);

      const taskDeadline = new Date(task.deadline);

      if (remainingTaskDuration <= 0) {
        generatedPlan.push({
          type: "task",
          originalId: task._id,
          name: `${task.name} (Completed)`,
          scheduledStartTime: taskDeadline,
          scheduledEndTime: taskDeadline,
        });
        continue;
      }

      for (let i = 0; i < freeTimeSlots.length; i++) {
        const slot = freeTimeSlots[i];

        if (slot.start >= taskDeadline || slot.end <= now) {
          continue;
        }

        const effectiveSlotEnd = slot.end < taskDeadline
          ? slot.end
          : taskDeadline;
        const availableDurationInSlot = getMinutesDifference(
          slot.start,
          effectiveSlotEnd,
        );

        if (availableDurationInSlot >= remainingTaskDuration) {
          const taskScheduledStartTime = new Date(slot.start);
          const taskScheduledEndTime = new Date(
            taskScheduledStartTime.getTime() +
              remainingTaskDuration * 60 * 1000,
          );

          generatedPlan.push({
            type: "task",
            originalId: task._id,
            name: task.name,
            scheduledStartTime: taskScheduledStartTime,
            scheduledEndTime: taskScheduledEndTime,
          });

          freeTimeSlots = subtractTimeSlot(
            freeTimeSlots,
            taskScheduledStartTime,
            taskScheduledEndTime,
          );
          freeTimeSlots.sort((a, b) => a.start.getTime() - b.start.getTime());

          taskScheduled = true;
          break;
        }
      }

      if (!taskScheduled) {
        unscheduledTasks.push(task);
      }
    }

    if (unscheduledTasks.length > 0) {
      console.warn(
        `Warning: Could not fully schedule ${unscheduledTasks.length} tasks for schedule ${schedule}:`,
      );
      unscheduledTasks.forEach((task) =>
        console.warn(
          `  - ${task.name} (ID: ${task._id}, Deadline: ${
            new Date(task.deadline).toLocaleDateString()
          })`,
        )
      );
      return {
        error:
          "Not all tasks could be scheduled within the planning horizon or available time slots.",
      };
    }

    generatedPlan.sort(
      (a, b) => a.scheduledStartTime.getTime() - b.scheduledStartTime.getTime(),
    );

    return { scheduleId: existingSchedule._id, generatedPlan };
  }

  // --- Concept Queries (methods prefixed with '_' as per convention) ---

  /**
   * _getScheduleByOwner (owner: User): (schedule: Schedule)[]
   *
   * effects: Retrieves the ID of the schedule document associated with a given user owner.
   * Returns an array containing an object with the schedule ID if found, otherwise an empty array.
   *
   * @param {Object} params - The query parameters.
   * @param {User} params.owner - The ID of the owner user.
   * @returns {Promise<{schedule: Schedule}[]>} - An array containing an object with the schedule ID or an empty array.
   */
  async _getScheduleByOwner({ owner }: { owner: User }): Promise<{
    schedule: Schedule;
  }[]> {
    const scheduleDoc = await this.schedules.findOne({ owner });
    if (!scheduleDoc) {
      return [];
    }
    return [{ schedule: scheduleDoc._id }];
  }

  /**
   * _getEventsForSchedule (schedule: Schedule): (event: Event[])[]
   *
   * effects: Retrieves an array of Event IDs that are linked to the specified schedule.
   * Returns an array where the first element is an object containing an array of Event IDs.
   *
   * @param {Object} params - The query parameters.
   * @param {Schedule} params.schedule - The ID of the schedule to retrieve events for.
   * @returns {Promise<{event: Event[]}[]>} - An array containing an object with an array of event IDs, or an empty array.
   */
  async _getEventsForSchedule({ schedule }: { schedule: Schedule }): Promise<{
    event: Event[];
  }[]> {
    const existingSchedule = await this.schedules.findOne({ _id: schedule });
    if (!existingSchedule) {
      return [];
    }
    const eventDocs = await this.events
      .find({ scheduleID: existingSchedule.scheduleID })
      .project({ _id: 1 })
      .toArray();
    return [{ event: eventDocs.map((doc) => doc._id) }];
  }

  /**
   * _getTasksForSchedule (schedule: Schedule): (task: Task[])[]
   *
   * effects: Retrieves an array of Task IDs that are linked to the specified schedule.
   * Returns an array where the first element is an object containing an array of Task IDs.
   *
   * @param {Object} params - The query parameters.
   * @param {Schedule} params.schedule - The ID of the schedule to retrieve tasks for.
   * @returns {Promise<{task: Task[]}[]>} - An array containing an object with an array of task IDs, or an empty array.
   */
  async _getTasksForSchedule({ schedule }: { schedule: Schedule }): Promise<{
    task: Task[];
  }[]> {
    const existingSchedule = await this.schedules.findOne({ _id: schedule });
    if (!existingSchedule) {
      return [];
    }
    const taskDocs = await this.tasks
      .find({ scheduleID: existingSchedule.scheduleID })
      .project({ _id: 1 })
      .toArray();
    return [{ task: taskDocs.map((doc) => doc._id) }];
  }

  /**
   * _getEventDetails (event: Event): (eventDetails: EventDoc)[]
   *
   * effects: Retrieves the full document details for a specific event.
   * Returns an array containing an object with the event document, or an empty array if not found.
   *
   * @param {Object} params - The query parameters.
   * @param {Event} params.event - The ID of the event to retrieve details for.
   * @returns {Promise<{eventDetails: EventDoc}[]>} - An array containing an object with the event document or an empty array.
   */
  async _getEventDetails({ event }: { event: Event }): Promise<{
    eventDetails: EventDoc;
  }[]> {
    const eventDoc = await this.events.findOne({ _id: event });
    if (!eventDoc) {
      return [];
    }
    return [{ eventDetails: eventDoc }];
  }

  /**
   * _getTaskDetails (task: Task): (taskDetails: TaskDoc)[]
   *
   * effects: Retrieves the full document details for a specific task.
   * Returns an array containing an object with the task document, or an empty array if not found.
   *
   * @param {Object} params - The query parameters.
   * @param {Task} params.task - The ID of the task to retrieve details for.
   * @returns {Promise<{taskDetails: TaskDoc}[]>} - An array containing an object with the task document or an empty array.
   */
  async _getTaskDetails({ task }: { task: Task }): Promise<{
    taskDetails: TaskDoc;
  }[]> {
    const taskDoc = await this.tasks.findOne({ _id: task });
    if (!taskDoc) {
      return [];
    }
    return [{ taskDetails: taskDoc }];
  }

  /**
   * _getAllSchedules (): (schedule: ScheduleDoc[])[]
   *
   * effects: Returns an array where the first element is an object containing an array of all `ScheduleDoc` objects.
   *
   * @returns {Promise<{schedule: ScheduleDoc[]}[]>} - An array containing an object with an array of all schedule documents, or an empty array.
   */
  async _getAllSchedules(): Promise<{
    schedule: ScheduleDoc[];
  }[]> {
    try {
      const scheduleDocs = await this.schedules.find({}).toArray();
      // Return as an array of objects, where the first object has a 'schedule' key containing an array of docs
      return [{ schedule: scheduleDocs }];
    } catch (e: any) {
      console.error("Error in _getAllSchedules:", e);
      // In case of error, return an empty array as per query convention
      return [];
    }
  }

  /**
   * _getScheduleDetails (schedule: Schedule): (scheduleDetails: ScheduleDoc)[]
   *
   * effects: Retrieves a specific schedule document by its ID.
   * Returns an array containing an object with the `ScheduleDoc` object matching the provided ID, or an empty array if not found.
   *
   * @param {Object} params - The query parameters.
   * @param {Schedule} params.schedule - The ID of the schedule to retrieve details for.
   * @returns {Promise<{scheduleDetails: ScheduleDoc}[]>} - An array containing an object with the ScheduleDoc object or an empty array.
   */
  async _getScheduleDetails({ schedule }: { schedule: Schedule }): Promise<{
    scheduleDetails: ScheduleDoc;
  }[]> {
    try {
      const scheduleDoc = await this.schedules.findOne({ _id: schedule });
      if (!scheduleDoc) {
        return [];
      }
      return [{ scheduleDetails: scheduleDoc }];
    } catch (e: any) {
      console.error("Error in _getScheduleDetails:", e);
      return [];
    }
  }

  /**
   * _getAllEvents (): (event: EventDoc[])[]
   *
   * effects: Returns an array where the first element is an object containing an array of all `EventDoc` objects.
   *
   * @returns {Promise<{event: EventDoc[]}[]>} - An array containing an object with an array of all event documents, or an empty array.
   */
  async _getAllEvents(): Promise<{
    event: EventDoc[];
  }[]> {
    try {
      const eventDocs = await this.events.find({}).toArray();
      return [{ event: eventDocs }];
    } catch (e: any) {
      console.error("Error in _getAllEvents:", e);
      return [];
    }
  }

  /**
   * _getAllTasks (): (task: TaskDoc[])[]
   *
   * effects: Returns an array where the first element is an object containing an array of all `TaskDoc` objects.
   *
   * @returns {Promise<{task: TaskDoc[]}[]>} - An array containing an object with an array of all task documents, or an empty array.
   */
  async _getAllTasks(): Promise<{
    task: TaskDoc[];
  }[]> {
    try {
      const taskDocs = await this.tasks.find({}).toArray();
      return [{ task: taskDocs }];
    } catch (e: any) {
      console.error("Error in _getAllTasks:", e);
      return [];
    }
  }
}
```

***

### 2. `src/syncs/ScheduleGenerator.sync.ts` (Updated)

This version of the sync file is updated to correctly handle the new query return types from `ScheduleGeneratorConcept.ts` and aligns the `then` clause outputs with the specified API response formats. Error responses are explicitly returned as `{ error: string }` within a new `Frames` object when authentication/authorization fails, ensuring a consistent error handling pattern.

```typescript
// # file: src/syncs/ScheduleGenerator.sync.ts (Updated for query return key names and error handling)

import { actions, Frames, Sync } from "@engine";
import { Requesting, Sessioning, ScheduleGenerator } from "@concepts";
import { ID } from "../../utils/types.ts"; // Assuming @utils/types.ts provides ID

// --- Helper Functions for Authentication and Authorization ---

/**
 * Helper for session validation. Ensures an active session exists.
 * @param frames The current frames in the synchronization.
 * @param sessionVar The symbol representing the session ID from the request.
 * @param activeUserVar The symbol to which the authenticated user's ID will be bound.
 * @returns Filtered frames with the active user bound, or empty frames if no session.
 */
const queryRequiresSession = async (
  frames: Frames,
  sessionVar: symbol,
  activeUserVar: symbol,
): Promise<Frames> => {
  const initialFrame = frames.at(0)!;
  const sessionId = initialFrame[sessionVar];
  if (!sessionId) {
    return new Frames(); // Session ID not provided in request
  }
  
  // Sessioning._getUser returns [{ user: User }] or []
  frames = await frames.query(Sessioning._getUser, { session: sessionId }, { user: activeUserVar });
  
  if (frames.length === 0) {
    return new Frames(); // No active session found for the provided session ID
  }
  return frames;
};

/**
 * Helper for session validation AND ownership check of a target schedule.
 * Assumes the `sessionVar` is bound in the initial frames from `Requesting.request`.
 * It will query for the `activeUser` from the session and then verify they own the schedule identified by `targetScheduleIdVar`.
 * @param frames The current frames in the synchronization.
 * @param sessionVar The symbol representing the session ID from the request.
 * @param activeUserVar The symbol to which the authenticated user's ID will be bound.
 * @param targetScheduleIdVar The symbol representing the schedule ID from the request payload (e.g., `schedule`).
 * @returns Filtered frames where the active user is the owner of the target schedule, or empty frames if not authorized.
 */
const requiresAuthAndOwnership = async (
  frames: Frames,
  sessionVar: symbol,
  activeUserVar: symbol,
  targetScheduleIdVar: symbol, // This must be provided for ownership check
) => {
  const originalRequestFrame = frames.at(0)!; // Keep original request info

  // 1. Authenticate: Ensure an active session and get the currently authenticated user
  frames = await queryRequiresSession(frames, sessionVar, activeUserVar);
  if (frames.length === 0) return new Frames(); // Not authenticated

  // 2. Authorize: Ensure the activeUser owns the schedule
  const scheduleId = originalRequestFrame[targetScheduleIdVar] as ID; // Get schedule ID from original request frame
  if (!scheduleId) {
    return new Frames(); // Schedule ID not found in the request payload
  }

  // Query for schedule details to get its owner
  // ScheduleGenerator._getScheduleDetails returns `[{ scheduleDetails: ScheduleDoc }]` or `[]`
  frames = await frames.query(
    ScheduleGenerator._getScheduleDetails,
    { schedule: scheduleId },
    { scheduleDetails: Symbol("tempScheduleDocArray") }, // Bind to a temporary symbol holding the array [{ scheduleDetails: ScheduleDoc }]
  );

  if (frames.length === 0 || !frames.at(0)![Symbol("tempScheduleDocArray")] || frames.at(0)![Symbol("tempScheduleDocArray")].length === 0) {
    return new Frames(); // Schedule not found or query failed
  }
  
  // Extract the single ScheduleDoc from the array [{ scheduleDetails: ScheduleDoc }]
  const scheduleDoc = frames.at(0)![Symbol("tempScheduleDocArray")][0].scheduleDetails;

  // Filter to ensure the activeUser is the owner of the schedule
  return frames.filter(($) => $[activeUserVar] === scheduleDoc.owner);
};

// --- Action Syncs (No changes here, as action return types are not affected by query spec) ---

// initializeSchedule
export const InitializeScheduleRequest: Sync = ({
  request, session, owner: requestedOwner, activeUser, schedule,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/initializeSchedule", session, owner: requestedOwner },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames.at(0)!;
    
    // Authenticate user via session
    frames = await queryRequiresSession(frames, session, activeUser);
    if (frames.length === 0) return new Frames({...originalRequestFrame, error: "Unauthorized: Invalid session" });

    // Validate: if an 'owner' was provided in the request, it must match the active user
    const actualRequestedOwner = originalRequestFrame[requestedOwner];
    if (actualRequestedOwner && actualRequestedOwner !== frames.at(0)![activeUser]) {
      return new Frames({...originalRequestFrame, error: "Unauthorized: Cannot create schedule for another user" }); 
    }
    
    // The ScheduleGenerator.initializeSchedule action creates/returns a schedule
    // for the 'owner' argument. We enforce that this 'owner' is always the 'activeUser'.
    return frames.map(($) => ({ ...$, [requestedOwner]: $[activeUser] }));
  },
  then: actions([ScheduleGenerator.initializeSchedule, { owner: requestedOwner }, { schedule }]),
});

export const InitializeScheduleResponseSuccess: Sync = ({ request, schedule }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/initializeSchedule" }, { request }],
    [ScheduleGenerator.initializeSchedule, {}, { schedule }],
  ),
  then: actions([Requesting.respond, { request, schedule }]),
});

export const InitializeScheduleResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/initializeSchedule" }, { request }],
    [ScheduleGenerator.initializeSchedule, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// addEvent
export const AddEventRequest: Sync = ({
  request, session, schedule, name, startTime, endTime, repeat, activeUser, event,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/addEvent", session, schedule, name, startTime, endTime, repeat },
    { request },
  ]),
  where: async (frames) => {
    // Authenticate user and ensure ownership of the target schedule
    frames = await requiresAuthAndOwnership(frames, session, activeUser, schedule);
    if (frames.length === 0) return new Frames({...frames.at(0)!, error: "Unauthorized or Schedule not found" });
    return frames;
  },
  then: actions([
    ScheduleGenerator.addEvent,
    { schedule, name, startTime, endTime, repeat },
    { event },
  ]),
});

export const AddEventResponseSuccess: Sync = ({ request, event }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/addEvent" }, { request }],
    [ScheduleGenerator.addEvent, {}, { event }],
  ),
  then: actions([Requesting.respond, { request, event }]),
});

export const AddEventResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/addEvent" }, { request }],
    [ScheduleGenerator.addEvent, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// editEvent
export const EditEventRequest: Sync = ({
  request, session, schedule, oldEvent, name, startTime, endTime, repeat, activeUser,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/editEvent", session, schedule, oldEvent, name, startTime, endTime, repeat },
    { request },
  ]),
  where: async (frames) => {
    frames = await requiresAuthAndOwnership(frames, session, activeUser, schedule);
    if (frames.length === 0) return new Frames({...frames.at(0)!, error: "Unauthorized or Schedule not found" });
    return frames;
  },
  then: actions([
    ScheduleGenerator.editEvent,
    { schedule, oldEvent, name, startTime, endTime, repeat },
  ]),
});

export const EditEventResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/editEvent" }, { request }],
    [ScheduleGenerator.editEvent, {}, {}], // Returns Empty on success
  ),
  then: actions([Requesting.respond, { request, status: "event_updated" }]),
});

export const EditEventResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/editEvent" }, { request }],
    [ScheduleGenerator.editEvent, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// deleteEvent
export const DeleteEventRequest: Sync = ({
  request, session, schedule, event, activeUser,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/deleteEvent", session, schedule, event },
    { request },
  ]),
  where: async (frames) => {
    frames = await requiresAuthAndOwnership(frames, session, activeUser, schedule);
    if (frames.length === 0) return new Frames({...frames.at(0)!, error: "Unauthorized or Schedule not found" });
    return frames;
  },
  then: actions([ScheduleGenerator.deleteEvent, { schedule, event }]),
});

export const DeleteEventResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/deleteEvent" }, { request }],
    [ScheduleGenerator.deleteEvent, {}, {}], // Returns Empty on success
  ),
  then: actions([Requesting.respond, { request, status: "event_deleted" }]),
});

export const DeleteEventResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/deleteEvent" }, { request }],
    [ScheduleGenerator.deleteEvent, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// addTask
export const AddTaskRequest: Sync = ({
  request, session, schedule, name, deadline, expectedCompletionTime, completionLevel, priority, activeUser, task,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/addTask", session, schedule, name, deadline, expectedCompletionTime, completionLevel, priority },
    { request },
  ]),
  where: async (frames) => {
    frames = await requiresAuthAndOwnership(frames, session, activeUser, schedule);
    if (frames.length === 0) return new Frames({...frames.at(0)!, error: "Unauthorized or Schedule not found" });
    return frames;
  },
  then: actions([
    ScheduleGenerator.addTask,
    { schedule, name, deadline, expectedCompletionTime, completionLevel, priority },
    { task },
  ]),
});

export const AddTaskResponseSuccess: Sync = ({ request, task }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/addTask" }, { request }],
    [ScheduleGenerator.addTask, {}, { task }],
  ),
  then: actions([Requesting.respond, { request, task }]),
});

export const AddTaskResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/addTask" }, { request }],
    [ScheduleGenerator.addTask, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// editTask
export const EditTaskRequest: Sync = ({
  request, session, schedule, oldTask, name, deadline, expectedCompletionTime, completionLevel, priority, activeUser,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/editTask", session, schedule, oldTask, name, deadline, expectedCompletionTime, completionLevel, priority },
    { request },
  ]),
  where: async (frames) => {
    frames = await requiresAuthAndOwnership(frames, session, activeUser, schedule);
    if (frames.length === 0) return new Frames({...frames.at(0)!, error: "Unauthorized or Schedule not found" });
    return frames;
  },
  then: actions([
    ScheduleGenerator.editTask,
    { schedule, oldTask, name, deadline, expectedCompletionTime, completionLevel, priority },
  ]),
});

export const EditTaskResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/editTask" }, { request }],
    [ScheduleGenerator.editTask, {}, {}], // Returns Empty on success
  ),
  then: actions([Requesting.respond, { request, status: "task_updated" }]),
});

export const EditTaskResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/editTask" }, { request }],
    [ScheduleGenerator.editTask, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// deleteTask
export const DeleteTaskRequest: Sync = ({
  request, session, schedule, task, activeUser,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/deleteTask", session, schedule, task },
    { request },
  ]),
  where: async (frames) => {
    frames = await requiresAuthAndOwnership(frames, session, activeUser, schedule);
    if (frames.length === 0) return new Frames({...frames.at(0)!, error: "Unauthorized or Schedule not found" });
    return frames;
  },
  then: actions([ScheduleGenerator.deleteTask, { schedule, task }]),
});

export const DeleteTaskResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/deleteTask" }, { request }],
    [ScheduleGenerator.deleteTask, {}, {}], // Returns Empty on success
  ),
  then: actions([Requesting.respond, { request, status: "task_deleted" }]),
});

export const DeleteTaskResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/deleteTask" }, { request }],
    [ScheduleGenerator.deleteTask, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// generateSchedule
export const GenerateScheduleRequest: Sync = ({
  request, session, schedule, activeUser, scheduleId, generatedPlan,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/generateSchedule", session, schedule },
    { request },
  ]),
  where: async (frames) => {
    frames = await requiresAuthAndOwnership(frames, session, activeUser, schedule);
    if (frames.length === 0) return new Frames({...frames.at(0)!, error: "Unauthorized or Schedule not found" });
    return frames;
  },
  then: actions([
    ScheduleGenerator.generateSchedule,
    { schedule },
    { scheduleId, generatedPlan },
  ]),
});

export const GenerateScheduleResponseSuccess: Sync = ({
  request, scheduleId, generatedPlan,
}) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/generateSchedule" }, { request }],
    [ScheduleGenerator.generateSchedule, {}, { scheduleId, generatedPlan }],
  ),
  then: actions([Requesting.respond, { request, scheduleId, generatedPlan }]),
});

export const GenerateScheduleResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/generateSchedule" }, { request }],
    [ScheduleGenerator.generateSchedule, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Query Syncs ---

// _getScheduleByOwner
export const GetScheduleByOwnerQuery: Sync = ({
  request, session, owner: requestedOwner, activeUser, schedule,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getScheduleByOwner", session, owner: requestedOwner },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames.at(0)!;
    
    // Authenticate user via session
    frames = await queryRequiresSession(frames, session, activeUser);
    if (frames.length === 0) {
      return new Frames({...originalRequestFrame, error: "Unauthorized: Invalid session" });
    }

    // Validate: if an 'owner' was provided in the request, it must match the active user
    const actualRequestedOwner = originalRequestFrame[requestedOwner];
    if (actualRequestedOwner && actualRequestedOwner !== frames.at(0)![activeUser]) {
      return new Frames({...originalRequestFrame, error: "Unauthorized: Cannot query schedules for other users" });
    }
    
    // If no owner was explicitly provided in the request, or it matches activeUser,
    // then query for the activeUser's schedule.
    // ScheduleGenerator._getScheduleByOwner returns `[{ schedule: Schedule }]` or `[]`
    frames = await frames.query(ScheduleGenerator._getScheduleByOwner, { owner: frames.at(0)![activeUser] }, { schedule });

    // Handle case where no schedule is found for the active user: return empty array for 'schedule'
    if (frames.length === 0) {
      return new Frames({ ...originalRequestFrame, [schedule]: [] });
    }
    return frames; // `schedule` contains the ID if found, in an array [{schedule: ID}]
  },
  then: actions([Requesting.respond, { request, schedule }]),
});

// _getEventsForSchedule
export const GetEventsForScheduleQuery: Sync = ({
  request, session, schedule, activeUser, event, // Bind to `event` (singular) as per API spec output `{"event": [...]}`
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getEventsForSchedule", session, schedule },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames.at(0)!;
    
    // Authenticate user and ensure ownership of the target schedule
    frames = await requiresAuthAndOwnership(frames, session, activeUser, schedule);
    if (frames.length === 0) {
      return new Frames({...originalRequestFrame, error: "Unauthorized or Schedule not found" });
    }
    
    // If authenticated and authorized, proceed with the actual query
    // ScheduleGenerator._getEventsForSchedule returns `[{ event: Event[] }]` or `[]`
    frames = await frames.query(ScheduleGenerator._getEventsForSchedule, { schedule }, { event }); // Bind to 'event'

    // If no events are found, the query returns [], so frames will be empty.
    // We should ensure a response is always sent, even if it's an empty array.
    if (frames.length === 0) {
        return new Frames({...originalRequestFrame, [event]: []}); // Return empty array for events
    }
    return frames; // `event` contains the array of event IDs, in an array [{event: ID[]}]
  },
  then: actions([Requesting.respond, { request, event }]), // Now directly using 'event' key
});

// _getTasksForSchedule
export const GetTasksForScheduleQuery: Sync = ({
  request, session, schedule, activeUser, task, // Bind to `task` (singular) as per API spec output `{"task": [...]}`
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getTasksForSchedule", session, schedule },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames.at(0)!;

    // Authenticate user and ensure ownership of the target schedule
    frames = await requiresAuthAndOwnership(frames, session, activeUser, schedule);
    if (frames.length === 0) {
      return new Frames({...originalRequestFrame, error: "Unauthorized or Schedule not found" });
    }

    // If authenticated and authorized, proceed with the actual query
    // ScheduleGenerator._getTasksForSchedule returns `[{ task: Task[] }]` or `[]`
    frames = await frames.query(ScheduleGenerator._getTasksForSchedule, { schedule }, { task }); // Bind to 'task'

    // If no tasks are found, the query returns [], so frames will be empty.
    if (frames.length === 0) {
        return new Frames({...originalRequestFrame, [task]: []});
    }
    return frames; // `task` contains the array of task IDs, in an array [{task: ID[]}]
  },
  then: actions([Requesting.respond, { request, task }]), // Now directly using 'task' key
});

// _getEventDetails
export const GetEventDetailsQuery: Sync = ({
  request, session, event, activeUser, eventDetails,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getEventDetails", session, event },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames.at(0)!; 
    
    // 1. Authenticate user via session
    let authenticatedFrames = await queryRequiresSession(frames, session, activeUser);
    if (authenticatedFrames.length === 0) {
      return new Frames({ ...originalRequestFrame, error: "Unauthorized: Invalid session" });
    }

    const eventId = originalRequestFrame[event] as ID;
    if (!eventId) {
      return new Frames({ ...originalRequestFrame, error: "Event ID not provided" });
    }

    // 2. Fetch event details to get its associated internal `scheduleID`
    // ScheduleGenerator._getEventDetails returns `[{ eventDetails: EventDoc }]` or `[]`
    let eventDetailFrames = await authenticatedFrames.query(
      ScheduleGenerator._getEventDetails,
      { event: eventId },
      { eventDetails: Symbol("tempEventDocArray") }, // Bind to a temporary symbol holding the array [{ eventDetails: EventDoc }]
    );
    if (eventDetailFrames.length === 0 || eventDetailFrames.at(0)![Symbol("tempEventDocArray")].length === 0) {
      return new Frames({ ...originalRequestFrame, error: "Event not found" });
    }
    const eventDoc = eventDetailFrames.at(0)![Symbol("tempEventDocArray")][0].eventDetails;
    const internalScheduleId = eventDoc.scheduleID;

    // 3. Find the external Schedule ID for this internal scheduleID based on the active user's ownership
    // ScheduleGenerator._getScheduleByOwner returns `[{ schedule: Schedule }]` or `[]`
    let userScheduleLookupFrames = await authenticatedFrames.query(
      ScheduleGenerator._getScheduleByOwner,
      { owner: authenticatedFrames.at(0)![activeUser] },
      { schedule: Symbol("userExternalScheduleIdArray") } // Bind to array [{schedule: ID}]
    );

    if (userScheduleLookupFrames.length === 0 || userScheduleLookupFrames.at(0)![Symbol("userExternalScheduleIdArray")].length === 0) {
        return new Frames({ ...originalRequestFrame, error: "Unauthorized: Active user has no schedule" });
    }
    const userExternalScheduleId = userScheduleLookupFrames.at(0)![Symbol("userExternalScheduleIdArray")][0].schedule;

    // 4. Get full details of the user's schedule to check its internal ID
    // ScheduleGenerator._getScheduleDetails returns `[{ scheduleDetails: ScheduleDoc }]` or `[]`
    let userFullScheduleFrames = await authenticatedFrames.query(
        ScheduleGenerator._getScheduleDetails,
        { schedule: userExternalScheduleId },
        { scheduleDetails: Symbol("userFullScheduleDocArray") } // Bind to array [{scheduleDetails: ScheduleDoc}]
    );

    // 5. Verify if the event's internal scheduleID matches the active user's schedule's internal ID
    if (userFullScheduleFrames.length === 0 || userFullScheduleFrames.at(0)![Symbol("userFullScheduleDocArray")].length === 0 || userFullScheduleFrames.at(0)![Symbol("userFullScheduleDocArray")][0].scheduleDetails.scheduleID !== internalScheduleId) {
        return new Frames({ ...originalRequestFrame, error: "Unauthorized: The event's schedule does not belong to the active user" });
    }

    // If all checks pass, remap the event details for the final response
    return eventDetailFrames.map(f => ({...f, [eventDetails]: f[Symbol("tempEventDocArray")][0].eventDetails})); // Extract the single doc from array
  },
  then: actions([Requesting.respond, { request, eventDetails }]),
});

// _getTaskDetails
export const GetTaskDetailsQuery: Sync = ({
  request, session, task, activeUser, taskDetails,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getTaskDetails", session, task },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames.at(0)!;

    // 1. Authenticate user via session
    let authenticatedFrames = await queryRequiresSession(frames, session, activeUser);
    if (authenticatedFrames.length === 0) {
      return new Frames({ ...originalRequestFrame, error: "Unauthorized: Invalid session" });
    }

    const taskId = originalRequestFrame[task] as ID;
    if (!taskId) {
      return new Frames({ ...originalRequestFrame, error: "Task ID not provided" });
    }

    // 2. Fetch task details to get its associated internal `scheduleID`
    // ScheduleGenerator._getTaskDetails returns `[{ taskDetails: TaskDoc }]` or `[]`
    let taskDetailFrames = await authenticatedFrames.query(
      ScheduleGenerator._getTaskDetails,
      { task: taskId },
      { taskDetails: Symbol("tempTaskDocArray") }, // Bind to a temporary symbol holding the array [{ taskDetails: TaskDoc }]
    );
    if (taskDetailFrames.length === 0 || taskDetailFrames.at(0)![Symbol("tempTaskDocArray")].length === 0) {
      return new Frames({ ...originalRequestFrame, error: "Task not found" });
    }
    const taskDoc = taskDetailFrames.at(0)![Symbol("tempTaskDocArray")][0].taskDetails;
    const internalScheduleId = taskDoc.scheduleID;

    // 3. Find the external Schedule ID for this internal scheduleID based on the active user's ownership
    // ScheduleGenerator._getScheduleByOwner returns `[{ schedule: Schedule }]` or `[]`
    let userScheduleLookupFrames = await authenticatedFrames.query(
      ScheduleGenerator._getScheduleByOwner,
      { owner: authenticatedFrames.at(0)![activeUser] },
      { schedule: Symbol("userExternalScheduleIdArray") } // Bind to array [{schedule: ID}]
    );

    if (userScheduleLookupFrames.length === 0 || userScheduleLookupFrames.at(0)![Symbol("userExternalScheduleIdArray")].length === 0) {
        return new Frames({ ...originalRequestFrame, error: "Unauthorized: Active user has no schedule" });
    }
    const userExternalScheduleId = userScheduleLookupFrames.at(0)![Symbol("userExternalScheduleIdArray")][0].schedule;

    // 4. Get full details of the user's schedule to check its internal ID
    // ScheduleGenerator._getScheduleDetails returns `[{ scheduleDetails: ScheduleDoc }]` or `[]`
    let userFullScheduleFrames = await authenticatedFrames.query(
        ScheduleGenerator._getScheduleDetails,
        { schedule: userExternalScheduleId },
        { scheduleDetails: Symbol("userFullScheduleDocArray") } // Bind to array [{scheduleDetails: ScheduleDoc}]
    );

    // 5. Verify if the task's internal scheduleID matches the active user's schedule's internal ID
    if (userFullScheduleFrames.length === 0 || userFullScheduleFrames.at(0)![Symbol("userFullScheduleDocArray")].length === 0 || userFullScheduleFrames.at(0)![Symbol("userFullScheduleDocArray")][0].scheduleDetails.scheduleID !== internalScheduleId) {
        return new Frames({ ...originalRequestFrame, error: "Unauthorized: The task's schedule does not belong to the active user" });
    }

    // If all checks pass, remap the task details for the final response
    return taskDetailFrames.map(f => ({...f, [taskDetails]: f[Symbol("tempTaskDocArray")][0].taskDetails})); // Extract the single doc from array
  },
  then: actions([Requesting.respond, { request, taskDetails }]),
});

// _getAllSchedules (User-specific: returns only schedules owned by the active user)
export const GetAllSchedulesQuery: Sync = ({
  request, session, activeUser, schedule, // This will now bind to an array of ScheduleDoc
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getAllSchedules", session },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames.at(0)!;
    
    // Authenticate user via session
    frames = await queryRequiresSession(frames, session, activeUser);
    if (frames.length === 0) {
      return new Frames({ ...originalRequestFrame, error: "Unauthorized: Invalid session" });
    }
    
    // Get all schedules (which will be a single array of ScheduleDoc wrapped in an object, in an array)
    // ScheduleGenerator._getAllSchedules returns `[{ schedule: ScheduleDoc[] }]` or `[]`
    let allSchedulesQueryResult = await frames.query(ScheduleGenerator._getAllSchedules, {}, { schedule: Symbol("allSchedulesArray") });

    if (allSchedulesQueryResult.length === 0 || allSchedulesQueryResult.at(0)![Symbol("allSchedulesArray")].length === 0) {
      return new Frames({ ...originalRequestFrame, [schedule]: [] }); // No schedules found at all
    }

    // Extract the array of ScheduleDocs and filter to include only schedules owned by the active user.
    const allSchedules = allSchedulesQueryResult.at(0)![Symbol("allSchedulesArray")][0].schedule; // Access the actual array of ScheduleDoc
    const userSchedules = allSchedules.filter((s: any) => s.owner === frames.at(0)![activeUser]);
    
    // The API spec for _getAllSchedules shows `[{ "schedule": [{...}] }]`
    // So, we wrap the `userSchedules` array in an object with key `schedule` and then in a Frames.
    return new Frames({ ...originalRequestFrame, [schedule]: userSchedules });
  },
  then: actions([Requesting.respond, { request, schedule }]),
});

// _getScheduleDetails (requires ownership of the specific schedule)
export const GetScheduleDetailsQuery: Sync = ({
  request, session, schedule, activeUser, scheduleDetails,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getScheduleDetails", session, schedule },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames.at(0)!;

    // Authenticate user and ensure ownership of the target schedule
    frames = await requiresAuthAndOwnership(frames, session, activeUser, schedule);
    if (frames.length === 0) {
      return new Frames({ ...originalRequestFrame, error: "Unauthorized or Schedule not found" });
    }
    
    // If authenticated and authorized, proceed with the actual query
    // ScheduleGenerator._getScheduleDetails returns `[{ scheduleDetails: ScheduleDoc }]` or `[]`
    frames = await frames.query(ScheduleGenerator._getScheduleDetails, { schedule }, { scheduleDetails });

    // Ensure that if no details are found (though ownership implies existence), return empty array
    if (frames.length === 0) {
        return new Frames({...originalRequestFrame, [scheduleDetails]: []});
    }

    return frames;
  },
  then: actions([Requesting.respond, { request, scheduleDetails }]),
});

// _getAllEvents (User-specific: returns only events for schedules owned by the active user)
export const GetAllEventsQuery: Sync = ({
  request, session, activeUser, event, // Bind to `event` (singular) as per API spec output `{"event": [{...}]}`
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getAllEvents", session },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames.at(0)!;
    
    // Authenticate user via session
    frames = await queryRequiresSession(frames, session, activeUser);
    if (frames.length === 0) {
      return new Frames({ ...originalRequestFrame, error: "Unauthorized: Invalid session" });
    }
    
    // Get the schedule ID for the active user
    // ScheduleGenerator._getScheduleByOwner returns `[{ schedule: Schedule }]` or `[]`
    let userScheduleFrames = await frames.query(ScheduleGenerator._getScheduleByOwner, { owner: activeUser }, { schedule: Symbol("userScheduleIdArray") });
    
    if (userScheduleFrames.length === 0 || userScheduleFrames.at(0)![Symbol("userScheduleIdArray")].length === 0) {
      return new Frames({ ...originalRequestFrame, [event]: [] }); // No schedules for user, return empty array for events
    }
    const userScheduleId = userScheduleFrames.at(0)![Symbol("userScheduleIdArray")][0].schedule; // Extract single schedule ID

    // Get all events for that specific schedule
    // ScheduleGenerator._getEventsForSchedule returns `[{ event: Event[] }]` or `[]`
    frames = await frames.query(ScheduleGenerator._getEventsForSchedule, { schedule: userScheduleId }, { event });

    // Ensure that if no events are found, an empty array is returned in the response
    if (frames.length === 0) {
        return new Frames({...originalRequestFrame, [event]: []});
    }

    return frames; // `event` contains the array of event IDs, in an array [{event: ID[]}]
  },
  then: actions([Requesting.respond, { request, event }]),
});

// _getAllTasks (User-specific: returns only tasks for schedules owned by the active user)
export const GetAllTasksQuery: Sync = ({
  request, session, activeUser, task, // Bind to `task` (singular) as per API spec output `{"task": [{...}]}`
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getAllTasks", session },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames.at(0)!;

    // Authenticate user via session
    frames = await queryRequiresSession(frames, session, activeUser);
    if (frames.length === 0) {
      return new Frames({ ...originalRequestFrame, error: "Unauthorized: Invalid session" });
    }
    
    // Get the schedule ID for the active user
    // ScheduleGenerator._getScheduleByOwner returns `[{ schedule: Schedule }]` or `[]`
    let userSchedulesFrames = await frames.query(ScheduleGenerator._getScheduleByOwner, { owner: activeUser }, { schedule: Symbol("userScheduleIdArray") });
    
    if (userSchedulesFrames.length === 0 || userSchedulesFrames.at(0)![Symbol("userScheduleIdArray")].length === 0) {
      return new Frames({ ...originalRequestFrame, [task]: [] }); // No schedules for user, return empty array for tasks
    }
    const userScheduleId = userSchedulesFrames.at(0)![Symbol("userScheduleIdArray")][0].schedule; // Extract single schedule ID

    // Get all tasks for that specific schedule
    // ScheduleGenerator._getTasksForSchedule returns `[{ task: Task[] }]` or `[]`
    frames = await frames.query(ScheduleGenerator._getTasksForSchedule, { schedule: userScheduleId }, { task });

    // Ensure that if no tasks are found, an empty array is returned in the response
    if (frames.length === 0) {
        return new Frames({...originalRequestFrame, [task]: []});
    }

    return frames; // `task` contains the array of task IDs, in an array [{task: ID[]}]
  },
  then: actions([Requesting.respond, { request, task }]),
});
```

For the sync file, we have the following errors:

* frames.at(0)!\[Symbol("tempScheduleDocArray")].length
  * Object is of type 'unknown'
* eventDetailFrames.at(0)!\[Symbol("tempEventDocArray")].length
  * Property 'length' does not exist on type 'EventDoc'.
* For const eventDoc
  * Element implicitly has an 'any' type because expression of type '0' can't be used to index type 'EventDoc'.  Property '0' does not exist on type 'EventDoc'
* and similar issues
