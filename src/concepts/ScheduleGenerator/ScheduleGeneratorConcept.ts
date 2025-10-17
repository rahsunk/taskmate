import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "../../utils/types.ts"; // Adjust path as necessary for your project structure
import { freshID } from "../../utils/database.ts"; // Adjust path as necessary for your project structure

// Declare collection prefix, use concept name
const PREFIX = "ScheduleGenerator" + ".";

// Generic types of this concept
type User = ID;
type Schedule = ID; // ID for the schedule configuration itself, and also for generated schedules
type Event = ID;
type Task = ID;
type Time = string; // e.g., "HH:MM" for a specific time of day (e.g., "09:00", "17:30")
type RepeatTime = "Daily" | "Weekly" | "Monthly" | "None"; // Specific literal types for clarity
type Date = string; // e.g., "YYYY-MM-DD" for a specific date (e.g., "2023-10-27")
type Percent = number; // 0-100 for percentage values

/**
 * @state
 * A `ScheduleDoc` represents either:
 * 1. A *configuration* schedule: holds the set of events and tasks that a user wants to be scheduled.
 *    Its `timestamp` acts as a version counter for when `generateSchedule` was last called for this configuration.
 * 2. A *generated* schedule: an immutable snapshot of an actual generated schedule for a specific `timestamp`.
 *    It references the events and tasks that were used to create it.
 *
 * `schedules` collection:
 *   - `_id`: The unique identifier for this schedule (configuration or generated).
 *   - `owner`: The ID of the user who owns this schedule.
 *   - `events`: An array of IDs of `EventDoc`s belonging to this schedule (references).
 *   - `tasks`: An array of IDs of `TaskDoc`s belonging to this schedule (references).
 *   - `timestamp`: A version number. For configuration schedules, it increments each time `generateSchedule` is called.
 *                  For generated schedules, it matches the timestamp of the configuration schedule it was generated from.
 */
interface ScheduleDoc {
  _id: Schedule;
  owner: User;
  events: Event[]; // References (IDs) to Event documents
  tasks: Task[]; // References (IDs) to Task documents
  timestamp: number; // Version number for this schedule instance
}

/**
 * @state
 * `events` collection:
 *   - `_id`: The unique identifier for this event.
 *   - `name`: The name or description of the event.
 *   - `schedulePointer`: The ID of the `ScheduleDoc` (configuration) this event belongs to.
 *   - `startTime`: The start time of the event (e.g., "09:00").
 *   - `endTime`: The end time of the event (e.g., "10:00").
 *   - `repeatTime`: How often the event repeats (e.g., "Daily", "Weekly", "None").
 */
interface EventDoc {
  _id: Event;
  name: string;
  schedulePointer: Schedule;
  startTime: Time;
  endTime: Time;
  repeatTime: RepeatTime;
}

/**
 * @state
 * `tasks` collection:
 *   - `_id`: The unique identifier for this task.
 *   - `name`: The name or description of the task.
 *   - `schedulePointer`: The ID of the `ScheduleDoc` (configuration) this task belongs to.
 *   - `deadline`: The deadline date for the task (e.g., "2023-10-31").
 *   - `expectedCompletionTime`: The estimated time needed to complete the task (e.g., in minutes or hours).
 *   - `completionLevel`: The current completion percentage of the task (0-100).
 *   - `priority`: The priority level of the task (0-100, higher means more important).
 */
interface TaskDoc {
  _id: Task;
  name: string;
  schedulePointer: Schedule;
  deadline: Date;
  expectedCompletionTime: number;
  completionLevel: Percent;
  priority: Percent;
}

/**
 * @concept ScheduleGenerator
 * @purpose manages events and tasks for users to automatically generate a schedule that meets their needs
 * @principle Given a set of events and tasks, an optimal schedule for the user is created.
 * When events and tasks are updated and removed, the schedule is regenerated.
 */
export default class ScheduleGeneratorConcept {
  private schedules: Collection<ScheduleDoc>;
  private events: Collection<EventDoc>;
  private tasks: Collection<TaskDoc>;

