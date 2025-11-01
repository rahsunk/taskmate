---
timestamp: 'Fri Oct 31 2025 20:06:37 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251031_200637.4358cdf2.md]]'
content_id: 2ad5c1975f8c049d9fafd0ae847f8994d35955dd2e7a61eb08636b9aa9b107dd
---

# response:

The error "Two different types with this name exist, but they are unrelated" occurs because `RepeatFrequency` and `RepeatConfig` are defined both in your `ScheduleGeneratorConcept.ts` file (implicitly used by `EventDoc`) and explicitly again in your `ScheduleGeneratorConcept.test.ts` file. TypeScript sees these as two distinct types, even though they have the same name and structure.

To resolve this, you need to define these types once in `ScheduleGeneratorConcept.ts` and then export them so they can be imported and reused in the test file. This ensures a single source of truth for these type definitions.

Given the "Refactoring your concepts" instruction, it is appropriate to add `export` statements to the type definitions in the concept implementation file.

Here's how to update your files:

### 1. Update `src/ScheduleGenerator/ScheduleGeneratorConcept.ts`

Add the `export` keyword to `enum RepeatFrequency` and `interface RepeatConfig`:

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "../../utils/types.ts";
import { freshID } from "../../utils/database.ts";

// Declare collection prefix for MongoDB, using the concept name
const PREFIX = "ScheduleGenerator" + ".";

// Generic types as defined in the concept specification
type User = ID;      // External user identifier
type Schedule = ID;  // Internal identifier for a schedule document
type Event = ID;     // Internal identifier for an event document
type Task = ID;      // Internal identifier for a task document
type Percent = number; // Represents a percentage, typically a number between 0 and 100

// Define enum for repetition frequency types
export enum RepeatFrequency { // <-- ADDED EXPORT
  NONE = "NONE",
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY",
}

// Interface for repeat configurations: specifies frequency and optionally days of the week for weekly repeats.
export interface RepeatConfig { // <-- ADDED EXPORT
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
  // Access seq directly from result
  return result?.seq || 1;
}

/**
 * Helper to check for date equality (ignoring time).
 * @param d1
 * @param d2
 */
function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

/**
 * Helper to get the difference in minutes between two dates.
 */
