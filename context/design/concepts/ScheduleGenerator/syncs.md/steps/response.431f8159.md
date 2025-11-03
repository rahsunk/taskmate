---
timestamp: 'Mon Nov 03 2025 02:57:57 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251103_025757.5a51a145.md]]'
content_id: 431f815952e07ac899b4d5de0e946d22024add75a6e1e63f3ed8c51d800263db
---

# response:

I've updated the `ScheduleGenerator.sync.ts` file to include all the specified GET endpoints. Each synchronization now incorporates a session check to ensure the user is logged in, and for operations on a specific schedule (like adding/editing events/tasks or getting details for a specific schedule/event/task), it also verifies that the authenticated user is the owner of that schedule.

Here's the updated `src/syncs/ScheduleGenerator.sync.ts` file:

```typescript
// # file: src/syncs/ScheduleGenerator.sync.ts

import { actions, Frames, Sync } from "@engine";
import { Requesting, Sessioning, ScheduleGenerator } from "@concepts"; // Assuming @concepts aggregates all concept exports

// Helper for session check for actions/queries.
// It queries Sessioning._getUser and filters frames if no session is active.
const requiresSession = async (
  frames: Frames,
  sessionSymbol: symbol, // The symbol in the frame representing the session ID
  authenticatedUserSymbol: symbol, // The symbol to bind the authenticated User ID to
): Promise<Frames> => {
  // Ensure we have a session ID in the initial request frame.
  const sessionFromFrame = frames.at(0)?.[sessionSymbol];
  if (!sessionFromFrame) {
    // If no session ID is present in the request, return an empty Frames object
    return new Frames();
  }

  // Query Sessioning to get the user associated with the session.
  // The query expects an object with a 'session' property.
  // The result will be an array of objects like `[{ user: UserID }]` or `[]`.
  frames = await frames.query(
    Sessioning._getUser,
    { session: sessionFromFrame }, // Input to the query
    { user: authenticatedUserSymbol }, // Output binding for the authenticated user
  );

  // If Sessioning._getUser returns an empty array (no user for session),
  // 'frames' will correctly become empty here, effectively halting the sync.
  return frames;
};

// Helper for session AND schedule ownership check.
// It first authenticates the user and then verifies the schedule belongs to them.
const requiresScheduleOwnership = async (
  frames: Frames,
  sessionSymbol: symbol,
  scheduleSymbol: symbol, // The symbol in the frame representing the schedule ID
  authenticatedUserSymbol: symbol, // The symbol holding the authenticated User ID
): Promise<Frames> => {
  // 1. First, check for an active session
  frames = await requiresSession(frames, sessionSymbol, authenticatedUserSymbol);
  if (frames.length === 0) {
    return new Frames(); // No active session, stop here
  }

  // 2. Then, check if the schedule exists and belongs to the authenticated user
  const scheduleId = frames.at(0)![scheduleSymbol];
  const authenticatedUser = frames.at(0)![authenticatedUserSymbol];

  // Query ScheduleGenerator to get the details of the requested schedule.
  // The concept's _getScheduleDetails returns an array like `[{ scheduleDetails: ScheduleDoc }]`.
  // We bind this array to a temporary symbol.
  const tempScheduleDetailsSymbol = Symbol("scheduleDetailsArray");
  frames = await frames.query(
    ScheduleGenerator._getScheduleDetails,
    { schedule: scheduleId },
    { scheduleDetails: tempScheduleDetailsSymbol }, // Bind the array result
  );

  // Now, process the query result. If `scheduleDetailsArray` is empty or not found, filter it out.
  frames = frames.map((frame) => {
    const detailsArray = frame[tempScheduleDetailsSymbol];
    if (detailsArray && detailsArray.length > 0) {
      // If found, unpack the first element of the array into `scheduleDetails`
      // and retain the original authenticatedUser binding.
      return { ...frame, scheduleDetails: detailsArray[0] };
    }
    return null; // This frame does not have valid schedule details
  }).filter(Boolean) as Frames; // Remove null entries and assert type

  if (frames.length === 0) {
    // If no schedule details were found or processed, return empty frames.
    return new Frames();
  }

  // 3. Filter to ensure the authenticated user is the owner of the schedule
  return frames.filter((f) => f.scheduleDetails.owner === authenticatedUser);
};


// --- ScheduleGenerator Syncs for POST actions ---

// initializeSchedule:
// - Takes `owner` from request, but actually uses `authenticatedUser` for security
// - Does not require `scheduleOwnership` as it might create a new schedule
export const InitializeScheduleRequest: Sync = (
  { request, session, owner: requestedOwner, authenticatedUser, schedule },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/initializeSchedule", session, owner: requestedOwner }, // Capture requested owner for validation if needed
    { request },
  ]),
  where: async (frames) => {
    // Authenticate the user
    frames = await requiresSession(frames, session, authenticatedUser);
    if (frames.length === 0) {
      return new Frames(); // No active session
    }

    // Optional: Validate that if an `owner` was provided in the request body,
    // it matches the `authenticatedUser`. If `owner` is not provided, the
    // `authenticatedUser` is implicitly the owner.
    // However, for this action, the `owner` parameter of the concept action
    // should always be the `authenticatedUser` to prevent a logged-in user
    // from creating a schedule for someone else.
    // The `ScheduleGenerator.initializeSchedule` concept method implicitly
    // handles the "Each user has exactly one schedule" principle.
    return frames; // If session exists, proceed.
  },
  then: actions([
    ScheduleGenerator.initializeSchedule,
    { owner: authenticatedUser }, // Always use the authenticated user as the owner
  ]),
});

export const InitializeScheduleResponseSuccess: Sync = (
  { request, schedule }, // `owner` is an internal concept parameter, not returned to Requesting.respond
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/ScheduleGenerator/initializeSchedule" },
      { request },
    ],
    // The `initializeSchedule` action returns `{ schedule: Schedule }` on success.
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
    [ScheduleGenerator.initializeSchedule, {}, { error }], // Returns { error: string } on failure
  ),
  then: actions([Requesting.respond, { request, error }]),
});


// addEvent:
export const AddEventRequest: Sync = (
  { request, session, schedule, name, startTime, endTime, repeat, authenticatedUser },
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
  where: async (frames) => {
    // Authenticate and check schedule ownership
    return await requiresScheduleOwnership(
      frames,
      session,
      schedule, // Schedule ID to check ownership for
      authenticatedUser,
    );
  },
  then: actions([
    ScheduleGenerator.addEvent,
    { schedule, name, startTime, endTime, repeat },
  ]),
});

export const AddEventResponseSuccess: Sync = ({ request, event }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/addEvent" }, { request }],
    [ScheduleGenerator.addEvent, {}, { event }], // Returns { event: Event } on success
  ),
  then: actions([Requesting.respond, { request, event }]),
});

export const AddEventResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/addEvent" }, { request }],
    [ScheduleGenerator.addEvent, {}, { error }], // Returns { error: string } on failure
  ),
  then: actions([Requesting.respond, { request, error }]),
});


// editEvent:
export const EditEventRequest: Sync = (
  { request, session, schedule, oldEvent, name, startTime, endTime, repeat, authenticatedUser },
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
  where: async (frames) => {
    // Authenticate and check schedule ownership
    return await requiresScheduleOwnership(
      frames,
      session,
      schedule, // Schedule ID to check ownership for
      authenticatedUser,
    );
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


// deleteEvent:
export const DeleteEventRequest: Sync = (
  { request, session, schedule, event, authenticatedUser },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/deleteEvent", session, schedule, event },
    { request },
  ]),
  where: async (frames) => {
    // Authenticate and check schedule ownership
    return await requiresScheduleOwnership(
      frames,
      session,
      schedule, // Schedule ID to check ownership for
      authenticatedUser,
    );
  },
  then: actions([ScheduleGenerator.deleteEvent, { schedule, event }]),
});

export const DeleteEventResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/ScheduleGenerator/deleteEvent" },
      { request },
    ],
    [ScheduleGenerator.deleteEvent, {}, {}], // Returns Empty on success
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


// addTask:
export const AddTaskRequest: Sync = (
  {
    request,
    session,
    schedule,
    name,
    deadline,
    expectedCompletionTime,
    completionLevel,
    priority,
    authenticatedUser,
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
  where: async (frames) => {
    // Authenticate and check schedule ownership
    return await requiresScheduleOwnership(
      frames,
      session,
      schedule, // Schedule ID to check ownership for
      authenticatedUser,
    );
  },
  then: actions([
    ScheduleGenerator.addTask,
    { schedule, name, deadline, expectedCompletionTime, completionLevel, priority },
  ]),
});

export const AddTaskResponseSuccess: Sync = ({ request, task }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleGenerator/addTask" }, { request }],
    [ScheduleGenerator.addTask, {}, { task }], // Returns { task: Task } on success
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


// editTask:
export const EditTaskRequest: Sync = (
  {
    request,
    session,
    schedule,
    oldTask,
    name,
    deadline,
    expectedCompletionTime,
    completionLevel,
    priority,
    authenticatedUser,
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
  where: async (frames) => {
    // Authenticate and check schedule ownership
    return await requiresScheduleOwnership(
      frames,
      session,
      schedule, // Schedule ID to check ownership for
      authenticatedUser,
    );
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


// deleteTask:
export const DeleteTaskRequest: Sync = (
  { request, session, schedule, task, authenticatedUser },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/deleteTask", session, schedule, task },
    { request },
  ]),
  where: async (frames) => {
    // Authenticate and check schedule ownership
    return await requiresScheduleOwnership(
      frames,
      session,
      schedule, // Schedule ID to check ownership for
      authenticatedUser,
    );
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


// generateSchedule:
export const GenerateScheduleRequest: Sync = (
  { request, session, schedule, authenticatedUser },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/generateSchedule", session, schedule },
    { request },
  ]),
  where: async (frames) => {
    // Authenticate and check schedule ownership
    return await requiresScheduleOwnership(
      frames,
      session,
      schedule, // Schedule ID to check ownership for
      authenticatedUser,
    );
  },
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
    // The `generateSchedule` action returns `{ scheduleId: Schedule, generatedPlan: GeneratedSchedulePlan }` on success.
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
    [ScheduleGenerator.generateSchedule, {}, { error }], // Returns { error: string } on failure
  ),
  then: actions([Requesting.respond, { request, error }]),
});


// --- ScheduleGenerator Syncs for GET queries ---

// _getScheduleByOwner:
// - Takes `owner` from request, but must match `authenticatedUser` for security
export const GetScheduleByOwnerRequest: Sync = (
  { request, session, owner: requestedOwner, authenticatedUser, schedule, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getScheduleByOwner", session, owner: requestedOwner },
    { request },
  ]),
  where: async (frames) => {
    // Authenticate the user
    frames = await requiresSession(frames, session, authenticatedUser);
    if (frames.length === 0) {
      return new Frames(); // No active session
    }

    // Authorization: The 'owner' in the request must be the authenticated user.
    // If not, filter the frame.
    const filteredFrames = frames.filter((f) => f[requestedOwner] === f[authenticatedUser]);

    if (filteredFrames.length === 0) {
      // If the requested owner doesn't match the authenticated user, return an error
      frames.at(0)![error] = `Unauthorized: Cannot retrieve schedule for owner '${frames.at(0)![requestedOwner]}' as authenticated user '${frames.at(0)![authenticatedUser]}'.`;
      return frames;
    }

    // Execute the concept query
    return await filteredFrames.query(ScheduleGenerator._getScheduleByOwner, { owner: requestedOwner }, { schedule, error: Symbol("queryError") });
  },
  then: actions([Requesting.respond, { request, schedule, error: error || Symbol("queryError") }]),
});


// _getEventsForSchedule:
export const GetEventsForScheduleRequest: Sync = (
  { request, session, schedule, authenticatedUser, event }, // `event` is where the array of event IDs will be bound
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getEventsForSchedule", session, schedule },
    { request },
  ]),
  where: async (frames) => {
    // Authenticate and check schedule ownership
    return await requiresScheduleOwnership(
      frames,
      session,
      schedule, // Schedule ID to check ownership for
      authenticatedUser,
    );
  },
  then: actions([ScheduleGenerator._getEventsForSchedule, { schedule }]),
});

export const GetEventsForScheduleResponse: Sync = (
  { request, event, error }, // The query returns `{ event?: Event[]; error?: string }`
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/ScheduleGenerator/_getEventsForSchedule" },
      { request },
    ],
    [ScheduleGenerator._getEventsForSchedule, {}, { event, error }],
  ),
  then: actions([Requesting.respond, { request, event, error }]),
});


// _getTasksForSchedule:
export const GetTasksForScheduleRequest: Sync = (
  { request, session, schedule, authenticatedUser, task }, // `task` is where the array of task IDs will be bound
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getTasksForSchedule", session, schedule },
    { request },
  ]),
  where: async (frames) => {
    // Authenticate and check schedule ownership
    return await requiresScheduleOwnership(
      frames,
      session,
      schedule, // Schedule ID to check ownership for
      authenticatedUser,
    );
  },
  then: actions([ScheduleGenerator._getTasksForSchedule, { schedule }]),
});

export const GetTasksForScheduleResponse: Sync = (
  { request, task, error }, // The query returns `{ task?: Task[]; error?: string }`
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/ScheduleGenerator/_getTasksForSchedule" },
      { request },
    ],
    [ScheduleGenerator._getTasksForSchedule, {}, { task, error }],
  ),
  then: actions([Requesting.respond, { request, task, error }]),
});


// _getEventDetails:
export const GetEventDetailsRequest: Sync = (
  { request, session, schedule, event, authenticatedUser, eventDetails, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getEventDetails", session, schedule, event },
    { request },
  ]),
  where: async (frames) => {
    // Authenticate and check schedule ownership
    frames = await requiresScheduleOwnership(
      frames,
      session,
      schedule,
      authenticatedUser,
    );
    if (frames.length === 0) {
      frames.at(0)![error] = "Unauthorized or Schedule not found.";
      return frames;
    }

    // Call the query to get event details.
    // The concept's _getEventDetails returns an array like `[{ eventDetails: EventDoc }]` or `{ error: string }`.
    // We bind this array to `eventDetailsArray` and then extract its first element.
    const eventId = frames.at(0)![event];
    const eventDetailsArraySymbol = Symbol("eventDetailsArray");
    frames = await frames.query(
      ScheduleGenerator._getEventDetails,
      { event: eventId },
      { eventDetails: eventDetailsArraySymbol, error: Symbol("queryError") },
    );

    return frames.map((frame) => {
      const detailsArray = frame[eventDetailsArraySymbol];
      const queryError = frame[Symbol("queryError")];
      if (queryError) {
        return { ...frame, error: queryError }; // Propagate error from concept query
      }
      if (detailsArray && detailsArray.length > 0) {
        // Unpack the first element of the array into `eventDetails`
        return { ...frame, eventDetails: detailsArray[0] };
      }
      return { ...frame, error: `Event with ID ${eventId} not found or not associated with schedule.` }; // Specific error if event not found
    }).filter(Boolean) as Frames;
  },
  then: actions([Requesting.respond, { request, eventDetails, error }]),
});


// _getTaskDetails:
export const GetTaskDetailsRequest: Sync = (
  { request, session, schedule, task, authenticatedUser, taskDetails, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getTaskDetails", session, schedule, task },
    { request },
  ]),
  where: async (frames) => {
    // Authenticate and check schedule ownership
    frames = await requiresScheduleOwnership(
      frames,
      session,
      schedule,
      authenticatedUser,
    );
    if (frames.length === 0) {
      frames.at(0)![error] = "Unauthorized or Schedule not found.";
      return frames;
    }

    // Call the query to get task details.
    // The concept's _getTaskDetails returns an array like `[{ taskDetails: TaskDoc }]` or `{ error: string }`.
    const taskId = frames.at(0)![task];
    const taskDetailsArraySymbol = Symbol("taskDetailsArray");
    frames = await frames.query(
      ScheduleGenerator._getTaskDetails,
      { task: taskId },
      { taskDetails: taskDetailsArraySymbol, error: Symbol("queryError") },
    );

    return frames.map((frame) => {
      const detailsArray = frame[taskDetailsArraySymbol];
      const queryError = frame[Symbol("queryError")];
      if (queryError) {
        return { ...frame, error: queryError }; // Propagate error from concept query
      }
      if (detailsArray && detailsArray.length > 0) {
        // Unpack the first element of the array into `taskDetails`
        return { ...frame, taskDetails: detailsArray[0] };
      }
      return { ...frame, error: `Task with ID ${taskId} not found or not associated with schedule.` }; // Specific error if task not found
    }).filter(Boolean) as Frames;
  },
  then: actions([Requesting.respond, { request, taskDetails, error }]),
});


// _getAllSchedules:
// This query should only return schedules for the authenticated user.
export const GetAllSchedulesRequest: Sync = (
  { request, session, authenticatedUser, schedulesResult, error }, // Renamed to avoid collision with concept 'schedule'
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getAllSchedules", session },
    { request },
  ]),
  where: async (frames) => {
    // Authenticate the user
    frames = await requiresSession(frames, session, authenticatedUser);
    if (frames.length === 0) {
      frames.at(0)![error] = "Unauthorized: A valid session is required.";
      return frames;
    }

    const userId = frames.at(0)![authenticatedUser];

    // The concept's _getAllSchedules returns `Promise<{schedule?: ScheduleDoc[]; error?: string}>`
    const allSchedulesQueryResult = await ScheduleGenerator._getAllSchedules();
    if (allSchedulesQueryResult.error) {
        // Propagate error if the underlying query failed
        frames.at(0)![error] = allSchedulesQueryResult.error; // Add error to frame
        return frames;
    }

    // Filter schedules to only include those owned by the authenticatedUser
    const usersSchedules = allSchedulesQueryResult.schedule?.filter(
      (s) => s.owner === userId,
    ) || [];

    // Manually add the filtered results to the frame under the `schedulesResult` symbol
    frames.at(0)![schedulesResult] = usersSchedules;
    return frames;
  },
  then: actions([Requesting.respond, { request, schedules: schedulesResult, error }]), // Respond with `schedules`
});


// _getScheduleDetails:
export const GetScheduleDetailsRequest: Sync = (
  { request, session, schedule: scheduleId, authenticatedUser, scheduleDetails, error }, // Renamed schedule parameter to scheduleId
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getScheduleDetails", session, schedule: scheduleId },
    { request },
  ]),
  where: async (frames) => {
    // Authenticate and check schedule ownership
    // The `requiresScheduleOwnership` helper already fetches details and sets `scheduleDetails` on the frame.
    frames = await requiresScheduleOwnership(
      frames,
      session,
      scheduleId, // Use the scheduleId symbol for the helper
      authenticatedUser,
    );
    if (frames.length === 0) {
        frames.at(0)![error] = "Unauthorized or Schedule not found.";
        return frames;
    }

    // The `scheduleDetails` is already unpacked into `f.scheduleDetails` by the helper.
    // Wrap it in an array for consistency with the API spec's expected query return format.
    return frames.map(f => ({ ...f, scheduleDetails: [f.scheduleDetails] }));
  },
  then: actions([Requesting.respond, { request, scheduleDetails, error }]),
});


// _getAllEvents:
// Similar to _getAllSchedules, this should only return events for the authenticated user's schedule.
export const GetAllEventsRequest: Sync = (
  { request, session, authenticatedUser, eventsResult, error }, // Renamed result symbol
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getAllEvents", session },
    { request },
  ]),
  where: async (frames) => {
    frames = await requiresSession(frames, session, authenticatedUser);
    if (frames.length === 0) {
      frames.at(0)![error] = "Unauthorized: A valid session is required.";
      return frames;
    }

    const userId = frames.at(0)![authenticatedUser];

    // Find the schedule ID for the authenticated user
    const scheduleQueryResult = await ScheduleGenerator._getScheduleByOwner({ owner: userId });
    const userScheduleId = scheduleQueryResult.schedule;
    
    if (scheduleQueryResult.error) {
        frames.at(0)![error] = scheduleQueryResult.error;
        return frames;
    }

    if (!userScheduleId) {
        // No schedule found for the user, return an empty array of events
        frames.at(0)![eventsResult] = [];
        return frames;
    }
    
    // Get all events for that specific schedule
    const eventsQueryResult = await ScheduleGenerator._getEventsForSchedule({ schedule: userScheduleId });
    if (eventsQueryResult.error) {
        frames.at(0)![error] = eventsQueryResult.error;
        return frames;
    }

    // _getEventsForSchedule returns { event: Event[] }, which are just IDs.
    // We need to fetch full event details for each if the API spec for _getAllEvents implies full documents.
    // Assuming _getAllEvents should return full EventDoc objects as per the API spec's success body.
    const eventDetailsPromises = (eventsQueryResult.event || []).map(eventId =>
        ScheduleGenerator._getEventDetails({ event: eventId })
    );
    const eventDetailsResults = await Promise.all(eventDetailsPromises);
    
    // Flatten the results and filter out any errors/empty responses
    const detailedEvents = eventDetailsResults.flatMap(res => res.eventDetails || []);

    // Manually add the detailed event results to the frame
    frames.at(0)![eventsResult] = detailedEvents;
    return frames;
  },
  then: actions([Requesting.respond, { request, events: eventsResult, error }]), // Respond with `events`
});


// _getAllTasks:
// Similar to _getAllEvents, this should only return tasks for the authenticated user's schedule.
export const GetAllTasksRequest: Sync = (
  { request, session, authenticatedUser, tasksResult, error }, // Renamed result symbol
) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleGenerator/_getAllTasks", session },
    { request },
  ]),
  where: async (frames) => {
    frames = await requiresSession(frames, session, authenticatedUser);
    if (frames.length === 0) {
      frames.at(0)![error] = "Unauthorized: A valid session is required.";
      return frames;
    }

    const userId = frames.at(0)![authenticatedUser];

    // Find the schedule ID for the authenticated user
    const scheduleQueryResult = await ScheduleGenerator._getScheduleByOwner({ owner: userId });
    const userScheduleId = scheduleQueryResult.schedule;

    if (scheduleQueryResult.error) {
        frames.at(0)![error] = scheduleQueryResult.error;
        return frames;
    }

    if (!userScheduleId) {
        // No schedule found for the user, return an empty array of tasks
        frames.at(0)![tasksResult] = [];
        return frames;
    }

    // Get all tasks for that specific schedule
    const tasksQueryResult = await ScheduleGenerator._getTasksForSchedule({ schedule: userScheduleId });
    if (tasksQueryResult.error) {
        frames.at(0)![error] = tasksQueryResult.error;
        return frames;
    }

    // _getTasksForSchedule returns { task: Task[] }, which are just IDs.
    // We need to fetch full task details for each if the API spec for _getAllTasks implies full documents.
    // Assuming _getAllTasks should return full TaskDoc objects as per the API spec's success body.
    const taskDetailsPromises = (tasksQueryResult.task || []).map(taskId =>
        ScheduleGenerator._getTaskDetails({ task: taskId })
    );
    const taskDetailsResults = await Promise.all(taskDetailsPromises);

    // Flatten the results and filter out any errors/empty responses
    const detailedTasks = taskDetailsResults.flatMap(res => res.taskDetails || []);

    // Manually add the detailed task results to the frame
    frames.at(0)![tasksResult] = detailedTasks;
    return frames;
  },
  then: actions([Requesting.respond, { request, tasks: tasksResult, error }]), // Respond with `tasks`
});

```
