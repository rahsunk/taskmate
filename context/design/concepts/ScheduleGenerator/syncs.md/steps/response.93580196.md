---
timestamp: 'Mon Nov 03 2025 10:49:32 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251103_104932.e0b377b9.md]]'
content_id: 9358019666393e42db94797f61e91b98ad5f3347476136d6e1a0b28570cd5dd1
---

# response:

```typescript
// # file: src/ScheduleGenerator/ScheduleGeneratorConcept.ts

import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "../../utils/types.ts";
import { freshID } from "../../utils/database.ts";

// Declare collection prefix for MongoDB, using the concept name
const PREFIX = "ScheduleGenerator" + ".";

// Generic types as defined in the concept specification
type User = ID; // External user identifier
type Schedule = ID; // Internal identifier for a schedule document
type Event = ID; // Internal identifier for an event document
type Task = ID; // Internal identifier for a task document
type Percent = number; // Represents a percentage, typically a number between 0 and 100

// Define enum for repetition frequency types
enum RepeatFrequency {
  NONE = "NONE",
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY", // Added as per original spec
  YEARLY = "YEARLY",   // Added as per original spec
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
  // Access seq directly from result, or 1 if it's the first time
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

    // Ensure owner is unique for schedules for the initializeSchedule logic
    this.schedules.createIndex({ owner: 1 }, { unique: true }).catch(
      console.error,
    );
  }

  /**
   * initializeSchedule (owner: User): (schedule: Schedule) | (error: String)
   *
   * requires: owner exists (this concept treats `User` as a generic ID and cannot
   *           verify its existence; a higher-level synchronization is expected
   *           to provide a valid `User` ID).
   *
   * effects: if `owner` does not have a schedule, creates an empty `schedule` with `owner`
   *          as `schedule.owner`, with static attribute `scheduleID` incrementing by 1.
   *          If `owner` already has a schedule, returns the existing schedule.
   *
   * @param {Object} params - The action parameters.
   * @param {User} params.owner - The ID of the user for whom to create the schedule.
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
   * _getScheduleOwnerById (schedule: Schedule): (owner: User)[]
   *
   * requires: `schedule` exists
   *
   * effects: Retrieves the owner (User ID) of a given schedule.
   *
   * @param {Object} params - The query parameters.
   * @param {Schedule} params.schedule - The ID of the schedule to retrieve the owner for.
   * @returns {Promise<{owner: User}[]>} - An array containing the owner's User ID if found, otherwise an empty array.
   */
  async _getScheduleOwnerById({ schedule }: { schedule: Schedule }): Promise<
    Array<{ owner: User }>
  > {
    const scheduleDoc = await this.schedules.findOne({ _id: schedule });
    if (scheduleDoc) {
      return [{ owner: scheduleDoc.owner }];
    }
    return [];
  }

  /**
   * _getScheduleByOwner (owner: User): (schedule: Schedule)[]
   *
   * requires: true
   *
   * effects: Retrieves the ID of the schedule document associated with a given user owner.
   *
   * @param {Object} params - The query parameters.
   * @param {User} params.owner - The ID of the owner user.
   * @returns {Promise<Array<{schedule: Schedule}>>} - An array containing the schedule ID or an empty array if not found.
   */
  async _getScheduleByOwner({ owner }: { owner: User }): Promise<
    Array<{ schedule: Schedule }>
  > {
    const scheduleDoc = await this.schedules.findOne({ owner });
    if (!scheduleDoc) {
      return []; // Return an empty array if schedule not found
    }
    return [{ schedule: scheduleDoc._id }];
  }

  /**
   * _getEventsForSchedule (schedule: Schedule): (event: Event[])[]
   *
   * requires: `schedule` exists
   *
   * effects: Retrieves an array of Event IDs that are linked to the specified schedule.
   *
   * @param {Object} params - The query parameters.
   * @param {Schedule} params.schedule - The ID of the schedule to retrieve events for.
   * @returns {Promise<Array<{event: Event[]}>>} - An array containing an object with an array of event IDs, or an empty array if no events.
   */
  async _getEventsForSchedule({ schedule }: { schedule: Schedule }): Promise<
    Array<{ event: Event[] }>
  > {
    const existingSchedule = await this.schedules.findOne({ _id: schedule });
    if (!existingSchedule) {
      return [];
    }
    // Find all events that reference this schedule's internal ID
    const eventDocs = await this.events
      .find({ scheduleID: existingSchedule.scheduleID })
      .toArray();
    if (eventDocs.length === 0) {
      return [];
    }
    return [{ event: eventDocs.map((doc) => doc._id) }];
  }

  /**
   * _getTasksForSchedule (schedule: Schedule): (task: Task[])[]
   *
   * requires: `schedule` exists
   *
   * effects: Retrieves an array of Task IDs that are linked to the specified schedule.
   *
   * @param {Object} params - The query parameters.
   * @param {Schedule} params.schedule - The ID of the schedule to retrieve tasks for.
   * @returns {Promise<Array<{task: Task[]}>>} - An array containing an object with an array of task IDs, or an empty array if no tasks.
   */
  async _getTasksForSchedule({ schedule }: { schedule: Schedule }): Promise<
    Array<{ task: Task[] }>
  > {
    const existingSchedule = await this.schedules.findOne({ _id: schedule });
    if (!existingSchedule) {
      return [];
    }
    // Find all tasks that reference this schedule's internal ID
    const taskDocs = await this.tasks
      .find({ scheduleID: existingSchedule.scheduleID })
      .toArray();
    if (taskDocs.length === 0) {
      return [];
    }
    return [{ task: taskDocs.map((doc) => doc._id) }];
  }

  /**
   * _getEventDetails (event: Event): (eventDetails: EventDoc)[]
   *
   * requires: `event` exists
   *
   * effects: Retrieves the full document details for a specific event.
   *
   * @param {Object} params - The query parameters.
   * @param {Event} params.event - The ID of the event to retrieve details for.
   * @returns {Promise<Array<{eventDetails: EventDoc}>>} - An array containing the event document or an empty array.
   */
  async _getEventDetails({ event }: { event: Event }): Promise<
    Array<{ eventDetails: EventDoc }>
  > {
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
   *
   * effects: Retrieves the full document details for a specific task.
   *
   * @param {Object} params - The query parameters.
   * @param {Task} params.task - The ID of the task to retrieve details for.
   * @returns {Promise<Array<{taskDetails: TaskDoc}>>} - An array containing the task document or an empty array.
   */
  async _getTaskDetails({ task }: { task: Task }): Promise<
    Array<{ taskDetails: TaskDoc }>
  > {
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
   *
   * effects: Returns an array of all `ScheduleDoc` objects.
   *
   * @returns {Promise<Array<{schedule: ScheduleDoc[]}>>} - An array containing an object with all schedule documents, or an empty array.
   */
  async _getAllSchedules(): Promise<Array<{ schedule: ScheduleDoc[] }>> {
    try {
      const scheduleDocs = await this.schedules.find({}).toArray();
      if (scheduleDocs.length === 0) {
        return [];
      }
      return [{ schedule: scheduleDocs }];
    } catch (e: any) {
      console.error("Error in _getAllSchedules:", e);
      // For queries, prefer returning empty array on typical "not found" cases,
      // but if it's a true operational error, an empty array might be misleading.
      // The current framework's error handling for queries typically expects an array return.
      return [];
    }
  }

  /**
   * _getScheduleDetails (schedule: Schedule): (scheduleDetails: ScheduleDoc)[]
   *
   * requires: `schedule` exists
   *
   * effects: Returns the `ScheduleDoc` object matching the provided ID.
   *
   * @param {Object} params - The query parameters.
   * @param {Schedule} params.schedule - The ID of the schedule to retrieve details for.
   * @returns {Promise<Array<{scheduleDetails: ScheduleDoc}>>} - An array containing the ScheduleDoc object or an empty array.
   */
  async _getScheduleDetails({ schedule }: { schedule: Schedule }): Promise<
    Array<{ scheduleDetails: ScheduleDoc }>
  > {
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
   *
   * effects: Returns an array of all `EventDoc` objects.
   *
   * @returns {Promise<Array<{event: EventDoc[]}>>} - An array containing an object with all event documents, or an empty array.
   */
  async _getAllEvents(): Promise<Array<{ event: EventDoc[] }>> {
    try {
      const eventDocs = await this.events.find({}).toArray();
      if (eventDocs.length === 0) {
        return [];
      }
      return [{ event: eventDocs }];
    } catch (e: any) {
      console.error("Error in _getAllEvents:", e);
      return [];
    }
  }

  /**
   * _getAllTasks (): (task: TaskDoc)[]
   *
   * requires: true
   *
   * effects: Returns an array of all `TaskDoc` objects.
   *
   * @returns {Promise<Array<{task: TaskDoc[]}>>} - An array containing an object with all task documents, or an empty array.
   */
  async _getAllTasks(): Promise<Array<{ task: TaskDoc[] }>> {
    try {
      const taskDocs = await this.tasks.find({}).toArray();
      if (taskDocs.length === 0) {
        return [];
      }
      return [{ task: taskDocs }];
    } catch (e: any) {
      console.error("Error in _getAllTasks:", e);
      return [];
    }
  }
}
```

