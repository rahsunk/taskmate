[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

[@testing-concepts-rubric](../../background/testing-concepts-rubric.md)

# concept: ScheduleGenerator (Updated Specification)

* **concept** ScheduleGenerator\[User, Date, Percent]
* **purpose** manages events and tasks for users to automatically generate a schedule that meets their needs
* **principle** Given a set of events and tasks, an optimal schedule for the user is created. When events and tasks are updated and removed, the schedule is regenerated
* **state**
  * a set of `Schedules` with
    * an `owner` of type `User`
    * a `scheduleID` of type `Number` (static attribute, initially -1)
  * a set of `Events` with
    * a `name` of type `String`
    * an `eventID` of type `Number` (static attribute, initially -1)
    * a `scheduleID` of type `Number`
    * a `startTime` of type `Date`
    * an `endTime` of type `Date`
    * a `repeat` of type `RepeatConfig`
  * a set of `Tasks` with
    * a `name` of type `String`
    * a `taskID` of type `Number` (static attribute, initially -1)
    * a `scheduleID` of type `Number`
    * a `deadline` of type `Date`
    * an `expectedCompletionTime` of type `Number` (in minutes)
    * a `completionLevel` of type `Percent`
    * a `priority` of type `Percent`
* **actions**
  * `initializeSchedule(owner: User): (schedule: Schedule)`
    * **requires**: `owner` exists
    * **effects**: creates an empty `schedule` with `owner` as `schedule.owner`, with static attribute `scheduleID` incrementing by 1
  * `addEvent(schedule: Schedule, name: String, startTime: Date, endTime: Date, repeat: RepeatConfig): (event: Event)`
    * **requires**: `schedule` exists
    * **effects**: creates and returns an event with `name` to add to the set of events in `schedule` with the given attributes, and `eventID` incrementing by 1, and `event.scheduleID` being `schedule.scheduleID`
  * `editEvent(schedule: Schedule, oldEvent: Event, name: String, startTime: Date, endTime: Date, repeat: RepeatConfig)`
    * **requires**: `oldEvent` is in the set of `Events` of `schedule`
    * **effects**: modifies `oldEvent` in the set of `Events` in `schedule` with the given attributes
  * `deleteEvent(schedule: Schedule, event: Event)`
    * **requires**: `event` is in the set of `Events` of `schedule`
    * **effects**: deletes the `event` in the set of `Events` in `schedule`
  * `addTask(schedule: Schedule, name: String, deadline: Date, expectedCompletionTime: Number, completionLevel: Percent, priority: Percent): (task: Task)`
    * **requires**: `schedule` exists
    * **requires**: `completionLevel` is between 0 and 100 (inclusive)
    * **effects**: returns and adds `task` with `name` to the set of `tasks` in `schedule` with the given attributes, with the given `completionLevel`, and `taskID` incrementing by 1, and `task.scheduleID` being `schedule.scheduleID`
  * `editTask(schedule: Schedule, oldTask: Task, name: String, deadline: Date, expectedCompletionTime: Number, completionLevel: Percent, priority: Percent)`
    * **requires**: `oldTask` is in the set of `Tasks` of `schedule`
    * **effects**: modifies `oldTask` in the set of `Tasks` in `schedule` with the given attributes
  * `deleteTask(schedule: Schedule, task: Task)`
    * **requires**: `task` is in the set of `Tasks` of `schedule`
    * **effects**: deletes `task` in the set of `Tasks` in `schedule`
  * `generateSchedule(schedule: Schedule): (scheduleId: Schedule, generatedPlan: GeneratedSchedulePlan | error: Error)`
    * **requires**: `schedule` exists
    * **effects**: Creates `generatedPlan` for `schedule.owner` such that if possible, all given events start, end, and repeat as specified, and task scheduling is optimized by its attributes. Generally, tasks with a sooner deadline, higher priority level, higher expectedCompletionTime, and higher completionLevel are scheduled first. The generated plan details concrete time slots for events and tasks. If doing this is not possible (e.g., due to conflicts), then return an `error`.

---

# file: src/ScheduleGenerator/ScheduleGeneratorConcept.ts

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
        const eventDate = new Date(event.startTime); // Use event's original date for comparison

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
            event.startTime.getHours(),
            event.startTime.getMinutes(),
            event.startTime.getSeconds(),
            event.startTime.getMilliseconds(),
          );
          const scheduledEventEndTime = new Date(d);
          scheduledEventEndTime.setHours(
            event.endTime.getHours(),
            event.endTime.getMinutes(),
            event.endTime.getSeconds(),
            event.endTime.getMilliseconds(),
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
      // 1. Sooner deadline first
      const deadlineDiff = a.deadline.getTime() - b.deadline.getTime();
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

      if (remainingTaskDuration <= 0) {
        // Task already completed or no work left, add to plan as completed or skip
        generatedPlan.push({
          type: "task",
          originalId: task._id,
          name: `${task.name} (Completed)`,
          scheduledStartTime: task.deadline, // Placeholder, indicating completion
          scheduledEndTime: task.deadline,
        });
        continue;
      }

      // Try to find a slot before the deadline
      const taskDeadline = task.deadline;

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
      unscheduledTasks.forEach((task) => console.warn(`  - ${task.name} (ID: ${task._id}, Deadline: ${task.deadline.toLocaleDateString()})`));
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
    events?: Event[];
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
    return { events: eventDocs.map((doc) => doc._id) };
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
    tasks?: Task[];
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
    return { tasks: taskDocs.map((doc) => doc._id) };
  }

  /**
   * _getEventDetails (event: Event): (eventDetails: EventDoc)
   *
   * effects: Retrieves the full document details for a specific event.
   *
   * @param {Object} params - The query parameters.
   * @param {Event} params.event - The ID of the event to retrieve details for.
   * @returns {Promise<{eventDetails?: EventDoc; error?: string}>} - The event document or an error message.
   */
  async _getEventDetails({ event }: { event: Event }): Promise<{
    eventDetails?: EventDoc;
    error?: string;
  }> {
    const eventDoc = await this.events.findOne({ _id: event });
    if (!eventDoc) {
      return { error: `Event with ID ${event} not found.` };
    }
    return { eventDetails: eventDoc };
  }

  /**
   * _getTaskDetails (task: Task): (taskDetails: TaskDoc)
   *
   * effects: Retrieves the full document details for a specific task.
   *
   * @param {Object} params - The query parameters.
   * @param {Task} params.task - The ID of the task to retrieve details for.
   * @returns {Promise<{taskDetails?: TaskDoc; error?: string}>} - The task document or an error message.
   */
  async _getTaskDetails({ task }: { task: Task }): Promise<{
    taskDetails?: TaskDoc;
    error?: string;
  }> {
    const taskDoc = await this.tasks.findOne({ _id: task });
    if (!taskDoc) {
      return { error: `Task with ID ${task} not found.` };
    }
    return { taskDetails: taskDoc };
  }
}
```

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

  await t.step("addTask: adds a task to the schedule with 0% completion", async () => {
    const deadline = getRelativeDate(3, 17, 0); // 3 days from now 5:00 PM
    console.log(`Action: addTask to schedule ${aliceSchedule} - Project Report (0% completed)`);
    const result = await concept.addTask({
      schedule: aliceSchedule,
      name: "Project Report",
      deadline,
      expectedCompletionTime: 120, // 2 hours
      completionLevel: 0, // Explicitly set to 0
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

  await t.step("addTask: adds a task to the schedule with 25% completion", async () => {
    const deadline = getRelativeDate(4, 10, 0); // 4 days from now 10:00 AM
    console.log(`Action: addTask to schedule ${aliceSchedule} - Research Paper (25% completed)`);
    const result = await concept.addTask({
      schedule: aliceSchedule,
      name: "Research Paper",
      deadline,
      expectedCompletionTime: 240, // 4 hours
      completionLevel: 25, // Explicitly set to 25
      priority: 75,
    });
    assert(result.task, `Expected a task ID, but got: ${result.error}`);
    const researchPaperTask = result.task;
    console.log(`Output: Added task ID: ${researchPaperTask}`);

    const fetchedTask = await concept._getTaskDetails({ task: researchPaperTask });
    assert(fetchedTask.taskDetails, "Task should be found via query");
    assertEquals(fetchedTask.taskDetails.name, "Research Paper");
    assertEquals(fetchedTask.taskDetails.completionLevel, 25); // Verifying completionLevel is 25
  });

  await t.step("addTask: fails with invalid expectedCompletionTime", async () => {
    const deadline = getRelativeDate(0, 10, 0);
    console.log(`Action: addTask with invalid expectedCompletionTime`);
    const result = await concept.addTask({
      schedule: aliceSchedule,
      name: "Invalid Task",
      deadline,
      expectedCompletionTime: 0,
      completionLevel: 0,
      priority: 50,
    });
    assert(result.error, "Expected an error for invalid expectedCompletionTime");
    assertEquals(result.error, "Expected completion time must be positive.");
    console.log(`Output: Error: ${result.error}`);
  });

  await t.step("addTask: fails with invalid completionLevel (too high)", async () => {
    const deadline = getRelativeDate(0, 10, 0);
    console.log(`Action: addTask with invalid completionLevel (101)`);
    const result = await concept.addTask({
      schedule: aliceSchedule,
      name: "Invalid Completion Task",
      deadline,
      expectedCompletionTime: 60,
      completionLevel: 101, // Invalid completion level
      priority: 50,
    });
    assert(result.error, "Expected an error for invalid completionLevel");
    assertEquals(result.error, "Completion level must be between 0 and 100.");
    console.log(`Output: Error: ${result.error}`);
  });

  await t.step("addTask: fails with invalid completionLevel (too low)", async () => {
    const deadline = getRelativeDate(0, 10, 0);
    console.log(`Action: addTask with invalid completionLevel (-1)`);
    const result = await concept.addTask({
      schedule: aliceSchedule,
      name: "Invalid Completion Task 2",
      deadline,
      expectedCompletionTime: 60,
      completionLevel: -1, // Invalid completion level
      priority: 50,
    });
    assert(result.error, "Expected an error for invalid completionLevel");
    assertEquals(result.error, "Completion level must be between 0 and 100.");
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
      completionLevel: 0, // Added completionLevel
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
    assertEquals(tasksForSchedule.tasks.length, 2, "Two tasks should remain (researchPaperTask and task2)"); // Adjusted expected count
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
      completionLevel: 0, // Added completionLevel
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
      completionLevel: 0, // Added completionLevel
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
      completionLevel: 0, // Added completionLevel
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
      completionLevel: 0, // Added completionLevel
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

---

# trace: ScheduleGeneratorConcept

Here's an example trace for the updated tests, reflecting the ability to specify `completionLevel` when adding a task and the new validation checks.

```text
-- Deno Test Run --