  constructor(private readonly db: Db) {
    this.schedules = this.db.collection(PREFIX + "schedules");
    this.events = this.db.collection(PREFIX + "events");
    this.tasks = this.db.collection(PREFIX + "tasks");
  }

  /**
   * @action initializeSchedule
   * @requires owner exists (this concept assumes the owner ID is valid from an external source)
   * @effects creates an empty `schedule` configuration document with the given `owner` and an initial `timestamp` of 0.
   * @param {Object} { owner } - The ID of the user who owns this schedule.
   * @returns {Promise<{ schedule: Schedule } | { error: string }>} The ID of the newly created schedule configuration or an error.
   */
  async initializeSchedule(
    { owner }: { owner: User },
  ): Promise<{ schedule: Schedule } | { error: string }> {
    try {
      const newScheduleId = freshID();
      const newSchedule: ScheduleDoc = {
        _id: newScheduleId,
        owner: owner,
        events: [], // Initially empty list of event references
        tasks: [], // Initially empty list of task references
        timestamp: 0, // Initial version for a new schedule configuration
      };

      await this.schedules.insertOne(newSchedule);
      return { schedule: newScheduleId };
    } catch (e: any) {
      console.error("Error initializing schedule:", e);
      return { error: `Failed to initialize schedule: ${e.message}` };
    }
  }

  /**
   * @action addEvent
   * @requires schedule exists
   * @effects creates a new event document and adds its ID to the specified configuration schedule's events list.
   * @param {Object} { schedule, name, startTime, endTime, repeatTime } - Event details and the target schedule configuration ID.
   * @returns {Promise<{ event: Event } | { error: string }>} The ID of the newly created event or an error.
   */
  async addEvent(
    { schedule, name, startTime, endTime, repeatTime }: {
      schedule: Schedule;
      name: string;
      startTime: Time;
      endTime: Time;
      repeatTime: RepeatTime;
    },
  ): Promise<{ event: Event } | { error: string }> {
    try {
      const existingSchedule = await this.schedules.findOne({
        _id: schedule,
      });
      if (!existingSchedule) {
        return {
          error: `Schedule configuration with ID '${schedule}' not found.`,
        };
      }

      const newEventId = freshID();
      const newEvent: EventDoc = {
        _id: newEventId,
        name: name,
        schedulePointer: schedule,
        startTime: startTime,
        endTime: endTime,
        repeatTime: repeatTime,
      };

      await this.events.insertOne(newEvent);

      // Add the new event's ID to the schedule's events array
      await this.schedules.updateOne(
        { _id: schedule },
        { $push: { events: newEventId } },
      );

      return { event: newEventId };
    } catch (e: any) {
      console.error("Error adding event:", e);
      return { error: `Failed to add event: ${e.message}` };
    }
  }

  /**
   * @action editEvent
   * @requires oldEvent is in the set of Events of schedule
   * @effects modifies the specified event document with the given new attributes.
   * @param {Object} { schedule, oldEvent, name, startTime, endTime, repeatTime } - Event details to update and the target schedule configuration ID.
   * @returns {Promise<Empty | { error: string }>} An empty object on success or an error.
   */
  async editEvent(
    { schedule, oldEvent, name, startTime, endTime, repeatTime }: {
      schedule: Schedule;
      oldEvent: Event;
      name: string;
      startTime: Time;
      endTime: Time;
      repeatTime: RepeatTime;
    },
  ): Promise<Empty | { error: string }> {
    try {
      const existingSchedule = await this.schedules.findOne({
        _id: schedule,
      });
      if (!existingSchedule) {
        return {
          error: `Schedule configuration with ID '${schedule}' not found.`,
        };
      }
      if (!existingSchedule.events.includes(oldEvent)) {
        return {
          error:
            `Event with ID '${oldEvent}' not found in schedule configuration '${schedule}'.`,
        };
      }

      const updateResult = await this.events.updateOne(
        { _id: oldEvent, schedulePointer: schedule },
        {
          $set: {
            name: name,
            startTime: startTime,
            endTime: endTime,
            repeatTime: repeatTime,
          },
        },
      );

      if (updateResult.matchedCount === 0) {
        return {
          error:
            `Event with ID '${oldEvent}' not found or does not belong to schedule configuration '${schedule}'.`,
        };
      }

      return {};
    } catch (e: any) {
      console.error("Error editing event:", e);
      return { error: `Failed to edit event: ${e.message}` };
    }
  }

