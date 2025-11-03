---
timestamp: 'Mon Nov 03 2025 10:57:32 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251103_105732.38194290.md]]'
content_id: 2b3f2ba34db2a5847969b3e82e22ae32fc281f72a881068fb62d8aa31038c29e
---

# response:

Okay, the "overloading error" likely stems from how `Requesting.respond` is designed to be called: it expects a *single* JSON-like object for its response, not distinct successful and error parameters simultaneously, even if one is `undefined`. While the `actions` helper might dynamically build the object, having distinct syncs for success and error makes the flow explicit and robust against potential type inference or runtime issues.

To fix this, we will apply the pattern of having separate synchronization rules for successful query responses and error query responses, similar to how actions are handled (`RegisterResponseSuccess` vs `RegisterResponseError`).

First, we need to add two new helper query methods to your `ScheduleGeneratorConcept.ts` to facilitate the authorization logic cleanly, as the current `_getScheduleDetails` uses an external `Schedule` ID, but we also need to look up schedules by their internal numerical `scheduleID` for authorization.

**1. Update `src/ScheduleGenerator/ScheduleGeneratorConcept.ts`**

Add these two queries: `_getInternalScheduleIDsByOwner` and `_getScheduleByInternalScheduleID`.

```typescript
// # file: src/ScheduleGenerator/ScheduleGeneratorConcept.ts
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
enum RepeatFrequency {
  NONE = "NONE",
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY", // Added for new spec
  YEARLY = "YEARLY",   // Added for new spec
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
   * effects: Creates an empty schedule document, associating it with the `owner`.
   *          Assigns an incrementing `scheduleID` for internal concept use.
   *
   * @param {Object} params - The action parameters.
   * @param {User} params.owner - The ID of the user for whom to create the schedule.
   * @returns {Promise<{schedule?: Schedule; error?: string}>} - The ID of the newly created schedule document or an error message.
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
          "Weekly repeat events must specify at least one day of the week.",
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
          "Weekly repeat events must specify at least one day of the week.",
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
    completionLevel, // Added completionLevel
    priority,
  }: {
    schedule: Schedule;
    name: string;
    deadline: Date;
    expectedCompletionTime: number;
    completionLevel: Percent; // Added completionLevel type
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
          case RepeatFrequency.MONTHLY: // New case
            if (d.getDate() === eventDate.getDate()) {
              shouldSchedule = true;
            }
            break;
          case RepeatFrequency.YEARLY: // New case
            if (d.getDate() === eventDate.getDate() && d.getMonth() === eventDate.getMonth()) {
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
          // Renamed local variables to avoid potential compiler confusion
          const taskScheduledStartTime = new Date(slot.start);
          const taskScheduledEndTime = new Date(
            taskScheduledStartTime.getTime() +
              remainingTaskDuration * 60 * 1000,
          );

          generatedPlan.push({
            type: "task",
            originalId: task._id,
            name: task.name,
            scheduledStartTime: taskScheduledStartTime, // Use renamed variable
            scheduledEndTime: taskScheduledEndTime, // Use renamed variable
          });

          // Update the free time slots array:
          // Remove the used portion, potentially splitting the slot
          freeTimeSlots = subtractTimeSlot(
            freeTimeSlots,
            taskScheduledStartTime,
            taskScheduledEndTime,
          ); // Use renamed variables
          // Re-sort and merge after modification to keep it clean for subsequent tasks
          freeTimeSlots.sort((a, b) => a.start.getTime() - b.start.getTime());

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
      unscheduledTasks.forEach((task) =>
        console.warn(
          `  - ${task.name} (ID: ${task._id}, Deadline: ${
            new Date(task.deadline).toLocaleDateString()
          })`,
        )
      );
      // Per spec "If doing this is not possible, then return an error."
      return {
        error:
          "Not all tasks could be scheduled within the planning horizon or available time slots.",
      };
    }

    // Sort the final generated plan by scheduled start time for chronological order
    generatedPlan.sort(
      (a, b) => a.scheduledStartTime.getTime() - b.scheduledStartTime.getTime(),
    );

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
      // Per previous discussion, queries return empty array for no results,
      // but here we align with action-like error return for consistency in syncs.
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
   * requires: `event` exists
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
   * requires: `task` exists
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

  /**
   * _getInternalScheduleIDsByOwner (owner: User): (internalScheduleID: Number)[]
   *
   * requires: `owner` exists.
   *
   * effects: Retrieves an array of internal numerical schedule IDs associated with a given user owner.
   *
   * @param {Object} params - The query parameters.
   * @param {User} params.owner - The ID of the owner user.
   * @returns {Promise<{internalScheduleID?: number[]; error?: string}>} - An array of internal schedule IDs or an error message.
   */
  async _getInternalScheduleIDsByOwner({ owner }: { owner: User }): Promise<{
    internalScheduleID?: number[];
    error?: string;
  }> {
    try {
      const scheduleDocs = await this.schedules.find({ owner }).project({ scheduleID: 1 }).toArray();
      return { internalScheduleID: scheduleDocs.map(doc => doc.scheduleID) };
    } catch (e: any) {
      console.error("Error in _getInternalScheduleIDsByOwner:", e);
      return { error: `Failed to retrieve internal schedule IDs: ${e.message}` };
    }
  }
}
```