Running ScheduleGeneratorConcept - Basic CRUD for Schedules, Events, and Tasks
  Action: initializeSchedule for owner user:Alice
  Output: Created schedule ID: <GENERATED_ALICE_SCHEDULE_ID>
  Action: addEvent to schedule <GENERATED_ALICE_SCHEDULE_ID> - Team Meeting
  Output: Added event ID: <GENERATED_EVENT_1_ID>
  Action: addEvent to non-existent schedule nonExistent
  Output: Error: Schedule with ID nonExistent not found.
  Action: editEvent <GENERATED_EVENT_1_ID> to new details
  Output: Event edited successfully
  Action: editEvent <GENERATED_EVENT_1_ID> with wrong schedule <GENERATED_OTHER_SCHEDULE_ID>
  Output: Error: Event with ID <GENERATED_EVENT_1_ID> not found or not associated with schedule <GENERATED_OTHER_SCHEDULE_ID>.
  Added second event ID: <GENERATED_EVENT_2_ID>
  Action: deleteEvent <GENERATED_EVENT_1_ID> from schedule <GENERATED_ALICE_SCHEDULE_ID>
  Output: Event deleted successfully
  Action: deleteEvent nonExistentEvent
  Output: Error: Event with ID nonExistentEvent not found or not associated with schedule <GENERATED_ALICE_SCHEDULE_ID>.
  Action: addTask to schedule <GENERATED_ALICE_SCHEDULE_ID> - Project Report (0% completed)
  Output: Added task ID: <GENERATED_TASK_1_ID>
  Action: addTask to schedule <GENERATED_ALICE_SCHEDULE_ID> - Research Paper (25% completed)
  Output: Added task ID: <GENERATED_RESEARCH_PAPER_TASK_ID>
  Action: addTask with invalid expectedCompletionTime
  Output: Error: Expected completion time must be positive.
  Action: addTask with invalid completionLevel (101)
  Output: Error: Completion level must be between 0 and 100.
  Action: addTask with invalid completionLevel (-1)
  Output: Error: Completion level must be between 0 and 100.
  Action: editTask <GENERATED_TASK_1_ID> with new details
  Output: Task edited successfully
  Action: editTask with invalid priority
  Output: Error: Priority must be between 0 and 100.
  Added second task ID: <GENERATED_TASK_2_ID>
  Action: deleteTask <GENERATED_TASK_1_ID> from schedule <GENERATED_ALICE_SCHEDULE_ID>
  Output: Task deleted successfully
  Action: deleteTask nonExistentTask
  Output: Error: Task with ID nonExistentTask not found or not associated with schedule <GENERATED_ALICE_SCHEDULE_ID>.

