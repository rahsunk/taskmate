[@newImplementation](newImplementation.md)

[@architecture](../../background/architecture.md)

[@implementing-synchronizations](../../background/implementing-synchronizations.md)

[@README](../../../src/concepts/Requesting/README.md)

[@implementation](../Requesting/implementation.md)

[@implementation](../Sessioning/implementation.md)

[@syncs](../UserAuthentication/syncs.md)

- "/api/ScheduleGenerator/initializeSchedule",
- "/api/ScheduleGenerator/addEvent",
- "/api/ScheduleGenerator/editEvent",
- "/api/ScheduleGenerator/deleteEvent",
- "/api/ScheduleGenerator/addTask",
- "/api/ScheduleGenerator/editTask",
- "/api/ScheduleGenerator/deleteTask",
- "/api/ScheduleGenerator/generateSchedule",
- "/api/ScheduleGenerator/_getScheduleByOwner",
- "/api/ScheduleGenerator/_getEventsForSchedule",
- "/api/ScheduleGenerator/_getTasksForSchedule",
- "/api/ScheduleGenerator/_getEventDetails",
- "/api/ScheduleGenerator/_getTaskDetails",
- "/api/ScheduleGenerator/_getAllSchedules",
- "/api/ScheduleGenerator/_getScheduleDetails",
- "/api/ScheduleGenerator/_getAllEvents",
- "/api/ScheduleGenerator/_getAllTasks",

# prompt: I have referenced the src/syncs/UserAuthentication.sync.ts file, which creates sessions when a user logs in and syncs for UserAuthentication actions. For the list of above excluded actions in ScheduleGenerator, generate syncs for each action in the new file ScheduleGenerator.sync.ts.  Each action should check if the user is logged in first (by using Session._getUser). Do not edit the Requesting or the Sessioning implementations. Do not add MONTHLY and YEARLY values to the RepeatFrequency in the ScheduleGenerator implementation.


# response:

An implementation of the `ScheduleGenerator.sync.ts` file is provided below. This file contains the necessary synchronizations to expose the `ScheduleGenerator` concept's actions and queries via the `Requesting` concept's API, ensuring each request is authenticated via a valid session.

The structure follows the request/response patterns demonstrated in the provided `UserAuthentication.sync.ts` example:

1.  **Actions** use a three-synchronization pattern:
    *   One sync to receive the request, validate the session, and trigger the concept action.
    *   Two syncs to handle the success or error response from the action and send it back to the client.
2.  **Queries** use a single-synchronization pattern that validates the session, performs the query, and responds with the results, gracefully handling cases where no data is found.

# file: src/syncs/ScheduleGenerator.sync.ts

