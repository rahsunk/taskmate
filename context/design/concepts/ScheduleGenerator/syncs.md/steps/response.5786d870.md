---
timestamp: 'Mon Nov 03 2025 06:32:20 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251103_063220.c2a29e46.md]]'
content_id: 5786d8709d8b3b195a18d6bb13d029bc3ebad03f75f3dd9338f2f7c4b5608aea
---

# response:

The "overload issues" you're encountering typically stem from inconsistencies between the concept's query method return types and the expected structure for `frames.query` within synchronizations, as well as the final JSON structure expected by `Requesting.respond` as defined in the API specification.

The core principle to follow is:

1. **Concept Query Methods**: All query methods (`_get...`) in your concept class should consistently return a `Promise<Array<{ [output_parameter_name]: Type }>>`. If there are no results, they should return an empty array `[]`. This `[output_parameter_name]` is crucial for `frames.query` to bind variables correctly.
   * For queries returning a single item/ID: `Promise<Array<{ item: ItemId }>>`.
   * For queries returning an array of IDs: `Promise<Array<{ items: ItemId[] }>>`.
   * For queries returning full documents: `Promise<Array<{ itemDetails: ItemDoc }>>`.
   * For queries returning *all* documents of a type (e.g., `_getAllSchedules`): The method should return `Promise<Array<{ schedule: ScheduleDoc }>>`, meaning an array where each element is an object `{ schedule: actualScheduleDoc }`. This allows `frames.query` to create multiple frames if multiple schedules are returned, or one frame where the `schedule` variable is bound to each `ScheduleDoc`. The sync will then `collectAs` if a single array of items is desired in the final response.

2. **Synchronization `where` Clause**: `frames.query` will work seamlessly with the above structure. When filtering or processing, ensure you're accessing the bound variables correctly (e.g., `$[schedule]` will now be `ScheduleDoc`, not `ScheduleDoc[]`).

3. **Synchronization `then` Clause**: `Requesting.respond` expects a flat dictionary. If you want to return an array of items, you should use `frames.collectAs([single_item_var], array_result_var)` in the `where` clause to transform multiple frames into one frame with an array.

I've updated both `ScheduleGeneratorConcept.ts` and `UserAuthenticationConcept.ts` to reflect these consistent query return types. Then, I've updated the `ScheduleGenerator.sync.ts` to use these new query return types and to properly handle authorization and error responses.

Here are the updated files:

***

## Updated `ScheduleGeneratorConcept.ts`

This version ensures all query methods return `Promise<Array<{ [key]: Value }>>` for consistency. Notably, `_getAllSchedules`, `_getAllEvents`, `_getAllTasks` now return an array of objects, where each object contains a single document under a key named after the singular type (e.g., `[{ schedule: ScheduleDoc }, { schedule: ScheduleDoc }]`).