Running ScheduleGeneratorConcept - generateSchedule operational principle and scenarios

--- Operational Principle Test ---
  Initialized schedule for user:Bob: <GENERATED_BOB_SCHEDULE_ID>
  Added daily event: <GENERATED_BOB_EVENT_1_ID>
  Added high priority task: <GENERATED_BOB_TASK_1_ID>
  Added low priority task: <GENERATED_BOB_TASK_2_ID>
  Action: generateSchedule for <GENERATED_BOB_SCHEDULE_ID>
  Output: Generated Plan:
    1. event: Daily Sync from <DATE_1_TOMORROW>, 9:00:00 AM to <DATE_1_TOMORROW>, 10:00:00 AM
    2. task: Prepare Presentation from <DATE_1_TOMORROW>, 10:00:00 AM to <DATE_1_TOMORROW>, 1:00:00 PM
    3. event: Daily Sync from <DATE_2_DAY_AFTER_TOMORROW>, 9:00:00 AM to <DATE_2_DAY_AFTER_TOMORROW>, 10:00:00 AM
    4. task: Review Documents from <DATE_2_DAY_AFTER_TOMORROW>, 10:00:00 AM to <DATE_2_DAY_AFTER_TOMORROW>, 11:00:00 AM
    5. event: Daily Sync from <DATE_3>, 9:00:00 AM to <DATE_3>, 10:00:00 AM
    6. event: Daily Sync from <DATE_4>, 9:00:00 AM to <DATE_4>, 10:00:00 AM
    7. event: Daily Sync from <DATE_5>, 9:00:00 AM to <DATE_5>, 10:00:00 AM
    8. event: Daily Sync from <DATE_6>, 9:00:00 AM to <DATE_6>, 10:00:00 AM
    9. event: Daily Sync from <DATE_7>, 9:00:00 AM to <DATE_7>, 10:00:00 AM