  /**
   * @action deleteEvent
   * @requires event is in the set of Events of schedule
   * @effects removes the event's ID from the schedule configuration's events list and deletes the event document.
   * @param {Object} { schedule, event } - The IDs of the schedule configuration and event to delete.
   * @returns {Promise<Empty | { error: string }>} An empty object on success or an error.
   */
  async deleteEvent(
    { schedule, event }: { schedule: Schedule; event: Event },
  ): Promise<Empty | { error: string }> {
    try {
      const existingSchedule = await this.schedules.findOne({
        _id: schedule,
      });
      if (!existingSchedule) {
        return {
          error: `Schedule configuration with ID '${schedule}' not found.`,
        };
      }
      if (!existingSchedule.events.includes(event)) {
        return {
          error:
            `Event with ID '${event}' not found in schedule configuration '${schedule}'.`,
        };
      }

      // Remove the event's ID from the schedule configuration's events array
      await this.schedules.updateOne(
        { _id: schedule },
        { $pull: { events: event } },
      );

      // Delete the actual event document
      const deleteResult = await this.events.deleteOne({ _id: event });
      if (deleteResult.deletedCount === 0) {
        // This case should ideally not happen if the includes check passed
        return { error: `Event document with ID '${event}' not found.` };
      }

      return {};
    } catch (e: any) {
      console.error("Error deleting event:", e);
      return { error: `Failed to delete event: ${e.message}` };
    }
  }

  /**
   * @action addTask
   * @requires schedule exists
   * @effects creates a new task document with `completionLevel` 0% and adds its ID to the schedule configuration's tasks list.
   * @param {Object} { schedule, name, deadline, expectedCompletionTime, priority } - Task details and target schedule configuration ID.
   * @returns {Promise<{ task: Task } | { error: string }>} The ID of the newly created task or an error.
   */
  async addTask(
    { schedule, name, deadline, expectedCompletionTime, priority }: {
      schedule: Schedule;
      name: string;
      deadline: Date;
      expectedCompletionTime: number;
      priority: Percent;
    },
  ): Promise<{ task: Task } | { error: string }> {
    try {
      const existingSchedule = await this.schedules.findOne({
        _id: schedule,
      });
      if (!existingSchedule) {
        return {
          error: `Schedule configuration with ID '${schedule}' not found.`,
        };
      }

      const newTaskId = freshID();
      const newTask: TaskDoc = {
        _id: newTaskId,
        name: name,
        schedulePointer: schedule,
        deadline: deadline,
        expectedCompletionTime: expectedCompletionTime,
        completionLevel: 0, // Initial completion level is 0%
        priority: priority,
      };

      await this.tasks.insertOne(newTask);

      // Add the new task's ID to the schedule configuration's tasks array
      await this.schedules.updateOne(
        { _id: schedule },
        { $push: { tasks: newTaskId } },
      );

      return { task: newTaskId };
    } catch (e: any) {
      console.error("Error adding task:", e);
      return { error: `Failed to add task: ${e.message}` };
    }
  }

  /**
   * @action editTask
   * @requires oldTask is in the set of Tasks of schedule
   * @effects modifies the specified task document with the given new attributes.
   * @param {Object} { schedule, oldTask, name, deadline, expectedCompletionTime, completionLevel, priority } - Task details to update and the target schedule configuration ID.
   * @returns {Promise<Empty | { error: string }>} An empty object on success or an error.
   */
  async editTask(
    {
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
    },
  ): Promise<Empty | { error: string }> {
    try {
      const existingSchedule = await this.schedules.findOne({
        _id: schedule,
      });
      if (!existingSchedule) {
        return {
          error: `Schedule configuration with ID '${schedule}' not found.`,
        };
      }
      if (!existingSchedule.tasks.includes(oldTask)) {
        return {
          error:
            `Task with ID '${oldTask}' not found in schedule configuration '${schedule}'.`,
        };
      }

      const updateResult = await this.tasks.updateOne(
        { _id: oldTask, schedulePointer: schedule },
        {
          $set: {
            name: name,
            deadline: deadline,
            expectedCompletionTime: expectedCompletionTime,
            completionLevel: completionLevel,
            priority: priority,
          },
        },
      );

      if (updateResult.matchedCount === 0) {
        return {
          error:
            `Task with ID '${oldTask}' not found or does not belong to schedule configuration '${schedule}'.`,
        };
      }

      return {};
    } catch (e: any) {
      console.error("Error editing task:", e);
      return { error: `Failed to edit task: ${e.message}` };
    }
  }