```typescript
// # file: src/ScheduleGenerator/ScheduleGeneratorConcept.ts

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
  _id: Schedule;       // MongoDB's primary key for the schedule
  owner: User;         // The ID of the user who owns this schedule
  scheduleID: number;  // An internal, incrementing numerical ID for this concept
}

/**
 * Interface for the 'Events' collection documents.
 * Corresponds to "a set of Events" in the concept state.
 */
interface EventDoc {
  _id: Event;          // MongoDB's primary key for the event
  name: string;
  eventID: number;     // An internal, incrementing numerical ID for this concept
  scheduleID: number;  // Foreign key linking to the parent ScheduleDoc's internal scheduleID
  startTime: Date;     // The start date and time of the event
  endTime: Date;       // The end date and time of the event
  repeat: RepeatConfig; // The repetition configuration for the event
}

/**
 * Interface for the 'Tasks' collection documents.
 * Corresponds to "a set of Tasks" in the concept state.
 */
interface TaskDoc {
  _id: Task;           // MongoDB's primary key for the task
  name: string;
  taskID: number;      // An internal, incrementing numerical ID for this concept
  scheduleID: number;  // Foreign key linking to the parent ScheduleDoc's internal scheduleID
  deadline: Date;      // The deadline for completing the task
  expectedCompletionTime: number; // Estimated time needed for task completion (in minutes)
  completionLevel: Percent; // Current progress of the task (0-100%)
  priority: Percent;   // Priority level of the task (0-100%)
}

/**
 * Interface for the 'Counters' collection documents.
 * Used to manage internal incrementing IDs (`scheduleID`, `eventID`, `taskID`).
 */
interface CounterDoc {
  _id: string; // The name of the counter (e.g., "scheduleID_counter")
  seq: number; // The current sequence value
}

// --- Types for Generated Schedule Plan (for generateSchedule action) ---

/**
 * Represents a concrete scheduled time slot for an event or task.
 * Used in the output of `generateSchedule`.
 */
interface ScheduledItem {
  type: "event" | "task";
  originalId: Event | Task; // The ID of the original EventDoc or TaskDoc
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
  // Access seq from result.value for Deno's MongoDB driver types
  return result?.value?.seq || 1;
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
    // Ensure owner is unique at the database level for robust checks
    this.schedules.createIndex({ owner: 1 }, { unique: true }).catch(
      console.error,
    );
  }

  /**
   * initializeSchedule (owner: User): (schedule: Schedule) | (error: String)
   *
   * requires: `owner` exists (this concept treats `User` as a generic ID and cannot
   *           verify its existence; a higher-level synchronization is expected
   *           to provide a valid `User` ID).
   * effects: if `owner` does not have a schedule, creates an empty `schedule`
   *          with `owner` as `schedule.owner`, with static attribute `scheduleID` incrementing by 1.
   *          If `owner` already has a schedule, returns the existing schedule.
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
      // Catch potential duplicate key error from concurrent creation attempts
      if (e.code === 11000) { // MongoDB duplicate key error code
        // Attempt to find the schedule again, as it might have been created by a concurrent request
        const concurrentSchedule = await this.schedules.findOne({ owner });
        if (concurrentSchedule) {
          return { schedule: concurrentSchedule._id };
        }
      }
      return { error: `Failed to initialize schedule: ${e.message}` };
    }
  }

  /**
   * addEvent (schedule: Schedule, name: String, startTime: Date, endTime: Date, repeat: RepeatConfig): (event: Event) | (error: String)
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
   * editEvent (schedule: Schedule, oldEvent: Event, name: String, startTime: Date, endTime: Date, repeat: RepeatConfig): Empty | (error: String)
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
   * deleteEvent (schedule: Schedule, event: Event): Empty | (error: String)
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
   * addTask (schedule: Schedule, name: String, deadline: Date, expectedCompletionTime: Number, completionLevel: Percent, priority: Percent): (task: Task) | (error: String)
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
   * editTask (schedule: Schedule, oldTask: Task, name: String, deadline: Date, expectedCompletionTime: Number, completionLevel: Percent priority: Percent): Empty | (error: String)
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
   * deleteTask (schedule: Schedule, task: Task): Empty | (error: String)
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
    // Precondition: check if schedule exists
    const existingSchedule = await this.schedules.findOne({ _id: schedule });
    if (!existingSchedule) {
      return { error: `Schedule with ID ${schedule} not found.` };
    }

    // Precondition: check if task exists and is associated with the schedule
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
   * generateSchedule (schedule: Schedule): (scheduleId: Schedule, generatedPlan: GeneratedSchedulePlan) | (error: Error)
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
    // Precondition: check if schedule exists
    const existingSchedule = await this.schedules.findOne({ _id: schedule });
    if (!existingSchedule) {
      return { error: `Schedule with ID ${schedule} not found.` };
    }

    const scheduleInternalID = existingSchedule.scheduleID;

    // Fetch all events and tasks linked to this schedule's internal ID
    const events = await this.events
      .find({ scheduleID: scheduleInternalID })
      .toArray();
    const tasks = await this.tasks
      .find({ scheduleID: scheduleInternalID })
      .toArray();

    const generatedPlan: GeneratedSchedulePlan = [];
    let freeTimeSlots: FreeTimeSlot[] = [];

    // 1. Define the planning horizon
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    const planningEndDate = new Date();
    planningEndDate.setDate(today.getDate() + this.PLANNING_HORIZON_DAYS);
    planningEndDate.setHours(23, 59, 59, 999); // End of planning horizon

    // 2. Instantiate repeating events and initialize free time slots for each day
    for (
      let d = new Date(today);
      d <= planningEndDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dayStart = new Date(d);
      dayStart.setHours(this.DAILY_TASK_START_HOUR, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(this.DAILY_TASK_END_HOUR, 0, 0, 0);

      // Add full working day as an initial free slot if it's a valid time range
      if (dayStart < dayEnd) {
        freeTimeSlots.push({
          start: dayStart,
          end: dayEnd,
          durationMinutes: getMinutesDifference(dayStart, dayEnd),
        });
      }

      // Instantiate events for the current day
      for (const event of events) {
        let shouldSchedule = false;
        // Ensure event times are proper Date objects
        const eventStartTime = new Date(event.startTime);
        const eventEndTime = new Date(event.endTime);
        const eventDate = eventStartTime; // Use event's original date for comparison

        switch (event.repeat.frequency) {
          case RepeatFrequency.NONE:
            // Only schedule if the event falls on the current day 'd'
            if (isSameDay(d, eventDate)) {
              shouldSchedule = true;
            }
            break;
          case RepeatFrequency.DAILY:
            shouldSchedule = true; // Every day within the horizon
            break;
          case RepeatFrequency.WEEKLY:
            // Schedule if current day 'd' is one of the specified days of the week
            if (event.repeat.daysOfWeek?.includes(d.getDay())) {
              shouldSchedule = true;
            }
            break;
          case RepeatFrequency.MONTHLY:
            // Schedule if current day 'd' is the same day of the month as event.startTime
            if (d.getDate() === eventDate.getDate()) {
              shouldSchedule = true;
            }
            break;
          case RepeatFrequency.YEARLY:
            // Schedule if current day 'd' is the same day and month as event.startTime
            if (
              d.getDate() === eventDate.getDate() &&
              d.getMonth() === eventDate.getMonth()
            ) {
              shouldSchedule = true;
            }
            break;
        }

        if (shouldSchedule) {
          // Create a concrete instance of the event for the current day 'd'
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

          // Ensure scheduled event doesn't end before it starts or is in the past compared to now
          if (
            scheduledEventStartTime < scheduledEventEndTime &&
            scheduledEventEndTime > new Date()
          ) {
            generatedPlan.push({
              type: "event",
              originalId: event._id,
              name: event.name,
              scheduledStartTime: scheduledEventStartTime, // Explicitly assign property
              scheduledEndTime: scheduledEventEndTime, // Explicitly assign property
            });
            // 3. Subtract fixed event times from available slots
            freeTimeSlots = subtractTimeSlot(
              freeTimeSlots,
              scheduledEventStartTime,
              scheduledEventEndTime,
            );
          }
        }
      }
    }

    // Sort free time slots by start time and merge overlapping/contiguous slots for optimization
    freeTimeSlots.sort((a, b) => a.start.getTime() - b.start.getTime());
    const mergedFreeTimeSlots: FreeTimeSlot[] = [];
    if (freeTimeSlots.length > 0) {
      let currentMerged = { ...freeTimeSlots[0] };
      for (let i = 1; i < freeTimeSlots.length; i++) {
        const next = freeTimeSlots[i];
        // If current slot ends at or after next slot starts, merge them
        // Add a small buffer (e.g., 1 minute) to consider immediately contiguous slots mergeable
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
    freeTimeSlots = mergedFreeTimeSlots; // Use merged slots for task scheduling

    // Filter out free time slots that are entirely in the past
    const now = new Date();
    freeTimeSlots = freeTimeSlots.filter((slot) => slot.end > now);
    // Adjust start of past-overlapping slots to now
    freeTimeSlots = freeTimeSlots.map((slot) => ({
      ...slot,
      start: slot.start < now ? now : slot.start,
      durationMinutes: slot.start < now
        ? getMinutesDifference(now, slot.end)
        : slot.durationMinutes,
    }));
    // Remove slots with non-positive duration after adjustment
    freeTimeSlots = freeTimeSlots.filter((slot) => slot.durationMinutes > 0);

    // 4. Prioritize tasks
    tasks.sort((a, b) => {
      // Ensure deadlines are proper Date objects
      const aDeadline = new Date(a.deadline);
      const bDeadline = new Date(b.deadline);

      // 1. Sooner deadline first
      const deadlineDiff = aDeadline.getTime() - bDeadline.getTime();
      if (deadlineDiff !== 0) return deadlineDiff;

      // 2. Higher priority level first (descending)
      const priorityDiff = b.priority - a.priority;
      if (priorityDiff !== 0) return priorityDiff;

      // 3. Higher expectedCompletionTime first (tasks requiring more effort, descending)
      const ectDiff = b.expectedCompletionTime - a.expectedCompletionTime;
      if (ectDiff !== 0) return ectDiff;

      // 4. Higher completionLevel first (to finish tasks already in progress, descending)
      const completionDiff = b.completionLevel - a.completionLevel;
      if (completionDiff !== 0) return completionDiff;

      return 0; // Maintain original relative order if all criteria are equal
    });

    // 5. Schedule tasks into available free time slots
    const unscheduledTasks: TaskDoc[] = [];

    for (const task of tasks) {
      let taskScheduled = false;
      const remainingTaskDuration = task.expectedCompletionTime *
        (1 - task.completionLevel / 100); // Only schedule remaining work

      // Ensure task deadline is a proper Date object
      const taskDeadline = new Date(task.deadline);

      if (remainingTaskDuration <= 0) {
        // Task already completed or no work left, add to plan as completed or skip
        generatedPlan.push({
          type: "task",
          originalId: task._id,
          name: `${task.name} (Completed)`,
          scheduledStartTime: taskDeadline, // Placeholder, indicating completion
          scheduledEndTime: taskDeadline,
        });
        continue;
      }

      // Try to find a slot before the deadline
      for (let i = 0; i < freeTimeSlots.length; i++) {
        const slot = freeTimeSlots[i];

        // Only consider slots that are before the task's deadline and start in the future or now
        if (slot.start >= taskDeadline || slot.end <= now) {
          continue;
        }

        // The effective end of the slot for this task is either the slot's actual end or the task's deadline, whichever comes first.
        const effectiveSlotEnd = slot.end < taskDeadline
          ? slot.end
          : taskDeadline;
        const availableDurationInSlot = getMinutesDifference(
          slot.start,
          effectiveSlotEnd,
        );

        if (availableDurationInSlot >= remainingTaskDuration) {
          // Task fits perfectly or with room to spare
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

          // Update the free time slots array:
          // Remove the used portion, potentially splitting the slot
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
   * requires: true
   * effects: Retrieves the ID of the schedule document associated with a given user owner.
   *
   * @returns {Promise<Array<{ schedule: Schedule }>>} - An array containing the schedule ID if found, otherwise an empty array.
   */
  async _getScheduleByOwner({ owner }: { owner: User }): Promise<Array<{ schedule: Schedule }>> {
    const scheduleDoc = await this.schedules.findOne({ owner });
    if (!scheduleDoc) {
      return [];
    }
    return [{ schedule: scheduleDoc._id }];
  }

  /**
   * _getEventsForSchedule (schedule: Schedule): (event: Event[])[]
   *
   * requires: `schedule` exists
   * effects: Retrieves an array of Event IDs that are linked to the specified schedule.
   *
   * @returns {Promise<Array<{ event: Event[] }>>} - An array containing an object with an array of event IDs, or an empty array.
   */
  async _getEventsForSchedule({ schedule }: { schedule: Schedule }): Promise<Array<{ event: Event[] }>> {
    const existingSchedule = await this.schedules.findOne({ _id: schedule });
    if (!existingSchedule) {
      return [];
    }
    const eventDocs = await this.events
      .find({ scheduleID: existingSchedule.scheduleID })
      .project({ _id: 1 }) // Only fetch IDs
      .toArray();
    return [{ event: eventDocs.map((doc) => doc._id) }];
  }

  /**
   * _getTasksForSchedule (schedule: Schedule): (task: Task[])[]
   *
   * requires: `schedule` exists
   * effects: Retrieves an array of Task IDs that are linked to the specified schedule.
   *
   * @returns {Promise<Array<{ task: Task[] }>>} - An array containing an object with an array of task IDs, or an empty array.
   */
  async _getTasksForSchedule({ schedule }: { schedule: Schedule }): Promise<Array<{ task: Task[] }>> {
    const existingSchedule = await this.schedules.findOne({ _id: schedule });
    if (!existingSchedule) {
      return [];
    }
    const taskDocs = await this.tasks
      .find({ scheduleID: existingSchedule.scheduleID })
      .project({ _id: 1 }) // Only fetch IDs
      .toArray();
    return [{ task: taskDocs.map((doc) => doc._id) }];
  }

  /**
   * _getEventDetails (event: Event): (eventDetails: EventDoc)[]
   *
   * requires: `event` exists
   * effects: Retrieves the full document details for a specific event.
   *
   * @returns {Promise<Array<{ eventDetails: EventDoc }>>} - An array containing the event document, or an empty array.
   */
  async _getEventDetails({ event }: { event: Event }): Promise<Array<{ eventDetails: EventDoc }>> {
    const eventDoc = await this.events.findOne({ _id: event });
    if (!eventDoc) {
      return [];
    }
    return [{ eventDetails: eventDoc }];
  }

  /**
   * _getTaskDetails (task: Task): (taskDetails: TaskDoc)[]
   *
   * requires: `task` exists
   * effects: Retrieves the full document details for a specific task.
   *
   * @returns {Promise<Array<{ taskDetails: TaskDoc }>>} - An array containing the task document, or an empty array.
   */
  async _getTaskDetails({ task }: { task: Task }): Promise<Array<{ taskDetails: TaskDoc }>> {
    const taskDoc = await this.tasks.findOne({ _id: task });
    if (!taskDoc) {
      return [];
    }
    return [{ taskDetails: taskDoc }];
  }

  /**
   * _getAllSchedules (): (schedule: ScheduleDoc)[]
   *
   * requires: true
   * effects: Returns an array of all `ScheduleDoc` objects.
   *
   * @returns {Promise<Array<{ schedule: ScheduleDoc }>>} - An array where each object contains a single ScheduleDoc, or an empty array.
   */
  async _getAllSchedules(): Promise<Array<{ schedule: ScheduleDoc }>> {
    try {
      const scheduleDocs = await this.schedules.find({}).toArray();
      // Map to the { schedule: ScheduleDoc } structure expected by frames.query
      return scheduleDocs.map(doc => ({ schedule: doc }));
    } catch (e: any) {
      console.error("Error in _getAllSchedules:", e);
      return [];
    }
  }

  /**
   * _getScheduleDetails (schedule: Schedule): (scheduleDetails: ScheduleDoc)[]
   *
   * requires: `schedule` exists
   * effects: Returns the `ScheduleDoc` object matching the provided ID.
   *
   * @returns {Promise<Array<{ scheduleDetails: ScheduleDoc }>>} - An array containing the ScheduleDoc object, or an empty array.
   */
  async _getScheduleDetails({ schedule }: { schedule: Schedule }): Promise<Array<{ scheduleDetails: ScheduleDoc }>> {
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
   * _getAllEvents (): (event: EventDoc)[]
   *
   * requires: true
   * effects: Returns an array of all `EventDoc` objects.
   *
   * @returns {Promise<Array<{ event: EventDoc }>>} - An array where each object contains a single EventDoc, or an empty array.
   */
  async _getAllEvents(): Promise<Array<{ event: EventDoc }>> {
    try {
      const eventDocs = await this.events.find({}).toArray();
      // Map to the { event: EventDoc } structure expected by frames.query
      return eventDocs.map(doc => ({ event: doc }));
    } catch (e: any) {
      console.error("Error in _getAllEvents:", e);
      return [];
    }
  }

  /**
   * _getAllTasks (): (task: TaskDoc)[]
   *
   * requires: true
   * effects: Returns an array of all `TaskDoc` objects.
   *
   * @returns {Promise<Array<{ task: TaskDoc }>>} - An array where each object contains a single TaskDoc, or an empty array.
   */
  async _getAllTasks(): Promise<Array<{ task: TaskDoc }>> {
    try {
      const taskDocs = await this.tasks.find({}).toArray();
      // Map to the { task: TaskDoc } structure expected by frames.query
      return taskDocs.map(doc => ({ task: doc }));
    } catch (e: any) {
      console.error("Error in _getAllTasks:", e);
      return [];
    }
  }
}
```

