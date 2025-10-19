---
timestamp: 'Sun Oct 19 2025 12:28:18 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_122818.14c8adba.md]]'
content_id: 46f409e74b056e4cc52cfd8c100fc62b13b4fd5f045bc747aef973248cbac9fe
---

# response:

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

/**
 * Defines the types of repetition for events.
 * Can be extended to include more complex patterns.
 */
enum RepeatDateTypeEnum {
  NONE = "NONE",
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY",
}
// Allows for predefined enum values or specific custom repeat strings for flexibility
type RepeatDate = RepeatDateTypeEnum | string;

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
  repeatDate: RepeatDate; // How often the event repeats
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
  expectedCompletionTime: number; // Estimated time needed for task completion (e.g., in hours)
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
    { _id: name },               // Find the counter document by its name
    { $inc: { seq: 1 } },         // Increment the 'seq' field by 1
    { upsert: true, returnDocument: "after" }, // Create if not exists, return the updated document
  );
  // Return the new sequence value, defaulting to 1 if it was just created
  return result?.value?.seq || 1;
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
   * addEvent (schedule: Schedule, name: String, startTime: Date, endTime: Date, repeatDate: RepeatDate): (event: Event)
   *
   * requires: The `schedule` identified by `schedule` ID must exist.
   *
   * effects: Creates and returns a new event document. This event is linked to the specified
   *          schedule via its `scheduleID`. An internal `eventID` is incremented and assigned.
   *
   * @param {Object} params - The action parameters.
   * @param {Schedule} params.schedule - The ID of the schedule to add the event to.
   * @param {string} params.name - The descriptive name of the event.
   * @param {Date} params.startTime - The start date and time of the event.
   * @param {Date} params.endTime - The end date and time of the event.
   * @param {RepeatDate} params.repeatDate - The repetition pattern for the event.
   * @returns {Promise<{event?: Event; error?: string}>} - The ID of the newly created event document or an error message.
   */
  async addEvent({
    schedule,
    name,
    startTime,
    endTime,
    repeatDate,
  }: {
    schedule: Schedule;
    name: string;
    startTime: Date;
    endTime: Date;
    repeatDate: RepeatDate;
  }): Promise<{ event?: Event; error?: string }> {
    // Precondition: check if the schedule exists
    const existingSchedule = await this.schedules.findOne({ _id: schedule });
    if (!existingSchedule) {
      return { error: `Schedule with ID ${schedule} not found.` };
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
      repeatDate,
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
   * editEvent (schedule: Schedule, oldEvent: Event, name: String, startTime: Date, endTime: Date, repeatDate: RepeatDate)
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
   * @param {RepeatDate} params.repeatDate - The new repetition pattern.
   * @returns {Promise<Empty | {error: string}>} - An empty object on successful modification or an error message.
   */
  async editEvent({
    schedule,
    oldEvent,
    name,
    startTime,
    endTime,
    repeatDate,
  }: {
    schedule: Schedule;
    oldEvent: Event;
    name: string;
    startTime: Date;
    endTime: Date;
    repeatDate: RepeatDate;
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

    try {
      await this.events.updateOne(
        { _id: oldEvent },
        { $set: { name, startTime, endTime, repeatDate } },
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
   * addTask (schedule: Schedule, name: String, deadline: Date, expectedCompletionTime: Number, priority: Percent): (task: Task)
   *
   * requires: The `schedule` identified by `schedule` ID must exist.
   *
   * effects: Creates and returns a new task document, linked to the specified schedule.
   *          Sets initial `completionLevel` to 0. An internal `taskID` is incremented and assigned.
   *
   * @param {Object} params - The action parameters.
   * @param {Schedule} params.schedule - The ID of the schedule to add the task to.
   * @param {string} params.name - The descriptive name of the task.
   * @param {Date} params.deadline - The deadline date for the task.
   * @param {number} params.expectedCompletionTime - The estimated time to complete the task (e.g., in hours).
   * @param {Percent} params.priority - The priority level of the task (0-100%).
   * @returns {Promise<{task?: Task; error?: string}>} - The ID of the newly created task document or an error message.
   */
  async addTask({
    schedule,
    name,
    deadline,
    expectedCompletionTime,
    priority,
  }: {
    schedule: Schedule;
    name: string;
    deadline: Date;
    expectedCompletionTime: number;
    priority: Percent;
  }): Promise<{ task?: Task; error?: string }> {
    // Precondition: check if schedule exists
    const existingSchedule = await this.schedules.findOne({ _id: schedule });
    if (!existingSchedule) {
      return { error: `Schedule with ID ${schedule} not found.` };
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
      completionLevel: 0, // Tasks start at 0% completion
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
   * @param {number} params.expectedCompletionTime - The new estimated completion time.
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
   * generateSchedule (schedule: Schedule): (newSchedule: Schedule | error: Error)
   *
   * requires: The `schedule` identified by `schedule` ID must exist.
   *
   * effects: Retrieves all events and tasks associated with the given schedule.
   *          It then simulates an optimization algorithm to prioritize tasks.
   *          The generated (optimized) schedule is not explicitly stored in this
   *          concept's state but is represented by the processed state of events/tasks
   *          and is logged for demonstration. If the generation process encounters
   *          an unresolvable conflict, an error is returned.
   *          Returns the ID of the processed schedule on success.
   *
   * @param {Object} params - The action parameters.
   * @param {Schedule} params.schedule - The ID of the schedule to generate.
   * @returns {Promise<{newSchedule?: Schedule; error?: string}>} - The ID of the processed schedule or an error message.
   */
  async generateSchedule({
    schedule,
  }: {
    schedule: Schedule;
  }): Promise<{ newSchedule?: Schedule; error?: string }> {
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

    // --- Placeholder for the actual complex scheduling algorithm ---
    // A full implementation would involve:
    // 1. Parsing repeating events to create concrete instances over a planning horizon.
    // 2. Identifying all fixed time blocks from events.
    // 3. Determining flexible time slots where tasks can be placed.
    // 4. Sorting tasks based on the specified criteria (deadline, priority, expected completion time, completion level).
    //    The criteria: "tasks with a sooner deadline, higher priority level, higher expectedCompletionTime,
    //    and higher completionLevel are scheduled first."
    //    (Note: "higher completionTime" is interpreted as `completionLevel` for this context, implying
    //     tasks that are closer to being finished might be prioritized to clear them).
    // 5. Attempting to fit the prioritized tasks into available slots, considering `expectedCompletionTime`.
    // 6. Detecting and reporting conflicts if a feasible schedule cannot be created.

    // Simulate task prioritization based on the specified criteria for demonstration purposes.
    tasks.sort((a, b) => {
      // 1. Sooner deadline first
      const deadlineDiff = a.deadline.getTime() - b.deadline.getTime();
      if (deadlineDiff !== 0) return deadlineDiff;

      // 2. Higher priority level first
      const priorityDiff = b.priority - a.priority; // Descending order
      if (priorityDiff !== 0) return priorityDiff;

      // 3. Higher expectedCompletionTime first (tasks requiring more effort might be more critical)
      const ectDiff = b.expectedCompletionTime - a.expectedCompletionTime; // Descending order
      if (ectDiff !== 0) return ectDiff;

      // 4. Higher completionLevel first (to finish tasks already in progress)
      const completionDiff = b.completionLevel - a.completionLevel; // Descending order
      if (completionDiff !== 0) return completionDiff;

      return 0; // Maintain original relative order if all criteria are equal
    });

    // Output a simulation of the generated schedule or report.
    console.log(
      `\n--- Schedule Generation Report for ${existingSchedule.owner} (Schedule ID: ${existingSchedule._id}) ---`,
    );
    console.log("\nFixed Events:");
    if (events.length === 0) {
      console.log("  No events defined.");
    } else {
      events.forEach((event) =>
        console.log(
          `  - ${event.name} (Start: ${event.startTime.toLocaleString()}, End: ${event.endTime.toLocaleString()}, Repeat: ${event.repeatDate})`,
        )
      );
    }

    console.log("\nPrioritized Tasks (Order for Scheduling):");
    if (tasks.length === 0) {
      console.log("  No tasks defined.");
    } else {
      tasks.forEach((task) =>
        console.log(
          `  - ${task.name} (Deadline: ${task.deadline.toLocaleDateString()}, Expected: ${task.expectedCompletionTime}h, Prio: ${task.priority}%, Comp: ${task.completionLevel}%)`,
        )
      );
    }
    console.log("\n--- End of Report ---");

    // This variable would be the result of a complex algorithm.
    const isFeasible = true; // Placeholder: assume feasibility for this basic implementation.
    if (!isFeasible) {
      return {
        error:
          "Could not generate a feasible schedule given current events and tasks.",
      };
    }

    // Since the concept state doesn't define where to store the 'generated plan',
    // and the action's return type is `Schedule`, we return the ID of the
    // schedule that was processed, indicating that the generation process occurred.
    return { newSchedule: existingSchedule._id };
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