  /**
   * @action deleteTask
   * @requires task is in the set of Tasks of schedule
   * @effects removes the task's ID from the schedule configuration's tasks list and deletes the task document.
   * @param {Object} { schedule, task } - The IDs of the schedule configuration and task to delete.
   * @returns {Promise<Empty | { error: string }>} An empty object on success or an error.
   */
  async deleteTask(
    { schedule, task }: { schedule: Schedule; task: Task },
  ): Promise<Empty | { error: string }> {
    try {
      const existingSchedule = await this.schedules.findOne({
        _id: schedule,
      });
      if (!existingSchedule) {
        return {
          error: `Schedule configuration with ID '${schedule}' not found.`,
        };
      }
      if (!existingSchedule.tasks.includes(task)) {
        return {
          error:
            `Task with ID '${task}' not found in schedule configuration '${schedule}'.`,
        };
      }

      // Remove the task's ID from the schedule configuration's tasks array
      await this.schedules.updateOne(
        { _id: schedule },
        { $pull: { tasks: task } },
      );

      // Delete the actual task document
      const deleteResult = await this.tasks.deleteOne({ _id: task });
      if (deleteResult.deletedCount === 0) {
        return { error: `Task document with ID '${task}' not found.` };
      }

      return {};
    } catch (e: any) {
      console.error("Error deleting task:", e);
      return { error: `Failed to delete task: ${e.message}` };
    }
  }

  /**
   * @action generateSchedule
   * @requires schedule exists
   * @effects Creates a *new* schedule document (the generated schedule) for the given schedule configuration's owner,
   *          incorporating all current events and tasks linked to that configuration.
   *          It increments the *configuration schedule's* `timestamp` to track the version of the last
   *          generated output, and assigns this new timestamp to the newly generated schedule.
   *          If scheduling is not possible, an error is returned.
   * @param {Object} { schedule: targetScheduleId } - The ID of the schedule configuration to generate from.
   * @returns {Promise<{ newSchedule: Schedule } | { error: string }>} The ID of the newly generated schedule document or an error.
   */
  async generateSchedule(
    { schedule: targetScheduleId }: { schedule: Schedule },
  ): Promise<{ newSchedule: Schedule } | { error: string }> {
    try {
      const existingConfigurationSchedule = await this.schedules.findOne({
        _id: targetScheduleId,
      });
      if (!existingConfigurationSchedule) {
        return {
          error:
            `Schedule configuration with ID '${targetScheduleId}' not found.`,
        };
      }

      // Fetch all events and tasks linked to the existing configuration schedule
      const eventsData = await this.events.find({
        schedulePointer: targetScheduleId,
      }).toArray();
      const tasksData = await this.tasks.find({
        schedulePointer: targetScheduleId,
      }).toArray();

      // --- Placeholder for the actual scheduling algorithm ---
      // This section would contain complex logic to:
      // 1. Process fixed events (startTime, endTime, repeatTime).
      // 2. Prioritize tasks based on deadline, priority, expectedCompletionTime, completionLevel.
      // 3. Find optimal time slots for tasks around events.
      // 4. Handle overlaps, resource conflicts, and user preferences.
      // 5. Determine if a feasible schedule can be generated.
      // For this implementation, we simulate the outcome without the detailed algorithmic work.

      // Example: A very simple (non-optimal) logic or impossibility condition
      // A real scheduler would check for time conflicts, capacity, etc.
      const totalExpectedTaskTime = tasksData.reduce(
        (acc, task) =>
          acc + task.expectedCompletionTime * (1 - task.completionLevel / 100),
        0,
      );
      // Arbitrary heuristic: if total task time is very high or there are too many fixed events,
      // assume it's "impossible" to generate a perfect schedule.
      if (eventsData.length > 10 || totalExpectedTaskTime > 40) { // e.g., > 40 hours of task work
        return {
          error:
            "Scheduling complexity too high; a feasible schedule cannot be generated with current configuration.",
        };
      }
      // --- End of scheduling algorithm placeholder ---

      // Increment the timestamp of the *configuration* schedule.
      // This marks a new version of the *generated output* derived from this configuration.
      const newTimestamp = existingConfigurationSchedule.timestamp + 1;
      await this.schedules.updateOne(
        { _id: targetScheduleId },
        { $set: { timestamp: newTimestamp } },
      );

      // Create a *new* schedule document (the generated schedule) with the incremented timestamp
      const newGeneratedScheduleId = freshID();
      const newGeneratedScheduleDoc: ScheduleDoc = {
        _id: newGeneratedScheduleId,
        owner: existingConfigurationSchedule.owner,
        // The generated schedule references the *current* events and tasks of the configuration.
        // In a real scenario, this might be a complex object representing the actual scheduled blocks.
        events: eventsData.map((e) => e._id),
        tasks: tasksData.map((t) => t._id),
        timestamp: newTimestamp, // Use the updated timestamp from the configuration schedule
      };

      await this.schedules.insertOne(newGeneratedScheduleDoc);

      return { newSchedule: newGeneratedScheduleId };
    } catch (e: any) {
      console.error("Error generating schedule:", e);
      return { error: `Failed to generate schedule: ${e.message}` };
    }
  }