```typescript
// # file: src/syncs/ScheduleGenerator.sync.ts

import { actions, Frames, Sync } from "@engine";
import { Requesting, Sessioning, ScheduleGenerator } from "@concepts"; // Assuming @concepts imports ScheduleGenerator

// Helper for session check for all actions/queries
const authorizeScheduleAction = async (
  frames: Frames,
  session: symbol,
  activeUser: symbol,
  scheduleParam: symbol, // The symbol for the 'schedule' ID from the request
): Promise<Frames> => {
  // 1. Ensure an active session
  const sessionId = frames.at(0)![session];
  frames = await frames.query(Sessioning._getUser, { session: sessionId }, {
    user: activeUser,
  });

  if (frames.length === 0) {
    return new Frames(); // No active session, no frames
  }

  // 2. Authorize: the active user must be the owner of the schedule
  const scheduleId = frames.at(0)![scheduleParam];
  const ownerFrames = await frames.query(
    ScheduleGenerator._getScheduleOwnerById,
    { schedule: scheduleId },
    { owner: activeUser }, // Bind the owner of the schedule to activeUser for filtering
  );

  // If the owner query returns nothing or the owner doesn't match the activeUser, then filter out the frame
  return ownerFrames.filter(($) => $[activeUser] === $[activeUser]); // This filter ensures activeUser exists in the ownerFrames, if query succeeded.
};


// Helper for session check for queries that don't need schedule ownership (like _getScheduleByOwner)
const queryRequiresSession = async (
  frames: Frames,
  session: symbol,
  activeUser: symbol,
): Promise<Frames> => {
  const sessionId = frames.at(0)![session];
  frames = await frames.query(Sessioning._getUser, { session: sessionId }, {
    user: activeUser,
  });
  return frames;
};

// --- initializeSchedule --- //

export const InitializeScheduleRequest: Sync = (
  { request, session, owner, activeUser },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/initializeSchedule", session },
    { request },
  ]),
  where: async (frames) => {
    // 1. Ensure an active session
    const sessionId = frames.at(0)![session];
    frames = await frames.query(Sessioning._getUser, { session: sessionId }, {
      user: activeUser,
    });
    if (frames.length === 0) {
      return new Frames(); // No active session
    }
    // Bind the active user to the 'owner' parameter for initializeSchedule
    frames.at(0)![owner] = frames.at(0)![activeUser];
    return frames;
  },
  then: actions([ScheduleGenerator.initializeSchedule, { owner }]),
});

export const InitializeScheduleResponseSuccess: Sync = ({
  request,
  schedule,
}) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/ScheduleGenerator/initializeSchedule" },
      { request },
    ],
    [ScheduleGenerator.initializeSchedule, {}, { schedule }],
  ),
  then: actions([Requesting.respond, { request, schedule }]),
});

export const InitializeScheduleResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/ScheduleGenerator/initializeSchedule" },
      { request },
    ],
    [ScheduleGenerator.initializeSchedule, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- addEvent --- //

export const AddEventRequest: Sync = ({
  request,
  session,
  schedule,
  name,
  startTime,
  endTime,
  repeat,
  activeUser,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/ScheduleGenerator/addEvent",
      session,
      schedule,
      name,
      startTime,
      endTime,
      repeat,
    },
    { request },
  ]),
  where: async (frames) =>
    authorizeScheduleAction(frames, session, activeUser, schedule),
  then: actions([
    ScheduleGenerator.addEvent,
    { schedule, name, startTime, endTime, repeat },
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

// --- editEvent --- //

export const EditEventRequest: Sync = ({
  request,
  session,
  schedule,
  oldEvent,
  name,
  startTime,
  endTime,
  repeat,
  activeUser,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/ScheduleGenerator/editEvent",
      session,
      schedule,
      oldEvent,
      name,
      startTime,
      endTime,
      repeat,
    },
    { request },
  ]),
  where: async (frames) =>
    authorizeScheduleAction(frames, session, activeUser, schedule),
  then: actions([
    ScheduleGenerator.editEvent,
    { schedule, oldEvent, name, startTime, endTime, repeat },
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

// --- deleteEvent --- //

export const DeleteEventRequest: Sync = ({
  request,
  session,
  schedule,
  event,
  activeUser,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/deleteEvent", session, schedule, event },
    { request },
  ]),
  where: async (frames) =>
    authorizeScheduleAction(frames, session, activeUser, schedule),
  then: actions([ScheduleGenerator.deleteEvent, { schedule, event }]),
});

export const DeleteEventResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/ScheduleGenerator/deleteEvent" },
      { request },
    ],
    [ScheduleGenerator.deleteEvent, {}, {}],
  ),
  then: actions([Requesting.respond, { request, status: "event_deleted" }]),
});

export const DeleteEventResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/ScheduleGenerator/deleteEvent" },
      { request },
    ],
    [ScheduleGenerator.deleteEvent, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- addTask --- //

export const AddTaskRequest: Sync = ({
  request,
  session,
  schedule,
  name,
  deadline,
  expectedCompletionTime,
  completionLevel,
  priority,
  activeUser,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/ScheduleGenerator/addTask",
      session,
      schedule,
      name,
      deadline,
      expectedCompletionTime,
      completionLevel,
      priority,
    },
    { request },
  ]),
  where: async (frames) =>
    authorizeScheduleAction(frames, session, activeUser, schedule),
  then: actions([
    ScheduleGenerator.addTask,
    { schedule, name, deadline, expectedCompletionTime, completionLevel, priority },
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

// --- editTask --- //

export const EditTaskRequest: Sync = ({
  request,
  session,
  schedule,
  oldTask,
  name,
  deadline,
  expectedCompletionTime,
  completionLevel,
  priority,
  activeUser,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/ScheduleGenerator/editTask",
      session,
      schedule,
      oldTask,
      name,
      deadline,
      expectedCompletionTime,
      completionLevel,
      priority,
    },
    { request },
  ]),
  where: async (frames) =>
    authorizeScheduleAction(frames, session, activeUser, schedule),
  then: actions([
    ScheduleGenerator.editTask,
    { schedule, oldTask, name, deadline, expectedCompletionTime, completionLevel, priority },
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

// --- deleteTask --- //

export const DeleteTaskRequest: Sync = ({
  request,
  session,
  schedule,
  task,
  activeUser,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/deleteTask", session, schedule, task },
    { request },
  ]),
  where: async (frames) =>
    authorizeScheduleAction(frames, session, activeUser, schedule),
  then: actions([ScheduleGenerator.deleteTask, { schedule, task }]),
});

export const DeleteTaskResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/ScheduleGenerator/deleteTask" },
      { request },
    ],
    [ScheduleGenerator.deleteTask, {}, {}],
  ),
  then: actions([Requesting.respond, { request, status: "task_deleted" }]),
});

export const DeleteTaskResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/ScheduleGenerator/deleteTask" },
      { request },
    ],
    [ScheduleGenerator.deleteTask, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- generateSchedule --- //

export const GenerateScheduleRequest: Sync = ({
  request,
  session,
  schedule,
  activeUser,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/generateSchedule", session, schedule },
    { request },
  ]),
  where: async (frames) =>
    authorizeScheduleAction(frames, session, activeUser, schedule),
  then: actions([ScheduleGenerator.generateSchedule, { schedule }]),
});

export const GenerateScheduleResponseSuccess: Sync = ({
  request,
  scheduleId,
  generatedPlan,
}) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/ScheduleGenerator/generateSchedule" },
      { request },
    ],
    [ScheduleGenerator.generateSchedule, {}, { scheduleId, generatedPlan }],
  ),
  then: actions([Requesting.respond, { request, scheduleId, generatedPlan }]),
});

export const GenerateScheduleResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/ScheduleGenerator/generateSchedule" },
      { request },
    ],
    [ScheduleGenerator.generateSchedule, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Queries (all require session) --- //

// _getScheduleByOwner (owner: User): (schedule: Schedule)[]
export const GetScheduleByOwnerRequest: Sync = (
  { request, session, owner, activeUser, schedule },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getScheduleByOwner", session },
    { request },
  ]),
  where: async (frames) => {
    // 1. Ensure an active session
    const originalFrame = frames.at(0)!;
    frames = await queryRequiresSession(frames, session, activeUser);
    if (frames.length === 0) {
      return new Frames();
    }
    // The 'owner' in this case is the active user from the session
    originalFrame[owner] = originalFrame[activeUser]; // Bind owner to activeUser
    
    // Call the query
    frames = await frames.query(ScheduleGenerator._getScheduleByOwner, { owner: originalFrame[owner] }, { schedule });
    
    // Handle cases where no schedule is found
    if (frames.length === 0) {
      return new Frames({...originalFrame, [schedule]: null}); // Respond with null or empty if no schedule
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, schedule }]),
});


// _getEventsForSchedule (schedule: Schedule): (event: Event[])[]
export const GetEventsForScheduleRequest: Sync = (
  { request, session, schedule, activeUser, event },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getEventsForSchedule", session, schedule },
    { request },
  ]),
  where: async (frames) => {
    // 1. Authorize: Session and owner of schedule
    const originalFrame = frames.at(0)!;
    frames = await authorizeScheduleAction(frames, session, activeUser, schedule);
    if (frames.length === 0) {
      return new Frames();
    }
    // Call the query. It returns `Array<{event: Event[]}>`
    frames = await frames.query(ScheduleGenerator._getEventsForSchedule, { schedule: originalFrame[schedule] }, { event });
    
    // If no events, ensure response is still an object (e.g. {event: []})
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [event]: [] });
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, event }]), // 'event' will be {event: Event[]}
});

// _getTasksForSchedule (schedule: Schedule): (task: Task[])[]
export const GetTasksForScheduleRequest: Sync = (
  { request, session, schedule, activeUser, task },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getTasksForSchedule", session, schedule },
    { request },
  ]),
  where: async (frames) => {
    // 1. Authorize: Session and owner of schedule
    const originalFrame = frames.at(0)!;
    frames = await authorizeScheduleAction(frames, session, activeUser, schedule);
    if (frames.length === 0) {
      return new Frames();
    }
    // Call the query. It returns `Array<{task: Task[]}>`
    frames = await frames.query(ScheduleGenerator._getTasksForSchedule, { schedule: originalFrame[schedule] }, { task });
    
    // If no tasks, ensure response is still an object (e.g. {task: []})
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [task]: [] });
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, task }]), // 'task' will be {task: Task[]}
});

// _getEventDetails (event: Event): (eventDetails: EventDoc)[]
export const GetEventDetailsRequest: Sync = (
  { request, session, event: eventId, activeUser, eventDetails, schedule },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getEventDetails", session, event: eventId },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames.at(0)!;
    frames = await queryRequiresSession(frames, session, activeUser);
    if (frames.length === 0) {
      return new Frames();
    }
    
    // Get event details
    frames = await frames.query(ScheduleGenerator._getEventDetails, { event: originalFrame[eventId] }, { eventDetails });
    if (frames.length === 0) {
      return new Frames(); // Event not found, return empty
    }

    // Now authorize: activeUser must be owner of the schedule this event belongs to
    const eventDoc = frames.at(0)![eventDetails];
    if (!eventDoc) return new Frames(); // Should not happen if previous query succeeded
    
    originalFrame[schedule] = (eventDoc as EventDoc)._id; // Temporarily use event_id as schedule for authorization helper
    frames = await authorizeScheduleAction(
      new Frames(originalFrame), // Re-wrap originalFrame for auth check
      session,
      activeUser,
      schedule,
    );
    if (frames.length === 0) {
      return new Frames(); // Not authorized
    }
    // Restore the eventDetails binding
    frames.at(0)![eventDetails] = eventDoc;
    return frames;
  },
  then: actions([Requesting.respond, { request, eventDetails }]),
});

// _getTaskDetails (task: Task): (taskDetails: TaskDoc)[]
export const GetTaskDetailsRequest: Sync = (
  { request, session, task: taskId, activeUser, taskDetails, schedule },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getTaskDetails", session, task: taskId },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames.at(0)!;
    frames = await queryRequiresSession(frames, session, activeUser);
    if (frames.length === 0) {
      return new Frames();
    }

    // Get task details
    frames = await frames.query(ScheduleGenerator._getTaskDetails, { task: originalFrame[taskId] }, { taskDetails });
    if (frames.length === 0) {
      return new Frames(); // Task not found, return empty
    }

    // Now authorize: activeUser must be owner of the schedule this task belongs to
    const taskDoc = frames.at(0)![taskDetails];
    if (!taskDoc) return new Frames(); // Should not happen if previous query succeeded
    
    originalFrame[schedule] = (taskDoc as TaskDoc)._id; // Temporarily use task_id as schedule for authorization helper
    frames = await authorizeScheduleAction(
      new Frames(originalFrame), // Re-wrap originalFrame for auth check
      session,
      activeUser,
      schedule,
    );
    if (frames.length === 0) {
      return new Frames(); // Not authorized
    }
    // Restore the taskDetails binding
    frames.at(0)![taskDetails] = taskDoc;
    return frames;
  },
  then: actions([Requesting.respond, { request, taskDetails }]),
});

// _getAllSchedules (): (schedule: ScheduleDoc)[]
export const GetAllSchedulesRequest: Sync = (
  { request, session, activeUser, schedule },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getAllSchedules", session },
    { request },
  ]),
  where: async (frames) => {
    // 1. Ensure an active session
    const originalFrame = frames.at(0)!;
    frames = await queryRequiresSession(frames, session, activeUser);
    if (frames.length === 0) {
      return new Frames();
    }

    // Call the query. It returns `Array<{schedule: ScheduleDoc[]}>`
    frames = await frames.query(ScheduleGenerator._getAllSchedules, {}, { schedule });
    
    // If no schedules, ensure response is still an object (e.g. {schedule: []})
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [schedule]: [] });
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, schedule }]), // 'schedule' will be {schedule: ScheduleDoc[]}
});

// _getScheduleDetails (schedule: Schedule): (scheduleDetails: ScheduleDoc)[]
export const GetScheduleDetailsRequest: Sync = (
  { request, session, schedule, activeUser, scheduleDetails },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getScheduleDetails", session, schedule },
    { request },
  ]),
  where: async (frames) => {
    // 1. Authorize: Session and owner of schedule
    const originalFrame = frames.at(0)!;
    frames = await authorizeScheduleAction(frames, session, activeUser, schedule);
    if (frames.length === 0) {
      return new Frames();
    }
    // Call the query. It returns `Array<{scheduleDetails: ScheduleDoc}>`
    frames = await frames.query(ScheduleGenerator._getScheduleDetails, { schedule: originalFrame[schedule] }, { scheduleDetails });
    
    // If no details, return empty frame
    if (frames.length === 0) {
      return new Frames();
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, scheduleDetails }]),
});

// _getAllEvents (): (event: EventDoc)[]
export const GetAllEventsRequest: Sync = (
  { request, session, activeUser, event },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getAllEvents", session },
    { request },
  ]),
  where: async (frames) => {
    // 1. Ensure an active session
    const originalFrame = frames.at(0)!;
    frames = await queryRequiresSession(frames, session, activeUser);
    if (frames.length === 0) {
      return new Frames();
    }

    // Call the query. It returns `Array<{event: EventDoc[]}>`
    frames = await frames.query(ScheduleGenerator._getAllEvents, {}, { event });
    
    // If no events, ensure response is still an object (e.g. {event: []})
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [event]: [] });
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, event }]), // 'event' will be {event: EventDoc[]}
});

// _getAllTasks (): (task: TaskDoc)[]
export const GetAllTasksRequest: Sync = (
  { request, session, activeUser, task },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getAllTasks", session },
    { request },
  ]),
  where: async (frames) => {
    // 1. Ensure an active session
    const originalFrame = frames.at(0)!;
    frames = await queryRequiresSession(frames, session, activeUser);
    if (frames.length === 0) {
      return new Frames();
    }

    // Call the query. It returns `Array<{task: TaskDoc[]}>`
    frames = await frames.query(ScheduleGenerator._getAllTasks, {}, { task });
    
    // If no tasks, ensure response is still an object (e.g. {task: []})
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [task]: [] });
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, task }]), // 'task' will be {task: TaskDoc[]}
});
```
