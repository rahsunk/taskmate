---
timestamp: 'Mon Nov 03 2025 06:21:14 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251103_062114.fb6398e0.md]]'
content_id: f1526d3abb35cc002b5ab2fc12d5dd83bbcf55a28293f22ae6ba3c9e33a77960
---

# response:

Here are the synchronization rules (syncs) for the `ScheduleGenerator` concept, incorporating authentication checks with `Sessioning._getUser` and appropriate authorization logic for ownership, as per your requirements.

The excluded actions from your API spec are:

* `/api/ScheduleGenerator/initializeSchedule`
* `/api/ScheduleGenerator/addEvent`
* `/api/ScheduleGenerator/editEvent`
* `/api/ScheduleGenerator/deleteEvent`
* `/api/ScheduleGenerator/addTask`
* `/api/ScheduleGenerator/editTask`
* `/api/ScheduleGenerator/deleteTask`
* `/api/ScheduleGenerator/generateSchedule`
* `/api/ScheduleGenerator/_getScheduleByOwner`
* `/api/ScheduleGenerator/_getEventsForSchedule`
* `/api/ScheduleGenerator/_getTasksForSchedule`
* `/api/ScheduleGenerator/_getEventDetails`
* `/api/ScheduleGenerator/_getTaskDetails`
* `/api/ScheduleGenerator/_getAllSchedules`
* `/api/ScheduleGenerator/_getScheduleDetails`
* `/api/ScheduleGenerator/_getAllEvents`
* `/api/ScheduleGenerator/_getAllTasks`

We'll structure these as `Requesting.request` -> `ScheduleGenerator.action/query` chains, with `where` clauses for authentication and authorization.

