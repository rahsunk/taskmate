---
timestamp: 'Mon Nov 03 2025 13:23:51 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251103_132351.4fdac4f7.md]]'
content_id: 5f2d9b11ceb2e760211afc1c3612612bf40367fe98e0ba0d629a6bd8a88c7bc2
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
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return new Frames(); // Auth failed

    // Query for all events and collect them into a single `events` array
    frames = await frames.query(
      ScheduleGenerator._getEventsForSchedule,
      { schedule },
      { event },
    );
    return frames.collectAs([event], events);
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
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return new Frames(); // Auth failed

    frames = await frames.query(
      ScheduleGenerator._getTasksForSchedule,
      { schedule },
      { task },
    );
    return frames.collectAs([task], tasks);
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
export const GetAllTasksRequest: Sync = ({ request, session, user, tasks }) => ({
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