function getMinutesDifference(date1: Date, date2: Date): number {
  return Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60);
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
  private readonly DAILY_TASK_END_HOUR = 22;  // Tasks can be scheduled until 10 PM

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

    const scheduleID = await getNextSequence(this.counters, "scheduleID_counter");
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
        error: `Event with ID ${oldEvent} not found or not associated with schedule ${schedule}.`,
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
        error: `Event with ID ${event} not found or not associated with schedule ${schedule}.`,
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
        error: `Task with ID ${oldTask} not found or not associated with schedule ${schedule}.`,
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
        error: `Task with ID ${task} not found or not associated with schedule ${schedule}.`,
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
  async generateSchedule({
    schedule,
  }: {
    schedule: Schedule;
  }): Promise<{ scheduleId?: Schedule; generatedPlan?: GeneratedSchedulePlan; error?: string }> {
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
          if (scheduledEventStartTime < scheduledEventEndTime && scheduledEventEndTime > new Date()) {
            generatedPlan.push({
              type: "event",
              originalId: event._id,
              name: event.name,
              scheduledStartTime: scheduledEventStartTime, // Explicitly assign property
              scheduledEndTime: scheduledEventEndTime,     // Explicitly assign property
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
          currentMerged.end = new Date(Math.max(currentMerged.end.getTime(), next.end.getTime()));
          currentMerged.durationMinutes = getMinutesDifference(currentMerged.start, currentMerged.end);
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
    freeTimeSlots = freeTimeSlots.filter(slot => slot.end > now);
    // Adjust start of past-overlapping slots to now
    freeTimeSlots = freeTimeSlots.map(slot => ({
      ...slot,
      start: slot.start < now ? now : slot.start,
      durationMinutes: slot.start < now ? getMinutesDifference(now, slot.end) : slot.durationMinutes
    }));
    // Remove slots with non-positive duration after adjustment
    freeTimeSlots = freeTimeSlots.filter(slot => slot.durationMinutes > 0);


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
      const remainingTaskDuration = task.expectedCompletionTime * (1 - task.completionLevel / 100); // Only schedule remaining work

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
        const effectiveSlotEnd = slot.end < taskDeadline ? slot.end : taskDeadline;
        const availableDurationInSlot = getMinutesDifference(slot.start, effectiveSlotEnd);

        if (availableDurationInSlot >= remainingTaskDuration) {
          // Task fits perfectly or with room to spare
          // Renamed local variables to avoid potential compiler confusion
          const taskScheduledStartTime = new Date(slot.start);
          const taskScheduledEndTime = new Date(taskScheduledStartTime.getTime() + remainingTaskDuration * 60 * 1000);

          generatedPlan.push({
            type: "task",
            originalId: task._id,
            name: task.name,
            scheduledStartTime: taskScheduledStartTime, // Use renamed variable
            scheduledEndTime: taskScheduledEndTime,   // Use renamed variable
          });

          // Update the free time slots array:
          // Remove the used portion, potentially splitting the slot
          freeTimeSlots = subtractTimeSlot(freeTimeSlots, taskScheduledStartTime, taskScheduledEndTime); // Use renamed variables
          // Re-sort and merge after modification to keep it clean for subsequent tasks
          freeTimeSlots.sort((a,b) => a.start.getTime() - b.start.getTime());

          taskScheduled = true;
          break;
        }
      }

      if (!taskScheduled) {
        unscheduledTasks.push(task);
      }
    }

    // Log conflicts if any tasks could not be scheduled
    if (unscheduledTasks.length > 0) {
      console.warn(
        `Warning: Could not fully schedule ${unscheduledTasks.length} tasks for schedule ${schedule}:`,
      );
      unscheduledTasks.forEach((task) => console.warn(`  - ${task.name} (ID: ${task._id}, Deadline: ${new Date(task.deadline).toLocaleDateString()})`));
      // Per spec "If doing this is not possible, then return an error."
      return {
        error: "Not all tasks could be scheduled within the planning horizon or available time slots.",
      };
    }

    // Sort the final generated plan by scheduled start time for chronological order
    generatedPlan.sort((a, b) => a.scheduledStartTime.getTime() - b.scheduledStartTime.getTime());

    return { scheduleId: existingSchedule._id, generatedPlan };
  }

  // --- Concept Queries (methods prefixed with '_' as per convention) ---

  /**
   * _getScheduleByOwner (owner: User): (schedule: Schedule)
   *
   * effects: Retrieves the ID of the schedule document associated with a given user owner.
   *
   * @param {Object} params - The query parameters.
   * @param {User} params.owner - The ID of the owner user.
   * @returns {Promise<{schedule?: Schedule; error?: string}>} - The schedule ID or an error message if not found.
   */
  async _getScheduleByOwner({ owner }: { owner: User }): Promise<{
    schedule?: Schedule;
    error?: string;
  }> {
    const scheduleDoc = await this.schedules.findOne({ owner });
    if (!scheduleDoc) {
      return { error: `No schedule found for owner ${owner}.` };
    }
    return { schedule: scheduleDoc._id };
  }

  /**
   * _getEventsForSchedule (schedule: Schedule): (events: Event[])
   *
   * effects: Retrieves an array of Event IDs that are linked to the specified schedule.
   *
   * @param {Object} params - The query parameters.
   * @param {Schedule} params.schedule - The ID of the schedule to retrieve events for.
   * @returns {Promise<{events?: Event[]; error?: string}>} - An array of event IDs or an error message.
   */
  async _getEventsForSchedule({ schedule }: { schedule: Schedule }): Promise<{
    event?: Event[]; // Changed 'events' to 'event' as per query return convention
    error?: string;
  }> {
    const existingSchedule = await this.schedules.findOne({ _id: schedule });
    if (!existingSchedule) {
      return { error: `Schedule with ID ${schedule} not found.` };
    }
    // Find all events that reference this schedule's internal ID
    const eventDocs = await this.events
      .find({ scheduleID: existingSchedule.scheduleID })
      .toArray();
    return { event: eventDocs.map((doc) => doc._id) }; // Return array of IDs under 'event' key
  }

  /**
   * _getTasksForSchedule (schedule: Schedule): (tasks: Task[])
   *
   * effects: Retrieves an array of Task IDs that are linked to the specified schedule.
   *
   * @param {Object} params - The query parameters.
   * @param {Schedule} params.schedule - The ID of the schedule to retrieve tasks for.
   * @returns {Promise<{tasks?: Task[]; error?: string}>} - An array of task IDs or an error message.
   */
  async _getTasksForSchedule({ schedule }: { schedule: Schedule }): Promise<{
    task?: Task[]; // Changed 'tasks' to 'task' as per query return convention
    error?: string;
  }> {
    const existingSchedule = await this.schedules.findOne({ _id: schedule });
    if (!existingSchedule) {
      return { error: `Schedule with ID ${schedule} not found.` };
    }
    // Find all tasks that reference this schedule's internal ID
    const taskDocs = await this.tasks
      .find({ scheduleID: existingSchedule.scheduleID })
      .toArray();
    return { task: taskDocs.map((doc) => doc._id) }; // Return array of IDs under 'task' key
  }

  /**
   * _getEventDetails (event: Event): (eventDetails: EventDoc)
   *
   * effects: Retrieves the full document details for a specific event.
   *
   * @param {Object} params - The query parameters.
   * @param {Event} params.event - The ID of the event to retrieve details for.
   * @returns {Promise<{eventDetails?: EventDoc[]; error?: string}>} - An array containing the event document or an error message.
   */
  async _getEventDetails({ event }: { event: Event }): Promise<{
    eventDetails?: EventDoc[]; // Query returns array of dicts
    error?: string;
  }> {
    const eventDoc = await this.events.findOne({ _id: event });
    if (!eventDoc) {
      return { error: `Event with ID ${event} not found.` };
    }
    return { eventDetails: [eventDoc] }; // Return as an array
  }

  /**
   * _getTaskDetails (task: Task): (taskDetails: TaskDoc)
   *
   * effects: Retrieves the full document details for a specific task.
   *
   * @param {Object} params - The query parameters.
   * @param {Task} params.task - The ID of the task to retrieve details for.
   * @returns {Promise<{taskDetails?: TaskDoc[]; error?: string}>} - An array containing the task document or an error message.
   */
  async _getTaskDetails({ task }: { task: Task }): Promise<{
    taskDetails?: TaskDoc[]; // Query returns array of dicts
    error?: string;
  }> {
    const taskDoc = await this.tasks.findOne({ _id: task });
    if (!taskDoc) {
      return { error: `Task with ID ${task} not found.` };
    }
    return { taskDetails: [taskDoc] }; // Return as an array
  }

  /**
   * _getAllSchedules (): (schedule: ScheduleDoc)
   *
   * requires: true
   *
   * effects: Returns an array of all `ScheduleDoc` objects.
   *
   * @returns {Promise<{schedule?: ScheduleDoc[]; error?: string}>} - An array of all schedule documents or an error.
   */
  async _getAllSchedules(): Promise<{
    schedule?: ScheduleDoc[];
    error?: string;
  }> {
    try {
      const scheduleDocs = await this.schedules.find({}).toArray();
      return { schedule: scheduleDocs };
    } catch (e: any) {
      console.error("Error in _getAllSchedules:", e);
      return { error: `Failed to retrieve all schedules: ${e.message}` };
    }
  }

  /**
   * _getScheduleDetails (schedule: Schedule): (scheduleDetails: ScheduleDoc)
   *
   * requires: `schedule` exists
   *
   * effects: Returns the `ScheduleDoc` object matching the provided ID.
   *
   * @param {Object} params - The query parameters.
   * @param {Schedule} params.schedule - The ID of the schedule to retrieve details for.
   * @returns {Promise<{scheduleDetails?: ScheduleDoc[]; error?: string}>} - An array containing the ScheduleDoc object or an error.
   */
  async _getScheduleDetails({ schedule }: { schedule: Schedule }): Promise<{
    scheduleDetails?: ScheduleDoc[];
    error?: string;
  }> {
    try {
      const scheduleDoc = await this.schedules.findOne({ _id: schedule });
      if (!scheduleDoc) {
        return { error: `Schedule with ID ${schedule} not found.` };
      }
      return { scheduleDetails: [scheduleDoc] };
    } catch (e: any) {
      console.error("Error in _getScheduleDetails:", e);
      return { error: `Failed to retrieve schedule details: ${e.message}` };
    }
  }

  /**
   * _getAllEvents (): (event: EventDoc)
   *
   * requires: true
   *
   * effects: Returns an array of all `EventDoc` objects.
   *
   * @returns {Promise<{event?: EventDoc[]; error?: string}>} - An array of all event documents or an error.
   */
  async _getAllEvents(): Promise<{
    event?: EventDoc[];
    error?: string;
  }> {
    try {
      const eventDocs = await this.events.find({}).toArray();
      return { event: eventDocs };
    } catch (e: any) {
      console.error("Error in _getAllEvents:", e);
      return { error: `Failed to retrieve all events: ${e.message}` };
    }
  }

  /**
   * _getAllTasks (): (task: TaskDoc)
   *
   * requires: true
   *
   * effects: Returns an array of all `TaskDoc` objects.
   *
   * @returns {Promise<{task?: TaskDoc[]; error?: string}>} - An array of all task documents or an error.
   */
  async _getAllTasks(): Promise<{
    task?: TaskDoc[];
    error?: string;
  }> {
    try {
      const taskDocs = await this.tasks.find({}).toArray();
      return { task: taskDocs };
    } catch (e: any) {
      console.error("Error in _getAllTasks:", e);
      return { error: `Failed to retrieve all tasks: ${e.message}` };
    }
  }
}
```

### 2. Update `src/ScheduleGenerator/ScheduleGeneratorConcept.test.ts`

Remove the duplicate local definitions of `RepeatFrequency` and `RepeatConfig` and import them from the concept file instead:

```typescript
// file: src/ScheduleGenerator/ScheduleGeneratorConcept.test.ts
import { assertEquals, assertExists, assertNotEquals, assertArrayIncludes, assert } from "jsr:@std/assert";
import { testDb } from "../../utils/database.ts";
import ScheduleGeneratorConcept, { RepeatFrequency, RepeatConfig } from "./ScheduleGeneratorConcept.ts"; // <-- UPDATED IMPORT
import { ID } from "../../utils/types.ts";