```typescript
import { actions, Frames, Sync } from "@engine";
import { Requesting, Sessioning, ScheduleGenerator } from "@concepts";

// --- Initialize Schedule --- //

// Handles the incoming request, verifies the session, and triggers the action.
export const InitializeScheduleRequest: Sync = ({ request, session, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/initializeSchedule", session },
    { request },
  ]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([ScheduleGenerator.initializeSchedule, { owner: user }]),
});

// Responds on successful schedule initialization.
export const InitializeScheduleResponseSuccess: Sync = (
  { request, schedule },
) => ({
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

// Responds on schedule initialization error.
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

// --- Add Event --- //

export const AddEventRequest: Sync = (
  { request, session, user, schedule, name, startTime, endTime, repeat },
) => ({
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
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
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

// --- Edit Event --- //

export const EditEventRequest: Sync = (
  { request, session, user, schedule, oldEvent, name, startTime, endTime, repeat },
) => ({
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
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
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

// --- Delete Event --- //

export const DeleteEventRequest: Sync = (
  { request, session, user, schedule, event },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/deleteEvent", session, schedule, event },
    { request },
  ]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
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

// --- Add Task --- //

export const AddTaskRequest: Sync = (
  {
    request,
    session,
    user,
    schedule,
    name,
    deadline,
    expectedCompletionTime,
    completionLevel,
    priority,
  },
) => ({
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
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([
    ScheduleGenerator.addTask,
    {
      schedule,
      name,
      deadline,
      expectedCompletionTime,
      completionLevel,
      priority,
    },
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

// --- Edit Task --- //

export const EditTaskRequest: Sync = (
  {
    request,
    session,
    user,
    schedule,
    oldTask,
    name,
    deadline,
    expectedCompletionTime,
    completionLevel,
    priority,
  },
) => ({
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
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([
    ScheduleGenerator.editTask,
    {
      schedule,
      oldTask,
      name,
      deadline,
      expectedCompletionTime,
      completionLevel,
      priority,
    },
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

// --- Delete Task --- //

export const DeleteTaskRequest: Sync = (
  { request, session, user, schedule, task },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/deleteTask", session, schedule, task },
    { request },
  ]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([ScheduleGenerator.deleteTask, { schedule, task }]),
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

// --- Generate Schedule --- //

export const GenerateScheduleRequest: Sync = (
  { request, session, user, schedule },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/generateSchedule", session, schedule },
    { request },
  ]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([ScheduleGenerator.generateSchedule, { schedule }]),
});

export const GenerateScheduleResponseSuccess: Sync = (
  { request, scheduleId, generatedPlan },
) => ({
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

// --- QUERIES --- //

/**
 * Helper for session check for queries.
 * If authentication fails, lets the request time out.
 * If successful, passes the frame with the `user` binding through.
 */
const queryRequiresSession = async (
  frames: Frames,
  session: symbol,
  user: symbol,
): Promise<Frames> => {
  frames = await frames.query(Sessioning._getUser, { session }, { user });
  if (frames.length === 0) {
    return new Frames(); // Auth failed, return empty frames to halt sync
  }
  return frames;
};

// Get Schedule by currently logged-in owner
export const GetScheduleByOwnerRequest: Sync = (
  { request, session, user, schedule },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getScheduleByOwner", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await queryRequiresSession(frames, session, user);
    if (frames.length === 0) return new Frames();

    frames = await frames.query(
      ScheduleGenerator._getScheduleByOwner,
      { owner: frames[0][user] },
      { schedule },
    );

    if (frames.length === 0) {
      const response = { ...originalFrame, [schedule]: null }; // Respond with null if no schedule
      return new Frames(response);
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, schedule }]),
});

// All other queries follow a similar pattern: authenticate, then query, then respond.
// They take 'session' and other necessary IDs as input.

export const GetEventsForScheduleRequest: Sync = (
  { request, session, user, schedule, events },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getEventsForSchedule", session, schedule },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await queryRequiresSession(frames, session, user);
    if (frames.length === 0) return new Frames();

    frames = await frames.query(
      ScheduleGenerator._getEventsForSchedule,
      { schedule },
      { events },
    );
    // The query returns an array, even if empty, so we don't need special empty handling
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [events]: [] });
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, events }]),
});

export const GetTasksForScheduleRequest: Sync = (
  { request, session, user, schedule, tasks },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getTasksForSchedule", session, schedule },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await queryRequiresSession(frames, session, user);
    if (frames.length === 0) return new Frames();

    frames = await frames.query(
      ScheduleGenerator._getTasksForSchedule,
      { schedule },
      { tasks },
    );
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [tasks]: [] });
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, tasks }]),
});

export const GetEventDetailsRequest: Sync = (
  { request, session, user, event, eventDetails },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getEventDetails", session, event },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await queryRequiresSession(frames, session, user);
    if (frames.length === 0      { event },
      { eventDetails },
    );
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [eventDetails]: null });
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, eventDetails }]),
});

export const GetTaskDetailsRequest: Sync = (
  { request, session, user, task, taskDetails },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getTaskDetails", session, task },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await queryRequiresSession(frames, session, user);
    if (frames.length === 0) return new Frames();

    frames = await frames.query(
      ScheduleGenerator._getTaskDetails,
      { task },
      { taskDetails },
    );
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [taskDetails]: null });
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, taskDetails }]),
});

export const GetAllSchedulesRequest: Sync = (
  { request, session, user, schedules },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getAllSchedules", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await queryRequiresSession(frames, session, user);
    if (frames.length === 0) return new Frames();

    const allSchedules = await ScheduleGenerator._getAllSchedules();
    frames[0][schedules] = allSchedules;
    return frames;
  },
  then: actions([Requesting.respond, { request, schedules }]),
});

export const GetScheduleDetailsRequest: Sync = (
  { request, session, user, schedule, scheduleDetails },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getScheduleDetails", session, schedule },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await queryRequiresSession(frames, session, user);
    if (frames.length === 0) return new Frames();

    frames = await frames.query(
      ScheduleGenerator._getScheduleDetails,
      { schedule },
      { scheduleDetails },
    );
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [scheduleDetails]: null });
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, scheduleDetails }]),
});

export const GetAllEventsRequest: Sync = (
  { request, session, user, events },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getAllEvents", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await queryRequiresSession(frames, session, user);
    if (frames.length === 0) return new Frames();

    const allEvents = await ScheduleGenerator._getAllEvents();
    frames[0][events] = allEvents;
    return frames;
  },
  then: actions([Requesting.respond, { request, events }]),
});

export const GetAllTasksRequest: Sync = ({ request, session, user, tasks }) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getAllTasks", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await queryRequiresSession(frames, session, user);
    if (frames.length === 0) return new Frames();

    const allTasks = await ScheduleGenerator._getAllTasks();
    frames[0][tasks] = allTasks;
    return frames;
  },
  then: actions([Requesting.respond, { request, tasks }]),
});
```