--- Scenario 1: Conflicts and Unscheduled Tasks ---
  Initialized schedule for user:Charlie: <GENERATED_CHARLIE_SCHEDULE_ID>
  Added daily all-day work block event (8 AM - 9 PM).
  Added a long task that might not fit (2 hours expected).
  Action: generateSchedule for <GENERATED_CHARLIE_SCHEDULE_ID>
  Warning: Could not fully schedule 1 tasks for schedule <GENERATED_CHARLIE_SCHEDULE_ID>:
    - Long Task for Busy Schedule (ID: <GENERATED_CHARLIE_TASK_ID>, Deadline: <DATE>)
  Output: Error: Not all tasks could be scheduled within the planning horizon or available time slots.

--- Scenario 2: Task Prioritization Order ---
  Initialized schedule for user:David: <GENERATED_DAVID_SCHEDULE_ID>
  Action: generateSchedule for <GENERATED_DAVID_SCHEDULE_ID>
  Output: Generated Plan (tasks only):
    1. Task A - High Priority, Soon Deadline, Partial from <DATE_TOMORROW>, 8:00:00 AM to <DATE_TOMORROW>, 8:30:00 AM
    2. Task B - Low Priority, Soon Deadline from <DATE_TOMORROW>, 8:30:00 AM to <DATE_TOMORROW>, 9:30:00 AM
    3. Task C - High Priority, Later Deadline, Long from <DATE_TOMORROW>, 9:30:00 AM to <DATE_TOMORROW>, 11:30:00 AM
    4. Task D - Medium Priority, Later Deadline, Short from <DATE_TOMORROW>, 11:30:00 AM to <DATE_TOMORROW>, 12:00:00 PM
    5. Task E - Very Late Deadline, High Priority from <DATE_TOMORROW>, 12:00:00 PM to <DATE_TOMORROW>, 1:00:00 PM