// Helper to get a date object for a specific day/time, relative to now
function getDate(daysOffset: number, hours: number, minutes: number = 0, seconds: number = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hours, minutes, seconds, 0);
  return date;
}

Deno.test("ScheduleGeneratorConcept - Operational Principle", async (t) => {
  const [db, client] = await testDb();
  const concept = new ScheduleGeneratorConcept(db);

  try {
    const userA = "user:Alice" as ID;
    let aliceScheduleId: ID;

    console.log("\n--- Test: Operational Principle ---");

    await t.step("1. Initialize Schedule for Alice", async () => {
      console.log(`Action: initializeSchedule({ owner: "${userA}" })`);
      const result = await concept.initializeSchedule({ owner: userA });
      assertExists(result.schedule, "Expected a schedule ID to be returned");
      assertNotEquals(result.schedule, "", "Schedule ID should not be empty");
      aliceScheduleId = result.schedule as ID; // Type assertion for TypeScript compiler
      console.log(`Result: { schedule: "${aliceScheduleId}" }`);

      // Verify via query
      const queryResult = await concept._getScheduleByOwner({ owner: userA });
      assertExists(queryResult.schedule, "Expected schedule to be found by owner");
      assertEquals(queryResult.schedule, aliceScheduleId, "Query should return the correct schedule ID");
      console.log(`Query _getScheduleByOwner({ owner: "${userA}" }): { schedule: "${queryResult.schedule}" }`);
    });

    let eventAId: ID; // Daily Standup
    let eventBId: ID; // Weekly Team Meeting
    let task1Id: ID; // Finish Report
    let task2Id: ID; // Review PRs

    await t.step("2. Add Events and Tasks", async () => {
      // Add a daily event for tomorrow from 9 AM to 10 AM
      const eventAStartTime = getDate(1, 9, 0);
      const eventAEndTime = getDate(1, 10, 0);
      const eventARepeat: RepeatConfig = { frequency: RepeatFrequency.DAILY };
      console.log(`Action: addEvent({ schedule: "${aliceScheduleId}", name: "Daily Standup", startTime: ${eventAStartTime.toISOString()}, endTime: ${eventAEndTime.toISOString()}, repeat: ${JSON.stringify(eventARepeat)} })`);
      const addEventAResult = await concept.addEvent({ schedule: aliceScheduleId, name: "Daily Standup", startTime: eventAStartTime, endTime: eventAEndTime, repeat: eventARepeat });
      assertExists(addEventAResult.event, "Expected event ID for Daily Standup");
      eventAId = addEventAResult.event as ID; // Type assertion
      console.log(`Result: { event: "${eventAId}" }`);

      // Add a weekly event for the next Tuesday from 2 PM to 3 PM
      const todayDay = new Date().getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const targetDayOfWeek = 2; // Tuesday
      const daysUntilTarget = (targetDayOfWeek - todayDay + 7) % 7;
      const eventBStartTime = getDate(daysUntilTarget, 14, 0);
      const eventBEndTime = getDate(daysUntilTarget, 15, 0);
      const eventBRepeat: RepeatConfig = { frequency: RepeatFrequency.WEEKLY, daysOfWeek: [targetDayOfWeek] };
      console.log(`Action: addEvent({ schedule: "${aliceScheduleId}", name: "Weekly Team Meeting", startTime: ${eventBStartTime.toISOString()}, endTime: ${eventBEndTime.toISOString()}, repeat: ${JSON.stringify(eventBRepeat)} })`);
      const addEventBResult = await concept.addEvent({ schedule: aliceScheduleId, name: "Weekly Team Meeting", startTime: eventBStartTime, endTime: eventBEndTime, repeat: eventBRepeat });
      assertExists(addEventBResult.event, "Expected event ID for Weekly Team Meeting");
      eventBId = addEventBResult.event as ID; // Type assertion
      console.log(`Result: { event: "${eventBId}" }`);

      // Add a high priority task due tomorrow, 2 hours expected completion, 0% complete
      const task1Deadline = getDate(1, 17, 0);
      console.log(`Action: addTask({ schedule: "${aliceScheduleId}", name: "Finish Report", deadline: ${task1Deadline.toISOString()}, expectedCompletionTime: 120, completionLevel: 0, priority: 90 })`);
      const addTask1Result = await concept.addTask({ schedule: aliceScheduleId, name: "Finish Report", deadline: task1Deadline, expectedCompletionTime: 120, completionLevel: 0, priority: 90 });
      assertExists(addTask1Result.task, "Expected task ID for Finish Report");
      task1Id = addTask1Result.task as ID; // Type assertion
      console.log(`Result: { task: "${task1Id}" }`);

      // Add a lower priority task due in 3 days, 1 hour expected completion, 50% complete
      const task2Deadline = getDate(3, 12, 0);
      console.log(`Action: addTask({ schedule: "${aliceScheduleId}", name: "Review PRs", deadline: ${task2Deadline.toISOString()}, expectedCompletionTime: 60, completionLevel: 50, priority: 50 })`);
      const addTask2Result = await concept.addTask({ schedule: aliceScheduleId, name: "Review PRs", deadline: task2Deadline, expectedCompletionTime: 60, completionLevel: 50, priority: 50 });
      assertExists(addTask2Result.task, "Expected task ID for Review PRs");
      task2Id = addTask2Result.task as ID; // Type assertion
      console.log(`Result: { task: "${task2Id}" }`);

      // Verify event and tasks via queries
      const eventsQueryResult = await concept._getEventsForSchedule({ schedule: aliceScheduleId });
      assertExists(eventsQueryResult.event, "Expected events array from query"); // Assert 'event' key
      assertEquals(eventsQueryResult.event.length, 2, "Should have 2 events");
      assertArrayIncludes(eventsQueryResult.event, [eventAId, eventBId]);
      console.log(`Query _getEventsForSchedule({ schedule: "${aliceScheduleId}" }): { event: ${JSON.stringify(eventsQueryResult.event)} }`);

      const tasksQueryResult = await concept._getTasksForSchedule({ schedule: aliceScheduleId });
      assertExists(tasksQueryResult.task, "Expected tasks array from query"); // Assert 'task' key
      assertEquals(tasksQueryResult.task.length, 2, "Should have 2 tasks");
      assertArrayIncludes(tasksQueryResult.task, [task1Id, task2Id]);
      console.log(`Query _getTasksForSchedule({ schedule: "${aliceScheduleId}" }): { task: ${JSON.stringify(tasksQueryResult.task)} }`);
    });

    await t.step("3. Generate Schedule and Verify Basic Content and Task Priority", async () => {
      console.log(`Action: generateSchedule({ schedule: "${aliceScheduleId}" })`);
      const result = await concept.generateSchedule({ schedule: aliceScheduleId });
      assertExists(result.generatedPlan, "Expected a generated schedule plan");
      assertExists(result.scheduleId, "Expected scheduleId in result");
      assertEquals(result.scheduleId, aliceScheduleId, "Returned scheduleId should match input");
      
      const generatedPlan = result.generatedPlan; // Type assertion
      assert(generatedPlan.length > 0, "Generated plan should not be empty");
      console.log(`Result: Generated plan with ${generatedPlan.length} items`);
      // console.log(JSON.stringify(generatedPlan, null, 2)); // Detailed log for debugging

      // Check if events are present (at least some instances, for daily/weekly repeats)
      const dailyStandups = generatedPlan.filter(item => item.name === "Daily Standup" && item.type === "event");
      assertNotEquals(dailyStandups.length, 0, "Expected Daily Standup events in the plan");

      const weeklyMeetings = generatedPlan.filter(item => item.name === "Weekly Team Meeting" && item.type === "event");
      // Check for at least one instance within the 7-day horizon if Tuesday is within it.
      const today = new Date();
      const targetDayOfWeek = 2; // Tuesday
      const isTuesdayInHorizon = Array.from({length: 7}, (_, i) => getDate(i, 0, 0).getDay()).includes(targetDayOfWeek);
      if (isTuesdayInHorizon) {
         assertNotEquals(weeklyMeetings.length, 0, "Expected Weekly Team Meeting events in the plan");
      }


      // Check if tasks are present and scheduled
      const finishReportTasks = generatedPlan.filter(item => item.originalId === task1Id && item.type === "task");
      assertEquals(finishReportTasks.length, 1, "Expected Finish Report task in the plan");

      const reviewPRsTasks = generatedPlan.filter(item => item.originalId === task2Id && item.type === "task");
      assertEquals(reviewPRsTasks.length, 1, "Expected Review PRs task in the plan");

      // Verify task scheduling logic (e.g., Finish Report before Review PRs, and before its deadline)
      const finishReportItem = finishReportTasks[0];
      const reviewPRsItem = reviewPRsTasks[0];
      assertExists(finishReportItem, "Finish Report item should exist");
      assertExists(reviewPRsItem, "Review PRs item should exist");

      const task1DetailsResult = await concept._getTaskDetails({ task: task1Id });
      assertExists(task1DetailsResult.taskDetails);
      const actualTask1Deadline = task1DetailsResult.taskDetails[0].deadline;

      assert(new Date(finishReportItem.scheduledEndTime) <= actualTask1Deadline, "Finish Report should be scheduled before its deadline");
      assert(new Date(finishReportItem.scheduledStartTime) < new Date(reviewPRsItem.scheduledStartTime), "Finish Report (higher priority, sooner deadline) should be scheduled before Review PRs");

      console.log("Schedule generation verified (basic content and task priority).");
    });

    await t.step("4. Edit an Event and Regenerate Schedule to see changes", async () => {
      // Edit Daily Standup to be 30 mins instead of 1 hour, and change its name
      const newEventAStartTime = getDate(1, 9, 0);
      const newEventAEndTime = getDate(1, 9, 30);
      const newEventARepeat: RepeatConfig = { frequency: RepeatFrequency.DAILY };
      console.log(`Action: editEvent({ schedule: "${aliceScheduleId}", oldEvent: "${eventAId}", name: "Daily Standup (Short)", startTime: ${newEventAStartTime.toISOString()}, endTime: ${newEventAEndTime.toISOString()}, repeat: ${JSON.stringify(newEventARepeat)} })`);
      const editResult = await concept.editEvent({ schedule: aliceScheduleId, oldEvent: eventAId, name: "Daily Standup (Short)", startTime: newEventAStartTime, endTime: newEventAEndTime, repeat: newEventARepeat });
      assertEquals(editResult, {}, "Expected empty result for successful editEvent");
      console.log("Result: {}");

      // Regenerate schedule
      console.log(`Action: generateSchedule({ schedule: "${aliceScheduleId}" }) (after event edit)`);
      const newGenerateResult = await concept.generateSchedule({ schedule: aliceScheduleId });
      assertExists(newGenerateResult.generatedPlan, "Expected a new generated schedule plan after event edit");

      const dailyStandupsAfterEdit = newGenerateResult.generatedPlan.filter(item => item.name === "Daily Standup (Short)" && item.type === "event");
      assertNotEquals(dailyStandupsAfterEdit.length, 0, "Expected edited Daily Standup events (with new name) in the plan");
      const firstEditedStandup = dailyStandupsAfterEdit[0];
      assertExists(firstEditedStandup, "First edited standup should exist");
      assertEquals(new Date(firstEditedStandup.scheduledEndTime).getTime() - new Date(firstEditedStandup.scheduledStartTime).getTime(), 30 * 60 * 1000, "Edited event duration should be 30 minutes");

      console.log("Event edit and schedule regeneration verified.");
    });

    await t.step("5. Edit a Task to be 100% complete and Regenerate Schedule", async () => {
      // Edit Finish Report task to be 100% complete
      const task1DetailsResult = await concept._getTaskDetails({ task: task1Id });
      assertExists(task1DetailsResult.taskDetails);
      const currentTask1 = task1DetailsResult.taskDetails[0];

      console.log(`Action: editTask({ schedule: "${aliceScheduleId}", oldTask: "${task1Id}", name: "${currentTask1.name}", deadline: ${currentTask1.deadline.toISOString()}, expectedCompletionTime: ${currentTask1.expectedCompletionTime}, completionLevel: 100, priority: ${currentTask1.priority} })`);
      const editTaskResult = await concept.editTask({
        schedule: aliceScheduleId,
        oldTask: task1Id,
        name: currentTask1.name,
        deadline: currentTask1.deadline,
        expectedCompletionTime: currentTask1.expectedCompletionTime,
        completionLevel: 100, // Set to 100%
        priority: currentTask1.priority,
      });
      assertEquals(editTaskResult, {}, "Expected empty result for successful editTask");
      console.log("Result: {}");

      // Regenerate schedule
      console.log(`Action: generateSchedule({ schedule: "${aliceScheduleId}" }) (after task completion edit)`);
      const newGenerateResult = await concept.generateSchedule({ schedule: aliceScheduleId });
      assertExists(newGenerateResult.generatedPlan, "Expected a new generated schedule plan after task completion edit");

      const finishReportTasksAfterCompletion = newGenerateResult.generatedPlan.filter(item => item.originalId === task1Id && item.type === "task");
      // It should still be in the plan but possibly with a different name if implementation marks it as "Completed"
      assertEquals(finishReportTasksAfterCompletion.length, 1, "Expected completed task to still be represented in the plan (e.g., as completed)");
      assertEquals(finishReportTasksAfterCompletion[0].name, `${currentTask1.name} (Completed)`);
      console.log("Task completion edit and schedule regeneration verified.");
    });

    await t.step("6. Delete a Task and Regenerate Schedule to confirm removal", async () => {
      console.log(`Action: deleteTask({ schedule: "${aliceScheduleId}", task: "${task2Id}" })`);
      const deleteResult = await concept.deleteTask({ schedule: aliceScheduleId, task: task2Id });
      assertEquals(deleteResult, {}, "Expected empty result for successful deleteTask");
      console.log("Result: {}");

      // Regenerate schedule
      console.log(`Action: generateSchedule({ schedule: "${aliceScheduleId}" }) (after task delete)`);
      const newGenerateResult = await concept.generateSchedule({ schedule: aliceScheduleId });
      assertExists(newGenerateResult.generatedPlan, "Expected a new generated schedule plan after task delete");

      const reviewPRsTasksAfterDelete = newGenerateResult.generatedPlan.filter(item => item.originalId === task2Id && item.type === "task");
      assertEquals(reviewPRsTasksAfterDelete.length, 0, "Expected Review PRs task to be absent from the plan after deletion");
      console.log("Task deletion and schedule regeneration verified.");
    });

  } finally {
    await client.close();
  }
});