***

## Updated `UserAuthenticationConcept.ts`

This version standardizes query returns and adds `_getUserById` as per your previous request. It also ensures `passwordHash` is consistently handled.

```typescript
// # file: src/UserAuthentication/UserAuthenticationConcept.ts

import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "../../utils/types.ts";
import { freshID } from "../../utils/database.ts";

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isMongoError(error: unknown): error is { code: number } {
  return typeof error === "object" && error !== null && "code" in error;
}

const PREFIX = "UserAuthentication" + ".";

type User = ID;

/**
 * **state**
 *   a set of Users with
 *     a username String
 *     a password String (interpreted as passwordHash internally)
 *
 * Represents the persistent state for the UserAuthentication concept.
 * Each document in this collection stores the unique user ID, their username, and their passwordHash.
 */
interface UsersDocument {
  _id: User;
  username: string;
  passwordHash: string; // Internal representation is hash
}

// Interface for API output to match spec where 'password' field is expected (but will contain hash)
interface UserApiResponse {
    _id: User;
    username: string;
    password: string; // This will hold the passwordHash
}


export default class UserAuthenticationConcept {
  private users: Collection<UsersDocument>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
    this.users.createIndex({ username: 1 }, { unique: true }).catch(
      console.error,
    );
  }

  /**
   * **action** register (username: String, password: String): (user: User) | (error: String)
   *
   * **requires**: no `User` with `username` exists
   * **effects**: create and return a new `User` with the given `username` and `password`
   *
   * @returns {Promise<{ user: User } | { error: string }>}
   */
  async register(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    try {
      const existingUser = await this.users.findOne({ username });
      if (existingUser) {
        return { error: "Username already exists" };
      }

      const passwordHash = await hashPassword(password);
      const newUser: UsersDocument = {
        _id: freshID(),
        username,
        passwordHash,
      };

      await this.users.insertOne(newUser);
      return { user: newUser._id };
    } catch (e) {
      if (isMongoError(e) && e.code === 11000) {
        return { error: "Username already exists" };
      }
      console.error("Error in register:", e);
      return { error: `Failed to register user: ${e.message}` };
    }
  }

  /**
   * **action** authenticate (username: String, password: String): (user: User) | (error: String)
   *
   * **requires**: `User` with the same `username` and `password` exists
   * **effects**: grants access to the `User` associated with that `username` and `password`
   *
   * @returns {Promise<{ user: User } | { error: string }>}
   */
  async authenticate(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    const user = await this.users.findOne({ username });

    if (!user) {
      return { error: "Invalid username or password" };
    }

    const providedPasswordHash = await hashPassword(password);
    if (user.passwordHash !== providedPasswordHash) {
      return { error: "Invalid username or password" };
    }

    return { user: user._id };
  }

  /**
   * **action** changePassword (user: User, oldPassword: String, newPassword: String): Empty | (error: String)
   *
   * **requires**: `user` exists and `user.password` is equal to `oldPassword`
   * **effects**: `password` for `user` is changed to `newPassword`.
   *
   * @returns {Promise<Empty | { error: string }>}
   */
  async changePassword(
    { user, oldPassword, newPassword }: {
      user: User;
      oldPassword: string;
      newPassword: string;
    },
  ): Promise<Empty | { error: string }> {
    const existingUser = await this.users.findOne({ _id: user });
    if (!existingUser) {
      return { error: `User with ID '${user}' not found.` };
    }
    const oldPasswordHash = await hashPassword(oldPassword);
    if (existingUser.passwordHash !== oldPasswordHash) {
      return { error: "Old password does not match." };
    }
    if (oldPassword === newPassword) {
      return { error: "New password cannot be the same as the old password." };
    }

    const newPasswordHash = await hashPassword(newPassword);
    try {
        await this.users.updateOne(
            { _id: user },
            { $set: { passwordHash: newPasswordHash } },
        );
        return {};
    } catch (e: any) {
        console.error("Error in changePassword:", e);
        return { error: `Failed to change password: ${e.message}` };
    }
  }

  /**
   * **action** deleteAccount (user: User): Empty | (error: String)
   *
   * **requires**: `user` exists
   * **effects**: `user` is removed from the state
   *
   * @returns {Promise<Empty | { error: string }>}
   */
  async deleteAccount(
    { user }: { user: User },
  ): Promise<Empty | { error: string }> {
    try {
        const result = await this.users.deleteOne({ _id: user });
        if (result.deletedCount === 0) {
            return { error: `User with ID '${user}' not found.` };
        }
        return {};
    } catch (e: any) {
        console.error("Error in deleteAccount:", e);
        return { error: `Failed to delete account: ${e.message}` };
    }
  }

  // --- Queries ---

  /**
   * _getUserByUsername (username: String): (user: User)[]
   *
   * effects: returns the user ID associated with a username if found.
   *
   * @returns {Promise<Array<{ user: User }>>} - An array containing an object with the user ID if found, otherwise an empty array.
   */
  async _getUserByUsername(
    { username }: { username: string },
  ): Promise<Array<{ user: User }>> {
    const userDoc = await this.users.findOne({ username });
    if (userDoc) {
      return [{ user: userDoc._id }];
    }
    return [];
  }

  /**
   * _checkUserExists (user: User): (exists: Flag)[]
   *
   * effects: returns true if the user with the given ID exists, false otherwise.
   *
   * @returns {Promise<Array<{ exists: boolean }>>} - An array containing an object with a boolean indicating if the user exists.
   */
  async _checkUserExists(
    { user }: { user: User },
  ): Promise<Array<{ exists: boolean }>> {
    const userDoc = await this.users.findOne({ _id: user });
    return [{ exists: !!userDoc }];
  }

  /**
   * _getAllUsers (): (user: UserApiResponse)[]
   *
   * effects: Returns an array of all user documents, mapping passwordHash to 'password'.
   *
   * @returns {Promise<Array<{ user: UserApiResponse }>>} - An array where each object contains a single UserApiResponse object.
   */
  async _getAllUsers(): Promise<Array<{ user: UserApiResponse }>> {
    const allUsers = await this.users.find({}).project({ _id: 1, username: 1, passwordHash: 1 }).toArray();
    // Map to the { user: UserApiResponse } structure expected by frames.query
    return allUsers.map(doc => ({ user: { _id: doc._id, username: doc.username, password: doc.passwordHash } }));
  }

  /**
   * _getUsernameById (user: User): (username: String)[]
   *
   * effects: Returns the username for a specific user ID, if found.
   *
   * @returns {Promise<Array<{ username: string }>>} - An array containing an object with the username if found, otherwise an empty array.
   */
  async _getUsernameById(
    { user }: { user: User },
  ): Promise<Array<{ username: string }>> {
    const userDoc = await this.users.findOne({ _id: user });
    if (userDoc) {
      return [{ username: userDoc.username }];
    }
    return [];
  }

    /**
   * _getUserById (user: User): (user: UserApiResponse)[]
   *
   * effects: Retrieves a specific user document by its ID, mapping passwordHash to 'password'.
   *
   * @returns {Promise<Array<{ user: UserApiResponse }>>} - An array containing the UserApiResponse object matching the provided ID, if found, otherwise an empty array.
   */
  async _getUserById(
    { user }: { user: User },
  ): Promise<Array<{ user: UserApiResponse }>> {
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc) {
      return [];
    }
    return [{ user: { _id: userDoc._id, username: userDoc.username, password: userDoc.passwordHash } }];
  }
}
```

