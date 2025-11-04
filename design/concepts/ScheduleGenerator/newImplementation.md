[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@implementing-concepts](../../background/implementing-concepts.md)

[@implementation](implementation.md)

[@ScheduleGeneratorAPISpec](../../tools/apiGeneration/ScheduleGeneratorAPISpec.md)
# prompt: Given the current implementation of the ScheduleGenerator concept, update it so that it includes the additional GET endpoints in the API spec.

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import {
  getCurrentETDate,
  getETFullYear,
  getETMonth,
  getETDate,
  getETDay,
  getETHours,
  getETMinutes,
  getETSeconds,
  setETHours,
  setETDate,
  isSameDayET,
  startOfDayET,
  endOfDayET,
  createETDate,
} from "@utils/timezone.ts";

// Declare collection prefix for MongoDB, using the concept name
const PREFIX = "ScheduleGenerator" + ".";

// Generic types as defined in the concept specification
type User = ID; // External user identifier
type Schedule = ID; // Internal identifier for a schedule document (MongoDB _id)
type Event = ID; // Internal identifier for an event document (MongoDB _id)
type Task = ID; // Internal identifier for a task document (MongoDB _id)
type Percent = number; // Represents a percentage, typically a number between 0 and 100

// Define enum for repetition frequency types
enum RepeatFrequency {
  NONE = "NONE",
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
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
  _id: Schedule; // MongoDB's primary key for the schedule
  owner: User; // The ID of the user who owns this schedule
  scheduleID: number; // An internal, incrementing numerical ID for this concept
}

/**
 * Interface for the 'Events' collection documents.
 * Corresponds to "a set of Events" in the concept state.
 */
interface EventDoc {
  _id: Event; // MongoDB's primary key for the event
  name: string;
  eventID: number; // An internal, incrementing numerical ID for this concept
  scheduleID: number; // Foreign key linking to the parent ScheduleDoc's internal scheduleID
  startTime: Date; // The start date and time of the event
  endTime: Date; // The end date and time of the event
  repeat: RepeatConfig; // The repetition configuration for the event
}

/**
 * Interface for the 'Tasks' collection documents.
 * Corresponds to "a set of Tasks" in the concept state.
 */
