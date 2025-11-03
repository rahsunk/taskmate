---
timestamp: 'Mon Nov 03 2025 13:17:55 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251103_131755.d4ab564a.md]]'
content_id: 5ff7fd66b41fc72775029924545b5f2532a691ebf393c8ad5657c01ee675adf5
---

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
    if (frames.length === 0) return new Frames();

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