Deno.test("ScheduleGeneratorConcept - Error and Edge Cases", async (t) => {
  const [db, client] = await testDb();
  const concept = new ScheduleGeneratorConcept(db);

  try {
    const userB = "user:Bob" as ID;
    let bobScheduleId: ID;

    console.log("\n--- Test: Error and Edge Cases ---");

    await t.step("1. Initialize schedule, then try to initialize again for the same user", async () => {
      console.log(`Action: initializeSchedule({ owner: "${userB}" })`);
      const initResult1 = await concept.initializeSchedule({ owner: userB });
      assertExists(initResult1.schedule);
      bobScheduleId = initResult1.schedule as ID; // Type assertion
      console.log(`Result: { schedule: "${bobScheduleId}" }`);

      console.log(`Action: initializeSchedule({ owner: "${userB}" }) (again)`);
      const initResult2 = await concept.initializeSchedule({ owner: userB });
      assertExists(initResult2.schedule);
      assertEquals(initResult2.schedule, bobScheduleId, "Should return existing schedule for same user");
      console.log(`Result: { schedule: "${initResult2.schedule}" }`);
    });

    await t.step("2. Add Event with invalid times", async () => {
      const startTime = getDate(1, 10, 0);
      const endTime = getDate(1, 9, 0); // End time before start time
      const repeat: RepeatConfig = { frequency: RepeatFrequency.NONE };
      console.log(`Action: addEvent({ schedule: "${bobScheduleId}", name: "Invalid Event", startTime: ${startTime.toISOString()}, endTime: ${endTime.toISOString()}, repeat: ${JSON.stringify(repeat)} })`);
      const result = await concept.addEvent({ schedule: bobScheduleId, name: "Invalid Event", startTime, endTime, repeat });
      assertExists(result.error, "Expected an error for invalid event times");
      assertEquals(result.error, "Event start time must be before end time.");
      console.log(`Result: { error: "${result.error}" }`);
    });

    await t.step("3. Add Event with WEEKLY repeat missing daysOfWeek", async () => {
      const startTime = getDate(1, 10, 0);
      const endTime = getDate(1, 11, 0);
      const repeat: RepeatConfig = { frequency: RepeatFrequency.WEEKLY }; // Missing daysOfWeek
      console.log(`Action: addEvent({ schedule: "${bobScheduleId}", name: "Invalid Weekly Event", startTime: ${startTime.toISOString()}, endTime: ${endTime.toISOString()}, repeat: ${JSON.stringify(repeat)} })`);
      const result = await concept.addEvent({ schedule: bobScheduleId, name: "Invalid Weekly Event", startTime, endTime, repeat });
      assertExists(result.error, "Expected an error for weekly event without daysOfWeek");
      assertEquals(result.error, "Weekly repeat events must specify at least one day of the week (0=Sunday, 6=Saturday).");
      console.log(`Result: { error: "${result.error}" }`);
    });

    await t.step("4. Add Task with invalid expectedCompletionTime", async () => {
      const deadline = getDate(2, 17, 0);
      console.log(`Action: addTask({ schedule: "${bobScheduleId}", name: "Invalid Task", deadline: ${deadline.toISOString()}, expectedCompletionTime: 0, completionLevel: 0, priority: 50 })`);
      const result = await concept.addTask({ schedule: bobScheduleId, name: "Invalid Task", deadline, expectedCompletionTime: 0, completionLevel: 0, priority: 50 });
      assertExists(result.error, "Expected an error for non-positive expectedCompletionTime");
      assertEquals(result.error, "Expected completion time must be positive.");
      console.log(`Result: { error: "${result.error}" }`);
    });

    await t.step("5. Add Task with invalid priority", async () => {
      const deadline = getDate(2, 17, 0);
      console.log(`Action: addTask({ schedule: "${bobScheduleId}", name: "Invalid Priority Task", deadline: ${deadline.toISOString()}, expectedCompletionTime: 60, completionLevel: 0, priority: 150 })`);
      const result = await concept.addTask({ schedule: bobScheduleId, name: "Invalid Priority Task", deadline, expectedCompletionTime: 60, completionLevel: 0, priority: 150 });
      assertExists(result.error, "Expected an error for invalid priority");
      assertEquals(result.error, "Priority must be between 0 and 100.");
      console.log(`Result: { error: "${result.error}" }`);
    });

    await t.step("6. Add Task with invalid completionLevel", async () => {
      const deadline = getDate(2, 17, 0);
      console.log(`Action: addTask({ schedule: "${bobScheduleId}", name: "Invalid Completion Task", deadline: ${deadline.toISOString()}, expectedCompletionTime: 60, completionLevel: -10, priority: 50 })`);
      const result = await concept.addTask({ schedule: bobScheduleId, name: "Invalid Completion Task", deadline, expectedCompletionTime: 60, completionLevel: -10, priority: 50 });
      assertExists(result.error, "Expected an error for invalid completionLevel");
      assertEquals(result.error, "Completion level must be between 0 and 100.");
      console.log(`Result: { error: "${result.error}" }`);
    });

    let eventCId: ID;
    await t.step("7. Try to edit/delete non-existent event or with wrong schedule context", async () => {
      const nonExistentId = "nonExistentEvent123" as ID;
      const startTime = getDate(1, 10, 0);
      const endTime = getDate(1, 11, 0);
      const repeat: RepeatConfig = { frequency: RepeatFrequency.NONE };

      console.log(`Action: editEvent({ schedule: "${bobScheduleId}", oldEvent: "${nonExistentId}", name: "Dummy", startTime: ${startTime.toISOString()}, endTime: ${endTime.toISOString()}, repeat: ${JSON.stringify(repeat)} })`);
      const editResult = await concept.editEvent({ schedule: bobScheduleId, oldEvent: nonExistentId, name: "Dummy", startTime, endTime, repeat });
      assertExists(editResult.error, "Expected error when editing non-existent event");
      assert(editResult.error.includes("not found or not associated"), "Error message should indicate not found/associated");
      console.log(`Result: { error: "${editResult.error}" }`);

      console.log(`Action: deleteEvent({ schedule: "${bobScheduleId}", event: "${nonExistentId}" })`);
      const deleteResult = await concept.deleteEvent({ schedule: bobScheduleId, event: nonExistentId });
      assertExists(deleteResult.error, "Expected error when deleting non-existent event");
      assert(deleteResult.error.includes("not found or not associated"), "Error message should indicate not found/associated");
      console.log(`Result: { error: "${deleteResult.error}" }`);

      // Add a valid event to test deletion with wrong schedule
      const addEventCResult = await concept.addEvent({ schedule: bobScheduleId, name: "Event C", startTime, endTime, repeat });
      assertExists(addEventCResult.event);
      eventCId = addEventCResult.event as ID; // Type assertion
    });

    await t.step("8. Try to delete event with non-existent schedule ID", async () => {
      const anotherScheduleId = "fakeSchedule123" as ID; // A fake, non-existent schedule ID
      console.log(`Action: deleteEvent({ schedule: "${anotherScheduleId}", event: "${eventCId}" })`);
      const deleteResult = await concept.deleteEvent({ schedule: anotherScheduleId, event: eventCId });
      assertExists(deleteResult.error, "Expected error when deleting event with non-existent schedule ID");
      assertEquals(deleteResult.error, `Schedule with ID ${anotherScheduleId} not found.`, "Expected schedule not found error");
      console.log(`Result: { error: "${deleteResult.error}" }`);
    });


    await t.step("9. Generate Schedule with impossible tasks (total time conflict)", async () => {
      // Add an event that blocks out most of the scheduling time for today
      const blockEventStartTime = getDate(0, 8, 0);
      const blockEventEndTime = getDate(0, 22, 0); // Blocks 8 AM to 10 PM today (14 hours)
      const blockRepeat: RepeatConfig = { frequency: RepeatFrequency.NONE };
      console.log(`Action: addEvent({ schedule: "${bobScheduleId}", name: "Blocking Event", startTime: ${blockEventStartTime.toISOString()}, endTime: ${blockEventEndTime.toISOString()}, repeat: ${JSON.stringify(blockRepeat)} })`);
      const blockEventResult = await concept.addEvent({ schedule: bobScheduleId, name: "Blocking Event", startTime: blockEventStartTime, endTime: blockEventEndTime, repeat: blockRepeat });
      assertExists(blockEventResult.event);
      const blockEventId = blockEventResult.event as ID; // Type assertion
      console.log(`Result: { event: "${blockEventId}" }`);

      // Add a task that requires significant time today, impossible to fit
      const impossibleTaskDeadline = getDate(0, 23, 0); // Due today
      console.log(`Action: addTask({ schedule: "${bobScheduleId}", name: "Impossible Task", deadline: ${impossibleTaskDeadline.toISOString()}, expectedCompletionTime: 60, completionLevel: 0, priority: 100 })`);
      const impossibleTaskResult = await concept.addTask({ schedule: bobScheduleId, name: "Impossible Task", deadline: impossibleTaskDeadline, expectedCompletionTime: 60, completionLevel: 0, priority: 100 });
      assertExists(impossibleTaskResult.task);
      const impossibleTaskId = impossibleTaskResult.task as ID; // Type assertion
      console.log(`Result: { task: "${impossibleTaskId}" }`);

      console.log(`Action: generateSchedule({ schedule: "${bobScheduleId}" })`);
      const generateResult = await concept.generateSchedule({ schedule: bobScheduleId });
      assertExists(generateResult.error, "Expected an error for impossible schedule generation");
      assertEquals(generateResult.error, "Not all tasks could be scheduled within the planning horizon or available time slots.", "Expected specific error message for unscheduled tasks");
      console.log(`Result: { error: "${generateResult.error}" }`);

      // Clean up blocking event and impossible task for subsequent tests
      await concept.deleteEvent({ schedule: bobScheduleId, event: blockEventId });
      await concept.deleteTask({ schedule: bobScheduleId, task: impossibleTaskId });
    });

  } finally {
    await client.close();
  }
});