interface TaskDoc {
  _id: Task; // MongoDB's primary key for the task
  name: string;
  taskID: number; // An internal, incrementing numerical ID for this concept
  scheduleID: number; // Foreign key linking to the parent ScheduleDoc's internal scheduleID
  deadline: Date; // The deadline for completing the task
  expectedCompletionTime: number; // Estimated time needed for task completion (in minutes)
  completionLevel: Percent; // Current progress of the task (0-100%)
  priority: Percent; // Priority level of the task (0-100%)
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
 * Helper to check for date equality (ignoring time) in ET timezone.
 * @param d1
 * @param d2
 */
function isSameDay(d1: Date, d2: Date): boolean {
  // Use ET timezone-aware comparison
  return isSameDayET(d1, d2);
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

    // 1. Define the planning horizon (in ET timezone)
    const today = startOfDayET(getCurrentETDate()); // Start of today in ET
    const planningEndDate = endOfDayET(
      setETDate(today, getETDate(today) + this.PLANNING_HORIZON_DAYS)
    ); // End of planning horizon in ET

    // 2. Instantiate repeating events and initialize free time slots for each day (in ET)
    for (
      let d = new Date(today);
      d <= planningEndDate;
      d = setETDate(d, getETDate(d) + 1)
    ) {
      // Set working hours in ET timezone
      const dayStart = setETHours(d, this.DAILY_TASK_START_HOUR, 0, 0, 0);
      const dayEnd = setETHours(d, this.DAILY_TASK_END_HOUR, 0, 0, 0);

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
            // Schedule if current day 'd' is one of the specified days of the week (in ET)
            if (event.repeat.daysOfWeek?.includes(getETDay(d))) {
              shouldSchedule = true;
            }
            break;
        }

        if (shouldSchedule) {
          // Create a concrete instance of the event for the current day 'd' (in ET)
          const scheduledEventStartTime = setETHours(
            d,
            getETHours(eventStartTime),
            getETMinutes(eventStartTime),
            getETSeconds(eventStartTime),
            eventStartTime.getMilliseconds(),
          );
          const scheduledEventEndTime = setETHours(
            d,
            getETHours(eventEndTime),
            getETMinutes(eventEndTime),
            getETSeconds(eventEndTime),
            eventEndTime.getMilliseconds(),
          );

          // Ensure scheduled event doesn't end before it starts or is in the past compared to now (in ET)
          if (
            scheduledEventStartTime < scheduledEventEndTime &&
            scheduledEventEndTime > getCurrentETDate()
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

    // Filter out free time slots that are entirely in the past (using ET current time)
    const now = getCurrentETDate();
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
   * _getScheduleByOwner (owner: User): (schedule: Schedule)[]
   * effects: Retrieves the ID of the schedule document for a given user.
   */
  async _getScheduleByOwner(
    { owner }: { owner: User },
  ): Promise<{ schedule: Schedule }[]> {
    const scheduleDoc = await this.schedules.findOne({ owner });
    return scheduleDoc ? [{ schedule: scheduleDoc._id }] : [];
  }

  /**
   * _getEventsForSchedule (schedule: Schedule): (event: EventDoc)[]
   * effects: Retrieves all event documents linked to the specified schedule.
   */
  async _getEventsForSchedule(
    { schedule }: { schedule: Schedule },
  ): Promise<{ event: EventDoc }[]> {
    const existingSchedule = await this.schedules.findOne({ _id: schedule });
    if (!existingSchedule) {
      return [];
    }
    const eventDocs = await this.events.find({
      scheduleID: existingSchedule.scheduleID,
    }).toArray();
    return eventDocs.map((doc) => ({ event: doc as EventDoc }));
  }

  /**
   * _getTasksForSchedule (schedule: Schedule): (task: TaskDoc)[]
   * effects: Retrieves all task documents linked to the specified schedule.
   */
  async _getTasksForSchedule(
    { schedule }: { schedule: Schedule },
  ): Promise<{ task: TaskDoc }[]> {
    const existingSchedule = await this.schedules.findOne({ _id: schedule });
    if (!existingSchedule) {
      return [];
    }
    const taskDocs = await this.tasks.find({
      scheduleID: existingSchedule.scheduleID,
    }).toArray();
    return taskDocs.map((doc) => ({ task: doc as TaskDoc }));
  }

  /**
   * _getEventDetails (event: Event): (eventDetails: EventDoc)[]
   * effects: Retrieves the full document for a specific event.
   */
  async _getEventDetails(
    { event }: { event: Event },
  ): Promise<{ eventDetails: EventDoc }[]> {
    const eventDoc = await this.events.findOne({ _id: event });
    return eventDoc ? [{ eventDetails: eventDoc as EventDoc }] : [];
  }

  /**
   * _getTaskDetails (task: Task): (taskDetails: TaskDoc)[]
   * effects: Retrieves the full document for a specific task.
   */
  async _getTaskDetails(
    { task }: { task: Task },
  ): Promise<{ taskDetails: TaskDoc }[]> {
    const taskDoc = await this.tasks.findOne({ _id: task });
    return taskDoc ? [{ taskDetails: taskDoc as TaskDoc }] : [];
  }

  /**
   * _getAllSchedules(): (schedules: ScheduleDoc[])
   * effects: Returns an array of all schedule documents.
   */
  async _getAllSchedules(): Promise<ScheduleDoc[]> {
    return await this.schedules.find({}).toArray() as ScheduleDoc[];
  }

  /**
   * _getScheduleDetails(schedule: Schedule): (scheduleDetails: ScheduleDoc)[]
   * effects: Returns the document for a specific schedule ID.
   */
  async _getScheduleDetails(
    { schedule }: { schedule: Schedule },
  ): Promise<{ scheduleDetails: ScheduleDoc }[]> {
    const scheduleDoc = await this.schedules.findOne({ _id: schedule });
    return scheduleDoc ? [{ scheduleDetails: scheduleDoc as ScheduleDoc }] : [];
  }

  /**
   * _getAllEvents(): (events: EventDoc[])
   * effects: Returns an array of all event documents.
   */
  async _getAllEvents(): Promise<EventDoc[]> {
    return await this.events.find({}).toArray() as EventDoc[];
  }

  /**
   * _getAllTasks(): (tasks: TaskDoc[])
   * effects: Returns an array of all task documents.
   */
  async _getAllTasks(): Promise<TaskDoc[]> {
    return await this.tasks.find({}).toArray() as TaskDoc[];
  }
}

```