# prompt: In the given sync file, the GetTaskDetailsRequest has some formatting error, while every (_get) action has a "No overload matches this call" issue, possibly because you are putting these _get  actions into a frames.query(), which may or may not be redundant.
# response:

Of course. There are two related issues in the provided `ScheduleGenerator.sync.ts` file that need to be addressed:

1.  **Syntax Error:** As you noted, there is a formatting error in the `GetEventDetailsRequest` synchronization.
2.  **Type Mismatch ("No overload matches this call"):** This error occurs because the `_get...` query methods in the `ScheduleGeneratorConcept` implementation do not return their results in the `Promise<Array<...>>` format expected by the synchronization engine's `.query()` helper.

To resolve this, I will first provide the necessary corrections to the query methods within `ScheduleGeneratorConcept.ts`. Then, I will provide the complete, corrected `ScheduleGenerator.sync.ts` file that implements all the required authenticated API endpoints.

### 1. Corrected `ScheduleGeneratorConcept.ts` Implementation (Queries Only)

Here are the updated query methods for `ScheduleGeneratorConcept`. These changes ensure that each query correctly returns a `Promise` of an `Array`, which resolves the "No overload matches this call" issue in the sync file.

```typescript
// file: src/ScheduleGenerator/ScheduleGeneratorConcept.ts
// (Only the updated/new query methods are shown for brevity)

// --- Concept Queries (methods prefixed with '_' as per convention) ---

  /**
   * _getScheduleByOwner (owner: User): (schedule: Schedule)[]
   * effects: Retrieves the ID of the schedule document for a given user.
   */
  async _getScheduleByOwner({ owner }: { owner: User }): Promise<{ schedule: Schedule }[]> {
    const scheduleDoc = await this.schedules.findOne({ owner });
    return scheduleDoc ? [{ schedule: scheduleDoc._id }] : [];
  }

  /**
   * _getEventsForSchedule (schedule: Schedule): (event: EventDoc)[]
   * effects: Retrieves all event documents linked to the specified schedule.
   */
  async _getEventsForSchedule({ schedule }: { schedule: Schedule }): Promise<{ event: EventDoc }[]> {
    const existingSchedule = await this.schedules.findOne({ _id: schedule });
    if (!existingSchedule) {
      return [];
    }
    const eventDocs = await this.events.find({ scheduleID: existingSchedule.scheduleID }).toArray();
    return eventDocs.map((doc) => ({ event: doc as EventDoc }));
  }

  /**
   * _getTasksForSchedule (schedule: Schedule): (task: TaskDoc)[]
   * effects: Retrieves all task documents linked to the specified schedule.
   */
  async _getTasksForSchedule({ schedule }: { schedule: Schedule }): Promise<{ task: TaskDoc }[]> {
    const existingSchedule = await this.schedules.findOne({ _id: schedule });
    if (!existingSchedule) {
      return [];
    }
    const taskDocs = await this.tasks.find({ scheduleID: existingSchedule.scheduleID }).toArray();
    return taskDocs.map((doc) => ({ task: doc as TaskDoc }));
  }

  /**
   * _getEventDetails (event: Event): (eventDetails: EventDoc)[]
   * effects: Retrieves the full document for a specific event.
   */
  async _getEventDetails({ event }: { event: Event }): Promise<{ eventDetails: EventDoc }[]> {
    const eventDoc = await this.events.findOne({ _id: event });
    return eventDoc ? [{ eventDetails: eventDoc as EventDoc }] : [];
  }

  /**
   * _getTaskDetails (task: Task): (taskDetails: TaskDoc)[]
   * effects: Retrieves the full document for a specific task.
   */
  async _getTaskDetails({ task }: { task: Task }): Promise<{ taskDetails: TaskDoc }[]> {
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
  async _getScheduleDetails({ schedule }: { schedule: Schedule }): Promise<{ scheduleDetails: ScheduleDoc }[]> {
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
```