--- Scenario 3: Repeating Events for different days & Monthly/Yearly ---
  Initialized schedule for user:Eve: <GENERATED_EVE_SCHEDULE_ID>
  Added weekly event for Mon & Wed.
  Added monthly event (15th of month).
  Added yearly event (Jan 1st).
  Action: generateSchedule for <GENERATED_EVE_SCHEDULE_ID>
  Output: Generated Plan (events only):
    1. Weekly Sync (Mon/Wed) on <DATE> at 10:00:00 AM (e.g., if <DATE> is a Wednesday)
    2. Annual Performance Review on <DATE> at 3:00:00 PM (if Jan 1st falls within horizon)
    3. Weekly Sync (Mon/Wed) on <DATE> at 10:00:00 AM (e.g., if <DATE> is a Monday)
    4. Monthly Review on <DATE> at 1:00:00 PM (if Jan 15th falls within horizon)

--- Scenario 4: Task completionLevel and remaining time ---
  Initialized schedule for user:Frank: <GENERATED_FRANK_SCHEDULE_ID>
  Added Partial Task (ID: <GENERATED_FRANK_TASK_1_ID>)
  Added Completed Task (ID: <GENERATED_FRANK_TASK_2_ID>)
  Action: generateSchedule for <GENERATED_FRANK_SCHEDULE_ID>
  Output: Generated Plan (tasks only):
    1. Partial Task from <DATE_TOMORROW>, 8:00:00 AM to <DATE_TOMORROW>, 8:30:00 AM
    2. Completed Task (Completed) from <DATE_DAY_AFTER_TOMORROW>, 12:00:00 PM to <DATE_DAY_AFTER_TOMORROW>, 12:00:00 PM (Placeholder)

Running ScheduleGeneratorConcept - Query Actions
  Action: _getScheduleByOwner for user:Grace
  Output: Retrieved schedule: <GENERATED_GRACE_SCHEDULE_ID>
  Added event <GENERATED_GRACE_EVENT_1_ID> to <GENERATED_GRACE_SCHEDULE_ID>
  Action: _getEventsForSchedule for <GENERATED_GRACE_SCHEDULE_ID>
  Output: Retrieved events: [<GENERATED_GRACE_EVENT_1_ID>]
  Added task <GENERATED_GRACE_TASK_1_ID> to <GENERATED_GRACE_SCHEDULE_ID>
  Action: _getTasksForSchedule for <GENERATED_GRACE_SCHEDULE_ID>
  Output: Retrieved tasks: [<GENERATED_GRACE_TASK_1_ID>]
  Action: _getEventDetails for <GENERATED_GRACE_EVENT_1_ID>
  Output: Retrieved event details: Event A
  Action: _getTaskDetails for <GENERATED_GRACE_TASK_1_ID>
  Output: Retrieved task details: Task X

-- Deno Test Summary --
```