Deno.test("ScheduleGeneratorConcept - Query Functionality", async (t) => {
  const [db, client] = await testDb();
  const concept = new ScheduleGeneratorConcept(db);

  try {
    const userC = "user:Charlie" as ID;
    let charlieScheduleId: ID;

    console.log("\n--- Test: Query Functionality ---");

    // Initialize schedule
    const initResult = await concept.initializeSchedule({ owner: userC });
    assertExists(initResult.schedule);
    charlieScheduleId = initResult.schedule as ID; // Type assertion
    console.log(`Initialized schedule for Charlie: ${charlieScheduleId}`);

    // Add an event
    const eventStartTime = getDate(1, 10, 0);
    const eventEndTime = getDate(1, 11, 0);
    const eventRepeat: RepeatConfig = { frequency: RepeatFrequency.DAILY };
    const addEventResult = await concept.addEvent({ schedule: charlieScheduleId, name: "Daily Scrum", startTime: eventStartTime, endTime: eventEndTime, repeat: eventRepeat });
    assertExists(addEventResult.event);
    const eventId = addEventResult.event as ID; // Type assertion
    console.log(`Added event: ${eventId}`);

    // Add a task
    const taskDeadline = getDate(2, 17, 0);
    const addTaskResult = await concept.addTask({ schedule: charlieScheduleId, name: "Write Docs", deadline: taskDeadline, expectedCompletionTime: 60, completionLevel: 0, priority: 70 });
    assertExists(addTaskResult.task);
    const taskId = addTaskResult.task as ID; // Type assertion
    console.log(`Added task: ${taskId}`);

    await t.step("1. _getScheduleByOwner (Positive & Negative)", async () => {
      console.log(`Query: _getScheduleByOwner({ owner: "${userC}" })`);
      const queryResult = await concept._getScheduleByOwner({ owner: userC });
      assertExists(queryResult.schedule, "Expected schedule to be found for Charlie");
      assertEquals(queryResult.schedule, charlieScheduleId);
      console.log(`Result: { schedule: "${queryResult.schedule}" }`);

      // Negative case
      const nonExistentUser = "user:NonExistent" as ID;
      console.log(`Query: _getScheduleByOwner({ owner: "${nonExistentUser}" })`);
      const negativeQueryResult = await concept._getScheduleByOwner({ owner: nonExistentUser });
      assertExists(negativeQueryResult.error, "Expected an error for non-existent owner");
      assert(negativeQueryResult.error.includes("No schedule found"), "Error message should indicate no schedule found");
      console.log(`Result: { error: "${negativeQueryResult.error}" }`);
    });

    await t.step("2. _getEventsForSchedule", async () => {
      console.log(`Query: _getEventsForSchedule({ schedule: "${charlieScheduleId}" })`);
      const queryResult = await concept._getEventsForSchedule({ schedule: charlieScheduleId });
      assertExists(queryResult.event, "Expected 'event' array in query result"); // Assert 'event' key
      assertEquals(queryResult.event.length, 1);
      assertEquals(queryResult.event[0], eventId);
      console.log(`Result: { event: ${JSON.stringify(queryResult.event)} }`);
    });

    await t.step("3. _getTasksForSchedule", async () => {
      console.log(`Query: _getTasksForSchedule({ schedule: "${charlieScheduleId}" })`);
      const queryResult = await concept._getTasksForSchedule({ schedule: charlieScheduleId });
      assertExists(queryResult.task, "Expected 'task' array in query result"); // Assert 'task' key
      assertEquals(queryResult.task.length, 1);
      assertEquals(queryResult.task[0], taskId);
      console.log(`Result: { task: ${JSON.stringify(queryResult.task)} }`);
    });

    await t.step("4. _getEventDetails (Positive & Negative)", async () => {
      console.log(`Query: _getEventDetails({ event: "${eventId}" })`);
      const queryResult = await concept._getEventDetails({ event: eventId });
      assertExists(queryResult.eventDetails, "Expected 'eventDetails' array in query result");
      assertEquals(queryResult.eventDetails.length, 1);
      assertEquals(queryResult.eventDetails[0]._id, eventId);
      assertEquals(queryResult.eventDetails[0].name, "Daily Scrum");
      console.log(`Result: { eventDetails: ${JSON.stringify(queryResult.eventDetails)} }`);

      // Negative case
      const nonExistentEvent = "nonExistentEventDetails" as ID;
      console.log(`Query: _getEventDetails({ event: "${nonExistentEvent}" })`);
      const negativeQueryResult = await concept._getEventDetails({ event: nonExistentEvent });
      assertExists(negativeQueryResult.error, "Expected an error for non-existent event");
      assert(negativeQueryResult.error.includes("not found"), "Error message should indicate not found");
      console.log(`Result: { error: "${negativeQueryResult.error}" }`);
    });

    await t.step("5. _getTaskDetails (Positive & Negative)", async () => {
      console.log(`Query: _getTaskDetails({ task: "${taskId}" })`);
      const queryResult = await concept._getTaskDetails({ task: taskId });
      assertExists(queryResult.taskDetails, "Expected 'taskDetails' array in query result");
      assertEquals(queryResult.taskDetails.length, 1);
      assertEquals(queryResult.taskDetails[0]._id, taskId);
      assertEquals(queryResult.taskDetails[0].name, "Write Docs");
      console.log(`Result: { taskDetails: ${JSON.stringify(queryResult.taskDetails)} }`);

      // Negative case
      const nonExistentTask = "nonExistentTaskDetails" as ID;
      console.log(`Query: _getTaskDetails({ task: "${nonExistentTask}" })`);
      const negativeQueryResult = await concept._getTaskDetails({ task: nonExistentTask });
      assertExists(negativeQueryResult.error, "Expected an error for non-existent task");
      assert(negativeQueryResult.error.includes("not found"), "Error message should indicate not found");
      console.log(`Result: { error: "${negativeQueryResult.error}" }`);
    });

    await t.step("6. _getAllSchedules", async () => {
      console.log(`Query: _getAllSchedules()`);
      const queryResult = await concept._getAllSchedules();
      assertExists(queryResult.schedule, "Expected 'schedule' array in query result");
      assert(queryResult.schedule.length >= 1, "Expected at least one schedule"); // At least Charlie's schedule should be there
      const charlieSchedule = queryResult.schedule.find(s => s._id === charlieScheduleId);
      assertExists(charlieSchedule, "Charlie's schedule should be present");
      assertEquals(charlieSchedule.owner, userC);
      console.log(`Result: Found ${queryResult.schedule.length} schedules.`);
    });

    await t.step("7. _getScheduleDetails (Positive & Negative)", async () => {
      console.log(`Query: _getScheduleDetails({ schedule: "${charlieScheduleId}" })`);
      const queryResult = await concept._getScheduleDetails({ schedule: charlieScheduleId });
      assertExists(queryResult.scheduleDetails, "Expected 'scheduleDetails' array in query result");
      assertEquals(queryResult.scheduleDetails.length, 1);
      assertEquals(queryResult.scheduleDetails[0]._id, charlieScheduleId);
      assertEquals(queryResult.scheduleDetails[0].owner, userC);
      console.log(`Result: { scheduleDetails: ${JSON.stringify(queryResult.scheduleDetails)} }`);

      // Negative case
      const nonExistentSchedule = "nonExistentScheduleDetails" as ID;
      console.log(`Query: _getScheduleDetails({ schedule: "${nonExistentSchedule}" })`);
      const negativeQueryResult = await concept._getScheduleDetails({ schedule: nonExistentSchedule });
      assertExists(negativeQueryResult.error, "Expected an error for non-existent schedule");
      assert(negativeQueryResult.error.includes("not found"), "Error message should indicate not found");
      console.log(`Result: { error: "${negativeQueryResult.error}" }`);
    });

    await t.step("8. _getAllEvents", async () => {
      console.log(`Query: _getAllEvents()`);
      const queryResult = await concept._getAllEvents();
      assertExists(queryResult.event, "Expected 'event' array in query result");
      assert(queryResult.event.length >= 1, "Expected at least one event"); // At least Charlie's event should be there
      const charlieEvent = queryResult.event.find(e => e._id === eventId);
      assertExists(charlieEvent, "Charlie's event should be present");
      assertEquals(charlieEvent.name, "Daily Scrum");
      console.log(`Result: Found ${queryResult.event.length} events.`);
    });

    await t.step("9. _getAllTasks", async () => {
      console.log(`Query: _getAllTasks()`);
      const queryResult = await concept._getAllTasks();
      assertExists(queryResult.task, "Expected 'task' array in query result");
      assert(queryResult.task.length >= 1, "Expected at least one task"); // At least Charlie's task should be there
      const charlieTask = queryResult.task.find(t => t._id === taskId);
      assertExists(charlieTask, "Charlie's task should be present");
      assertEquals(charlieTask.name, "Write Docs");
      console.log(`Result: Found ${queryResult.task.length} tasks.`);
    });

  } finally {
    await client.close();
  }
});
```