### 2. Corrected `ScheduleGenerator.sync.ts` File

This file contains the complete and corrected synchronizations for all `ScheduleGenerator` actions and queries, with session validation for each request.

# file: src/syncs/ScheduleGenerator.sync.ts

```typescript
import { actions, Frames, Sync } from "@engine";
import { Requesting, ScheduleGenerator, Sessioning } from "@concepts";

// --- Initialize Schedule --- //

// Handles the incoming request, verifies the session, and triggers the action.
export const InitializeScheduleRequest: Sync = (
  { request, session, user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/initializeSchedule", session },
    { request },
  ]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([ScheduleGenerator.initializeSchedule, { owner: user }]),
});

// Responds on successful schedule initialization.
export const InitializeScheduleResponseSuccess: Sync = (
  { request, schedule },
) => ({
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

// Responds on schedule initialization error.
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

// --- Add Event --- //

export const AddEventRequest: Sync = (
  { request, session, user, schedule, name, startTime, endTime, repeat },
) => ({
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
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
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

// --- Edit Event --- //

export const EditEventRequest: Sync = (
  {
    request,
    session,
    user,
    schedule,
    oldEvent,
    name,
    startTime,
    endTime,
    repeat,
  },
) => ({
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
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
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

// --- Delete Event --- //

export const DeleteEventRequest: Sync = (
  { request, session, user, schedule, event },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/deleteEvent", session, schedule, event },
    { request },
  ]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
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

// --- Add Task --- //

export const AddTaskRequest: Sync = (
  {
    request,
    session,
    user,
    schedule,
    name,
    deadline,
    expectedCompletionTime,
    completionLevel,
    priority,
  },
) => ({
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
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([
    ScheduleGenerator.addTask,
    {
      schedule,
      name,
      deadline,
      expectedCompletionTime,
      completionLevel,
      priority,
    },
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

// --- Edit Task --- //

export const EditTaskRequest: Sync = (
  {
    request,
    session,
    user,
    schedule,
    oldTask,
    name,
    deadline,
    expectedCompletionTime,
    completionLevel,
    priority,
  },
) => ({
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
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([
    ScheduleGenerator.editTask,
    {
      schedule,
      oldTask,
      name,
      deadline,
      expectedCompletionTime,
      completionLevel,
      priority,
    },
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

// --- Delete Task --- //

export const DeleteTaskRequest: Sync = (
  { request, session, user, schedule, task },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/deleteTask", session, schedule, task },
    { request },
  ]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([ScheduleGenerator.deleteTask, { schedule, task }]),
});

export const DeleteTaskResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/deleteTask" }, {
      request,
    }],
    [ScheduleGenerator.deleteTask, {}, {}],
  ),
  then: actions([Requesting.respond, { request, status: "task_deleted" }]),
});

export const DeleteTaskResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/deleteTask" }, {
      request,
    }],
    [ScheduleGenerator.deleteTask, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Generate Schedule --- //

export const GenerateScheduleRequest: Sync = (
  { request, session, user, schedule },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/generateSchedule", session, schedule },
    { request },
  ]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([ScheduleGenerator.generateSchedule, { schedule }]),
});

export const GenerateScheduleResponseSuccess: Sync = (
  { request, scheduleId, generatedPlan },
) => ({
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

// --- QUERIES --- //

// Get Schedule by currently logged-in owner
export const GetScheduleByOwnerRequest: Sync = (
  { request, session, user, schedule },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getScheduleByOwner", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return new Frames(); // Auth failed

    frames = await frames.query(
      ScheduleGenerator._getScheduleByOwner,
      { owner: user },
      { schedule },
    );

    if (frames.length === 0) {
      // If no schedule found, return the original frame with 'schedule' explicitly set to null
      return new Frames({ ...originalFrame, [schedule]: null });
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, schedule }]),
});

// Get all events for a specific schedule
export const GetEventsForScheduleRequest: Sync = (
  { request, session, user, schedule, event, events },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getEventsForSchedule", session, schedule },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return new Frames(); // Auth failed

    // Query returns an array of { event: EventDoc }[]
    // We need to collect all the `event` bindings into a single array
    frames = await frames.query(
      ScheduleGenerator._getEventsForSchedule,
      { schedule },
      { event },
    );

    // Extract all event values from the frames into a single array
    const allEvents = frames.map(f => f[event]);
    return new Frames({ ...originalFrame, [events]: allEvents });
  },
  then: actions([Requesting.respond, { request, events }]),
});

// Get all tasks for a specific schedule
export const GetTasksForScheduleRequest: Sync = (
  { request, session, user, schedule, task, tasks },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getTasksForSchedule", session, schedule },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return new Frames(); // Auth failed

    // Query returns an array of { task: TaskDoc }[]
    frames = await frames.query(
      ScheduleGenerator._getTasksForSchedule,
      { schedule },
      { task },
    );

    // Extract all task values from the frames into a single array
    const allTasks = frames.map(f => f[task]);
    return new Frames({ ...originalFrame, [tasks]: allTasks });
  },
  then: actions([Requesting.respond, { request, tasks }]),
});

// Get details for a specific event
export const GetEventDetailsRequest: Sync = (
  { request, session, user, event, eventDetails },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getEventDetails", session, event },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return new Frames(); // Auth failed

    frames = await frames.query(
      ScheduleGenerator._getEventDetails,
      { event },
      { eventDetails },
    );
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [eventDetails]: null });
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, eventDetails }]),
});

// Get details for a specific task
export const GetTaskDetailsRequest: Sync = (
  { request, session, user, task, taskDetails },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getTaskDetails", session, task },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return new Frames(); // Auth failed

    frames = await frames.query(
      ScheduleGenerator._getTaskDetails,
      { task },
      { taskDetails },
    );
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [taskDetails]: null });
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, taskDetails }]),
});

// Get ALL schedules (admin-like query)
export const GetAllSchedulesRequest: Sync = (
  { request, session, user, schedules },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getAllSchedules", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return new Frames(); // Auth failed

    // Call query directly and bind result array to the frame
    const allSchedules = await ScheduleGenerator._getAllSchedules();
    return new Frames({ ...originalFrame, [schedules]: allSchedules });
  },
  then: actions([Requesting.respond, { request, schedules }]),
});

// Get details for a specific schedule
export const GetScheduleDetailsRequest: Sync = (
  { request, session, user, schedule, scheduleDetails },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getScheduleDetails", session, schedule },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return new Frames(); // Auth failed

    frames = await frames.query(
      ScheduleGenerator._getScheduleDetails,
      { schedule },
      { scheduleDetails },
    );
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [scheduleDetails]: null });
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, scheduleDetails }]),
});

// Get ALL events (admin-like query)
export const GetAllEventsRequest: Sync = (
  { request, session, user, events },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getAllEvents", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return new Frames(); // Auth failed

    const allEvents = await ScheduleGenerator._getAllEvents();
    return new Frames({ ...originalFrame, [events]: allEvents });
  },
  then: actions([Requesting.respond, { request, events }]),
});

// Get ALL tasks (admin-like query)
export const GetAllTasksRequest: Sync = (
  { request, session, user, tasks },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getAllTasks", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return new Frames(); // Auth failed

    const allTasks = await ScheduleGenerator._getAllTasks();
    return new Frames({ ...originalFrame, [tasks]: allTasks });
  },
  then: actions([Requesting.respond, { request, tasks }]),
});
```