***

## Updated `ScheduleGenerator.sync.ts`

This file now includes the new generic error responders and adjusts query handling to match the standardized return types.

```typescript
// # file: src/syncs/ScheduleGenerator.sync.ts

import { actions, Frames, Sync } from "@engine";
import { Requesting, Sessioning, ScheduleGenerator } from "@concepts";
import { ID } from "../../utils/types.ts"; // Assuming @utils/types.ts provides ID

// --- Helper Functions for Authentication and Authorization ---

/**
 * Helper for session validation. Ensures an active session exists.
 * If not authenticated, it returns a frame with an 'authError' binding.
 * @param frames The current frames in the synchronization.
 * @param sessionVar The symbol representing the session ID from the request.
 * @param activeUserVar The symbol to which the authenticated user's ID will be bound.
 * @returns Filtered frames with the active user bound, or frames with an authError.
 */
const queryRequiresSession = async (
  frames: Frames,
  sessionVar: symbol,
  activeUserVar: symbol,
): Promise<Frames> => {
  const originalFrame = frames.at(0)!;
  const sessionId = originalFrame[sessionVar];
  if (!sessionId) {
    // If session ID is explicitly null/undefined from request, it's an immediate auth failure
    return new Frames({ ...originalFrame, authError: { error: "Session ID missing." } });
  }
  
  // Sessioning._getUser returns [{ user: activeUser }]
  frames = await frames.query(Sessioning._getUser, { session: sessionId }, { user: activeUserVar });
  
  if (frames.length === 0) {
    // No active session found for the provided session ID
    return new Frames({ ...originalFrame, authError: { error: "Invalid or expired session." } });
  }
  return frames;
};

/**
 * Helper for session validation AND ownership check of a target schedule.
 * If not authorized, it returns a frame with an 'authError' binding.
 * @param frames The current frames in the synchronization.
 * @param sessionVar The symbol representing the session ID from the request.
 * @param activeUserVar The symbol to which the authenticated user's ID will be bound.
 * @param targetScheduleIdVar The symbol representing the schedule ID from the request payload (e.g., `schedule`).
 * @returns Filtered frames where the active user is the owner of the target schedule, or frames with an authError.
 */
const requiresAuthAndOwnership = async (
  frames: Frames,
  sessionVar: symbol,
  activeUserVar: symbol,
  targetScheduleIdVar: symbol, // This must be provided for ownership check
) => {
  const originalRequestFrame = frames.at(0)!;

  // 1. Authenticate: Ensure an active session and get the currently authenticated user
  frames = await queryRequiresSession(frames, sessionVar, activeUserVar);
  if (frames.length === 0 || frames.at(0)!.authError) {
    // Already failed auth in queryRequiresSession, propagate that error
    return frames;
  }

  // 2. Authorize: Ensure the activeUser owns the schedule
  const scheduleId = originalRequestFrame[targetScheduleIdVar] as ID;
  if (!scheduleId) {
    return new Frames({ ...originalRequestFrame, authError: { error: "Schedule ID missing in request." } });
  }

  // _getScheduleDetails returns `[{ scheduleDetails: ScheduleDoc }]` or `[]`
  frames = await frames.query(
    ScheduleGenerator._getScheduleDetails,
    { schedule: scheduleId },
    { scheduleDetails: Symbol("tempScheduleDoc") }, // Bind to a temporary symbol
  );

  if (frames.length === 0 || !frames.at(0)![Symbol("tempScheduleDoc")] || frames.at(0)![Symbol("tempScheduleDoc")].length === 0) {
    return new Frames({ ...originalRequestFrame, authError: { error: "Schedule not found." } });
  }
  
  // Filter to ensure the activeUser is the owner of the schedule
  // Access the owner property from the first (and only) element of the 'scheduleDetails' array
  const scheduleOwner = frames.at(0)![Symbol("tempScheduleDoc")][0].owner;
  if (frames.at(0)![activeUser] !== scheduleOwner) {
    return new Frames({ ...originalRequestFrame, authError: { error: "Unauthorized: You do not own this schedule." } });
  }

  return frames; // If all good, return original frames
};

// --- Generic Error Responders (to reduce boilerplate in individual syncs) ---

// Catches any concept action that returns an 'error' field and responds to the original request
export const ScheduleActionErrorResponder: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, {}, { request }],
        [Symbol('anyAction'), {}, { error }], // Matches any action that produces an 'error' binding
    ),
    then: actions([Requesting.respond, { request, error: error.error || error }]), // Ensure error is a string
});

// Catches any request where the 'where' clause (authentication/authorization) failed
// and returned a frame with an 'authError' binding.
export const ScheduleQueryAuthErrorResponder: Sync = ({ request, authError }) => ({
    when: actions(
        [Requesting.request, {}, { request }],
    ),
    where: (frames) => {
        return frames.filter($ => $[authError] !== undefined); // Only process frames with an authError
    },
    then: actions([Requesting.respond, { request, error: authError.error }]),
});


// --- Action Syncs ---

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
    if (frames.length === 0 || frames.at(0)!.authError) {
      return frames; // Propagate auth error from helper
    }

    // Validate: if an 'owner' was provided in the request, it must match the active user
    const actualRequestedOwner = originalRequestFrame[requestedOwner];
    const authenticatedUserId = frames.at(0)![activeUser];

    if (actualRequestedOwner && actualRequestedOwner !== authenticatedUserId) {
      return new Frames({ ...originalRequestFrame, authError: { error: "Cannot initialize schedule for another user." } }); 
    }
    
    // Bind 'owner' parameter for ScheduleGenerator.initializeSchedule to the 'activeUser' ID
    return frames.map(($) => ({ ...$, [requestedOwner]: authenticatedUserId }));
  },
  then: actions([
    ScheduleGenerator.initializeSchedule, 
    { owner: requestedOwner }, 
    { schedule: schedule },
    { error: Symbol('actionError') } // Output parameter for action errors, caught by generic responder
  ]),
});

export const InitializeScheduleResponseSuccess: Sync = ({ request, schedule }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/initializeSchedule" }, { request }],
    [ScheduleGenerator.initializeSchedule, {}, { schedule }], // Match on successful action result
  ),
  then: actions([Requesting.respond, { request, schedule }]),
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
    const originalRequestFrame = frames.at(0)!;
    const authFrames = await requiresAuthAndOwnership(frames, session, activeUser, schedule);
    if (authFrames.length === 0 || authFrames.at(0)!.authError) {
      return authFrames; // Propagate auth error
    }
    return authFrames;
  },
  then: actions([
    ScheduleGenerator.addEvent,
    { schedule, name, startTime, endTime, repeat },
    { event: event },
    { error: Symbol('actionError')}
  ]),
});

export const AddEventResponseSuccess: Sync = ({ request, event }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/addEvent" }, { request }],
    [ScheduleGenerator.addEvent, {}, { event }],
  ),
  then: actions([Requesting.respond, { request, event }]),
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
    const originalRequestFrame = frames.at(0)!;
    const authFrames = await requiresAuthAndOwnership(frames, session, activeUser, schedule);
    if (authFrames.length === 0 || authFrames.at(0)!.authError) {
      return authFrames; // Propagate auth error
    }
    return authFrames;
  },
  then: actions([
    ScheduleGenerator.editEvent,
    { schedule, oldEvent, name, startTime, endTime, repeat },
    { error: Symbol('actionError')}
  ]),
});

export const EditEventResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/editEvent" }, { request }],
    [ScheduleGenerator.editEvent, {}, {}], // Returns Empty on success
  ),
  then: actions([Requesting.respond, { request, status: "event_updated" }]),
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
    const originalRequestFrame = frames.at(0)!;
    const authFrames = await requiresAuthAndOwnership(frames, session, activeUser, schedule);
    if (authFrames.length === 0 || authFrames.at(0)!.authError) {
      return authFrames; // Propagate auth error
    }
    return authFrames;
  },
  then: actions([ScheduleGenerator.deleteEvent, { schedule, event }, { error: Symbol('actionError') }]),
});

export const DeleteEventResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/deleteEvent" }, { request }],
    [ScheduleGenerator.deleteEvent, {}, {}], // Returns Empty on success
  ),
  then: actions([Requesting.respond, { request, status: "event_deleted" }]),
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
    const originalRequestFrame = frames.at(0)!;
    const authFrames = await requiresAuthAndOwnership(frames, session, activeUser, schedule);
    if (authFrames.length === 0 || authFrames.at(0)!.authError) {
      return authFrames; // Propagate auth error
    }
    return authFrames;
  },
  then: actions([
    ScheduleGenerator.addTask,
    { schedule, name, deadline, expectedCompletionTime, completionLevel, priority },
    { task: task },
    { error: Symbol('actionError')}
  ]),
});

export const AddTaskResponseSuccess: Sync = ({ request, task }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/addTask" }, { request }],
    [ScheduleGenerator.addTask, {}, { task }],
  ),
  then: actions([Requesting.respond, { request, task }]),
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
    const originalRequestFrame = frames.at(0)!;
    const authFrames = await requiresAuthAndOwnership(frames, session, activeUser, schedule);
    if (authFrames.length === 0 || authFrames.at(0)!.authError) {
      return authFrames; // Propagate auth error
    }
    return authFrames;
  },
  then: actions([
    ScheduleGenerator.editTask,
    { schedule, oldTask, name, deadline, expectedCompletionTime, completionLevel, priority },
    { error: Symbol('actionError')}
  ]),
});

export const EditTaskResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/editTask" }, { request }],
    [ScheduleGenerator.editTask, {}, {}], // Returns Empty on success
  ),
  then: actions([Requesting.respond, { request, status: "task_updated" }]),
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
    const originalRequestFrame = frames.at(0)!;
    const authFrames = await requiresAuthAndOwnership(frames, session, activeUser, schedule);
    if (authFrames.length === 0 || authFrames.at(0)!.authError) {
      return authFrames; // Propagate auth error
    }
    return authFrames;
  },
  then: actions([ScheduleGenerator.deleteTask, { schedule, task }, { error: Symbol('actionError') }]),
});

export const DeleteTaskResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/deleteTask" }, { request }],
    [ScheduleGenerator.deleteTask, {}, {}], // Returns Empty on success
  ),
  then: actions([Requesting.respond, { request, status: "task_deleted" }]),
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
    const originalRequestFrame = frames.at(0)!;
    const authFrames = await requiresAuthAndOwnership(frames, session, activeUser, schedule);
    if (authFrames.length === 0 || authFrames.at(0)!.authError) {
      return authFrames; // Propagate auth error
    }
    return authFrames;
  },
  then: actions([
    ScheduleGenerator.generateSchedule,
    { schedule },
    { scheduleId: scheduleId, generatedPlan: generatedPlan }, // Explicitly map outputs
    { error: Symbol('actionError')}
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
    
    // 1. Authenticate user via session
    frames = await queryRequiresSession(frames, session, activeUser);
    if (frames.length === 0 || frames.at(0)!.authError) {
      return frames; // Propagate auth error
    }

    // 2. Authorize: Ensure the 'owner' requested matches the active user
    // If an 'owner' was provided in the request body, it must match the active user.
    // If no 'owner' was provided, we assume the user is querying for their own schedule.
    const actualRequestedOwnerInRequestBody = originalRequestFrame[requestedOwner];
    const authenticatedUserId = frames.at(0)![activeUser];

    let ownerToQuery = authenticatedUserId; // Default to querying for the active user's schedule
    if (actualRequestedOwnerInRequestBody) {
        if (actualRequestedOwnerInRequestBody !== authenticatedUserId) {
            return new Frames({ ...originalRequestFrame, authError: { error: "Unauthorized: Cannot query schedule for another user." } });
        }
        ownerToQuery = actualRequestedOwnerInRequestBody;
    }
    
    // Call the query. _getScheduleByOwner returns `[{ schedule: Schedule }]` or `[]`.
    frames = await frames.query(ScheduleGenerator._getScheduleByOwner, { owner: ownerToQuery }, { schedule });

    // If no schedule found for the owner, ensure `schedule` is null in the response (as per API spec's single string expectation for _getScheduleByOwner success)
    if (frames.length === 0) {
        return new Frames({ ...originalRequestFrame, [schedule]: null });
    }
    return frames; // `schedule` contains the ID if found
  },
  then: actions([
    Requesting.respond, 
    { 
        request, 
        schedule: schedule || null, // Respond with null if not found
        error: Symbol('authError') // Catch auth error from where clause
    }
  ]),
});

// _getEventsForSchedule
export const GetEventsForScheduleQuery: Sync = ({
  request, session, schedule, activeUser, event: eventsArray, // Bind output to 'eventsArray' variable
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
    if (frames.length === 0 || frames.at(0)!.authError) {
      return frames; // Propagate auth error
    }
    
    // If authenticated and authorized, proceed with the actual query
    // _getEventsForSchedule returns `[{ event: Event[] }]` or `[]`
    frames = await frames.query(ScheduleGenerator._getEventsForSchedule, { schedule }, { event: eventsArray });

    // Ensure that if no events are found, an empty array is returned in the response
    if (frames.length === 0 || !frames.at(0)![eventsArray]) {
        return new Frames({...originalRequestFrame, [eventsArray]: []});
    }

    return frames; // `eventsArray` contains the array of event IDs
  },
  then: actions([
    Requesting.respond, 
    { 
        request, 
        events: eventsArray, // Map output to 'events' key as per API spec
        error: Symbol('authError') // Catch auth error from where clause
    }
  ]),
});

// _getTasksForSchedule
export const GetTasksForScheduleQuery: Sync = ({
  request, session, schedule, activeUser, task: tasksArray, // Bind output to 'tasksArray' variable
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
    if (frames.length === 0 || frames.at(0)!.authError) {
      return frames; // Propagate auth error
    }

    // If authenticated and authorized, proceed with the actual query
    // _getTasksForSchedule returns `[{ task: Task[] }]` or `[]`
    frames = await frames.query(ScheduleGenerator._getTasksForSchedule, { schedule }, { task: tasksArray });

    // Ensure that if no tasks are found, an empty array is returned in the response
    if (frames.length === 0 || !frames.at(0)![tasksArray]) {
        return new Frames({...originalRequestFrame, [tasksArray]: []});
    }

    return frames; // `tasksArray` contains the array of task IDs
  },
  then: actions([
    Requesting.respond, 
    { 
        request, 
        tasks: tasksArray, // Map output to 'tasks' key as per API spec
        error: Symbol('authError') // Catch auth error from where clause
    }
  ]),
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
    if (authenticatedFrames.length === 0 || authenticatedFrames.at(0)!.authError) return authenticatedFrames; // Propagate auth error

    const eventId = originalRequestFrame[event] as ID;
    if (!eventId) {
      return new Frames({ ...originalRequestFrame, [eventDetails]: null }); // No event ID in request, return null for details
    }

    // 2. Fetch event details to get its associated internal `scheduleID`
    // The query returns `[{ eventDetails: EventDoc }]` or `[]`
    let eventDetailFrames = await authenticatedFrames.query(
      ScheduleGenerator._getEventDetails,
      { event: eventId },
      { eventDetails: Symbol("tempEventDoc") },
    );
    if (eventDetailFrames.length === 0) {
      return new Frames({ ...originalRequestFrame, [eventDetails]: null }); // Event not found, return null for details
    }
    const internalScheduleId = eventDetailFrames.at(0)![Symbol("tempEventDoc")][0].scheduleID;

    // 3. Find the external Schedule ID for this internal scheduleID based on the active user's ownership
    // The _getScheduleByOwner query returns `[{ schedule: Schedule }]` or `[]`
    let userScheduleLookupFrames = await authenticatedFrames.query(
      ScheduleGenerator._getScheduleByOwner,
      { owner: authenticatedFrames.at(0)![activeUser] },
      { schedule: Symbol("userExternalScheduleId") }
    );

    if (userScheduleLookupFrames.length === 0 || !userScheduleLookupFrames.at(0)![Symbol("userExternalScheduleId")]) {
        return new Frames({ ...originalRequestFrame, authError: { error: "Unauthorized: Active user has no schedule." } }); 
    }
    const userExternalScheduleId = userScheduleLookupFrames.at(0)![Symbol("userExternalScheduleId")];

    // 4. Get full details of the user's schedule to check its internal ID
    // _getScheduleDetails returns `[{ scheduleDetails: ScheduleDoc }]` or `[]`
    let userFullScheduleFrames = await authenticatedFrames.query(
        ScheduleGenerator._getScheduleDetails,
        { schedule: userExternalScheduleId },
        { scheduleDetails: Symbol("userFullScheduleDoc") }
    );

    // 5. Verify if the event's internal scheduleID matches the active user's schedule's internal ID
    if (userFullScheduleFrames.length === 0 || userFullScheduleFrames.at(0)![Symbol("userFullScheduleDoc")][0].scheduleID !== internalScheduleId) {
        return new Frames({ ...originalRequestFrame, authError: { error: "Unauthorized: The event's schedule does not belong to the active user." } }); 
    }

    // If all checks pass, remap the event details for the final response.
    // The API spec expects `[ { "eventDetails": {...} } ]`, so we will ensure `eventDetails` is bound to the actual EventDoc.
    return eventDetailFrames.map(f => ({...f, [eventDetails]: f[Symbol("tempEventDoc")][0]}));
  },
  then: actions([
    Requesting.respond, 
    { 
        request, 
        eventDetails: eventDetails || null, // Respond with null if not found or error
        error: Symbol('authError') // Catch auth error from where clause
    }
  ]),
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
    if (authenticatedFrames.length === 0 || authenticatedFrames.at(0)!.authError) return authenticatedFrames; // Propagate auth error

    const taskId = originalRequestFrame[task] as ID;
    if (!taskId) {
      return new Frames({ ...originalRequestFrame, [taskDetails]: null }); // No task ID in request, return null for details
    }

    // 2. Fetch task details to get its associated internal `scheduleID`
    // The query returns `[{ taskDetails: TaskDoc }]` or `[]`
    let taskDetailFrames = await authenticatedFrames.query(
      ScheduleGenerator._getTaskDetails,
      { task: taskId },
      { taskDetails: Symbol("tempTaskDoc") },
    );
    if (taskDetailFrames.length === 0) {
      return new Frames({ ...originalRequestFrame, [taskDetails]: null }); // Task not found, return null for details
    }
    const internalScheduleId = taskDetailFrames.at(0)![Symbol("tempTaskDoc")][0].scheduleID;

    // 3. Find the external Schedule ID for this internal scheduleID based on the active user's ownership
    // The _getScheduleByOwner query returns `[{ schedule: Schedule }]` or `[]`
    let userScheduleLookupFrames = await authenticatedFrames.query(
      ScheduleGenerator._getScheduleByOwner,
      { owner: authenticatedFrames.at(0)![activeUser] },
      { schedule: Symbol("userExternalScheduleId") }
    );

    if (userScheduleLookupFrames.length === 0 || !userScheduleLookupFrames.at(0)![Symbol("userExternalScheduleId")]) {
        return new Frames({ ...originalRequestFrame, authError: { error: "Unauthorized: Active user has no schedule." } });
    }
    const userExternalScheduleId = userScheduleLookupFrames.at(0)![Symbol("userExternalScheduleId")];

    // 4. Get full details of the user's schedule to check its internal ID
    // _getScheduleDetails returns `[{ scheduleDetails: ScheduleDoc }]` or `[]`
    let userFullScheduleFrames = await authenticatedFrames.query(
        ScheduleGenerator._getScheduleDetails,
        { schedule: userExternalScheduleId },
        { scheduleDetails: Symbol("userFullScheduleDoc") }
    );

    // 5. Verify if the task's internal scheduleID matches the active user's schedule's internal ID
    if (userFullScheduleFrames.length === 0 || userFullScheduleFrames.at(0)![Symbol("userFullScheduleDoc")][0].scheduleID !== internalScheduleId) {
        return new Frames({ ...originalRequestFrame, authError: { error: "Unauthorized: The task's schedule does not belong to the active user." } });
    }

    // If all checks pass, remap the task details for the final response
    return taskDetailFrames.map(f => ({...f, [taskDetails]: f[Symbol("tempTaskDoc")][0]}));
  },
  then: actions([
    Requesting.respond, 
    { 
        request, 
        taskDetails: taskDetails || null, // Respond with null if not found or error
        error: Symbol('authError') // Catch auth error from where clause
    }
  ]),
});

// _getAllSchedules (User-specific: returns only schedules owned by the active user)
export const GetAllSchedulesQuery: Sync = ({
  request, session, activeUser, schedule: scheduleDoc, // Bind each individual ScheduleDoc here
  results: schedulesArray // This will hold the collected array of ScheduleDoc
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
    if (frames.length === 0 || frames.at(0)!.authError) {
      return frames; // Propagate auth error
    }
    
    // Call the query. _getAllSchedules returns `[{ schedule: ScheduleDoc }, ...]`
    frames = await frames.query(ScheduleGenerator._getAllSchedules, {}, { schedule: scheduleDoc });
    
    // Filter schedules to only include those owned by the active user
    const filteredFrames = frames.filter($ => $[scheduleDoc].owner === $[activeUser]);

    if (filteredFrames.length === 0) {
      return new Frames({ ...originalRequestFrame, [schedulesArray]: [] }); // If no schedules found/owned, return empty array
    }

    // Collect individual scheduleDocs into an array under the 'schedulesArray' key for response
    return filteredFrames.collectAs([scheduleDoc], schedulesArray);
  },
  then: actions([
    Requesting.respond, 
    { 
        request, 
        schedules: schedulesArray, // Map to 'schedules' key as per API spec
        error: Symbol('authError') // Catch auth error from where clause
    }
  ]),
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
    if (frames.length === 0 || frames.at(0)!.authError) {
      return frames; // Propagate auth error
    }
    
    // If authenticated and authorized, proceed with the actual query
    // _getScheduleDetails returns `[{ scheduleDetails: ScheduleDoc }]` or `[]`
    const queryResultFrames = await frames.query(ScheduleGenerator._getScheduleDetails, { schedule }, { scheduleDetails });

    if (queryResultFrames.length === 0 || !queryResultFrames.at(0)![scheduleDetails]) {
        return new Frames({...originalRequestFrame, [scheduleDetails]: null}); // Return null for details if not found
    }

    return queryResultFrames;
  },
  then: actions([
    Requesting.respond, 
    { 
        request, 
        scheduleDetails: scheduleDetails || null, // Respond with null if not found or error
        error: Symbol('authError') // Catch auth error from where clause
    }
  ]),
});

// _getAllEvents (User-specific: returns only events for schedules owned by the active user)
export const GetAllEventsQuery: Sync = ({
  request, session, activeUser, event: eventDoc, // Bind each individual EventDoc here
  results: eventsArray // This will hold the collected array of EventDoc
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
    if (frames.length === 0 || frames.at(0)!.authError) {
      return frames; // Propagate auth error
    }
    
    // Get the schedule ID(s) for the active user
    // _getScheduleByOwner returns `[{ schedule: Schedule }]` or `[]`
    let userScheduleLookupFrames = await frames.query(ScheduleGenerator._getScheduleByOwner, { owner: activeUser }, { schedule: Symbol("userExternalScheduleId") });
    
    if (userScheduleLookupFrames.length === 0 || !userScheduleLookupFrames.at(0)![Symbol("userExternalScheduleId")]) {
        return new Frames({ ...originalRequestFrame, [eventsArray]: [] }); // No schedules for user, thus no events
    }
    const userExternalScheduleId = userScheduleLookupFrames.at(0)![Symbol("userExternalScheduleId")];

    // Get the internal schedule ID for the user's schedule
    let userFullScheduleFrames = await frames.query(
        ScheduleGenerator._getScheduleDetails,
        { schedule: userExternalScheduleId },
        { scheduleDetails: Symbol("userFullScheduleDoc") }
    );
    if (userFullScheduleFrames.length === 0) {
        return new Frames({ ...originalRequestFrame, [eventsArray]: [] }); // No full schedule details found
    }
    const userInternalScheduleId = userFullScheduleFrames.at(0)![Symbol("userFullScheduleDoc")][0].scheduleID;

    // Call the _getAllEvents concept query, which returns `[{ event: EventDoc }, ...]`
    frames = await frames.query(ScheduleGenerator._getAllEvents, {}, { event: eventDoc });

    // Filter events to only include those belonging to the active user's schedule
    const filteredFrames = frames.filter($ => $[eventDoc].scheduleID === userInternalScheduleId);

    if (filteredFrames.length === 0) {
      return new Frames({ ...originalRequestFrame, [eventsArray]: [] });
    }

    // Collect individual eventDocs into an array under the 'eventsArray' key for response
    return filteredFrames.collectAs([eventDoc], eventsArray);
  },
  then: actions([
    Requesting.respond, 
    { 
        request, 
        events: eventsArray, // Map to 'events' key as per API spec
        error: Symbol('authError') // Catch auth error from where clause
    }
  ]),
});

// _getAllTasks (User-specific: returns only tasks for schedules owned by the active user)
export const GetAllTasksQuery: Sync = ({
  request, session, activeUser, task: taskDoc, // Bind each individual TaskDoc here
  results: tasksArray // This will hold the collected array of TaskDoc
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
    if (frames.length === 0 || frames.at(0)!.authError) {
      return frames; // Propagate auth error
    }
    
    // Get the schedule ID(s) for the active user
    let userScheduleLookupFrames = await frames.query(ScheduleGenerator._getScheduleByOwner, { owner: activeUser }, { schedule: Symbol("userExternalScheduleId") });
    
    if (userScheduleLookupFrames.length === 0 || !userScheduleLookupFrames.at(0)![Symbol("userExternalScheduleId")]) {
        return new Frames({ ...originalRequestFrame, [tasksArray]: [] }); // No schedules for user, thus no tasks
    }
    const userExternalScheduleId = userScheduleLookupFrames.at(0)![Symbol("userExternalScheduleId")];

    // Get the internal schedule ID for the user's schedule
    let userFullScheduleFrames = await frames.query(
        ScheduleGenerator._getScheduleDetails,
        { schedule: userExternalScheduleId },
        { scheduleDetails: Symbol("userFullScheduleDoc") }
    );
    if (userFullScheduleFrames.length === 0) {
        return new Frames({ ...originalRequestFrame, [tasksArray]: [] }); // No full schedule details found
    }
    const userInternalScheduleId = userFullScheduleFrames.at(0)![Symbol("userFullScheduleDoc")][0].scheduleID;

    // Call the _getAllTasks concept query, which returns `[{ task: TaskDoc }, ...]`
    frames = await frames.query(ScheduleGenerator._getAllTasks, {}, { task: taskDoc });

    // Filter tasks to only include those belonging to the active user's schedule
    const filteredFrames = frames.filter($ => $[taskDoc].scheduleID === userInternalScheduleId);

    if (filteredFrames.length === 0) {
      return new Frames({ ...originalRequestFrame, [tasksArray]: [] });
    }

    // Collect individual taskDocs into an array under the 'tasksArray' key for response
    return filteredFrames.collectAs([taskDoc], tasksArray);
  },
  then: actions([
    Requesting.respond, 
    { 
        request, 
        tasks: tasksArray, // Map to 'tasks' key as per API spec
        error: Symbol('authError') // Catch auth error from where clause
    }
  ]),
});
```