**2. Create `src/syncs/ScheduleGenerator.sync.ts`**

Now, here are the synchronizations for `ScheduleGenerator`, implementing session-based authorization and handling responses for success and error separately.

```typescript
// # file: src/syncs/ScheduleGenerator.sync.ts

import { actions, Frames, Sync, symbol } from "@engine";
import { Requesting, Sessioning, ScheduleGenerator } from "@concepts";
import { ID } from "../utils/types.ts"; // Assuming types.ts is in ../utils
import { ScheduleDoc, EventDoc, TaskDoc } from "../concepts/ScheduleGenerator/ScheduleGeneratorConcept.ts"; // Import doc types for clarity

// --- Helper for Session and Authorization ---

// Helper for session check (requires Requesting.request to have a 'session' parameter)
const queryRequiresSession = async (
  frames: Frames,
  sessionVar: symbol,
  activeUserVar: symbol, // Symbol to bind the active user ID to
): Promise<Frames> => {
  const originalFrame = frames.at(0);
  if (!originalFrame) return new Frames(); // Should not happen if a Requesting.request fired it.

  // Ensure session exists in the original request frame
  const sessionId = originalFrame[sessionVar];
  if (!sessionId) {
    return new Frames({ ...originalFrame, [symbol("error")]: "Session ID missing from request." });
  }

  const sessionFrames = await frames.query(
    Sessioning._getUser,
    { session: sessionId },
    { user: activeUserVar },
  );

  // Sessioning._getUser returns an array. If it's empty, the session is invalid.
  if (sessionFrames.length === 0) {
    return new Frames({ ...originalFrame, [symbol("error")]: "Session invalid or expired." });
  }

  // Augment original frame with activeUser for subsequent steps
  return new Frames({ ...originalFrame, [activeUserVar]: sessionFrames.at(0)![activeUserVar] });
};

// Helper for checking session and schedule ownership
const authorizeScheduleAccess = async (
  frames: Frames,
  sessionVar: symbol, // Symbol for the session ID in the incoming Requesting.request frame
  scheduleIdVar: symbol, // Symbol for the schedule ID in the incoming Requesting.request frame
  activeUserVar: symbol, // Symbol to bind the active user ID to
): Promise<Frames> => {
  let currentFrames = frames;
  const originalRequestFrame = currentFrames.at(0); // Preserve original request details

  if (!originalRequestFrame) return new Frames();

  // 1. Get the active user from the session
  currentFrames = await queryRequiresSession(frames, sessionVar, activeUserVar);
  if (currentFrames.at(0)![symbol("error")]) {
    // Error already attached by queryRequiresSession if session invalid
    return new Frames({ ...originalRequestFrame, [symbol("error")]: currentFrames.at(0)![symbol("error")] });
  }

  const activeUserId = currentFrames.at(0)![activeUserVar];
  const requestedScheduleId = originalRequestFrame[scheduleIdVar] as ID;

  // 2. Get the schedule details to check its owner
  const scheduleDetailsResult = await ScheduleGenerator._getScheduleDetails({ schedule: requestedScheduleId });

  if (scheduleDetailsResult.error) {
    return new Frames({ ...originalRequestFrame, [symbol("error")]: scheduleDetailsResult.error });
  }
  if (!scheduleDetailsResult.scheduleDetails || scheduleDetailsResult.scheduleDetails.length === 0) {
    return new Frames({ ...originalRequestFrame, [symbol("error")]: `Schedule with ID ${requestedScheduleId} not found.` });
  }

  const scheduleOwner = scheduleDetailsResult.scheduleDetails[0].owner;

  // 3. Filter to ensure the activeUser (from session) is the owner of the schedule
  if (activeUserId !== scheduleOwner) {
    return new Frames({ ...originalRequestFrame, [symbol("error")]: "Unauthorized: You do not own this schedule." });
  }

  // If authorized, return the original frame augmented with activeUser for consistency
  return new Frames({ ...originalRequestFrame, [activeUserVar]: activeUserId });
};

// Helper for authorizing access to an individual event/task by ensuring schedule ownership
const authorizeIndividualItemAccess = async (
  frames: Frames,
  sessionVar: symbol,
  itemIdVar: symbol, // This will be eventId or taskId
  itemDetailsQuery: (args: { [k: string]: ID }) => Promise<{ [k: string]: unknown }[] | { error: string }>, // e.g., ScheduleGenerator._getEventDetails
  activeUserVar: symbol,
): Promise<Frames> => {
  let currentFrames = frames;
  const originalRequestFrame = currentFrames.at(0);
  if (!originalRequestFrame) return new Frames();

  // 1. Get active user from session
  currentFrames = await queryRequiresSession(frames, sessionVar, activeUserVar);
  if (currentFrames.at(0)![symbol("error")]) {
    return new Frames({ ...originalRequestFrame, [symbol("error")]: currentFrames.at(0)![symbol("error")] });
  }
  const activeUserId = currentFrames.at(0)![activeUserVar];
  const itemId = originalRequestFrame[itemIdVar] as ID;

  // 2. Get item details (event or task) to find its scheduleID and actual owner
  const queryArgName = itemIdVar.description === 'event' ? 'event' : 'task'; // Determine the argument name for the query
  const itemDetailsResult = await itemDetailsQuery({ [queryArgName]: itemId });

  if (itemDetailsResult && 'error' in itemDetailsResult) { // Check for error object
    return new Frames({ ...originalRequestFrame, [symbol("error")]: itemDetailsResult.error });
  }
  if (!itemDetailsResult || itemDetailsResult.length === 0) {
    return new Frames({ ...originalRequestFrame, [symbol("error")]: `Item with ID ${itemId} not found.` });
  }

  const itemDoc = itemDetailsResult[0];
  const internalScheduleID = (itemDoc as any).eventDetails?.scheduleID || (itemDoc as any).taskDetails?.scheduleID;

  if (internalScheduleID === undefined) {
    return new Frames({ ...originalRequestFrame, [symbol("error")]: `Could not determine schedule for item ${itemId}.` });
  }

  // 3. Get schedule details using the internal schedule ID
  const scheduleDocResult = await ScheduleGenerator._getScheduleByInternalScheduleID({ internalScheduleID: internalScheduleID });
  if (scheduleDocResult.error) {
    return new Frames({ ...originalRequestFrame, [symbol("error")]: scheduleDocResult.error });
  }
  if (!scheduleDocResult.scheduleDetails || scheduleDocResult.scheduleDetails.length === 0) {
    return new Frames({ ...originalRequestFrame, [symbol("error")]: `Schedule for item ${itemId} not found.` });
  }
  const scheduleOwner = scheduleDocResult.scheduleDetails[0].owner;

  // 4. Authorize ownership: active user must be the owner of the schedule
  if (activeUserId !== scheduleOwner) {
    return new Frames({ ...originalRequestFrame, [symbol("error")]: "Unauthorized: You do not own this item's schedule." });
  }

  // If authorized, return the original frame augmented with activeUser
  return new Frames({ ...originalRequestFrame, [activeUserVar]: activeUserId, [itemIdVar]: itemId });
};


// Helper function for queries that retrieve all items (full docs) for the active user
const getAllItemDocsForActiveUser = async (
  frames: Frames,
  sessionVar: symbol,
  activeUserVar: symbol,
  conceptInstance: ScheduleGenerator, // The concept instance itself
  collectionName: "events" | "tasks", // Specify which collection to query
  resultsVar: symbol, // e.g., symbol("event") or symbol("task") - the key in the final response
): Promise<Frames> => {
  const originalRequestFrame = frames.at(0);
  if (!originalRequestFrame) return new Frames();

  // 1. Get active user from session
  let currentFrames = await queryRequiresSession(frames, sessionVar, activeUserVar);
  if (currentFrames.at(0)![symbol("error")]) {
    return new Frames({ ...originalRequestFrame, [symbol("error")]: currentFrames.at(0)![symbol("error")] });
  }
  const activeUserId = currentFrames.at(0)![activeUserVar];

  // 2. Get all internal schedule IDs for the active user
  const internalScheduleIDsResult = await conceptInstance._getInternalScheduleIDsByOwner({ owner: activeUserId as ID });
  if (internalScheduleIDsResult.error) {
    return new Frames({ ...originalRequestFrame, [symbol("error")]: internalScheduleIDsResult.error });
  }
  const internalScheduleIDs = internalScheduleIDsResult.internalScheduleID;

  if (!internalScheduleIDs || internalScheduleIDs.length === 0) {
    // User has no schedules, return empty array for the results key
    return new Frames({ ...originalRequestFrame, [resultsVar]: [] });
  }

  // 3. Find all items (events/tasks) linked to these internal schedule IDs
  const itemCollection = conceptInstance[collectionName];
  const allItemDocs = await itemCollection.find({ scheduleID: { $in: internalScheduleIDs } }).toArray();

  // Return a single frame with the collected item documents
  return new Frames({ ...originalRequestFrame, [resultsVar]: allItemDocs });
};


// --- ScheduleGenerator Actions ---

// initializeSchedule
export const InitializeScheduleRequest: Sync = ({ request, session, owner, activeUser }) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/initializeSchedule", session, owner },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames.at(0);
    if (!originalFrame) return new Frames();

    // Check session
    frames = await queryRequiresSession(frames, session, activeUser);
    if (frames.at(0)![symbol("error")]) {
      return new Frames({ ...originalFrame, error: frames.at(0)![symbol("error")] });
    }
    // Authorization: User can only initialize a schedule for themselves
    if (frames.at(0)![activeUser] !== originalFrame[owner]) {
      return new Frames({ ...originalFrame, error: "Unauthorized: Cannot initialize schedule for another user." });
    }
    // If user already has a schedule, _initializeSchedule handles returning existing one.
    return frames;
  },
  then: actions([ScheduleGenerator.initializeSchedule, { owner }]),
});

export const InitializeScheduleResponseSuccess: Sync = ({ request, schedule }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/initializeSchedule" }, { request }],
    [ScheduleGenerator.initializeSchedule, {}, { schedule }], // Matches successful action output
  ),
  then: actions([Requesting.respond, { request, schedule }]),
});

export const InitializeScheduleResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/initializeSchedule" }, { request }],
    [ScheduleGenerator.initializeSchedule, {}, { error }], // Matches error action output
  ),
  then: actions([Requesting.respond, { request, error }]),
});


// addEvent
export const AddEventRequest: Sync = (
  { request, session, schedule: scheduleId, name, startTime, endTime, repeat, activeUser },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/ScheduleGenerator/addEvent",
      session,
      schedule: scheduleId,
      name,
      startTime,
      endTime,
      repeat,
    },
    { request },
  ]),
  where: async (frames) => {
    const authorizedFrames = await authorizeScheduleAccess(frames, session, scheduleId, activeUser);
    if (authorizedFrames.at(0)![symbol("error")]) {
      return new Frames({ ...frames.at(0), error: authorizedFrames.at(0)![symbol("error")] });
    }
    return authorizedFrames;
  },
  then: actions([
    ScheduleGenerator.addEvent,
    { schedule: scheduleId, name, startTime, endTime, repeat },
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
export const EditEventRequest: Sync = (
  { request, session, schedule: scheduleId, oldEvent: oldEventId, name, startTime, endTime, repeat, activeUser },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/ScheduleGenerator/editEvent",
      session,
      schedule: scheduleId,
      oldEvent: oldEventId,
      name,
      startTime,
      endTime,
      repeat,
    },
    { request },
  ]),
  where: async (frames) => {
    const authorizedFrames = await authorizeScheduleAccess(frames, session, scheduleId, activeUser);
    if (authorizedFrames.at(0)![symbol("error")]) {
      return new Frames({ ...frames.at(0), error: authorizedFrames.at(0)![symbol("error")] });
    }
    return authorizedFrames;
  },
  then: actions([
    ScheduleGenerator.editEvent,
    { schedule: scheduleId, oldEvent: oldEventId, name, startTime, endTime, repeat },
  ]),
});

export const EditEventResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/editEvent" }, { request }],
    [ScheduleGenerator.editEvent, {}, {}],
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
export const DeleteEventRequest: Sync = (
  { request, session, schedule: scheduleId, event: eventId, activeUser },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/deleteEvent", session, schedule: scheduleId, event: eventId },
    { request },
  ]),
  where: async (frames) => {
    const authorizedFrames = await authorizeScheduleAccess(frames, session, scheduleId, activeUser);
    if (authorizedFrames.at(0)![symbol("error")]) {
      return new Frames({ ...frames.at(0), error: authorizedFrames.at(0)![symbol("error")] });
    }
    return authorizedFrames;
  },
  then: actions([ScheduleGenerator.deleteEvent, { schedule: scheduleId, event: eventId }]),
});

export const DeleteEventResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/deleteEvent" }, { request }],
    [ScheduleGenerator.deleteEvent, {}, {}],
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
export const AddTaskRequest: Sync = (
  { request, session, schedule: scheduleId, name, deadline, expectedCompletionTime, completionLevel, priority, activeUser },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/ScheduleGenerator/addTask",
      session,
      schedule: scheduleId,
      name,
      deadline,
      expectedCompletionTime,
      completionLevel,
      priority,
    },
    { request },
  ]),
  where: async (frames) => {
    const authorizedFrames = await authorizeScheduleAccess(frames, session, scheduleId, activeUser);
    if (authorizedFrames.at(0)![symbol("error")]) {
      return new Frames({ ...frames.at(0), error: authorizedFrames.at(0)![symbol("error")] });
    }
    return authorizedFrames;
  },
  then: actions([
    ScheduleGenerator.addTask,
    { schedule: scheduleId, name, deadline, expectedCompletionTime, completionLevel, priority },
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
export const EditTaskRequest: Sync = (
  { request, session, schedule: scheduleId, oldTask: oldTaskId, name, deadline, expectedCompletionTime, completionLevel, priority, activeUser },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/ScheduleGenerator/editTask",
      session,
      schedule: scheduleId,
      oldTask: oldTaskId,
      name,
      deadline,
      expectedCompletionTime,
      completionLevel,
      priority,
    },
    { request },
  ]),
  where: async (frames) => {
    const authorizedFrames = await authorizeScheduleAccess(frames, session, scheduleId, activeUser);
    if (authorizedFrames.at(0)![symbol("error")]) {
      return new Frames({ ...frames.at(0), error: authorizedFrames.at(0)![symbol("error")] });
    }
    return authorizedFrames;
  },
  then: actions([
    ScheduleGenerator.editTask,
    { schedule: scheduleId, oldTask: oldTaskId, name, deadline, expectedCompletionTime, completionLevel, priority },
  ]),
});

export const EditTaskResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/editTask" }, { request }],
    [ScheduleGenerator.editTask, {}, {}],
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
export const DeleteTaskRequest: Sync = (
  { request, session, schedule: scheduleId, task: taskId, activeUser },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/deleteTask", session, schedule: scheduleId, task: taskId },
    { request },
  ]),
  where: async (frames) => {
    const authorizedFrames = await authorizeScheduleAccess(frames, session, scheduleId, activeUser);
    if (authorizedFrames.at(0)![symbol("error")]) {
      return new Frames({ ...frames.at(0), error: authorizedFrames.at(0)![symbol("error")] });
    }
    return authorizedFrames;
  },
  then: actions([ScheduleGenerator.deleteTask, { schedule: scheduleId, task: taskId }]),
});

export const DeleteTaskResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/deleteTask" }, { request }],
    [ScheduleGenerator.deleteTask, {}, {}],
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
export const GenerateScheduleRequest: Sync = (
  { request, session, schedule: scheduleId, activeUser },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/generateSchedule", session, schedule: scheduleId },
    { request },
  ]),
  where: async (frames) => {
    const authorizedFrames = await authorizeScheduleAccess(frames, session, scheduleId, activeUser);
    if (authorizedFrames.at(0)![symbol("error")]) {
      return new Frames({ ...frames.at(0), error: authorizedFrames.at(0)![symbol("error")] });
    }
    return authorizedFrames;
  },
  then: actions([ScheduleGenerator.generateSchedule, { schedule: scheduleId }]),
});

export const GenerateScheduleResponseSuccess: Sync = ({ request, scheduleId, generatedPlan }) => ({
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

// --- ScheduleGenerator Queries ---

// _getScheduleByOwner
export const GetScheduleByOwnerRequest: Sync = ({ request, session, owner, activeUser }) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getScheduleByOwner", session, owner },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames.at(0);
    if (!originalFrame) return new Frames();

    frames = await queryRequiresSession(frames, session, activeUser);
    if (frames.at(0)![symbol("error")]) {
      return new Frames({ ...originalFrame, error: frames.at(0)![symbol("error")] });
    }

    // Authorization: only allow a user to get their own schedule by owner ID
    if (frames.at(0)![activeUser] !== originalFrame[owner]) {
      return new Frames({ ...originalFrame, error: "Unauthorized: Cannot retrieve schedule for other users." });
    }

    const requestedOwner = originalFrame[owner] as ID;
    const queryResult = await ScheduleGenerator._getScheduleByOwner({ owner: requestedOwner });

    // Handle query's potential error or empty result:
    if (queryResult.error) {
      return new Frames({ ...originalFrame, error: queryResult.error });
    }
    if (queryResult.schedule) {
      return new Frames({ ...originalFrame, schedule: queryResult.schedule });
    }
    // If no schedule found, return null explicitly for success response structure
    return new Frames({ ...originalFrame, schedule: null });
  },
  then: actions([
    Requesting.respond,
    {
      request: symbol("request"),
      schedule: symbol("schedule"), // Will be an ID or null
      error: symbol("error") // Will be undefined if no error
    }
  ]),
});


// _getEventsForSchedule
export const GetEventsForScheduleRequest: Sync = (
  { request, session, schedule: scheduleId, activeUser },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getEventsForSchedule", session, schedule: scheduleId },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames.at(0);
    if (!originalFrame) return new Frames();

    frames = await authorizeScheduleAccess(frames, session, scheduleId, activeUser);
    if (frames.at(0)![symbol("error")]) {
      return new Frames({ ...originalFrame, error: frames.at(0)![symbol("error")] });
    }

    const queryResult = await ScheduleGenerator._getEventsForSchedule({ schedule: scheduleId as ID });
    if (queryResult.error) {
      return new Frames({ ...originalFrame, error: queryResult.error });
    }
    if (queryResult.event) {
      return new Frames({ ...originalFrame, event: queryResult.event });
    }
    // If no events found, return empty array explicitly
    return new Frames({ ...originalFrame, event: [] });
  },
  then: actions([
    Requesting.respond,
    {
      request: symbol("request"),
      event: symbol("event"), // Will be an array of Event IDs or empty array
      error: symbol("error") // Will be undefined if no error
    }
  ]),
});


// _getTasksForSchedule
export const GetTasksForScheduleRequest: Sync = (
  { request, session, schedule: scheduleId, activeUser },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getTasksForSchedule", session, schedule: scheduleId },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames.at(0);
    if (!originalFrame) return new Frames();

    frames = await authorizeScheduleAccess(frames, session, scheduleId, activeUser);
    if (frames.at(0)![symbol("error")]) {
      return new Frames({ ...originalFrame, error: frames.at(0)![symbol("error")] });
    }

    const queryResult = await ScheduleGenerator._getTasksForSchedule({ schedule: scheduleId as ID });
    if (queryResult.error) {
      return new Frames({ ...originalFrame, error: queryResult.error });
    }
    if (queryResult.task) {
      return new Frames({ ...originalFrame, task: queryResult.task });
    }
    // If no tasks found, return empty array explicitly
    return new Frames({ ...originalFrame, task: [] });
  },
  then: actions([
    Requesting.respond,
    {
      request: symbol("request"),
      task: symbol("task"), // Will be an array of Task IDs or empty array
      error: symbol("error") // Will be undefined if no error
    }
  ]),
});


// _getEventDetails
export const GetEventDetailsRequest: Sync = (
  { request, session, event: eventId, activeUser },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getEventDetails", session, event: eventId },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames.at(0);
    if (!originalFrame) return new Frames();

    frames = await authorizeIndividualItemAccess(frames, session, eventId, ScheduleGenerator._getEventDetails, activeUser);
    if (frames.at(0)![symbol("error")]) {
      return new Frames({ ...originalFrame, error: frames.at(0)![symbol("error")] });
    }

    const queryResult = await ScheduleGenerator._getEventDetails({ event: eventId as ID });
    if (queryResult.error) {
      return new Frames({ ...originalFrame, error: queryResult.error });
    }
    if (queryResult.eventDetails && queryResult.eventDetails.length > 0) {
      return new Frames({ ...originalFrame, eventDetails: queryResult.eventDetails[0] }); // Return single object
    }
    // If no details found, return null explicitly
    return new Frames({ ...originalFrame, eventDetails: null });
  },
  then: actions([
    Requesting.respond,
    {
      request: symbol("request"),
      eventDetails: symbol("eventDetails"), // Will be an object or null
      error: symbol("error") // Will be undefined if no error
    }
  ]),
});


// _getTaskDetails
export const GetTaskDetailsRequest: Sync = (
  { request, session, task: taskId, activeUser },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getTaskDetails", session, task: taskId },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames.at(0);
    if (!originalFrame) return new Frames();

    frames = await authorizeIndividualItemAccess(frames, session, taskId, ScheduleGenerator._getTaskDetails, activeUser);
    if (frames.at(0)![symbol("error")]) {
      return new Frames({ ...originalFrame, error: frames.at(0)![symbol("error")] });
    }

    const queryResult = await ScheduleGenerator._getTaskDetails({ task: taskId as ID });
    if (queryResult.error) {
      return new Frames({ ...originalFrame, error: queryResult.error });
    }
    if (queryResult.taskDetails && queryResult.taskDetails.length > 0) {
      return new Frames({ ...originalFrame, taskDetails: queryResult.taskDetails[0] }); // Return single object
    }
    // If no details found, return null explicitly
    return new Frames({ ...originalFrame, taskDetails: null });
  },
  then: actions([
    Requesting.respond,
    {
      request: symbol("request"),
      taskDetails: symbol("taskDetails"), // Will be an object or null
      error: symbol("error") // Will be undefined if no error
    }
  ]),
});


// _getAllSchedules (for active user)
export const GetAllSchedulesRequest: Sync = ({ request, session, activeUser }) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getAllSchedules", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames.at(0);
    if (!originalFrame) return new Frames();

    // 1. Ensure an active session
    frames = await queryRequiresSession(frames, session, activeUser);
    if (frames.at(0)![symbol("error")]) {
      return new Frames({ ...originalFrame, error: frames.at(0)![symbol("error")] });
    }

    const activeUserId = frames.at(0)![activeUser];

    // 2. Query all schedules owned by the active user (using _getScheduleByOwner)
    // _getScheduleByOwner returns {schedule?: Schedule; error?: string}.
    // Since each user has exactly one schedule, we expect at most one result.
    const scheduleIDsResult = await ScheduleGenerator._getScheduleByOwner({ owner: activeUserId as ID });
    if (scheduleIDsResult.error) {
      // If _getScheduleByOwner returns an error, pass it on
      return new Frames({ ...originalFrame, error: scheduleIDsResult.error });
    }
    const scheduleId = scheduleIDsResult.schedule;

    if (!scheduleId) { // If user has no schedules
      return new Frames({ ...originalFrame, schedule: [] });
    }

    // Now query for the details of this specific schedule (which is owned by the user)
    const scheduleDetailsResult = await ScheduleGenerator._getScheduleDetails({ schedule: scheduleId });
    if (scheduleDetailsResult.error) {
      return new Frames({ ...originalFrame, error: scheduleDetailsResult.error });
    }
    if (scheduleDetailsResult.scheduleDetails && scheduleDetailsResult.scheduleDetails.length > 0) {
      // Return a single frame with the collected schedule documents (as an array, since API spec expects array)
      return new Frames({ ...originalFrame, schedule: [scheduleDetailsResult.scheduleDetails[0]] });
    }
    // This case should ideally not be reached if _getScheduleByOwner already returned a schedule ID.
    return new Frames({ ...originalFrame, schedule: [] });
  },
  then: actions([
    Requesting.respond,
    {
      request: symbol("request"),
      schedule: symbol("schedule"), // Will be an array of ScheduleDoc or empty array
      error: symbol("error") // Will be undefined if no error
    }
  ]),
});


// _getScheduleDetails
export const GetScheduleDetailsRequest: Sync = (
  { request, session, schedule: scheduleId, activeUser },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getScheduleDetails", session, schedule: scheduleId },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames.at(0);
    if (!originalFrame) return new Frames();

    frames = await authorizeScheduleAccess(frames, session, scheduleId, activeUser);
    if (frames.at(0)![symbol("error")]) {
      return new Frames({ ...originalFrame, error: frames.at(0)![symbol("error")] });
    }

    const queryResult = await ScheduleGenerator._getScheduleDetails({ schedule: scheduleId as ID });
    if (queryResult.error) {
      return new Frames({ ...originalFrame, error: queryResult.error });
    }
    if (queryResult.scheduleDetails && queryResult.scheduleDetails.length > 0) {
      return new Frames({ ...originalFrame, scheduleDetails: queryResult.scheduleDetails[0] }); // Return single object
    }
    // If no details found, return null explicitly
    return new Frames({ ...originalFrame, scheduleDetails: null });
  },
  then: actions([
    Requesting.respond,
    {
      request: symbol("request"),
      scheduleDetails: symbol("scheduleDetails"), // Will be an object or null
      error: symbol("error") // Will be undefined if no error
    }
  ]),
});


// _getAllEvents (for active user)
export const GetAllEventsRequest: Sync = ({ request, session, activeUser }) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getAllEvents", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames.at(0);
    if (!originalFrame) return new Frames(); // Should not happen if request fired

    const resultFrames = await getAllItemDocsForActiveUser(frames, session, activeUser, ScheduleGenerator, "events", symbol("event"));

    if (resultFrames.at(0)![symbol("error")]) {
      return new Frames({ ...originalFrame, error: resultFrames.at(0)![symbol("error")] });
    }
    // If successful, resultFrames will contain [{ [symbol("event")]: [...] }]
    return resultFrames;
  },
  then: actions([
    Requesting.respond,
    {
      request: symbol("request"),
      event: symbol("event"), // Will be an array of EventDoc or empty array
      error: symbol("error") // Will be undefined if no error
    }
  ]),
});

// _getAllTasks (for active user)
export const GetAllTasksRequest: Sync = ({ request, session, activeUser }) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getAllTasks", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames.at(0);
    if (!originalFrame) return new Frames();

    const resultFrames = await getAllItemDocsForActiveUser(frames, session, activeUser, ScheduleGenerator, "tasks", symbol("task"));

    if (resultFrames.at(0)![symbol("error")]) {
      return new Frames({ ...originalFrame, error: resultFrames.at(0)![symbol("error")] });
    }
    // If successful, resultFrames will contain [{ [symbol("task")]: [...] }]
    return resultFrames;
  },
  then: actions([
    Requesting.respond,
    {
      request: symbol("request"),
      task: symbol("task"), // Will be an array of TaskDoc or empty array
      error: symbol("error") // Will be undefined if no error
    }
  ]),
});
```