  // --- Concept Queries ---
  // Queries are methods starting with an underscore "_" and do not modify state.
  // They provide significant or non-trivial observations of the concept's state.

  /**
   * @query _getSchedule
   * @effects returns a specific schedule document (configuration or generated) by its ID.
   * @param {Object} { scheduleId } - The ID of the schedule to retrieve.
   * @returns {Promise<ScheduleDoc | null | { error: string }>} The Schedule document, null if not found, or an error.
   */
  async _getSchedule(
    { scheduleId }: { scheduleId: Schedule },
  ): Promise<ScheduleDoc | null | { error: string }> {
    try {
      const schedule = await this.schedules.findOne({ _id: scheduleId });
      return schedule;
    } catch (e: any) {
      console.error("Error getting schedule:", e);
      return { error: `Failed to retrieve schedule: ${e.message}` };
    }
  }

  /**
   * @query _getEventsBySchedulePointer
   * @effects returns an array of all event documents associated with a given schedule configuration ID.
   * @param {Object} { schedulePointer } - The ID of the schedule configuration.
   * @returns {Promise<EventDoc[] | { error: string }>} An array of Event documents or an error.
   */
  async _getEventsBySchedulePointer(
    { schedulePointer }: { schedulePointer: Schedule },
  ): Promise<EventDoc[] | { error: string }> {
    try {
      const events = await this.events.find({ schedulePointer }).toArray();
      return events;
    } catch (e: any) {
      console.error("Error getting schedule events by pointer:", e);
      return { error: `Failed to retrieve schedule events: ${e.message}` };
    }
  }

  /**
   * @query _getTasksBySchedulePointer
   * @effects returns an array of all task documents associated with a given schedule configuration ID.
   * @param {Object} { schedulePointer } - The ID of the schedule configuration.
   * @returns {Promise<TaskDoc[] | { error: string }>} An array of Task documents or an error.
   */
  async _getTasksBySchedulePointer(
    { schedulePointer }: { schedulePointer: Schedule },
  ): Promise<TaskDoc[] | { error: string }> {
    try {
      const tasks = await this.tasks.find({ schedulePointer }).toArray();
      return tasks;
    } catch (e: any) {
      console.error("Error getting schedule tasks by pointer:", e);
      return { error: `Failed to retrieve schedule tasks: ${e.message}` };
    }
  }
}