```typescript
// # file: src/syncs/ScheduleGenerator.sync.ts

import { actions, Frames, Sync } from "@engine";
import { Requesting, Sessioning, ScheduleGenerator } from "@concepts";
import { ID } from "../../utils/types.ts"; // Assuming @utils/types.ts provides ID

// --- Helper Functions for Authentication and Authorization ---

/**
 * Helper for session validation. Ensures an active session exists.
 * @param frames The current frames in the synchronization.
 * @param sessionVar The symbol representing the session ID from the request.
 * @param activeUserVar The symbol to which the authenticated user's ID will be bound.
 * @returns Filtered frames with the active user bound, or empty frames if no session.
 */
const queryRequiresSession = async (
  frames: Frames,
  sessionVar: symbol,
  activeUserVar: symbol,
): Promise<Frames> => {
  const initialFrame = frames.at(0)!;
  const sessionId = initialFrame[sessionVar];
  if (!sessionId) {
    return new Frames(); // Session ID not provided in request
  }
  
  frames = await frames.query(Sessioning._getUser, { session: sessionId }, { user: activeUserVar });
  
  if (frames.length === 0) {
    return new Frames(); // No active session found for the provided session ID
  }
  return frames;
};

/**
 * Helper for session validation AND ownership check of a target schedule.
 * Assumes the `sessionVar` is bound in the initial frames from `Requesting.request`.
 * It will query for the `activeUser` from the session and then verify they own the schedule identified by `targetScheduleIdVar`.
 * @param frames The current frames in the synchronization.
 * @param sessionVar The symbol representing the session ID from the request.
 * @param activeUserVar The symbol to which the authenticated user's ID will be bound.
 * @param targetScheduleIdVar The symbol representing the schedule ID from the request payload (e.g., `schedule`).
 * @returns Filtered frames where the active user is the owner of the target schedule, or empty frames if not authorized.
 */
const requiresAuthAndOwnership = async (
  frames: Frames,
  sessionVar: symbol,
  activeUserVar: symbol,
  targetScheduleIdVar: symbol, // This must be provided for ownership check
) => {
  const initialFrame = frames.at(0)!; // Keep original request info

  // 1. Authenticate: Ensure an active session and get the currently authenticated user
  frames = await queryRequiresSession(frames, sessionVar, activeUserVar);
  if (frames.length === 0) {
    return new Frames(); // Not authenticated
  }

  // 2. Authorize: Ensure the activeUser owns the schedule
  const scheduleId = initialFrame[targetScheduleIdVar] as ID; // Get schedule ID from original request frame
  if (!scheduleId) {
    return new Frames(); // Schedule ID not found in the request payload
  }

  // Query for schedule details to get its owner
  // _getScheduleDetails returns an array containing one ScheduleDoc if found.
  frames = await frames.query(
    ScheduleGenerator._getScheduleDetails,
    { schedule: scheduleId },
    { scheduleDetails: Symbol("tempScheduleDoc") }, // Bind to a temporary symbol
  );

  if (frames.length === 0) {
    return new Frames(); // Schedule not found or query failed
  }
  
  // Filter to ensure the activeUser is the owner of the schedule
  // Access the owner property from the first (and only) element of the 'scheduleDetails' array
  return frames.filter(($) => $[activeUserVar] === $[Symbol("tempScheduleDoc")][0].owner);
};

// --- Action Syncs ---

// initializeSchedule
export const InitializeScheduleRequest: Sync = ({
  request, session, owner: requestedOwner, activeUser, schedule,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/initializeSchedule", session, owner: requestedOwner },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames.at(0)!;
    
    // Authenticate user via session
    frames = await queryRequiresSession(frames, session, activeUser);
    if (frames.length === 0) return new Frames(); // Not authenticated

    // Validate: if an 'owner' was provided in the request, it must match the active user
    const actualRequestedOwner = originalRequestFrame[requestedOwner];
    if (actualRequestedOwner && actualRequestedOwner !== frames.at(0)![activeUser]) {
      // Mismatch: logged-in user is not the requested owner. This is an authorization failure.
      return new Frames(); 
    }
    
    // The ScheduleGenerator.initializeSchedule action creates/returns a schedule
    // for the 'owner' argument. We enforce that this 'owner' is always the 'activeUser'.
    return frames.map(($) => ({ ...$, [requestedOwner]: $[activeUser] }));
  },
  then: actions([ScheduleGenerator.initializeSchedule, { owner: requestedOwner }, { schedule }]),
});

export const InitializeScheduleResponseSuccess: Sync = ({ request, schedule }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/initializeSchedule" }, { request }],
    [ScheduleGenerator.initializeSchedule, {}, { schedule }],
  ),
  then: actions([Requesting.respond, { request, schedule }]),
});

export const InitializeScheduleResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/initializeSchedule" }, { request }],
    [ScheduleGenerator.initializeSchedule, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// addEvent
export const AddEventRequest: Sync = ({
  request, session, schedule, name, startTime, endTime, repeat, activeUser, event,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/addEvent", session, schedule, name, startTime, endTime, repeat },
    { request },
  ]),
  where: async (frames) => {
    // Authenticate user and ensure ownership of the target schedule
    frames = await requiresAuthAndOwnership(frames, session, activeUser, schedule);
    return frames;
  },
  then: actions([
    ScheduleGenerator.addEvent,
    { schedule, name, startTime, endTime, repeat },
    { event },
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
export const EditEventRequest: Sync = ({
  request, session, schedule, oldEvent, name, startTime, endTime, repeat, activeUser,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/editEvent", session, schedule, oldEvent, name, startTime, endTime, repeat },
    { request },
  ]),
  where: async (frames) => {
    frames = await requiresAuthAndOwnership(frames, session, activeUser, schedule);
    return frames;
  },
  then: actions([
    ScheduleGenerator.editEvent,
    { schedule, oldEvent, name, startTime, endTime, repeat },
  ]),
});

export const EditEventResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/editEvent" }, { request }],
    [ScheduleGenerator.editEvent, {}, {}], // Returns Empty on success
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
export const DeleteEventRequest: Sync = ({
  request, session, schedule, event, activeUser,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/deleteEvent", session, schedule, event },
    { request },
  ]),
  where: async (frames) => {
    frames = await requiresAuthAndOwnership(frames, session, activeUser, schedule);
    return frames;
  },
  then: actions([ScheduleGenerator.deleteEvent, { schedule, event }]),
});

export const DeleteEventResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/deleteEvent" }, { request }],
    [ScheduleGenerator.deleteEvent, {}, {}], // Returns Empty on success
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
export const AddTaskRequest: Sync = ({
  request, session, schedule, name, deadline, expectedCompletionTime, completionLevel, priority, activeUser, task,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/addTask", session, schedule, name, deadline, expectedCompletionTime, completionLevel, priority },
    { request },
  ]),
  where: async (frames) => {
    frames = await requiresAuthAndOwnership(frames, session, activeUser, schedule);
    return frames;
  },
  then: actions([
    ScheduleGenerator.addTask,
    { schedule, name, deadline, expectedCompletionTime, completionLevel, priority },
    { task },
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
export const EditTaskRequest: Sync = ({
  request, session, schedule, oldTask, name, deadline, expectedCompletionTime, completionLevel, priority, activeUser,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/editTask", session, schedule, oldTask, name, deadline, expectedCompletionTime, completionLevel, priority },
    { request },
  ]),
  where: async (frames) => {
    frames = await requiresAuthAndOwnership(frames, session, activeUser, schedule);
    return frames;
  },
  then: actions([
    ScheduleGenerator.editTask,
    { schedule, oldTask, name, deadline, expectedCompletionTime, completionLevel, priority },
  ]),
});

export const EditTaskResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/editTask" }, { request }],
    [ScheduleGenerator.editTask, {}, {}], // Returns Empty on success
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
export const DeleteTaskRequest: Sync = ({
  request, session, schedule, task, activeUser,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/deleteTask", session, schedule, task },
    { request },
  ]),
  where: async (frames) => {
    frames = await requiresAuthAndOwnership(frames, session, activeUser, schedule);
    return frames;
  },
  then: actions([ScheduleGenerator.deleteTask, { schedule, task }]),
});

export const DeleteTaskResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/deleteTask" }, { request }],
    [ScheduleGenerator.deleteTask, {}, {}], // Returns Empty on success
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
export const GenerateScheduleRequest: Sync = ({
  request, session, schedule, activeUser, scheduleId, generatedPlan,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/generateSchedule", session, schedule },
    { request },
  ]),
  where: async (frames) => {
    frames = await requiresAuthAndOwnership(frames, session, activeUser, schedule);
    return frames;
  },
  then: actions([
    ScheduleGenerator.generateSchedule,
    { schedule },
    { scheduleId, generatedPlan },
  ]),
});

export const GenerateScheduleResponseSuccess: Sync = ({
  request, scheduleId, generatedPlan,
}) => ({
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

// --- Query Syncs ---

// _getScheduleByOwner
export const GetScheduleByOwnerQuery: Sync = ({
  request, session, owner: requestedOwner, activeUser, schedule,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getScheduleByOwner", session, owner: requestedOwner },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames.at(0)!;
    
    // 1. Authenticate user via session
    frames = await queryRequiresSession(frames, session, activeUser);
    if (frames.length === 0) return new Frames(); // Not authenticated

    // 2. Authorize: Ensure the 'owner' requested matches the active user
    const actualRequestedOwner = originalRequestFrame[requestedOwner];
    if (actualRequestedOwner && actualRequestedOwner !== frames.at(0)![activeUser]) {
      return new Frames(); // Mismatch: logged-in user is not the requested owner
    }
    
    // If no owner was explicitly provided in the request, or it matches activeUser,
    // then query for the activeUser's schedule.
    frames = await frames.query(ScheduleGenerator._getScheduleByOwner, { owner: frames.at(0)![activeUser] }, { schedule });

    // Handle case where no schedule is found for the active user: return empty result for 'schedule'
    if (frames.length === 0) {
      return new Frames({ ...originalRequestFrame, [schedule]: [] });
    }
    return frames; // `schedule` contains the ID if found
  },
  then: actions([Requesting.respond, { request, schedule }]),
});

// _getEventsForSchedule
export const GetEventsForScheduleQuery: Sync = ({
  request, session, schedule, activeUser, event, // Will bind an array of event IDs
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getEventsForSchedule", session, schedule },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames.at(0)!;
    
    // Authenticate user and ensure ownership of the target schedule
    frames = await requiresAuthAndOwnership(frames, session, activeUser, schedule);
    if (frames.length === 0) {
      return new Frames({ ...originalRequestFrame, [event]: [] }); // Not authorized or schedule not found, return empty array
    }
    
    // If authenticated and authorized, proceed with the actual query
    frames = await frames.query(ScheduleGenerator._getEventsForSchedule, { schedule }, { event });

    // Ensure that if no events are found, an empty array is returned in the response
    if (frames.length === 0) {
        return new Frames({...originalRequestFrame, [event]: []});
    }

    return frames; // `event` contains the array of event IDs
  },
  then: actions([Requesting.respond, { request, events: event }]), // Map output to 'events' key
});

// _getTasksForSchedule
export const GetTasksForScheduleQuery: Sync = ({
  request, session, schedule, activeUser, task, // Will bind an array of task IDs
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getTasksForSchedule", session, schedule },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames.at(0)!;

    // Authenticate user and ensure ownership of the target schedule
    frames = await requiresAuthAndOwnership(frames, session, activeUser, schedule);
    if (frames.length === 0) {
      return new Frames({ ...originalRequestFrame, [task]: [] }); // Not authorized or schedule not found, return empty array
    }

    // If authenticated and authorized, proceed with the actual query
    frames = await frames.query(ScheduleGenerator._getTasksForSchedule, { schedule }, { task });

    // Ensure that if no tasks are found, an empty array is returned in the response
    if (frames.length === 0) {
        return new Frames({...originalRequestFrame, [task]: []});
    }

    return frames; // `task` contains the array of task IDs
  },
  then: actions([Requesting.respond, { request, tasks: task }]), // Map output to 'tasks' key
});

// _getEventDetails
// This query requires multiple steps to verify ownership as the event doesn't directly contain a top-level schedule ID.
export const GetEventDetailsQuery: Sync = ({
  request, session, event, activeUser, eventDetails,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getEventDetails", session, event },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames.at(0)!; // Keep initial request info
    
    // 1. Authenticate user via session
    let authenticatedFrames = await queryRequiresSession(frames, session, activeUser);
    if (authenticatedFrames.length === 0) return new Frames({ ...originalRequestFrame, [eventDetails]: [] }); // Not authenticated

    const eventId = originalRequestFrame[event] as ID;
    if (!eventId) {
      return new Frames({ ...originalRequestFrame, [eventDetails]: [] }); // No event ID in request
    }

    // 2. Fetch event details to get its associated internal `scheduleID`
    // The query returns `[{ eventDetails: EventDoc }]`
    let eventDetailFrames = await authenticatedFrames.query(
      ScheduleGenerator._getEventDetails,
      { event: eventId },
      { eventDetails: Symbol("tempEventDoc") },
    );
    if (eventDetailFrames.length === 0) {
      return new Frames({ ...originalRequestFrame, [eventDetails]: [] }); // Event not found or query failed
    }
    const internalScheduleId = eventDetailFrames.at(0)![Symbol("tempEventDoc")][0].scheduleID;

    // 3. Find the external Schedule ID for this internal scheduleID based on the active user's ownership
    // The _getScheduleByOwner query returns `[{ schedule: Schedule }]`
    let userScheduleLookupFrames = await authenticatedFrames.query(
      ScheduleGenerator._getScheduleByOwner,
      { owner: authenticatedFrames.at(0)![activeUser] },
      { schedule: Symbol("userExternalScheduleId") }
    );

    if (userScheduleLookupFrames.length === 0 || !userScheduleLookupFrames.at(0)![Symbol("userExternalScheduleId")]) {
        return new Frames({ ...originalRequestFrame, [eventDetails]: [] }); // Active user has no schedule
    }
    const userExternalScheduleId = userScheduleLookupFrames.at(0)![Symbol("userExternalScheduleId")];

    // 4. Get full details of the user's schedule to check its internal ID
    // _getScheduleDetails returns `[{ scheduleDetails: ScheduleDoc }]`
    let userFullScheduleFrames = await authenticatedFrames.query(
        ScheduleGenerator._getScheduleDetails,
        { schedule: userExternalScheduleId },
        { scheduleDetails: Symbol("userFullScheduleDoc") }
    );

    // 5. Verify if the event's internal scheduleID matches the active user's schedule's internal ID
    if (userFullScheduleFrames.length === 0 || userFullScheduleFrames.at(0)![Symbol("userFullScheduleDoc")][0].scheduleID !== internalScheduleId) {
        return new Frames({ ...originalRequestFrame, [eventDetails]: [] }); // The event's schedule does not belong to the active user
    }

    // If all checks pass, remap the event details for the final response
    return eventDetailFrames.map(f => ({...f, [eventDetails]: f[Symbol("tempEventDoc")]}));
  },
  then: actions([Requesting.respond, { request, eventDetails }]),
});

// _getTaskDetails
// Similar multi-step ownership verification as _getEventDetails.
export const GetTaskDetailsQuery: Sync = ({
  request, session, task, activeUser, taskDetails,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getTaskDetails", session, task },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames.at(0)!;

    // 1. Authenticate user via session
    let authenticatedFrames = await queryRequiresSession(frames, session, activeUser);
    if (authenticatedFrames.length === 0) return new Frames({ ...originalRequestFrame, [taskDetails]: [] }); // Not authenticated

    const taskId = originalRequestFrame[task] as ID;
    if (!taskId) {
      return new Frames({ ...originalRequestFrame, [taskDetails]: [] }); // No task ID in request
    }

    // 2. Fetch task details to get its associated internal `scheduleID`
    // The query returns `[{ taskDetails: TaskDoc }]`
    let taskDetailFrames = await authenticatedFrames.query(
      ScheduleGenerator._getTaskDetails,
      { task: taskId },
      { taskDetails: Symbol("tempTaskDoc") },
    );
    if (taskDetailFrames.length === 0) {
      return new Frames({ ...originalRequestFrame, [taskDetails]: [] }); // Task not found or query failed
    }
    const internalScheduleId = taskDetailFrames.at(0)![Symbol("tempTaskDoc")][0].scheduleID;

    // 3. Find the external Schedule ID for this internal scheduleID based on the active user's ownership
    // The _getScheduleByOwner query returns `[{ schedule: Schedule }]`
    let userScheduleLookupFrames = await authenticatedFrames.query(
      ScheduleGenerator._getScheduleByOwner,
      { owner: authenticatedFrames.at(0)![activeUser] },
      { schedule: Symbol("userExternalScheduleId") }
    );

    if (userScheduleLookupFrames.length === 0 || !userScheduleLookupFrames.at(0)![Symbol("userExternalScheduleId")]) {
        return new Frames({ ...originalRequestFrame, [taskDetails]: [] }); // Active user has no schedule
    }
    const userExternalScheduleId = userScheduleLookupFrames.at(0)![Symbol("userExternalScheduleId")];

    // 4. Get full details of the user's schedule to check its internal ID
    // _getScheduleDetails returns `[{ scheduleDetails: ScheduleDoc }]`
    let userFullScheduleFrames = await authenticatedFrames.query(
        ScheduleGenerator._getScheduleDetails,
        { schedule: userExternalScheduleId },
        { scheduleDetails: Symbol("userFullScheduleDoc") }
    );

    // 5. Verify if the task's internal scheduleID matches the active user's schedule's internal ID
    if (userFullScheduleFrames.length === 0 || userFullScheduleFrames.at(0)![Symbol("userFullScheduleDoc")][0].scheduleID !== internalScheduleId) {
        return new Frames({ ...originalRequestFrame, [taskDetails]: [] }); // The task's schedule does not belong to the active user
    }

    // If all checks pass, remap the task details for the final response
    return taskDetailFrames.map(f => ({...f, [taskDetails]: f[Symbol("tempTaskDoc")]}));
  },
  then: actions([Requesting.respond, { request, taskDetails }]),
});

// _getAllSchedules (User-specific: returns only schedules owned by the active user)
export const GetAllSchedulesQuery: Sync = ({
  request, session, activeUser, schedule, // Will bind an array of ScheduleDoc
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getAllSchedules", session },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames.at(0)!;
    
    // Authenticate user via session
    frames = await queryRequiresSession(frames, session, activeUser);
    if (frames.length === 0) {
      return new Frames({ ...originalRequestFrame, [schedule]: [] }); // Not authenticated, return empty
    }
    
    // Get schedules owned by the active user using the _getSchedulesByOwner query
    // This query returns `[{ schedule: Schedule[] }]`
    frames = await frames.query(ScheduleGenerator._getSchedulesByOwner, { owner: activeUser }, { schedule });

    // Handle case where no schedules are found for the active user: return empty array
    if (frames.length === 0) {
      return new Frames({ ...originalRequestFrame, [schedule]: [] });
    }
    return frames; // `schedule` here is the array of ScheduleDocs
  },
  then: actions([Requesting.respond, { request, schedule }]),
});

// _getScheduleDetails (requires ownership of the specific schedule)
export const GetScheduleDetailsQuery: Sync = ({
  request, session, schedule, activeUser, scheduleDetails,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getScheduleDetails", session, schedule },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames.at(0)!;

    // Authenticate user and ensure ownership of the target schedule
    frames = await requiresAuthAndOwnership(frames, session, activeUser, schedule);
    if (frames.length === 0) {
      return new Frames({ ...originalRequestFrame, [scheduleDetails]: [] }); // Not authorized or schedule not found, return empty
    }
    
    // If authenticated and authorized, proceed with the actual query
    frames = await frames.query(ScheduleGenerator._getScheduleDetails, { schedule }, { scheduleDetails });

    // Ensure that if no details are found (though ownership implies existence), return empty array
    if (frames.length === 0) {
        return new Frames({...originalRequestFrame, [scheduleDetails]: []});
    }

    return frames;
  },
  then: actions([Requesting.respond, { request, scheduleDetails }]),
});

// _getAllEvents (User-specific: returns only events for schedules owned by the active user)
export const GetAllEventsQuery: Sync = ({
  request, session, activeUser, event: events, // Use 'events' for the output key as per API spec
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getAllEvents", session },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames.at(0)!;
    
    // Authenticate user via session
    frames = await queryRequiresSession(frames, session, activeUser);
    if (frames.length === 0) {
      return new Frames({ ...originalRequestFrame, [events]: [] }); // Not authenticated, return empty
    }
    
    // Get the schedule ID(s) for the active user
    // _getScheduleByOwner returns `[{ schedule: Schedule }]`
    let userSchedulesFrames = await frames.query(ScheduleGenerator._getScheduleByOwner, { owner: activeUser }, { schedule: Symbol("userScheduleId") });
    
    if (userSchedulesFrames.length === 0) {
      return new Frames({ ...originalRequestFrame, [events]: [] }); // No schedules for user, return empty
    }
    const userScheduleId = userSchedulesFrames.at(0)![Symbol("userScheduleId")]; // This is the ID of the user's schedule

    // Get all events for that specific schedule
    // _getEventsForSchedule returns `[{ event: Event[] }]`
    frames = await frames.query(ScheduleGenerator._getEventsForSchedule, { schedule: userScheduleId }, { event: events });

    // Ensure that if no events are found, an empty array is returned in the response
    if (frames.length === 0) {
        return new Frames({...originalRequestFrame, [events]: []});
    }

    return frames; // `events` here is the array of event IDs
  },
  then: actions([Requesting.respond, { request, events }]),
});

// _getAllTasks (User-specific: returns only tasks for schedules owned by the active user)
export const GetAllTasksQuery: Sync = ({
  request, session, activeUser, task: tasks, // Use 'tasks' for the output key as per API spec
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getAllTasks", session },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames.at(0)!;

    // Authenticate user via session
    frames = await queryRequiresSession(frames, session, activeUser);
    if (frames.length === 0) {
      return new Frames({ ...originalRequestFrame, [tasks]: [] }); // Not authenticated, return empty
    }
    
    // Get the schedule ID(s) for the active user
    // _getScheduleByOwner returns `[{ schedule: Schedule }]`
    let userSchedulesFrames = await frames.query(ScheduleGenerator._getScheduleByOwner, { owner: activeUser }, { schedule: Symbol("userScheduleId") });
    
    if (userSchedulesFrames.length === 0) {
      return new Frames({ ...originalRequestFrame, [tasks]: [] }); // No schedules for user, return empty
    }
    const userScheduleId = userSchedulesFrames.at(0)![Symbol("userScheduleId")]; // This is the ID of the user's schedule

    // Get all tasks for that specific schedule
    // _getTasksForSchedule returns `[{ task: Task[] }]`
    frames = await frames.query(ScheduleGenerator._getTasksForSchedule, { schedule: userScheduleId }, { task: tasks });

    // Ensure that if no tasks are found, an empty array is returned in the response
    if (frames.length === 0) {
        return new Frames({...originalRequestFrame, [tasks]: []});
    }

    return frames; // `tasks` here is the array of task IDs
  },
  then: actions([Requesting.respond, { request, tasks }]),
});
```
